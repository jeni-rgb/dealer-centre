"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function MoveCentre({ dealerId, current, centres }: { dealerId: string; current: { id: string; name: string }[]; centres: { id: string; name: string }[] }) {
  const router = useRouter();
  const [from, setFrom] = useState<string>(current[0]?.id ?? "");
  const [to, setTo] = useState<string>("");
  const [items, setItems] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function go() {
    if (!to) return;
    if (!confirm(`Move this dealer${from ? ` from ${current.find((c) => c.id === from)?.name}` : ""} to ${centres.find((c) => c.id === to)?.name}${items ? ", including live stock" : ""}?`)) return;
    setBusy(true);
    const r = await fetch(`/api/admin/dealers/${dealerId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "move_centre", from_centre_id: from || null, to_centre_id: to, move_items: items }) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    setMsg(r.ok ? "Moved. Tell the new centre to set pitch and rent." : `Failed: ${j.error}`); router.refresh();
  }
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      <span className="font-semibold">Move to another centre</span>
      <div className="flex flex-wrap items-center gap-2">
        <select className="field !h-9 !w-auto !text-[13px]" value={from} onChange={(e) => setFrom(e.target.value)}><option value="">Not leaving anywhere</option>{current.map((c) => <option key={c.id} value={c.id}>Leave {c.name}</option>)}</select>
        <span className="text-ink-muted">→</span>
        <select className="field !h-9 !w-auto !text-[13px]" value={to} onChange={(e) => setTo(e.target.value)}><option value="">Choose centre</option>{centres.filter((c) => c.id !== from).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={items} onChange={(e) => setItems(e.target.checked)} /> move live stock</label>
        <button className="btn-sm" disabled={busy || !to} onClick={go}>{busy ? "…" : "Move"}</button>
      </div>
      {msg && <span className="text-ink-muted">{msg}</span>}
    </div>
  );
}
