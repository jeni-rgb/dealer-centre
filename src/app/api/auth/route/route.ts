import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { routeFor, safeNext } from "@/lib/auth-route";

/** After a password sign in: same routing as the email link callback. */
export async function GET(req: Request) {
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) return NextResponse.redirect(new URL("/signin", env.appUrl()));
  await supabaseAdmin().from("users").upsert({ id: data.user.id, email: data.user.email! }, { onConflict: "id", ignoreDuplicates: true });
  return NextResponse.redirect(new URL(await routeFor(data.user.id, next), env.appUrl()));
}
