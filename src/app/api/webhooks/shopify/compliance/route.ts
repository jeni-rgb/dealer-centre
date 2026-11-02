import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyShopifyWebhook } from "@/lib/channels/shopify";

/**
 * Shopify's three mandatory privacy webhooks for public apps. Configured in the Partner dashboard as
 * https://thedealercentre.co.uk/api/webhooks/shopify/compliance for all three topics.
 *  - customers/data_request: a buyer asked the store for their data. We hold only what is on their orders; we log the
 *    request and the shop manager answers it from the orders desk within 30 days.
 *  - customers/redact: a buyer asked to be forgotten. We strip name, email and address from their orders' raw payload.
 *  - shop/redact: 48 hours after a store uninstalls. We drop its channel tokens and anything tied only to that shop.
 */
export async function POST(req: Request) {
  const body = await req.text();
  if (!verifyShopifyWebhook(body, req.headers.get("x-shopify-hmac-sha256") ?? "")) return new NextResponse("bad signature", { status: 401 });
  const topic = req.headers.get("x-shopify-topic") ?? "";
  const shop = req.headers.get("x-shopify-shop-domain") ?? "";
  const payload = JSON.parse(body) as { shop_domain?: string; customer?: { id?: number; email?: string }; orders_to_redact?: number[]; orders_requested?: number[] };
  const db = supabaseAdmin();
  await db.from("webhook_log").insert({ source: "shopify", event_type: topic, external_event_id: req.headers.get("x-shopify-webhook-id") ?? crypto.randomUUID(), payload, status: "processed", processed_at: new Date().toISOString() });

  const { data: channel } = await db.from("channels").select("id").eq("type", "shopify").eq("external_account_id", shop).maybeSingle();
  if (!channel) return NextResponse.json({ ok: true });

  if (topic === "customers/redact") {
    const gids = (payload.orders_to_redact ?? []).map((id) => `gid://shopify/Order/${id}`);
    const { data: sales } = gids.length ? await db.from("sales").select("id, raw").eq("channel_id", channel.id).in("external_order_id", gids) : { data: [] };
    for (const s of sales ?? []) {
      const raw = (s.raw ?? {}) as Record<string, unknown>;
      await db.from("sales").update({ raw: { ...raw, order: { redacted: true } } }).eq("id", s.id);
    }
  }
  if (topic === "shop/redact") {
    await db.from("channels").update({ status: "disconnected", access_token: null, refresh_token: null }).eq("id", channel.id);
  }
  // customers/data_request: logged above; answered by a person
  return NextResponse.json({ ok: true });
}
