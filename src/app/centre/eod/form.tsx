"use client";
import { useEffect, useRef, useState } from "react";
import { Pill, money } from "@/components/ui";
import { canonicalTicket, displaySku } from "@/lib/sku";
import { guessColumns, mapBringRows, parseCsv } from "@/lib/full/sumup";
import { londonDate } from "@/lib/full/weeks";
import { UkDate } from "@/components/uk-date";

type Line = { key: string; ticket: string; title: string | null; dealer: string | null; amount: string; payment: "CASH" | "CARD"; status: "ok" | "unknown" | "sold" | "looking" };

export function EndOfDay({ centreId, centreName, onRecorded, clearToken = 0 }: { centreId: string; centreName: string; onRecorded?: () => void; clearToken?: number }) {
  const today = londonDate(new Date()).ymd;
  const [date, setDate] = useState(today);
  const [fileMsg, setFileMsg] = useState<string | null>(null);
  const [ticket, setTicket] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ matched: number; dealerOnly: number; unmatched: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { input.current?.focus(); }, [lines.length]);
  // Something changed in the Recorded list (edit or undo): the "Recorded N sales" banner is stale, drop it
  useEffect(() => { if (clearToken > 0) setDone(null); }, [clearToken]);
  // Wake the lookup function so the first scan of the day is not a cold start
  useEffect(() => { fetch(`/api/centres/${centreId}/sales?ticket=WARMUP`, { cache: "no-store" }).catch(() => {}); }, [centreId]);

  async function fromFile(file: File) {
    const table = parseCsv(await file.text());
    const cols = table[0] ? guessColumns(table[0]) : null;
    if (!cols) { setFileMsg("Could not read that file."); return; }
    setFileMsg(null);
    for (const row of mapBringRows(table, cols).rows) {
      const sku = canonicalTicket(row.ticket);
      if (lines.some((l) => l.ticket === sku)) continue;
      const key = crypto.randomUUID();
      setLines((ls) => [{ key, ticket: sku, title: null, dealer: null, amount: (row.amountPence / 100).toString(), payment: row.payment, status: "looking" }, ...ls]);
      let j: { item?: unknown } = {};
      try { const r = await fetch(`/api/centres/${centreId}/sales?ticket=${encodeURIComponent(sku)}`, { cache: "no-store" }); j = await r.json(); } catch { j = {}; }
      const item = (j.item ?? null) as { sku: string; title: string; status: string; dealer: { name: string; code: string } | null } | null;
      setLines((ls) => ls.map((l) => l.key !== key ? l : { ...l, ticket: item?.sku ?? sku, title: item?.title ?? null, dealer: item?.dealer ? `${item.dealer.code} ${item.dealer.name}` : null, status: !item ? "unknown" : item.status === "sold" ? "sold" : "ok" }));
    }
  }

  async function add(raw: string) {
    const sku = canonicalTicket(raw);
    if (sku.length < 3) return;
    if (lines.some((l) => l.ticket === sku)) { setTicket(""); return; }
    // Show the line straight away, fill it in when the lookup comes back
    const key = crypto.randomUUID();
    setLines((ls) => [{ key, ticket: sku, title: null, dealer: null, amount: "", payment: "CARD", status: "looking" }, ...ls]);
    setTicket("");
    let j: { item?: unknown } = {};
    try { const r = await fetch(`/api/centres/${centreId}/sales?ticket=${encodeURIComponent(sku)}`, { cache: "no-store" }); j = await r.json(); } catch { j = {}; }
    const item = (j.item ?? null) as { sku: string; title: string; price_pence: number; status: string; dealer: { name: string; code: string } | null } | null;
    setLines((ls) => ls.map((l) => l.key !== key ? l : {
      ...l, ticket: item?.sku ?? sku, title: item?.title ?? null, dealer: item?.dealer ? `${item.dealer.code} ${item.dealer.name}` : null,
      amount: item ? (item.price_pence / 100).toString() : "", status: !item ? "unknown" : item.status === "sold" ? "sold" : "ok",
    }));
  }
  const update = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const remove = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));

  async function submit() {
    const valid = lines.filter((l) => l.status !== "sold" && parseFloat(l.amount || "0") > 0);
    if (!valid.length) return;
    setBusy(true);
    const r = await fetch(`/api/centres/${centreId}/sales`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ lines: valid.map((l) => ({ ticket: l.ticket, amount_pence: Math.round(parseFloat(l.amount) * 100), payment_type: l.payment, sold_at: `${date}T17:00:00Z` })) }),
    });
    const j = await r.json();
    setBusy(false);
    const res = (j.results ?? []) as { status: string }[];
    setDone({ matched: res.filter((x) => x.status === "matched").length, dealerOnly: res.filter((x) => x.status === "dealer_only").length, unmatched: res.filter((x) => x.status === "unmatched" || x.status === "duplicate").length });
    setLines([]);
    onRecorded?.();
  }

  const total = lines.reduce((a, l) => a + (l.status !== "sold" ? Math.round(parseFloat(l.amount || "0") * 100) : 0), 0);
  const cash = lines.filter((l) => l.payment === "CASH" && l.status !== "sold").reduce((a, l) => a + Math.round(parseFloat(l.amount || "0") * 100), 0);

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between"><h1 className="text-[24px] font-semibold">End of day</h1><span className="text-[13px] text-ink-muted">{centreName}</span></div>
      <p className="mb-4 text-[14px] text-ink-muted">Scan each ticket. Card or cash. Then Record.</p>

      {done && (
        <div className="mb-4 rounded-[14px] border border-[#A7F3D0] bg-success-soft px-4 py-3 text-[14px] text-success">
          Recorded {done.matched} sale{done.matched === 1 ? "" : "s"}.{done.dealerOnly ? ` ${done.dealerOnly} matched a dealer, not an item.` : ""}{done.unmatched ? ` ${done.unmatched} unmatched.` : ""}
          <button className="ml-2 underline" onClick={() => setDone(null)}>Another batch</button>
        </div>
      )}

      <div className="card mb-4 p-4">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add(ticket); }}>
          <input ref={input} className="field ticket flex-1 uppercase !text-[18px]" placeholder="Ticket number" aria-label="Ticket number" value={ticket} onChange={(e) => setTicket(e.target.value)} enterKeyHint="done" autoCapitalize="characters" autoCorrect="off" />
          <button type="submit" className="btn-dark !h-12">Add</button>
          <label className="btn-secondary !h-12 cursor-pointer whitespace-nowrap !px-4">SumUp file<input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) fromFile(f); }} /></label>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] text-ink-muted">
          <span className="whitespace-nowrap">Sold on</span>
          <UkDate value={date} max={today} onChange={setDate} />
          {fileMsg && <span className="text-danger">{fileMsg}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {lines.map((l) => (
          <div key={l.key} className={`card p-3 ${l.status === "sold" ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="ticket text-[18px]">{displaySku(l.ticket)}</div>
                <div className="truncate text-[13px] text-ink-muted">{l.status === "looking" ? "Looking up" : l.status === "unknown" ? "Not in the app. Ticket number only." : l.status === "sold" ? "Already sold" : [l.title, l.dealer].filter(Boolean).join(", ")}</div>
              </div>
              <div className="flex items-center gap-2">
                {l.status === "unknown" && <Pill kind="warning">Unknown</Pill>}
                {l.status === "sold" && <Pill kind="neutral">Sold</Pill>}
                <button className="text-[13px] text-ink-muted" onClick={() => remove(l.key)}>Remove</button>
              </div>
            </div>
            {l.status !== "sold" && l.status !== "looking" && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex h-11 flex-1 items-center gap-1 rounded-[12px] border border-border px-3"><span className="whitespace-nowrap text-[12px] text-ink-muted">Price paid £</span><input className="num min-w-0 flex-1 border-0 text-[18px] font-semibold outline-none" inputMode="decimal" value={l.amount} onChange={(e) => update(l.key, { amount: e.target.value })} placeholder="Paid" /></div>
                <div className="flex rounded-[10px] bg-surface-2 p-0.5">
                  {(["CARD", "CASH"] as const).map((p) => <button key={p} onClick={() => update(l.key, { payment: p })} className={`h-10 rounded-[8px] px-4 text-[13px] font-semibold ${l.payment === p ? "bg-white shadow-sm" : "text-ink-muted"}`}>{p === "CARD" ? "Card" : "Cash"}</button>)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {lines.length > 0 && (
        <div className="sticky bottom-0 mt-4 rounded-[16px] bg-forest p-4 text-white">
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            <div><div className="num text-[18px] font-semibold">{lines.filter((l) => l.status !== "sold").length}</div><div className="text-[11px] text-header-muted">Tickets</div></div>
            <div><div className="num text-[18px] font-semibold">{money(total)}</div><div className="text-[11px] text-header-muted">Total</div></div>
            <div><div className="num text-[18px] font-semibold">{money(cash)}</div><div className="text-[11px] text-header-muted">Cash</div></div>
          </div>
          <button className="btn" disabled={busy || lines.some((l) => l.status === "looking")} onClick={submit}>{busy ? "Recording" : `Record ${lines.filter((l) => l.status !== "sold").length}`}</button>
        </div>
      )}
    </div>
  );
}
