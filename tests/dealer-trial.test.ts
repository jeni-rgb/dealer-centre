import { describe, expect, it } from "vitest";
import {
  alreadyHeld,
  canStartDealerTrial,
  dealerPlanSentence,
  heldTrialEnd,
  shouldHoldStripeTrial,
} from "@/lib/billing/plan-copy";
import { labelPriceLabel, namedSales, tasterEndedLetter, tasterInviteLetter } from "@/lib/billing/pricing";

const DAY = 86400;
const noDash = (s: string) => expect(s).not.toMatch(/[-–—]/);

describe("dealer pricing", () => {
  it("uses Basic, a 2 week taster and Full at £25", () => {
    const basic = dealerPlanSentence({ plan: "trial", trial_ends_at: null, monthly_sold_limit: 25, billing_model: "basic" });
    expect(basic).toContain("Basic");
    expect(basic).toContain("Item names stay off");
    noDash(basic);
    const full = dealerPlanSentence({ plan: "pro", trial_ends_at: null, monthly_sold_limit: 100000, billing_model: "full" });
    expect(full).toContain("£25");
    expect(full).toContain("Direct Debit");
    noDash(full);
    expect(labelPriceLabel(1)).toBe("£0.75 plus VAT");
    expect(labelPriceLabel(25)).toBe("£18.75 plus VAT");
    noDash(labelPriceLabel(4));
    const invite = tasterInviteLetter("Bloom Antiques", "https://example.com/taster?t=abc");
    const ended = tasterEndedLetter("Bloom Antiques", "https://example.com/signup");
    noDash(invite.subject); noDash(invite.text); noDash(ended.subject); noDash(ended.text);
    expect(invite.text).toContain("25");
    expect(ended.text).toContain("£25");
    expect(namedSales({ plan: "trial", billing_model: "basic" })).toBe(false);
    expect(namedSales({ plan: "pro", billing_model: "full" })).toBe(true);
    expect(namedSales({ plan: "trial", billing_model: "taster", taster_accepted_at: new Date().toISOString(), taster_ends_at: new Date(Date.now() + 86400000).toISOString() })).toBe(true);
    expect(namedSales({ plan: "pro", monthly_sold_limit: 50 })).toBe(true);
  });

  it("holds a trialing subscription staff have not started", () => {
    expect(shouldHoldStripeTrial({ status: "trialing", trial_end: 100, metadata: {} }, "trial", 50)).toBe(true);
    expect(shouldHoldStripeTrial({ status: "trialing", trial_end: 100, metadata: { trial_started: "1" } }, "trial", 50)).toBe(false);
    expect(shouldHoldStripeTrial({ status: "trialing", trial_end: 100, cancel_at_period_end: true, metadata: {} }, "trial", 50)).toBe(false);
    expect(shouldHoldStripeTrial({ status: "active", trial_end: 10, metadata: {} }, "pro", 50)).toBe(false);
    expect(shouldHoldStripeTrial({ status: "active", trial_end: 40, metadata: {} }, "trial", 50)).toBe(true);
    expect(shouldHoldStripeTrial({ status: "active", trial_end: 40, metadata: {} }, "trial", 50 + 8 * DAY)).toBe(false);
  });

  it("pushes the Stripe trial far enough that listing does not get charged", () => {
    const now = 1_700_000_000;
    const end = heldTrialEnd(now, now);
    expect(end).toBe(now + 700 * DAY);
    expect(heldTrialEnd(now - 720 * DAY, now)).toBeNull();
    expect(alreadyHeld(now + 700 * DAY, now + 700 * DAY, "trialing")).toBe(true);
    expect(alreadyHeld(now + 2 * DAY, now + 700 * DAY, "trialing")).toBe(false);
  });

  it("lets only staff start a trial, and not for someone listing their own stock", () => {
    const base = { placeholder: false, plan: "trial", listing_mode: null as string | null, trial_ends_at: null as string | null, stripe_customer_id: "cus" };
    expect(canStartDealerTrial(base)).toBe(true);
    expect(canStartDealerTrial({ ...base, listing_mode: "staff" })).toBe(true);
    expect(canStartDealerTrial({ ...base, listing_mode: "self" })).toBe(false);
    expect(canStartDealerTrial({ ...base, stripe_customer_id: null })).toBe(false);
    expect(canStartDealerTrial({ ...base, trial_ends_at: new Date(Date.now() + 86400000).toISOString() })).toBe(false);
    expect(canStartDealerTrial({ ...base, plan: "pro" })).toBe(false);
  });

  it("keeps a legacy paying dealer's current price", () => {
    const line = dealerPlanSentence({ plan: "pro", trial_ends_at: null, monthly_sold_limit: 50 });
    expect(line).toContain("£100");
    expect(line).toContain("current plan");
    noDash(line);
  });
});
