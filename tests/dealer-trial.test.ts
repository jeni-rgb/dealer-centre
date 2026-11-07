import { describe, expect, it } from "vitest";
import {
  DEALER_TRIAL_DAYS,
  TIER_NAME,
  alreadyHeld,
  canStartDealerTrial,
  dealerPlanSentence,
  heldTrialEnd,
  shouldHoldStripeTrial,
  stripeDueTodayMessage,
  tierBlurb,
} from "@/lib/billing/plan-copy";

const DAY = 86400;
const noDash = (s: string) => expect(s).not.toMatch(/[-–—]/);

describe("dealer trial", () => {
  it("is 5 days at £0.00 and Pro is unlimited", () => {
    expect(DEALER_TRIAL_DAYS).toBe(5);
    expect(TIER_NAME["150"]).toBe("Unlimited sales");
    noDash(TIER_NAME["25"]);
    noDash(TIER_NAME["100"]);
    noDash(TIER_NAME["150"]);
    noDash(tierBlurb("150"));
    noDash(stripeDueTodayMessage("25"));
    expect(stripeDueTodayMessage("100")).toContain("£0.00");
    expect(stripeDueTodayMessage("100")).toContain("£100");
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

  it("tells the dealer the first days are £0.00", () => {
    const line = dealerPlanSentence({ plan: "trial", trial_ends_at: null, monthly_sold_limit: 100000, listing_mode: "staff" });
    expect(line).toContain("£0.00");
    expect(line).toContain("Unlimited sales");
    noDash(line);
    noDash(dealerPlanSentence({ plan: "trial", trial_ends_at: "2026-11-12T00:00:00.000Z", monthly_sold_limit: 25, listing_mode: "self" }));
  });
});
