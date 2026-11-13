"use client";
import { useState } from "react";
import { SHEET_FIELDS, type SheetField } from "@/lib/items/sheet";

type Row = { line: number; title: string; ticket: string | null; centre: string; status: string; message: string; pricePence: number };

export function ImportForm() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [map, setMap] = useState<Record<string, number>>({});
  const [rows, setRows] = useState<Row[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(commit: boolean) {
    if (!file) return;
    setBusy(true); setMsg(null);
    const body = new FormData();
    body.set("file", file);
    if (Object.keys(map).length) body.set("map", JSON.stringify(map));
    if (commit) body.set("commit", "1");
    const r = await fetch("/api/app/import", { method: "POST", body });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg(j.error ?? "Could not read that file");
    if (commit) { setMsg(`Added ${j.imported}.`); setRows(j.results ?? []); return; }
    setHeaders(j.headers ?? []);
    setMap(j.map ?? {});
    setRows(j.rows ?? []);
  }

  return (
    <div className="flex flex-col gap-4">
      <a className="text-[14px] font-medium text-accent" href="/api/app/import/template">Download template</a>
      <input className="text-[14px]" type="file" accept=".csv,.xlsx,.xls,text/csv" onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); setRows([]); }} />
      <button className="btn" disabled={!file || busy} onClick={() => send(false)}>Preview</button>
      {headers.length > 0 && (
        <div className="card flex flex-col gap-2 p-4">
          {SHEET_FIELDS.map((field) => (
            <label key={field} className="flex items-center justify-between gap-3 text-[14px]">
              <span className="capitalize">{label(field)}</span>
              <select className="field !h-10 !w-40" value={map[field] ?? -1} onChange={(e) => setMap((m) => ({ ...m, [field]: Number(e.target.value) }))}>
                <option value={-1}>Skip</option>
                {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
              </select>
            </label>
          ))}
          <button className="btn-secondary" disabled={busy} onClick={() => send(false)}>Check again</button>
        </div>
      )}
      {rows.length > 0 && (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.line} className="card px-4 py-3 text-[14px]">
              <div className="flex items-baseline justify-between gap-3"><span className="truncate font-medium">{row.title || "No title"}</span><span>{row.status}</span></div>
              <p className="text-[12px] text-ink-muted">{row.message}{row.ticket ? `. ${row.ticket}` : ""}{row.centre ? `. ${row.centre}` : ""}</p>
            </div>
          ))}
          <button className="btn" disabled={busy || !rows.some((r) => r.status === "ok")} onClick={() => send(true)}>Import ready rows</button>
        </div>
      )}
      {msg && <p className="text-[14px]">{msg}</p>}
    </div>
  );
}

function label(field: SheetField): string {
  if (field === "ticket") return "Ticket number";
  if (field === "size") return "Size";
  return field[0].toUpperCase() + field.slice(1);
}
