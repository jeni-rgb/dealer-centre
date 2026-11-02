import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { shopifyWebhookOrderToLines, verifyShopifyWebhook } from "@/lib/channels/shopify";
import { recordSale, voidSale } from "@/lib/sales/record";
import type { ChannelRow } from "@/lib/channels/types";


export async function POST(req: Request) {
  const body = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256") ?? "";
  if (!verifyShopifyWebhook(body, hmac)) return new NextResponse("bad signature", { status: 401 });

  const topic = req.headers.get("x-shopify-topic") ?? "";
  const shop = req.headers.get("x-shopify-shop-domain") ?? "";
  const eventId = req.headers.get("x-shopify-webhook-id") ?? crypto.randomUUID();
  const payload = JSON.parse(body);
  const db = supabaseAdmin();

  const { error: dup } = await db.from("webhook_log").insert({ source: "shopify", event_type: topic, external_event_id: eventId, payload });
  if (dup) return NextResponse.json({ ok: true, duplicate: true });

  const { data: channel } = await db.from("channels").select("*").eq("type", "shopify").eq("external_account_id", shop).maybeSingle();
  if (!channel) return NextResponse.json({ ok: true, ignored: "unknown shop" });
  await db.from("channels").update({ last_webhook_at: new Date().toISOString() }).eq("id", channel.id);

  try {
    if ((topic === "orders/create" || topic === "orders/updated" || topic === "orders/paid") && payload.financial_status === "paid") {
      for (const line of shopifyWebhookOrderToLines(payload)) await recordSale(db, channel as ChannelRow, line);
    }
    if (topic === "refunds/create") {
      const gid = `gid://shopify/Order/${payload.order_id}`;
      await voidSale(db, channel as ChannelRow, gid);
      const { data: refunded } = await db.from("sales").select("id").eq("channel_id", channel.id).eq("external_order_id", gid);
      for (const s of refunded ?? []) await db.from("fulfilments").upsert({ sale_id: s.id, status: "refunded", refunded_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "sale_id" });
    }
    // Click & Drop (or anyone) marks the order fulfilled in Shopify: that is despatch. Tracking comes with it.
    if (topic === "fulfillments/create" || topic === "fulfillments/update") {
      const gid = `gid://shopify/Order/${payload.order_id}`;
      const tracking = payload.tracking_number ?? payload.tracking_numbers?.[0] ?? null;
      const carrier = payload.tracking_company ?? null;
      const { data: sales } = await db.from("sales").select("id, centre_id").eq("channel_id", channel.id).eq("external_order_id", gid);
      for (const s of sales ?? []) await db.from("fulfilments").upsert({ sale_id: s.id, centre_id: s.centre_id, status: "despatched", despatched_at: payload.created_at ?? new Date().toISOString(), tracking, carrier, shopify_fulfilled: true, shopify_fulfillment_id: String(payload.id ?? ""), updated_at: new Date().toISOString() }, { onConflict: "sale_id" });
    }
    if (topic === "app/uninstalled") {
      await db.from("channels").update({ status: "disconnected", access_token: null }).eq("id", channel.id);
    }
    await db.from("webhook_log").update({ status: "processed", processed_at: new Date().toISOString() }).eq("source", "shopify").eq("external_event_id", eventId);
  } catch (e) {
    await db.from("webhook_log").update({ status: "error", error: String(e) }).eq("source", "shopify").eq("external_event_id", eventId);
  }
  return NextResponse.json({ ok: true });
}
