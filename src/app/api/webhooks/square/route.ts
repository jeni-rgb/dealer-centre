import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { squareClient, squareOrderToLines, verifySquareSignature } from "@/lib/channels/square";
import { recordSale, voidSale } from "@/lib/sales/record";
import type { ChannelRow } from "@/lib/channels/types";


/**
 * Square webhook. Verify, log, respond fast. The order fetch is small so it runs inline,
 * everything heavier is a job.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("x-square-hmacsha256-signature") ?? "";
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/square`;
  if (!verifySquareSignature(body, sig, url)) return new NextResponse("bad signature", { status: 401 });

  const evt = JSON.parse(body) as { event_id: string; type: string; merchant_id: string; data: { object: Record<string, unknown> } };
  const db = supabaseAdmin();

  const { error: dup } = await db.from("webhook_log").insert({
    source: "square",
    event_type: evt.type,
    external_event_id: evt.event_id,
    payload: evt,
  });
  if (dup) return NextResponse.json({ ok: true, duplicate: true });

  const { data: channel } = await db.from("channels").select("*").eq("type", "square").eq("external_account_id", evt.merchant_id).maybeSingle();
  if (!channel) return NextResponse.json({ ok: true, ignored: "unknown merchant" });
  await db.from("channels").update({ last_webhook_at: new Date().toISOString() }).eq("id", channel.id);

  try {
    if (evt.type === "order.created" || evt.type === "order.updated" || evt.type === "payment.completed") {
      const orderId =
        (evt.data.object as { order_created?: { order_id: string }; order_updated?: { order_id: string }; payment?: { order_id: string } }).order_created?.order_id ??
        (evt.data.object as { order_updated?: { order_id: string } }).order_updated?.order_id ??
        (evt.data.object as { payment?: { order_id: string } }).payment?.order_id;
      if (orderId) {
        const c = squareClient((channel as ChannelRow).access_token!);
        const { order } = await c.orders.get({ orderId });
        if (order?.state === "COMPLETED") {
          for (const line of squareOrderToLines(order)) await recordSale(db, channel as ChannelRow, line);
        }
      }
    }
    if (evt.type === "refund.created") {
      const orderId = (evt.data.object as { refund?: { order_id?: string } }).refund?.order_id;
      if (orderId) await voidSale(db, channel as ChannelRow, orderId);
    }
    await db.from("webhook_log").update({ status: "processed", processed_at: new Date().toISOString() }).eq("source", "square").eq("external_event_id", evt.event_id);
  } catch (e) {
    await db.from("webhook_log").update({ status: "error", error: String(e) }).eq("source", "square").eq("external_event_id", evt.event_id);
  }
  return NextResponse.json({ ok: true });
}
