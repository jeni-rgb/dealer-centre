import { NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { pushStripeTrialEnd } from "@/lib/billing/dealer-trial";
import { applyBasicChoice, moveToBasicDecision, startTaster } from "@/lib/billing/taster";
import { billOwedLabels } from "@/lib/billing/labels";

const Input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("resend_link"), email: z.string().email() }),
  z.object({ action: z.literal("set_limit"), monthly_sold_limit: z.union([z.literal(25), z.literal(50), z.literal(100000)]) }),
  z.object({ action: z.literal("set_plan"), plan: z.enum(["trial", "pro", "comp", "cancelled", "lapsed"]) }),
  z.object({ action: z.literal("extend_trial"), days: z.number().int().min(1).max(365) }),
  z.object({ action: z.literal("start_trial") }),
  z.object({ action: z.literal("start_taster") }),
  z.object({ action: z.literal("bill_labels") }),
  z.object({ action: z.literal("move_to_basic") }),
  z.object({ action: z.literal("cancel_subscription"), at_period_end: z.boolean().default(true) }),
  z.object({ action: z.literal("move_centre"), from_centre_id: z.string().uuid().nullable(), to_centre_id: z.string().uuid(), move_items: z.boolean().default(true) }),
  z.object({ action: z.literal("note"), note: z.string().max(2000) }),
]);

/** Operator actions on a dealer. Logged to admin_actions. */
export async function POST(req: Request, { params }: { params: Promise<{ dealerId: string }> }) {
  const me = await getMe();
  if (!me?.is_platform_admin) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const { dealerId } = await params;
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();
  const { data: dealer } = await db.from("dealers").select("id, plan, trial_ends_at, taster_ends_at, billing_model, stripe_subscription_id").eq("id", dealerId).single();
  if (!dealer) return NextResponse.json({ error: "not found" }, { status: 404 });
  const a = p.data;
  let result: Record<string, unknown> = {};
  try {
    if (a.action === "resend_link") { const { data: link, error } = await db.auth.admin.generateLink({ type: "magiclink", email: a.email.toLowerCase(), options: { redirectTo: `${env.appUrl()}/api/auth/callback?next=/app` } }); if (error) throw error; result = { link: link.properties?.action_link }; }
    if (a.action === "set_limit") await db.from("dealers").update({ monthly_sold_limit: a.monthly_sold_limit }).eq("id", dealerId);
    if (a.action === "set_plan") await db.from("dealers").update(a.plan === "comp" ? { plan: "comp", monthly_sold_limit: 100000 } : { plan: a.plan }).eq("id", dealerId);
    if (a.action === "extend_trial") {
      const current = dealer.taster_ends_at ?? dealer.trial_ends_at;
      const base = current && new Date(current) > new Date() ? new Date(current) : new Date();
      const until = new Date(base.getTime() + a.days * 86400000);
      const legacyTrial = dealer.billing_model !== "taster" && dealer.billing_model !== "basic" && dealer.billing_model !== "full";
      if (legacyTrial && dealer.stripe_subscription_id && process.env.STRIPE_SECRET_KEY && process.env.DEMO_MODE !== "1") await pushStripeTrialEnd(dealer.stripe_subscription_id, until);
      await db.from("dealers").update({ plan: dealer.plan === "pro" ? "pro" : "trial", trial_ends_at: until.toISOString(), ...(dealer.taster_ends_at ? { taster_ends_at: until.toISOString() } : {}) }).eq("id", dealerId);
      result = { until: until.toISOString() };
    }
    if (a.action === "start_trial" || a.action === "start_taster") {
      const started = await startTaster(db, dealerId);
      result = { until: started.until, already: started.already, charged: false };
    }
    if (a.action === "bill_labels") {
      const billed = await billOwedLabels(db, dealerId);
      result = { copies: billed.copies, note: `Billed ${billed.copies} labels, ${billed.amount}.` };
    }
    if (a.action === "move_to_basic") {
      const decision = moveToBasicDecision(dealer);
      if (decision.already) throw new Error("This dealer is already on Basic.");
      if (decision.cancelSubscriptionId && process.env.STRIPE_SECRET_KEY && process.env.DEMO_MODE !== "1") {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        await stripe.subscriptions.update(decision.cancelSubscriptionId, { cancel_at_period_end: true });
      }
      await applyBasicChoice(db, dealerId);
      result = { charged: false };
    }
    if (a.action === "cancel_subscription") {
      if (!dealer.stripe_subscription_id || !process.env.STRIPE_SECRET_KEY) throw new Error("no Stripe subscription on this dealer");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      if (a.at_period_end) await stripe.subscriptions.update(dealer.stripe_subscription_id, { cancel_at_period_end: true });
      else { await stripe.subscriptions.cancel(dealer.stripe_subscription_id); await db.from("dealers").update({ plan: "cancelled" }).eq("id", dealerId); }
    }
    if (a.action === "move_centre") {
      // Leave the old centre (history kept), join the new one as active, carry live stock across so labels and the till still match.
      if (a.from_centre_id) await db.from("dealer_centres").update({ left_at: new Date().toISOString(), status: "left" }).eq("dealer_id", dealerId).eq("centre_id", a.from_centre_id);
      const { data: existing } = await db.from("dealer_centres").select("id").eq("dealer_id", dealerId).eq("centre_id", a.to_centre_id).maybeSingle();
      if (existing) await db.from("dealer_centres").update({ status: "active", left_at: null, joined_at: new Date().toISOString() }).eq("id", existing.id);
      else await db.from("dealer_centres").insert({ dealer_id: dealerId, centre_id: a.to_centre_id, status: "active", joined_at: new Date().toISOString(), pitch_numbers: [], rent_pence: 0, rent_mode: "rent", rent_schedule: "first", rent_set_by: "centre" });
      if (a.move_items) { let q = db.from("items").update({ centre_id: a.to_centre_id }).eq("dealer_id", dealerId).eq("status", "live"); q = a.from_centre_id ? q.eq("centre_id", a.from_centre_id) : q.is("centre_id", null); await q; }
    }
    if (a.action === "note") await db.from("dealers").update({ admin_note: a.note }).eq("id", dealerId);
    await db.from("admin_actions").insert({ actor_id: me.id, target_type: "dealer", target_id: dealerId, action: a.action, detail: a });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }
}
