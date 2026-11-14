"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Day 14. Basic, or keep Full. Labels past the free 25 go on the first Full bill. */
export function PlanChoice({ printed = 0 }: { printed?: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function basic() {
    setBusy(true); setErr(null);
    const r = await fetch("/api/billing/plan-choice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ choice: "basic" }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? "Could not save"); return; }
    router.refresh();
  }
  return (
    <div className="card p-4">
      <p className="text-[15px] font-semibold">Your 14 days have ended.</p>
      <p className="mt-1 text-[13px] leading-5 text-ink-muted">{printed > 25 ? "Basic is free. Full is £25 a month plus VAT. Labels still owed go on your first Full bill." : "Basic is free. Full is £25 a month plus VAT."}</p>
      {err && <p className="mt-2 text-[13px] text-danger">{err}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn-secondary" disabled={busy} onClick={basic}>Stay on Basic</button>
        <a className="btn" href="/api/billing/checkout">Keep Full</a>
      </div>
    </div>
  );
}
