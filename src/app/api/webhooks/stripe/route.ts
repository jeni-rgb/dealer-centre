import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/server";


export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const body = await req.text();
  let evt: Stripe.Event;
  try {
    evt = stripe.webhooks.constructEvent(body, req.headers.get("stripe-signature") ?? "", process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new NextResponse("bad signature", { status: 400 });
  }
  const db = supabaseAdmin();
  const { error: dup } = await db.from("webhook_log").insert({ source: "stripe", event_type: evt.type, external_event_id: evt.id, payload: evt as unknown as Record<string, unknown> });
  if (dup) return NextResponse.json({ ok: true });

  const planFor = (s: Stripe.Subscription) =>
    s.status === "trialing" ? "trial" : s.status === "active" ? "pro" : s.status === "past_due" ? "lapsed" : "cancelled";

  if (evt.type === "checkout.session.completed") {
    const s = evt.data.object;
    const dealerId = s.metadata?.dealer_id;
    if (dealerId) {
      await db.from("dealers").update({ stripe_customer_id: String(s.customer), stripe_subscription_id: String(s.subscription) }).eq("id", dealerId);
    }
  }
  if (evt.type === "customer.subscription.updated" || evt.type === "customer.subscription.deleted" || evt.type === "customer.subscription.created") {
    const s = evt.data.object;
    await db
      .from("dealers")
      .update({ plan: planFor(s), trial_ends_at: s.trial_end ? new Date(s.trial_end * 1000).toISOString() : null })
      .eq("stripe_customer_id", String(s.customer));
  }
  await db.from("webhook_log").update({ status: "processed", processed_at: new Date().toISOString() }).eq("source", "stripe").eq("external_event_id", evt.id);
  return NextResponse.json({ ok: true });
}
