import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import Stripe from "stripe";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { attachOwedLabelsToFull, labelFigures } from "@/lib/billing/labels";

/** Full plan. £25 a month plus VAT, no free days. Direct Debit when Stripe allows it, otherwise card. */
export async function GET() {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.redirect(new URL("/signin", env.appUrl()));
  const db = supabaseAdmin();
  const { data: dealer } = await db.from("dealers").select("stripe_customer_id, listing_mode, taster_accepted_at, taster_ends_at, name").eq("id", me.dealer_id).single();
  const choice = await db.from("dealers").select("full_labels_choice").eq("id", me.dealer_id).maybeSingle();
  const ended = !!dealer?.taster_accepted_at && !!dealer?.taster_ends_at && new Date(dealer.taster_ends_at).getTime() <= Date.now();
  const figures = ended ? await labelFigures(db, me.dealer_id) : null;
  if (ended && figures && figures.tally.printed <= 25 && !choice.error && !choice.data?.full_labels_choice) {
    return NextResponse.redirect(new URL("/app/settings?step=who-labels", env.appUrl()));
  }
  if (process.env.DEMO_MODE === "1") {
    if (figures && figures.tally.printed > 25 && figures.tally.owed > 0) await attachOwedLabelsToFull(db, null, me.dealer_id, dealer?.stripe_customer_id ?? "demo");
    await db.from("dealers").update({ billing_model: "full", plan: "pro", monthly_sold_limit: 100000, card_added_at: new Date().toISOString() }).eq("id", me.dealer_id);
    return NextResponse.redirect(new URL("/app/settings", env.appUrl()));
  }
  const priceId = env.stripe.fullPrice();
  if (!priceId || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.redirect(new URL("/app/settings?billing=missing", env.appUrl()));
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let customerId = dealer?.stripe_customer_id ?? null;
  if (figures && figures.tally.printed > 25 && figures.tally.owed > 0) {
    if (!customerId) {
      const customer = await stripe.customers.create({ name: dealer?.name, email: me.email, metadata: { dealer_id: me.dealer_id } });
      customerId = customer.id;
      await db.from("dealers").update({ stripe_customer_id: customerId }).eq("id", me.dealer_id);
    }
    await attachOwedLabelsToFull(db, stripe, me.dealer_id, customerId);
  }
  const vat = env.stripe.vatRate();
  const success = `${env.appUrl()}/app/settings`;
  const base = {
    mode: "subscription" as const,
    customer: customerId ?? undefined,
    customer_email: customerId ? undefined : me.email,
    line_items: [{ price: priceId, quantity: 1, ...(vat ? { tax_rates: [vat] } : {}) }],
    subscription_data: {
      description: "Dealer Centre Full: £25 a month plus VAT, named sales at every centre, one bill",
      metadata: { dealer_id: me.dealer_id, purpose: "full" },
    },
    metadata: { dealer_id: me.dealer_id, purpose: "full", listing_mode: dealer?.listing_mode ?? "" },
    success_url: success,
    cancel_url: `${env.appUrl()}/app/settings`,
    locale: "en-GB" as const,
  };
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({ ...base, allowed_payment_method_types: ["bacs_debit", "card"] });
  } catch {
    session = await stripe.checkout.sessions.create({ ...base, allowed_payment_method_types: ["card"] });
  }
  return NextResponse.redirect(session.url!);
}
