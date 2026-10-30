import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { shopifyOAuth } from "@/lib/channels/shopify";
import { supabaseAdmin } from "@/lib/supabase/server";
import { enqueue } from "@/lib/jobs/queue";

const TOPICS = ["orders/create", "orders/updated", "orders/paid", "refunds/create", "products/update", "app/uninstalled"];

export async function GET(req: Request) {
  const u = new URL(req.url);
  if (!shopifyOAuth.verifyHmac(u.searchParams)) return new NextResponse("bad hmac", { status: 400 });
  const state = u.searchParams.get("state");
  const saved = (await cookies()).get("sh_state")?.value;
  if (!state || state !== saved) return new NextResponse("state mismatch", { status: 400 });
  const { ownerType, ownerId, shop } = JSON.parse(Buffer.from(state, "base64url").toString()) as { ownerType: "dealer" | "centre"; ownerId: string; shop: string };
  if (u.searchParams.get("shop") !== shop) return new NextResponse("shop mismatch", { status: 400 });

  const tok = await shopifyOAuth.exchange(shop, u.searchParams.get("code")!);
  const db = supabaseAdmin();
  const { data: ch } = await db
    .from("channels")
    .upsert(
      { type: "shopify", owner_type: ownerType, owner_id: ownerId, external_account_id: shop, access_token: tok.access_token, scopes: tok.scope.split(","), status: "active" },
      { onConflict: "type,external_account_id" },
    )
    .select("id")
    .single();

  // Register webhooks
  const address = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shopify`;
  for (const topic of TOPICS) {
    await fetch(`https://${shop}/admin/api/${process.env.SHOPIFY_API_VERSION ?? "2025-10"}/webhooks.json`, {
      method: "POST",
      headers: { "content-type": "application/json", "X-Shopify-Access-Token": tok.access_token },
      body: JSON.stringify({ webhook: { topic, address, format: "json" } }),
    }).catch(() => undefined);
  }
  if (ch) await enqueue(db, "backfill_channel", { channel_id: ch.id });
  return NextResponse.redirect(new URL(ownerType === "centre" ? `/centre/settings?centre=${ownerId}&connected=shopify` : "/app/settings?connected=shopify", process.env.NEXT_PUBLIC_APP_URL));
}
