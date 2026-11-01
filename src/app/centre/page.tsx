import { redirect } from "next/navigation";
import Link from "next/link";
import { currentCentre } from "@/lib/centre";
import { supabaseServer } from "@/lib/supabase/server";
import { Kpi, Pill, money } from "@/components/ui";

type Row = { dealer_id: string; name: string; code: string; pitch_numbers: string[]; rent_pence: number; sales_month_pence: number; items_live: number; last_sale_at: string | null };

export default async function CentreHome({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const { centre: cp } = await searchParams;
  const centre = await currentCentre(cp);
  if (!centre) redirect("/signup/centre");
  const sb = await supabaseServer();
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const [{ data: rows }, { data: sales }, { data: channel }, { data: pending }] = await Promise.all([
    sb.rpc("centre_dealer_table", { p_centre_id: centre.id }),
    sb.from("sales").select("amount_pence, payment_type, dealer_id, channels:channel_id(type)").eq("centre_id", centre.id).is("voided_at", null).gte("sold_at", monthStart.toISOString()),
    sb.from("channels_public").select("id, status").eq("owner_type", "centre").eq("owner_id", centre.id).eq("type", "square").maybeSingle(),
    sb.from("dealer_centres").select("id").eq("centre_id", centre.id).eq("status", "pending"),
  ]);
  const list = (rows ?? []) as Row[];
  const total = (sales ?? []).reduce((a, s) => a + s.amount_pence, 0);
  const online = (sales ?? []).filter((s) => (s.channels as unknown as { type: string })?.type !== "square").reduce((a, s) => a + s.amount_pence, 0);
  const card = (sales ?? []).filter((s) => s.payment_type && s.payment_type !== "CASH").reduce((a, s) => a + s.amount_pence, 0);
  const unmatched = (sales ?? []).filter((s) => !s.dealer_id).length;
  const stale = (r: Row) => !r.last_sale_at || Date.now() - new Date(r.last_sale_at).getTime() > 30 * 86400000;
  const maxSales = Math.max(1, ...list.map((r) => Number(r.sales_month_pence)));

  return (
    <>
      <div className="mb-6 flex items-baseline justify-between">
        <div><h1 className="text-[24px] font-semibold">{centre.name}</h1><p className="text-[13px] text-ink-muted">Centre code <span className="ticket">{centre.invite_code}</span> · {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p></div>
        {(pending ?? []).length > 0 && <Link href={`/centre/mapping?centre=${centre.id}`} className="btn-sm">{(pending ?? []).length} dealer{(pending ?? []).length > 1 ? "s" : ""} to approve</Link>}
      </div>
      {!channel && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-border bg-white px-4 py-3 text-[14px]"><span>No Square till connected. Record floor sales from the collected tickets in <Link className="font-semibold text-accent" href={`/centre/eod?centre=${centre.id}`}>End of day</Link>.</span><a className="text-[13px] text-ink-muted underline" href={`/api/oauth/square?owner=centre&id=${centre.id}`}>Connect Square instead</a></div>
      )}
      <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Kpi label="Month to date" value={money(total)} sub={`${money(online)} online`} />
        <Kpi label="Dealers" value={String(list.length)} sub={`${list.filter(stale).length} with no sale in 30 days`} tone={list.filter(stale).length ? "warning" : undefined} />
        <Kpi label="Card share" value={total ? `${Math.round((card / total) * 100)}%` : "–"} />
        <Kpi label="Unmatched sales" value={String(unmatched)} sub={unmatched ? "Till sales with no dealer" : "All sales assigned"} tone={unmatched ? "danger" : undefined} />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="text-[16px] font-semibold">Dealers ranked</h2><a className="text-[13px] font-medium text-accent" href={`/api/admin/export?centre=${centre.id}`}>Export CSV</a></div>
        <table className="w-full text-[14px]">
          <thead className="text-left text-[12px] text-ink-muted"><tr className="border-b border-border"><th className="px-5 py-2 font-medium">Dealer</th><th className="py-2 font-medium">Pitches</th><th className="py-2 font-medium">Sales this month</th><th className="py-2 text-right font-medium">Rent</th><th className="py-2 text-right font-medium">Sales ÷ rent</th><th className="py-2 text-right font-medium">Live</th><th className="px-5 py-2 text-right font-medium">Last sale</th></tr></thead>
          <tbody>
            {list.map((r) => {
              const s = Number(r.sales_month_pence);
              const ratio = r.rent_pence ? s / r.rent_pence : null;
              return (
                <tr key={r.dealer_id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3"><span className="font-medium">{r.name}</span> <span className="ticket text-[12px] text-ink-muted">{r.code}</span></td>
                  <td className="py-3 text-ink-muted">{r.pitch_numbers.join(", ")}</td>
                  <td className="py-3"><div className="flex items-center gap-3"><div className="h-2 w-40 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${(s / maxSales) * 100}%` }} /></div><span className="num font-semibold">{money(s)}</span></div></td>
                  <td className="num py-3 text-right text-ink-muted">{money(r.rent_pence)}</td>
                  <td className="py-3 text-right">{ratio === null ? <span className="text-ink-muted">–</span> : ratio < 1 ? <Pill kind="danger">{ratio.toFixed(1)}x</Pill> : <span className="num">{ratio.toFixed(1)}x</span>}</td>
                  <td className="num py-3 text-right">{r.items_live}</td>
                  <td className="px-5 py-3 text-right">{stale(r) ? <Pill kind="warning">{r.last_sale_at ? new Date(r.last_sale_at).toLocaleDateString("en-GB") : "Never"}</Pill> : <span className="text-ink-muted">{new Date(r.last_sale_at!).toLocaleDateString("en-GB")}</span>}</td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-ink-muted">No dealers yet. Give them your centre code <span className="ticket">{centre.invite_code}</span>, or tell them to search for {centre.name} when they sign up. Approve them on the Mapping page.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
