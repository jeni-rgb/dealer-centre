import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import Stripe from "stripe";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Full plan. £25 a month plus VAT, no free days. Direct Debit when Stripe allows it, otherwise card. */
export async function GET() {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.redirect(new URL("/signin", env.appUrl()));
  const db = supabaseAdmin();
  if (process.env.DEMO_MODE === "1") {
    await db.from("dealers").update({ billing_model: "full", plan: "pro", monthly_sold_limit: 100000, card_added_at: new Date().toISOString() }).eq("id", me.dealer_id);
    return NextResponse.redirect(new URL("/signup/dealer?step=centre", env.appUrl()));
  }
  const priceId = env.stripe.fullPrice();
  if (!priceId || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.redirect(new URL("/signup/dealer?step=card&billing=missing", env.appUrl()));
  }
  const { data: dealer } = await db.from("dealers").select("stripe_customer_id, listing_mode").eq("id", me.dealer_id).single();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const vat = env.stripe.vatRate();
  const self = dealer?.listing_mode !== "staff";
  const success = self ? `${env.appUrl()}/signup/dealer?step=centre` : `${env.appUrl()}/signup/dealer?step=tokens`;
  const base = {
    mode: "subscription" as const,
    customer: dealer?.stripe_customer_id ?? undefined,
    customer_email: dealer?.stripe_customer_id ? undefined : me.email,
    line_items: [{ price: priceId, quantity: 1, ...(vat ? { tax_rates: [vat] } : {}) }],
    subscription_data: {
      description: "Dealer Centre Full: £25 a month plus VAT, named sales at every centre, one bill",
      metadata: { dealer_id: me.dealer_id, purpose: "full" },
    },
    metadata: { dealer_id: me.dealer_id, purpose: "full", listing_mode: dealer?.listing_mode ?? "" },
    success_url: success,
    cancel_url: `${env.appUrl()}/signup/dealer?step=card`,
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
