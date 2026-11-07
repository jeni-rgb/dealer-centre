"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Who = "dealer" | "centre";

export function SignupStart({ initialAs, plan }: { initialAs: Who | null; plan: string | null }) {
  const [who, setWho] = useState<Who | null>(initialAs);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!who || busy) return;
    setBusy(true); setErr(null);
    const next = who === "centre" ? "/signup/centre" : `/signup/dealer${plan ? `?plan=${plan}` : ""}`;
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}` } });
    setBusy(false);
    if (error) setErr(error.message); else setSent(true);
  }

  if (sent) return (
    <div>
      <h1 className="text-[30px] font-bold leading-tight">Check your email</h1>
      <p className="mt-3 text-[16px] font-medium text-ink-muted">We sent a link to <span className="text-ink">{email}</span>. Tap it on this device and you are in. No password, ever.</p>
      <p className="mt-6 text-[14px] text-ink-muted">Nothing there after a minute? Check spam, or <button className="font-semibold text-accent" onClick={() => setSent(false)}>try another address</button>.</p>
    </div>
  );

  return (
    <form onSubmit={submit}>
      <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.02em]">Create your account</h1>
      <p className="mt-3 text-[16px] font-medium text-ink-muted">Two minutes. {who === "centre" ? "Then we book your set up day." : "Then list your first item."}</p>
      <div className="mt-8 grid grid-cols-2 gap-3">
        {([["dealer", "I rent a pitch", "From £25 a month plus VAT. £0.00 for 5 days if you list your own stock."], ["centre", "I run a centre", "From £249 a month plus VAT, Register kit on the £299 plan"]] as const).map(([k, t, s]) => (
          <button type="button" key={k} onClick={() => setWho(k)} className={`rounded-[18px] border p-4 text-left transition ${who === k ? "border-accent bg-accent-soft" : "border-border bg-white"}`}>
            <span className="block text-[16px] font-bold">{t}</span><span className="mt-1 block text-[13px] font-medium text-ink-muted">{s}</span>
          </button>
        ))}
      </div>
      <label className="field-label mt-8 block" htmlFor="email">Your email</label>
      <input id="email" className="field" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      {err && <p className="mt-2 text-[13px] text-danger">{err}</p>}
      <button className="btn mt-4" disabled={!who || busy}>{busy ? "Sending…" : who === "centre" ? "Set up my centre" : who === "dealer" ? "List my first item" : "Choose one above"}</button>
      <p className="mt-4 text-[13px] text-ink-muted">We email you a sign in link. No password to remember, no card until you choose a plan.</p>
    </form>
  );
}
