/** Dealer pricing from November 2026. Safe to import from the browser. No Stripe here. */

export const FULL_POUNDS = 25;
export const LABEL_PENCE = 75;
export const TASTER_DAYS = 14;
export const TASTER_FREE_LABELS = 25;
export const CENTRE_FULL_CREDIT_PENCE = 250;
const UNLIMITED = 100000;

export type BillingModel = "basic" | "taster" | "full" | "legacy";

export type BillingDealer = {
  plan: string;
  trial_ends_at?: string | null;
  monthly_sold_limit?: number | null;
  billing_model?: string | null;
  taster_accepted_at?: string | null;
  taster_ends_at?: string | null;
  listing_mode?: string | null;
};

export function billingModel(d: BillingDealer): BillingModel {
  if (d.billing_model === "basic" || d.billing_model === "taster" || d.billing_model === "full") return d.billing_model;
  return "legacy";
}

export function tasterLive(d: BillingDealer, now = Date.now()): boolean {
  if (!d.taster_ends_at) return false;
  return new Date(d.taster_ends_at).getTime() > now && !!d.taster_accepted_at;
}

/** Named sales (item, price, date, centre) are Full, or a taster that has not ended. Legacy paying and comp accounts keep them. */
export function namedSales(d: BillingDealer, now = Date.now()): boolean {
  const model = billingModel(d);
  if (model === "full") return true;
  if (model === "taster") return tasterLive(d, now);
  if (model === "basic") return false;
  if (d.plan === "pro" || d.plan === "comp") return true;
  if (d.plan === "trial" && d.trial_ends_at && new Date(d.trial_ends_at).getTime() > now) return true;
  return false;
}

export function labelPriceLabel(qty: number): string {
  const pence = LABEL_PENCE * qty;
  const pounds = pence / 100;
  const amount = Number.isInteger(pounds) ? `£${pounds}` : `£${pounds.toFixed(2)}`;
  return `${amount} plus VAT`;
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
}

/** What the dealer reads next to Plan. No hyphens. */
export function dealerPlanSentence(d: BillingDealer): string {
  const model = billingModel(d);
  if (model === "full") {
    return "Full. £25 a month plus VAT by Direct Debit. Named sales at every centre, on one bill.";
  }
  if (model === "taster" && d.taster_ends_at && tasterLive(d)) {
    return `Taster. Named sales until ${formatShortDate(d.taster_ends_at)}. Then Basic, unless you join Full at £25 a month plus VAT.`;
  }
  if (model === "taster" || model === "basic") {
    return "Basic. Free. Your sales sheet shows the totals, and the centre pays you on their usual day. Item names stay off the app.";
  }
  const limit = d.monthly_sold_limit ?? 25;
  const price = limit >= UNLIMITED ? 150 : limit > 25 ? 100 : 25;
  const band = limit >= UNLIMITED ? "Unlimited sales" : limit > 25 ? "26 to 50 sold a month" : "Up to 25 sold a month";
  if (d.plan === "pro") return `£${price} a month plus VAT on your current plan. ${band}.`;
  if (d.plan === "comp") return `Free account. ${band}.`;
  if (d.plan === "trial" && d.trial_ends_at) return `Current trial until ${formatShortDate(d.trial_ends_at)}. ${band}.`;
  return `${d.plan}. ${band}.`;
}

export function tasterInviteLetter(name: string, link: string): { subject: string; text: string } {
  return {
    subject: "Your sales at the centre, and 2 free weeks",
    text: `Hello ${name},

Your centre uses Dealer Centre, so you already have a free Basic account. Basic sends a sales sheet with the totals when the centre pays you. It does not show item names.

If you would like it, you can have 2 weeks of named sales in the app, and we will label your first 25 items for free. After that you go back to Basic, unless you join Full at £25 a month plus VAT by Direct Debit.

Nothing is charged for the 2 weeks or the 25 labels. Say yes here:

${link}

Dealer Centre`,
  };
}

export function tasterEndedLetter(name: string, joinUrl: string): { subject: string; text: string } {
  return {
    subject: "Your 2 weeks of named sales have ended",
    text: `Hello ${name},

Your 2 weeks of named sales have ended. You are back on Basic. Your sales sheet still shows the totals, and the centre still pays you on their usual day. Item names are off the app.

Join Full for £25 a month plus VAT by Direct Debit and you see every sale: the name, the price, the date and the centre. One account and one bill, however many centres you sell at.

${joinUrl}

If you do nothing, you stay on Basic. Nothing is charged.

Dealer Centre`,
  };
}

export function tasterEndedPush(): { title: string; body: string } {
  return {
    title: "Your 2 weeks have ended",
    body: "You are back on Basic. Join Full for £25 a month plus VAT by Direct Debit to keep named sales.",
  };
}
