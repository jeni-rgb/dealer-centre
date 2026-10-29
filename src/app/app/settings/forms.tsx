"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Rule } from "@/components/ui";

type Channel = { id: string; type: string; external_account_id: string; status: string; last_webhook_at: string | null } | null;

export function SettingsForms({ shopify, square, centres, printers }: {
  shopify: Channel; square: Channel;
  centres: { id: string; name: string; status: string }[];
  printers: { id: string; name: string; owner_type: string; provider: string; status: string }[];
}) {
  const router = useRouter();
  const [shop, setShop] = useState("");
  const [code, setCode] = useState("");
  const [printerName, setPrinterName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function joinCentre(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/centres/join", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: code.trim().toUpperCase() }) });
    const j = await r.json();
    setMsg(r.ok ? `Request sent to ${j.name}. They approve you from their mapping screen.` : j.error);
    if (r.ok) { setCode(""); router.refresh(); }
  }
  async function addPrinter(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/printers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: printerName.trim(), provider: "browser" }) });
    setPrinterName("");
    router.refresh();
  }

  return (
    <>
      <section className="mb-8">
        <h2 className="mb-1 text-sm font-medium">Shopify</h2>
        <Rule />
        {shopify ? (
          <div className="py-3 text-sm">
            <div>{shopify.external_account_id}</div>
            <div className="text-xs text-ink-3">{shopify.status === "active" ? "Connected" : shopify.status}{shopify.last_webhook_at ? `, last event ${new Date(shopify.last_webhook_at).toLocaleString("en-GB")}` : ""}</div>
          </div>
        ) : (
          <form className="flex gap-2 py-3" action="/api/oauth/shopify" method="get">
            <input name="shop" className="field" placeholder="yourstore.myshopify.com" value={shop} onChange={(e) => setShop(e.target.value)} />
            <button className="btn">Connect</button>
          </form>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-1 text-sm font-medium">Centres</h2>
        <Rule />
        <ul>
          {centres.map((c) => (
            <li key={c.id} className="flex justify-between border-b border-rule py-3 text-sm">
              <span>{c.name}</span>
              <span className={c.status === "active" ? "text-ink-3" : "text-brass"}>{c.status === "active" ? "Joined" : "Awaiting approval"}</span>
            </li>
          ))}
        </ul>
        <form onSubmit={joinCentre} className="mt-3 flex gap-2">
          <input className="field sku uppercase" placeholder="Centre code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} />
          <button className="btn-secondary">Join</button>
        </form>
        <p className="mt-2 text-xs text-ink-3">Ask the centre for their six character code. No centre on Dealer Centre yet? Send them dealercentre.app/signup/centre.</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-1 text-sm font-medium">Own till</h2>
        <Rule />
        {square ? (
          <div className="py-3 text-sm">Square connected, {square.external_account_id}</div>
        ) : (
          <div className="py-3">
            <a className="btn-secondary" href="/api/oauth/square?owner=dealer">Connect my own Square</a>
            <p className="mt-2 text-xs text-ink-3">Only if you run your own shop. Items at a centre go through the centre's till.</p>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-1 text-sm font-medium">Printers</h2>
        <Rule />
        <ul>
          {printers.map((p) => (
            <li key={p.id} className="flex justify-between border-b border-rule py-3 text-sm">
              <span>{p.name}{p.owner_type === "centre" ? " (shop printer)" : ""}</span>
              <span className="text-xs text-ink-3">{p.provider === "printnode" ? "Cloud" : "Print from this device"}</span>
            </li>
          ))}
        </ul>
        <form onSubmit={addPrinter} className="mt-3 flex gap-2">
          <input className="field" placeholder="My Brother QL" value={printerName} onChange={(e) => setPrinterName(e.target.value)} />
          <button className="btn-secondary">Add</button>
        </form>
        <p className="mt-2 text-xs text-ink-3">Labels open as a PDF sized to your roll. Print from your phone or laptop to any label printer already set up on it.</p>
      </section>

      {msg && <p className="text-sm text-ink-2">{msg}</p>}
      <form action="/api/auth/signout" method="post" className="mt-8"><button className="text-sm text-ink-3 underline">Sign out</button></form>
    </>
  );
}
