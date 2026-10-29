"use client";
import { useState } from "react";
import Link from "next/link";
import { ChannelPill, DaysBand, Sku, money } from "@/components/ui";

type Row = { id: string; sku: string; title: string; price_pence: number; listed_at: string; status: string; online: boolean; floor: boolean; photo: string | null };

export function StockActions({ items }: { items: Row[] }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const ids = [...sel].join(",");

  return (
    <>
      <ul>
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 border-b border-rule py-3">
            <input type="checkbox" checked={sel.has(i.id)} onChange={() => toggle(i.id)} className="h-4 w-4 accent-ink" aria-label={`Select ${i.title}`} />
            <Link href={`/app/items/${i.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[2px] bg-paper-2">
                {i.photo && <img src={i.photo} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{i.title}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs">
                  <Sku sku={i.sku} />
                  {i.status === "sold" ? <ChannelPill kind="sold" /> : i.online && i.floor ? <ChannelPill kind="both" /> : i.online ? <ChannelPill kind="online" /> : <ChannelPill kind="floor" />}
                  {i.status === "live" && <DaysBand listedAt={i.listed_at} />}
                </div>
              </div>
              <div className="num text-sm font-medium">{money(i.price_pence)}</div>
            </Link>
          </li>
        ))}
      </ul>
      {sel.size > 0 && (
        <div className="fixed bottom-14 inset-x-0 z-10">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3 bg-ink px-4 py-3 text-paper">
            <span className="text-sm">{sel.size} selected</span>
            <div className="flex gap-2">
              <a href={`/api/labels/batch?ids=${ids}`} target="_blank" rel="noreferrer" className="rounded-[4px] border border-paper px-3 py-2 text-sm">Print labels</a>
              <button onClick={() => setSel(new Set())} className="px-2 text-sm text-paper/70">Clear</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
