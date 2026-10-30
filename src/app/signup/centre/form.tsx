"use client";
import { useState } from "react";

export function CentreSignupForm() {
  const [f, setF] = useState({ name: "", address: "", commission_percent: "10", rent_day: "1", statement_day: "1", pin: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ centre_id: string; invite_code: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!/^\d{4,8}$/.test(f.pin)) return setErr("Till PIN is 4 to 8 digits.");
    setBusy(true);
    const r = await fetch("/api/signup/centre", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...f, commission_percent: parseFloat(f.commission_percent), rent_day: parseInt(f.rent_day), statement_day: parseInt(f.statement_day) }),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(j.error);
    setDone(j);
  }

  if (done) {
    return (
      <div className="mt-6 space-y-6">
        <div>
          <div className="text-[12px] text-ink-muted">Your centre code</div>
          <div className="ticket mt-1 text-[36px]">{done.invite_code}</div>
          <p className="mt-2 text-[14px] text-ink-muted">Give this to dealers. They enter it when they sign up and you approve them on the mapping screen.</p>
        </div>
        <div>
          <div className="mb-2 text-[14px] font-medium">How do you take payments?</div>
          <a className="btn" href={`/centre/eod?centre=${done.centre_id}`}>An ordinary till, I record sales from the tickets</a>
          <a className="btn-secondary mt-2" href={`/api/oauth/square?owner=centre&id=${done.centre_id}`}>Square, connect it</a>
          <p className="mt-2 text-[12px] text-ink-muted">With an ordinary till, the customer brings the barcoded ticket to pay, the till keeps it, and you record the day's tickets in End of day. Takes a few minutes an evening.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <label className="block"><span className="field-label">Centre name</span><input className="field" value={f.name} onChange={set("name")} placeholder="Magdalen Antiques Centre" /></label>
      <label className="block"><span className="field-label">Address</span><input className="field" value={f.address} onChange={set("address")} /></label>
      <div className="grid grid-cols-3 gap-3">
        <label className="block"><span className="field-label">Commission %</span><input className="field num" inputMode="decimal" value={f.commission_percent} onChange={set("commission_percent")} /></label>
        <label className="block"><span className="field-label">Rent day</span><input className="field num" inputMode="numeric" value={f.rent_day} onChange={set("rent_day")} /></label>
        <label className="block"><span className="field-label">Statement day</span><input className="field num" inputMode="numeric" value={f.statement_day} onChange={set("statement_day")} /></label>
      </div>
      <label className="block">
        <span className="field-label">Till PIN</span>
        <input className="field num" inputMode="numeric" value={f.pin} onChange={set("pin")} placeholder="4 to 8 digits" />
        <span className="mt-1 block text-xs text-ink-muted">Staff type this on the till iPad to print quick labels. No login needed.</span>
      </label>
      {err && <p className="text-sm text-danger">{err}</p>}
      <button className="btn w-full" disabled={busy}>{busy ? "Creating…" : "Create centre"}</button>
    </form>
  );
}
