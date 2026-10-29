import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { shopifyOAuth } from "@/lib/channels/shopify";

/** Start Shopify OAuth. ?shop=mystore.myshopify.com */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.redirect(new URL("/signin", req.url));
  const shop = new URL(req.url).searchParams.get("shop")?.trim().toLowerCase();
  if (!shop || !/^[a-z0-9-]+\.myshopify\.com$/.test(shop)) return new NextResponse("enter your myshopify.com address", { status: 400 });
  const state = Buffer.from(JSON.stringify({ dealerId: me.dealer_id, shop, n: crypto.randomUUID() })).toString("base64url");
  const res = NextResponse.redirect(shopifyOAuth.authorizeUrl(shop, state));
  res.cookies.set("sh_state", state, { httpOnly: true, maxAge: 600, path: "/" });
  return res;
}
