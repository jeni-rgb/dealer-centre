"use client";
import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PASSWORD_COPY, passwordIssue } from "@/lib/password";

/** Sets the Supabase password and clears a temporary password flag. */
export function SetPassword({ back, onSaved, label = PASSWORD_COPY.save }: { back?: string; onSaved?: () => void; label?: string }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    const issue = passwordIssue(pw, pw2);
    if (issue) return setErr(issue);
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw, data: { password_set: true, temp_password: false } });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setMsg(PASSWORD_COPY.saved);
    setPw(""); setPw2("");
    onSaved?.();
  }
  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <div className="relative">
        <input className="field pr-16" type={show ? "text" : "password"} autoComplete="new-password" placeholder="Password" aria-label="Password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-accent" onClick={() => setShow((v) => !v)}>{show ? PASSWORD_COPY.hide : PASSWORD_COPY.show}</button>
      </div>
      <input className="field" type={show ? "text" : "password"} autoComplete="new-password" placeholder="Confirm password" aria-label="Confirm password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
      <button className="btn w-full" disabled={busy}>{busy ? "Saving…" : label}</button>
      {msg && <p className="text-sm">{msg}</p>}
      {err && <p className="text-sm text-danger">{err}</p>}
      {back && <Link href={back} className="btn-ghost">Back</Link>}
    </form>
  );
}
