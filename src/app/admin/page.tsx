import { supabaseAdmin } from "@/lib/supabase/server";
import { Kpi, Pill, money } from "@/components/ui";


export default async function Admin() {
  const db = supabaseAdmin();
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const [{ data: centres }, { data: dealers }, { data: sales }, { data: channels }] = await Promise.all([
    db.from("centres").select("id, name, invite_code, status, created_at, plan, stripe_customer_id"),
    db.from("dealers").select("id, name, code, plan, trial_ends_at, created_at, monthly_sold_limit"),
    db.from("sales").select("dealer_id, centre_id, amount_pence").is("voided_at", null).gte("sold_at", monthStart.toISOString()),
    db.from("channels").select("owner_type, owner_id, type, status, last_webhook_at"),
  ]);
  const byDealer = new Map<string, number>();
  const byCentre = new Map<string, number>();
  for (const s of sales ?? []) {
    if (s.dealer_id) byDealer.set(s.dealer_id, (byDealer.get(s.dealer_id) ?? 0) + s.amount_pence);
    if (s.centre_id) byCentre.set(s.centre_id, (byCentre.get(s.centre_id) ?? 0) + s.amount_pence);
  }
  const paying = (dealers ?? []).filter((d) => d.plan === "pro").length;
  const trial = (dealers ?? []).filter((d) => d.plan === "trial").length;
  const priceFor = (limit: number) => (limit > 50 ? 15000 : limit > 25 ? 10000 : 2500);
  const dealerMrr = (dealers ?? []).filter((d) => d.plan === "pro").reduce((a, d) => a + priceFor(d.monthly_sold_limit ?? 25), 0);
  const centreMrr = (centres ?? []).filter((c) => c.plan === "pro").length * 29900;
  const mrr = dealerMrr + centreMrr;

  return (
    <>
      <div className="mb-6 flex items-center justify-between"><h1 className="text-[24px] font-semibold">Centres and dealers</h1><a href="/admin/onboard" className="btn-sm">Onboard a centre</a></div>
      <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Kpi label="Centres" value={String((centres ?? []).length)} />
        <Kpi label="Paying dealers" value={String(paying)} />
        <Kpi label="On trial" value={String(trial)} />
        <Kpi label="MRR" value={money(mrr)} sub={`${money(dealerMrr)} dealers · ${money(centreMrr)} centres`} />
      </div>

      <div className="card mb-8 overflow-hidden"><div className="border-b border-border px-5 py-4"><h2 className="text-[16px] font-semibold">Centres</h2></div>
      <table className="w-full text-[14px]">
        <thead className="text-left text-[12px] text-ink-muted"><tr className="border-b border-border"><th className="px-5 py-2 font-medium">Name</th><th className="py-2 font-medium">Code</th><th className="py-2 font-medium">Plan</th><th className="py-2 font-medium">Square</th><th className="py-2 text-right font-medium">Sales MTD</th><th className="py-2 text-right font-medium">Export</th></tr></thead>
        <tbody>
          {(centres ?? []).map((c) => {
            const ch = (channels ?? []).find((x) => x.owner_type === "centre" && x.owner_id === c.id && x.type === "square");
            return (
              <tr key={c.id} className="border-b border-border">
                <td className="px-5 py-2"><a className="font-medium text-accent" href={`/centre?centre=${c.id}`}>{c.name}</a></td>
                <td className="ticket py-2 text-[12px]">{c.invite_code}</td>
                <td className="py-2 text-xs">{c.status === "unclaimed" ? <Pill kind="neutral">Added by dealers</Pill> : c.plan === "pro" ? <Pill kind="success">Paying</Pill> : c.plan === "comp" ? <Pill kind="accent">Free</Pill> : c.stripe_customer_id ? <Pill kind="warning">Trial</Pill> : <Pill kind="danger">No card</Pill>}</td>
                <td className="py-2 text-xs">{ch ? `${ch.status}${ch.last_webhook_at ? `, ${new Date(ch.last_webhook_at).toLocaleString("en-GB")}` : ""}` : <Pill kind="danger">Not connected</Pill>}</td>
                <td className="num py-2 text-right">{money(byCentre.get(c.id) ?? 0)}</td>
                <td className="py-2 text-right"><a className="text-xs underline" href={`/api/admin/export?centre=${c.id}`}>CSV</a></td>
              </tr>
            );
          })}
        </tbody>
      </table></div>

      <div className="card overflow-hidden"><div className="border-b border-border px-5 py-4"><h2 className="text-[16px] font-semibold">Dealers</h2></div>
      <table className="w-full text-[14px]">
        <thead className="text-left text-[12px] text-ink-muted"><tr className="border-b border-border"><th className="px-5 py-2 font-medium">Name</th><th className="py-2 font-medium">Code</th><th className="py-2 font-medium">Plan</th><th className="py-2 font-medium">Shopify</th><th className="py-2 text-right font-medium">Sales MTD</th><th className="py-2 text-right font-medium">Joined</th></tr></thead>
        <tbody>
          {(dealers ?? []).map((d) => {
            const sh = (channels ?? []).find((x) => x.owner_type === "dealer" && x.owner_id === d.id && x.type === "shopify");
            return (
              <tr key={d.id} className="border-b border-border">
                <td className="px-5 py-2 font-medium">{d.name}</td>
                <td className="ticket py-2 text-[12px]">{d.code}</td>
                <td className="py-2">{d.plan}{d.plan === "trial" && d.trial_ends_at ? ` to ${new Date(d.trial_ends_at).toLocaleDateString("en-GB")}` : ""}</td>
                <td className="py-2 text-xs">{sh ? sh.status : "–"}</td>
                <td className="num py-2 text-right">{money(byDealer.get(d.id) ?? 0)}</td>
                <td className="py-2 text-right text-xs text-ink-3">{new Date(d.created_at).toLocaleDateString("en-GB")}</td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </>
  );
}
