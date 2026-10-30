"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "@/components/ui";

type Row = { id: string; dealer_id: string; name: string; code: string; status: string; square_category_id: string | null; pitch_numbers: string; rent_pence: number; rent_mode: string; rent_schedule: string; rent_set_by: string };
const SCHED: Record<string, string> = { first: "1st", fifteenth: "15th", last: "Last day", weekly_friday: "Fridays", weekly_monday: "Mondays", quarterly: "Quarterly" };

export function MappingTable({ centreId, categories, rows }: { centreId: string; categories: { id: string; name: string }[]; rows: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [pushed, setPushed] = useState<string | null>(null);
  async function pushStock() {
    setBusy("push");
    const r = await fetch(`/api/centres/${centreId}/push-stock`, { method: "POST" });
    const j = await r.json();
    setBusy(null);
    setPushed(`Pushing ${j.items} live items to ${j.channels} channel${j.channels === 1 ? "" : "s"}. Takes a few minutes, watch Health for failures.`);
  }
  async function save(id: string, patch: Record<string, unknown>) {
    setBusy(id);
    await fetch(`/api/centres/${centreId}/dealers/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    setBusy(null); router.refresh();
  }
  const used = new Set(rows.map((r) => r.square_category_id).filter(Boolean));
  const unmapped = categories.filter((c) => !used.has(c.id));
  const pendingRows = rows.filter((r) => r.status === "pending");

  return (
    <div className="flex flex-col gap-6">
      {pendingRows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-border px-5 py-4"><h2 className="text-[16px] font-semibold">Join requests <span className="text-ink-muted">{pendingRows.length}</span></h2></div>
          {pendingRows.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b border-border px-5 py-3 text-[14px] last:border-0">
              <span><span className="font-medium">{r.name}</span> <span className="ticket text-[12px] text-ink-muted">{r.code}</span> · declared {r.rent_mode === "rent" ? `£${(r.rent_pence / 100).toFixed(0)} rent, ${SCHED[r.rent_schedule]}` : "commission only"}</span>
              <div className="flex gap-2"><button className="btn-sm-secondary" disabled={busy === r.id} onClick={() => save(r.id, { status: "declined" })}>Decline</button><button className="btn-sm" disabled={busy === r.id} onClick={() => save(r.id, { status: "active" })}>Approve</button></div>
            </div>
          ))}
        </div>
      )}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-border bg-white px-4 py-3 text-[13px]">
          <span className="text-ink-muted">{unmapped.length > 0 ? `${unmapped.length} Square categor${unmapped.length === 1 ? "y is" : "ies are"} not assigned to any dealer. ` : ""}Once dealers are mapped, push every item already in the app onto the till. Nothing is re added.</span>
          <button className="btn-sm" disabled={busy === "push"} onClick={pushStock}>{busy === "push" ? "Queuing…" : "Push all stock to till"}</button>
        </div>
      )}
      {pushed && <p className="text-[13px] text-success">{pushed}</p>}
      <div className="card overflow-hidden">
        <table className="w-full text-[14px]">
          <thead className="text-left text-[12px] text-ink-muted"><tr className="border-b border-border"><th className="px-5 py-3 font-medium">Dealer</th><th className="py-3 font-medium">Square category</th><th className="py-3 font-medium">Pitches</th><th className="py-3 font-medium">Rent</th><th className="py-3 font-medium">Taken</th><th className="px-5 py-3 font-medium">Status</th></tr></thead>
          <tbody>
            {rows.filter((r) => r.status === "active").map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-5 py-2"><span className="font-medium">{r.name}</span> <span className="ticket text-[12px] text-ink-muted">{r.code}</span></td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <select className="field !h-9 !w-56 !text-[13px]" value={r.square_category_id ?? ""} disabled={busy === r.id} onChange={(e) => save(r.id, { square_category_id: e.target.value || null })}><option value="">Not mapped</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                    {!r.square_category_id && <button className="whitespace-nowrap text-[12px] font-medium text-accent" disabled={busy === r.id} onClick={() => save(r.id, { create_square_category: true })}>Create in Square</button>}
                  </div>
                </td>
                <td className="py-2"><input className="field !h-9 !w-24 !text-[13px]" defaultValue={r.pitch_numbers} placeholder="12, 14" onBlur={(e) => e.target.value !== r.pitch_numbers && save(r.id, { pitch_numbers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></td>
                <td className="py-2"><div className="flex items-center gap-1"><span className="text-ink-muted">£</span><input className="field num !h-9 !w-20 !text-[13px]" inputMode="decimal" defaultValue={(r.rent_pence / 100).toString()} onBlur={(e) => save(r.id, { rent_pence: Math.round(parseFloat(e.target.value || "0") * 100) })} />{r.rent_set_by === "dealer" && <Pill kind="neutral">Declared</Pill>}</div></td>
                <td className="py-2"><select className="field !h-9 !w-32 !text-[13px]" value={r.rent_schedule} onChange={(e) => save(r.id, { rent_schedule: e.target.value })}>{Object.entries(SCHED).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                <td className="px-5 py-2"><Pill kind="success">Active</Pill></td>
              </tr>
            ))}
            {rows.filter((r) => r.status === "active").length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-ink-muted">No active dealers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
