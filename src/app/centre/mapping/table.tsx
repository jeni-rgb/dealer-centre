"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = { id: string; dealer_id: string; name: string; code: string; status: string; square_category_id: string | null; pitch_numbers: string; rent_pence: number };

export function MappingTable({ centreId, categories, rows }: { centreId: string; categories: { id: string; name: string }[]; rows: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [newCat, setNewCat] = useState<Record<string, boolean>>({});

  async function save(id: string, patch: Record<string, unknown>) {
    setBusy(id);
    await fetch(`/api/centres/${centreId}/dealers/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    setBusy(null);
    router.refresh();
  }

  const used = new Set(rows.map((r) => r.square_category_id).filter(Boolean));
  const unmapped = categories.filter((c) => !used.has(c.id));

  return (
    <>
      {unmapped.length > 0 && (
        <p className="mb-3 text-xs text-ink-3">{unmapped.length} Square categor{unmapped.length === 1 ? "y is" : "ies are"} not assigned to any dealer.</p>
      )}
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-ink-3">
          <tr className="border-b border-rule">
            <th className="py-2 font-normal">Dealer</th>
            <th className="py-2 font-normal">Code</th>
            <th className="py-2 font-normal">Square category</th>
            <th className="py-2 font-normal">Pitches</th>
            <th className="py-2 font-normal">Rent £/month</th>
            <th className="py-2 font-normal">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={`border-b border-rule ${r.status === "pending" ? "bg-brass-2/40" : ""}`}>
              <td className="py-2">{r.name}</td>
              <td className="sku py-2 text-ink-2">{r.code}</td>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <select
                    className="field py-1 text-sm"
                    value={r.square_category_id ?? ""}
                    onChange={(e) => save(r.id, { square_category_id: e.target.value || null })}
                    disabled={busy === r.id}
                  >
                    <option value="">Not mapped</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {!r.square_category_id && categories.length >= 0 && (
                    <button
                      className="whitespace-nowrap text-xs underline"
                      disabled={busy === r.id || newCat[r.id]}
                      onClick={() => { setNewCat({ ...newCat, [r.id]: true }); save(r.id, { create_square_category: true }); }}
                    >
                      Create in Square
                    </button>
                  )}
                </div>
              </td>
              <td className="py-2">
                <input className="field py-1 text-sm" defaultValue={r.pitch_numbers} placeholder="12, 14" onBlur={(e) => e.target.value !== r.pitch_numbers && save(r.id, { pitch_numbers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
              </td>
              <td className="py-2">
                <input className="field num py-1 text-sm w-24" inputMode="decimal" defaultValue={(r.rent_pence / 100).toString()} onBlur={(e) => save(r.id, { rent_pence: Math.round(parseFloat(e.target.value || "0") * 100) })} />
              </td>
              <td className="py-2">
                {r.status === "pending" ? (
                  <button className="btn py-1" disabled={busy === r.id} onClick={() => save(r.id, { status: "active" })}>Approve</button>
                ) : (
                  <span className="text-xs text-ink-3">Active</span>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="py-6 text-sm text-ink-2">No dealers yet. Give them your centre code.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
