import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/server";
import { limitForTier } from "@/lib/billing/plan-copy";
import { emailIfTrialEnding, isCentrePrice, saveDealerCard, stopUnstartedTrialInvoice, syncDealerSubscription } from "@/lib/billing/dealer-trial";
import { recordTokenPayment } from "@/lib/billing/tokens";

/** Pro (unlimited sales) has no cap; stored as a large number so comparisons stay simple. */
const planFor = (s: Stripe.Subscription) =>
  s.status === "trialing" ? "trial" : s.status === "active" ? "pro" : s.status === "past_due" ? "lapsed" : "cancelled";

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const body = await req.text();
  let evt: Stripe.Event;
  try {
    evt = stripe.webhooks.constructEvent(body, req.headers.get("stripe-signature") ?? "", process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new NextResponse("bad signature", { status: 400 });
  }
  const db = supabaseAdmin();
  const { error: dup } = await db.from("webhook_log").insert({ source: "stripe", event_type: evt.type, external_event_id: evt.id, payload: evt as unknown as Record<string, unknown> });
  if (dup) {
    // A token payment is idempotent, so a retry can finish a credit that failed after the log row was written.
    if (evt.type === "checkout.session.completed" && evt.data.object.metadata?.purpose === "listing_tokens") await recordTokenPayment(db, stripe, evt.data.object).catch((e) => console.error("[tokens]", e));
    return NextResponse.json({ ok: true });
  }

  if (evt.type === "checkout.session.completed") {
    const s = evt.data.object;
    if (s.metadata?.purpose === "listing_tokens") await recordTokenPayment(db, stripe, s);
    else if (s.mode === "setup" && s.metadata?.dealer_id) await saveDealerCard(db, stripe, s);
    else if (s.metadata?.dealer_id && s.subscription) {
      const limit = limitForTier(s.metadata.tier);
      await db.from("dealers").update({
        stripe_customer_id: String(s.customer),
        stripe_subscription_id: String(s.subscription),
        ...(limit ? { monthly_sold_limit: limit } : {}),
      }).eq("id", s.metadata.dealer_id);
      await db.from("dealers").update({ listing_mode: "self", card_added_at: new Date().toISOString() }).eq("id", s.metadata.dealer_id);
    } else if (s.metadata?.centre_id) {
      await db.from("centres").update({ stripe_customer_id: String(s.customer), stripe_subscription_id: String(s.subscription), plan: "trial" }).eq("id", s.metadata.centre_id);
    }
  }
  if (evt.type === "customer.subscription.updated" || evt.type === "customer.subscription.deleted" || evt.type === "customer.subscription.created") {
    const s = evt.data.object;
    const priceId = s.items.data[0]?.price?.id;
    if (isCentrePrice(priceId)) {
      const trialEnds = s.trial_end ? new Date(s.trial_end * 1000).toISOString() : null;
      await db.from("centres").update({ plan: planFor(s), trial_ends_at: trialEnds }).eq("stripe_customer_id", String(s.customer));
    } else {
      await syncDealerSubscription(db, stripe, s);
    }
  }
  if (evt.type === "invoice.created" || evt.type === "invoice.finalized" || evt.type === "invoice.paid") {
    await stopUnstartedTrialInvoice(db, stripe, evt.data.object).catch((e) => console.error("[dealer trial] invoice", e));
  }
  if (evt.type === "customer.subscription.trial_will_end") {
    await emailIfTrialEnding(db, evt.data.object).catch((e) => console.error("[dealer trial] remind", e));
  }
  await db.from("webhook_log").update({ status: "processed", processed_at: new Date().toISOString() }).eq("source", "stripe").eq("external_event_id", evt.id);
  return NextResponse.json({ ok: true });
}
