"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pill, Toggle, ToggleGroup, money } from "@/components/ui";

type Channel = { id: string; type: string; external_account_id: string; status: string; last_webhook_at: string | null } | null;
type Dealer = { name: string; code: string; plan: string; trial_ends_at: string | null; item_limit: number; monthly_sold_limit: number; default_own_shopify: boolean; default_centre_shopify: boolean; default_centre_ebay: boolean };

export function SettingsView({ email, dealer, shopify, square, centres, printers }: {
  email: string; dealer: Dealer; shopify: Channel; square: Channel;
  centres: { id: string; name: string; status: string; rent_pence: number; rent_mode: string }[];
  printers: { id: string; name: string; own: boolean; cloud: boolean }[];
}) {
  const router = useRouter();
  const [shop, setShop] = useState("");
  const [printerName, setPrinterName] = useState("");
  const [d, setD] = useState({ own: dealer.default_own_shopify, shop: dealer.default_centre_shopify, ebay: dealer.default_centre_ebay });

  async function saveDefaults(next: typeof d) {
    setD(next);
    await fetch("/api/dealers/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ default_own_shopify: next.own, default_centre_shopify: next.shop, default_centre_ebay: next.ebay }) });
  }
  async function addPrinter(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/printers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: printerName.trim(), provider: "browser" }) });
    setPrinterName(""); router.refresh();
  }

  return (
    <>
      <Section title="Account">
        <div className="card divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-3.5"><span className="flex flex-col"><span className="text-[15px] font-medium">{dealer.name}</span><span className="text-[12px] text-ink-muted">{email}</span></span><span className="ticket text-[16px]">{dealer.code}</span></div>
          <Link href="/api/billing/portal" className="flex items-center justify-between px-4 py-3.5"><span className="flex flex-col"><span className="text-[15px] font-medium">Plan</span><span className="text-[12px] text-ink-muted">{dealer.plan === "trial" ? `Trial, ends ${dealer.trial_ends_at ? new Date(dealer.trial_ends_at).toLocaleDateString("en-GB") : ""}` : dealer.plan} · {dealer.monthly_sold_limit >= 100000 ? "over 100" : `up to ${dealer.monthly_sold_limit}`} items sold a month</span></span><span className="text-[13px] font-medium text-accent">Manage online</span></Link>
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
          <Toggle on={d.shop} onChange={(v) => saveDefaults({ ...d, shop: v })} label="Centre online shop" hint="27% commission, centre ships it" />
          <Toggle on={d.ebay} onChange={(v) => saveDefaults({ ...d, ebay: v })} label="Centre eBay store" hint="Buy it now at your price" />
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
          {printers.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3.5"><span className="flex flex-col"><span className="text-[15px] font-medium">{p.name}</span><span className="text-[12px] text-ink-muted">{p.own ? "Your printer" : "Shop printer, from your centre"}{p.cloud ? " · prints without a computer" : ""}</span></span><span className="h-2 w-2 rounded-full bg-success-dot" /></div>
          ))}
          <form onSubmit={addPrinter} className="flex gap-2 px-4 py-3"><input className="field !h-10 !text-[14px]" placeholder="Add your own, e.g. Brother QL" value={printerName} onChange={(e) => setPrinterName(e.target.value)} /><button className="btn-sm-secondary">Add</button></form>
        </div>
      </Section>

      <Section title="Notifications">
        <div className="card px-4 py-3.5 text-[14px]">Email on every sale. Push arrives with the App Store build.</div>
      </Section>

      <form action="/api/auth/signout" method="post"><button className="btn-ghost">Sign out</button></form>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h2 className="pb-2 text-[15px] font-semibold">{title}</h2>{children}</div>;
}
