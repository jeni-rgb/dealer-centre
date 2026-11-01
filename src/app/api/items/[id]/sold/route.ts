import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { recordSale } from "@/lib/sales/record";
import type { ChannelRow } from "@/lib/channels/types";

const Input = z.object({ amount_pence: z.number().int().min(0), payment_type: z.enum(["CASH", "CARD", "online", "other"]).default("CASH"), sold_at: z.string().optional(), where: z.enum(["centre", "elsewhere"]).default("centre") });

/**
 * Dealer marks their own item as sold. Used when a ticket never reached End of day, or the item sold
 * at a fair, from home, or online somewhere the app does not watch. Goes through record_sale so every
 * other channel closes and the statement is right.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const { id } = await params;
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();
  const { data: item } = await db.from("items").select("id, sku, status, centre_id").eq("id", id).eq("dealer_id", me.dealer_id).maybeSingle();
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (item.status === "sold") return NextResponse.json({ error: "already sold" }, { status: 409 });

  // At the centre: the centre's manual channel, so it lands on the centre statement with commission.
  // Elsewhere: the dealer's own manual channel, no centre commission.
  let channel: ChannelRow | null = null;
  if (p.data.where === "centre" && item.centre_id) {
    const { data: chId } = await db.rpc("ensure_manual_channel", { p_centre_id: item.centre_id });
    const { data } = await db.from("channels").select("*").eq("id", chId).single(); channel = data as ChannelRow;
  } else {
    const { data: chId } = await db.rpc("ensure_dealer_manual_channel", { p_dealer_id: me.dealer_id });
    const { data } = await db.from("channels").select("*").eq("id", chId).single(); channel = data as ChannelRow;
  }
  const soldAt = p.data.sold_at ?? new Date().toISOString();
  const r = await recordSale(db, channel!, {
    external_order_id: `dealer-${me.dealer_id}-${item.sku}-${soldAt.slice(0, 10)}`, external_line_id: crypto.randomUUID(),
    external_variant_id: null, external_item_id: null, sku: item.sku, category_id: null, note: null,
    amount_pence: p.data.amount_pence, fees_pence: 0, payment_type: p.data.payment_type, sold_at: soldAt, raw: { source: "dealer_marked_sold", by: me.id },
  });
  return NextResponse.json(r);
}
