import Link from "next/link";
import { redirect } from "next/navigation";
import { currentCentre } from "@/lib/centre";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { Kpi, Pill, money } from "@/components/ui";
import { computeStatement, periodKey, periodLabel, type Statement } from "@/lib/statements/compute";
import { PaidToggle } from "./paid";

/** Every dealer's statement for a month: the same calculation and the same PDF the dealer sees. */
export default async function CentreStatements({ searchParams }: { searchParams: Promise<{ centre?: string; m?: string; dealer?: string }> }) {
  const { centre: cp, m, dealer: dealerParam } = await searchParams;
  const centre = await currentCentre(cp);
  if (!centre) redirect("/signup/centre");
  const thisPeriod = periodKey(new Date());
  const period = m && /^\d{4}-\d{2}$/.test(m) ? `${m}-01` : thisPeriod;
  const [y, mo] = period.split("-").map(Number);
  const prev = periodKey(new Date(y, mo - 2, 1)), next = periodKey(new Date(y, mo, 1));
  const q = `centre=${centre.id}`;
  const sb = await supabaseServer();
  const db = supabaseAdmin();
  const start = new Date(y, mo - 1, 1);
  const { data: links } = await sb.from("dealer_centres").select("dealer_id, dealers(name, code)").eq("centre_id", centre.id).neq("status", "pending").or(`left_at.is.null,left_at.gte.${start.toISOString()}`);
  const statements = (await Promise.all((links ?? []).map((l) => computeStatement(db, l.dealer_id, centre.id, period)))).filter(Boolean) as Statement[];
  statements.sort((a, b) => b.net_pence - a.net_pence);
  // What the centre keeps: floor commission plus its share (5%) of online sales. Dealer Centre's 15% is charged separately.
  const totals = statements.reduce((t, s) => ({ gross: t.gross + s.gross_pence, commission: t.commission + s.floor_commission_pence + Math.round((s.online_gross_pence * centre.centre_online_share_bps) / 10000), rent: t.rent + s.rent_pence, net: t.net + s.net_pence, paid: t.paid + (s.paid_at ? s.net_pence : 0) }), { gross: 0, commission: 0, rent: 0, net: 0, paid: 0 });
  const detail = dealerParam ? statements.find((s) => s.dealer.id === dealerParam) : null;
  const running = period === thisPeriod;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold">Statements</h1>
          <p className="text-[13px] text-ink-muted">{running ? "Running month. Statements are issued on the 1st." : "Issued statements. Pay each dealer what Net shows and press Mark paid; it shows on their phone straight away."}</p>
        </div>
        <div className="flex items-center gap-2 text-[14px]">
          <Link href={`/centre/statements?${q}&m=${prev.slice(0, 7)}`} className="btn-sm-secondary">‹ {periodLabel(prev)}</Link>
          <span className="font-semibold">{periodLabel(period)}</span>
          {!running && <Link href={`/centre/statements?${q}&m=${next.slice(0, 7)}`} className="btn-sm-secondary">{periodLabel(next)} ›</Link>}
        </div>
      </div>
      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
        <Kpi label="Sales" value={money(totals.gross)} />
        <Kpi label="Commission you keep" value={money(totals.commission)} sub={`Floor commission and your ${centre.centre_online_share_bps / 100}% of online`} />
        <Kpi label="Rent" value={money(totals.rent)} />
        <Kpi label="Owed to dealers" value={money(totals.net)} sub={running ? "So far" : `${money(totals.paid)} paid`} tone={!running && totals.net - totals.paid > 0 ? "warning" : undefined} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead><tr className="border-b border-border text-left text-[12px] text-ink-muted"><th className="px-4 py-2.5 font-semibold">Dealer</th><th className="py-2.5 text-right font-semibold">Sales</th><th className="py-2.5 text-right font-semibold">Commission</th><th className="py-2.5 text-right font-semibold">Rent</th><th className="py-2.5 text-right font-semibold">Net</th><th className="px-4 py-2.5 text-right font-semibold">Paid</th></tr></thead>
          <tbody>
            {statements.map((s) => (
              <tr key={s.dealer.id} className={`border-b border-border last:border-0 ${detail?.dealer.id === s.dealer.id ? "bg-surface-2" : ""}`}>
                <td className="px-4 py-2.5"><Link href={`/centre/statements?${q}&m=${period.slice(0, 7)}&dealer=${s.dealer.id}`} className="font-medium text-accent">{s.dealer.name}</Link> <span className="ticket text-ink-muted">{s.dealer.code}</span> <span className="text-ink-muted">· {s.sales_count} sold</span></td>
                <td className="num py-2.5 text-right">{money(s.gross_pence)}</td>
                <td className="num py-2.5 text-right text-ink-muted">{money(s.commission_pence)}</td>
                <td className="num py-2.5 text-right text-ink-muted">{money(s.rent_pence)}</td>
                <td className={`num py-2.5 text-right font-semibold ${s.net_pence < 0 ? "text-danger" : ""}`}>{money(s.net_pence)}</td>
                <td className="px-4 py-2 text-right">{running ? <Pill kind="neutral">Running</Pill> : <PaidToggle centreId={centre.id} dealerId={s.dealer.id} period={period} paid={!!s.paid_at} />}</td>
              </tr>
            ))}
            {statements.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-muted">No dealers at the centre in {periodLabel(period)}.</td></tr>}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="card mt-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div><h2 className="text-[16px] font-semibold">{detail.dealer.name} <span className="ticket text-ink-muted">{detail.dealer.code}</span></h2><p className="text-[12px] text-ink-muted">{periodLabel(period)} · {detail.rent_note}</p></div>
            <a href={`/api/statements/pdf?centre=${centre.id}&dealer=${detail.dealer.id}&period=${period}`} target="_blank" rel="noreferrer" className="btn-sm-secondary">Statement PDF</a>
          </div>
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-border text-left text-[12px] text-ink-muted"><th className="px-5 py-2 font-semibold">Date</th><th className="py-2 font-semibold">Item</th><th className="py-2 font-semibold">Ticket</th><th className="py-2 font-semibold">Where</th><th className="py-2 text-right font-semibold">Price</th><th className="py-2 text-right font-semibold">Commission</th><th className="px-5 py-2 text-right font-semibold">Net</th></tr></thead>
            <tbody>
              {detail.lines.map((l) => (
                <tr key={l.sale_id} className="border-b border-border last:border-0">
                  <td className="px-5 py-2 text-ink-muted">{new Date(l.sold_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td><td className="py-2">{l.title}</td><td className="ticket py-2">{l.ticket ?? ""}</td><td className="py-2 text-ink-muted">{l.channel === "online" ? "Online" : `Floor${l.payment ? `, ${l.payment.toLowerCase()}` : ""}`}</td>
                  <td className="num py-2 text-right">{money(l.price_pence)}</td><td className="num py-2 text-right text-ink-muted">−{money(l.commission_pence)}</td><td className="num px-5 py-2 text-right font-semibold">{money(l.net_pence)}</td>
                </tr>
              ))}
              {detail.lines.length === 0 && <tr><td colSpan={7} className="px-5 py-6 text-center text-ink-muted">No sales.</td></tr>}
            </tbody>
            <tfoot className="text-[13px]">
              {([["Gross", detail.gross_pence], [`Floor commission ${detail.centre.commission_bps / 100}%`, -detail.floor_commission_pence], [`Online commission ${detail.centre.online_commission_bps / 100}% and postage`, -detail.online_commission_pence], ["Rent", -detail.rent_pence]] as [string, number][]).map(([k, v]) => (
                <tr key={k} className="border-t border-border"><td colSpan={6} className="px-5 py-2 text-right text-ink-muted">{k}</td><td className="num px-5 py-2 text-right">{v < 0 ? `−${money(-v)}` : money(v)}</td></tr>
              ))}
              <tr className="border-t border-border font-semibold"><td colSpan={6} className="px-5 py-3 text-right">Net owed to {detail.dealer.name}</td><td className="num px-5 py-3 text-right text-[15px]">{money(detail.net_pence)}</td></tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
