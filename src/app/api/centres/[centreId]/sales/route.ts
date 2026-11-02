import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { recordSale } from "@/lib/sales/record";
import { normaliseSku } from "@/lib/sku";
import type { ChannelRow } from "@/lib/channels/types";

const Line = z.object({
  ticket: z.string().min(3).max(12),
  amount_pence: z.number().int().min(0),
  payment_type: z.enum(["CASH", "CARD"]),
  sold_at: z.string(),
});
const Input = z.object({ lines: z.array(Line).min(1).max(200) });

/** End of day: centre owner records floor sales from collected tickets. */
export async function POST(req: Request, { params }: { params: Promise<{ centreId: string }> }) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const { centreId } = await params;
  const sb = await supabaseServer();
  const { data: owns } = await sb.from("centre_owners").select("centre_id").eq("centre_id", centreId).maybeSingle();
  if (!owns && !me.is_platform_admin) return NextResponse.json({ error: "not your centre" }, { status: 403 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: chId } = await db.rpc("ensure_manual_channel", { p_centre_id: centreId });
  const { data: channel } = await db.from("channels").select("*").eq("id", chId).single();
  const results = [];
  for (const l of p.data.lines) {
    const sku = normaliseSku(l.ticket);
    const r = await recordSale(db, channel as ChannelRow, {
      external_order_id: `eod-${centreId}-${l.sold_at.slice(0, 10)}-${sku}`,
      external_line_id: crypto.randomUUID(),
      external_variant_id: null, external_item_id: null,
      sku, category_id: null, note: null,
      amount_pence: l.amount_pence, fees_pence: 0,
      payment_type: l.payment_type, sold_at: l.sold_at, raw: { source: "eod", by: me.id },
    });
    results.push({ ticket: sku, ...r });
  }
  await db.from("sales").update({ recorded_by: me.id }).eq("channel_id", channel!.id).is("recorded_by", null);
  return NextResponse.json({ results });
}

/** Look up a ticket so the form can prefill title and price. */
export async function GET(req: Request, { params }: { params: Promise<{ centreId: string }> }) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const { centreId } = await params;
  const sku = normaliseSku(new URL(req.url).searchParams.get("ticket") ?? "");
  if (sku.length < 3) return NextResponse.json({ item: null });
  const db = supabaseAdmin();
  const sel = "id, sku, title, price_pence, status, centre_id, dealer_id, dealers(name, code)";
  // "TD 1" or "TD01" typed at the till means TD0001
  const candidates = [sku];
  const short = sku.match(/^([A-Z][A-Z0-9]{1,3}?)(\d{1,3})$/);
  if (short) candidates.push(`${short[1]}${short[2].padStart(4, "0")}`);
  for (const c of candidates) {
    let { data } = await db.from("items").select(sel).eq("centre_id", centreId).or(`sku.eq.${c},alt_skus.cs.{${c}}`).maybeSingle();
    if (!data) {
      // Listed before the dealer was approved, or without a centre chosen: if the dealer is linked here, it is this centre's item.
      const { data: loose } = await db.from("items").select(sel).is("centre_id", null).or(`sku.eq.${c},alt_skus.cs.{${c}}`).maybeSingle();
      if (loose) {
        const { data: link } = await db.from("dealer_centres").select("id").eq("dealer_id", loose.dealer_id).eq("centre_id", centreId).is("left_at", null).maybeSingle();
        if (link) { await db.from("items").update({ centre_id: centreId }).eq("id", loose.id); data = { ...loose, centre_id: centreId }; }
      }
    }
    if (data) return NextResponse.json({ item: { ...data, dealer: data.dealers } });
  }
  return NextResponse.json({ item: null });
}
