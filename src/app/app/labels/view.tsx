"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pill, Sku, when } from "@/components/ui";
import { nextLabelTitle } from "@/lib/labels/title";

type Row = { id: string; item_id: string; status: string; sku: string; title: string; photo: string | null; at: string; copies?: number };
type Printer = { id: string; name: string; kind: string; cloud: boolean; size?: string };

export function LabelsView({ rows, printers, lastPrinterId }: { rows: Row[]; printers: Printer[]; lastPrinterId: string | null }) {
  const router = useRouter();
  const [printer, setPrinter] = useState(lastPrinterId ?? printers[0]?.id ?? "");
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const notPrinted = rows.filter((r) => r.status === "not_printed" || r.status === "ready" || r.status === "failed" || r.status === "queued");
  const printed = rows.filter((r) => !notPrinted.includes(r)).slice(0, 30);

  async function saveNames(ids: string[]) {
    for (const id of ids) {
      const row = rows.find((r) => r.item_id === id);
      if (!row) continue;
      const next = nextLabelTitle(row.title, names[id] ?? row.title);
      if (next.error) { setErr(next.error); return false; }
      if (!next.title) continue;
      const r = await fetch(`/api/items/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: next.title }) });
      if (!r.ok) { setErr((await r.json().catch(() => ({}))).error ?? "Could not save the name."); return false; }
    }
    return true;
  }

  async function print(ids: string[]) {
    setBusy(ids.length === 1 ? ids[0] : "all");
    setErr(null);
    if (!(await saveNames(ids))) { setBusy(null); return; }
    const r = await fetch("/api/labels/print", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ item_ids: ids, printer_id: printer || undefined }) });
    const j = await r.json();
    setBusy(null);
    if (j.browser) { window.location.href = String(j.browser).replace("/api/labels/batch", "/app/labels/print"); return; }
    router.refresh();
  }

  async function mark(ids: string[]) {
    setBusy(ids.length === 1 ? `m${ids[0]}` : "mall");
    await fetch("/api/labels/mark", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ item_ids: ids }) });
    setBusy(null); router.refresh();
  }

  return (
    <>
      <div>
        <span className="field-label">Printer</span>
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-[14px] border border-border">
          {printers.length === 0 && <div className="px-4 py-3.5 text-[13px] text-ink-muted">No printer yet. Join a centre to use its till printer, or add your own in Settings. Labels still open as a PDF you can print from this phone.</div>}
          {printers.map((p) => (
            <button key={p.id} onClick={() => setPrinter(p.id)} className={`flex min-h-[60px] items-center justify-between px-4 py-3 text-left ${printer === p.id ? "bg-accent-soft" : "bg-white"}`}>
              <span className="flex flex-col gap-0.5"><span className="text-[15px] font-medium">{p.name}</span><span className="text-[12px] text-ink-muted">{p.kind}{p.size ? ` · ${p.size}` : ""}{p.cloud ? " · prints without a computer" : ""}</span></span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success-dot" /><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${printer === p.id ? "border-accent bg-accent text-white" : "border-border"}`}>{printer === p.id && "✓"}</span></span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-[13px] text-ink-muted">Wrong name? Change it, then print. The ticket number stays the same.</p>
      {err && <p className="text-[13px] text-danger">{err}</p>}

      <div>
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-[16px] font-semibold">Not printed <span className="text-ink-muted">{notPrinted.length}</span></h2>
          {notPrinted.length > 1 && <button className="btn-sm" disabled={busy !== null} onClick={() => print(notPrinted.map((r) => r.item_id))}>{busy === "all" ? "Sending…" : "Print all"}</button>}
          {notPrinted.length > 1 && <button className="btn-sm-secondary" disabled={busy !== null} onClick={() => mark(notPrinted.map((r) => r.item_id))}>{busy === "mall" ? "…" : "Mark all printed"}</button>}
        </div>
        {notPrinted.length === 0 && <p className="card p-4 text-[14px] text-ink-muted">Every item has a label. Nice.</p>}
        <div className="flex flex-col gap-2">
          {notPrinted.map((r) => (
            <div key={r.id} className="row !items-stretch">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-surface-2">{r.photo && <img src={r.photo} alt="" className="h-full w-full object-cover" />}</div>
                  <NameField id={r.item_id} value={names[r.item_id] ?? r.title} onChange={(v) => setNames((s) => ({ ...s, [r.item_id]: v }))} />
                </div>
                <div className="flex items-center justify-end gap-3">
                  {r.status === "failed" && <Pill kind="danger">Failed</Pill>}
                  <span className="mr-auto text-[12px] text-ink-muted"><Sku sku={r.sku} className="!font-medium !tracking-normal" />{(r.copies ?? 1) > 1 ? ` ${r.copies} labels` : ""}</span>
                  <button className="btn-sm-secondary" disabled={busy !== null} onClick={() => print([r.item_id])}>{busy === r.item_id ? "…" : "Print"}</button>
                  <button className="text-[12px] font-medium text-ink-muted underline" disabled={busy !== null} onClick={() => mark([r.item_id])}>{busy === `m${r.item_id}` ? "…" : "Mark printed"}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {printed.length > 0 && (
        <div>
          <h2 className="pb-2 text-[16px] font-semibold">Printed</h2>
          <div className="flex flex-col gap-2">
            {printed.map((r) => (
              <div key={r.id} className="row !items-stretch">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <NameField id={r.item_id} value={names[r.item_id] ?? r.title} onChange={(v) => setNames((s) => ({ ...s, [r.item_id]: v }))} />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-ink-muted"><Sku sku={r.sku} className="!font-medium !tracking-normal" /> · {r.status === "sent" ? "Sent to printer" : r.status === "queued" ? "Queued" : "Printed"} · {when(r.at)}</span>
                    <button className="text-[13px] font-medium text-accent disabled:opacity-50" disabled={busy !== null} onClick={() => print([r.item_id])}>Reprint</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function NameField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="min-w-0 flex-1">
      <label className="sr-only" htmlFor={`name-${id}`}>Name on the label</label>
      <input id={`name-${id}`} value={value} onChange={(e) => onChange(e.target.value)} className="w-full min-w-0 rounded-[8px] border border-border bg-white px-2 py-1 text-[14px] font-medium outline-none focus:border-accent" />
    </div>
  );
}
