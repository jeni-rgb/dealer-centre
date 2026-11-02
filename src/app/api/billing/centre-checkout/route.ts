import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { getMe } from "@/lib/auth";
import { currentCentre } from "@/lib/centre";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Stripe Checkout for a centre's £299 a month subscription: 12 month minimum (the Register is included), card taken now. */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.redirect(new URL("/signin", env.appUrl()));
  const centreParam = new URL(req.url).searchParams.get("centre") ?? undefined;
  const centre = await currentCentre(centreParam);
  if (!centre) return NextResponse.redirect(new URL("/signup/centre", env.appUrl()));
  const priceId = env.stripe.centrePrice();
  if (!priceId) return NextResponse.json({ error: "STRIPE_PRICE_CENTRE is not set. Create the £299/month price in Stripe and add its id to Vercel." }, { status: 500 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const { data: row } = await supabaseAdmin().from("centres").select("stripe_customer_id").eq("id", centre.id).single();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: row?.stripe_customer_id ?? undefined,
    customer_email: row?.stripe_customer_id ? undefined : me.email,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { centre_id: centre.id, minimum_term_months: "12" }, description: "Dealer Centre for centres: 12 month minimum, Square Register kit included" },
    payment_method_collection: "always",
    metadata: { centre_id: centre.id },
    consent_collection: { terms_of_service: "required" },
    success_url: `${env.appUrl()}/centre/welcome?centre=${centre.id}&paid=1`,
    cancel_url: `${env.appUrl()}/centre/welcome?centre=${centre.id}`,
    locale: "en-GB",
  });
  return NextResponse.redirect(session.url!);
}
