import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { squareOAuth } from "@/lib/channels/square";
import { supabaseServer } from "@/lib/supabase/server";

/** Start Square OAuth. ?owner=centre&id=<centre_id> or ?owner=dealer */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.redirect(new URL("/signin", req.url));
  const u = new URL(req.url);
  const ownerType = u.searchParams.get("owner") === "centre" ? "centre" : "dealer";
  const ownerId = ownerType === "centre" ? u.searchParams.get("id") : me.dealer_id;
  if (!ownerId) return new NextResponse("missing owner", { status: 400 });

  if (ownerType === "centre") {
    const sb = await supabaseServer();
    const { data } = await sb.from("centre_owners").select("centre_id").eq("centre_id", ownerId).maybeSingle();
    if (!data && !me.is_platform_admin) return new NextResponse("not your centre", { status: 403 });
  }
  const state = Buffer.from(JSON.stringify({ ownerType, ownerId, n: crypto.randomUUID() })).toString("base64url");
  const res = NextResponse.redirect(squareOAuth.authorizeUrl(state));
  res.cookies.set("sq_state", state, { httpOnly: true, maxAge: 600, path: "/" });
  return res;
}
