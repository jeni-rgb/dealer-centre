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
      await voidSale(db, channel as ChannelRow, `gid://shopify/Order/${payload.order_id}`);
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
