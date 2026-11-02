import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { listOnlineOrders } from "@/lib/fulfilment/orders";
import { renderDespatchNotes, mergeLabelsAndNotes } from "@/lib/fulfilment/slips";

/** Reprint: stored labels and despatch notes for the selected orders (?ids=). Nothing is bought. */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me?.is_platform_admin) return new NextResponse("admin only", { status: 403 });
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean);
  const db = supabaseAdmin();
  const orders = (await listOnlineOrders(db, {})).filter((o) => ids.includes(o.sale_id));
  const labels: Uint8Array[] = [];
  for (const o of orders.filter((q) => q.label_path)) { const { data } = await db.storage.from("files").download(o.label_path!); if (data) labels.push(new Uint8Array(await data.arrayBuffer())); }
  const pdf = await mergeLabelsAndNotes(labels, await renderDespatchNotes(orders));
  return new NextResponse(Buffer.from(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="labels-and-notes.pdf"` } });
}
