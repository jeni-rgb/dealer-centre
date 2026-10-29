import { z } from "zod";
import type { Admin } from "@/lib/supabase/server";
import { enqueue } from "@/lib/jobs/queue";

export const CreateItemInput = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  price_pence: z.number().int().min(0),
  centre_id: z.string().uuid().nullable().optional(),
  photos: z.array(z.object({ path: z.string() })).default([]),
  list_on_shopify: z.boolean().default(true),
  printer_id: z.string().uuid().nullable().optional(),
});
export type CreateItemInput = z.infer<typeof CreateItemInput>;

/**
 * Core flow 1. Creates the item with its SKU and one listing per target channel,
 * then enqueues the fan out. Returns in well under a second.
 */
export async function createItem(db: Admin, dealerId: string, input: CreateItemInput) {
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
      photos: input.photos,
      status: "live",
      price_source: "app",
    })
    .select("*")
    .single();
  if (error || !item) throw new Error(error?.message ?? "item insert failed");

  // Target channels: the centre's Square if placed at a centre, the dealer's own Square if any,
  // the dealer's Shopify if connected and wanted.
  const targets: string[] = [];
  if (input.centre_id) {
    const { data } = await db.from("channels").select("id").eq("owner_type", "centre").eq("owner_id", input.centre_id).eq("type", "square").eq("status", "active");
    targets.push(...(data ?? []).map((c) => c.id));
  }
  const { data: own } = await db.from("channels").select("id, type").eq("owner_type", "dealer").eq("owner_id", dealerId).eq("status", "active");
  for (const c of own ?? []) {
    if (c.type === "square" && !input.centre_id) targets.push(c.id);
    if (c.type === "shopify" && input.list_on_shopify) targets.push(c.id);
  }

  for (const channelId of targets) {
    const { data: l } = await db.from("item_listings").insert({ item_id: item.id, channel_id: channelId }).select("id").single();
    if (l) await enqueue(db, "sync_item_to_channel", { listing_id: l.id });
  }

  if (input.printer_id) {
    const { data: pj } = await db.from("print_jobs").insert({ item_id: item.id, dealer_id: dealerId, printer_id: input.printer_id }).select("id").single();
    if (pj) await enqueue(db, "render_label", { print_job_id: pj.id });
  }

  return item;
}
