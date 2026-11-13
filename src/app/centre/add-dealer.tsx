"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { suggestDealerCode } from "@/lib/sku";

/** "Add a dealer": for dealers who have no app yet. Use the code they already write on their tickets. */
export function AddDealer({ centreId }: { centreId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const [pitch, setPitch] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const [link, setLink] = useState<string | null>(null);
  const effCode = (touched ? code : suggestDealerCode(name)).toUpperCase();

  async function add() {
    setBusy(true); setErr(null);
    const r = await fetch(`/api/centres/${centreId}/dealers`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: name.trim(), code: effCode, email: email.trim(), pitch_numbers: pitch.split(",").map((s) => s.trim()).filter(Boolean) }) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Something went wrong");
    setAdded((a) => [`${name.trim()} · ${effCode}`, ...a]); setLink(j.invite_link ?? null); setName(""); setCode(""); setTouched(false); setPitch(""); setEmail("");
    router.refresh();
  }
  if (!open) return <button className="btn-sm-secondary" onClick={() => setOpen(true)}>Add a dealer</button>;
  return (
    <div className="card mb-6 p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div><h2 className="text-[16px] font-semibold">Add a dealer who has no app yet</h2><p className="text-[13px] text-ink-muted">Use the code they already write on their tickets. They get a free Basic account straight away. Add an email and we invite them to 2 weeks of named sales and 25 free labels. No email? Copy the link and text it.</p></div>
        <button className="text-[13px] text-ink-muted" onClick={() => setOpen(false)}>Close</button>
      </div>
      <div className="mb-3"><label className="field-label">Email, if you have it</label><input className="field" type="email" placeholder="dealer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="grid grid-cols-[1fr_120px_140px_auto] items-end gap-3">
        <div><label className="field-label">Dealer name</label><input className="field" placeholder="Bloom Antiques" value={name} onChange={(e) => setName(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && name.trim() && add()} /></div>
        <div><label className="field-label">Ticket code</label><input className="field ticket uppercase" placeholder="B14" maxLength={4} value={effCode} onChange={(e) => { setTouched(true); setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); }} /></div>
        <div><label className="field-label">Pitches</label><input className="field" placeholder="12, 14" value={pitch} onChange={(e) => setPitch(e.target.value)} /></div>
        <button className="btn-sm !h-12" disabled={busy || name.trim().length < 2 || !/^[A-Z][A-Z0-9]{1,3}$/.test(effCode)} onClick={add}>{busy ? "Adding…" : "Add"}</button>
      </div>
      {err && <p className="mt-2 text-[13px] text-danger">{err}</p>}
      {added.length > 0 && <p className="mt-3 text-[13px] text-success">Added: {added.join(" · ")}. Keep going, one per line.</p>}
      {link && <p className="mt-2 break-all text-[13px]">Invite link: <a className="text-accent" href={link}>{link}</a></p>}
    </div>
  );
}
