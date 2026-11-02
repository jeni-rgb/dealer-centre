"use client";
import { useState } from "react";

export function ResetPin({ centreId }: { centreId: string }) {
  const [pin, setPin] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  async function reset() {
    setBusy(true);
    const r = await fetch(`/api/centres/${centreId}/pin`, { method: "POST" });
    const j = await r.json(); setBusy(false); setConfirming(false);
    if (r.ok) setPin(j.pin);
  }
  if (pin) return <div className="mt-3 rounded-[14px] bg-gold-soft px-4 py-3 text-[14px]"><div className="text-warning">Your new till PIN. Write it down now; it is not shown again.</div><div className="ticket mt-1 text-[32px] leading-none">{pin}</div></div>;
  if (confirming) return <div className="mt-3 flex flex-wrap items-center gap-3 text-[14px]"><span>Reset the PIN? Every till device will need the new one.</span><button className="btn-sm" disabled={busy} onClick={reset}>{busy ? "…" : "Yes, reset"}</button><button className="text-ink-muted" onClick={() => setConfirming(false)}>Cancel</button></div>;
  return <button className="btn-sm-secondary mt-3" onClick={() => setConfirming(true)}>Reset till PIN</button>;
}
