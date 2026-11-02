import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { getMe } from "@/lib/auth";
import { currentCentre } from "@/lib/centre";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Stripe Checkout for a centre's £299 a month + VAT subscription. Needs a till: 12 month minimum, Register kit included, card charged now. Already on Square: monthly, 14 days free. */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.redirect(new URL("/signin", env.appUrl()));
  const centreParam = new URL(req.url).searchParams.get("centre") ?? undefined;
  const centre = await currentCentre(centreParam);
  if (!centre) return NextResponse.redirect(new URL("/signup/centre", env.appUrl()));
  const priceId = env.stripe.centrePrice();
  if (!priceId) return NextResponse.json({ error: "STRIPE_PRICE_CENTRE is not set. Create the £299/month (+ VAT) price in Stripe and add its id to Vercel." }, { status: 500 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const { data: row } = await supabaseAdmin().from("centres").select("stripe_customer_id, till").eq("id", centre.id).single();
  // Already on Square: plain monthly, 14 days free, cancel any time. Needs a till: 12 month minimum, Register kit included.
  const withKit = row?.till !== "square";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: row?.stripe_customer_id ?? undefined,
    customer_email: row?.stripe_customer_id ? undefined : me.email,
    line_items: [{ price: priceId, quantity: 1, tax_rates: env.stripe.vatRate() ? [env.stripe.vatRate()!] : undefined }],
    subscription_data: withKit
      ? { metadata: { centre_id: centre.id, minimum_term_months: "12", kit: "register" }, description: "Dealer Centre for centres: £299 a month + VAT, 12 month minimum, Square Register kit included" }
      : { trial_period_days: 14, metadata: { centre_id: centre.id, minimum_term_months: "0", kit: "none" }, description: "Dealer Centre for centres: £299 a month + VAT, monthly, 14 days free" },
    payment_method_collection: "always",
    metadata: { centre_id: centre.id },
    ...(withKit && process.env.STRIPE_TERMS_URL ? { consent_collection: { terms_of_service: "required" } } : {}),
    success_url: `${env.appUrl()}/centre/welcome?centre=${centre.id}&paid=1`,
    cancel_url: `${env.appUrl()}/centre/welcome?centre=${centre.id}`,
    locale: "en-GB",
  });
  return NextResponse.redirect(session.url!);
}
