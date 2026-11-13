import Stripe from "stripe";
import { env } from "@/lib/env";
import { trialLetter } from "@/lib/email/letters";
import { sendBranded } from "@/lib/email/send";
import type { Admin } from "@/lib/supabase/server";
import {
  DEALER_TRIAL_DAYS,
  alreadyHeld,
  formatLongDate,
  heldTrialEnd,
  limitForTier,
  poundsForLimit,
  shouldHoldStripeTrial,
  tierBlurb,
  tierForLimit,
  type Tier,
} from "@/lib/billing/plan-copy";

export { DEALER_TRIAL_DAYS };

function customerId(customer: Stripe.Subscription["customer"] | Stripe.Checkout.Session["customer"]): string {
  if (!customer) return "";
  return typeof customer === "string" ? customer : customer.id;
}

function knownDealerPrice(priceId: string | undefined): boolean {
  if (!priceId) return false;
  return (["25", "100", "150"] as const).some((t) => {
    const id = env.stripe.price(t);
    return !!id && id === priceId;
  });
}

function limitFromSub(s: Stripe.Subscription): number | undefined {
  const price = s.items.data[0]?.price;
  const meta = Number(price?.metadata?.monthly_sold_limit ?? 0);
  if (meta) return meta;
  const priceId = price?.id;
  if (priceId && env.stripe.price("25") && priceId === env.stripe.price("25")) return 25;
  if (priceId && env.stripe.price("100") && priceId === env.stripe.price("100")) return 50;
  if (priceId && env.stripe.price("150") && priceId === env.stripe.price("150")) return 100000;
  return limitForTier(s.metadata?.tier);
}

async function dealerEmails(db: Admin, dealerId: string): Promise<string[]> {
  const { data } = await db.from("users").select("email").eq("dealer_id", dealerId);
  return (data ?? []).map((u) => u.email).filter(Boolean);
}

export async function emailTrialStarted(db: Admin, dealerId: string, when: Date, pounds: number): Promise<"sent" | "skipped" | "failed"> {
  return sendBranded(await dealerEmails(db, dealerId), trialLetter("started", formatLongDate(when), pounds));
}

export async function emailTrialEnding(db: Admin, dealerId: string, when: Date, pounds: number): Promise<"sent" | "skipped" | "failed"> {
  return sendBranded(await dealerEmails(db, dealerId), trialLetter("ending", formatLongDate(when), pounds));
}

async function defaultCard(stripe: Stripe, customerId: string): Promise<string | null> {
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  const fromInvoice = customer.invoice_settings?.default_payment_method;
  const id = typeof fromInvoice === "string" ? fromInvoice : fromInvoice?.id;
  if (id) return id;
  const list = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
  return list.data[0]?.id ?? null;
}

export async function holdSubscription(stripe: Stripe, sub: Stripe.Subscription): Promise<"held" | "already" | "paused"> {
  if (sub.metadata?.trial_started === "1") return "already";
  const now = Math.floor(Date.now() / 1000);
  const anchor = sub.billing_cycle_anchor || sub.start_date || sub.created;
  const desired = heldTrialEnd(anchor, now);
  if (alreadyHeld(sub.trial_end, desired, sub.status)) return "already";
  if (!desired && sub.pause_collection && sub.metadata?.onboarding === "1") return "already";
  const metadata = { ...sub.metadata, onboarding: "1" };
  if (desired) {
    await stripe.subscriptions.update(sub.id, { trial_end: desired, proration_behavior: "none", pause_collection: "", metadata });
    return "held";
  }
  await stripe.subscriptions.update(sub.id, { pause_collection: { behavior: "void" }, proration_behavior: "none", metadata });
  return "paused";
}

async function refundInvoice(stripe: Stripe, invoice: Stripe.Invoice): Promise<void> {
  const payments = await stripe.invoicePayments.list({ invoice: invoice.id, limit: 5 });
  for (const p of payments.data) {
    if (p.status !== "paid") continue;
    const pi = p.payment?.payment_intent;
    const piId = typeof pi === "string" ? pi : pi?.id;
    if (piId) {
      await stripe.refunds.create({ payment_intent: piId }).catch(() => undefined);
      return;
    }
    const charge = p.payment?.charge;
    const chargeId = typeof charge === "string" ? charge : charge?.id;
    if (chargeId) {
      await stripe.refunds.create({ charge: chargeId }).catch(() => undefined);
      return;
    }
  }
}

async function refundRecentTrialCharge(stripe: Stripe, sub: Stripe.Subscription): Promise<void> {
  const invoices = await stripe.invoices.list({ subscription: sub.id, limit: 5 });
  const now = Math.floor(Date.now() / 1000);
  for (const invoice of invoices.data) {
    if (invoice.status !== "paid" || invoice.amount_paid <= 0) continue;
    if (now - invoice.created > 7 * 86400) continue;
    if (invoice.billing_reason !== "subscription_cycle" && invoice.billing_reason !== "subscription") continue;
    await refundInvoice(stripe, invoice);
  }
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

export function isCentrePrice(priceId: string | undefined): boolean {
  if (!priceId) return false;
  const kit = env.stripe.centrePrice();
  const own = env.stripe.centreOwnTillPrice();
  return (!!kit && priceId === kit) || (!!own && priceId === own);
}

export async function syncDealerSubscription(db: Admin, stripe: Stripe, s: Stripe.Subscription): Promise<void> {
  const priceId = s.items.data[0]?.price?.id;
  if (isCentrePrice(priceId)) return;
  const customer = customerId(s.customer);
  const { data: row } = await db.from("dealers").select("id, plan, trial_ends_at, monthly_sold_limit").eq("stripe_customer_id", customer).maybeSingle();
  const dealerId = row?.id ?? s.metadata?.dealer_id ?? null;
  if (!dealerId && !knownDealerPrice(priceId)) return;
  const limit = limitFromSub(s);
  const started = s.metadata?.trial_started === "1";
  const patch = async (fields: Record<string, unknown>) => {
    let q = db.from("dealers").update({ ...fields, ...(limit ? { monthly_sold_limit: limit } : {}) });
    q = dealerId ? q.eq("id", dealerId) : q.eq("stripe_customer_id", customer);
    await q;
  };

  if (started) {
    const trialEnds = s.trial_end ? new Date(s.trial_end * 1000).toISOString() : null;
    const plan = s.status === "trialing" ? "trial" : s.status === "active" ? "pro" : s.status === "past_due" ? "lapsed" : "cancelled";
    const fresh = !row?.trial_ends_at && s.status === "trialing" && !!s.trial_end;
    await patch({ plan, trial_ends_at: trialEnds, stripe_subscription_id: s.id, stripe_customer_id: customer });
    if (fresh && dealerId) await emailTrialStarted(db, dealerId, new Date(s.trial_end! * 1000), poundsForLimit(limit ?? row?.monthly_sold_limit)).catch(() => undefined);
    return;
  }

  const planNow = row?.plan ?? (dealerId ? "trial" : null);
  if (shouldHoldStripeTrial(s, planNow)) {
    await patch({ plan: "trial", trial_ends_at: null, stripe_subscription_id: s.id, stripe_customer_id: customer });
    if (s.status === "active") await refundRecentTrialCharge(stripe, s).catch((e) => console.error("[dealer trial] refund", e));
    const desired = heldTrialEnd(s.billing_cycle_anchor || s.start_date || s.created, Math.floor(Date.now() / 1000));
    if (!alreadyHeld(s.trial_end, desired, s.status)) await holdSubscription(stripe, s).catch((e) => console.error("[dealer trial] hold", e));
    return;
  }

  const plan = s.status === "trialing" ? "trial" : s.status === "active" ? "pro" : s.status === "past_due" ? "lapsed" : "cancelled";
  const trialEnds = s.trial_end ? new Date(s.trial_end * 1000).toISOString() : null;
  await patch({ plan, trial_ends_at: trialEnds, stripe_subscription_id: s.id, stripe_customer_id: customer });
}

export async function stopUnstartedTrialInvoice(db: Admin, stripe: Stripe, invoice: Stripe.Invoice): Promise<void> {
  if (invoice.billing_reason !== "subscription_cycle" && invoice.billing_reason !== "subscription") return;
  if ((invoice.amount_due ?? 0) <= 0 && (invoice.amount_paid ?? 0) <= 0) return;
  const subId = subscriptionIdFromInvoice(invoice);
  if (!subId) return;
  const sub = await stripe.subscriptions.retrieve(subId);
  if (isCentrePrice(sub.items.data[0]?.price?.id)) return;
  if (sub.metadata?.trial_started === "1") return;
  const customer = customerId(sub.customer);
  const { data: row } = await db.from("dealers").select("id, plan").eq("stripe_customer_id", customer).maybeSingle();
  if (!row && !sub.metadata?.dealer_id && !knownDealerPrice(sub.items.data[0]?.price?.id)) return;
  if (!shouldHoldStripeTrial(sub, row?.plan ?? "trial")) return;
  if (invoice.status === "draft") {
    await stripe.invoices.update(invoice.id, { auto_advance: false }).catch(() => undefined);
    await stripe.invoices.del(invoice.id).catch(() => undefined);
  } else if (invoice.status === "open") {
    await stripe.invoices.voidInvoice(invoice.id).catch(() => undefined);
  } else if (invoice.status === "paid") {
    await refundInvoice(stripe, invoice).catch(() => undefined);
  }
  await holdSubscription(stripe, sub).catch((e) => console.error("[dealer trial] hold invoice", e));
  if (row) await db.from("dealers").update({ plan: "trial", trial_ends_at: null }).eq("id", row.id);
}

export async function saveDealerCard(db: Admin, stripe: Stripe, session: Stripe.Checkout.Session): Promise<void> {
  const dealerId = session.metadata?.dealer_id;
  if (!dealerId) return;
  const customer = customerId(session.customer);
  const setupId = typeof session.setup_intent === "string" ? session.setup_intent : session.setup_intent?.id;
  if (customer && setupId) {
    const intent = await stripe.setupIntents.retrieve(setupId);
    const pm = typeof intent.payment_method === "string" ? intent.payment_method : intent.payment_method?.id;
    if (pm) {
      await stripe.customers.update(customer, { invoice_settings: { default_payment_method: pm } });
      const { data: row } = await db.from("dealers").select("stripe_subscription_id").eq("id", dealerId).maybeSingle();
      if (row?.stripe_subscription_id) await stripe.subscriptions.update(row.stripe_subscription_id, { default_payment_method: pm }).catch(() => undefined);
    }
  }
  const limit = limitForTier(session.metadata?.tier);
  await db.from("dealers").update({
    ...(customer ? { stripe_customer_id: customer } : {}),
    plan: "trial",
    trial_ends_at: null,
    ...(limit ? { monthly_sold_limit: limit } : {}),
  }).eq("id", dealerId);
  await db.from("dealers").update({ listing_mode: "staff", card_added_at: new Date().toISOString() }).eq("id", dealerId);
}

async function subscriptionWithTrial(stripe: Stripe, dealerId: string, customer: string, tier: Tier, existing: Stripe.Subscription | null): Promise<Stripe.Subscription> {
  const price = env.stripe.price(tier);
  const vat = env.stripe.vatRate();
  const tax = vat ? { tax_rates: [vat] } : {};
  const trialEnd = Math.floor(Date.now() / 1000) + DEALER_TRIAL_DAYS * 86400;
  if (existing && existing.status !== "canceled" && existing.status !== "incomplete_expired") {
    const item = existing.items.data[0];
    const items = item && price && item.price.id !== price ? [{ id: item.id, price, ...tax }] : undefined;
    return stripe.subscriptions.update(existing.id, {
      trial_end: trialEnd,
      proration_behavior: "none",
      pause_collection: "",
      metadata: { ...existing.metadata, dealer_id: dealerId, trial_started: "1", onboarding: "", tier },
      ...(items ? { items } : {}),
    });
  }
  const pm = await defaultCard(stripe, customer);
  if (!pm) throw new Error("There is no card saved for this dealer. Ask them to add one from the app.");
  return stripe.subscriptions.create({
    customer,
    items: [{ price, quantity: 1, ...tax }],
    trial_period_days: DEALER_TRIAL_DAYS,
    default_payment_method: pm,
    payment_settings: { save_default_payment_method: "on_subscription" },
    description: tierBlurb(tier),
    metadata: { dealer_id: dealerId, trial_started: "1", tier },
  }, { idempotencyKey: `dealer-start-trial-${dealerId}-${Math.floor(Date.now() / 60000)}` });
}

export async function startDealerTrial(db: Admin, dealerId: string): Promise<{ until: string; emailed: boolean; email_error?: string; note?: string }> {
  const { data: dealer } = await db.from("dealers").select("id, plan, placeholder, listing_mode, stripe_customer_id, stripe_subscription_id, monthly_sold_limit, trial_ends_at").eq("id", dealerId).single();
  if (!dealer) throw new Error("Dealer not found");
  if (dealer.placeholder) throw new Error("This dealer is not on the app yet.");
  if (dealer.listing_mode === "self") throw new Error("This dealer lists their own stock. Their 5 day trial starts when they add a card.");
  if (!dealer.stripe_customer_id) throw new Error("This dealer has not added a card yet.");
  if (dealer.plan === "pro") throw new Error("This dealer is already paying. Use extend trial to give more free days.");
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured.");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const tier = tierForLimit(dealer.monthly_sold_limit);
  let existing: Stripe.Subscription | null = null;
  if (dealer.stripe_subscription_id) {
    existing = await stripe.subscriptions.retrieve(dealer.stripe_subscription_id);
    if (existing.metadata?.trial_started === "1" && existing.status === "trialing" && existing.trial_end && existing.trial_end * 1000 > Date.now()) {
      const until = new Date(existing.trial_end * 1000).toISOString();
      await db.from("dealers").update({ plan: "trial", trial_ends_at: until }).eq("id", dealerId);
      return { until, emailed: false, note: "Trial is already running." };
    }
    if (existing.status === "incomplete" || existing.status === "past_due") throw new Error("The Stripe subscription needs a card update before the trial can start.");
  }
  const updated = await subscriptionWithTrial(stripe, dealerId, dealer.stripe_customer_id, tier, existing);
  if (!updated.trial_end) throw new Error("Stripe did not start the trial.");
  const untilDate = new Date(updated.trial_end * 1000);
  await db.from("dealers").update({ plan: "trial", trial_ends_at: untilDate.toISOString(), stripe_subscription_id: updated.id, stripe_customer_id: dealer.stripe_customer_id }).eq("id", dealerId);
  const mail = await emailTrialStarted(db, dealerId, untilDate, poundsForLimit(dealer.monthly_sold_limit));
  return { until: untilDate.toISOString(), emailed: mail === "sent", ...(mail === "failed" ? { email_error: "Could not send the email." } : {}) };
}

export async function pushStripeTrialEnd(subscriptionId: string, until: Date): Promise<void> {
  if (!process.env.STRIPE_SECRET_KEY) return;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  await stripe.subscriptions.update(subscriptionId, {
    trial_end: Math.floor(until.getTime() / 1000),
    proration_behavior: "none",
    pause_collection: "",
    metadata: { ...sub.metadata, trial_started: "1", onboarding: "" },
  });
}

export async function reconcileDealerTrial(db: Admin, dealer: { id: string; plan: string; stripe_subscription_id: string | null }): Promise<{ plan: string; trial_ends_at: string | null } | null> {
  if (!process.env.STRIPE_SECRET_KEY || process.env.DEMO_MODE === "1" || !dealer.stripe_subscription_id || dealer.plan !== "trial") return null;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sub = await stripe.subscriptions.retrieve(dealer.stripe_subscription_id);
  if (sub.metadata?.trial_started === "1" && sub.status === "trialing" && sub.trial_end) {
    const trial_ends_at = new Date(sub.trial_end * 1000).toISOString();
    await db.from("dealers").update({ plan: "trial", trial_ends_at }).eq("id", dealer.id);
    return { plan: "trial", trial_ends_at };
  }
  const { data: row } = await db.from("dealers").select("plan").eq("id", dealer.id).maybeSingle();
  if (!shouldHoldStripeTrial(sub, row?.plan ?? dealer.plan)) return null;
  if (sub.status === "active") await refundRecentTrialCharge(stripe, sub).catch(() => undefined);
  await holdSubscription(stripe, sub);
  await db.from("dealers").update({ plan: "trial", trial_ends_at: null }).eq("id", dealer.id);
  return { plan: "trial", trial_ends_at: null };
}

let holdInflight: Promise<{ held: number }> | null = null;
let holdRanAt = 0;

export function holdUnstartedDealerTrials(): Promise<{ held: number; skipped?: boolean }> {
  if (!process.env.STRIPE_SECRET_KEY || process.env.DEMO_MODE === "1") return Promise.resolve({ held: 0, skipped: true });
  if (holdInflight) return holdInflight;
  if (Date.now() - holdRanAt < 60_000) return Promise.resolve({ held: 0, skipped: true });
  holdInflight = runHold().finally(() => { holdInflight = null; holdRanAt = Date.now(); });
  return holdInflight;
}

async function runHold(): Promise<{ held: number }> {
  const { supabaseAdmin } = await import("@/lib/supabase/server");
  const db = supabaseAdmin();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const { data } = await db.from("dealers").select("id, plan, stripe_subscription_id").eq("plan", "trial").not("stripe_subscription_id", "is", null);
  let held = 0;
  for (const dealer of data ?? []) {
    if (!dealer.stripe_subscription_id) continue;
    try {
      const sub = await stripe.subscriptions.retrieve(dealer.stripe_subscription_id);
      if (!shouldHoldStripeTrial(sub, dealer.plan)) continue;
      if (sub.status === "active") await refundRecentTrialCharge(stripe, sub).catch(() => undefined);
      const result = await holdSubscription(stripe, sub);
      await db.from("dealers").update({ plan: "trial", trial_ends_at: null }).eq("id", dealer.id);
      if (result !== "already") held += 1;
    } catch (e) {
      console.error("[dealer trial] hold", dealer.id, e);
    }
  }
  return { held };
}

export async function emailIfTrialEnding(db: Admin, s: Stripe.Subscription): Promise<void> {
  if (s.metadata?.trial_started !== "1" || !s.trial_end || isCentrePrice(s.items.data[0]?.price?.id)) return;
  const customer = customerId(s.customer);
  const { data: dealer } = await db.from("dealers").select("id, monthly_sold_limit").eq("stripe_customer_id", customer).maybeSingle();
  if (!dealer) return;
  await emailTrialEnding(db, dealer.id, new Date(s.trial_end * 1000), poundsForLimit(dealer.monthly_sold_limit));
}
