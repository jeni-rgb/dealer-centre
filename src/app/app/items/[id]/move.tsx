"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Place = { id: string; name: string; qty: number };

/** Move a number of this line from one place to another. */
export function MoveStock({ itemId, places }: { itemId: string; places: Place[] }) {
  const router = useRouter();
  const [from, setFrom] = useState(places[0]?.id ?? "home");
  const [to, setTo] = useState(places[1]?.id ?? "home");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (places.length < 2) return null;

  async function go() {
    setBusy(true); setNote(null);
    const r = await fetch(`/api/items/${itemId}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ from, to, qty: Math.round(Number(qty)) }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setNote(j.error ?? "Could not move");
    setNote("Moved.");
    router.refresh();
  }

  return (
    <div className="card flex flex-col gap-2 p-4">
      <span className="text-[15px] font-medium">Move</span>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[13px] text-ink-muted">From
          <select className="field" value={from} onChange={(e) => setFrom(e.target.value)}>{places.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.qty})</option>)}</select>
        </label>
        <label className="text-[13px] text-ink-muted">To
          <select className="field" value={to} onChange={(e) => setTo(e.target.value)}>{places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </label>
      </div>
      <div className="flex gap-2">
        <input className="field" inputMode="numeric" aria-label="How many" value={qty} onChange={(e) => setQty(e.target.value)} />
        <button type="button" className="btn-sm" disabled={busy} onClick={go}>{busy ? "Moving" : "Move"}</button>
      </div>
      {note && <p className="text-[14px]">{note}</p>}
    </div>
  );
}
