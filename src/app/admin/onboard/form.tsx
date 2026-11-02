"use client";
import { useState } from "react";
import { suggestDealerCode } from "@/lib/sku";

type Result = { centre_id: string; invite_code: string; pin: string; sign_in_link: string | null; added: string[]; skipped: string[] };

export function OnboardForm() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [till, setTill] = useState<"ordinary" | "square">("ordinary");
  const [commission, setCommission] = useState("10");
  const [rent, setRent] = useState(true);
  const [freq, setFreq] = useState<"weekly" | "monthly" | "quarterly">("monthly");
  const [freeMonths, setFreeMonths] = useState("0");
  const [dealerText, setDealerText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);

  // One dealer per line: "Bloom Antiques, B14" or just "Bloom Antiques" (code suggested)
  const dealers = dealerText.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [n, c] = l.split(",").map((s) => s.trim());
    return { name: n, code: (c || suggestDealerCode(n)).toUpperCase() };
  });

  async function submit() {
    setBusy(true); setErr(null);
    const r = await fetch("/api/admin/onboard", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, address, owner_email: email, till, commission_percent: parseFloat(commission || "0"), charges_rent: rent, rent_frequency: freq, free_months: parseInt(freeMonths || "0"), dealers }) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Something went wrong");
    setRes(j);
  }

  if (res) return (
    <div className="card max-w-2xl p-6">
      <h2 className="text-[18px] font-semibold">{name} is set up</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 text-[14px]">
        <div><div className="text-[12px] text-ink-muted">Centre code</div><div className="ticket text-[22px]">{res.invite_code}</div></div>
        <div><div className="text-[12px] text-ink-muted">Till PIN</div><div className="ticket text-[22px]">{res.pin}</div></div>
      </div>
      <p className="mt-4 text-[14px]">{res.added.length} dealer{res.added.length === 1 ? "" : "s"} added{res.skipped.length ? `; skipped: ${res.skipped.join(", ")}` : ""}.</p>
      {res.sign_in_link && (
        <div className="mt-4">
          <div className="text-[12px] font-medium text-ink-muted">Sign in link for the owner (valid for one use, send it to {email})</div>
          <textarea readOnly className="field mt-1 !h-24 !text-[12px]" value={res.sign_in_link} onFocus={(e) => e.currentTarget.select()} />
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <a className="btn-sm" href={`/centre?centre=${res.centre_id}`}>Open their dashboard</a>
        <a className="btn-sm-secondary" href={`/centre/codes?centre=${res.centre_id}`}>Print code sheet</a>
        <button className="btn-sm-secondary" onClick={() => { setRes(null); setName(""); setAddress(""); setEmail(""); setDealerText(""); }}>Another centre</button>
      </div>
    </div>
  );

  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="card flex flex-col gap-4 p-6">
        <h2 className="text-[16px] font-semibold">The centre</h2>
        <div><label className="field-label">Name</label><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Looses Emporium" /></div>
        <div><label className="field-label">Town or address</label><input className="field" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Magdalen Street, Norwich" /></div>
        <div><label className="field-label">Owner&rsquo;s email</label><input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@centre.co.uk" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="field-label">Till</label><select className="field" value={till} onChange={(e) => setTill(e.target.value as "ordinary" | "square")}><option value="ordinary">Ordinary till (iPad recording)</option><option value="square">Square</option></select></div>
          <div><label className="field-label">Commission %</label><input className="field num" inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} /></div>
          <div><label className="field-label">Rent</label><select className="field" value={rent ? freq : "none"} onChange={(e) => { if (e.target.value === "none") setRent(false); else { setRent(true); setFreq(e.target.value as typeof freq); } }}><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="quarterly">Quarterly</option><option value="none">No rent, commission only</option></select></div>
          <div><label className="field-label">Free months</label><input className="field num" inputMode="numeric" value={freeMonths} onChange={(e) => setFreeMonths(e.target.value)} /><span className="mt-1 block text-[12px] text-ink-muted">0 = normal 14 day trial, card required</span></div>
        </div>
      </div>
      <div className="card flex flex-col gap-4 p-6">
        <h2 className="text-[16px] font-semibold">Their dealers</h2>
        <p className="text-[13px] text-ink-muted">One per line: <span className="ticket">Bloom Antiques, B14</span>. Leave the code off and one is suggested. Use the code already on their tickets.</p>
        <textarea className="field !h-64 !text-[14px]" value={dealerText} onChange={(e) => setDealerText(e.target.value)} placeholder={"Bloom Antiques, B14\nJ Harrison, JH\nR and M Collectables, RM"} />
        {dealers.length > 0 && <p className="text-[12px] text-ink-muted">{dealers.length} dealers: {dealers.map((d) => d.code).join(", ")}</p>}
        {err && <p className="text-[13px] text-danger">{err}</p>}
        <button className="btn" disabled={busy || name.trim().length < 2 || !email.includes("@")} onClick={submit}>{busy ? "Setting up…" : "Set up centre"}</button>
      </div>
    </div>
  );
}
