"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { guessColumns, mapBringRows, parseCsv } from "@/lib/full/sumup";
import { londonDate } from "@/lib/full/weeks";
import { UkDate } from "@/components/uk-date";

type Centre = { id: string; name: string };

export function DeskTools({ centres, goalPounds, exportToken }: { centres: Centre[]; goalPounds: number; exportToken: string | null }) {
  const router = useRouter();
  const [goal, setGoal] = useState(goalPounds ? String(goalPounds) : "");
  const [centre, setCentre] = useState(centres[0]?.id ?? "");
  const [ticket, setTicket] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  useEffect(() => { setDate(londonDate(new Date()).ymd); }, []);
  const [preview, setPreview] = useState<{ ticket: string; amountPence: number; soldAt: string; payment: "CASH" | "CARD" }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState(exportToken);

  async function save(body: unknown) {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/app/desk", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg(j.error ?? "Could not save");
    if ("export_token" in j) setToken(j.export_token);
    setMsg("Saved.");
    router.refresh();
  }

  function onFile(file: File) {
    file.text().then((text) => {
      const table = parseCsv(text);
      const cols = table[0] ? guessColumns(table[0]) : null;
      if (!cols) return setMsg("Could not read that file. Need a date, an amount and a ticket.");
      const mapped = mapBringRows(table, cols);
      setPreview(mapped.rows);
      setMsg(mapped.skipped ? `${mapped.rows.length} ready. ${mapped.skipped} skipped.` : `${mapped.rows.length} ready.`);
    });
  }

  async function record(lines: { ticket: string; amountPence: number; soldAt: string; payment: "CASH" | "CARD" }[]) {
    if (!centre || !lines.length) return;
    setBusy(true); setMsg(null);
    const r = await fetch("/api/app/bring-in", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ centre_id: centre, lines: lines.map((l) => ({ ticket: l.ticket, amount_pence: l.amountPence, payment_type: l.payment, sold_at: l.soldAt })) }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg(j.error ?? "Could not record");
    const ok = (j.results ?? []).filter((x: { status: string }) => x.status === "matched" || x.status === "duplicate").length;
    setMsg(`Recorded ${ok} of ${j.results?.length ?? 0}.`);
    setPreview([]);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-3 p-4">
        <h2 className="text-[16px] font-semibold">Weekly goal</h2>
        <div className="flex gap-2">
          <div className="flex h-12 flex-1 items-center gap-1 rounded-[12px] border border-border px-3"><span className="text-ink-muted">£</span><input className="num min-w-0 flex-1 border-0 text-[18px] font-semibold outline-none" inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} /></div>
          <button className="btn-dark !h-12 !w-auto !px-4" disabled={busy} onClick={() => save({ weekly_goal_pounds: Number(goal || 0) })}>Save</button>
        </div>
      </section>

      <section className="card flex flex-col gap-3 p-4">
        <h2 className="text-[16px] font-semibold">Paper book or SumUp</h2>
        <select className="field" value={centre} onChange={(e) => setCentre(e.target.value)}>{centres.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <label className="text-[13px] font-medium" htmlFor="desk-ticket">Ticket number</label>
        <input id="desk-ticket" className="field ticket" placeholder="B14 0001" value={ticket} onChange={(e) => setTicket(e.target.value)} />
        <label className="text-[13px] font-medium" htmlFor="desk-paid">What they paid</label>
        <input id="desk-paid" className="field" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <UkDate value={date} max={londonDate(new Date()).ymd} onChange={setDate} />
        <button className="btn-outline" disabled={busy || !ticket || !amount || !date} onClick={() => record([{ ticket, amountPence: Math.round(Number(amount) * 100), soldAt: `${date}T12:00:00.000Z`, payment: "CASH" }])}>Record sale</button>
        <label className="btn-secondary cursor-pointer">SumUp file<input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} /></label>
        {preview.length > 0 && <button className="btn" disabled={busy} onClick={() => record(preview)}>Record {preview.length}</button>}
      </section>

      <section className="card flex flex-col gap-3 p-4">
        <h2 className="text-[16px] font-semibold">Your own tools</h2>
        <div className="flex flex-wrap gap-2">
          <a className="btn-sm" href="/api/app/export?kind=sales">Download sales</a>
          <a className="btn-sm-secondary" href="/api/app/export?kind=stock">Download stock</a>
        </div>
        <div className="flex flex-wrap gap-2">
          {token && <button className="btn-sm" disabled={busy} onClick={() => { const url = `${window.location.origin}/api/feed/${token}?format=json`; navigator.clipboard.writeText(url).then(() => setMsg("Copied.")).catch(() => setMsg("Could not copy")); }}>Copy link</button>}
          <button className="btn-sm" disabled={busy} onClick={() => save({ export_token: "new" })}>New link</button>
          {token && <button className="btn-sm-secondary" disabled={busy} onClick={() => save({ export_token: "stop" })}>Stop link</button>}
        </div>
      </section>
      {msg && <p className="text-[13px]">{msg}</p>}
    </div>
  );
}
