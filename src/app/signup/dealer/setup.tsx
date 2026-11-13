"use client";
import { PRINTER_MODELS, SIZE_HELP, SIZE_LABEL, SIZE_PLACEHOLDER } from "@/lib/labels/models";
import { labelPriceLabel } from "@/lib/billing/pricing";
import { PlanCompare } from "@/components/plan-compare";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone, Pill } from "@/components/ui";
import { isValidDealerCode, suggestDealerCode } from "@/lib/sku";

type ListMode = "self" | "staff";
type Dealer = { name: string; code: string; plan: string; stripe_customer_id: string | null; listing_mode: ListMode | null; listing_tokens: number; listing_tokens_bought: number; card_added_at: string | null } | null;
type Step = "business" | "who" | "card" | "tokens" | "centre" | "printers" | "shopify" | "summary";
type HP = { idx: number; total: number; step: Step; steps: Step[]; next: () => void };
function stepsFor(mode: ListMode | null): Step[] {
  const tail: Step[] = ["centre", "printers", "shopify", "summary"];
  return mode === "staff" ? ["business", "who", "card", "tokens", ...tail] : ["business", "who", "card", ...tail];
}

export function DealerSetup({ email, initial, dealer, centres, hasShopify, ownPrinters, listHint }: { email: string; initial: string; dealer: Dealer; centres: { name: string; status: string }[]; hasShopify: boolean; ownPrinters: number; plan?: string; listHint?: ListMode | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<ListMode | null>(dealer?.listing_mode ?? listHint ?? null);
  const [step, setStep] = useState<Step>((["business", "who", "card", "tokens", "centre", "printers", "shopify", "summary"] as Step[]).includes(initial as Step) ? (initial as Step) : "business");
  const steps = stepsFor(mode === "staff" || step === "tokens" ? "staff" : mode);
  const go = (s: Step) => { setStep(s); router.replace(`/signup/dealer?step=${s}`); };
  const next = () => { const i = steps.indexOf(step); go(steps[Math.min(Math.max(i, 0) + 1, steps.length - 1)]); };
  const idx = Math.max(0, steps.indexOf(step));
  const hp = { idx, total: steps.length, step, steps, next };
  const staff = (mode ?? dealer?.listing_mode) === "staff";

  return (
    <Phone>
      {step === "business" && <Business email={email} hp={hp} onDone={next} />}
      {step === "who" && <WhoLists hp={hp} initial={mode} onDone={(m) => { setMode(m); go("card"); }} />}
      {step === "card" && <CardPlan hp={hp} staff={staff} />}
      {step === "tokens" && <HowMany hp={hp} />}
      {step === "centre" && <Centre hp={hp} centres={centres} onDone={next} />}
      {step === "printers" && <Printers hp={hp} ownPrinters={ownPrinters} centres={centres} onDone={next} />}
      {step === "shopify" && <Shopify hp={hp} hasShopify={hasShopify} onDone={next} />}
      {step === "summary" && (
        <>
          <StepHeader {...hp} title="You are set" sub="Anything skipped stays in Settings until it is done." />
          <div className="flex flex-col gap-3 px-5 pt-6">
            <div className="card divide-y divide-border">
              <Row label="Business" ok={!!dealer} value={dealer ? `${dealer.name} · ${dealer.code}` : "Not done"} />
              <Row label="Full plan" ok={!!dealer?.card_added_at || dealer?.plan === "pro"} value={dealer?.card_added_at || dealer?.plan === "pro" ? "£25 a month plus VAT" : "Not started"} />
              {staff && <Row label="Listing tokens" ok={(dealer?.listing_tokens_bought ?? 0) > 0} value={(dealer?.listing_tokens_bought ?? 0) > 0 ? `${dealer?.listing_tokens ?? 0} left` : "Not paid"} />}
              <Row label="Centre" ok={centres.length > 0} value={centres[0] ? `${centres[0].name}${centres[0].status === "active" ? "" : ", awaiting approval"}` : "None yet"} />
              <Row label="Printer" ok={ownPrinters > 0 || centres.length > 0} value={centres.length > 0 ? "Centre till printer" : ownPrinters > 0 ? "Your printer" : "None yet"} />
              <Row label="Shopify" ok={hasShopify} value={hasShopify ? "Connected" : "Not connected"} />
            </div>
            <Link className="btn" href="/app/items/new">List my first item</Link>
            <Link className="btn-ghost" href="/app">Go to Today</Link>
          </div>
        </>
      )}
    </Phone>
  );
}

function WhoLists({ hp, initial, onDone }: { hp: HP; initial: ListMode | null; onDone: (m: ListMode) => void }) {
  const [pick, setPick] = useState<ListMode | null>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    if (!pick) return;
    setBusy(true); setErr(null);
    const r = await fetch("/api/signup/dealer/listing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: pick }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? "Could not save"); return; }
    onDone(pick);
  }
  const choices: { id: ListMode; title: string; sub: string }[] = [
    { id: "staff", title: "Please label my stock", sub: "75p an item plus VAT. We photograph, write and label each piece." },
    { id: "self", title: "I will load my own stock", sub: "Free. You photograph and label, or use the labels you already have." },
  ];
  return (
    <>
      <StepHeader {...hp} title="Who lists your stock?" sub="You can use the app either way, including marking something sold. This only decides who puts the items on." />
      <div className="flex flex-col gap-3 px-5 pt-6">
        {choices.map((c) => (
          <button key={c.id} type="button" aria-pressed={pick === c.id} onClick={() => setPick(c.id)} className={`rounded-[16px] border p-4 text-left ${pick === c.id ? "border-2 border-gold bg-gold-soft" : "border-border bg-white"}`}>
            <span className="block text-[16px] font-bold">{c.title}</span>
            <span className="mt-1 block text-[14px] text-ink-muted">{c.sub}</span>
          </button>
        ))}
        {err && <p className="text-[13px] text-danger">{err}</p>}
        <button className="btn" disabled={!pick || busy} onClick={go}>{busy ? "Saving…" : "Continue"}</button>
      </div>
    </>
  );
}

function CardPlan({ hp, staff }: { hp: HP; staff: boolean }) {
  return (
    <>
      <StepHeader {...hp} title="Full, £25 a month" sub="Named sales at every centre, on one bill. Direct Debit. Plus VAT." />
      <div className="flex flex-col gap-3 px-5 pt-6">
        <div className="card px-4 py-4 text-[15px] leading-6">
          <p className="font-semibold">£25 a month plus VAT</p>
          <p className="mt-2 text-ink-muted">You see every sale: the name, the price, the date and the centre. Unlimited sales. Cancel any month from Account.</p>
          {staff && <p className="mt-2 text-ink-muted">Labelling is separate, 75p an item plus VAT, on the next step.</p>}
        </div>
        <PlanCompare showHeadline={false} />
        <p className="text-[12px] text-ink-muted">Taken by Direct Debit where your bank allows it, otherwise by card. Stripe runs the payment. There is no free trial on Full.</p>
        <a className="btn" href="/api/billing/checkout">Start Full</a>
      </div>
    </>
  );
}

function HowMany({ hp }: { hp: HP }) {
  const [qty, setQty] = useState("150");
  const n = Math.floor(Number(qty));
  const ok = qty.trim() !== "" && Number.isInteger(n) && n >= 1 && String(n) === qty.trim();
  const href = ok ? `/api/billing/tokens?qty=${n}&next=${encodeURIComponent("/signup/dealer?step=centre")}` : "#";
  return (
    <>
      <StepHeader {...hp} title="How many items?" sub="75p an item plus VAT. We photograph, write and label them after this is paid. You can buy more later." />
      <div className="flex flex-col gap-3 px-5 pt-6">
        <label className="text-[14px] font-medium" htmlFor="qty">How many items should we list?</label>
        <div className="card px-4 py-6"><input id="qty" inputMode="numeric" className="w-full bg-transparent text-center text-[44px] font-semibold outline-none" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))} /></div>
        <div className="card px-4 py-3 text-[14px]">
          <div className="flex items-center justify-between"><span>{ok ? n : 0} labels</span><span className="font-semibold">{ok ? labelPriceLabel(n) : "£0.00 plus VAT"}</span></div>
          <div className="mt-1 text-[12px] text-ink-muted">75p each plus VAT</div>
        </div>
        <p className="text-[13px] text-ink-muted">You can use the full app while we list, including marking something sold.</p>
        <a className={`btn ${ok ? "" : "pointer-events-none opacity-50"}`} href={href}>{ok ? `Pay ${labelPriceLabel(n)}` : "Enter how many items"}</a>
      </div>
    </>
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
  const [results, setResults] = useState<{ id: string; name: string; address: string | null; unclaimed?: boolean }[]>([]);
  const [picked, setPicked] = useState<{ id: string; name: string; unclaimed?: boolean } | null>(null);
  const [adding, setAdding] = useState(false);
  const [town, setTown] = useState("");
  const [whoList, setWhoList] = useState<{ id: string; name: string; code: string }[] | null>(null);
  const [claimed, setClaimed] = useState<string | null>(null);
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
    const body = { rent_mode: mode, rent_pence: Math.round(parseFloat(rent || "0") * 100), rent_schedule: sched };
    if (picked.unclaimed) {
      const r = await fetch("/api/centres/placeholder", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: picked.name, ...body }) });
      setBusy(false);
      if (r.ok) { setMsg(`You are listed at ${picked.name}. When they join Dealer Centre, nothing changes for you.`); setTimeout(onDone, 1400); } else setMsg((await r.json()).error ?? "Something went wrong");
      return;
    }
    // Centre already on Dealer Centre: has it set us up already? ("Which one is you?")
    const u = await fetch(`/api/dealers/unclaimed?centre=${picked.id}`); const list = ((await u.json()).dealers ?? []) as { id: string; name: string; code: string }[];
    if (list.length > 0 && whoList === null) { setWhoList(list); setBusy(false); return; }
    const r = await fetch("/api/centres/join", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ centre_id: picked.id, ...body }) });
    setBusy(false);
    if (r.ok) { setMsg(`Request sent to ${picked.name}. They approve you from their dashboard.`); setTimeout(onDone, 1200); } else setMsg((await r.json()).error ?? "Something went wrong");
  }
  async function addCentre() {
    setBusy(true);
    const r = await fetch("/api/centres/placeholder", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: q.trim(), town: town.trim(), rent_mode: mode, rent_pence: Math.round(parseFloat(rent || "0") * 100), rent_schedule: sched }) });
    setBusy(false);
    if (r.ok) { setMsg(`${q.trim()} added. Your items will carry it, and when they join Dealer Centre nothing changes for you.`); setTimeout(onDone, 1600); } else setMsg((await r.json()).error ?? "Something went wrong");
  }
  async function claim(id: string) {
    setBusy(true);
    const r = await fetch("/api/dealers/claim", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ dealer_id: id, centre_id: picked?.id }) });
    const j = await r.json(); setBusy(false);
    if (r.ok) { setClaimed(j.code); setMsg(`That's you. Your code stays ${j.code} and everything already sold under it is on your statement. ${picked?.name} just confirms it.`); setTimeout(onDone, 2200); } else setMsg(j.error ?? "Something went wrong");
  }
  return (
    <>
      <StepHeader {...hp} title="Where do you sell" sub="Search every centre on Dealer Centre by name or town." />
      <div className="flex flex-col gap-4 px-5 pt-6">
        {centres.length > 0 && <div className="card divide-y divide-border">{centres.map((c) => <div key={c.name} className="flex h-[52px] items-center justify-between px-4 text-[14px]"><span>{c.name}</span>{c.status === "active" ? <Pill kind="success">Joined</Pill> : <Pill kind="warning">Awaiting approval</Pill>}</div>)}</div>}
        {!picked ? (
          <>
            <input className="field" placeholder="Centre name or town" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
            {results.length > 0 && !adding && <div className="card divide-y divide-border">{results.map((r) => <button key={r.id} className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setPicked(r)}><span className="flex flex-col"><span className="text-[15px] font-medium">{r.name}</span>{r.address && <span className="text-[12px] text-ink-muted">{r.address}</span>}</span>{r.unclaimed && <Pill kind="neutral">Added by dealers</Pill>}</button>)}</div>}
            {q.length >= 2 && !adding && (
              <div className="card p-4 text-[14px]"><p className="text-ink-muted">{results.length === 0 ? `No match for "${q}".` : "Not in the list?"}</p><button className="mt-2 block font-medium text-accent" onClick={() => setAdding(true)}>Add {q.trim()} to Dealer Centre</button></div>
            )}
            {adding && (
              <div className="card flex flex-col gap-3 p-4">
                <div><span className="text-[15px] font-medium">{q.trim()}</span><p className="text-[12px] text-ink-muted">Not on Dealer Centre yet. That is fine: your items and statement will say {q.trim()}, and when they join, nothing changes for you.</p></div>
                <input className="field" placeholder="Town, so other dealers find it" value={town} onChange={(e) => setTown(e.target.value)} autoFocus />
                <div className="flex rounded-[10px] bg-surface-2 p-0.5">
                  {(["rent", "commission_only"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`h-10 flex-1 rounded-[8px] text-[13px] font-semibold ${mode === m ? "bg-white shadow-sm" : "text-ink-muted"}`}>{m === "rent" ? "I pay rent" : "Commission only"}</button>)}
                </div>
                {mode === "rent" && <div className="flex h-12 items-center gap-1.5 rounded-[12px] border border-border px-3.5"><span className="text-ink-muted">£</span><input className="num min-w-0 flex-1 border-0 text-[18px] font-semibold outline-none" inputMode="decimal" value={rent} onChange={(e) => setRent(e.target.value)} placeholder="Rent" /></div>}
                <div className="grid grid-cols-2 gap-2"><button className="btn-outline" onClick={() => setAdding(false)}>Back</button><button className="btn" disabled={busy} onClick={addCentre}>{busy ? "Adding…" : "Add centre"}</button></div>
              </div>
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
            {whoList && !claimed && (
              <div className="card flex flex-col gap-2 p-4">
                <span className="text-[15px] font-medium">{picked.name} has already set up these dealers. Which one is you?</span>
                <div className="divide-y divide-border">{whoList.map((d) => <button key={d.id} className="flex h-[48px] w-full items-center justify-between text-left text-[14px]" disabled={busy} onClick={() => claim(d.id)}><span>{d.name}</span><span className="ticket text-[13px] text-ink-muted">{d.code}</span></button>)}</div>
                <button className="text-[13px] text-ink-muted" onClick={() => setWhoList([])}>None of these, I am new here</button>
              </div>
            )}
            {!whoList?.length && <p className="text-[12px] text-ink-muted">{picked.unclaimed ? "Nobody at the centre approves this yet; you are listed straight away." : "The centre can correct this when they approve you."}</p>}
            {!whoList?.length && <button className="btn" disabled={busy} onClick={join}>{busy ? "Sending…" : picked.unclaimed ? "Join" : "Ask to join"}</button>}
          </>
        )}
        {msg && <p className="text-[13px] text-success">{msg}</p>}
      </div>
    </>
  );
}

function Printers({ hp, ownPrinters, centres, onDone }: { hp: HP; ownPrinters: number; centres: { name: string }[]; onDone: () => void }) {
  const [name, setName] = useState("");
  const [model, setModel] = useState<string>("");
  const [busy, setBusy] = useState(false);
  async function add() { if (!model) return; setBusy(true); await fetch("/api/printers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: name.trim() || "My label printer", provider: "browser", model }) }); setBusy(false); onDone(); }
  return (
    <>
      <StepHeader {...hp} title="Label printers" sub="Labels print at the centre when you list. Add another printer if you also label at home." />
      <div className="flex flex-col gap-4 px-5 pt-6">
        <div className="card divide-y divide-border text-[14px]">
          {centres.length > 0 && <div className="flex items-center justify-between px-4 py-3"><span>Centre label printer</span><Pill kind="success">Connected</Pill></div>}
          {centres.length === 0 && <div className="flex items-center justify-between px-4 py-3 text-ink-muted"><span>Centre printer</span><span>Added when your centre approves you</span></div>}
          {ownPrinters > 0 && <div className="flex items-center justify-between px-4 py-3"><span>Your printer{ownPrinters > 1 ? "s" : ""}</span><Pill kind="success">{ownPrinters} added</Pill></div>}
        </div>
        <label className="flex flex-col gap-1 text-[13px] font-medium">{SIZE_LABEL}<select required className="field" value={model} onChange={(e) => setModel(e.target.value)}><option value="" disabled>{SIZE_PLACEHOLDER}</option>{PRINTER_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select><span className="text-[12px] font-normal text-ink-muted">{SIZE_HELP}</span></label>
        <input className="field" placeholder="Brother QL at home" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" disabled={busy || !model} onClick={add}>Add another printer</button>
        <p className="text-[12px] text-ink-muted">Labels open as a PDF sized to the roll. Direct Bluetooth printing arrives with the App Store build.</p>
      </div>
    </>
  );
}

function Shopify({ hp, hasShopify, onDone }: { hp: HP; hasShopify: boolean; onDone: () => void }) {
  const [shop, setShop] = useState("");
  return (
    <>
      <StepHeader {...hp} title="Your own Shopify" sub="Optional, and only for a shop you run yourself. Items you list can go to it as well as the centre floor, and sell out of both at once. The centre's online shop is separate: you choose it item by item when you list, nothing to connect." />
      <div className="flex flex-col gap-4 px-5 pt-6">
        {hasShopify ? <div className="card flex items-center justify-between px-4 py-3 text-[14px]"><span>Shopify</span><Pill kind="success">Connected</Pill></div> : (
          <form action="/api/oauth/shopify" method="get" className="flex flex-col gap-3"><input name="shop" className="field" placeholder="yourstore.myshopify.com" value={shop} onChange={(e) => setShop(e.target.value)} /><button className="btn">Connect Shopify</button></form>
        )}
        <button className="btn-ghost" onClick={onDone}>{hasShopify ? "Continue" : "I do not have Shopify"}</button>
      </div>
    </>
  );
}

function StepHeader({ title, sub, idx, total, step, steps, next }: HP & { title: string; sub?: string }) {
  const skip = step === "centre" || step === "printers" || step === "shopify";
  return (
    <div className="flex flex-col gap-2 px-5 pt-14">
      <div className="flex items-center justify-between text-[12px] text-ink-muted"><span>{idx + 1} of {total}</span>{skip && <button className="font-medium text-accent" onClick={next}>Skip</button>}</div>
      <div className="px-track">{steps.map((s, i) => <span key={s} className={`px-step ${i < idx ? "px-step-on" : i === idx ? "px-step-now" : ""}`} />)}</div>
      <h1 className="pt-3 text-[24px] font-semibold leading-7">{title}</h1>
      {sub && <p className="text-[14px] text-ink-muted">{sub}</p>}
    </div>
  );
}
