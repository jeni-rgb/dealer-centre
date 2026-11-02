"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function PaidToggle({ centreId, dealerId, period, paid }: { centreId: string; dealerId: string; period: string; paid: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function flip() {
    setBusy(true);
    await fetch(`/api/centres/${centreId}/statements`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ dealer_id: dealerId, period, paid: !paid }) });
    setBusy(false); router.refresh();
  }
  return <button onClick={flip} disabled={busy} className={paid ? "btn-sm-secondary" : "btn-sm"}>{busy ? "…" : paid ? "Paid ✓" : "Mark paid"}</button>;
}
