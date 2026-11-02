import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

/** Magic link lands here. Exchanges the code, ensures a users row, sends them on. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  let next = u.searchParams.get("next") ?? "/app";
  const sb = await supabaseServer();
  if (code) {
    const { data } = await sb.auth.exchangeCodeForSession(code);
    if (data.user) {
      const db = supabaseAdmin();
      await db.from("users").upsert({ id: data.user.id, email: data.user.email! }, { onConflict: "id", ignoreDuplicates: true });
      // Send people where they belong: a centre owner who signed in through the generic link goes to their centre,
      // a dealer to Today, a platform admin to Admin. Explicit sign up links are left alone.
      if (next === "/app" || next === "/" || next === "/centre") {
        const [{ data: me }, { data: owned }] = await Promise.all([
          db.from("users").select("dealer_id, is_platform_admin").eq("id", data.user.id).maybeSingle(),
          db.from("centre_owners").select("centre_id").eq("user_id", data.user.id).limit(1),
        ]);
        if (me?.dealer_id) next = "/app";
        else if (owned?.length) next = "/centre";
        else if (me?.is_platform_admin) next = "/admin";
        else if (next === "/centre") next = "/signup/centre";
        else next = "/signup/dealer";
      }
    }
  }
  return NextResponse.redirect(new URL(next, env.appUrl()));
}
