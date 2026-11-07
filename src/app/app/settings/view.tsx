"use client";
import { useState } from "react";
import { PRINTER_MODELS, SIZE_HELP, SIZE_LABEL, SIZE_PLACEHOLDER, modelBySize } from "@/lib/labels/models";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pill, Toggle, ToggleGroup, money } from "@/components/ui";
import { BuyTokens } from "@/components/buy-tokens";
import { dealerPlanSentence } from "@/lib/billing/plan-copy";

type Channel = { id: string; type: string; external_account_id: string; status: string; last_webhook_at: string | null } | null;
type Dealer = { name: string; code: string; plan: string; trial_ends_at: string | null; item_limit: number; monthly_sold_limit: number; listing_mode: string | null; listing_tokens: number; listing_tokens_bought: number; default_own_shopify: boolean; default_centre_shopify: boolean };

export function SettingsView({ email, meId, people, dealer, shopify, square, centres, printers }: {
  email: string; meId: string; people: { id: string; email: string }[]; dealer: Dealer; shopify: Channel; square: Channel;
  centres: { id: string; name: string; status: string; rent_pence: number; rent_mode: string }[];
  printers: { id: string; name: string; own: boolean; cloud: boolean; w: number; h: number }[];
}) {
  const router = useRouter();
  const [shop, setShop] = useState("");
  const [printerName, setPrinterName] = useState("");
  const [printerModel, setPrinterModel] = useState<string>("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editModel, setEditModel] = useState("");
  const [personEmail, setPersonEmail] = useState("");
  const [peopleMsg, setPeopleMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [d, setD] = useState({ own: dealer.default_own_shopify, shop: dealer.default_centre_shopify });

  async function saveDefaults(next: typeof d) {
    setD(next);
    await fetch("/api/dealers/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ default_own_shopify: next.own, default_centre_shopify: next.shop }) });
  }
  async function addPrinter(e: React.FormEvent) {
    e.preventDefault();
    if (!printerModel) return;
    await fetch("/api/printers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: printerName.trim(), provider: "browser", model: printerModel }) });
    setPrinterName(""); setPrinterModel(""); router.refresh();
  }
  async function removePrinter(id: string, name: string) {
    if (!confirm(`Remove "${name}"? Labels already printed are kept.`)) return;
    await fetch(`/api/printers?id=${id}`, { method: "DELETE" });
    router.refresh();
  }
  async function saveEdit(id: string) {
    await fetch("/api/printers", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, name: editName.trim() || undefined, model: editModel || undefined }) });
    setEditing(null); router.refresh();
  }

  async function people_(body: Record<string, unknown>) {
    setBusy(true); setPeopleMsg(null);
    const r = await fetch("/api/dealers/people", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setPeopleMsg(j.error ?? "Something went wrong"); return false; }
    router.refresh();
    return j;
  }
  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    const j = await people_({ action: "add", email: personEmail.trim() });
    if (j) { setPeopleMsg(j.emailed ? `Sign in link sent to ${personEmail.trim()}` : `Added. They can sign in at /signin with ${personEmail.trim()}`); setPersonEmail(""); }
  }
  async function removePerson(p: { id: string; email: string }) {
    if (!confirm(`Remove ${p.email}? They will no longer be able to sign in to this account.`)) return;
    await people_({ action: "remove", id: p.id });
  }

  return (
    <>
      <Section title="Account">
        <div className="card divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-3.5"><span className="flex flex-col"><span className="text-[15px] font-medium">{dealer.name}</span><span className="text-[12px] text-ink-muted">{email}</span></span><span className="ticket text-[16px]">{dealer.code}</span></div>
          <Link href="/api/billing/portal" className="flex items-center justify-between gap-3 px-4 py-3.5"><span className="flex flex-col"><span className="text-[15px] font-medium">Plan</span><span className="text-[12px] text-ink-muted">{dealerPlanSentence(dealer)}</span></span><span className="shrink-0 text-[13px] font-medium text-accent">Manage plan</span></Link>
          {dealer.listing_mode === "staff" && <div className="px-4 py-3.5"><span className="block text-[15px] font-medium">Listing tokens</span><span className="text-[12px] text-ink-muted">{dealer.listing_tokens_bought > 0 ? `${dealer.listing_tokens} left. £1 plus VAT each. We photograph the stock from these.` : "None paid yet. We photograph the stock after you pay, £1 plus VAT each."}</span><BuyTokens next="/app/settings" /></div>}
        </div>
      </Section>

      <Section title="Who can sign in">
        <div className="card divide-y divide-border">
          {people.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3.5"><span className="flex flex-col"><span className="text-[15px] font-medium">{p.email}</span>{p.id === meId && <span className="text-[12px] text-ink-muted">You</span>}</span>{p.id !== meId && people.length > 1 && <button type="button" className="btn-sm-secondary" disabled={busy} onClick={() => removePerson(p)}>Remove</button>}</div>
          ))}
          <form onSubmit={addPerson} className="flex flex-col gap-2 px-4 py-3"><div className="flex gap-2"><input type="email" required className="field !h-10 !text-[14px]" placeholder="Add a person, their email" value={personEmail} onChange={(e) => setPersonEmail(e.target.value)} /><button className="btn-sm" disabled={busy}>Add</button></div><span className="text-[12px] text-ink-muted">They see the same stock, sales and statements. No extra charge.</span>{peopleMsg && <span className="text-[13px]">{peopleMsg}</span>}</form>
        </div>
      </Section>

      <Section title="Connections">
        <div className="card divide-y divide-border">
          <div className="px-4 py-3.5">
            <div className="flex items-center justify-between"><span className="text-[15px] font-medium">Your Shopify</span>{shopify ? <Pill kind="success">Connected</Pill> : <Pill kind="neutral">Not connected</Pill>}</div>
            {shopify ? <p className="mt-1 text-[12px] text-ink-muted">{shopify.external_account_id}{shopify.last_webhook_at ? ` · last event ${new Date(shopify.last_webhook_at).toLocaleString("en-GB")}` : ""}</p> : (
              <form className="mt-2 flex gap-2" action="/api/oauth/shopify" method="get"><input name="shop" className="field !h-10 !text-[14px]" placeholder="yourstore.myshopify.com" value={shop} onChange={(e) => setShop(e.target.value)} /><button className="btn-sm">Connect</button></form>
            )}
          </div>
          <div className="flex items-center justify-between px-4 py-3.5"><span className="flex flex-col"><span className="text-[15px] font-medium">Your own till</span><span className="text-[12px] text-ink-muted">Only if you run your own shop on Square</span></span>{square ? <Pill kind="success">Connected</Pill> : <a className="btn-sm-secondary" href="/api/oauth/square?owner=dealer">Connect</a>}</div>
        </div>
      </Section>

      <Section title="Default channels for new items">
        <ToggleGroup>
          <Toggle on={d.own} onChange={(v) => saveDefaults({ ...d, own: v })} label="Your Shopify" disabled={!shopify} />
          <Toggle on={d.shop} onChange={(v) => saveDefaults({ ...d, shop: v })} label="Centre online shop" hint="20% commission, centre ships it" />
        </ToggleGroup>
      </Section>

      <Section title="Centres">
        <div className="card divide-y divide-border">
          {centres.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3.5"><span className="flex flex-col"><span className="text-[15px] font-medium">{c.name}</span><span className="text-[12px] text-ink-muted">{c.rent_mode === "rent" ? `Rent ${money(c.rent_pence)} a month` : "Commission only"}</span></span>{c.status === "active" ? <Pill kind="success">Joined</Pill> : <Pill kind="warning">Awaiting approval</Pill>}</div>
          ))}
          <Link href="/signup/dealer?step=centre" className="flex items-center justify-between px-4 py-3.5 text-[14px] font-medium text-accent">Add a centre</Link>
        </div>
      </Section>

      <Section title="Printers">
        <div className="card divide-y divide-border">
          {printers.map((p) => editing === p.id ? (
            <div key={p.id} className="flex flex-col gap-2 px-4 py-3">
              <input className="field !h-10 !text-[14px]" value={editName} onChange={(e) => setEditName(e.target.value)} />
              <select className="field !h-10 !text-[13px]" value={editModel} onChange={(e) => setEditModel(e.target.value)}><option value="" disabled>{SIZE_PLACEHOLDER}</option>{PRINTER_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
              <div className="flex gap-2"><button type="button" className="btn-sm" onClick={() => saveEdit(p.id)}>Save</button><button type="button" className="btn-sm-secondary" onClick={() => setEditing(null)}>Cancel</button></div>
            </div>
          ) : (
            <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3.5"><span className="flex flex-col"><span className="text-[15px] font-medium">{p.name}</span><span className="text-[12px] text-ink-muted">{p.own ? "Your printer" : "Shop printer, from your centre"} · {p.w} × {p.h} mm{p.cloud ? " · prints without a computer" : ""}</span></span>
              {p.own ? <span className="flex shrink-0 gap-3 text-[13px]"><button type="button" className="text-accent" onClick={() => { setEditing(p.id); setEditName(p.name); setEditModel(modelBySize(p.w, p.h)); }}>Edit</button><button type="button" className="text-danger" onClick={() => removePrinter(p.id, p.name)}>Remove</button></span> : <span className="h-2 w-2 rounded-full bg-success-dot" />}
            </div>
          ))}
          <form onSubmit={addPrinter} className="flex flex-col gap-2 px-4 py-3">
            <label className="flex flex-col gap-1 text-[13px] font-medium">{SIZE_LABEL}<select required className="field !h-10 !text-[13px]" value={printerModel} onChange={(e) => setPrinterModel(e.target.value)}><option value="" disabled>{SIZE_PLACEHOLDER}</option>{PRINTER_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select><span className="text-[12px] font-normal text-ink-muted">{SIZE_HELP}</span></label>
            <div className="flex gap-2"><input className="field !h-10 !text-[14px]" placeholder="Printer name, e.g. Brother at home" value={printerName} onChange={(e) => setPrinterName(e.target.value)} /><button className="btn-sm-secondary" disabled={!printerModel || !printerName.trim()}>Add</button></div>
          </form>
        </div>
      </Section>

      <Section title="Notifications">
        <div className="card px-4 py-3.5 text-[14px]">Email on every sale. Push arrives with the App Store build.</div>
      </Section>

      <a href="/account" className="btn-outline">Set or change password</a>
      <form action="/api/auth/signout" method="post"><button className="btn-ghost">Sign out</button></form>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h2 className="pb-2 text-[15px] font-semibold">{title}</h2>{children}</div>;
}
