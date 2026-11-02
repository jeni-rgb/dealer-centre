"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@/lib/fulfilment/orders";

/** One row's controls: next step button, post with tracking, or flag missing. */
export function OrderActions({ saleId, status, carrier, tracking }: { saleId: string; status: OrderStatus; carrier: string | null; tracking: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [posting, setPosting] = useState(false);
  const [c, setC] = useState(carrier ?? "Royal Mail");
  const [t, setT] = useState(tracking ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  async function set(next: OrderStatus, extra: Record<string, string> = {}) {
    setBusy(true);
    const r = await fetch(`/api/admin/orders/${saleId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next, ...extra }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false); setPosting(false);
    if (!r.ok) { setMsg(j.error ?? "Could not save"); return; }
    if (next === "posted") setMsg(j.shopify === false ? "Saved. Shopify did not accept the fulfilment, send the buyer the tracking by hand." : j.shopify ? "Saved and the buyer has been emailed by Shopify." : "Saved.");
    router.refresh();
  }
  if (posting) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input className="field !h-9 !w-32 !text-[13px]" value={c} onChange={(e) => setC(e.target.value)} placeholder="Carrier" />
        <input className="field !h-9 !w-44 !text-[13px]" value={t} onChange={(e) => setT(e.target.value)} placeholder="Tracking number" autoFocus />
        <button className="btn-sm" disabled={busy} onClick={() => set("posted", { carrier: c, tracking: t })}>{busy ? "…" : "Posted"}</button>
        <button className="text-[13px] text-ink-muted" onClick={() => setPosting(false)}>Cancel</button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {msg && <span className="text-[12px] text-ink-muted">{msg}</span>}
      {status === "new" && <button className="btn-sm" disabled={busy} onClick={() => set("collected")}>Collected</button>}
      {status === "collected" && <button className="btn-sm" disabled={busy} onClick={() => set("packed")}>Packed</button>}
      {(status === "packed" || status === "collected") && <button className="btn-sm-secondary" disabled={busy} onClick={() => setPosting(true)}>Post it</button>}
      {status === "posted" && <span className="pill pill-success">Posted{tracking ? ` · ${tracking}` : ""}</span>}
      {status === "missing" && <button className="btn-sm-secondary" disabled={busy} onClick={() => set("new")}>Found it</button>}
      {status !== "posted" && status !== "missing" && <button className="text-[12px] font-medium text-danger" disabled={busy} onClick={() => set("missing")}>Missing</button>}
    </div>
  );
}
