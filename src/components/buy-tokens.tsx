"use client";
import { useState } from "react";
import { labelPriceLabel } from "@/lib/billing/pricing";

/** Buy labels. 75p plus VAT each, not the monthly plan. */
export function BuyTokens({ dealerId, next }: { dealerId?: string; next: string }) {
  const [qty, setQty] = useState("10");
  const n = Math.floor(Number(qty));
  const ok = qty.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= 5000 && String(n) === qty.trim();
  const q = new URLSearchParams({ qty: String(ok ? n : 1), next });
  if (dealerId) q.set("dealer", dealerId);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <label className="text-[12px] text-ink-muted" htmlFor={dealerId ? `tokens-${dealerId}` : "tokens-qty"}>How many items</label>
      <input id={dealerId ? `tokens-${dealerId}` : "tokens-qty"} inputMode="numeric" className="field num !h-9 !w-24" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))} />
      <a className={`btn-sm ${ok ? "" : "pointer-events-none opacity-50"}`} href={ok ? `/api/billing/tokens?${q}` : "#"}>{ok ? `Buy labels, ${labelPriceLabel(n)}` : "Buy labels"}</a>
    </div>
  );
}
