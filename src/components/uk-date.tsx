"use client";
import { ukDateFromYmd } from "@/lib/dates";

/** A date field that always reads 13 November 2026, whatever the browser locale. */
export function UkDate({ value, max, onChange }: { value: string; max?: string; onChange: (ymd: string) => void }) {
  return (
    <label className="field relative flex items-center">
      <span className="pointer-events-none">{ukDateFromYmd(value)}</span>
      <input type="date" className="absolute inset-0 cursor-pointer opacity-0" value={value} max={max} onChange={(e) => e.target.value && onChange(e.target.value)} aria-label={ukDateFromYmd(value)} />
    </label>
  );
}
