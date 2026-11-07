"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Starts a check and opens the scanner. href has "{id}" where the new check id goes. */
export function StartCheck({ centreId, dealerId, href, label, className = "btn" }: { centreId: string; dealerId: string | null; href: string; label: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    setBusy(true); setErr(null);
    const r = await fetch("/api/stock-checks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ centre_id: centreId, dealer_id: dealerId }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Could not start");
    router.push(href.replace("{id}", j.id));
  }
  return <div className="flex flex-col gap-1"><button className={className} disabled={busy} onClick={go}>{busy ? "Starting…" : label}</button>{err && <span className="text-[12px] text-danger">{err}</span>}</div>;
}
