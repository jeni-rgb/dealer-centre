import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { safeNext } from "@/lib/billing/tokens";

/** One off payment for listing tokens. £1 plus VAT each. Not a subscription and not £0.00. */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.redirect(new URL("/signin", env.appUrl()));
  const url = new URL(req.url);
  const qty = Number(url.searchParams.get("qty"));
  if (!Number.isInteger(qty) || qty < 1 || qty > 5000) return NextResponse.json({ error: "Enter how many items, at least 1." }, { status: 400 });
  let dealerId = me.dealer_id;
  const requested = url.searchParams.get("dealer");
  if (requested) {
    if (!me.is_platform_admin) return NextResponse.json({ error: "admin only" }, { status: 403 });
    dealerId = requested;
  }
  if (!dealerId) return NextResponse.redirect(new URL("/signup/dealer", env.appUrl()));
  const db = supabaseAdmin();
  const { data: dealer } = await db.from("dealers").select("stripe_customer_id, listing_mode").eq("id", dealerId).single();
  if (!dealer) return NextResponse.json({ error: "Dealer not found" }, { status: 404 });
  if (dealer.listing_mode !== "staff") return NextResponse.json({ error: "Listing tokens are for dealers who asked Dealer Centre to list the stock." }, { status: 400 });
  const next = safeNext(url.searchParams.get("next"), me.is_platform_admin && requested ? `/admin/dealers/${dealerId}` : "/signup/dealer?step=centre");
  const vat = env.stripe.vatRate();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: dealer.stripe_customer_id ?? undefined,
    customer_email: dealer.stripe_customer_id ? undefined : me.email,
    ...(dealer.stripe_customer_id ? {} : { customer_creation: "always" as const }),
    line_items: [{
      quantity: qty,
      price_data: {
        currency: "gbp",
        unit_amount: 100,
        product_data: { name: "Listing token", description: "£1 plus VAT. We photograph, write and label one item." },
      },
      ...(vat ? { tax_rates: [vat] } : {}),
    }],
    payment_intent_data: { setup_future_usage: "off_session", metadata: { dealer_id: dealerId, purpose: "listing_tokens" } },
    metadata: { dealer_id: dealerId, purpose: "listing_tokens", tokens: String(qty) },
    success_url: `${env.appUrl()}${next}${next.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.appUrl()}${next.startsWith("/admin") ? next : "/signup/dealer?step=tokens"}`,
    locale: "en-GB",
  });
  return NextResponse.redirect(session.url!);
}
