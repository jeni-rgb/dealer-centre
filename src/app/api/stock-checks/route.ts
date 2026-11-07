import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { canAccessCheck } from "@/lib/stockcheck";

const Input = z.object({ centre_id: z.string().uuid(), dealer_id: z.string().uuid().nullable().optional() });

/** Start a stock check: a whole centre (owner) or one dealer's pitch (that dealer, or the owner). */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();
  const dealerId = p.data.dealer_id ?? null;
  if (!(await canAccessCheck(db, me, p.data.centre_id, dealerId))) return NextResponse.json({ error: "not yours" }, { status: 403 });
  // a dealer checking their own pitch must actually be at that centre
  if (dealerId && me.dealer_id === dealerId) {
    const { data: link } = await db.from("dealer_centres").select("dealer_id").eq("dealer_id", dealerId).eq("centre_id", p.data.centre_id).is("left_at", null).maybeSingle();
    if (!link) return NextResponse.json({ error: "You are not at that centre" }, { status: 403 });
  }
  const { data, error } = await db.from("stock_checks").insert({ centre_id: p.data.centre_id, dealer_id: dealerId, started_by: me.id }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
