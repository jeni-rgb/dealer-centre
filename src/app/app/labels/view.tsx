"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pill, Sku, when } from "@/components/ui";

type Row = { id: string; item_id: string; status: string; sku: string; title: string; photo: string | null; at: string };
type Printer = { id: string; name: string; kind: string; cloud: boolean };

export function LabelsView({ rows, printers, lastPrinterId }: { rows: Row[]; printers: Printer[]; lastPrinterId: string | null }) {
  const router = useRouter();
  const [printer, setPrinter] = useState(lastPrinterId ?? printers[0]?.id ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const notPrinted = rows.filter((r) => r.status === "not_printed" || r.status === "ready" || r.status === "failed");
  const printed = rows.filter((r) => !notPrinted.includes(r)).slice(0, 30);

  async function print(ids: string[]) {
    setBusy(ids.length === 1 ? ids[0] : "all");
    const r = await fetch("/api/labels/print", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ item_ids: ids, printer_id: printer || undefined }) });
    const j = await r.json();
    setBusy(null);
    if (j.browser) window.open(j.browser, "_blank");
    router.refresh();
  }

  return (
    <>
      <div>
        <span className="field-label">Printer</span>
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-[14px] border border-border">
          {printers.length === 0 && <div className="px-4 py-3.5 text-[13px] text-ink-muted">No printer yet. Join a centre to use its till printer, or add your own in Settings. Labels still open as a PDF you can print from this phone.</div>}
          {printers.map((p) => (
            <button key={p.id} onClick={() => setPrinter(p.id)} className={`flex min-h-[60px] items-center justify-between px-4 py-3 text-left ${printer === p.id ? "bg-accent-soft" : "bg-white"}`}>
              <span className="flex flex-col gap-0.5"><span className="text-[15px] font-medium">{p.name}</span><span className="text-[12px] text-ink-muted">{p.kind}{p.cloud ? " · prints without a computer" : " · opens a PDF"}</span></span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success-dot" /><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${printer === p.id ? "border-accent bg-accent text-white" : "border-border"}`}>{printer === p.id && "✓"}</span></span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-[16px] font-semibold">Not printed <span className="text-ink-muted">{notPrinted.length}</span></h2>
          {notPrinted.length > 1 && <button className="btn-sm" disabled={busy !== null} onClick={() => print(notPrinted.map((r) => r.item_id))}>{busy === "all" ? "Sending…" : "Print all"}</button>}
        </div>
        {notPrinted.length === 0 && <p className="card p-4 text-[14px] text-ink-muted">Every item has a label. Nice.</p>}
        <div className="flex flex-col gap-2">
          {notPrinted.map((r) => (
            <div key={r.id} className="row">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-surface-2">{r.photo && <img src={r.photo} alt="" className="h-full w-full object-cover" />}</div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="truncate text-[14px] font-medium">{r.title}</span><span className="text-[12px] text-ink-muted"><Sku sku={r.sku} className="!font-medium !tracking-normal" /> {r.status === "failed" && <Pill kind="danger">Failed</Pill>}</span></div>
              <button className="btn-sm-secondary" disabled={busy !== null} onClick={() => print([r.item_id])}>{busy === r.item_id ? "…" : "Print"}</button>
            </div>
          ))}
        </div>
      </div>

      {printed.length > 0 && (
        <div>
          <h2 className="pb-2 text-[16px] font-semibold">Printed</h2>
          <div className="flex flex-col gap-2">
            {printed.map((r) => (
              <div key={r.id} className="row !min-h-[56px]">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="truncate text-[14px]">{r.title}</span><span className="text-[12px] text-ink-muted"><Sku sku={r.sku} className="!font-medium !tracking-normal" /> · {r.status === "sent" ? "Sent to printer" : r.status === "queued" ? "Queued" : "Printed"} · {when(r.at)}</span></div>
                <button className="text-[13px] font-medium text-accent" onClick={() => print([r.item_id])}>Reprint</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
