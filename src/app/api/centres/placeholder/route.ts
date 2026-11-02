import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

const Input = z.object({ name: z.string().min(2).max(80), town: z.string().max(120).optional(), rent_mode: z.enum(["rent", "commission_only"]).default("rent"), rent_pence: z.number().int().min(0).default(0), rent_schedule: z.string().default("first") });

/**
 * Phase 1: a dealer adds a centre that is not on Dealer Centre yet. The centre exists as 'unclaimed',
 * the dealer is linked straight away (nobody to approve), and the owner takes it over when they sign up.
 */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();
  // Same name and town already added by another dealer: join that one instead of making a twin.
  const { data: twin } = await db.from("centres").select("id, name").eq("status", "unclaimed").ilike("name", p.data.name.trim()).maybeSingle();
  let centre = twin;
  if (!centre) {
    const { data, error } = await db.from("centres").insert({ name: p.data.name.trim(), address: p.data.town?.trim() || null, status: "unclaimed", till: "ordinary", created_by_dealer_id: me.dealer_id }).select("id, name").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    centre = data;
  }
  const { error: linkErr } = await db.from("dealer_centres").upsert(
    { dealer_id: me.dealer_id, centre_id: centre!.id, status: "active", rent_mode: p.data.rent_mode, rent_pence: p.data.rent_pence, rent_schedule: p.data.rent_schedule, rent_set_by: "dealer", joined_at: new Date().toISOString() },
    { onConflict: "dealer_id,centre_id", ignoreDuplicates: true },
  );
  if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 400 });
  return NextResponse.json({ centre_id: centre!.id, name: centre!.name, unclaimed: true });
}
