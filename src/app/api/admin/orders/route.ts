import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { shopifyFulfil } from "@/lib/channels/shopify";
import type { ChannelRow } from "@/lib/channels/types";
import { notifyMissing } from "@/lib/fulfilment/missing";

const Input = z.object({
  sale_ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(["new", "collected", "at_unit", "despatched", "missing"]),
  carrier: z.string().max(40).optional(), tracking: z.string().max(80).optional(), note: z.string().max(500).optional(),
});

/**
 * Bulk status change from the orders desk. Despatched is normally set by Shopify when Click & Drop prints the label;
 * setting it here is the manual override (sent another way) and pushes the fulfilment to Shopify so the buyer is told.
 */
export async function PATCH(req: Request) {
  const me = await getMe();
  if (!me?.is_platform_admin) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();
  const now = new Date().toISOString();
  const { data: sales } = await db.from("sales").select("id, centre_id, external_order_id, channel_id").in("id", p.data.sale_ids);
  const stamp = { collected: { collected_at: now }, at_unit: { at_unit_at: now }, despatched: { despatched_at: now }, new: {}, missing: {} }[p.data.status];
  let shopifyOk = 0, shopifyFailed = 0;
  for (const sale of sales ?? []) {
    const { data: row } = await db.from("fulfilments").upsert({
      sale_id: sale.id, centre_id: sale.centre_id, status: p.data.status, ...stamp,
      ...(p.data.carrier !== undefined ? { carrier: p.data.carrier || null } : {}), ...(p.data.tracking !== undefined ? { tracking: p.data.tracking || null } : {}), ...(p.data.note !== undefined ? { note: p.data.note || null } : {}),
      updated_by: me.id, updated_at: now,
    }, { onConflict: "sale_id" }).select("shopify_fulfilled, tracking, carrier").single();
    if (p.data.status === "missing") await notifyMissing(db, sale.id).catch((e) => console.error("[missing]", e));
    if (p.data.status === "despatched" && row && !row.shopify_fulfilled && sale.external_order_id.startsWith("gid://shopify/Order/")) {
      const { data: channel } = await db.from("channels").select("*").eq("id", sale.channel_id).single();
      try {
        const ok = channel ? await shopifyFulfil(channel as ChannelRow, sale.external_order_id, row.tracking, row.carrier) : false;
        if (ok) { await db.from("fulfilments").update({ shopify_fulfilled: true }).eq("sale_id", sale.id); shopifyOk++; } else shopifyFailed++;
      } catch (e) { console.error("[fulfil] shopify", e); shopifyFailed++; }
    }
  }
  return NextResponse.json({ ok: true, updated: (sales ?? []).length, shopifyOk, shopifyFailed });
}
