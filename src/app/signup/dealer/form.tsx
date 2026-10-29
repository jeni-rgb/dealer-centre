"use client";
import { useState } from "react";
import { suggestDealerCode, isValidDealerCode } from "@/lib/sku";

export function DealerSignupForm() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const [centreCode, setCentreCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const effectiveCode = touched ? code : suggestDealerCode(name);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (name.trim().length < 2) return setErr("Enter your trading name.");
    if (!isValidDealerCode(effectiveCode)) return setErr("Dealer code is 2 to 4 characters and starts with a letter.");
    setBusy(true);
    const r = await fetch("/api/signup/dealer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), code: effectiveCode, centre_code: centreCode.trim().toUpperCase() || null }),
    });
    const j = await r.json();
    if (!r.ok) { setBusy(false); return setErr(j.error ?? "Something went wrong"); }
    window.location.href = "/api/billing/checkout";
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <label className="block">
        <span className="mb-1 block text-xs text-ink-3">Trading name</span>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bloom Antiques" autoFocus />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-ink-3">Dealer code</span>
        <input className="field sku uppercase" value={effectiveCode} maxLength={4} onChange={(e) => { setTouched(true); setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); }} />
        <span className="mt-1 block text-xs text-ink-3">Starts every ticket number, for example <span className="sku">{effectiveCode || "B14"} 0001</span>. Locked after your first item.</span>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-ink-3">Centre code, if you have one</span>
        <input className="field sku uppercase" value={centreCode} maxLength={6} onChange={(e) => setCentreCode(e.target.value)} placeholder="Optional" />
        <span className="mt-1 block text-xs text-ink-3">Ask the centre you trade at. You can add it later in Settings.</span>
      </label>
      {err && <p className="text-sm text-oxblood">{err}</p>}
      <button className="btn w-full" disabled={busy}>{busy ? "Setting up…" : "Continue to card details"}</button>
      <p className="text-xs text-ink-3">Card is taken now, first charge is in 30 days. You get an email three days before.</p>
    </form>
  );
}
