import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import Stripe from "stripe";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isTier, stripeDueTodayMessage, tierBlurb } from "@/lib/billing/plan-copy";

/** Dealer card step. Self list: subscription with 5 days at £0.00. Staff list: save the card, no trial yet. */
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("tier") ?? "";
  if (!isTier(t)) return NextResponse.redirect(new URL("/signup/dealer?step=card", env.appUrl()));
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.redirect(new URL("/signin", env.appUrl()));
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const db = supabaseAdmin();
  const { data: dealer } = await db.from("dealers").select("stripe_customer_id, listing_mode").eq("id", me.dealer_id).single();
  if (!dealer?.listing_mode) return NextResponse.redirect(new URL("/signup/dealer?step=who", env.appUrl()));
  const self = dealer.listing_mode === "self";
  const priceId = env.stripe.price(t);
  const vat = env.stripe.vatRate();
  const success = self ? `${env.appUrl()}/signup/dealer?step=centre` : `${env.appUrl()}/signup/dealer?step=tokens`;
  const session = await stripe.checkout.sessions.create({
    mode: self ? "subscription" : "setup",
    customer: dealer.stripe_customer_id ?? undefined,
    customer_email: dealer.stripe_customer_id ? undefined : me.email,
    ...(self ? {} : { currency: "gbp" as const, ...(dealer.stripe_customer_id ? {} : { customer_creation: "always" as const }) }),
    ...(self ? { line_items: [{ price: priceId, quantity: 1, ...(vat ? { tax_rates: [vat] } : {}) }] } : {}),
    ...(self ? {
      subscription_data: { trial_period_days: 5, description: tierBlurb(t), metadata: { dealer_id: me.dealer_id, tier: t, listing_mode: "self", trial_started: "1" } },
      payment_method_collection: "always" as const,
      custom_text: { submit: { message: stripeDueTodayMessage(t) } },
    } : {}),
    metadata: { dealer_id: me.dealer_id, tier: t, listing_mode: dealer.listing_mode },
    success_url: success,
    cancel_url: `${env.appUrl()}/signup/dealer?step=card`,
    locale: "en-GB",
  });
  return NextResponse.redirect(session.url!);
}
