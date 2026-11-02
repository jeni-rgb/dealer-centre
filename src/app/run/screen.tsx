"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { money } from "@/components/ui";
import type { OnlineOrder } from "@/lib/fulfilment/orders";

export function RunScreen({ orders }: { orders: OnlineOrder[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, "collected" | "missing">>({});
  const [centre, setCentre] = useState<string | null>(null);
  const byCentre = useMemo(() => orders.reduce<Record<string, OnlineOrder[]>>((m, o) => { (m[o.centre] ??= []).push(o); return m; }, {}), [orders]);
  const centres = Object.keys(byCentre);
  const current = centre ?? centres[0] ?? null;
  const rows = current ? [...byCentre[current]].sort((a, b) => (a.pitches[0] ?? "").localeCompare(b.pitches[0] ?? "", undefined, { numeric: true })) : [];
  const left = rows.filter((o) => !done[o.sale_id] && o.status === "new").length;

  async function mark(o: OnlineOrder, status: "collected" | "missing" | "new") {
    setBusy(o.sale_id);
    const r = await fetch("/api/admin/orders", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ sale_ids: [o.sale_id], status }) });
    setBusy(null);
    if (r.ok) { if (status === "new") setDone((d) => { const n = { ...d }; delete n[o.sale_id]; return n; }); else setDone((d) => ({ ...d, [o.sale_id]: status })); router.refresh(); }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-surface pb-24">
      <header className="header-dark flex flex-col gap-3 px-5 pb-5 pt-6">
        <div className="flex items-center justify-between"><Logo size={26} /><Link href="/ops/orders" className="text-[12px] text-header-muted">Desk</Link></div>
        <div><span className="text-[12px] text-header-muted">Collection run · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span><h1 className="text-[22px] font-semibold">{orders.length === 0 ? "Nothing to collect" : `${orders.filter((o) => o.status === "new").length} to collect`}</h1></div>
        {centres.length > 1 && <div className="flex flex-wrap gap-2">{centres.map((c) => <button key={c} onClick={() => setCentre(c)} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${current === c ? "bg-cream text-ink" : "bg-white/15 text-cream"}`}>{c} · {byCentre[c].filter((o) => o.status === "new").length}</button>)}</div>}
      </header>

      <div className="flex flex-col gap-3 px-4 pt-4">
        {current && <div className="flex items-baseline justify-between"><h2 className="text-[17px] font-semibold">{current}</h2><span className="text-[13px] text-ink-muted">{left} left</span></div>}
        {rows.map((o) => {
          const state = done[o.sale_id] ?? (o.status === "missing" ? "missing" : null);
          return (
            <div key={o.sale_id} className={`card p-4 ${state === "collected" ? "opacity-60" : ""} ${state === "missing" ? "border-danger" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-accent">Pitch {o.pitches.join(", ") || "?"}</div>
                  <div className="truncate text-[16px] font-semibold">{o.title}</div>
                  <div className="mt-0.5 text-[13px] text-ink-muted"><span className="ticket">{o.ticket ?? "no ticket"}</span> · {o.dealer} · {money(o.amount_pence)}</div>
                  {(o.delivery === "large" || o.delivery === "furniture") && <div className="mt-1 text-[12px] font-semibold text-warning">{o.delivery === "furniture" ? "Furniture: do not collect, needs a quote" : "Large: needs the van"}</div>}
                </div>
                {state === "collected" && <span className="pill pill-success">In the van</span>}
                {state === "missing" && <span className="pill pill-danger">Not here</span>}
              </div>
              <div className="mt-3 flex gap-2">
                {!state && <>
                  <button className="btn !h-12 flex-1" disabled={busy === o.sale_id} onClick={() => mark(o, "collected")}>Collected</button>
                  <button className="btn-outline !h-12 !w-auto !px-4 !text-danger" disabled={busy === o.sale_id} onClick={() => mark(o, "missing")}>Not here</button>
                </>}
                {state && <button className="text-[13px] text-ink-muted" disabled={busy === o.sale_id} onClick={() => mark(o, "new")}>Undo</button>}
              </div>
            </div>
          );
        })}
        {orders.length === 0 && <p className="card p-6 text-center text-[14px] text-ink-muted">Every online order has been collected. Check the desk for anything ready for postage.</p>}
        <p className="pt-2 text-[12px] text-ink-muted">Collected goes straight to the desk as ready for postage. Not here tells the centre and the dealer by email and push.</p>
      </div>
    </main>
  );
}
