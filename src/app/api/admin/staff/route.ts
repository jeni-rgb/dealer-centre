import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { env } from "@/lib/env";

const Input = z.object({ email: z.string().email(), remove: z.boolean().optional() });

/** Admin adds (or removes) a runner or shop manager: creates the sign in user if needed, sets role ops_staff, returns a one use sign in link. */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.is_platform_admin) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();
  const email = p.data.email.toLowerCase();
  if (p.data.remove) { await db.from("users").update({ role: "dealer" }).eq("email", email).eq("role", "ops_staff"); return NextResponse.json({ ok: true }); }
  const { data: existing } = await db.from("users").select("id").eq("email", email).maybeSingle();
  let userId = existing?.id;
  if (!userId) {
    const { data: created, error } = await db.auth.admin.createUser({ email, email_confirm: true });
    if (error || !created.user) return NextResponse.json({ error: error?.message ?? "could not create" }, { status: 400 });
    userId = created.user.id;
    await db.from("users").upsert({ id: userId, email, role: "ops_staff", is_platform_admin: false, dealer_id: null }, { onConflict: "id" });
  } else {
    await db.from("users").update({ role: "ops_staff" }).eq("id", userId);
  }
  const { data: link } = await db.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: `${env.appUrl()}/api/auth/callback?next=/run` } });
  return NextResponse.json({ ok: true, link: link?.properties?.action_link ?? null });
}

export async function GET() {
  const me = await getMe();
  if (!me?.is_platform_admin) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const { data } = await supabaseAdmin().from("users").select("email, created_at").eq("role", "ops_staff").order("email");
  return NextResponse.json({ staff: data ?? [] });
}
