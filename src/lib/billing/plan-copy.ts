/** Dealer plan words and trial rules. Safe to import from the browser. No Stripe here. */
import { dealerPlanSentence as pricingSentence } from "@/lib/billing/pricing";

export const DEALER_TRIAL_DAYS = 5;
const DAY = 86400;
const UNLIMITED = 100000;

export type Tier = "25" | "100" | "150";
export const TIER_POUNDS: Record<Tier, number> = { "25": 25, "100": 100, "150": 150 };
export const TIER_NAME: Record<Tier, string> = {
  "25": "Up to 25 sold a month",
  "100": "26 to 50 sold a month",
  "150": "Unlimited sales",
};

export function isTier(t: string | null | undefined): t is Tier {
  return t === "25" || t === "100" || t === "150";
}

export function tierForLimit(limit: number | null | undefined): Tier {
  if ((limit ?? 25) >= UNLIMITED) return "150";
  if ((limit ?? 25) > 25) return "100";
  return "25";
}

export function limitForTier(tier: string | undefined): number | undefined {
  if (tier === "25") return 25;
  if (tier === "100") return 50;
  if (tier === "150") return UNLIMITED;
  return undefined;
}

export function poundsForLimit(limit: number | null | undefined): number {
  return TIER_POUNDS[tierForLimit(limit)];
}

export function tierBlurb(tier: Tier): string {
  if (tier === "25") return "Dealer Centre Starter: up to 25 items sold a month, £25 a month plus VAT";
  if (tier === "100") return "Dealer Centre Trade: 26 to 50 items sold a month, £100 a month plus VAT";
  return "Dealer Centre Pro: unlimited sales, £150 a month plus VAT";
}

export function stripeDueTodayMessage(tier: Tier): string {
  return `Due today £0.00. Then £${TIER_POUNDS[tier]} a month plus VAT after 5 days.`;
}

export function formatLongDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" }).format(d);
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
}

/** What the dealer reads next to Plan. No hyphens. Legacy rows keep their old price. New plans use Basic, Taster and Full. */
export function dealerPlanSentence(d: { plan: string; trial_ends_at: string | null; monthly_sold_limit: number; listing_mode?: string | null; billing_model?: string | null; taster_accepted_at?: string | null; taster_ends_at?: string | null }): string {
  return pricingSentence(d);
}

export type TrialSub = {
  status: string;
  trial_end: number | null;
  cancel_at_period_end?: boolean;
  metadata?: { trial_started?: string } | null;
};

/** Legacy 14 day trials, and any dealer trial staff have not started, must not charge. */
export function shouldHoldStripeTrial(sub: TrialSub, dealerPlan: string | null, nowSec = Math.floor(Date.now() / 1000)): boolean {
  if (sub.metadata?.trial_started === "1") return false;
  if (sub.cancel_at_period_end) return false;
  if (dealerPlan === "pro" || dealerPlan === "comp" || dealerPlan === "cancelled") return false;
  if (sub.status === "trialing") return true;
  if (sub.status === "active") return sub.trial_end != null && sub.trial_end <= nowSec && nowSec - sub.trial_end < 7 * DAY;
  return false;
}

/** Far trial end so Stripe does not charge during onboarding. Null when Stripe will not allow a useful extension. */
export function heldTrialEnd(anchorSec: number, nowSec: number): number | null {
  const cap = anchorSec + 730 * DAY - DAY;
  const end = Math.min(cap, nowSec + 700 * DAY);
  if (end < nowSec + 30 * DAY) return null;
  return end;
}

export function alreadyHeld(trialEnd: number | null, desired: number | null, status: string): boolean {
  if (!desired) return false;
  return status === "trialing" && (trialEnd ?? 0) >= desired - DAY;
}

export function canStartDealerTrial(d: {
  placeholder?: boolean;
  plan: string;
  listing_mode: string | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
}): boolean {
  if (d.placeholder || !d.stripe_customer_id) return false;
  if (d.listing_mode === "self") return false;
  if (d.plan !== "trial") return false;
  if (d.trial_ends_at && new Date(d.trial_ends_at).getTime() > Date.now()) return false;
  return true;
}
