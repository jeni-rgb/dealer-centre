import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import Stripe from "stripe";
import { getMe } from "@/lib/auth";
import { currentCentre } from "@/lib/centre";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Stripe Customer Portal: dealers by default, centres with ?centre=1 (or ?centre=<id>). */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.redirect(new URL("/signin", env.appUrl()));
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const centreParam = new URL(req.url).searchParams.get("centre");

  if (centreParam) {
    const centre = await currentCentre(centreParam === "1" ? undefined : centreParam);
    if (!centre) return NextResponse.redirect(new URL("/signup/centre", env.appUrl()));
    const { data: row } = await supabaseAdmin().from("centres").select("stripe_customer_id").eq("id", centre.id).single();
    if (!row?.stripe_customer_id) return NextResponse.redirect(new URL(`/api/billing/centre-checkout?centre=${centre.id}`, env.appUrl()));
    const s = await stripe.billingPortal.sessions.create({ customer: row.stripe_customer_id, return_url: `${env.appUrl()}/centre/settings?centre=${centre.id}` });
    return NextResponse.redirect(s.url);
  }

  if (!me.dealer_id) return NextResponse.redirect(new URL("/signin", env.appUrl()));
  const { data: dealer } = await supabaseAdmin().from("dealers").select("stripe_customer_id").eq("id", me.dealer_id).single();
  if (!dealer?.stripe_customer_id) return NextResponse.redirect(new URL("/api/billing/checkout", env.appUrl()));
  const s = await stripe.billingPortal.sessions.create({ customer: dealer.stripe_customer_id, return_url: `${env.appUrl()}/app/settings` });
  return NextResponse.redirect(s.url);
}
