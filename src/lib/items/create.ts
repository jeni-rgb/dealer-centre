import { z } from "zod";
import type { Admin } from "@/lib/supabase/server";
import { enqueue } from "@/lib/jobs/queue";

export const CreateItemInput = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  delivery: z.enum(["small", "medium", "large", "furniture"]).default("small"),
  price_pence: z.number().int().min(0),
  centre_id: z.string().uuid().nullable().optional(),
  photos: z.array(z.object({ path: z.string(), url: z.string().optional(), role: z.enum(["reference", "listing"]).optional() })).default([]),
  cost_pence: z.number().int().min(0).nullable().optional(),
  on_own_shopify: z.boolean().default(true),
  on_centre_shopify: z.boolean().default(false),
  print_now: z.boolean().default(true),
  printer_id: z.string().uuid().nullable().optional(),
  source: z.enum(["app", "till", "invoice"]).default("app"),
  qty: z.number().int().min(1).max(200).optional(),
  invoice_id: z.string().nullable().optional(),
});
export type CreateItemInput = z.infer<typeof CreateItemInput>;

/**
 * Core flow 1. Creates the item with its SKU and one listing per target channel,
 * then enqueues the fan out. Returns in well under a second.
 */
export class PlanLimitError extends Error {
  code: string;
  constructor(message: string, code = "plan_limit") {
    super(message);
    this.code = code;
  }
}

export async function createItem(db: Admin, dealerId: string, input: CreateItemInput, jobIds: string[] = [], opts?: { staffListing?: boolean }) {
  // Plans are by items sold a month, not items listed. Listing is never blocked; the Today screen
  // nudges an upgrade when a dealer has sold past their tier this month. Only a lapsed plan stops listing.
  const { data: dealer } = await db.from("dealers").select("plan, monthly_sold_limit").eq("id", dealerId).single();
  // The centre online shop is Trade and above
  if (dealer && (dealer.monthly_sold_limit ?? 25) <= 25) input.on_centre_shopify = false;
  if (dealer && input.source === "app" && (dealer.plan === "lapsed" || dealer.plan === "cancelled")) {
    throw new PlanLimitError("Your subscription has lapsed. Update your card in Settings to keep listing.");
  }
  // Labels are counted when they print. Listing is not held back for a token payment.
  void opts?.staffListing;
  // Retry guard: a resubmit of the same item within 10 minutes returns the first one, never a duplicate.
  const { data: dup } = await db.from("items").select("*").eq("dealer_id", dealerId).eq("title", input.title).eq("price_pence", input.price_pence)
    .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (dup && input.source === "app") return dup;
  const { data: sku, error: skuErr } = await db.rpc("next_sku", { p_dealer_id: dealerId });
  if (skuErr || !sku) throw new Error(skuErr?.message ?? "sku failed");

  const { data: item, error } = await db
    .from("items")
    .insert({
      dealer_id: dealerId,
      centre_id: input.centre_id ?? null,
      sku,
      title: input.title,
      description: input.description ?? null,
      delivery: input.delivery,
      price_pence: input.price_pence,
      listed_price_pence: input.price_pence,
      cost_pence: input.cost_pence ?? null,
      photos: input.photos,
      status: "live",
      price_source: input.source,
      on_own_shopify: input.on_own_shopify,
      on_centre_shopify: input.on_centre_shopify,
      ...(input.source === "invoice" ? { qty: input.qty ?? 1, qty_start: input.qty ?? 1, invoice_id: input.invoice_id ?? null } : {}),
    })
    .select("*")
    .single();
  if (error || !item) throw new Error(error?.message ?? "item insert failed");

  // Target channels: the centre's Square if placed at a centre, the dealer's own Square if any,
  // the dealer's Shopify if connected and wanted.
  const targets: string[] = [];
  if (input.centre_id) {
    const { data } = await db.from("channels").select("id, type").eq("owner_type", "centre").eq("owner_id", input.centre_id).eq("status", "active");
    for (const c of data ?? []) {
      if (c.type === "square") targets.push(c.id);
      if (c.type === "shopify" && input.on_centre_shopify) targets.push(c.id);
    }
  }
  const { data: own } = await db.from("channels").select("id, type").eq("owner_type", "dealer").eq("owner_id", dealerId).eq("status", "active");
  for (const c of own ?? []) {
    if (c.type === "square" && !input.centre_id) targets.push(c.id);
    if (c.type === "shopify" && input.on_own_shopify) targets.push(c.id);
  }

  await Promise.all(targets.map(async (channelId) => {
    const { data: l } = await db.from("item_listings").insert({ item_id: item.id, channel_id: channelId }).select("id").single();
    if (l) { const id = await enqueue(db, "sync_item_to_channel", { listing_id: l.id }); if (id) jobIds.push(id); }
  }));

  // Every listed item has a label record. Print now sends it; off leaves it as not_printed.
  const printNow = input.print_now && !!input.printer_id;
  const { data: pj } = await db
    .from("print_jobs")
    .insert({ item_id: item.id, dealer_id: dealerId, printer_id: input.printer_id ?? null, status: printNow ? "queued" : "not_printed", requested_at: printNow ? new Date().toISOString() : null })
    .select("id")
    .single();
  if (pj && printNow) { const id = await enqueue(db, "render_label", { print_job_id: pj.id }); if (id) jobIds.push(id); }

  return item;
}
