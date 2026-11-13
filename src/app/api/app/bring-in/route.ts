import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { dealerWithListing } from "@/lib/billing/tokens";
import { namedSales } from "@/lib/billing/pricing";
import { recordSale } from "@/lib/sales/record";
import { canonicalTicket } from "@/lib/sku";
import type { ChannelRow } from "@/lib/channels/types";

const Line = z.object({
  ticket: z.string().min(3).max(16),
  amount_pence: z.number().int().positive().max(100000000),
  payment_type: z.enum(["CASH", "CARD"]),
  sold_at: z.string(),
});
const Input = z.object({ centre_id: z.string().min(1), lines: z.array(Line).min(1).max(200) });

/** Dealer brings in sales from a paper book or a SumUp file. Only their own tickets, at a centre they belong to. */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const dealer = await dealerWithListing(supabaseAdmin(), me.dealer_id, "plan");
  if (!dealer || !namedSales(dealer)) return NextResponse.json({ error: "Full" }, { status: 403 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "Check the ticket, the amount and the date." }, { status: 400 });
  const db = supabaseAdmin();
  const { data: link } = await db.from("dealer_centres").select("id").eq("dealer_id", me.dealer_id).eq("centre_id", p.data.centre_id).is("left_at", null).maybeSingle();
  if (!link) return NextResponse.json({ error: "You are not at that centre." }, { status: 403 });
  const { data: chId } = await db.rpc("ensure_manual_channel", { p_centre_id: p.data.centre_id });
  const { data: channel } = await db.from("channels").select("*").eq("id", chId).single();
  const results = [];
  for (const line of p.data.lines) {
    const sku = canonicalTicket(line.ticket);
    const { data: item } = await db.from("items").select("id, sku, status").eq("dealer_id", me.dealer_id).eq("centre_id", p.data.centre_id).eq("sku", sku).maybeSingle();
    if (!item) { results.push({ ticket: sku, status: "not_yours" }); continue; }
    if (item.status === "sold") { results.push({ ticket: sku, status: "already_sold" }); continue; }
    const day = line.sold_at.slice(0, 10);
    const r = await recordSale(db, channel as ChannelRow, {
      external_order_id: `paper-${p.data.centre_id}-${sku}-${day}`,
      external_line_id: "1",
      external_variant_id: null, external_item_id: null, sku, category_id: null, note: null,
      amount_pence: line.amount_pence, fees_pence: 0, payment_type: line.payment_type, sold_at: line.sold_at,
      raw: { source: "paper_or_sumup", by: me.id },
    });
    results.push({ ticket: sku, status: r.status });
  }
  return NextResponse.json({ results });
}
