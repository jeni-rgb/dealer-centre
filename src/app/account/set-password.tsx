"use client";
import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SetPassword({ back }: { back: string }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    if (pw !== pw2) return setErr("The two passwords don't match.");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setErr(error.message); else { setMsg("Password saved. Next time, sign in with your email and this password."); setPw(""); setPw2(""); }
  }
  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <input className="field" type="password" autoComplete="new-password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} required />
      <input className="field" type="password" autoComplete="new-password" placeholder="Type it again" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
      <button className="btn w-full" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
      {msg && <p className="text-sm">{msg}</p>}
      {err && <p className="text-sm text-danger">{err}</p>}
      <Link href={back} className="btn-ghost">Back</Link>
    </form>
  );
}
