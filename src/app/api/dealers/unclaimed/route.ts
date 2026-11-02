import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Placeholder dealers at a centre, for "Which one is you?" at dealer sign up. */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const centreId = new URL(req.url).searchParams.get("centre");
  if (!centreId) return NextResponse.json({ dealers: [] });
  const { data } = await supabaseAdmin().from("dealer_centres").select("dealers!inner(id, name, code, placeholder)").eq("centre_id", centreId).is("left_at", null).eq("dealers.placeholder", true);
  const dealers = (data ?? []).map((r) => r.dealers as unknown as { id: string; name: string; code: string }).sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ dealers });
}
