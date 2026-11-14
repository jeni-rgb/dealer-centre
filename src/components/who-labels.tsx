"use client";
import { useState } from "react";
import { labelPriceLabel } from "@/lib/billing/pricing";

/** Shown after Keep Full when the free 25 still cover every printed label. */
export function WhoLabels() {
  const [buy, setBuy] = useState(false);
  const [qty, setQty] = useState("50");
  const n = Math.floor(Number(qty));
  const ok = qty.trim() !== "" && Number.isInteger(n) && n >= 1 && String(n) === qty.trim();
  return (
    <div className="card p-4">
      <p className="text-[15px] font-semibold">Who labels your stock from now?</p>
      {!buy ? (
        <div className="mt-3 flex flex-col gap-2">
          <button type="button" className="btn" onClick={() => setBuy(true)}>Buy labels, 75p each plus VAT</button>
          <a className="btn-secondary text-center" href="/api/billing/keep-full?choice=self">I load my own, free</a>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <label className="text-[14px] font-medium" htmlFor="label-qty">How many</label>
          <input id="label-qty" inputMode="numeric" className="field text-center text-[28px] font-semibold" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))} />
          <p className="text-[13px] text-ink-muted">{ok ? labelPriceLabel(n) : "Enter how many"}</p>
          <a className={`btn text-center ${ok ? "" : "pointer-events-none opacity-50"}`} href={ok ? `/api/billing/keep-full?qty=${n}` : "#"}>{ok ? `Pay ${labelPriceLabel(n)}` : "Enter how many"}</a>
          <button type="button" className="text-[13px] font-medium text-accent" onClick={() => setBuy(false)}>Back</button>
        </div>
      )}
    </div>
  );
}
