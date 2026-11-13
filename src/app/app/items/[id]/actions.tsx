"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { nextLabelTitle } from "@/lib/labels/title";
import { UkDate } from "@/components/uk-date";

type Sale = { id: string; amount_pence: number; payment_type: string | null; sold_at: string } | null;

export function ItemActions({ id, status, price, title, sale, atCentre, cost = null, sumupPay = false, squarePay = false }: { id: string; status: string; price: number; title: string; sale: Sale; atCentre: boolean; cost?: number | null; sumupPay?: boolean; squarePay?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"none" | "price" | "sold" | "correct" | "cost" | "label">("none");
  const [name, setName] = useState(title);
  const [newCost, setNewCost] = useState(cost !== null ? (cost / 100).toString() : "");
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
  async function take(reader: "sumup" | "square") {
    setBusy(true); setErr(null);
    const r = await fetch("/api/pay/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ item_id: id, amount_pence: pence(paid), reader }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok || !j.url) return setErr(j.error ?? "Could not open the reader");
    window.location.href = j.url;
  }

  async function reprint() {
    const next = nextLabelTitle(title, name);
    if (next.error) return setErr(next.error);
    setBusy(true); setErr(null);
    if (next.title) {
      const saved = await fetch(`/api/items/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: next.title }) });
      if (!saved.ok) { setBusy(false); return setErr((await saved.json().catch(() => ({}))).error ?? "Could not save the name."); }
    }
    const r = await fetch("/api/labels/print", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ item_ids: [id] }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Something went wrong");
    if (j.browser) { window.location.href = String(j.browser).replace("/api/labels/batch", "/app/labels/print"); return; }
    setMode("none"); router.refresh();
  }

  return (
    <div className="flex flex-col gap-2.5">
      {status === "live" && mode === "none" && (
        <>
          <button className="btn" onClick={() => setMode("sold")}>Mark as sold</button>
          <div className="grid grid-cols-2 gap-2.5">
            <button className="btn-secondary" onClick={() => setMode("price")}>Edit price</button>
            <button className="btn-outline" disabled={busy} onClick={() => { setName(title); setErr(null); setMode("label"); }}>Reprint label</button>
          </div>
        </>
      )}

      {mode === "label" && (
        <div className="card flex flex-col gap-3 p-4">
          <span className="text-[13px] font-medium">Name on the label</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <p className="text-[12px] text-ink-muted">Stock, the till and any shop use this name. The ticket number stays the same.</p>
          {err && <p className="text-[13px] text-danger">{err}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-outline" onClick={() => { setMode("none"); setName(title); }}>Cancel</button>
            <button className="btn-dark" disabled={busy} onClick={() => reprint()}>Reprint</button>
          </div>
        </div>
      )}

      {mode === "price" && (
        <div className="card flex flex-col gap-3 p-4">
          <span className="text-[13px] font-medium">New asking price</span>
          <Money v={newPrice} set={setNewPrice} />
          <p className="text-[12px] text-ink-muted">Updates the till, your Shopify and any centre store. Print a new label if the price is on it.</p>
          <div className="grid grid-cols-2 gap-2"><button className="btn-outline" onClick={() => setMode("none")}>Cancel</button><button className="btn-dark" disabled={busy} onClick={() => call(`/api/items/${id}`, "PATCH", { price_pence: pence(newPrice) })}>Save</button></div>
        </div>
      )}

      {mode === "sold" && (
        <div className="card flex flex-col gap-3 p-4">
          <span className="text-[13px] font-medium">What did it sell for?</span>
          <Money v={paid} set={setPaid} />
          {where === "centre" && <PayToggle pay={pay} setPay={setPay} />}
          {atCentre && (
            <div className="flex rounded-[10px] bg-surface-2 p-0.5">{(["centre", "elsewhere"] as const).map((w) => <button key={w} type="button" onClick={() => setWhere(w)} className={`h-10 flex-1 rounded-[8px] text-[13px] font-semibold ${where === w ? "bg-white shadow-sm" : "text-ink-muted"}`}>{w === "centre" ? "At the centre" : "Away"}</button>)}</div>
          )}
          <UkDate value={date} max={new Date().toISOString().slice(0, 10)} onChange={setDate} />
          <p className="text-[12px] text-ink-muted">{where === "centre" ? "On the centre statement." : "Not on a centre payout. Fairs and home sales."}</p>
          {err && <p className="text-[13px] text-danger">{err}</p>}
          {where === "elsewhere" ? (
            <div className="grid grid-cols-2 gap-2">
              {sumupPay && <button className="btn" disabled={busy || !(pence(paid) > 0)} onClick={() => take("sumup")}>SumUp</button>}
              {squarePay && <button className="btn" disabled={busy || !(pence(paid) > 0)} onClick={() => take("square")}>Square</button>}
              <button className="btn-secondary" disabled={busy || !(pence(paid) > 0)} onClick={() => call(`/api/items/${id}/sold`, "POST", { amount_pence: pence(paid), payment_type: "CASH", where: "elsewhere", sold_at: `${date}T12:00:00Z` })}>Cash</button>
              <button className="btn-outline" disabled={busy || !(pence(paid) > 0)} onClick={() => call(`/api/items/${id}/sold`, "POST", { amount_pence: pence(paid), payment_type: "other", where: "elsewhere", sold_at: `${date}T12:00:00Z` })}>Already paid</button>
              <button className="btn-ghost col-span-2" onClick={() => setMode("none")}>Cancel</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2"><button className="btn-outline" onClick={() => setMode("none")}>Cancel</button><button className="btn-dark" disabled={busy || !(pence(paid) > 0)} onClick={() => call(`/api/items/${id}/sold`, "POST", { amount_pence: pence(paid), payment_type: pay, where, sold_at: `${date}T12:00:00Z` })}>Mark sold</button></div>
          )}
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
          <div className="grid grid-cols-2 gap-2"><button className="btn-outline" onClick={() => setMode("none")}>Cancel</button><button className="btn-dark" disabled={busy} onClick={() => call(`/api/sales/${sale.id}`, "PATCH", { amount_pence: pence(paid), payment_type: pay })}>Save</button></div>
        </div>
      )}

      {mode === "none" && (
        <button className="btn-outline" onClick={() => setMode("cost")}>{cost === null ? "Add what you paid" : "Edit what you paid"}</button>
      )}

      {mode === "cost" && (
        <div className="card flex flex-col gap-3 p-4">
          <span className="text-[13px] font-medium">What you paid</span>
          <Money v={newCost} set={setNewCost} />
          <p className="text-[12px] text-ink-muted">Private. Only you see it. It works out your margin and the haggle guide, and goes nowhere else.</p>
          {err && <p className="text-[13px] text-danger">{err}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-outline" onClick={() => { setMode("none"); setNewCost(cost !== null ? (cost / 100).toString() : ""); }}>Cancel</button>
            <button className="btn-dark" disabled={busy} onClick={() => call(`/api/items/${id}`, "PATCH", { cost_pence: newCost.trim() === "" ? null : pence(newCost) })}>Save</button>
          </div>
        </div>
      )}

      {status === "live" && mode === "none" && (
        <button className="h-11 text-[14px] font-medium text-danger" disabled={busy} onClick={() => confirm("Withdraw this item from every channel?") && call(`/api/items/${id}`, "PATCH", { status: "withdrawn" })}>Withdraw from sale</button>
      )}
      {status === "withdrawn" && <button className="btn-secondary" disabled={busy} onClick={() => call(`/api/items/${id}`, "PATCH", { status: "live" })}>Put back on sale</button>}
      {(status === "live" || status === "withdrawn") && mode === "none" && (
        <button className="h-11 text-[14px] font-medium text-danger" disabled={busy} onClick={async () => {
          if (!confirm("Delete this item for good? It comes off every channel and can't be undone.")) return;
          const r = await fetch(`/api/items/${id}`, { method: "DELETE" });
          if (r.ok) router.push("/app/stock"); else alert((await r.json().catch(() => ({}))).error ?? "Couldn't delete");
        }}>Delete item</button>
      )}
    </div>
  );
}

function PayToggle({ pay, setPay }: { pay: "CASH" | "CARD"; setPay: (p: "CASH" | "CARD") => void }) {
  return <div className="flex rounded-[10px] bg-surface-2 p-0.5">{(["CASH", "CARD"] as const).map((p) => <button key={p} type="button" onClick={() => setPay(p)} className={`h-10 flex-1 rounded-[8px] text-[13px] font-semibold ${pay === p ? "bg-white shadow-sm" : "text-ink-muted"}`}>{p === "CARD" ? "Card" : "Cash"}</button>)}</div>;
}
function Money({ v, set }: { v: string; set: (s: string) => void }) {
  return <div className="flex h-12 items-center gap-1.5 rounded-[12px] border border-border px-3.5"><span className="text-ink-muted">£</span><input className="num min-w-0 flex-1 border-0 text-[18px] font-semibold outline-none" inputMode="decimal" value={v} onChange={(e) => set(e.target.value)} autoFocus /></div>;
}
