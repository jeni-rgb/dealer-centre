import type Stripe from "stripe";
import type { Admin } from "@/lib/supabase/server";

export { LABEL_PENCE as TOKEN_PENCE } from "@/lib/billing/pricing";

export function safeNext(raw: string | null, fallback: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) return fallback;
  return raw;
}

export async function listingTokenState(db: Admin, dealerId: string): Promise<{ mode: string | null; balance: number; bought: number }> {
  const { data } = await db.from("dealers").select("listing_mode, listing_tokens, listing_tokens_bought").eq("id", dealerId).maybeSingle();
  return { mode: data?.listing_mode ?? null, balance: data?.listing_tokens ?? 0, bought: data?.listing_tokens_bought ?? 0 };
}

/** Staff photographing is blocked until this dealer has paid for tokens, and again at zero. Grandfathered dealers (no listing mode) are skipped. */
export async function staffListingGate(db: Admin, dealerId: string): Promise<"ok" | "skip" | "need_purchase" | "none_left"> {
  const state = await listingTokenState(db, dealerId);
  if (state.mode !== "staff") return "skip";
  if (state.bought < 1) return "need_purchase";
  if (state.balance < 1) return "none_left";
  return "ok";
}

export async function consumeStaffToken(db: Admin, dealerId: string, itemId: string): Promise<void> {
  const state = await listingTokenState(db, dealerId);
  if (state.mode !== "staff") return;
  const { error } = await db.rpc("apply_listing_tokens", { p_dealer_id: dealerId, p_delta: -1, p_reason: "list", p_session: null, p_item: itemId });
  if (error) throw new Error(error.message);
}

export async function creditTokenPurchase(db: Admin, dealerId: string, qty: number, sessionId: string): Promise<void> {
  if (!Number.isInteger(qty) || qty < 1) return;
  const { error } = await db.rpc("apply_listing_tokens", { p_dealer_id: dealerId, p_delta: qty, p_reason: "purchase", p_session: sessionId, p_item: null });
  if (error) throw new Error(error.message);
}

/** Idempotent. Safe from the webhook and from the success page. */
export async function recordTokenPayment(db: Admin, stripe: Stripe, session: Stripe.Checkout.Session): Promise<void> {
  const dealerId = session.metadata?.dealer_id;
  if (!dealerId || session.metadata?.purpose !== "listing_tokens") return;
  if (session.payment_status !== "paid") return;
  const qty = Number(session.metadata.tokens);
  await creditTokenPurchase(db, dealerId, qty, session.id);
  const customerId = session.customer ? String(session.customer) : null;
  if (!customerId) return;
  await db.from("dealers").update({ stripe_customer_id: customerId, listing_mode: "staff" }).eq("id", dealerId);
  const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!piId) return;
  const pi = await stripe.paymentIntents.retrieve(piId);
  const pm = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id;
  if (pm) await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: pm } }).catch(() => undefined);
}

/** Reads the new listing columns, and falls back if the migration is not applied yet so the app keeps opening. */
export async function dealerWithListing(sb: { from: (t: string) => any }, id: string, extra: string) {
  const billing = "billing_model, taster_accepted_at, taster_ends_at";
  const full = `${extra}, listing_mode, listing_tokens, listing_tokens_bought, card_added_at, ${billing}`;
  const first = await sb.from("dealers").select(full).eq("id", id).single();
  if (!first.error && first.data) return first.data;
  const msg = String(first.error?.message ?? "");
  const blankBilling = { billing_model: null, taster_accepted_at: null, taster_ends_at: null };
  if (/billing_model|taster_/.test(msg)) {
    const mid = await sb.from("dealers").select(`${extra}, listing_mode, listing_tokens, listing_tokens_bought, card_added_at`).eq("id", id).single();
    if (!mid.error && mid.data) return { ...mid.data, ...blankBilling };
  }
  if (!/listing_mode|listing_tokens|card_added_at|billing_model|taster_/.test(msg)) return first.data;
  const second = await sb.from("dealers").select(extra).eq("id", id).single();
  if (!second.data) return null;
  return { ...second.data, listing_mode: null, listing_tokens: 0, listing_tokens_bought: 0, card_added_at: null, ...blankBilling };
}

export async function confirmTokenPurchase(db: Admin, stripe: Stripe, sessionId: string, dealerId: string): Promise<void> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.dealer_id !== dealerId) return;
  await recordTokenPayment(db, stripe, session);
}
