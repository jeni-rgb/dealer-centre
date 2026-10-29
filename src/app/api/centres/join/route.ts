import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Dealer enters a centre's six character code. Creates a pending link the owner approves. */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const { code } = (await req.json()) as { code?: string };
  if (!code) return NextResponse.json({ error: "enter a code" }, { status: 400 });
  const db = supabaseAdmin();
  const { data: centre } = await db.from("centres").select("id, name").eq("invite_code", code.toUpperCase()).maybeSingle();
  if (!centre) return NextResponse.json({ error: "No centre with that code" }, { status: 404 });
  await db.from("dealer_centres").upsert({ dealer_id: me.dealer_id, centre_id: centre.id, status: "pending" }, { onConflict: "dealer_id,centre_id", ignoreDuplicates: true });
  return NextResponse.json({ name: centre.name });
}
