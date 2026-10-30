"use client";
import { useEffect, useState } from "react";
import { displaySku } from "@/lib/sku";

type Dealer = { id: string; name: string; code: string; pitches: string };

/** Quick label for till staff. 1180 x 820 iPad landscape. Dealer tiles at 44px code, keypad, print disabled until a price exists. */
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

  useEffect(() => { try { const s = localStorage.getItem(`till-pin-${centreId}`); if (s) { setPin(s); setPinOk(true); } } catch {} }, [centreId]);
  const reset = () => { setDealer(null); setPrice(""); setTitle(""); setTicket(""); setResult(null); setErr(null); };
  const key = (k: string) => {
    if (k === "⌫") return setPrice((p) => p.slice(0, -1));
    if (k === "." && price.includes(".")) return;
    if (price.includes(".") && price.split(".")[1].length >= 2) return;
    setPrice((p) => (p === "0" && k !== "." ? k : p + k));
  };

  async function print() {
    if (!dealer) return;
    const pence = Math.round(parseFloat(price || "0") * 100);
    if (!(pence > 0)) return;
    setBusy(true); setErr(null);
    const r = await fetch("/api/till/label", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ centre_id: centreId, pin, dealer_id: dealer.id, title: title.trim() || `${dealer.code} item`, price_pence: pence, ticket_no: ticket.trim() || undefined }) });
    const j = await r.json(); setBusy(false);
    if (r.status === 401) { setPinOk(false); try { localStorage.removeItem(`till-pin-${centreId}`); } catch {} return; }
    if (!r.ok) return setErr(j.error ?? "Failed");
    setResult({ sku: j.sku, printed: !!j.printed_to });
    try { localStorage.setItem(`till-pin-${centreId}`, pin); } catch {}
  }

  if (!pinOk) return (
    <Shell><div className="mx-auto mt-24 max-w-sm text-center">
      <h1 className="text-[24px] font-semibold">{centreName}</h1><p className="mt-1 text-[14px] text-ink-muted">Till PIN</p>
      <input className="field num mt-6 !h-16 text-center !text-[32px] tracking-[0.5em]" inputMode="numeric" type="password" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus />
      <button className="btn mt-4" onClick={() => pin.length >= 4 && setPinOk(true)}>Open till</button>
    </div></Shell>
  );

  if (result) return (
    <Shell><div className="mx-auto mt-16 max-w-lg text-center">
      <div className="text-[14px] text-ink-muted">Label {result.printed ? "printing" : "ready"}</div>
      <div className="ticket mt-3 text-[88px] leading-none">{displaySku(result.sku)}</div>
      <div className="mt-3 text-[24px] font-medium">{dealer?.name}</div>
      {!result.printed && <p className="mt-4 text-[14px] text-ink-muted">No cloud printer set up. The dealer can print it from their app, or add a PrintNode printer in centre settings.</p>}
      <button className="btn mt-10 !h-16 !text-[20px]" onClick={reset}>Next label</button>
    </div></Shell>
  );

  if (!dealer) return (
    <Shell>
      <div className="mb-5 flex items-baseline justify-between"><h1 className="text-[24px] font-semibold">Whose item is it?</h1><span className="text-[13px] text-ink-muted">{centreName}</span></div>
      <div className="grid grid-cols-5 gap-3 lg:grid-cols-6">
        {dealers.map((d) => (
          <button key={d.id} onClick={() => setDealer(d)} className="card flex min-h-[112px] flex-col items-start p-4 text-left active:bg-accent-soft">
            <span className="ticket text-[44px] leading-none">{d.code}</span>
            <span className="mt-2 w-full truncate text-[13px] text-ink-muted">{d.name}</span>
            {d.pitches && <span className="text-[12px] text-ink-muted">Pitch {d.pitches}</span>}
          </button>
        ))}
      </div>
    </Shell>
  );

  const valid = parseFloat(price || "0") > 0;
  return (
    <Shell>
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8">
        <div>
          <button className="text-[14px] text-ink-muted" onClick={reset}>← All dealers</button>
          <div className="mt-4 flex items-baseline gap-3"><span className="ticket text-[56px] leading-none">{dealer.code}</span><span className="text-[20px]">{dealer.name}</span></div>
          <div className="card mt-6 flex h-24 items-center gap-2 px-6"><span className="text-[40px] text-ink-muted">£</span><span className="num text-[56px] font-bold">{price || <span className="text-ink-muted">0</span>}</span></div>
          <div className="mt-4"><label className="field-label">What is it, optional</label><input className="field !text-[18px]" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Blue jug" /></div>
          <div className="mt-3"><label className="field-label">Dealer's own ticket number, optional</label><input className="field ticket !text-[18px]" value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="If the tag already has one" /></div>
          {err && <p className="mt-3 text-[14px] text-danger">{err}</p>}
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map((k) => (
              <button key={k} onClick={() => key(k)} className="card h-20 text-[32px] font-semibold active:bg-accent-soft">{k}</button>
            ))}
          </div>
          <button className="btn !h-20 !text-[24px]" disabled={!valid || busy} onClick={print}>{busy ? "Printing…" : "Print label"}</button>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-surface p-8 text-ink">{children}</main>;
}
