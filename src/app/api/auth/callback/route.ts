import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { routeFor, safeNext } from "@/lib/auth-route";

/** Magic link lands here. Exchanges the code, ensures a users row, sends them on. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  let next = safeNext(u.searchParams.get("next"));
  const sb = await supabaseServer();
  if (code) {
    const { data } = await sb.auth.exchangeCodeForSession(code);
    if (data.user) {
      const db = supabaseAdmin();
      await db.from("users").upsert({ id: data.user.id, email: data.user.email! }, { onConflict: "id", ignoreDuplicates: true });
      next = await routeFor(data.user.id, next);
    }
  }
  return NextResponse.redirect(new URL(next, env.appUrl()));
}

