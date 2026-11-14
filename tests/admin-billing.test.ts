import { describe, expect, it } from "vitest";
import { deletedSubscriptionUpdate } from "@/lib/billing/dealer-trial";
import { basicChoiceFields, moveToBasicDecision, showMoveToBasic } from "@/lib/billing/taster";
import { dealerAdminFacts } from "@/lib/admin/status";

describe("admin plan fixes", () => {
  it("does not downgrade a free dealer or a different subscription", () => {
    expect(deletedSubscriptionUpdate({ plan: "comp", stripe_subscription_id: "sub_old" }, "sub_old")).toBeNull();
    expect(deletedSubscriptionUpdate({ plan: "pro", stripe_subscription_id: "sub_live" }, "sub_old")).toBeNull();
    expect(deletedSubscriptionUpdate({ plan: "pro", stripe_subscription_id: null }, "sub_old")).toBeNull();
    expect(deletedSubscriptionUpdate(null, "sub_old")).toBeNull();
    expect(deletedSubscriptionUpdate({ plan: "pro", stripe_subscription_id: "sub_old" }, "sub_old")).toEqual({
      plan: "cancelled",
      stripe_subscription_id: null,
    });
  });

  it("moves a dealer onto Basic the same way day 14 does, and hides the action once they are there", () => {
    const fields = basicChoiceFields();
    expect(fields).toEqual({ billing_model: "basic", taster_choice: "basic" });
    expect(fields).not.toHaveProperty("monthly_sold_limit");
    expect(moveToBasicDecision({ billing_model: "full", stripe_subscription_id: "sub_123" })).toEqual({ already: false, cancelSubscriptionId: "sub_123" });
    expect(moveToBasicDecision({ billing_model: "taster", stripe_subscription_id: null })).toEqual({ already: false, cancelSubscriptionId: null });
    expect(moveToBasicDecision({ billing_model: "basic", stripe_subscription_id: "sub_123" }).already).toBe(true);
    expect(showMoveToBasic("full")).toBe(true);
    expect(showMoveToBasic("basic")).toBe(false);
    expect("Move this dealer to Basic? Nothing is charged.").not.toMatch(/[-–—]/);
  });

  it("shows a free full plan as Free, not a sentence", () => {
    const facts = dealerAdminFacts({ plan: "comp", monthly_sold_limit: 100000 });
    expect(facts.status).toBe("Free");
    expect(facts.plan).toBe("Full");
    expect(facts.usage).toBe("Unlimited sales");
    expect(`${facts.status} ${facts.plan} ${facts.usage}`).not.toMatch(/[-–—]/);
  });
});
