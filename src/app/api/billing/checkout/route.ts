import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import Stripe from "stripe";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Starts a Stripe Checkout for the dealer's subscription. Web only, never from the native app. */
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("tier") ?? "150";
  const tier = (["25", "100", "150"].includes(t) ? t : "150") as "25" | "100" | "150";
  const priceId = env.stripe.price(tier);
  const describe = { "25": "Dealer Centre Starter: up to 25 items sold a month, £25 a month + VAT", "100": "Dealer Centre Trade: 26 to 50 items sold a month, £100 a month + VAT", "150": "Dealer Centre Pro: over 50 items sold a month, £150 a month + VAT" }[tier];
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.redirect(new URL("/signin", env.appUrl()));
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const db = supabaseAdmin();
  const { data: dealer } = await db.from("dealers").select("name, stripe_customer_id").eq("id", me.dealer_id).single();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: dealer?.stripe_customer_id ?? undefined,
    customer_email: dealer?.stripe_customer_id ? undefined : me.email,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 14, description: describe, metadata: { dealer_id: me.dealer_id, tier } },
    payment_method_collection: "always",
    metadata: { dealer_id: me.dealer_id },
    success_url: `${env.appUrl()}/app?welcome=1`,
    cancel_url: `${env.appUrl()}/signup/dealer?step=card`,
    locale: "en-GB",
  });
  return NextResponse.redirect(session.url!);
}
