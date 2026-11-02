import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/** Admin opens the app as a dealer (cookie, this browser only, cleared with ?stop=1). Logged. */
export async function GET(req: Request) {
  const me = await getMe();
  const u = new URL(req.url);
  const store = await cookies();
  if (u.searchParams.get("stop")) { store.delete("admin_as_dealer"); return NextResponse.redirect(new URL("/admin", env.appUrl())); }
  if (!me?.is_platform_admin) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const dealerId = u.searchParams.get("dealer") ?? "";
  if (!dealerId) return NextResponse.json({ error: "dealer?" }, { status: 400 });
  store.set("admin_as_dealer", dealerId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 2 });
  await supabaseAdmin().from("admin_actions").insert({ actor_id: me.id, target_type: "dealer", target_id: dealerId, action: "open_as", detail: {} });
  return NextResponse.redirect(new URL("/app", env.appUrl()));
}
