"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SignInForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(null); setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    if (error) setErr(error.message); else setSent(true);
  }
  if (sent) return <p className="mt-6 text-sm">Check your email. The link signs you in on this device.</p>;
  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <input className="field" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <button className="btn w-full" disabled={busy}>{busy ? "Sending…" : "Send sign in link"}</button>
      {err && <p className="text-sm text-danger">{err}</p>}
    </form>
  );
}
