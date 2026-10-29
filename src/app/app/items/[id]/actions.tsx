"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ItemActions({ id, status, price }: { id: string; status: string; price: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newPrice, setNewPrice] = useState((price / 100).toString());

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/items/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="mt-8 space-y-2">
      <a href={`/api/labels/batch?ids=${id}`} target="_blank" rel="noreferrer" className="btn-secondary w-full">Print label</a>
      {status === "live" && !editing && (
        <button className="btn-secondary w-full" onClick={() => setEditing(true)}>Change price</button>
      )}
      {editing && (
        <div className="flex gap-2">
          <input className="field num" inputMode="decimal" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
          <button className="btn" disabled={busy} onClick={() => patch({ price_pence: Math.round(parseFloat(newPrice) * 100) })}>Save</button>
        </div>
      )}
      {status === "live" && (
        <button className="w-full py-3 text-sm text-oxblood" disabled={busy} onClick={() => confirm("Withdraw this item from every channel?") && patch({ status: "withdrawn" })}>
          Withdraw
        </button>
      )}
    </div>
  );
}
