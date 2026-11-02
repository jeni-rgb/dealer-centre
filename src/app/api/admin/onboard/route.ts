import { NextResponse } from "next/server";
import { z } from "zod";
import { setTillPin, newPin } from "@/lib/till/pin";
import { getMe } from "@/lib/auth";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/server";

const Input = z.object({
  name: z.string().min(2).max(80),
  address: z.string().max(200).optional(),
  owner_email: z.string().email(),
  till: z.enum(["ordinary", "square", "other"]).default("ordinary"),
  commission_percent: z.number().min(0).max(50).default(0),
  charges_rent: z.boolean().default(true),
  rent_frequency: z.enum(["weekly", "monthly", "quarterly"]).default("monthly"),
  free_months: z.number().int().min(0).max(12).default(0),
  dealers: z.array(z.object({ name: z.string().min(2), code: z.string().regex(/^[A-Z][A-Z0-9]{1,3}$/) })).max(200).default([]),
});

/**
 * Platform admin onboards a centre in one go: centre, owner account, sign in link, and the dealer list
 * with their existing ticket codes. The owner gets a magic link; nothing to type on their side.
 */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.is_platform_admin) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? "bad input" }, { status: 400 });
  const d = p.data;
  const db = supabaseAdmin();

  // Owner: existing auth user or a fresh invite
  let userId: string | null = null;
  const { data: existing } = await db.from("users").select("id").eq("email", d.owner_email.toLowerCase()).maybeSingle();
  if (existing) userId = existing.id;
  else {
    const { data: created, error } = await db.auth.admin.createUser({ email: d.owner_email.toLowerCase(), email_confirm: true });
    if (error && !error.message.includes("already")) return NextResponse.json({ error: error.message }, { status: 400 });
    if (created?.user) { userId = created.user.id; await db.from("users").upsert({ id: userId, email: d.owner_email.toLowerCase(), role: "centre_owner" }, { onConflict: "id" }); }
  }
  if (!userId) {
    const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
    userId = list?.users.find((u) => u.email?.toLowerCase() === d.owner_email.toLowerCase())?.id ?? null;
    if (userId) await db.from("users").upsert({ id: userId, email: d.owner_email.toLowerCase(), role: "centre_owner" }, { onConflict: "id", ignoreDuplicates: true });
  }
  if (!userId) return NextResponse.json({ error: "Could not create the owner account" }, { status: 400 });

  // Centre (claim an unclaimed one with the same name if dealers already added it)
  const { data: unclaimed } = await db.from("centres").select("id").eq("status", "unclaimed").ilike("name", d.name.trim()).maybeSingle();
  const fields = { name: d.name.trim(), address: d.address?.trim() || null, commission_bps: Math.round(d.commission_percent * 100), charges_rent: d.charges_rent, rent_frequency: d.rent_frequency, till: d.till, status: "active", plan: d.free_months > 0 ? "comp" : "trial", trial_ends_at: new Date(Date.now() + Math.max(14, d.free_months * 30) * 86400000).toISOString() };
  const { data: centre, error: cErr } = unclaimed
    ? await db.from("centres").update(fields).eq("id", unclaimed.id).select("id, invite_code").single()
    : await db.from("centres").insert(fields).select("id, invite_code").single();
  if (cErr || !centre) return NextResponse.json({ error: cErr?.message ?? "centre failed" }, { status: 400 });
  const pin = newPin();
  await setTillPin(db, centre.id, pin);
  await db.from("centre_owners").upsert({ user_id: userId, centre_id: centre.id }, { onConflict: "user_id,centre_id", ignoreDuplicates: true });

  // Dealers with their existing ticket codes
  const added: string[] = []; const skipped: string[] = [];
  for (const dl of d.dealers) {
    const { data: row, error } = await db.from("dealers").insert({ name: dl.name.trim(), code: dl.code, plan: "trial", placeholder: true, created_by_centre_id: centre.id }).select("id").single();
    if (error || !row) { skipped.push(`${dl.code} (${error?.message ?? "failed"})`); continue; }
    const { error: lErr } = await db.from("dealer_centres").insert({ dealer_id: row.id, centre_id: centre.id, status: "active", rent_mode: "rent", rent_pence: 0, rent_set_by: "centre", joined_at: new Date().toISOString() });
    if (lErr) { await db.from("dealers").delete().eq("id", row.id); skipped.push(`${dl.code} (code already used here)`); } else added.push(dl.code);
  }

  // Sign in link for the owner, straight to their dashboard
  const { data: link } = await db.auth.admin.generateLink({ type: "magiclink", email: d.owner_email.toLowerCase(), options: { redirectTo: `${env.appUrl()}/api/auth/callback?next=/centre/welcome` } });
  return NextResponse.json({ centre_id: centre.id, invite_code: centre.invite_code, pin, sign_in_link: link?.properties?.action_link ?? null, added, skipped });
}
