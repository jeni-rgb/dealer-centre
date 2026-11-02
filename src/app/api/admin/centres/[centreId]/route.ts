import { NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { newPin, setTillPin } from "@/lib/till/pin";

const Input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("resend_link"), email: z.string().email() }),
  z.object({ action: z.literal("free_months"), months: z.number().int().min(1).max(24) }),
  z.object({ action: z.literal("set_plan"), plan: z.enum(["trial", "pro", "comp", "cancelled", "lapsed"]) }),
  z.object({ action: z.literal("set_till"), till: z.enum(["ordinary", "square", "other"]) }),
  z.object({ action: z.literal("reset_pin") }),
  z.object({ action: z.literal("cancel_subscription"), at_period_end: z.boolean().default(true) }),
  z.object({ action: z.literal("add_owner"), email: z.string().email() }),
  z.object({ action: z.literal("note"), note: z.string().max(2000) }),
]);

/** Operator actions on a centre. Everything here is logged to admin_actions. */
export async function POST(req: Request, { params }: { params: Promise<{ centreId: string }> }) {
  const me = await getMe();
  if (!me?.is_platform_admin) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const { centreId } = await params;
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();
  const { data: centre } = await db.from("centres").select("id, name, plan, trial_ends_at, stripe_customer_id, stripe_subscription_id").eq("id", centreId).single();
  if (!centre) return NextResponse.json({ error: "not found" }, { status: 404 });
  const a = p.data;
  let result: Record<string, unknown> = {};
  try {
    if (a.action === "resend_link") {
      const { data: link, error } = await db.auth.admin.generateLink({ type: "magiclink", email: a.email.toLowerCase(), options: { redirectTo: `${env.appUrl()}/api/auth/callback?next=/centre` } });
      if (error) throw error;
      result = { link: link.properties?.action_link };
    }
    if (a.action === "free_months") {
      const base = centre.trial_ends_at && new Date(centre.trial_ends_at) > new Date() ? new Date(centre.trial_ends_at) : new Date();
      const until = new Date(base); until.setMonth(until.getMonth() + a.months);
      await db.from("centres").update({ plan: centre.plan === "pro" ? "pro" : "comp", trial_ends_at: until.toISOString() }).eq("id", centreId);
      if (centre.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
        // pause collection on the Stripe side for the same period
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        await stripe.subscriptions.update(centre.stripe_subscription_id, { pause_collection: { behavior: "keep_as_draft", resumes_at: Math.floor(until.getTime() / 1000) } }).catch(() => null);
      }
      result = { until: until.toISOString() };
    }
    if (a.action === "set_plan") await db.from("centres").update({ plan: a.plan }).eq("id", centreId);
    if (a.action === "set_till") await db.from("centres").update({ till: a.till }).eq("id", centreId);
    if (a.action === "reset_pin") { const pin = newPin(); await setTillPin(db, centreId, pin); await db.from("till_attempts").delete().eq("centre_id", centreId); result = { pin }; }
    if (a.action === "cancel_subscription") {
      if (!centre.stripe_subscription_id || !process.env.STRIPE_SECRET_KEY) throw new Error("no Stripe subscription on this centre");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      if (a.at_period_end) await stripe.subscriptions.update(centre.stripe_subscription_id, { cancel_at_period_end: true });
      else { await stripe.subscriptions.cancel(centre.stripe_subscription_id); await db.from("centres").update({ plan: "cancelled" }).eq("id", centreId); }
    }
    if (a.action === "add_owner") {
      const email = a.email.toLowerCase();
      let { data: u } = await db.from("users").select("id").eq("email", email).maybeSingle();
      if (!u) { const { data: created, error } = await db.auth.admin.createUser({ email, email_confirm: true }); if (error || !created.user) throw error ?? new Error("could not create"); await db.from("users").upsert({ id: created.user.id, email, role: "centre_owner", is_platform_admin: false, dealer_id: null }, { onConflict: "id" }); u = { id: created.user.id }; }
      await db.from("centre_owners").upsert({ centre_id: centreId, user_id: u.id }, { onConflict: "user_id,centre_id", ignoreDuplicates: true });
      const { data: link } = await db.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: `${env.appUrl()}/api/auth/callback?next=/centre` } });
      result = { link: link?.properties?.action_link };
    }
    if (a.action === "note") await db.from("centres").update({ admin_note: a.note }).eq("id", centreId);
    await db.from("admin_actions").insert({ actor_id: me.id, target_type: "centre", target_id: centreId, action: a.action, detail: { ...a, pin: undefined } });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }
}
