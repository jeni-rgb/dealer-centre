"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PASSWORD_COPY } from "@/lib/password";

export function SignInForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"password" | "link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const redirect = (to: string) => `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(to)}`;

  async function sendLink(to: string, msg: string) {
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { emailRedirectTo: redirect(to) } });
    if (error) setErr(error.message); else setSent(msg);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(null); setBusy(true);
    if (mode === "password") {
      const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
      if (error) {
        setErr(PASSWORD_COPY.badPassword);
        setBusy(false);
        return;
      }
      window.location.href = next === "/app" || next === "/" || next === "/centre" ? "/api/auth/route?next=" + encodeURIComponent(next) : next;
      return;
    }
    await sendLink(next, PASSWORD_COPY.linkSent);
    setBusy(false);
  }

  async function forgot() {
    if (!email) { setErr(PASSWORD_COPY.needEmail); return; }
    setErr(null); setBusy(true);
    await sendLink("/account", PASSWORD_COPY.forgotSent);
    setBusy(false);
  }

  if (sent) return <p className="mt-6 text-[15px]">{sent}</p>;
  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <input className="field" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      {mode === "password" && (
        <div className="relative">
          <input className="field pr-16" type={show ? "text" : "password"} autoComplete="current-password" placeholder="Password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-accent" onClick={() => setShow((v) => !v)}>{show ? PASSWORD_COPY.hide : PASSWORD_COPY.show}</button>
        </div>
      )}
      <button className="btn w-full" disabled={busy}>{busy ? "…" : mode === "password" ? "Sign in" : PASSWORD_COPY.sendLink}</button>
      {mode === "password" ? (
        <div className="flex flex-col items-start gap-2 text-[14px]">
          <button type="button" className="font-medium text-accent" onClick={forgot} disabled={busy}>{PASSWORD_COPY.forgot}</button>
          <button type="button" className="font-medium text-ink-muted" onClick={() => { setMode("link"); setErr(null); }}>{PASSWORD_COPY.emailLink}</button>
        </div>
      ) : (
        <button type="button" className="text-[14px] font-medium text-accent" onClick={() => { setMode("password"); setErr(null); }}>{PASSWORD_COPY.usePassword}</button>
      )}
      {err && <p className="text-sm text-danger">{err}</p>}
    </form>
  );
}
