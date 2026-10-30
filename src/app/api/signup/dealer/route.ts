import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

const Input = z.object({ name: z.string().min(2).max(80), code: z.string().regex(/^[A-Z][A-Z0-9]{1,3}$/), centre_code: z.string().nullable().optional() });
// Plan limits by tier are applied by the Stripe webhook; new dealers start on the entry limit.

export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  if (me.dealer_id) return NextResponse.json({ error: "already a dealer" }, { status: 400 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();

  const { data: dealer, error } = await db.from("dealers").insert({ name: p.data.name, code: p.data.code, plan: "trial" }).select("id").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "That dealer code is taken, try another" : error.message }, { status: 400 });
  await db.from("users").update({ dealer_id: dealer.id, role: "dealer" }).eq("id", me.id);

  if (p.data.centre_code) {
    const { data: centre } = await db.from("centres").select("id").eq("invite_code", p.data.centre_code).maybeSingle();
    if (centre) await db.from("dealer_centres").insert({ dealer_id: dealer.id, centre_id: centre.id, status: "pending" });
  }
  return NextResponse.json({ dealer_id: dealer.id });
}
