import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

const Input = z.object({ name: z.string().min(2).max(80), code: z.string().regex(/^[A-Z][A-Z0-9]{1,3}$/), email: z.string().email().optional().or(z.literal("")), pitch_numbers: z.array(z.string()).optional() });

/**
 * Phase 2: the centre adds a dealer who has no app yet. Use the code the dealer already writes on
 * their tickets. Their tickets scan at the till from today; they claim the row when they sign up.
 */
export async function POST(req: Request, { params }: { params: Promise<{ centreId: string }> }) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const { centreId } = await params;
  const sb = await supabaseServer();
  const { data: owns } = await sb.from("centre_owners").select("centre_id").eq("centre_id", centreId).maybeSingle();
  if (!owns && !me.is_platform_admin) return NextResponse.json({ error: "not your centre" }, { status: 403 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "Name, and a code of 2 to 4 letters or numbers starting with a letter" }, { status: 400 });
  const db = supabaseAdmin();
  const { data: dealer, error } = await db.from("dealers").insert({ name: p.data.name.trim(), code: p.data.code, plan: "trial", placeholder: true, created_by_centre_id: centreId, contact_email: p.data.email || null }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { error: linkErr } = await db.from("dealer_centres").insert({ dealer_id: dealer.id, centre_id: centreId, status: "active", rent_mode: "rent", rent_pence: 0, rent_set_by: "centre", pitch_numbers: p.data.pitch_numbers ?? [], joined_at: new Date().toISOString() });
  if (linkErr) {
    await db.from("dealers").delete().eq("id", dealer.id);
    return NextResponse.json({ error: linkErr.code === "23505" ? `Code ${p.data.code} is already used at this centre` : linkErr.message }, { status: 400 });
  }
  return NextResponse.json({ dealer_id: dealer.id });
}
