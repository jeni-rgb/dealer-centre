"use client";
import { useState } from "react";

export function LogoField({ saved }: { saved: boolean }) {
  const [preview, setPreview] = useState<string | null>(saved ? "/api/dealers/logo" : null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setPreview(URL.createObjectURL(file));
    setBusy(true); setMsg(null);
    const body = new FormData();
    body.set("file", file);
    const r = await fetch("/api/dealers/logo", { method: "POST", body });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg(j.error ?? "Could not save");
    setPreview(`/api/dealers/logo?t=${Date.now()}`);
    setMsg("Saved.");
  }

  async function remove() {
    setBusy(true);
    await fetch("/api/dealers/logo", { method: "DELETE" });
    setPreview(null);
    setBusy(false);
    setMsg("Removed.");
  }

  return (
    <div className="flex flex-col gap-3">
      {preview && <img src={preview} alt="Your logo" className="h-20 w-20 rounded-[12px] border border-border bg-white object-contain p-2" />}
      <label className={`btn-secondary cursor-pointer ${busy ? "opacity-50" : ""}`}>
        {preview ? "Change logo" : "Add logo"}
        <input type="file" accept="image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      </label>
      {preview && <button type="button" className="btn-ghost" disabled={busy} onClick={remove}>Remove</button>}
      <p className="text-[12px] text-ink-muted">PNG, JPG or SVG. It prints in black.</p>
      {msg && <p className="text-[13px]">{msg}</p>}
    </div>
  );
}
