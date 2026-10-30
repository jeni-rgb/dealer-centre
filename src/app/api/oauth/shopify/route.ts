import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { shopifyOAuth } from "@/lib/channels/shopify";
import { supabaseServer } from "@/lib/supabase/server";

/** Start Shopify OAuth. ?shop=mystore.myshopify.com */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.redirect(new URL("/signin", req.url));
  const u = new URL(req.url);
  const shop = u.searchParams.get("shop")?.trim().toLowerCase();
  const centreId = u.searchParams.get("centre");
  if (!shop || !/^[a-z0-9-]+\.myshopify\.com$/.test(shop)) return new NextResponse("enter your myshopify.com address", { status: 400 });
  let ownerType: "dealer" | "centre" = "dealer";
  let ownerId = me.dealer_id;
  if (centreId) {
    const sb = await supabaseServer();
    const { data } = await sb.from("centre_owners").select("centre_id").eq("centre_id", centreId).maybeSingle();
    if (!data && !me.is_platform_admin) return new NextResponse("not your centre", { status: 403 });
    ownerType = "centre"; ownerId = centreId;
  }
  if (!ownerId) return NextResponse.redirect(new URL("/signup/dealer", req.url));
  const state = Buffer.from(JSON.stringify({ ownerType, ownerId, shop, n: crypto.randomUUID() })).toString("base64url");
  const res = NextResponse.redirect(shopifyOAuth.authorizeUrl(shop, state));
  res.cookies.set("sh_state", state, { httpOnly: true, maxAge: 600, path: "/" });
  return res;
}
