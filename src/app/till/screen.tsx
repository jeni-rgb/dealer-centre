"use client";
import { useEffect, useState } from "react";
import { displaySku } from "@/lib/sku";

type Dealer = { id: string; name: string; code: string; pitches: string };

export function TillScreen({ centreId, centreName, dealers }: { centreId: string; centreName: string; dealers: Dealer[] }) {
  const [pin, setPin] = useState("");
  const [pinOk, setPinOk] = useState(false);
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [price, setPrice] = useState("");
  const [title, setTitle] = useState("");
  const [ticket, setTicket] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ sku: string; printed: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`till-pin-${centreId}`);
    if (saved) { setPin(saved); setPinOk(true); }
  }, [centreId]);

  function reset() { setDealer(null); setPrice(""); setTitle(""); setTicket(""); setResult(null); setErr(null); }

  async function print() {
    if (!dealer) return;
    const pence = Math.round(parseFloat(price || "0") * 100);
    if (!(pence > 0)) return setErr("Enter a price");
    setBusy(true); setErr(null);
    const r = await fetch("/api/till/label", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ centre_id: centreId, pin, dealer_id: dealer.id, title: title.trim() || `${dealer.code} item`, price_pence: pence, ticket_no: ticket.trim() || undefined }),
    });
    const j = await r.json();
    setBusy(false);
    if (r.status === 401) { setPinOk(false); localStorage.removeItem(`till-pin-${centreId}`); return; }
    if (!r.ok) return setErr(j.error ?? "Failed");
    setResult({ sku: j.sku, printed: !!j.printed_to });
    localStorage.setItem(`till-pin-${centreId}`, pin);
  }

  if (!pinOk) {
    return (
      <main className="mx-auto max-w-sm px-6 pt-24 text-center">
        <h1 className="text-lg font-medium">{centreName}</h1>
        <p className="mt-1 text-sm text-ink-2">Till PIN</p>
        <input className="field num mt-4 text-center text-3xl tracking-[0.5em]" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus />
        <button className="btn mt-4 w-full py-4 text-lg" onClick={() => { if (pin.length >= 4) setPinOk(true); }}>Open till</button>
      </main>
    );
  }

  if (result) {
    return (
      <main className="mx-auto max-w-lg px-6 pt-20 text-center">
        <div className="text-sm text-ink-3">Label {result.printed ? "printing" : "ready"}</div>
        <div className="sku mt-3 text-7xl font-medium">{displaySku(result.sku)}</div>
        <div className="mt-2 text-2xl">{dealer?.name}</div>
        {!result.printed && <p className="mt-4 text-sm text-ink-2">No cloud printer set up. The dealer can print it from their app, or add a PrintNode printer in centre settings.</p>}
        <button className="btn mt-10 w-full py-5 text-xl" onClick={reset}>Next label</button>
      </main>
    );
  }

  if (!dealer) {
    return (
      <main className="px-6 py-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="text-lg font-medium">Whose item is it?</h1>
          <span className="text-xs text-ink-3">{centreName}</span>
        </div>
        <div className="grid grid-cols-4 gap-3 md:grid-cols-6">
          {dealers.map((d) => (
            <button key={d.id} onClick={() => setDealer(d)} className="rounded-[4px] border border-rule bg-white p-3 text-left active:bg-paper-2">
              <div className="sku text-4xl font-medium leading-none">{d.code}</div>
              <div className="mt-2 truncate text-xs text-ink-2">{d.name}</div>
              {d.pitches && <div className="text-xs text-ink-3">Pitch {d.pitches}</div>}
            </button>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-6">
      <button className="text-sm text-ink-3" onClick={reset}>← Back</button>
      <div className="mt-4 flex items-baseline gap-3">
        <span className="sku text-5xl font-medium">{dealer.code}</span>
        <span className="text-lg">{dealer.name}</span>
      </div>
      <label className="mt-8 block">
        <span className="mb-1 block text-sm text-ink-3">Price</span>
        <div className="flex items-center">
          <span className="mr-3 text-4xl">£</span>
          <input className="field num text-5xl py-4" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} autoFocus />
        </div>
      </label>
      <label className="mt-5 block">
        <span className="mb-1 block text-sm text-ink-3">What is it, optional</span>
        <input className="field text-xl" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Blue jug" />
      </label>
      <label className="mt-5 block">
        <span className="mb-1 block text-sm text-ink-3">Dealer's own ticket number, optional</span>
        <input className="field sku text-xl" value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="If the tag already has one" />
      </label>
      {err && <p className="mt-3 text-oxblood">{err}</p>}
      <button className="btn mt-8 w-full py-5 text-2xl" disabled={busy} onClick={print}>{busy ? "Printing…" : "Print label"}</button>
    </main>
  );
}
