"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/components/ui";
import { STATUS_LABEL, type OnlineOrder, type OrderStatus } from "@/lib/fulfilment/orders";

const TONE: Record<OrderStatus, string> = { new: "pill-warning", collected: "pill-accent", at_unit: "pill-neutral", despatched: "pill-success", missing: "pill-danger", refunded: "pill-danger" };
type Tab = "collect" | "unit" | "done" | "all";

/** The desk: tick orders, act on them together. Run sheets for the runner, packing slips for the bench, statuses as things move. */
export function OrdersDesk({ orders, centreFilter }: { orders: OnlineOrder[]; centreFilter: string | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("collect");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tracking, setTracking] = useState<{ carrier: string; tracking: string } | null>(null);

  const shown = useMemo(() => orders.filter((o) =>
    tab === "collect" ? o.status === "new" || o.status === "missing" : tab === "unit" ? o.status === "collected" || o.status === "at_unit" : tab === "done" ? o.status === "despatched" || o.status === "refunded" : true), [orders, tab]);
  const byCentre = useMemo(() => shown.reduce<Record<string, OnlineOrder[]>>((m, o) => { (m[o.centre] ??= []).push(o); return m; }, {}), [shown]);
  const ids = Array.from(sel).filter((id) => shown.some((o) => o.sale_id === id));
  const allShown = shown.length > 0 && shown.every((o) => sel.has(o.sale_id));
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSel(allShown ? new Set() : new Set(shown.map((o) => o.sale_id)));

  async function act(status: OrderStatus, extra: Record<string, string> = {}) {
    if (ids.length === 0) return;
    setBusy(true);
    const r = await fetch("/api/admin/orders", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ sale_ids: ids, status, ...extra }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false); setTracking(null);
    if (!r.ok) { setMsg(j.error ?? "Could not save"); return; }
    setMsg(status === "despatched" ? `${j.updated} marked despatched${j.shopifyFailed ? `, ${j.shopifyFailed} not accepted by Shopify, email those buyers the tracking` : j.shopifyOk ? ", buyers emailed by Shopify" : ""}.` : `${j.updated} marked ${STATUS_LABEL[status].toLowerCase()}.`);
    setSel(new Set()); router.refresh();
  }
  const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length;
  const tabs: [Tab, string, number][] = [["collect", "To collect", count("new") + count("missing")], ["unit", "At the unit", count("collected") + count("at_unit")], ["done", "Despatched", count("despatched") + count("refunded")], ["all", "All", orders.length]];
  const q = centreFilter ? `&centre=${centreFilter}` : "";

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {tabs.map(([k, l, n]) => <button key={k} onClick={() => { setTab(k); setSel(new Set()); }} className={`pill ${tab === k ? "pill-accent" : "pill-neutral"}`}>{l} · {n}</button>)}
      </div>

      {/* action bar */}
      <div className="card mb-4 flex flex-wrap items-center gap-2 px-4 py-3 text-[13px]">
        <label className="flex items-center gap-2"><input type="checkbox" checked={allShown} onChange={toggleAll} /> <span className="font-medium">{ids.length ? `${ids.length} selected` : "Select all"}</span></label>
        <span className="mx-1 h-5 w-px bg-border" />
        {tab === "collect" && <>
          <a className="btn-sm" href={`/admin/orders/run?${ids.length ? `ids=${ids.join(",")}` : `all=1${q}`}`} target="_blank">Print run sheet{ids.length ? "" : " (all to collect)"}</a>
          <button className="btn-sm-secondary" disabled={busy || !ids.length} onClick={() => act("collected")}>Mark collected</button>
          <button className="text-[13px] font-medium text-danger disabled:opacity-40" disabled={busy || !ids.length} onClick={() => act("missing")}>Mark missing</button>
        </>}
        {tab === "unit" && <>
          <a className={`btn-sm ${ids.length ? "" : "pointer-events-none opacity-40"}`} href={`/api/admin/orders/slips?ids=${ids.join(",")}`} target="_blank">Print packing slips</a>
          <button className="btn-sm-secondary" disabled={busy || !ids.length} onClick={() => act("at_unit")}>Mark at the unit</button>
          {!tracking && <button className="btn-sm-secondary" disabled={busy || !ids.length} onClick={() => setTracking({ carrier: "Royal Mail", tracking: "" })}>Despatched by hand</button>}
          {tracking && <span className="flex items-center gap-2">
            <input className="field !h-9 !w-28 !text-[13px]" value={tracking.carrier} onChange={(e) => setTracking({ ...tracking, carrier: e.target.value })} placeholder="Carrier" />
            <input className="field !h-9 !w-44 !text-[13px]" value={tracking.tracking} onChange={(e) => setTracking({ ...tracking, tracking: e.target.value })} placeholder="Tracking (one order)" autoFocus />
            <button className="btn-sm" disabled={busy} onClick={() => act("despatched", tracking)}>Despatched</button>
            <button className="text-ink-muted" onClick={() => setTracking(null)}>Cancel</button>
          </span>}
          <span className="ml-auto text-[12px] text-ink-muted">Labels are bought in Click &amp; Drop; it marks the order despatched here on its own.</span>
        </>}
        {(tab === "done" || tab === "all") && <button className="btn-sm-secondary" disabled={busy || !ids.length} onClick={() => act("new")}>Back to collect</button>}
        {msg && <span className="w-full text-[12px] text-ink-muted">{msg}</span>}
      </div>

      {shown.length === 0 && <p className="card p-8 text-center text-[14px] text-ink-muted">{tab === "collect" ? "Nothing to collect." : tab === "unit" ? "Nothing at the unit." : "Nothing here."}</p>}
      {Object.entries(byCentre).map(([name, rows]) => (
        <div key={name} className="card mb-5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5"><h2 className="text-[14px] font-semibold">{name}</h2><span className="text-[12px] text-ink-muted">{rows.length}</span></div>
          {rows.map((o) => {
            const age = Math.floor((Date.now() - new Date(o.sold_at).getTime()) / 86400000);
            return (
              <label key={o.sale_id} className={`grid cursor-pointer gap-2 border-b border-border px-4 py-3 last:border-0 md:grid-cols-[auto_1.2fr_1fr_auto] md:items-center ${sel.has(o.sale_id) ? "bg-surface-2" : ""}`}>
                <input type="checkbox" className="mt-1 md:mt-0" checked={sel.has(o.sale_id)} onChange={() => toggle(o.sale_id)} />
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-[14px]"><span className={`pill ${TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span><span className="font-medium">{o.title}</span><span className="num font-semibold">{money(o.amount_pence)}</span>{o.status === "new" && age > 2 && <span className="pill pill-danger">{age} days</span>}</div>
                  <div className="mt-0.5 text-[12px] text-ink-muted">{o.ticket && <span className="ticket">{o.ticket}</span>}{o.ticket ? " · " : ""}{o.dealer}{o.dealer_code ? ` (${o.dealer_code})` : ""}{o.pitches.length ? ` · pitch ${o.pitches.join(", ")}` : ""} · sold {new Date(o.sold_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}{o.order_name ? ` · ${o.order_name}` : ""}{o.slip_printed_at ? " · slip printed" : ""}</div>
                </div>
                <div className="text-[12px] text-ink-muted">
                  {o.buyer || o.address ? <><span className="font-medium text-ink">{o.buyer}</span><br />{o.address}</> : <span>Address arrives with the Shopify order</span>}
                  {o.note && <div className="mt-1 italic">Note: {o.note}</div>}
                </div>
                <div className="text-right text-[12px] text-ink-muted">
                  {o.status === "despatched" && <>{o.carrier ?? ""} {o.tracking ?? ""}<br />{o.despatched_at ? new Date(o.despatched_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}</>}
                  {o.status === "collected" && o.collected_at && <>Collected {new Date(o.collected_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</>}
                  {o.status === "missing" && <span className="text-danger">Centre told</span>}
                </div>
              </label>
            );
          })}
        </div>
      ))}
    </>
  );
}
