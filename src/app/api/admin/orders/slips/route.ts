import { NextResponse } from "next/server";
import { getMe, isOps } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { listOnlineOrders } from "@/lib/fulfilment/orders";
import { renderDespatchNotes } from "@/lib/fulfilment/slips";

/** Despatch notes for the selected orders (?ids=a,b,c), one page each, before postage is bought (for picking at the bench). */
export async function GET(req: Request) {
  const me = await getMe();
  if (!isOps(me)) return new NextResponse("staff only", { status: 403 });
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean);
  const db = supabaseAdmin();
  const orders = (await listOnlineOrders(db, {})).filter((o) => ids.includes(o.sale_id));
  for (const o of orders) {
    if (!o.despatch_note_no) { const { data: seq } = await db.rpc("next_despatch_note_no"); o.despatch_note_no = (seq as number | null) ?? null; }
    await db.from("fulfilments").upsert({ sale_id: o.sale_id, centre_id: o.centre_id, slip_printed_at: new Date().toISOString(), despatch_note_no: o.despatch_note_no, updated_at: new Date().toISOString() }, { onConflict: "sale_id" });
  }
  const bytes = await renderDespatchNotes(orders);
  return new NextResponse(Buffer.from(bytes), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="despatch-notes-${new Date().toISOString().slice(0, 10)}.pdf"` } });
}
