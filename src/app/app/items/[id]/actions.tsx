"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Sale = { id: string; amount_pence: number; payment_type: string | null; sold_at: string } | null;

export function ItemActions({ id, status, price, sale, atCentre }: { id: string; status: string; price: number; sale: Sale; atCentre: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"none" | "price" | "sold" | "correct">("none");
  const [newPrice, setNewPrice] = useState((price / 100).toString());
  const [paid, setPaid] = useState(((sale?.amount_pence ?? price) / 100).toString());
  const [pay, setPay] = useState<"CASH" | "CARD">(sale?.payment_type === "CARD" ? "CARD" : "CASH");
  const [where, setWhere] = useState<"centre" | "elsewhere">(atCentre ? "centre" : "elsewhere");
  const [date, setDate] = useState((sale?.sold_at ?? new Date().toISOString()).slice(0, 10));
  const [err, setErr] = useState<string | null>(null);

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true); setErr(null);
    const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Something went wrong");
    setMode("none"); router.refresh();
  }
  const pence = (v: string) => Math.round(parseFloat(v || "0") * 100);

  return (
    <div className="flex flex-col gap-2.5">
      {status === "live" && mode === "none" && (
        <>
          <button className="btn" onClick={() => setMode("sold")}>Mark as sold</button>
          <div className="grid grid-cols-2 gap-2.5">
            <button className="btn-secondary" onClick={() => setMode("price")}>Edit price</button>
            <button className="btn-secondary" disabled={busy} onClick={() => call("/api/labels/print", "POST", { item_ids: [id] })}>Reprint label</button>
          </div>
        </>
      )}

      {mode === "price" && (
        <div className="card flex flex-col gap-3 p-4">
          <span className="text-[13px] font-medium">New asking price</span>
          <Money v={newPrice} set={setNewPrice} />
          <p className="text-[12px] text-ink-muted">Updates the till, your Shopify and any centre store. Print a new label if the price is on it.</p>
          <div className="grid grid-cols-2 gap-2"><button className="btn-secondary" onClick={() => setMode("none")}>Cancel</button><button className="btn-dark" disabled={busy} onClick={() => call(`/api/items/${id}`, "PATCH", { price_pence: pence(newPrice) })}>Save</button></div>
        </div>
      )}

      {mode === "sold" && (
        <div className="card flex flex-col gap-3 p-4">
          <span className="text-[13px] font-medium">What did it sell for?</span>
          <Money v={paid} set={setPaid} />
          <PayToggle pay={pay} setPay={setPay} />
          {atCentre && (
            <div className="flex rounded-[10px] bg-surface-2 p-0.5">{(["centre", "elsewhere"] as const).map((w) => <button key={w} type="button" onClick={() => setWhere(w)} className={`h-10 flex-1 rounded-[8px] text-[13px] font-semibold ${where === w ? "bg-white shadow-sm" : "text-ink-muted"}`}>{w === "centre" ? "At the centre" : "Elsewhere"}</button>)}</div>
          )}
          <label className="flex items-center justify-between text-[13px] text-ink-muted">Sold on<input type="date" className="field !h-10 !w-40 !text-[13px]" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} /></label>
          <p className="text-[12px] text-ink-muted">{where === "centre" ? "Goes on your centre statement with commission, same as if the till had recorded it." : "No centre commission. Use this for fairs, home sales or anywhere the app does not watch."}</p>
          {err && <p className="text-[13px] text-danger">{err}</p>}
          <div className="grid grid-cols-2 gap-2"><button className="btn-secondary" onClick={() => setMode("none")}>Cancel</button><button className="btn-dark" disabled={busy || !(pence(paid) > 0)} onClick={() => call(`/api/items/${id}/sold`, "POST", { amount_pence: pence(paid), payment_type: pay, where, sold_at: `${date}T12:00:00Z` })}>Mark sold</button></div>
        </div>
      )}

      {status === "sold" && sale && mode === "none" && (
        <div className="grid grid-cols-2 gap-2.5">
          <button className="btn-secondary" onClick={() => setMode("correct")}>Correct sold price</button>
          <button className="h-12 text-[14px] font-medium text-danger" disabled={busy} onClick={() => confirm("Undo this sale? The item goes back on sale everywhere.") && call(`/api/sales/${sale.id}`, "DELETE")}>Undo sale</button>
        </div>
      )}

      {mode === "correct" && sale && (
        <div className="card flex flex-col gap-3 p-4">
          <span className="text-[13px] font-medium">Price actually paid</span>
          <Money v={paid} set={setPaid} />
          <PayToggle pay={pay} setPay={setPay} />
          <p className="text-[12px] text-ink-muted">Dealers give discounts. Put the real figure here and the statement follows it. The ticket price is kept for reference.</p>
          {err && <p className="text-[13px] text-danger">{err}</p>}
          <div className="grid grid-cols-2 gap-2"><button className="btn-secondary" onClick={() => setMode("none")}>Cancel</button><button className="btn-dark" disabled={busy} onClick={() => call(`/api/sales/${sale.id}`, "PATCH", { amount_pence: pence(paid), payment_type: pay })}>Save</button></div>
        </div>
      )}

      {status === "live" && mode === "none" && (
        <button className="h-11 text-[14px] font-medium text-danger" disabled={busy} onClick={() => confirm("Withdraw this item from every channel?") && call(`/api/items/${id}`, "PATCH", { status: "withdrawn" })}>Withdraw from sale</button>
      )}
      {status === "withdrawn" && <button className="btn-secondary" disabled={busy} onClick={() => call(`/api/items/${id}`, "PATCH", { status: "live" })}>Put back on sale</button>}
    </div>
  );
}

function PayToggle({ pay, setPay }: { pay: "CASH" | "CARD"; setPay: (p: "CASH" | "CARD") => void }) {
  return <div className="flex rounded-[10px] bg-surface-2 p-0.5">{(["CASH", "CARD"] as const).map((p) => <button key={p} type="button" onClick={() => setPay(p)} className={`h-10 flex-1 rounded-[8px] text-[13px] font-semibold ${pay === p ? "bg-white shadow-sm" : "text-ink-muted"}`}>{p === "CARD" ? "Card" : "Cash"}</button>)}</div>;
}
function Money({ v, set }: { v: string; set: (s: string) => void }) {
  return <div className="flex h-12 items-center gap-1.5 rounded-[12px] border border-border px-3.5"><span className="text-ink-muted">£</span><input className="num min-w-0 flex-1 border-0 text-[18px] font-semibold outline-none" inputMode="decimal" value={v} onChange={(e) => set(e.target.value)} autoFocus /></div>;
}
