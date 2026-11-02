"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Rent = { charges_rent: boolean | null; rent_frequency: "weekly" | "monthly" | "quarterly"; rent_day: string; charges_commission: boolean | null; commission: string };

/**
 * Centre sign up as a conversation. Six short questions, plain words, nothing technical.
 * On success we go to a server page so Back or Refresh never creates a second centre.
 */
export function CentreSignupForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [town, setTown] = useState("");
  const [dealers, setDealers] = useState("");
  const [r, setR] = useState<Rent>({ charges_rent: null, rent_frequency: "monthly", rent_day: "1st of the month", charges_commission: null, commission: "10" });
  const [till, setTill] = useState<"ordinary" | "square" | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [matches, setMatches] = useState<{ id: string; name: string; address: string | null; dealers: number }[]>([]);
  const [claim, setClaim] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    if (name.trim().length < 3) { setMatches([]); return; }
    const t = setTimeout(async () => { const r = await fetch(`/api/centres/unclaimed?q=${encodeURIComponent(name.trim())}`); setMatches((await r.json()).centres ?? []); }, 300);
    return () => clearTimeout(t);
  }, [name]);

  const steps = ["name", "dealers", "rent", "commission", "till", "confirm"] as const;
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  async function create() {
    setBusy(true); setErr(null);
    const rentDay = r.rent_frequency === "weekly" ? (r.rent_day.includes("Monday") ? 1 : 5) : r.rent_day.startsWith("15") ? 15 : r.rent_day.startsWith("Last") ? 28 : 1;
    const res = await fetch("/api/signup/centre", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(), address: town.trim(), dealer_count: parseInt(dealers || "0") || null,
        charges_rent: !!r.charges_rent, rent_frequency: r.rent_frequency, rent_day: rentDay, statement_day: 1,
        commission_percent: r.charges_commission ? parseFloat(r.commission || "0") : 0, till: till ?? "ordinary",
        claim_centre_id: claim?.id,
      }),
    });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "Something went wrong");
    router.replace(`/centre/welcome?centre=${j.centre_id}`);
  }

  const q = { step, total: steps.length, back };

  return (
    <div className="mt-6">
      {steps[step] === "name" && (
        <Q {...q} title="What is your centre called?" sub="And where is it. Dealers search for you by either.">
          <input className="field" placeholder="Looses Emporium" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <input className="field" placeholder="Magdalen Street, Norwich" value={town} onChange={(e) => setTown(e.target.value)} />
          {matches.length > 0 && !claim && (
            <div className="card divide-y divide-border">
              {matches.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
                  <span><span className="block font-medium">{m.name}{m.address ? `, ${m.address}` : ""}</span><span className="text-[12px] text-ink-muted">Already on Dealer Centre with {m.dealers} dealer{m.dealers === 1 ? "" : "s"} who added it. Is this yours?</span></span>
                  <button className="btn-sm" onClick={() => { setClaim(m); setName(m.name); if (m.address) setTown(m.address); }}>This is mine</button>
                </div>
              ))}
            </div>
          )}
          {claim && <div className="card flex items-center justify-between px-4 py-3 text-[14px]"><span>Taking over <span className="font-medium">{claim.name}</span>. Your dealers and their stock are already here.</span><button className="text-[13px] text-accent" onClick={() => setClaim(null)}>Undo</button></div>}
          <button className="btn" disabled={name.trim().length < 2} onClick={next}>Continue</button>
        </Q>
      )}

      {steps[step] === "dealers" && (
        <Q {...q} title="Roughly how many dealers trade with you?" sub="A guess is fine. It just helps us size things.">
          <div className="grid grid-cols-2 gap-2">{["Under 20", "20 to 50", "50 to 100", "Over 100"].map((o, i) => <Choice key={o} on={dealers === String([10, 35, 75, 150][i])} onClick={() => setDealers(String([10, 35, 75, 150][i]))}>{o}</Choice>)}</div>
          <button className="btn" onClick={next}>Continue</button>
        </Q>
      )}

      {steps[step] === "rent" && (
        <Q {...q} title="Do your dealers pay rent for their pitch?" sub="Most centres charge rent, commission, or both. Dealers will tell us their own rent when they join and you can correct it.">
          <div className="flex flex-col gap-2">
            <Choice on={r.charges_rent === true} onClick={() => setR({ ...r, charges_rent: true })}>Yes, dealers pay rent</Choice>
            <Choice on={r.charges_rent === false} onClick={() => setR({ ...r, charges_rent: false })}>No, commission only</Choice>
          </div>
          {r.charges_rent && (
            <>
              <div><span className="field-label">How often is rent taken?</span><div className="grid grid-cols-3 gap-2">{(["weekly", "monthly", "quarterly"] as const).map((f) => <Choice key={f} on={r.rent_frequency === f} onClick={() => setR({ ...r, rent_frequency: f, rent_day: f === "weekly" ? "Every Friday" : f === "quarterly" ? "1st of the month" : "1st of the month" })}><span className="w-full text-center capitalize">{f}</span></Choice>)}</div></div>
              <div><span className="field-label">On which day?</span>
                <select className="field" value={r.rent_day} onChange={(e) => setR({ ...r, rent_day: e.target.value })}>
                  {(r.rent_frequency === "weekly" ? ["Every Friday", "Every Monday"] : ["1st of the month", "15th of the month", "Last day of the month"]).map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            </>
          )}
          <button className="btn" disabled={r.charges_rent === null} onClick={next}>Continue</button>
        </Q>
      )}

      {steps[step] === "commission" && (
        <Q {...q} title="Do you take commission on sales?" sub="A percentage of each floor sale, kept by the centre.">
          <div className="flex flex-col gap-2">
            <Choice on={r.charges_commission === true} onClick={() => setR({ ...r, charges_commission: true })}>Yes</Choice>
            <Choice on={r.charges_commission === false} onClick={() => setR({ ...r, charges_commission: false })}>No, rent only</Choice>
          </div>
          {r.charges_commission && (
            <div><span className="field-label">What percentage?</span><div className="flex h-12 items-center gap-1 rounded-[12px] border border-border px-3.5"><input className="num min-w-0 flex-1 border-0 text-[18px] font-semibold outline-none" inputMode="decimal" value={r.commission} onChange={(e) => setR({ ...r, commission: e.target.value })} /><span className="text-ink-muted">%</span></div></div>
          )}
          <button className="btn" disabled={r.charges_commission === null} onClick={next}>Continue</button>
        </Q>
      )}

      {steps[step] === "till" && (
        <Q {...q} title="How do customers pay?" sub="This decides how sales get into the app.">
          <div className="flex flex-col gap-2">
            <Choice on={till === "ordinary"} onClick={() => setTill("ordinary")}>
              <span className="flex flex-col py-2"><span>An ordinary till or card machine</span><span className="text-[12px] font-normal text-ink-muted">The customer brings the item's ticket to the till. At the end of the day you type or scan the tickets into the app, two minutes. Most centres.</span></span>
            </Choice>
            <Choice on={till === "square"} onClick={() => setTill("square")}>
              <span className="flex flex-col py-2"><span>Square</span><span className="text-[12px] font-normal text-ink-muted">You already take payments through Square. Sales flow in automatically when you connect it later in Settings.</span></span>
            </Choice>
          </div>
          <button className="btn" disabled={!till} onClick={next}>Continue</button>
        </Q>
      )}

      {steps[step] === "confirm" && (
        <Q {...q} title="Does this look right?">
          <div className="card divide-y divide-border text-[14px]">
            <div className="flex items-start justify-between gap-6 px-4 py-3"><span className="shrink-0 text-ink-muted">Centre</span><span className="text-right font-medium"><span className="block">{name}</span>{town && <span className="block text-[13px] font-normal text-ink-muted">{town}</span>}</span></div>
            <div className="flex justify-between px-4 py-3"><span className="text-ink-muted">Rent</span><span className="font-medium">{r.charges_rent ? `${r.rent_frequency}, ${r.rent_day}` : "None"}</span></div>
            <div className="flex justify-between px-4 py-3"><span className="text-ink-muted">Commission</span><span className="font-medium">{r.charges_commission ? `${r.commission}%` : "None"}</span></div>
            <div className="flex justify-between px-4 py-3"><span className="text-ink-muted">Payments</span><span className="font-medium">{till === "square" ? "Square" : "Ordinary till"}</span></div>
          </div>
          {err && <p className="text-[13px] text-danger">{err}</p>}
          <button className="btn" disabled={busy} onClick={create}>{busy ? "Setting up…" : "Set up my centre"}</button>
          <p className="text-[12px] text-ink-muted">£299 a month after a 14 day free trial; you add a card on the next screen. You can change any of this later in Settings.</p>
        </Q>
      )}
    </div>
  );
}

function Q({ step, total, back, title, sub, children }: { step: number; total: number; back: () => void; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between text-[12px] text-ink-muted"><span>Question {step + 1} of {total}</span>{step > 0 && <button className="font-medium text-accent" onClick={back}>Back</button>}</div>
      <div className="px-track">{Array.from({ length: total }).map((_, i) => <span key={i} className={`px-step ${i < step ? "px-step-on" : i === step ? "px-step-now" : ""}`} />)}</div>
      <div><h2 className="text-[22px] font-semibold leading-7">{title}</h2>{sub && <p className="mt-1.5 text-[14px] text-ink-muted">{sub}</p>}</div>
      {children}
    </div>
  );
}
function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`flex min-h-[56px] w-full items-center rounded-[14px] border px-4 text-left text-[15px] font-medium ${on ? "border-accent bg-accent-soft text-accent-text" : "border-border bg-white"}`}>{children}</button>;
}
