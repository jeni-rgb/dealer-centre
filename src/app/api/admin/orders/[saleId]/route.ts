import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { shopifyFulfil } from "@/lib/channels/shopify";
import type { ChannelRow } from "@/lib/channels/types";

const Input = z.object({ status: z.enum(["new", "collected", "packed", "posted", "missing"]), carrier: z.string().max(40).optional(), tracking: z.string().max(80).optional(), note: z.string().max(500).optional() });

/** Shop manager moves an online order along: collected, packed, posted (with tracking, pushed to Shopify), or missing. */
export async function PATCH(req: Request, { params }: { params: Promise<{ saleId: string }> }) {
  const me = await getMe();
  if (!me?.is_platform_admin) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const { saleId } = await params;
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();
  const { data: sale } = await db.from("sales").select("id, centre_id, external_order_id, channel_id").eq("id", saleId).single();
  if (!sale) return NextResponse.json({ error: "not found" }, { status: 404 });
  const now = new Date().toISOString();
  const stamp = { collected: { collected_at: now }, packed: { packed_at: now }, posted: { posted_at: now }, new: {}, missing: {} }[p.data.status];
  const { data: row, error } = await db.from("fulfilments").upsert({
    sale_id: saleId, centre_id: sale.centre_id, status: p.data.status, ...stamp,
    ...(p.data.carrier !== undefined ? { carrier: p.data.carrier || null } : {}), ...(p.data.tracking !== undefined ? { tracking: p.data.tracking || null } : {}), ...(p.data.note !== undefined ? { note: p.data.note || null } : {}),
    updated_by: me.id, updated_at: now,
  }, { onConflict: "sale_id" }).select("shopify_fulfilled, tracking, carrier").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let shopify: boolean | null = null;
  if (p.data.status === "posted" && !row.shopify_fulfilled && sale.external_order_id.startsWith("gid://shopify/Order/")) {
    const { data: channel } = await db.from("channels").select("*").eq("id", sale.channel_id).single();
    try {
      shopify = channel ? await shopifyFulfil(channel as ChannelRow, sale.external_order_id, row.tracking, row.carrier) : false;
      if (shopify) await db.from("fulfilments").update({ shopify_fulfilled: true }).eq("sale_id", saleId);
    } catch (e) { console.error("[fulfil] shopify", e); shopify = false; }
  }
  return NextResponse.json({ ok: true, shopify });
}
