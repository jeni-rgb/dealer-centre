import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { welcomeLetter } from "@/lib/email/letters";
import { sendBranded } from "@/lib/email/send";

const Input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), email: z.string().email() }),
  z.object({ action: z.literal("remove"), id: z.string().uuid() }),
]);

/** People who can sign in to this dealer account. Only someone on the account can add or remove. */
export async function GET() {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { data } = await supabaseAdmin().from("users").select("id, email").eq("dealer_id", me.dealer_id).order("email");
  return NextResponse.json({ people: data ?? [] });
}

export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  const db = supabaseAdmin();
  const a = p.data;

  if (a.action === "remove") {
    if (a.id === me.id) return NextResponse.json({ error: "You can't remove yourself" }, { status: 400 });
    const { data: people } = await db.from("users").select("id").eq("dealer_id", me.dealer_id);
    if (!people?.some((u) => u.id === a.id)) return NextResponse.json({ error: "Not on this account" }, { status: 404 });
    if (people.length <= 1) return NextResponse.json({ error: "There must be at least one person" }, { status: 400 });
    await db.from("users").update({ dealer_id: null }).eq("id", a.id).eq("dealer_id", me.dealer_id);
    await db.from("push_subscriptions").delete().eq("user_id", a.id).eq("dealer_id", me.dealer_id);
    return NextResponse.json({ ok: true });
  }

  const email = a.email.toLowerCase().trim();
  const { data: existing } = await db.from("users").select("id, dealer_id, is_platform_admin").eq("email", email).maybeSingle();
  if (existing?.dealer_id === me.dealer_id) return NextResponse.json({ error: "Already on this account" }, { status: 400 });
  if (existing?.dealer_id) return NextResponse.json({ error: "That email is already on another dealer account" }, { status: 400 });
  if (existing) {
    await db.from("users").update({ dealer_id: me.dealer_id, ...(existing.is_platform_admin ? {} : { role: "dealer" }) }).eq("id", existing.id).is("dealer_id", null);
  } else {
    const { data: created, error } = await db.auth.admin.createUser({ email, email_confirm: true });
    if (error || !created.user) return NextResponse.json({ error: error?.message ?? "Could not add" }, { status: 400 });
    await db.from("users").upsert({ id: created.user.id, email, role: "dealer", is_platform_admin: false, dealer_id: me.dealer_id }, { onConflict: "id" });
  }

  const { data: link } = await db.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: `${env.appUrl()}/api/auth/callback?next=/app` } });
  const url = link?.properties?.action_link;
  const { data: dealer } = await db.from("dealers").select("name").eq("id", me.dealer_id).single();
  let emailed = false;
  if (url) {
    const sent = await sendBranded([email], welcomeLetter({ dealerName: dealer?.name ?? "the account", addedBy: me.email, href: url }));
    emailed = sent === "sent";
  }
  await db.from("admin_actions").insert({ actor_id: me.id, target_type: "dealer", target_id: me.dealer_id, action: "add_person", detail: { email } }).then(() => null, () => null);
  return NextResponse.json({ ok: true, emailed });
}
