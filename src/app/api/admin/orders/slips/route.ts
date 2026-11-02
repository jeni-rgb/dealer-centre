import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { listOnlineOrders } from "@/lib/fulfilment/orders";
import { renderPackingSlips } from "@/lib/fulfilment/slips";

/** Packing slips for the selected orders (?ids=a,b,c), one page each. Marks them slip printed. */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me?.is_platform_admin) return new NextResponse("admin only", { status: 403 });
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean);
  const db = supabaseAdmin();
  const orders = (await listOnlineOrders(db, {})).filter((o) => ids.includes(o.sale_id));
  if (orders.length) await db.from("fulfilments").upsert(orders.map((o) => ({ sale_id: o.sale_id, centre_id: o.centre_id, slip_printed_at: new Date().toISOString(), updated_at: new Date().toISOString() })), { onConflict: "sale_id" });
  const bytes = await renderPackingSlips(orders);
  return new NextResponse(Buffer.from(bytes), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="packing-slips-${new Date().toISOString().slice(0, 10)}.pdf"` } });
}
