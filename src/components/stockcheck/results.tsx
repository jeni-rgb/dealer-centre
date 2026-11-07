"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { money } from "@/components/ui";
import type { ResultLine } from "@/lib/stockcheck";

const GROUPS: { outcome: string; title: string; hint: string; options: [string, string][] }[] = [
  { outcome: "missing", title: "Missing", hint: "Should be on the floor and was not scanned. Look again before calling it stolen.", options: [["found_later", "Found it"], ["moved", "Moved or at home"], ["sold_unrecorded", "Sold, not recorded"], ["stolen", "Stolen or lost"]] },
  { outcome: "sold_on_shelf", title: "Says sold, but it is here", hint: "Usually the till recorded the wrong ticket, or a sold item was never collected.", options: [["corrected", "Sorted"], ["other", "Something else"]] },
  { outcome: "withdrawn_on_shelf", title: "Withdrawn, but it is here", hint: "The dealer took it off sale but it is still on the floor.", options: [["corrected", "Taken off the floor"], ["other", "Put back on sale"]] },
  { outcome: "not_on_system", title: "Not on the system", hint: "A ticket nobody listed. It can still be sold at the till on the dealer's code.", options: [["corrected", "Listed now"], ["other", "Old ticket, ignore"]] },
  { outcome: "wrong_place", title: "In the wrong place", hint: "Another dealer's item on this pitch, or another centre's item here.", options: [["moved", "Moved back"], ["other", "Something else"]] },
];
const ANSWER: Record<string, string> = { found_later: "Found", moved: "Moved", sold_unrecorded: "Sold, not recorded", stolen: "Stolen or lost", corrected: "Sorted", other: "Noted" };

export function StockResults({ checkId, lines, counts, missingValue, stolenValue, dealerView }: { checkId: string; lines: ResultLine[]; counts: Record<string, number>; missingValue: number; stolenValue: number; dealerView: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  async function answer(line: ResultLine, resolution: string | null) {
    if (resolution === "stolen" && !confirm(`Mark ${line.ticket} as stolen or lost? It comes off sale everywhere, online too.`)) return;
    setBusy(line.id);
    await fetch(`/api/stock-checks/${checkId}/lines/${line.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ resolution }) });
    setBusy(null); router.refresh();
  }
  const open = lines.filter((l) => l.outcome !== "found" && !l.resolution).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="card p-3"><div className="figure text-[24px]">{counts.found}</div><div className="text-[11px] font-semibold text-ink-muted">found</div></div>
        <div className={`card p-3 ${counts.missing ? "border-danger" : ""}`}><div className="figure text-[24px]">{counts.missing}</div><div className="text-[11px] font-semibold text-ink-muted">missing, {money(missingValue)}</div></div>
        <div className="card p-3"><div className="figure text-[24px]">{counts.sold_on_shelf + counts.withdrawn_on_shelf + counts.not_on_system + counts.wrong_place}</div><div className="text-[11px] font-semibold text-ink-muted">other things to check</div></div>
        <div className="card p-3"><div className="figure text-[24px]">{money(stolenValue)}</div><div className="text-[11px] font-semibold text-ink-muted">marked stolen or lost</div></div>
      </div>
      <p className="text-[13px] text-ink-muted">{open ? `${open} still need an answer. Each one says what happened, so the next check starts clean.` : "Everything has an answer."}</p>

      {GROUPS.map((g) => {
        const rows = lines.filter((l) => l.outcome === g.outcome);
        if (!rows.length) return null;
        return (
          <section key={g.outcome} className="flex flex-col gap-2">
            <div><h2 className="text-[16px] font-semibold">{g.title} · {rows.length}</h2><p className="text-[12px] text-ink-muted">{g.hint}</p></div>
            <div className="card divide-y divide-border">
              {rows.map((l) => (
                <div key={l.id} className="flex flex-col gap-2 px-4 py-3 text-[13px]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{l.item_id && dealerView ? <Link className="text-accent" href={`/app/items/${l.item_id}`}>{l.title ?? l.ticket}</Link> : l.title ?? "Unknown ticket"}</div>
                      <div className="text-[12px] text-ink-muted"><span className="ticket">{l.ticket}</span>{l.dealer ? ` · ${l.dealer}` : ""}{l.pitches.length ? ` · pitch ${l.pitches.join(", ")}` : ""}</div>
                    </div>
                    {l.price_pence !== null && <span className="num shrink-0 font-semibold">{money(l.price_pence)}</span>}
                  </div>
                  {l.resolution ? (
                    <div className="flex items-center gap-3"><span className={`pill ${l.resolution === "stolen" ? "pill-danger" : "pill-success"}`}>{ANSWER[l.resolution]}</span><button className="text-[12px] text-ink-muted" disabled={busy === l.id} onClick={() => answer(l, null)}>Change</button>
                      {l.resolution === "sold_unrecorded" && (dealerView && l.item_id ? <Link className="text-[12px] font-medium text-accent" href={`/app/items/${l.item_id}`}>Record the sale</Link> : <span className="text-[12px] text-ink-muted">Record it on End of day</span>)}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">{g.options.map(([k, label]) => <button key={k} disabled={busy === l.id} onClick={() => answer(l, k)} className={k === "stolen" ? "btn-sm-secondary !text-danger" : "btn-sm-secondary"}>{label}</button>)}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {counts.missing + counts.sold_on_shelf + counts.withdrawn_on_shelf + counts.not_on_system + counts.wrong_place === 0 && <p className="card p-5 text-center text-[14px]">Everything that should be there was there. Nothing to sort out.</p>}
    </div>
  );
}
