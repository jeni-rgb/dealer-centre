import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { confirmTokenPurchase } from "@/lib/billing/tokens";

/** Label payment landed. Remember the choice, then open Full. */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.redirect(new URL("/signin", env.appUrl()));
  const sessionId = new URL(req.url).searchParams.get("session_id");
  const db = supabaseAdmin();
  if (sessionId && process.env.STRIPE_SECRET_KEY && process.env.DEMO_MODE !== "1") {
    await confirmTokenPurchase(db, new Stripe(process.env.STRIPE_SECRET_KEY), sessionId, me.dealer_id).catch((e) => console.error("[labels]", e));
  }
  await db.from("dealers").update({ listing_mode: "staff", full_labels_choice: "buy" }).eq("id", me.dealer_id);
  return NextResponse.redirect(new URL("/api/billing/checkout", env.appUrl()));
}
