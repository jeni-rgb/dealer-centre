import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { ebayOAuth } from "@/lib/channels/ebay";
import { supabaseServer } from "@/lib/supabase/server";

/** Start eBay OAuth for a centre's eBay store. ?id=<centre_id> */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.redirect(new URL("/signin", req.url));
  const centreId = new URL(req.url).searchParams.get("id");
  if (!centreId) return new NextResponse("centre required", { status: 400 });
  const sb = await supabaseServer();
  const { data } = await sb.from("centre_owners").select("centre_id").eq("centre_id", centreId).maybeSingle();
  if (!data && !me.is_platform_admin) return new NextResponse("not your centre", { status: 403 });
  const state = Buffer.from(JSON.stringify({ centreId, n: crypto.randomUUID() })).toString("base64url");
  const res = NextResponse.redirect(ebayOAuth.authorizeUrl(state));
  res.cookies.set("eb_state", state, { httpOnly: true, maxAge: 600, path: "/" });
  return res;
}
