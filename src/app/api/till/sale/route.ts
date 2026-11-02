import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkTillPin } from "@/lib/till/pin";
import { recordSale } from "@/lib/sales/record";
import type { ChannelRow } from "@/lib/channels/types";

const Input = z.object({ centre_id: z.string().uuid(), pin: z.string().min(4).max(8), ticket: z.string().min(3).max(12), amount_pence: z.number().int().min(0), payment_type: z.enum(["CASH", "CARD"]) });

/** Record one sale at the moment of purchase from the till screen. Same path as End of day, one ticket at a time. */
export async function POST(req: Request) {
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();
  if (!(await checkTillPin(db, p.data.centre_id, p.data.pin))) return NextResponse.json({ error: "wrong PIN" }, { status: 401 });
  const { data: chId } = await db.rpc("ensure_manual_channel", { p_centre_id: p.data.centre_id });
  const { data: channel } = await db.from("channels").select("*").eq("id", chId).single();
  const now = new Date().toISOString();
  const r = await recordSale(db, channel as ChannelRow, {
    external_order_id: `till-${p.data.centre_id}-${now}`, external_line_id: crypto.randomUUID(),
    external_variant_id: null, external_item_id: null, sku: p.data.ticket, category_id: null, note: null,
    amount_pence: p.data.amount_pence, fees_pence: 0, payment_type: p.data.payment_type, sold_at: now, raw: { source: "till_screen" },
  });
  return NextResponse.json(r);
}
