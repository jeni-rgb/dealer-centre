"use client";
import { useState } from "react";
import Link from "next/link";
import { DaysBand, Pill, Sku, money, when } from "@/components/ui";

type Row = {
  id: string; sku: string; title: string; price_pence: number; listed_price_pence: number | null; listed_at: string; sold_at: string | null; status: string;
  floor: boolean; ownShopify: boolean; centreShop: boolean; ebay: boolean; noLabel: boolean; photo: string | null;
  sold_amount: number | null; sold_channel: { type: string; owner_type: string } | null;
};

export function StockList({ rows, mode, filter }: { rows: Row[]; mode: "live" | "sold"; filter: string }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [noLabelOnly, setNoLabelOnly] = useState(false);
  const shown = noLabelOnly ? rows.filter((r) => r.noLabel) : rows;
  const noLabelCount = rows.filter((r) => r.noLabel).length;
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex rounded-[10px] bg-surface-2 p-0.5">
          <Link href="/app/stock" className={`h-9 rounded-[8px] px-4 text-[13px] font-semibold leading-9 ${mode === "live" ? "bg-white text-ink shadow-sm" : "text-ink-muted"}`}>Live</Link>
          <Link href="/app/stock?f=sold" className={`h-9 rounded-[8px] px-4 text-[13px] font-semibold leading-9 ${mode === "sold" ? "bg-white text-ink shadow-sm" : "text-ink-muted"}`}>Sold</Link>
        </div>
        {mode === "live" && (
          <button className="text-[13px] font-medium text-accent" onClick={() => { setSelecting(!selecting); setSel(new Set()); }}>{selecting ? "Done" : "Select"}</button>
        )}
      </div>

      {mode === "live" && (
        <div className="flex gap-2">
          {filter === "old" && <Pill kind="danger">Over 90 days</Pill>}
          {noLabelCount > 0 && (
            <button className={`pill ${noLabelOnly ? "pill-warning" : "pill-neutral"}`} onClick={() => setNoLabelOnly(!noLabelOnly)}>No label · {noLabelCount}</button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {shown.map((r) => {
          const inner = (
            <>
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-surface-2">{r.photo && <img src={r.photo} alt="" className="h-full w-full object-cover" />}</div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-[14px] font-medium">{r.title}</span>
                <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-muted">
                  <Sku sku={r.sku} className="!font-medium !tracking-normal" />
                  {mode === "live" ? (
                    <>
                      {r.floor && <Pill kind="neutral">Floor</Pill>}
                      {r.ownShopify && <Pill kind="accent">Shopify</Pill>}
                      {r.centreShop && <Pill kind="accent">Centre shop</Pill>}
                      {r.ebay && <Pill kind="accent">eBay</Pill>}
                      {r.noLabel && <Pill kind="warning">No label</Pill>}
                      <DaysBand listedAt={r.listed_at} />
                    </>
                  ) : (
                    <>
                      <Pill kind="success">Sold</Pill>
                      <span>{r.sold_channel?.type === "shopify" ? (r.sold_channel.owner_type === "centre" ? "Centre shop" : "Shopify") : r.sold_channel?.type === "ebay" ? "eBay" : "Floor"}{r.sold_at ? ` · ${when(r.sold_at)}` : ""}</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="num text-[15px] font-semibold">{money(mode === "sold" && r.sold_amount !== null ? r.sold_amount : r.price_pence)}</span>
                {mode === "sold" && r.sold_amount !== null && r.listed_price_pence !== null && r.sold_amount !== r.listed_price_pence && (
                  <span className="num text-[12px] text-ink-muted line-through">{money(r.listed_price_pence)}</span>
                )}
              </div>
            </>
          );
          return selecting ? (
            <button key={r.id} onClick={() => toggle(r.id)} className={`row text-left ${sel.has(r.id) ? "border-accent bg-accent-soft" : ""}`}>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${sel.has(r.id) ? "border-accent bg-accent text-white" : "border-border"}`}>{sel.has(r.id) && "✓"}</span>
              {inner}
            </button>
          ) : (
            <Link key={r.id} href={`/app/items/${r.id}`} className="row">{inner}</Link>
          );
        })}
      </div>

      {selecting && sel.size > 0 && (
        <div className="fixed inset-x-0 bottom-[84px] z-10 px-5">
          <div className="mx-auto flex max-w-[350px] items-center justify-between rounded-[14px] bg-ink px-4 py-3 text-white shadow-lg">
            <span className="text-[14px]">{sel.size} selected</span>
            <a href={`/api/labels/batch?ids=${[...sel].join(",")}`} target="_blank" rel="noreferrer" className="rounded-[10px] bg-accent px-3 py-2 text-[13px] font-semibold">Print labels</a>
          </div>
        </div>
      )}
    </>
  );
}
