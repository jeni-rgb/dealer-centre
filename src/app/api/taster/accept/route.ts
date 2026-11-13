import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { acceptTasterToken } from "@/lib/billing/taster";

/** Dealer says yes to 2 weeks of named sales and 25 free labels. Nothing is charged. */
export async function POST(req: Request) {
  const token = String((await req.json().catch(() => ({}))).token ?? "");
  if (!token) return NextResponse.json({ error: "Missing link" }, { status: 400 });
  try {
    const started = await acceptTasterToken(supabaseAdmin(), token);
    return NextResponse.json({ ok: true, ...started });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
