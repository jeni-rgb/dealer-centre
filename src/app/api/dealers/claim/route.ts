import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

const Input = z.object({ dealer_id: z.string().uuid(), centre_id: z.string().uuid() });

/** "That one is me." Folds the signing up dealer into the placeholder the centre created. Code and history kept. */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();
  const { data: ph } = await db.from("dealers").select("id, name, code, placeholder").eq("id", p.data.dealer_id).single();
  if (!ph?.placeholder) return NextResponse.json({ error: "That dealer has already been claimed" }, { status: 409 });
  // The placeholder must belong to the centre the dealer is joining; the server never trusts a bare id.
  const { data: link } = await db.from("dealer_centres").select("id").eq("dealer_id", ph.id).eq("centre_id", p.data.centre_id).is("left_at", null).maybeSingle();
  if (!link) return NextResponse.json({ error: "That dealer is not at this centre" }, { status: 400 });
  const { error } = await db.rpc("claim_placeholder_dealer", { p_user_id: me.id, p_new_dealer_id: me.dealer_id, p_placeholder_id: ph.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ dealer_id: ph.id, code: ph.code });
}
