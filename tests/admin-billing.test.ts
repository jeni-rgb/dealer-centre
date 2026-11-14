import { describe, expect, it } from "vitest";
import { deletedSubscriptionUpdate } from "@/lib/billing/dealer-trial";
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

  it("shows a free full plan as Free, not a sentence", () => {
    const facts = dealerAdminFacts({ plan: "comp", monthly_sold_limit: 100000 });
    expect(facts.status).toBe("Free");
    expect(facts.plan).toBe("Full");
    expect(facts.usage).toBe("Unlimited sales");
    expect(`${facts.status} ${facts.plan} ${facts.usage}`).not.toMatch(/[-–—]/);
  });
});
