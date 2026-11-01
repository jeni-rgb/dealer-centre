import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL("/signin", env.appUrl()), { status: 303 });
}
