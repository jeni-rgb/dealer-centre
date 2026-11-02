import Link from "next/link";
import { requireDealer } from "@/lib/auth";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { DealerNav, Phone, money } from "@/components/ui";
import { computeStatement, periodKey, periodLabel, type Statement } from "@/lib/statements/compute";
import { displaySku } from "@/lib/sku";

/**
 * Dealer earnings: this month and every past month, per centre, sale by sale, with what the centre has paid.
 * Uses the same calculation as the centre's statement page and the PDF, so the numbers always agree.
 */
export default async function Earnings({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const me = await requireDealer();
  const { m } = await searchParams;
  const now = new Date();
  const thisPeriod = periodKey(now);
  const period = m && /^\d{4}-\d{2}$/.test(m) ? `${m}-01` : thisPeriod;
  const [y, mo] = period.split("-").map(Number);
  const prev = periodKey(new Date(y, mo - 2, 1)), next = periodKey(new Date(y, mo, 1));
  const sb = await supabaseServer();
  const db = supabaseAdmin();

  const { data: links } = await sb.from("dealer_centres").select("centre_id, joined_at, left_at, centres(name)").eq("dealer_id", me.dealer_id).neq("status", "pending");
  const { data: dealer } = await sb.from("dealers").select("created_at").eq("id", me.dealer_id).single();
  const statements = (await Promise.all((links ?? []).map((l) => computeStatement(db, me.dealer_id, l.centre_id, period)))).filter(Boolean) as Statement[];

  // Sales that are not centre sales: own Shopify, "sold elsewhere". No commission, nothing owed by a centre.
  const start = new Date(y, mo - 1, 1), end = new Date(y, mo, 1);
  const { data: ownSales } = await sb.from("sales").select("id, sold_at, amount_pence, ticket_no, items(title), channels:channel_id(type, owner_type)")
    .eq("dealer_id", me.dealer_id).is("centre_id", null).is("voided_at", null).gte("sold_at", start.toISOString()).lt("sold_at", end.toISOString()).order("sold_at", { ascending: true });
  const own = ownSales ?? [];
  const ownGross = own.reduce((a, s) => a + s.amount_pence, 0);

  const net = statements.reduce((a, s) => a + s.net_pence, 0);
  const gross = statements.reduce((a, s) => a + s.gross_pence, 0) + ownGross;
  const paid = statements.filter((s) => s.paid_at).reduce((a, s) => a + s.net_pence, 0);
  const owed = net - paid;
  const earliest = dealer?.created_at ? periodKey(new Date(dealer.created_at)) : thisPeriod;
  const running = period === thisPeriod;

  return (
    <Phone>
      <header className="header-dark flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <Link href={`/app/statements?m=${prev.slice(0, 7)}`} className={`text-[13px] text-header-muted ${prev < earliest ? "invisible" : ""}`}>‹ {periodLabel(prev).split(" ")[0]}</Link>
          <div className="flex flex-col items-center gap-0.5"><span className="text-[12px] text-header-muted">{running ? "This month, running" : "Statement"}</span><span className="text-[20px] font-semibold">{periodLabel(period)}</span></div>
          <Link href={`/app/statements?m=${next.slice(0, 7)}`} className={`text-[13px] text-header-muted ${running ? "invisible" : ""}`}>{periodLabel(next).split(" ")[0]} ›</Link>
        </div>
        <div className="flex flex-col gap-1.5"><span className="text-[13px] text-header-muted">{running ? "Owed to you so far" : owed > 0 ? "Still owed to you" : "Paid to you"}</span><span className={`num text-[44px] font-bold leading-[48px] tracking-[-0.03em] ${net < 0 ? "text-[#FCA5A5]" : ""}`}>{money(running ? net : owed > 0 ? owed : paid)}</span></div>
        <div className="grid grid-cols-3 gap-2">
          <div className="header-stat"><span className="num text-[16px] font-semibold">{money(gross)}</span><span className="text-[11px] text-header-muted">Sold</span></div>
          <div className="header-stat"><span className="num text-[16px] font-semibold">{money(statements.reduce((a, s) => a + s.commission_pence, 0))}</span><span className="text-[11px] text-header-muted">Commission</span></div>
          <div className="header-stat"><span className="num text-[16px] font-semibold">{money(statements.reduce((a, s) => a + s.rent_pence, 0))}</span><span className="text-[11px] text-header-muted">Rent</span></div>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-5 pt-5">
        {statements.length === 0 && own.length === 0 && <p className="card p-4 text-[14px] text-ink-muted">Nothing sold in {periodLabel(period)}.</p>}
        {statements.map((st) => (
          <section key={st.centre.id} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[16px] font-semibold">{st.centre.name}</h2>
              <span className={`pill ${st.status === "paid" ? "pill-success" : st.status === "issued" ? "pill-warning" : "pill-neutral"}`}>{st.status === "paid" ? `Paid ${new Date(st.paid_at!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : st.status === "issued" ? "Awaiting payment" : "Running"}</span>
            </div>
            <div className="card divide-y divide-border">
              {st.lines.length === 0 && <p className="px-4 py-4 text-[13px] text-ink-muted">No sales at this centre.</p>}
              {st.lines.map((l) => (
                <div key={l.sale_id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                  <span className="w-[42px] shrink-0 text-ink-muted">{new Date(l.sold_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  <span className="flex min-w-0 flex-1 flex-col"><span className="truncate font-medium">{l.title}</span><span className="text-[11px] text-ink-muted">{l.ticket ? <span className="ticket">{l.ticket}</span> : null}{l.ticket ? " · " : ""}{l.channel === "online" ? "Online" : "Floor"}{l.commission_pence ? ` · −${money(l.commission_pence)}` : ""}</span></span>
                  <span className="flex shrink-0 flex-col items-end"><span className="num font-semibold">{money(l.net_pence)}</span><span className="num text-[11px] text-ink-muted">{money(l.price_pence)}</span></span>
                </div>
              ))}
            </div>
            <div className="card divide-y divide-border text-[13px]">
              {([
                ["Floor sales", st.floor_gross_pence], ["Online sales", st.online_gross_pence],
                [`Floor commission ${st.centre.commission_bps / 100}%`, -st.floor_commission_pence], [`Online commission ${st.centre.online_commission_bps / 100}% and postage`, -st.online_commission_pence],
                [`Rent · ${st.rent_note}`, -st.rent_pence],
              ] as [string, number][]).map(([k, v]) => (
                <div key={k} className="flex h-[40px] items-center justify-between px-4"><span className="text-ink-muted">{k}</span><span className={`num ${v < 0 ? "text-ink-muted" : "font-medium"}`}>{v < 0 ? `−${money(-v)}` : money(v)}</span></div>
              ))}
              <div className="flex h-[48px] items-center justify-between px-4 text-[15px] font-semibold"><span>Net owed to you</span><span className="num">{money(st.net_pence)}</span></div>
            </div>
            <a href={`/api/statements/pdf?centre=${st.centre.id}&period=${st.period}`} target="_blank" rel="noreferrer" className="btn-outline">Download statement PDF</a>
          </section>
        ))}

        {own.length > 0 && (
          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between"><h2 className="text-[16px] font-semibold">Your own sales</h2><span className="text-[12px] text-ink-muted">No commission, paid straight to you</span></div>
            <div className="card divide-y divide-border">
              {own.map((s) => {
                const ch = s.channels as unknown as { type: string } | null;
                return (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                    <span className="w-[42px] shrink-0 text-ink-muted">{new Date(s.sold_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                    <span className="flex min-w-0 flex-1 flex-col"><span className="truncate font-medium">{(s.items as unknown as { title: string } | null)?.title ?? "Item"}</span><span className="text-[11px] text-ink-muted">{s.ticket_no ? <span className="ticket">{displaySku(s.ticket_no)}</span> : null}{s.ticket_no ? " · " : ""}{ch?.type === "shopify" ? "Your Shopify" : "Sold elsewhere"}</span></span>
                    <span className="num shrink-0 font-semibold">{money(s.amount_pence)}</span>
                  </div>
                );
              })}
              <div className="flex h-[44px] items-center justify-between px-4 text-[14px] font-semibold"><span>Total</span><span className="num">{money(ownGross)}</span></div>
            </div>
          </section>
        )}

        <p className="pb-2 text-[12px] text-ink-muted">Statements are issued on the 1st for the month before. The centre pays you and marks it paid; it shows here the moment they do.</p>
      </div>
      <DealerNav active="statement" />
    </Phone>
  );
}
