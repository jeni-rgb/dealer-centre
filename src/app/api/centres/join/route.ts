import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

const Input = z.object({
  centre_id: z.string().uuid().optional(),
  code: z.string().optional(),
  rent_mode: z.enum(["rent", "commission_only"]).default("rent"),
  rent_pence: z.number().int().min(0).default(0),
  rent_schedule: z.enum(["first", "fifteenth", "last", "weekly_friday", "weekly_monday", "quarterly"]).default("first"),
});

/** Dealer joins a centre by id (from search) or six character code. Rent is self declared. Owner approves. */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();
  let centre: { id: string; name: string } | null = null;
  if (p.data.centre_id) {
    const { data } = await db.from("centres").select("id, name").eq("id", p.data.centre_id).maybeSingle(); centre = data;
  } else if (p.data.code) {
    const { data } = await db.from("centres").select("id, name").eq("invite_code", p.data.code.toUpperCase()).maybeSingle(); centre = data;
  }
  if (!centre) return NextResponse.json({ error: "No centre found" }, { status: 404 });
  await db.from("dealer_centres").upsert(
    { dealer_id: me.dealer_id, centre_id: centre.id, status: "pending", rent_mode: p.data.rent_mode, rent_pence: p.data.rent_pence, rent_schedule: p.data.rent_schedule, rent_set_by: "dealer" },
    { onConflict: "dealer_id,centre_id", ignoreDuplicates: true },
  );
  return NextResponse.json({ name: centre.name, centre_id: centre.id });
}
