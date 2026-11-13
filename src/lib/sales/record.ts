import type { Admin } from "@/lib/supabase/server";
import type { ChannelRow, IncomingLine } from "@/lib/channels/types";
import { matchLine, type Candidate, type CategoryMap } from "./match";
import { enqueue } from "@/lib/jobs/queue";
import { giveOneBack, takeOneAt } from "@/lib/stock/take";

/**
 * record_sale: the single entry point for every sale from every channel.
 * Idempotent on (channel_id, external_order_id, external_line_id).
 */
export async function recordSale(db: Admin, channel: ChannelRow, line: IncomingLine) {
  const existing = await db
    .from("sales")
    .select("id")
    .eq("channel_id", channel.id)
    .eq("external_order_id", line.external_order_id)
    .eq("external_line_id", line.external_line_id ?? "")
    .maybeSingle();
  if (existing.data) return { status: "duplicate" as const };

  // Candidates: live items that have a listing on this channel, or any live item
  // for a dealer linked to this centre (till path).
  const centreId = channel.owner_type === "centre" ? channel.owner_id : null;
  const { data: cands } = await db.rpc("sale_candidates", { p_channel_id: channel.id, p_centre_id: centreId });
  const candidates = (cands ?? []) as Candidate[];

  let categories: CategoryMap = [];
  if (centreId) {
    const { data } = await db
      .from("dealer_centres")
      .select("square_category_id, dealer_id")
      .eq("centre_id", centreId)
      .is("left_at", null)
      .not("square_category_id", "is", null);
    categories = (data ?? []) as CategoryMap;
  }

  // Square line items carry the category on the catalog object, not the line. Resolve it.
  if (channel.type === "square" && !line.category_id && line.external_variant_id) {
    const { data: lst } = await db
      .from("item_listings")
      .select("item_id")
      .eq("channel_id", channel.id)
      .eq("external_variant_id", line.external_variant_id)
      .maybeSingle();
    if (!lst) {
      // A per dealer "catch all" variation: the dealer category item with variable price.
      const { data: dc } = await db
        .from("dealer_centres")
        .select("dealer_id, square_category_id")
        .eq("centre_id", centreId!)
        .eq("square_catchall_variation_id", line.external_variant_id)
        .maybeSingle();
      if (dc) line.category_id = dc.square_category_id;
    }
  }

  let m = matchLine(line, candidates, categories);

  // Manual till: the ticket may be one of this centre's items even if the dealer link is in an odd state.
  if (m.kind === "unmatched" && channel.type === "manual" && centreId && line.sku) {
    const { data: direct } = await db.from("items").select("id, dealer_id, centre_id, sku, alt_skus").eq("centre_id", centreId).eq("status", "live").eq("sku", line.sku).maybeSingle();
    if (direct) m = { kind: "item", item: { item_id: direct.id, dealer_id: direct.dealer_id, centre_id: direct.centre_id, sku: direct.sku, alt_skus: direct.alt_skus ?? [], listing_external_id: null, listing_external_variant_id: null }, via: "sku" };
    if (m.kind === "unmatched") {
      const { data: placed } = await db.from("item_places").select("item_id").eq("centre_id", centreId).gt("qty", 0);
      const ids = (placed ?? []).map((p) => p.item_id as string);
      const { data: byPlace } = ids.length ? await db.from("items").select("id, dealer_id, centre_id, sku, alt_skus").in("id", ids).eq("status", "live").eq("sku", line.sku).maybeSingle() : { data: null };
      if (byPlace) m = { kind: "item", item: { item_id: byPlace.id, dealer_id: byPlace.dealer_id, centre_id: byPlace.centre_id, sku: byPlace.sku, alt_skus: byPlace.alt_skus ?? [], listing_external_id: null, listing_external_variant_id: null }, via: "sku" };
    }
  }
  if (m.kind === "unmatched" && channel.owner_type === "dealer" && line.sku) {
    const { data: own } = await db.from("items").select("id, dealer_id, centre_id, sku, alt_skus").eq("dealer_id", channel.owner_id).eq("status", "live").eq("sku", line.sku).maybeSingle();
    if (own) m = { kind: "item", item: { item_id: own.id, dealer_id: own.dealer_id, centre_id: own.centre_id, sku: own.sku, alt_skus: own.alt_skus ?? [], listing_external_id: null, listing_external_variant_id: null }, via: "sku" };
  }
  // Still nothing: an unknown ticket belongs to the dealer whose code it starts with.
  if (m.kind === "unmatched" && channel.type === "manual" && centreId && line.sku) {
    const prefix = line.sku.match(/^([A-Z][A-Z0-9]{1,3}?)\d{1,4}$/)?.[1];
    if (prefix) {
      // Codes are unique per centre, so look the prefix up among this centre's dealers.
      const { data: link } = await db.from("dealer_centres").select("dealer_id, dealers!inner(code)").eq("centre_id", centreId).is("left_at", null).eq("dealers.code", prefix).maybeSingle();
      if (link) m = { kind: "dealer_only", dealer_id: link.dealer_id, ticket_no: line.sku };
    }
  }

  // Sold price is the real price. amount_pence is what was paid; listed price is kept separately.
  const base = {
    channel_id: channel.id,
    external_order_id: line.external_order_id,
    external_line_id: line.external_line_id ?? "",
    amount_pence: line.amount_pence,
    fees_pence: line.fees_pence,
    discount_pence: line.discount_pence ?? 0,
    postage_pence: line.postage_pence ?? 0,
    payment_type: line.payment_type,
    sold_at: line.sold_at,
    raw: line.raw,
  };

  if (m.kind === "item") {
    const { data: itemRow } = await db.from("items").select("listed_price_pence, price_pence").eq("id", m.item.item_id).single();
    const listed = itemRow?.listed_price_pence ?? itemRow?.price_pence ?? null;
    const placeId = channel.owner_type === "centre" ? channel.owner_id : null;
    // Centre online shop: the 20% online commission (15% Dealer Centre, 5% the centre) is a fee on the sale
    let channelFee = 0;
    if (channel.owner_type === "centre" && channel.type === "shopify") {
      const { data: c } = await db.from("centres").select("online_commission_bps").eq("id", channel.owner_id).single();
      channelFee = Math.round((line.amount_pence * (c?.online_commission_bps ?? 2000)) / 10000);
    }
    const { data: sale } = await db
      .from("sales")
      // A dealer's own channel (own Shopify, own manual "sold elsewhere") is not a centre sale: no centre, no commission.
      .insert({ ...base, item_id: m.item.item_id, dealer_id: m.item.dealer_id, centre_id: channel.owner_type === "dealer" ? null : (centreId ?? m.item.centre_id), ticket_no: m.item.sku, listed_price_pence: listed, channel_fee_pence: channelFee })
      .select("id")
      .single();
    const taken = await takeOneAt(db, m.item.item_id, placeId, line.sold_at);
    if (taken.soldOut) await enqueue(db, "close_item_on_other_channels", { item_id: m.item.item_id, sold_channel_id: channel.id });
    const online = channel.owner_type === "centre" && channel.type === "shopify";
    if (online && sale?.id) await db.from("fulfilments").upsert({ sale_id: sale.id, centre_id: centreId ?? m.item.centre_id }, { onConflict: "sale_id", ignoreDuplicates: true });
    await enqueue(db, "notify_sale", { sale_id: sale?.id, item_id: m.item.item_id, dealer_id: m.item.dealer_id, online });
    return { status: "matched" as const, via: m.via, item_id: m.item.item_id };
  }

  if (m.kind === "dealer_only") {
    await db.from("sales").insert({ ...base, item_id: null, dealer_id: m.dealer_id, centre_id: centreId, ticket_no: m.ticket_no });
    await enqueue(db, "notify_sale", { item_id: null, dealer_id: m.dealer_id, amount_pence: line.amount_pence, ticket_no: m.ticket_no });
    return { status: "dealer_only" as const, dealer_id: m.dealer_id };
  }

  await db.from("sales").insert({ ...base, item_id: null, dealer_id: null, centre_id: centreId });
  return { status: "unmatched" as const };
}

/** Refund or cancellation: reopen the item and void the sale. */
export async function voidSale(db: Admin, channel: ChannelRow, externalOrderId: string) {
  const { data: sales } = await db
    .from("sales")
    .select("id, item_id, centre_id")
    .eq("channel_id", channel.id)
    .eq("external_order_id", externalOrderId)
    .is("voided_at", null);
  for (const s of sales ?? []) {
    await db.from("sales").update({ voided_at: new Date().toISOString() }).eq("id", s.id);
    if (s.item_id) {
      const wasSold = await giveOneBack(db, s.item_id, s.centre_id ?? null);
      if (wasSold) await enqueue(db, "reopen_item_on_channels", { item_id: s.item_id });
    }
  }
}
