"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone, Pill } from "@/components/ui";
import { isValidDealerCode, suggestDealerCode } from "@/lib/sku";

type Dealer = { name: string; code: string; plan: string; stripe_customer_id: string | null } | null;
const STEPS = ["business", "card", "centre", "till", "printers", "shopify", "summary"] as const;
type Step = (typeof STEPS)[number];
type HP = { idx: number; signup: boolean; step: Step; next: () => void };

export function DealerSetup({ email, initial, dealer, centres, hasShopify, ownPrinters }: { email: string; initial: string; dealer: Dealer; centres: { name: string; status: string }[]; hasShopify: boolean; ownPrinters: number }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>((STEPS as readonly string[]).includes(initial) ? (initial as Step) : "business");
  const go = (s: Step) => { setStep(s); router.replace(`/signup/dealer?step=${s}`); };
  const next = () => go(STEPS[Math.min(STEPS.indexOf(step) + 1, STEPS.length - 1)]);
  const idx = STEPS.indexOf(step);
  const signup = idx < 2;

  const hp = { idx, signup, step, next };

  return (
    <Phone>
      {step === "business" && <Business email={email} hp={hp} onDone={() => (window.location.href = "/api/billing/checkout")} />}
      {step === "card" && (
        <>
          <StepHeader {...hp} title="Card and 30 day trial" sub="Nothing is charged today. First payment in 30 days, email three days before." />
          <div className="flex flex-col gap-3 px-5 pt-6">
            <div className="card divide-y divide-border">
              {[["25", "Up to 50 items", "£25 a month"], ["100", "Up to 100 items", "£100 a month"], ["150", "Up to 250 items", "£150 a month"]].map(([t, a, b]) => (
                <a key={t} href={`/api/billing/checkout?tier=${t}`} className="flex h-[56px] items-center justify-between px-4 text-[14px]"><span>{a}</span><span className="flex items-center gap-3"><span className="num font-semibold">{b}</span><span className="text-accent">Choose</span></span></a>
              ))}
            </div>
            <p className="text-[12px] text-ink-muted">Taken on the web by Stripe. Change or cancel any time from Settings.</p>
          </div>
        </>
      )}
      {step === "centre" && <Centre hp={hp} centres={centres} onDone={next} />}
      {step === "till" && (
        <>
          <StepHeader {...hp} title="Your till" sub="Items at a centre go through the centre's till automatically once they connect. Only connect your own Square if you run your own shop." />
          <div className="flex flex-col gap-3 px-5 pt-6">
            <a className="btn-secondary" href="/api/oauth/square?owner=dealer">Connect my own Square</a>
            <button className="btn" onClick={next}>I sell at a centre, continue</button>
          </div>
        </>
      )}
      {step === "printers" && <Printers hp={hp} ownPrinters={ownPrinters} centres={centres} onDone={next} />}
      {step === "shopify" && <Shopify hp={hp} hasShopify={hasShopify} onDone={next} />}
      {step === "summary" && (
        <>
          <StepHeader {...hp} title="You are set" sub="Anything skipped stays in Settings until it is done." />
          <div className="flex flex-col gap-3 px-5 pt-6">
            <div className="card divide-y divide-border">
              <Row label="Business" ok={!!dealer} value={dealer ? `${dealer.name} · ${dealer.code}` : "Not done"} />
              <Row label="Card" ok={!!dealer?.stripe_customer_id} value={dealer?.stripe_customer_id ? "Trial started" : "Not added"} />
              <Row label="Centre" ok={centres.length > 0} value={centres[0] ? `${centres[0].name}${centres[0].status === "active" ? "" : ", awaiting approval"}` : "None yet"} />
              <Row label="Printer" ok={ownPrinters > 0 || centres.length > 0} value={centres.length > 0 ? "Centre till printer" : ownPrinters > 0 ? "Your printer" : "None yet"} />
              <Row label="Shopify" ok={hasShopify} value={hasShopify ? "Connected" : "Not connected"} />
            </div>
            <Link className="btn" href="/app/items/new">List your first item</Link>
            <Link className="btn-ghost" href="/app">Go to Today</Link>
          </div>
        </>
      )}
    </Phone>
  );
}

function Row({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return <div className="flex min-h-[52px] items-center justify-between px-4 py-2 text-[14px]"><span className="font-medium">{label}</span><span className="flex items-center gap-2 text-ink-muted">{value}{ok ? <Pill kind="success">Done</Pill> : <Pill kind="warning">Later</Pill>}</span></div>;
}

function Business({ email, hp, onDone }: { email: string; hp: HP; onDone: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const effective = touched ? code : suggestDealerCode(name);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (name.trim().length < 2) return setErr("Enter your trading name.");
    if (!isValidDealerCode(effective)) return setErr("Dealer code is 2 to 4 characters and starts with a letter.");
    setBusy(true);
    const r = await fetch("/api/signup/dealer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: name.trim(), code: effective }) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Something went wrong");
    onDone();
  }
  return (
    <form onSubmit={submit}>
      <StepHeader {...hp} title="Your business" sub={`Signed in as ${email}`} />
      <div className="flex flex-col gap-4 px-5 pt-6">
        <div><label className="field-label">Trading name</label><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bloom Antiques" autoFocus /></div>
        <div>
          <label className="field-label">Dealer code</label>
          <input className="field ticket uppercase" value={effective} maxLength={4} onChange={(e) => { setTouched(true); setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); }} />
          <p className="mt-1.5 text-[12px] text-ink-muted">Starts every ticket number, for example <span className="ticket">{effective || "B14"} 0001</span>. Locked after your first item.</p>
        </div>
        {err && <p className="text-[13px] text-danger">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? "Saving…" : "Continue"}</button>
      </div>
    </form>
  );
}

function Centre({ hp, centres, onDone }: { hp: HP; centres: { name: string; status: string }[]; onDone: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; address: string | null }[]>([]);
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const [mode, setMode] = useState<"rent" | "commission_only">("rent");
  const [rent, setRent] = useState("");
  const [sched, setSched] = useState("first");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => { const r = await fetch(`/api/centres/search?q=${encodeURIComponent(q)}`); setResults((await r.json()).centres ?? []); }, 250);
    return () => clearTimeout(t);
  }, [q]);
  async function join() {
    if (!picked) return;
    setBusy(true);
    const r = await fetch("/api/centres/join", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ centre_id: picked.id, rent_mode: mode, rent_pence: Math.round(parseFloat(rent || "0") * 100), rent_schedule: sched }) });
    setBusy(false);
    if (r.ok) { setMsg(`Request sent to ${picked.name}. They approve you from their dashboard.`); setTimeout(onDone, 1200); }
  }
  return (
    <>
      <StepHeader {...hp} title="Where do you sell" sub="Search every centre on Dealer Centre by name or town." />
      <div className="flex flex-col gap-4 px-5 pt-6">
        {centres.length > 0 && <div className="card divide-y divide-border">{centres.map((c) => <div key={c.name} className="flex h-[52px] items-center justify-between px-4 text-[14px]"><span>{c.name}</span>{c.status === "active" ? <Pill kind="success">Joined</Pill> : <Pill kind="warning">Awaiting approval</Pill>}</div>)}</div>}
        {!picked ? (
          <>
            <input className="field" placeholder="Centre name or town" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
            {results.length > 0 && <div className="card divide-y divide-border">{results.map((r) => <button key={r.id} className="flex w-full flex-col px-4 py-3 text-left" onClick={() => setPicked(r)}><span className="text-[15px] font-medium">{r.name}</span>{r.address && <span className="text-[12px] text-ink-muted">{r.address}</span>}</button>)}</div>}
            {q.length >= 2 && results.length === 0 && (
              <div className="card p-4 text-[14px]"><p className="text-ink-muted">No match for &ldquo;{q}&rdquo;.</p><a className="mt-2 block font-medium text-accent" href={`mailto:?subject=Dealer%20Centre&body=Connect%20your%20till%20in%20five%20minutes%3A%20${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}/signup/centre`}>Invite your centre</a></div>
            )}
          </>
        ) : (
          <>
            <div className="card flex items-center justify-between px-4 py-3"><span className="text-[15px] font-medium">{picked.name}</span><button className="text-[13px] text-accent" onClick={() => setPicked(null)}>Change</button></div>
            <div className="flex rounded-[10px] bg-surface-2 p-0.5">
              {(["rent", "commission_only"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`h-10 flex-1 rounded-[8px] text-[13px] font-semibold ${mode === m ? "bg-white shadow-sm" : "text-ink-muted"}`}>{m === "rent" ? "I pay rent" : "Commission only"}</button>)}
            </div>
            {mode === "rent" && (
              <>
                <div><label className="field-label">Rent</label><div className="flex h-12 items-center gap-1.5 rounded-[12px] border border-border px-3.5"><span className="text-ink-muted">£</span><input className="num min-w-0 flex-1 border-0 text-[18px] font-semibold outline-none" inputMode="decimal" value={rent} onChange={(e) => setRent(e.target.value)} placeholder="0" /></div></div>
                <div><label className="field-label">Taken</label><select className="field" value={sched} onChange={(e) => setSched(e.target.value)}><option value="first">1st of the month</option><option value="fifteenth">15th of the month</option><option value="last">Last day of the month</option><option value="weekly_friday">Every Friday</option><option value="weekly_monday">Every Monday</option><option value="quarterly">Quarterly</option></select></div>
              </>
            )}
            <p className="text-[12px] text-ink-muted">The centre can correct this when they approve you.</p>
            <button className="btn" disabled={busy} onClick={join}>{busy ? "Sending…" : "Ask to join"}</button>
          </>
        )}
        {msg && <p className="text-[13px] text-success">{msg}</p>}
      </div>
    </>
  );
}

function Printers({ hp, ownPrinters, centres, onDone }: { hp: HP; ownPrinters: number; centres: { name: string }[]; onDone: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  async function add() { setBusy(true); await fetch("/api/printers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: name.trim() || "My label printer", provider: "browser" }) }); setBusy(false); onDone(); }
  return (
    <>
      <StepHeader {...hp} title="Printers" sub={centres.length ? `You already have ${centres[0].name}'s till printer. Add your own if you label at home.` : "Add your own if you label at home. Centre printers are added automatically when you join."} />
      <div className="flex flex-col gap-4 px-5 pt-6">
        {ownPrinters > 0 && <div className="card px-4 py-3 text-[14px]">{ownPrinters} printer{ownPrinters > 1 ? "s" : ""} added</div>}
        <input className="field" placeholder="Brother QL at home" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" disabled={busy} onClick={add}>Add printer</button>
        <p className="text-[12px] text-ink-muted">Labels open as a PDF sized to the roll. Direct Bluetooth printing arrives with the App Store build.</p>
      </div>
    </>
  );
}

function Shopify({ hp, hasShopify, onDone }: { hp: HP; hasShopify: boolean; onDone: () => void }) {
  const [shop, setShop] = useState("");
  return (
    <>
      <StepHeader {...hp} title="Your Shopify" sub="Optional. Every item you list goes to your own shop too, and sells out of both places at once." />
      <div className="flex flex-col gap-4 px-5 pt-6">
        {hasShopify ? <div className="card flex items-center justify-between px-4 py-3 text-[14px]"><span>Shopify</span><Pill kind="success">Connected</Pill></div> : (
          <form action="/api/oauth/shopify" method="get" className="flex flex-col gap-3"><input name="shop" className="field" placeholder="yourstore.myshopify.com" value={shop} onChange={(e) => setShop(e.target.value)} /><button className="btn">Connect Shopify</button></form>
        )}
        <button className="btn-ghost" onClick={onDone}>{hasShopify ? "Continue" : "I do not have Shopify"}</button>
      </div>
    </>
  );
}

function StepHeader({ title, sub, idx, signup, step, next }: { title: string; sub?: string; idx: number; signup: boolean; step: Step; next: () => void }) {
  return (
    <div className="flex flex-col gap-2 px-5 pt-14">
      <div className="flex items-center justify-between text-[12px] text-ink-muted"><span>{signup ? `Sign up · ${idx + 2} of 3` : `Setup · ${idx - 1} of 5`}</span>{!signup && step !== "summary" && <button className="font-medium text-accent" onClick={next}>Skip</button>}</div>
      <div className="flex gap-1">{STEPS.map((s, i) => <span key={s} className={`h-1 flex-1 rounded-full ${i <= idx ? "bg-accent" : "bg-surface-2"}`} />)}</div>
      <h1 className="pt-3 text-[24px] font-semibold leading-7">{title}</h1>
      {sub && <p className="text-[14px] text-ink-muted">{sub}</p>}
    </div>
  );
}
