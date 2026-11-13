import type { Admin } from "@/lib/supabase/server";
import type { ChannelRow, ItemRow } from "@/lib/channels/types";
import { squareAdapter } from "@/lib/channels/square";
import { shopifyAdapter } from "@/lib/channels/shopify";
import { renderLabelBatch, renderLabelPdf } from "@/lib/labels/render";
import { logoForDealer } from "@/lib/labels/load";
import { recordSale } from "@/lib/sales/record";
import { sendSaleNotification } from "@/lib/notify/sale";
import { enqueue, type JobType } from "./queue";

const adapters = { square: squareAdapter, shopify: shopifyAdapter } as const;
const adapterFor = (t: string) => adapters[t as keyof typeof adapters];

async function getChannel(db: Admin, id: string) {
  const { data, error } = await db.from("channels").select("*").eq("id", id).single();
  if (error || !data) throw new Error(`channel ${id} not found`);
  return data as ChannelRow;
}
async function getItem(db: Admin, id: string) {
  const { data, error } = await db.from("items").select("*").eq("id", id).single();
  if (error || !data) throw new Error(`item ${id} not found`);
  return data as ItemRow;
}

export const handlers: Record<JobType, (db: Admin, p: Record<string, unknown>) => Promise<void>> = {
  async sync_item_to_channel(db, p) {
    const listingId = p.listing_id as string;
    const { data: listing } = await db.from("item_listings").select("*").eq("id", listingId).single();
    if (!listing || listing.status === "live") return;
    const channel = await getChannel(db, listing.channel_id);
    const item = await getItem(db, listing.item_id);

    let categoryId: string | null = null;
    if (channel.type === "square" && channel.owner_type === "centre") {
      const { data: dc } = await db
        .from("dealer_centres")
        .select("square_category_id")
        .eq("dealer_id", item.dealer_id)
        .eq("centre_id", channel.owner_id)
        .maybeSingle();
      categoryId = dc?.square_category_id ?? null;
    }
    try {
      const existing = listing.external_id ? { external_id: listing.external_id, external_variant_id: listing.external_variant_id } : null;
      const ref = await adapterFor(channel.type).upsertItem(channel, item, { categoryId, listingId, existing });
      await db
        .from("item_listings")
        .update({ external_id: ref.external_id, external_variant_id: ref.external_variant_id, status: "live", synced_at: new Date().toISOString(), last_error: null })
        .eq("id", listingId);
    } catch (e) {
      await db.from("item_listings").update({ status: "failed", last_error: String(e) }).eq("id", listingId);
      throw e;
    }
  },

  async render_label(db, p) {
    const jobId = p.print_job_id as string;
    const { data: pj } = await db.from("print_jobs").select("*, items(*), dealers(code, name), printers(provider, provider_id, label_width_mm, label_height_mm)").eq("id", jobId).single();
    if (!pj || pj.status === "not_printed") return;
    const item = pj.items as ItemRow;
    let centreName: string | null = null;
    if (item.centre_id) {
      const { data: c } = await db.from("centres").select("name").eq("id", item.centre_id).single();
      centreName = c?.name ?? null;
    }
    const dealer = pj.dealers as { code: string; name?: string | null };
    const sheet = {
      sku: item.sku,
      dealerCode: dealer.code,
      dealerName: dealer.name ?? null,
      title: item.title,
      pricePence: item.price_pence,
      centreName,
      widthMm: pj.printers?.label_width_mm ?? 62,
      heightMm: pj.printers?.label_height_mm ?? 29,
      logo: await logoForDealer(db, item.dealer_id),
    };
    const copies = Math.min(100, Math.max(1, Number(pj.copies) || 1));
    const pdf = copies === 1 ? await renderLabelPdf(sheet) : await renderLabelBatch(Array.from({ length: copies }, () => sheet));
    const path = `labels/${item.dealer_id}/${item.sku}.pdf`;
    await db.storage.from("files").upload(path, pdf, { contentType: "application/pdf", upsert: true });

    if (pj.printers?.provider === "printnode" && pj.printers.provider_id) {
      const r = await fetch("https://api.printnode.com/printjobs", {
        method: "POST",
        headers: {
          authorization: "Basic " + Buffer.from(`${process.env.PRINTNODE_API_KEY}:`).toString("base64"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          printerId: Number(pj.printers.provider_id),
          title: `Label ${item.sku}`,
          contentType: "pdf_base64",
          content: Buffer.from(pdf).toString("base64"),
          source: "Dealer Centre",
        }),
      });
      if (!r.ok) throw new Error(`printnode ${r.status}`);
      const providerJobId = await r.text();
      await db.from("print_jobs").update({ status: "sent", pdf_path: path, provider_job_id: providerJobId }).eq("id", jobId);
    } else {
      // Don't undo "printed": the user may have tapped Open label to print before this background render finished.
      await db.from("print_jobs").update({ pdf_path: path }).eq("id", jobId);
      await db.from("print_jobs").update({ status: "ready" }).eq("id", jobId).neq("status", "printed");
    }
  },

  async close_item_on_other_channels(db, p) {
    const itemId = p.item_id as string;
    const soldOn = p.sold_channel_id as string;
    const { data: listings } = await db.from("item_listings").select("*").eq("item_id", itemId).eq("status", "live");
    for (const l of listings ?? []) {
      if (l.channel_id === soldOn) {
        await db.from("item_listings").update({ status: "closed" }).eq("id", l.id);
        continue;
      }
      const ch = await getChannel(db, l.channel_id);
      await adapterFor(ch.type).setInventory(ch, { external_id: l.external_id, external_variant_id: l.external_variant_id }, 0);
      await db.from("item_listings").update({ status: "closed" }).eq("id", l.id);
    }
  },

  async reopen_item_on_channels(db, p) {
    const itemId = p.item_id as string;
    const { data: listings } = await db.from("item_listings").select("*").eq("item_id", itemId).eq("status", "closed");
    for (const l of listings ?? []) {
      const ch = await getChannel(db, l.channel_id);
      await adapterFor(ch.type).setInventory(ch, { external_id: l.external_id, external_variant_id: l.external_variant_id }, 1);
      await db.from("item_listings").update({ status: "live" }).eq("id", l.id);
    }
  },

  async backfill_channel(db, p) {
    const channel = await getChannel(db, p.channel_id as string);
    let q = db.from("items").select("id, on_own_shopify, on_centre_shopify").eq("status", "live");
    q = channel.owner_type === "dealer" ? q.eq("dealer_id", channel.owner_id) : q.eq("centre_id", channel.owner_id);
    const { data: items } = await q;
    for (const it of items ?? []) {
      if (channel.owner_type === "dealer" && channel.type === "shopify" && !it.on_own_shopify) continue;
      if (channel.owner_type === "centre" && channel.type === "shopify" && !it.on_centre_shopify) continue;
      const { data: l } = await db
        .from("item_listings")
        .upsert({ item_id: it.id, channel_id: channel.id }, { onConflict: "item_id,channel_id", ignoreDuplicates: true })
        .select("id, status")
        .maybeSingle();
      if (l && l.status === "pending") await enqueue(db, "sync_item_to_channel", { listing_id: l.id });
    }
    // Pull last 12 months of sales too
    await enqueue(db, "reconcile_channel", { channel_id: channel.id, since: new Date(Date.now() - 365 * 86400_000).toISOString() });
  },

  async reconcile_channel(db, p) {
    const channel = await getChannel(db, p.channel_id as string);
    const since = p.since ? new Date(p.since as string) : new Date(Date.now() - 48 * 3600_000);
    const lines = await adapterFor(channel.type).listOrderLines(channel, since);
    for (const line of lines) await recordSale(db, channel, line);
  },

  async notify_sale(db, p) {
    await sendSaleNotification(db, p as { item_id: string | null; dealer_id: string; amount_pence?: number; ticket_no?: string | null; online?: boolean });
  },
};
