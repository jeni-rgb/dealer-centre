import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import Stripe from "stripe";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.redirect(new URL("/signin", env.appUrl()));
  const { data: dealer } = await supabaseAdmin().from("dealers").select("stripe_customer_id").eq("id", me.dealer_id).single();
  if (!dealer?.stripe_customer_id) return NextResponse.redirect(new URL("/api/billing/checkout", env.appUrl()));
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const s = await stripe.billingPortal.sessions.create({ customer: dealer.stripe_customer_id, return_url: `${env.appUrl()}/app/settings` });
  return NextResponse.redirect(s.url);
}
