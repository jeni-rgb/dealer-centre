"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Act = { label: string; body: Record<string, unknown>; confirm?: string; prompt?: { key: string; label: string; type?: "email" | "number" | "text" }; danger?: boolean; disabled?: boolean; hint?: string };

/** A row of operator actions that post to an admin API and show the result inline. */
export function Actions({ endpoint, actions }: { endpoint: string; actions: Act[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [out, setOut] = useState<string | null>(null);
  async function run(a: (typeof actions)[number]) {
    let body = { ...a.body };
    if (a.prompt) { const v = window.prompt(a.prompt.label); if (v === null || v === "") return; body = { ...body, [a.prompt.key]: a.prompt.type === "number" ? Number(v) : v }; }
    if (a.confirm && !window.confirm(a.confirm)) return;
    setBusy(a.label); setOut(null);
    const r = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) { setOut(`Failed: ${j.error ?? r.status}`); return; }
    const base = j.link ? `Done. One use link: ${j.link}` : j.pin ? `New till PIN: ${j.pin} (shown once)` : j.until ? `Done, until ${new Date(j.until).toLocaleDateString("en-GB")}` : "Done.";
    const mail = j.emailed ? " Dealer emailed the first payment date." : j.email_error ? ` Trial started but the email failed: ${j.email_error}` : "";
    setOut(`${base}${j.until ? mail : ""}${j.note ? ` ${j.note}` : ""}`);
    router.refresh();
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">{actions.map((a) => <button key={a.label} disabled={busy !== null || a.disabled} title={a.hint} onClick={() => run(a)} className={a.danger ? "btn-sm-secondary !text-danger" : "btn-sm-secondary"}>{busy === a.label ? "…" : a.disabled && a.hint ? `${a.label}. ${a.hint}` : a.label}</button>)}</div>
      {out && <p className="break-all text-[12px] text-ink-muted">{out}</p>}
    </div>
  );
}

/** Actions grouped in a menu. Destructive items stay red and still ask before they run. */
export function ActionMenu({ endpoint, actions }: { endpoint: string; actions: Act[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [out, setOut] = useState<string | null>(null);
  async function run(a: Act) {
    if (a.disabled) return;
    let body = { ...a.body };
    if (a.prompt) { const v = window.prompt(a.prompt.label); if (v === null || v === "") return; body = { ...body, [a.prompt.key]: a.prompt.type === "number" ? Number(v) : v }; }
    if (a.confirm && !window.confirm(a.confirm)) return;
    setBusy(a.label); setOut(null); setOpen(false);
    const r = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) { setOut(`Failed: ${j.error ?? r.status}`); return; }
    const base = j.link ? `Done. One use link: ${j.link}` : j.pin ? `New till PIN: ${j.pin} (shown once)` : j.until ? `Done, until ${new Date(j.until).toLocaleDateString("en-GB")}` : "Done.";
    const mail = j.emailed ? " Dealer emailed the first payment date." : j.email_error ? ` Trial started but the email failed: ${j.email_error}` : "";
    setOut(`${base}${j.until ? mail : ""}${j.note ? ` ${j.note}` : ""}`);
    router.refresh();
  }
  return (
    <div className="relative">
      <button type="button" className="btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>Actions</button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-20 cursor-default" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-[14px] border border-border bg-white py-1 shadow-lg">
            {actions.map((a) => (
              <button key={a.label} type="button" disabled={busy !== null || a.disabled} onClick={() => run(a)} className={`flex w-full flex-col px-3 py-2 text-left text-[13px] hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 ${a.danger ? "text-danger" : ""}`}>
                <span className="font-medium">{busy === a.label ? "…" : a.label}</span>
                {a.hint && <span className="text-[11px] text-ink-muted">{a.hint}</span>}
              </button>
            ))}
          </div>
        </>
      )}
      {out && <p className="mt-2 max-w-xs break-all text-right text-[12px] text-ink-muted">{out}</p>}
    </div>
  );
}
