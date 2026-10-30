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
    setBusy(false); setEditing(false); router.refresh();
  }
  async function reprint() {
    setBusy(true);
    await fetch(`/api/labels/print`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ item_ids: [id] }) });
    setBusy(false); router.refresh();
  }

  return (
    <div className="flex flex-col gap-2.5">
      {status === "live" && !editing && (
        <div className="grid grid-cols-2 gap-2.5">
          <button className="btn-secondary" onClick={() => setEditing(true)}>Edit price</button>
          <button className="btn-secondary" disabled={busy} onClick={reprint}>Reprint label</button>
        </div>
      )}
      {editing && (
        <div className="flex gap-2">
          <div className="flex h-12 flex-1 items-center gap-1.5 rounded-[12px] border border-border px-3.5"><span className="text-ink-muted">£</span><input className="num min-w-0 flex-1 border-0 text-[18px] font-semibold outline-none" inputMode="decimal" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} autoFocus /></div>
          <button className="btn-dark" disabled={busy} onClick={() => patch({ price_pence: Math.round(parseFloat(newPrice) * 100) })}>Save</button>
        </div>
      )}
      {status === "live" && (
        <button className="h-11 text-[14px] font-medium text-danger" disabled={busy} onClick={() => confirm("Withdraw this item from every channel?") && patch({ status: "withdrawn" })}>Withdraw from sale</button>
      )}
      {status === "withdrawn" && <button className="btn-secondary" disabled={busy} onClick={() => patch({ status: "live" })}>Put back on sale</button>}
    </div>
  );
}
