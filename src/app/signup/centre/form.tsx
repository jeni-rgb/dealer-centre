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
          <div className="text-xs uppercase tracking-wide text-ink-3">Your centre code</div>
          <div className="sku mt-1 text-4xl font-medium">{done.invite_code}</div>
          <p className="mt-2 text-sm text-ink-2">Give this to dealers. They enter it when they sign up and you approve them on the mapping screen.</p>
        </div>
        <div>
          <div className="mb-2 text-sm font-medium">Next: connect your Square till</div>
          <a className="btn" href={`/api/oauth/square?owner=centre&id=${done.centre_id}`}>Connect Square</a>
          <p className="mt-2 text-xs text-ink-3">Sign in as the Square account owner. We read sales and items and create items for your dealers. We never take payments.</p>
        </div>
        <a className="text-sm underline" href={`/centre?centre=${done.centre_id}`}>Skip for now, go to the centre dashboard</a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <label className="block"><span className="mb-1 block text-xs text-ink-3">Centre name</span><input className="field" value={f.name} onChange={set("name")} placeholder="Magdalen Antiques Centre" /></label>
      <label className="block"><span className="mb-1 block text-xs text-ink-3">Address</span><input className="field" value={f.address} onChange={set("address")} /></label>
      <div className="grid grid-cols-3 gap-3">
        <label className="block"><span className="mb-1 block text-xs text-ink-3">Commission %</span><input className="field num" inputMode="decimal" value={f.commission_percent} onChange={set("commission_percent")} /></label>
        <label className="block"><span className="mb-1 block text-xs text-ink-3">Rent day</span><input className="field num" inputMode="numeric" value={f.rent_day} onChange={set("rent_day")} /></label>
        <label className="block"><span className="mb-1 block text-xs text-ink-3">Statement day</span><input className="field num" inputMode="numeric" value={f.statement_day} onChange={set("statement_day")} /></label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs text-ink-3">Till PIN</span>
        <input className="field num" inputMode="numeric" value={f.pin} onChange={set("pin")} placeholder="4 to 8 digits" />
        <span className="mt-1 block text-xs text-ink-3">Staff type this on the till iPad to print quick labels. No login needed.</span>
      </label>
      {err && <p className="text-sm text-oxblood">{err}</p>}
      <button className="btn w-full" disabled={busy}>{busy ? "Creating…" : "Create centre"}</button>
    </form>
  );
}
