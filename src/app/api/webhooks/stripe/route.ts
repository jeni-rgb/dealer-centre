import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Pro ("over 50 a month") has no cap; stored as a large number so comparisons stay simple. */
const UNLIMITED = 100000;


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
  if (dup) return NextResponse.json({ ok: true });

  const planFor = (s: Stripe.Subscription) =>
    s.status === "trialing" ? "trial" : s.status === "active" ? "pro" : s.status === "past_due" ? "lapsed" : "cancelled";

  if (evt.type === "checkout.session.completed") {
    const s = evt.data.object;
    const dealerId = s.metadata?.dealer_id;
    const centreId = s.metadata?.centre_id;
    if (dealerId) await db.from("dealers").update({ stripe_customer_id: String(s.customer), stripe_subscription_id: String(s.subscription) }).eq("id", dealerId);
    if (centreId) await db.from("centres").update({ stripe_customer_id: String(s.customer), stripe_subscription_id: String(s.subscription), plan: "trial" }).eq("id", centreId);
  }
  if (evt.type === "customer.subscription.updated" || evt.type === "customer.subscription.deleted" || evt.type === "customer.subscription.created") {
    const s = evt.data.object;
    const priceId = s.items.data[0]?.price?.id;
    const customer = String(s.customer);
    const trialEnds = s.trial_end ? new Date(s.trial_end * 1000).toISOString() : null;
    if (priceId && (priceId === env.stripe.centrePrice() || priceId === env.stripe.centreOwnTillPrice())) {
      // Centre plans: kit £299 or own till £249
      await db.from("centres").update({ plan: planFor(s), trial_ends_at: trialEnds }).eq("stripe_customer_id", customer);
    } else {
      // Dealer tiers by items sold a month: Starter up to 25, Trade 26 to 50, Pro over 50 (no cap). All + VAT.
      const byPrice: Record<string, number> = { [env.stripe.price("25")]: 25, [env.stripe.price("100")]: 50, [env.stripe.price("150")]: UNLIMITED };
      const meta = Number(s.items.data[0]?.price?.metadata?.monthly_sold_limit ?? 0);
      const limit = meta || (priceId ? byPrice[priceId] : undefined) || undefined;
      await db
        .from("dealers")
        .update({ plan: planFor(s), trial_ends_at: trialEnds, ...(limit ? { monthly_sold_limit: limit } : {}) })
        .eq("stripe_customer_id", customer);
    }
  }
  await db.from("webhook_log").update({ status: "processed", processed_at: new Date().toISOString() }).eq("source", "stripe").eq("external_event_id", evt.id);
  return NextResponse.json({ ok: true });
}
