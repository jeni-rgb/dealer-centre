import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Starts a Stripe Checkout for the dealer's subscription. Web only, never from the native app. */
export async function GET() {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.redirect(new URL("/signin", process.env.NEXT_PUBLIC_APP_URL));
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const db = supabaseAdmin();
  const { data: dealer } = await db.from("dealers").select("name, stripe_customer_id").eq("id", me.dealer_id).single();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: dealer?.stripe_customer_id ?? undefined,
    customer_email: dealer?.stripe_customer_id ? undefined : me.email,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    subscription_data: { trial_period_days: 30, metadata: { dealer_id: me.dealer_id } },
    payment_method_collection: "always",
    metadata: { dealer_id: me.dealer_id },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app?welcome=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/signup/dealer?step=card`,
    locale: "en-GB",
  });
  return NextResponse.redirect(session.url!);
}
