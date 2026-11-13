"use client";
import { useState } from "react";
import { formatShortDate } from "@/lib/billing/pricing";

export function AcceptTaster({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [until, setUntil] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function yes() {
    setBusy(true); setErr(null);
    const r = await fetch("/api/taster/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Could not start that");
    setUntil(j.until);
  }
  if (until) return <p className="mt-6 text-[16px] leading-7">You are in until {formatShortDate(until)}. We will label your first 25 items. Nothing has been charged.</p>;
  return (
    <div className="mt-6 flex flex-col gap-3">
      {err && <p className="text-[14px] text-danger">{err}</p>}
      <button className="btn" disabled={busy} onClick={yes}>{busy ? "Starting…" : "Yes, start my 2 weeks"}</button>
      <p className="text-[13px] text-ink-muted">If you do nothing, you stay on Basic.</p>
    </div>
  );
}
