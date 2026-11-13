import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { env } from "@/lib/env";
import { sumupAuthorizeUrl } from "@/lib/sumup/oauth";
import { supabaseServer } from "@/lib/supabase/server";

/** Start SumUp OAuth. Shown only when SUMUP_CLIENT_ID and SUMUP_CLIENT_SECRET are set. */
export async function GET(req: Request) {
  if (!env.sumup.configured()) return new NextResponse("SumUp is not set up", { status: 404 });
  const me = await getMe();
  if (!me) return NextResponse.redirect(new URL("/signin", req.url));
  const u = new URL(req.url);
  const ownerType = u.searchParams.get("owner") === "centre" ? "centre" : "dealer";
  const ownerId = ownerType === "centre" ? u.searchParams.get("id") : me.dealer_id;
  if (!ownerId) return new NextResponse("missing owner", { status: 400 });
  if (ownerType === "centre") {
    const sb = await supabaseServer();
    const { data } = await sb.from("centre_owners").select("centre_id").eq("centre_id", ownerId).eq("user_id", me.id).maybeSingle();
    if (!data && !me.is_platform_admin) return new NextResponse("not your centre", { status: 403 });
  }
  const origin = u.origin;
  const state = Buffer.from(JSON.stringify({ ownerType, ownerId, n: crypto.randomUUID() })).toString("base64url");
  const res = NextResponse.redirect(sumupAuthorizeUrl(state, origin));
  res.cookies.set("su_state", state, { httpOnly: true, maxAge: 600, path: "/" });
  return res;
}
