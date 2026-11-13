"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SumupQueue({ rows }: { rows: { id: string; amount: string; when: string; description: string }[] }) {
  const router = useRouter();
  const [tickets, setTickets] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  async function assign(id: string) {
    setMsg(null);
    const r = await fetch("/api/app/sumup/assign", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ticket: tickets[id] ?? "" }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setMsg(j.error ?? "Could not assign");
    setMsg("Assigned.");
    router.refresh();
  }

  if (!rows.length) return <p className="text-[14px] text-ink-muted">No card sales waiting.</p>;
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.id} className="card flex flex-col gap-2 p-4 text-[14px]">
          <div className="flex items-baseline justify-between"><span className="font-medium">{row.amount}</span><span className="text-[12px] text-ink-muted">{row.when}</span></div>
          <p className="text-[13px] text-ink-muted">{row.description || "No description"}</p>
          <div className="flex gap-2">
            <input className="field ticket" placeholder="Ticket number" value={tickets[row.id] ?? ""} onChange={(e) => setTickets((s) => ({ ...s, [row.id]: e.target.value }))} />
            <button className="btn-sm" onClick={() => assign(row.id)}>Assign</button>
          </div>
        </div>
      ))}
      {msg && <p className="text-[14px]">{msg}</p>}
    </div>
  );
}
