"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function StockSearch({ initial }: { initial: string }) {
  const [v, setV] = useState(initial);
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => {
      const p = new URLSearchParams(params.toString());
      if (v.trim()) p.set("q", v); else p.delete("q");
      const qs = p.toString();
      start(() => router.replace(`${path}${qs ? `?${qs}` : ""}`, { scroll: false }));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  return (
    <div className="relative">
      <input
        type="search" inputMode="search" enterKeyHint="search" autoComplete="off" autoCorrect="off" autoCapitalize="none"
        value={v} onChange={(e) => setV(e.target.value)}
        placeholder="Search code or words, e.g. BAAV 2 or chest"
        aria-label="Search stock"
        className="h-12 w-full rounded-[12px] border border-border bg-white pl-4 pr-12 text-[16px] outline-none focus:border-accent [&::-webkit-search-cancel-button]:hidden"
      />
      {pending && <span className="absolute right-12 top-1/2 -translate-y-1/2 text-[12px] text-ink-muted">…</span>}
      {v && (
        <button type="button" aria-label="Clear search" onClick={() => setV("")}
          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[20px] text-ink-muted">×</button>
      )}
    </div>
  );
}
