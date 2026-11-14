/** Admin only status labels. Dealer facing copy stays elsewhere. */

export type AdminStatus = "Active" | "Trial" | "Free" | "Cancelled" | "Past due" | "No card" | "Unclaimed";

export type DealerAdminFacts = {
  plan: string;
  placeholder?: boolean | null;
  billing_model?: string | null;
  trial_ends_at?: string | null;
  taster_accepted_at?: string | null;
  taster_ends_at?: string | null;
  monthly_sold_limit?: number | null;
  stripe_customer_id?: string | null;
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });

export function dealerAdminFacts(d: DealerAdminFacts): { status: AdminStatus; plan: string; usage: string } {
  const tasterOn = !!d.taster_accepted_at && !!d.taster_ends_at && new Date(d.taster_ends_at).getTime() > Date.now();
  if (d.placeholder) return { status: "Free", plan: "Basic", usage: "Not signed in" };
  if (d.plan === "comp") return { status: "Free", plan: "Full", usage: "Unlimited sales" };
  if (d.plan === "lapsed") return { status: "Past due", plan: "Full", usage: "Payment failed" };
  if (d.plan === "cancelled") return { status: "Cancelled", plan: "Full", usage: "Subscription ended" };
  if (d.billing_model === "basic") return { status: "Free", plan: "Basic", usage: "Totals only" };
  if (tasterOn) return { status: "Trial", plan: "Full", usage: `Taster until ${day(d.taster_ends_at!)}` };
  if (d.billing_model === "full" || d.plan === "pro") {
    const limited = (d.monthly_sold_limit ?? 25) < 100000;
    return { status: "Active", plan: d.billing_model === "full" || !limited ? "Full" : "Legacy", usage: limited ? `${d.monthly_sold_limit} sales a month` : "Unlimited sales" };
  }
  if (d.plan === "trial") return { status: "Trial", plan: "Full", usage: d.trial_ends_at ? `Trial until ${day(d.trial_ends_at)}` : "Trial open" };
  if (!d.stripe_customer_id) return { status: "No card", plan: "Full", usage: "No subscription" };
  return { status: "Active", plan: d.plan, usage: "Unlimited sales" };
}

export function centreAdminStatus(c: { status: string; plan: string; stripe_customer_id?: string | null }): AdminStatus {
  if (c.status === "unclaimed") return "Unclaimed";
  if (c.plan === "pro") return "Active";
  if (c.plan === "comp") return "Free";
  if (c.plan === "cancelled") return "Cancelled";
  if (c.plan === "lapsed") return "Past due";
  if (c.plan === "trial") return "Trial";
  if (!c.stripe_customer_id) return "No card";
  return "Active";
}
