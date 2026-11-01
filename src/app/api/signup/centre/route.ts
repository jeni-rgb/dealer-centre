import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
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
  till: z.enum(["ordinary", "square"]).default("ordinary"),
  pin: z.string().regex(/^\d{4,8}$/).optional(),
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
  const pin = p.data.pin ?? String(Math.floor(1000 + Math.random() * 9000));
  const hash = crypto.createHash("sha256").update(`${centre.id}:${pin}`).digest("hex");
  await db.from("centres").update({ till_pin_hash: hash, till_pin_plain: pin }).eq("id", centre.id);
  await db.from("centre_owners").insert({ user_id: me.id, centre_id: centre.id });
  if (me.role === "dealer" && !me.dealer_id) await db.from("users").update({ role: "centre_owner" }).eq("id", me.id);
  return NextResponse.json({ centre_id: centre.id, invite_code: centre.invite_code });
}
