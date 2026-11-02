import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Kpi, money } from "@/components/ui";
import { listOnlineOrders, STATUS_LABEL, type OrderStatus } from "@/lib/fulfilment/orders";
import { OrderActions } from "./status";

const TONE: Record<OrderStatus, string> = { new: "pill-warning", collected: "pill-accent", packed: "pill-neutral", posted: "pill-success", missing: "pill-danger" };

/** Shop manager's desk: every online order across every centre, where it is, and what to do next. */
export default async function Orders({ searchParams }: { searchParams: Promise<{ show?: string; centre?: string }> }) {
  const { show, centre } = await searchParams;
  const all = await listOnlineOrders(supabaseAdmin(), { centreId: centre || undefined });
  const orders = show === "all" ? all : all.filter((o) => !["posted", "missing"].includes(o.status));
  const count = (s: OrderStatus) => all.filter((o) => o.status === s).length;
  const byCentre = orders.reduce<Record<string, typeof orders>>((m, o) => { (m[o.centre] ??= []).push(o); return m; }, {});
  const centres = Array.from(new Map(all.map((o) => [o.centre_id, o.centre])).entries());
  const overdue = all.filter((o) => o.status === "new" && Date.now() - new Date(o.sold_at).getTime() > 3 * 86400000).length;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-[24px] font-semibold">Online orders</h1><p className="text-[13px] text-ink-muted">Collected every other day, packed at the unit, posted. Mark each step; Posted with a tracking number tells Shopify and the buyer.</p></div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/orders${show === "all" ? "" : "?show=all"}${centre ? `${show === "all" ? "?" : "&"}centre=${centre}` : ""}`} className="btn-sm-secondary">{show === "all" ? "Open only" : "Show posted too"}</Link>
          <Link href={`/admin/orders/run${centre ? `?centre=${centre}` : ""}`} className="btn-sm" target="_blank">Print run sheet</Link>
        </div>
      </div>
      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
        <Kpi label="To collect" value={String(count("new"))} sub={overdue ? `${overdue} waiting over 3 days` : "Next run"} tone={overdue ? "warning" : undefined} />
        <Kpi label="At the unit" value={String(count("collected") + count("packed"))} sub={`${count("packed")} packed`} />
        <Kpi label="Posted, 60 days" value={String(count("posted"))} />
        <Kpi label="Missing" value={String(count("missing"))} tone={count("missing") ? "danger" : undefined} />
        <Kpi label="Online sales, 60 days" value={money(all.reduce((a, o) => a + o.amount_pence, 0))} />
      </div>
      {centres.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2 text-[13px]">
          <Link href="/admin/orders" className={`pill ${!centre ? "pill-accent" : "pill-neutral"}`}>All centres</Link>
          {centres.map(([id, name]) => <Link key={id} href={`/admin/orders?centre=${id}`} className={`pill ${centre === id ? "pill-accent" : "pill-neutral"}`}>{name}</Link>)}
        </div>
      )}
      {orders.length === 0 && <p className="card p-8 text-center text-[14px] text-ink-muted">Nothing open. Every online order is posted.</p>}
      {Object.entries(byCentre).map(([name, rows]) => (
        <div key={name} className="card mb-5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3"><h2 className="text-[15px] font-semibold">{name}</h2><span className="text-[12px] text-ink-muted">{rows.filter((o) => o.status === "new").length} to collect</span></div>
          {rows.map((o) => (
            <div key={o.sale_id} className="grid gap-3 border-b border-border px-5 py-3 last:border-0 md:grid-cols-[1fr_1fr_auto] md:items-center">
              <div>
                <div className="flex items-center gap-2 text-[14px]"><span className={`pill ${TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span><span className="font-medium">{o.title}</span><span className="num font-semibold">{money(o.amount_pence)}</span></div>
                <div className="mt-0.5 text-[12px] text-ink-muted">{o.ticket && <span className="ticket">{o.ticket}</span>}{o.ticket ? " · " : ""}{o.dealer}{o.dealer_code ? ` (${o.dealer_code})` : ""}{o.pitches.length ? ` · pitch ${o.pitches.join(", ")}` : ""} · sold {new Date(o.sold_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}{o.order_name ? ` · order ${o.order_name}` : ""}</div>
              </div>
              <div className="text-[12px] text-ink-muted">
                {o.buyer || o.address ? <><span className="font-medium text-ink">{o.buyer}</span><br />{o.address}</> : <span>Buyer details arrive with the Shopify order</span>}
                {o.note && <div className="mt-1 italic">Buyer note: {o.note}</div>}
                {o.fulfil_note && <div className="mt-1">{o.fulfil_note}</div>}
              </div>
              <OrderActions saleId={o.sale_id} status={o.status} carrier={o.carrier} tracking={o.tracking} />
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
