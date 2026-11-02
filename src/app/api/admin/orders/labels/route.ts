import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { listOnlineOrders } from "@/lib/fulfilment/orders";
import { renderDespatchNotes, mergeLabelsAndNotes } from "@/lib/fulfilment/slips";
import { fetchPending } from "@/lib/fulfilment/postage";
import { shopifyFulfil } from "@/lib/channels/shopify";
import type { ChannelRow } from "@/lib/channels/types";

/** Reprint: stored labels and despatch notes for the selected orders (?ids=). Nothing is bought. */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me?.is_platform_admin) return new NextResponse("admin only", { status: 403 });
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean);
  const db = supabaseAdmin();
  let orders = (await listOnlineOrders(db, {})).filter((o) => ids.includes(o.sale_id));
  // labels that were still being allocated when postage was bought
  for (const o of orders.filter((q) => !q.label_path && q.fulfil_note === "Label pending from carrier")) {
    const r = await fetchPending(o)?.catch(() => null);
    if (r && r.ok) {
      const now = new Date().toISOString(); const path = `labels/orders/${o.sale_id}.pdf`;
      await db.storage.from("files").upload(path, Buffer.from(r.labelPdf), { contentType: "application/pdf", upsert: true });
      await db.from("fulfilments").update({ status: "despatched", despatched_at: now, label_path: path, tracking: r.tracking, carrier: r.carrier ?? null, carrier_reference: r.orderIdentifier, note: null, updated_at: now }).eq("sale_id", o.sale_id);
      const { data: sale } = await db.from("sales").select("external_order_id, channel_id").eq("id", o.sale_id).single();
      if (sale?.external_order_id.startsWith("gid://shopify/Order/")) { const { data: channel } = await db.from("channels").select("*").eq("id", sale.channel_id).single(); try { if (channel && await shopifyFulfil(channel as ChannelRow, sale.external_order_id, r.tracking, r.carrier ?? "Royal Mail")) await db.from("fulfilments").update({ shopify_fulfilled: true }).eq("sale_id", o.sale_id); } catch {} }
    }
  }
  orders = (await listOnlineOrders(db, {})).filter((o) => ids.includes(o.sale_id));
  const labels: Uint8Array[] = [];
  for (const o of orders.filter((q) => q.label_path)) { const { data } = await db.storage.from("files").download(o.label_path!); if (data) labels.push(new Uint8Array(await data.arrayBuffer())); }
  const pdf = await mergeLabelsAndNotes(labels, await renderDespatchNotes(orders));
  return new NextResponse(Buffer.from(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="labels-and-notes.pdf"` } });
}
