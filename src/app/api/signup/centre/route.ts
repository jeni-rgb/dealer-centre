import { NextResponse } from "next/server";
import { z } from "zod";
import { setTillPin, newPin } from "@/lib/till/pin";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

const Input = z.object({
  name: z.string().min(2).max(80),
  address: z.string().max(200).optional(),
  dealer_count: z.number().int().nullable().optional(),
  charges_rent: z.boolean().default(true),
  rent_frequency: z.enum(["weekly", "monthly", "quarterly"]).default("monthly"),
  commission_percent: z.number().min(0).max(50).default(0),
  rent_day: z.number().int().min(1).max(28).default(1),
  statement_day: z.number().int().min(1).max(28).default(1),
  till: z.enum(["ordinary", "square", "other"]).default("ordinary"),
  pin: z.string().regex(/^\d{4,8}$/).optional(),
  claim_centre_id: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();
  // One centre per owner from this form. Refresh or Back after success must not create a second.
  const { data: existing } = await db.from("centre_owners").select("centre_id").eq("user_id", me.id).limit(1);
  if (existing?.length) {
    const { data: c } = await db.from("centres").select("id, invite_code").eq("id", existing[0].centre_id).single();
    return NextResponse.json({ centre_id: c?.id, invite_code: c?.invite_code, existing: true });
  }
  const fields = {
    name: p.data.name, address: p.data.address ?? null, commission_bps: Math.round(p.data.commission_percent * 100),
    rent_day: p.data.rent_day, statement_day: p.data.statement_day,
    charges_rent: p.data.charges_rent, rent_frequency: p.data.rent_frequency, dealer_count: p.data.dealer_count ?? null, till: p.data.till,
  };
  // Taking over a centre a dealer added earlier: the dealers and their items are already attached.
  if (p.data.claim_centre_id) {
    const { data: unclaimed } = await db.from("centres").select("id").eq("id", p.data.claim_centre_id).eq("status", "unclaimed").maybeSingle();
    if (!unclaimed) return NextResponse.json({ error: "That centre has already been claimed" }, { status: 409 });
    const { data: c, error: cErr } = await db.from("centres").update({ ...fields, status: "active" }).eq("id", unclaimed.id).select("id, invite_code").single();
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });
    const pin = newPin();
    await setTillPin(db, c.id, pin);
    await db.from("centre_owners").insert({ user_id: me.id, centre_id: c.id });
    if (me.role === "dealer" && !me.dealer_id) await db.from("users").update({ role: "centre_owner" }).eq("id", me.id);
    return NextResponse.json({ centre_id: c.id, invite_code: c.invite_code, claimed: true });
  }
  const { data: centre, error } = await db
    .from("centres")
    .insert({
      name: p.data.name, address: p.data.address ?? null, commission_bps: Math.round(p.data.commission_percent * 100),
      rent_day: p.data.rent_day, statement_day: p.data.statement_day,
      charges_rent: p.data.charges_rent, rent_frequency: p.data.rent_frequency, dealer_count: p.data.dealer_count ?? null, till: p.data.till,
    })
    .select("id, invite_code")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  // Till PIN: generated, shown in Settings, only needed if they ever use the till screen.
  const pin = p.data.pin && p.data.pin.length >= 6 ? p.data.pin : newPin();
  await setTillPin(db, centre.id, pin);
  await db.from("centre_owners").insert({ user_id: me.id, centre_id: centre.id });
  if (me.role === "dealer" && !me.dealer_id) await db.from("users").update({ role: "centre_owner" }).eq("id", me.id);
  return NextResponse.json({ centre_id: centre.id, invite_code: centre.invite_code });
}
