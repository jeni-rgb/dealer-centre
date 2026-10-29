import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

/** Magic link lands here. Exchanges the code, ensures a users row, sends them on. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const next = u.searchParams.get("next") ?? "/app";
  const sb = await supabaseServer();
  if (code) {
    const { data } = await sb.auth.exchangeCodeForSession(code);
    if (data.user) {
      const db = supabaseAdmin();
      await db.from("users").upsert({ id: data.user.id, email: data.user.email! }, { onConflict: "id", ignoreDuplicates: true });
    }
  }
  return NextResponse.redirect(new URL(next, process.env.NEXT_PUBLIC_APP_URL));
}
