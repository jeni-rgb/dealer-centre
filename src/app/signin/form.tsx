"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SignInForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"password" | "link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        setErr(/invalid/i.test(error.message) ? "Email or password not right. If you've never set a password, use \"Forgot password\" or sign in with an email link." : error.message);
        setBusy(false);
        return;
      }
      // Run the same routing as the email link (dealer / centre / admin) via a full page load so cookies are sent.
      window.location.href = next === "/app" || next === "/" || next === "/centre" ? "/api/auth/route?next=" + encodeURIComponent(next) : next;
      return;
    }
    await sendLink(next, "Check your email. The link signs you in on this device.");
    setBusy(false);
  }

  async function forgot() {
    if (!email) { setErr("Type your email first."); return; }
    setErr(null); setBusy(true);
    await sendLink("/account", "Check your email. The link signs you in, then you can set a new password.");
    setBusy(false);
  }

  if (sent) return <p className="mt-6 text-sm">{sent}</p>;
  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <div className="flex gap-2 text-sm">
        <button type="button" className={mode === "password" ? "btn-sm flex-1" : "btn-sm-secondary flex-1"} onClick={() => setMode("password")}>Email + password</button>
        <button type="button" className={mode === "link" ? "btn-sm flex-1" : "btn-sm-secondary flex-1"} onClick={() => setMode("link")}>Email link</button>
      </div>
      <input className="field" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      {mode === "password" && (
        <input className="field" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      )}
      <button className="btn w-full" disabled={busy}>{busy ? "…" : mode === "password" ? "Sign in" : "Send sign in link"}</button>
      {mode === "password" && (
        <button type="button" className="text-sm underline" onClick={forgot} disabled={busy}>Forgot password, or never set one?</button>
      )}
      {err && <p className="text-sm text-danger">{err}</p>}
    </form>
  );
}
