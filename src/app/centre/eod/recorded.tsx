"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { displaySku } from "@/lib/sku";
import { money } from "@/components/ui";

export type RecordedSale = { id: string; amount_pence: number; original_amount_pence: number | null; payment_type: string | null; sold_at: string; ticket_no: string | null; title: string | null; dealer: string | null };

/** The last few days of recorded tickets, each with Edit price and Undo. The "what did it sell for" fix on the centre side. */
export function Recorded({ sales }: { sales: RecordedSale[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [pay, setPay] = useState<"CASH" | "CARD">("CARD");
  const [busy, setBusy] = useState(false);

  async function save(id: string) {
    setBusy(true);
    await fetch(`/api/sales/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount_pence: Math.round(parseFloat(amount || "0") * 100), payment_type: pay }) });
    setBusy(false); setEditing(null); router.refresh();
  }
  async function undo(id: string) {
    if (!confirm("Undo this sale? The item goes back on sale and the dealer's statement is corrected.")) return;
    setBusy(true); await fetch(`/api/sales/${id}`, { method: "DELETE" }); setBusy(false); router.refresh();
  }
  if (sales.length === 0) return null;

  const byDay = sales.reduce<Record<string, RecordedSale[]>>((m, s) => { const k = s.sold_at.slice(0, 10); (m[k] ??= []).push(s); return m; }, {});

  return (
    <div className="mt-8">
      <h2 className="mb-1 text-[17px] font-semibold">Recorded this week</h2>
      <p className="mb-3 text-[13px] text-ink-muted">Wrong figure, or a ticket that should not have gone through? Fix it here. Dealers see the corrected price on their statement.</p>
      {Object.entries(byDay).map(([day, rows]) => (
        <div key={day} className="mb-4">
          <div className="mb-1.5 text-[12px] font-medium text-ink-muted">{new Date(day).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · {money(rows.reduce((a, s) => a + s.amount_pence, 0))}</div>
          <div className="card divide-y divide-border">
            {rows.map((s) => (
              <div key={s.id} className="px-4 py-3 text-[14px]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{s.title ?? "Ticket only"}</div>
                    <div className="text-[12px] text-ink-muted">{s.ticket_no ? displaySku(s.ticket_no) : "No ticket"}{s.dealer ? ` · ${s.dealer}` : ""}{s.payment_type ? ` · ${s.payment_type === "CASH" ? "cash" : "card"}` : ""}{s.original_amount_pence !== null && s.original_amount_pence !== s.amount_pence ? ` · was ${money(s.original_amount_pence)}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="num font-semibold">{money(s.amount_pence)}</span>
                    {editing !== s.id && <button className="text-[13px] font-medium text-accent" onClick={() => { setEditing(s.id); setAmount((s.amount_pence / 100).toString()); setPay(s.payment_type === "CASH" ? "CASH" : "CARD"); }}>Edit</button>}
                  </div>
                </div>
                {editing === s.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="flex h-11 flex-1 items-center gap-1 rounded-[12px] border border-border px-3"><span className="whitespace-nowrap text-[12px] text-ink-muted">Price paid £</span><input className="num min-w-0 flex-1 border-0 text-[18px] font-semibold outline-none" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></div>
                    <div className="flex rounded-[10px] bg-surface-2 p-0.5">{(["CARD", "CASH"] as const).map((p) => <button key={p} onClick={() => setPay(p)} className={`h-10 rounded-[8px] px-4 text-[13px] font-semibold ${pay === p ? "bg-white shadow-sm" : "text-ink-muted"}`}>{p === "CARD" ? "Card" : "Cash"}</button>)}</div>
                    <button className="btn-dark !h-10 !px-4 !text-[13px]" disabled={busy} onClick={() => save(s.id)}>Save</button>
                    <button className="text-[13px] text-ink-muted" onClick={() => setEditing(null)}>Cancel</button>
                    <button className="ml-auto text-[13px] font-medium text-danger" disabled={busy} onClick={() => undo(s.id)}>Undo sale</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
