"use client";
import { useState } from "react";
import Link from "next/link";
import { displaySku } from "@/lib/sku";

type Kind = { title: string; qty: string; sell: string };
type Line = { title: string; cost: string; qty: number; kinds: Kind[] };
type Made = { id: string; sku: string; title: string; qty: number };

const pounds = (pence: number) => (pence / 100).toFixed(2);
const pence = (raw: string) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};

export function InvoiceForm() {
  const [file, setFile] = useState<File | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [supplier, setSupplier] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [labels, setLabels] = useState<"box" | "kind">("kind");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<Made[] | null>(null);

  async function read() {
    if (!file) return;
    setBusy(true); setNote(null); setMade(null);
    const body = new FormData();
    body.set("file", file);
    const r = await fetch("/api/items/invoice/read", { method: "POST", body });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setNote(j.error ?? "Could not read that file");
    setInvoiceId(j.invoiceId ?? null);
    setSupplier(j.supplier ?? "");
    const next = (j.lines ?? []) as { title: string; qty: number; costPence: number }[];
    setLines(next.length ? next.map((line) => ({
      title: line.title,
      qty: line.qty,
      cost: pounds(line.costPence),
      kinds: [{ title: line.title, qty: String(line.qty), sell: "" }],
    })) : [{ title: "", qty: 1, cost: "", kinds: [{ title: "", qty: "1", sell: "" }] }]);
    if (!j.read) setNote(j.ai ? "Could not read that file. Type the lines." : "AI reading is off. Type the lines.");
  }

  function setKind(li: number, ki: number, patch: Partial<Kind>) {
    setLines((rows) => rows.map((row, i) => i !== li ? row : { ...row, kinds: row.kinds.map((k, j) => j === ki ? { ...k, ...patch } : k) }));
  }

  async function confirm() {
    if (!invoiceId) return;
    for (const line of lines) {
      const sum = line.kinds.reduce((a, k) => a + (Number(k.qty) || 0), 0);
      if (line.qty > 1 && sum !== line.qty) return setNote("Numbers must add up");
      if (line.kinds.some((k) => k.title.trim().length < 2 || !(Number(k.qty) > 0) || !pence(k.sell))) return setNote("Each kind needs a name, a number and a sell price");
    }
    setBusy(true); setNote(null);
    const variants = lines.flatMap((line) => line.kinds.map((k) => ({
      title: k.title.trim(),
      qty: Math.round(Number(k.qty)),
      sellPence: pence(k.sell),
      costPence: pence(line.cost),
    })));
    const r = await fetch("/api/items/invoice", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invoiceId, supplier, labels, variants }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setNote(j.error ?? "Could not add the stock");
    setMade(j.items ?? []);
  }

  if (made) {
    const ids = made.map((m) => m.id).join(",");
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[15px] font-medium">Added to stock. Invoice kept with these items.</p>
        {made.map((m) => (
          <Link key={m.id} href={`/app/items/${m.id}`} className="card flex items-center justify-between px-4 py-3 text-[14px]">
            <span className="truncate font-medium">{m.title}</span>
            <span className="text-ink-muted">{displaySku(m.sku)}, {m.qty} left</span>
          </Link>
        ))}
        <a className="btn" href={`/api/labels/batch?ids=${ids}`}>Print labels</a>
        <Link className="btn-secondary" href="/app/stock">Back to stock</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] text-ink-muted">PDF, photo or CSV.</p>
      <input className="text-[14px]" type="file" accept=".pdf,.csv,.png,.jpg,.jpeg,.webp,image/*,application/pdf,text/csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setLines([]); setMade(null); }} />
      <button className="btn" disabled={!file || busy} onClick={read}>{busy && !lines.length ? "Reading" : "Read invoice"}</button>
      {note && <p className="text-[14px]">{note}</p>}
      {lines.length > 0 && (
        <>
          <label className="flex flex-col gap-1 text-[14px]"><span className="field-label">Supplier</span><input className="field" value={supplier} onChange={(e) => setSupplier(e.target.value)} /></label>
          {lines.map((line, li) => (
            <div key={li} className="card flex flex-col gap-3 p-4">
              <label className="flex flex-col gap-1 text-[14px]"><span className="field-label">Item</span><input className="field" value={line.title} onChange={(e) => setLines((rows) => rows.map((row, i) => i === li ? { ...row, title: e.target.value, kinds: row.kinds.map((k, j) => j === 0 && k.title === row.title ? { ...k, title: e.target.value } : k) } : row))} /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-[14px]"><span className="field-label">How many</span><input className="field" inputMode="numeric" value={line.qty} onChange={(e) => setLines((rows) => rows.map((row, i) => i === li ? { ...row, qty: Math.max(1, Number(e.target.value) || 1) } : row))} /></label>
                <label className="flex flex-col gap-1 text-[14px]"><span className="field-label">Cost each</span><input className="field" inputMode="decimal" value={line.cost} onChange={(e) => setLines((rows) => rows.map((row, i) => i === li ? { ...row, cost: e.target.value } : row))} /></label>
              </div>
              {line.kinds.map((k, ki) => (
                <div key={ki} className="grid grid-cols-[1fr_4rem_5rem] gap-2">
                  <input className="field" aria-label="Kind" placeholder="Kind" value={k.title} onChange={(e) => setKind(li, ki, { title: e.target.value })} />
                  <input className="field" aria-label="Number" inputMode="numeric" value={k.qty} onChange={(e) => setKind(li, ki, { qty: e.target.value })} />
                  <input className="field" aria-label="Sell price" placeholder="Sell" inputMode="decimal" value={k.sell} onChange={(e) => setKind(li, ki, { sell: e.target.value })} />
                </div>
              ))}
              <button className="btn-secondary" type="button" onClick={() => setLines((rows) => rows.map((row, i) => i === li ? { ...row, kinds: [...row.kinds, { title: "", qty: "1", sell: "" }] } : row))}>Add a kind</button>
            </div>
          ))}
          <button className="text-[14px] font-medium text-accent" type="button" onClick={() => setLines((rows) => [...rows, { title: "", qty: 1, cost: "", kinds: [{ title: "", qty: "1", sell: "" }] }])}>Add a line</button>
          <div className="flex flex-col gap-2">
            <span className="field-label">Labels</span>
            <div className="flex gap-2">
              <button type="button" className={`btn-sm ${labels === "box" ? "" : "btn-sm-secondary"}`} onClick={() => setLabels("box")}>One for each box</button>
              <button type="button" className={`btn-sm ${labels === "kind" ? "" : "btn-sm-secondary"}`} onClick={() => setLabels("kind")}>One for each kind</button>
            </div>
          </div>
          <button className="btn" disabled={busy || !invoiceId} onClick={confirm}>{busy ? "Adding" : "Add to stock"}</button>
        </>
      )}
    </div>
  );
}
