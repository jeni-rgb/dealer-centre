import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Kpi, Pill, money } from "@/components/ui";
import { periodLabel } from "@/lib/statements/compute";

const price = (limit: number) => (limit >= 100000 ? 15000 : limit > 25 ? 10000 : 2500);

/** Money view: MRR, trials ending, failed payments from Stripe, and the monthly commission per centre. */
export default async function Billing() {
  const db = supabaseAdmin();
  const soon = new Date(Date.now() + 14 * 86400000).toISOString();
  const [{ data: dealers }, { data: centres }, { data: commissions }, { data: events }] = await Promise.all([
    db.from("dealers").select("id, name, code, plan, trial_ends_at, monthly_sold_limit, stripe_customer_id").eq("placeholder", false),
    db.from("centres").select("id, name, plan, till, trial_ends_at, stripe_customer_id").neq("status", "unclaimed"),
    db.from("centre_commissions").select("centre_id, period, online_gross_pence, platform_pence, vat_pence, centre_pence, stripe_invoice_item_id, centres(name)").order("period", { ascending: false }).limit(60),
    db.from("webhook_log").select("event_type, payload, created_at").eq("source", "stripe").in("event_type", ["invoice.payment_failed", "customer.subscription.deleted", "invoice.paid"]).order("created_at", { ascending: false }).limit(40),
  ]);
  const payingDealers = (dealers ?? []).filter((d) => d.plan === "pro");
  const payingCentres = (centres ?? []).filter((c) => c.plan === "pro");
  const dealerMrr = payingDealers.reduce((a, d) => a + price(d.monthly_sold_limit), 0);
  const centreMrr = payingCentres.reduce((a, c) => a + (c.till === "ordinary" ? 29900 : 24900), 0);
  const thisMonth = new Date(); thisMonth.setDate(1);
  const commThisMonth = (commissions ?? []).filter((c) => new Date(c.period).getMonth() === thisMonth.getMonth() - 1 || (thisMonth.getMonth() === 0 && new Date(c.period).getMonth() === 11)).reduce((a, c) => a + c.platform_pence, 0);
  const trialsD = (dealers ?? []).filter((d) => d.plan === "trial" && d.trial_ends_at && d.trial_ends_at < soon).sort((a, b) => (a.trial_ends_at! < b.trial_ends_at! ? -1 : 1));
  const trialsC = (centres ?? []).filter((c) => (c.plan === "trial" || c.plan === "comp") && c.trial_ends_at && c.trial_ends_at < soon);
  const noCard = (dealers ?? []).filter((d) => !d.stripe_customer_id && d.plan !== "comp");
  const failed = (events ?? []).filter((e) => e.event_type !== "invoice.paid");
  const custName = (customer: string | undefined) => (dealers ?? []).find((d) => d.stripe_customer_id === customer)?.name ?? (centres ?? []).find((c) => c.stripe_customer_id === customer)?.name ?? customer ?? "?";

  return (
    <>
      <div className="mb-5"><h1 className="text-[24px] font-semibold">Billing</h1><p className="text-[13px] text-ink-muted">All figures ex VAT. Subscriptions are Stripe's truth; this is the summary.</p></div>
      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        <Kpi label="MRR" value={money(dealerMrr + centreMrr)} sub={`${money(dealerMrr)} dealers · ${money(centreMrr)} centres`} />
        <Kpi label="Paying dealers" value={String(payingDealers.length)} sub={`${(dealers ?? []).filter((d) => d.plan === "trial").length} on trial · ${noCard.length} no card`} />
        <Kpi label="Paying centres" value={String(payingCentres.length)} sub={`${(centres ?? []).filter((c) => c.plan === "trial").length} trial · ${(centres ?? []).filter((c) => c.plan === "comp").length} free`} />
        <Kpi label="Commission last month" value={money(commThisMonth)} sub="Our 15% of online sales, on invoices" />
        <Kpi label="Payment problems" value={String(failed.length)} sub="Last 40 Stripe events" tone={failed.length ? "danger" : undefined} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b border-border px-5 py-3"><h2 className="text-[15px] font-semibold">Trials ending in 14 days</h2></div>
          <div className="divide-y divide-border text-[13px]">
            {trialsC.map((c) => <div key={c.id} className="flex items-center justify-between px-5 py-2"><Link href={`/admin/centres/${c.id}`} className="font-medium text-accent">{c.name}</Link><span className="text-ink-muted">centre · {new Date(c.trial_ends_at!).toLocaleDateString("en-GB")}{c.stripe_customer_id ? "" : " · no card"}</span></div>)}
            {trialsD.map((d) => <div key={d.id} className="flex items-center justify-between px-5 py-2"><Link href={`/admin/dealers/${d.id}`} className="font-medium text-accent">{d.name}</Link><span className="text-ink-muted">{new Date(d.trial_ends_at!).toLocaleDateString("en-GB")}{d.stripe_customer_id ? "" : " · no card"}</span></div>)}
            {trialsC.length + trialsD.length === 0 && <p className="px-5 py-6 text-center text-ink-muted">None.</p>}
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="border-b border-border px-5 py-3"><h2 className="text-[15px] font-semibold">Failed payments and cancellations</h2></div>
          <div className="divide-y divide-border text-[13px]">
            {failed.map((e, i) => { const pl = e.payload as { data?: { object?: { customer?: string; amount_due?: number } } }; const obj = pl.data?.object; return <div key={i} className="flex items-center justify-between px-5 py-2"><span><Pill kind="danger">{e.event_type.replace("invoice.", "").replace("customer.subscription.", "subscription ")}</Pill> <span className="font-medium">{custName(obj?.customer)}</span>{obj?.amount_due ? <span className="text-ink-muted"> · {money(obj.amount_due)}</span> : null}</span><span className="text-ink-muted">{new Date(e.created_at).toLocaleDateString("en-GB")}</span></div>; })}
            {failed.length === 0 && <p className="px-5 py-6 text-center text-ink-muted">None.</p>}
          </div>
        </div>
        <div className="card overflow-hidden lg:col-span-2">
          <div className="border-b border-border px-5 py-3"><h2 className="text-[15px] font-semibold">Online commission by centre and month</h2></div>
          <table className="w-full text-[13px]">
            <thead className="text-left text-[11px] text-ink-muted"><tr className="border-b border-border"><th className="px-5 py-2 font-medium">Centre</th><th className="py-2 font-medium">Month</th><th className="py-2 text-right font-medium">Online sales</th><th className="py-2 text-right font-medium">Our 15%</th><th className="py-2 text-right font-medium">VAT</th><th className="py-2 text-right font-medium">Centre 5%</th><th className="px-5 py-2 text-right font-medium">Stripe</th></tr></thead>
            <tbody>
              {(commissions ?? []).map((c, i) => <tr key={i} className="border-b border-border last:border-0"><td className="px-5 py-2"><Link href={`/admin/centres/${c.centre_id}`} className="font-medium text-accent">{(c.centres as unknown as { name: string } | null)?.name}</Link></td><td className="py-2">{periodLabel(c.period)}</td><td className="num py-2 text-right">{money(c.online_gross_pence)}</td><td className="num py-2 text-right">{money(c.platform_pence)}</td><td className="num py-2 text-right text-ink-muted">{money(c.vat_pence)}</td><td className="num py-2 text-right text-ink-muted">{money(c.centre_pence)}</td><td className="px-5 py-2 text-right">{c.stripe_invoice_item_id ? <Pill kind="success">on invoice</Pill> : c.platform_pence ? <Pill kind="warning">not charged</Pill> : <span className="text-ink-muted">nothing</span>}</td></tr>)}
              {(commissions ?? []).length === 0 && <tr><td colSpan={7} className="px-5 py-6 text-center text-ink-muted">No month end has run yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
