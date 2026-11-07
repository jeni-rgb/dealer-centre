"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** A row of operator actions that post to an admin API and show the result inline. */
export function Actions({ endpoint, actions }: { endpoint: string; actions: { label: string; body: Record<string, unknown>; confirm?: string; prompt?: { key: string; label: string; type?: "email" | "number" | "text" }; danger?: boolean }[] }) {
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
      <div className="flex flex-wrap gap-2">{actions.map((a) => <button key={a.label} disabled={busy !== null} onClick={() => run(a)} className={a.danger ? "btn-sm-secondary !text-danger" : "btn-sm-secondary"}>{busy === a.label ? "…" : a.label}</button>)}</div>
      {out && <p className="break-all text-[12px] text-ink-muted">{out}</p>}
    </div>
  );
}
