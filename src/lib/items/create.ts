import { z } from "zod";
import type { Admin } from "@/lib/supabase/server";
import { enqueue } from "@/lib/jobs/queue";

export const CreateItemInput = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  price_pence: z.number().int().min(0),
  centre_id: z.string().uuid().nullable().optional(),
  photos: z.array(z.object({ path: z.string() })).default([]),
  cost_pence: z.number().int().min(0).nullable().optional(),
  on_own_shopify: z.boolean().default(true),
  on_centre_shopify: z.boolean().default(false),
  on_centre_ebay: z.boolean().default(false),
  print_now: z.boolean().default(true),
  printer_id: z.string().uuid().nullable().optional(),
  source: z.enum(["app", "till"]).default("app"),
});
export type CreateItemInput = z.infer<typeof CreateItemInput>;

/**
 * Core flow 1. Creates the item with its SKU and one listing per target channel,
 * then enqueues the fan out. Returns in well under a second.
 */
export class PlanLimitError extends Error {}

export async function createItem(db: Admin, dealerId: string, input: CreateItemInput) {
  // Plan limit: live items against the dealer's tier
  const { data: dealer } = await db.from("dealers").select("item_limit, plan").eq("id", dealerId).single();
  const { count } = await db.from("items").select("id", { count: "exact", head: true }).eq("dealer_id", dealerId).eq("status", "live");
  if (dealer && input.source === "app" && (count ?? 0) >= dealer.item_limit) {
    throw new PlanLimitError(`You have ${count} live items, your plan allows ${dealer.item_limit}. Upgrade in Settings to list more.`);
  }
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
      price_pence: input.price_pence,
      listed_price_pence: input.price_pence,
      cost_pence: input.cost_pence ?? null,
      photos: input.photos,
      status: "live",
      price_source: input.source,
      on_own_shopify: input.on_own_shopify,
      on_centre_shopify: input.on_centre_shopify,
      on_centre_ebay: input.on_centre_ebay,
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
      if (c.type === "ebay" && input.on_centre_ebay) targets.push(c.id);
    }
  }
  const { data: own } = await db.from("channels").select("id, type").eq("owner_type", "dealer").eq("owner_id", dealerId).eq("status", "active");
  for (const c of own ?? []) {
    if (c.type === "square" && !input.centre_id) targets.push(c.id);
    if (c.type === "shopify" && input.on_own_shopify) targets.push(c.id);
  }

  for (const channelId of targets) {
    const { data: l } = await db.from("item_listings").insert({ item_id: item.id, channel_id: channelId }).select("id").single();
    if (l) await enqueue(db, "sync_item_to_channel", { listing_id: l.id });
  }

  // Every listed item has a label record. Print now sends it; off leaves it as not_printed.
  const printNow = input.print_now && !!input.printer_id;
  const { data: pj } = await db
    .from("print_jobs")
    .insert({ item_id: item.id, dealer_id: dealerId, printer_id: input.printer_id ?? null, status: printNow ? "queued" : "not_printed", requested_at: printNow ? new Date().toISOString() : null })
    .select("id")
    .single();
  if (pj && printNow) await enqueue(db, "render_label", { print_job_id: pj.id });

  return item;
}
