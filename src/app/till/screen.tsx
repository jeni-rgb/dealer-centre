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
  const [view, setView] = useState<"sale" | "label">("sale");

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

  const tabs = (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex rounded-full bg-surface-2 p-1">{(["sale", "label"] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`h-11 rounded-full px-6 text-[15px] font-semibold ${view === v ? "bg-accent text-cream" : "text-ink-muted"}`}>{v === "sale" ? "Record a sale" : "Print a label"}</button>)}</div>
      <span className="text-[13px] text-ink-muted">{centreName} · <button className="underline" onClick={() => { setPinOk(false); try { localStorage.removeItem(`till-pin-${centreId}`); } catch {} }}>Lock</button></span>
    </div>
  );

  if (view === "sale" && !dealer) return <Shell>{tabs}<SaleView centreId={centreId} pin={pin} onWrongPin={() => { setPinOk(false); try { localStorage.removeItem(`till-pin-${centreId}`); } catch {} }} /></Shell>;

  if (!dealer) return (
    <Shell>
      {tabs}
      <div className="mb-5 flex items-baseline justify-between"><h1 className="text-[24px] font-semibold">Whose item is it?</h1><span className="text-[13px] text-ink-muted">{centreName}</span></div>
      {dealers.length === 0 && <p className="card p-6 text-[14px] text-ink-muted">No approved dealers yet. Dealers appear here once they have joined {centreName} and been approved on the Dealers page.</p>}
      <div className="grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-6">
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

type Found = { item: { id: string; sku: string; title: string; price_pence: number; status: string } | null; dealer: { name: string; code: string } | null; ticket: string };

/** Record a sale at the moment of purchase: scan or type the ticket, confirm the price, Cash or Card. */
function SaleView({ centreId, pin, onWrongPin }: { centreId: string; pin: string; onWrongPin: () => void }) {
  const [ticket, setTicket] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [looking, setLooking] = useState(false);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ ticket: string; amount: string; pay: string; who: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function lookup(e?: React.FormEvent) {
    e?.preventDefault();
    if (ticket.trim().length < 3) return;
    setLooking(true); setErr(null); setFound(null);
    try {
      const r = await fetch(`/api/till/lookup?centre=${centreId}&pin=${encodeURIComponent(pin)}&ticket=${encodeURIComponent(ticket)}`, { cache: "no-store" });
      if (r.status === 401) return onWrongPin();
      const j = (await r.json()) as Found;
      setFound(j);
      setPrice(j.item ? (j.item.price_pence / 100).toString() : "");
    } catch { setErr("Could not look that up. Try again."); }
    setLooking(false);
  }
  const key = (k: string) => {
    if (k === "⌫") return setPrice((p) => p.slice(0, -1));
    if (k === "." && price.includes(".")) return;
    if (price.includes(".") && price.split(".")[1].length >= 2) return;
    setPrice((p) => (p === "0" && k !== "." ? k : p + k));
  };
  async function record(pay: "CASH" | "CARD") {
    if (!found) return;
    const pence = Math.round(parseFloat(price || "0") * 100);
    if (!(pence > 0)) return setErr("Enter the price paid.");
    setBusy(true); setErr(null);
    const r = await fetch("/api/till/sale", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ centre_id: centreId, pin, ticket: found.ticket, amount_pence: pence, payment_type: pay }) });
    const j = await r.json(); setBusy(false);
    if (r.status === 401) return onWrongPin();
    if (!r.ok) return setErr(j.error ?? "Could not record that");
    setDone({ ticket: found.ticket, amount: price, pay: pay === "CASH" ? "cash" : "card", who: found.item?.title ?? found.dealer?.name ?? "ticket only" });
    setFound(null); setTicket(""); setPrice("");
  }
  const sold = found?.item?.status === "sold";

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8">
      <div>
        <h1 className="text-[24px] font-semibold">Scan or type the ticket</h1>
        <form onSubmit={lookup} className="mt-4 flex gap-2">
          <input className="field ticket flex-1 !h-16 uppercase !text-[26px]" placeholder="B14 0372" value={ticket} onChange={(e) => setTicket(e.target.value)} autoFocus autoCapitalize="characters" autoCorrect="off" enterKeyHint="go" />
          <button type="submit" className="btn-dark !h-16 !px-6 !text-[18px]" disabled={looking}>{looking ? "…" : "Find"}</button>
        </form>
        {done && !found && (
          <div className="mt-6 rounded-[16px] border border-[#BFD3C4] bg-success-soft p-5 text-success">
            <div className="text-[13px] font-semibold uppercase tracking-wide">Recorded</div>
            <div className="mt-1 text-[22px] font-semibold">{done.who}</div>
            <div className="text-[16px]">{displaySku(done.ticket)} · £{done.amount} · {done.pay}. The dealer has been told.</div>
          </div>
        )}
        {found && (
          <div className="mt-6">
            <div className="ticket text-[48px] leading-none">{displaySku(found.ticket)}</div>
            <div className="mt-2 text-[22px] font-medium">{found.item?.title ?? "Not in the app"}</div>
            <div className="text-[16px] text-ink-muted">{found.dealer ? `${found.dealer.code} · ${found.dealer.name}` : "Dealer not recognised. It will be recorded against the ticket number only."}</div>
            {sold && <div className="mt-3 rounded-[12px] bg-warning-soft px-4 py-3 text-[14px] text-warning">Already recorded as sold. Record again only if it really sold twice.</div>}
            <div className="card mt-5 flex h-24 items-center gap-2 px-6"><span className="text-[40px] text-ink-muted">£</span><span className="num text-[56px] font-bold">{price || <span className="text-ink-muted">0</span>}</span><span className="ml-auto text-[13px] text-ink-muted">Price paid. Change it if the dealer gave a discount.</span></div>
            {err && <p className="mt-3 text-[14px] text-danger">{err}</p>}
          </div>
        )}
        {!found && !done && <p className="mt-6 text-[15px] leading-6 text-ink-muted">Customer brings the ticket to the till. Scan it, or type the code and number, check the price, tap Cash or Card. Four seconds, and the dealer&rsquo;s phone buzzes.</p>}
      </div>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map((k) => (
            <button key={k} onClick={() => key(k)} disabled={!found} className="card h-20 text-[32px] font-semibold active:bg-accent-soft disabled:opacity-40">{k}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn !h-20 !text-[24px]" disabled={!found || busy} onClick={() => record("CASH")}>{busy ? "…" : "Cash"}</button>
          <button className="btn-dark !h-20 !text-[24px]" disabled={!found || busy} onClick={() => record("CARD")}>{busy ? "…" : "Card"}</button>
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-surface p-8 text-ink">{children}</main>;
}
