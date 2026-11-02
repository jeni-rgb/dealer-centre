"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function StaffForm({ staff }: { staff: string[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const r = await fetch("/api/admin/staff", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const j = await r.json(); setBusy(false);
    if (r.ok) { setLink(j.link); setEmail(""); router.refresh(); } else alert(j.error ?? "Could not add");
  }
  async function remove(em: string) {
    if (!confirm(`Remove ${em} from staff?`)) return;
    await fetch("/api/admin/staff", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: em, remove: true }) });
    router.refresh();
  }
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <form onSubmit={add} className="card flex flex-wrap items-end gap-3 p-5">
        <div className="flex-1"><label className="field-label">Email</label><input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="runner@thedealercentre.co.uk" /></div>
        <button className="btn-sm" disabled={busy}>{busy ? "Adding…" : "Add to staff"}</button>
        {link && <p className="w-full break-all text-[12px] text-ink-muted">One use sign in link, send it to them (or they can use Sign in with their email): <a className="text-accent" href={link}>{link}</a></p>}
      </form>
      <div className="card divide-y divide-border">
        {staff.length === 0 && <p className="p-5 text-[14px] text-ink-muted">No staff yet.</p>}
        {staff.map((em) => <div key={em} className="flex items-center justify-between px-5 py-3 text-[14px]"><span>{em}</span><button className="text-[13px] text-danger" onClick={() => remove(em)}>Remove</button></div>)}
      </div>
    </div>
  );
}
