import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Kpi, money } from "@/components/ui";
import { centreAdminStatus, dealerAdminFacts } from "@/lib/admin/status";
import { PageHeader } from "./ui";
import { CentresTable, DealersTable } from "./directory";

export default async function Admin() {
  const db = supabaseAdmin();
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const [{ data: centres }, { data: dealers }, { data: sales }, { data: channels }] = await Promise.all([
    db.from("centres").select("id, name, invite_code, status, created_at, plan, stripe_customer_id, till"),
    db.from("dealers").select("id, name, code, plan, placeholder, billing_model, trial_ends_at, taster_accepted_at, taster_ends_at, created_at, monthly_sold_limit, stripe_customer_id"),
    db.from("sales").select("dealer_id, centre_id, amount_pence").is("voided_at", null).gte("sold_at", monthStart.toISOString()),
    db.from("channels").select("owner_type, owner_id, type, status, last_webhook_at"),
  ]);
  const byDealer = new Map<string, number>();
  const byCentre = new Map<string, number>();
  for (const s of sales ?? []) {
    if (s.dealer_id) byDealer.set(s.dealer_id, (byDealer.get(s.dealer_id) ?? 0) + s.amount_pence);
    if (s.centre_id) byCentre.set(s.centre_id, (byCentre.get(s.centre_id) ?? 0) + s.amount_pence);
  }
  const paying = (dealers ?? []).filter((d) => d.plan === "pro" || d.billing_model === "full").length;
  const trial = (dealers ?? []).filter((d) => dealerAdminFacts(d).status === "Trial").length;
  const priceFor = (limit: number) => (limit >= 100000 ? 15000 : limit > 25 ? 10000 : 2500);
  const dealerMrr = (dealers ?? []).filter((d) => d.plan === "pro" && d.billing_model !== "basic").reduce((a, d) => a + priceFor(d.monthly_sold_limit ?? 25), 0);
  const centreMrr = (centres ?? []).filter((c) => c.plan === "pro").reduce((a, c) => a + ((c as { till?: string }).till === "ordinary" ? 29900 : 24900), 0);

  const centreRows = (centres ?? []).map((c) => {
    const ch = (channels ?? []).find((x) => x.owner_type === "centre" && x.owner_id === c.id && x.type === "square");
    const status = centreAdminStatus(c);
    return { id: c.id, href: `/admin/centres/${c.id}`, name: c.name, code: c.invite_code, status, square: ch ? ch.status : "Not connected", sales: byCentre.get(c.id) ?? 0 };
  });
  const dealerRows = (dealers ?? []).map((d) => {
    const facts = dealerAdminFacts(d);
    const sh = (channels ?? []).find((x) => x.owner_type === "dealer" && x.owner_id === d.id && x.type === "shopify");
    return { id: d.id, href: `/admin/dealers/${d.id}`, name: d.name, code: d.code, status: facts.status, plan: facts.plan, usage: facts.usage, shopify: sh ? sh.status : "Not connected", sales: byDealer.get(d.id) ?? 0, joined: new Date(d.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) };
  });
  return (
    <>
      <PageHeader title="Centres and dealers" subtitle="Every centre and dealer account, with plan, status and sales this month.">
        <Link href="/admin/onboard" className="btn-sm">Onboard a centre</Link>
      </PageHeader>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Centres" value={String((centres ?? []).length)} />
        <Kpi label="Active dealers" value={String(paying)} />
        <Kpi label="Trial" value={String(trial)} />
        <Kpi label="MRR" value={money(dealerMrr + centreMrr)} sub={`Dealers ${money(dealerMrr)}. Centres ${money(centreMrr)}.`} />
      </div>

      <section className="card mb-8 overflow-hidden">
        <div className="border-b border-border px-4 py-3"><h2 className="text-[15px] font-semibold">Centres</h2></div>
        <CentresTable rows={centreRows} />
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-border px-4 py-3"><h2 className="text-[15px] font-semibold">Dealers</h2></div>
        <DealersTable rows={dealerRows} />
      </section>
    </>
  );
}
