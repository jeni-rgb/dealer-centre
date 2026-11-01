import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

const Patch = z.object({ amount_pence: z.number().int().min(0).optional(), payment_type: z.enum(["CASH", "CARD", "online", "other"]).optional(), sold_at: z.string().optional() });

/** Correct a sale: the price actually paid, cash or card, or the date. Dealer or centre owner. Original kept. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const { id } = await params;
  const p = Patch.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const sb = await supabaseServer();
  const { data: sale } = await sb.from("sales").select("id, amount_pence, original_amount_pence").eq("id", id).maybeSingle(); // RLS limits to own or centre's
  if (!sale) return NextResponse.json({ error: "not found" }, { status: 404 });
  await supabaseAdmin().from("sales").update({
    ...p.data,
    original_amount_pence: sale.original_amount_pence ?? (p.data.amount_pence !== undefined ? sale.amount_pence : null),
    corrected_at: new Date().toISOString(), corrected_by: me.id,
  }).eq("id", id);
  return NextResponse.json({ ok: true });
}

/** Undo a sale (ticket recorded by mistake). Item goes back to live, other channels reopen. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: sale } = await sb.from("sales").select("id, item_id").eq("id", id).maybeSingle();
  if (!sale) return NextResponse.json({ error: "not found" }, { status: 404 });
  const db = supabaseAdmin();
  await db.from("sales").update({ voided_at: new Date().toISOString() }).eq("id", id);
  if (sale.item_id) {
    await db.from("items").update({ status: "live", sold_at: null }).eq("id", sale.item_id);
    const { enqueue } = await import("@/lib/jobs/queue");
    await enqueue(db, "reopen_item_on_channels", { item_id: sale.item_id });
  }
  return NextResponse.json({ ok: true });
}
