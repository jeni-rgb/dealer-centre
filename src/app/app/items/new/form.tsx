"use client";
import { DELIVERY, type Delivery } from "@/lib/items/delivery";
import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { displaySku } from "@/lib/sku";
import { Icon, Phone, Pill, TicketCard, Toggle, ToggleGroup } from "@/components/ui";

type Centre = { id: string; name: string; hasShop: boolean };
type Props = {
  dealerCode: string; nextNumber: number; centres: Centre[]; hasOwnShopify: boolean;
  defaults: { own: boolean; shop: boolean }; printers: { id: string; name: string }[]; starter?: boolean; aiEnabled?: boolean;
};

/** Shrinks a photo to a small JPEG data URL so the AI request stays light. */
async function toDataUrl(f: File, max = 1024): Promise<string> {
  const img = await createImageBitmap(f);
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const cv = document.createElement("canvas");
  cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
  cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
  return cv.toDataURL("image/jpeg", 0.8);
}

export function ListItemForm({ dealerCode, nextNumber, centres, hasOwnShopify, defaults, printers, starter = false, aiEnabled = false }: Props) {
  const previewSku = `${dealerCode}${String(nextNumber).padStart(4, "0")}`;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ai, setAi] = useState(aiEnabled);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [delivery, setDelivery] = useState<Delivery>("small");
  const [centre, setCentre] = useState(centres[0]?.id ?? "");
  const [own, setOwn] = useState(hasOwnShopify && defaults.own);
  const [shop, setShop] = useState(defaults.shop && !starter);
  const [label, setLabel] = useState(printers.length > 0);
  const [printer, setPrinter] = useState(printers[0]?.id ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [shopFiles, setShopFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [limit, setLimit] = useState(false);
  const [done, setDone] = useState<{ sku: string; id: string } | null>(null);
  const c = centres.find((x) => x.id === centre);

  async function describe() {
    const f = files[0] ?? shopFiles[0];
    if (!f) return;
    setAiErr(null); setAiBusy(true);
    try {
      const r = await fetch("/api/ai/describe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image: await toDataUrl(f) }) });
      if (r.status === 503) { setAi(false); return; }
      const j = await r.json();
      if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : "Couldn't write a description");
      if (j.title) setTitle(j.title);
      if (j.description) setDescription(j.description);
    } catch (e) { setAiErr(e instanceof Error ? e.message : String(e)); } finally { setAiBusy(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const pence = Math.round(parseFloat(price || "0") * 100);
    if (title.trim().length < 2) return setErr("Give it a title.");
    if (!(pence > 0)) return setErr("Enter a price.");
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const photos: { path: string; url: string; role: "reference" | "listing" }[] = [];
      const up = async (f: File, role: "reference" | "listing") => {
        const path = `items/${crypto.randomUUID()}.${f.name.split(".").pop() ?? "jpg"}`;
        const { error } = await sb.storage.from("files").upload(path, f, { contentType: f.type });
        if (!error) photos.push({ path, url: sb.storage.from("files").getPublicUrl(path).data.publicUrl, role });
      };
      for (const f of files.slice(0, 2)) await up(f, "reference");
      for (const f of shopFiles.slice(0, 10)) await up(f, "listing");
      const r = await fetch("/api/items", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), description: description.trim() || undefined, price_pence: pence, cost_pence: cost ? Math.round(parseFloat(cost) * 100) : null,
          centre_id: centre || null, photos, delivery, on_own_shopify: own, on_centre_shopify: shop && !!c?.hasShop,
          print_now: label && !!printer, printer_id: printer || null,
        }),
      });
      const j = await r.json();
      if (r.status === 402) { setLimit(true); throw new Error(j.error); }
      if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : "Could not list");
      setDone({ sku: j.item.sku, id: j.item.id });
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }

  const reset = () => { setDone(null); setTitle(""); setDescription(""); setPrice(""); setCost(""); setFiles([]); };
  const status = (on: boolean, text = "Syncing") => on ? <Pill kind="accent">{text}</Pill> : <Pill kind="neutral">Not listed</Pill>;

  if (done) {
    return (
      <Phone>
        <div className="flex min-h-screen flex-col gap-6 px-5 pb-6 pt-14">
          <div className="flex flex-col items-center gap-3 pt-10">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft">{Icon.check}</span>
            <h1 className="text-[22px] font-semibold">Listed</h1>
            <span className="ticket text-[36px]">{displaySku(done.sku)}</span>
          </div>
          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-[14px] border border-border">
            {c && <div className="flex h-[52px] items-center justify-between px-4"><span className="text-[15px] font-medium">Floor, {c.name}</span><Pill kind="success">On the till</Pill></div>}
            <div className="flex h-[52px] items-center justify-between px-4"><span className="text-[15px] font-medium">Your Shopify</span>{status(own)}</div>
            {c?.hasShop && <div className="flex h-[52px] items-center justify-between px-4"><span className="text-[15px] font-medium">{c.name} online shop</span>{status(shop)}</div>}
            <div className="flex h-[52px] items-center justify-between px-4"><span className="text-[15px] font-medium">Label</span>{label && printer ? <Pill kind="accent">Printing</Pill> : <Pill kind="neutral">Not printed</Pill>}</div>
          </div>
          <div className="mt-auto flex flex-col gap-2.5">
            <button className="btn" onClick={reset}>List another</button>
            <Link href={`/app/items/${done.id}`} className="btn-secondary">View item</Link>
            <Link href="/app" className="btn-ghost">Back to Today</Link>
          </div>
        </div>
      </Phone>
    );
  }

  return (
    <Phone>
      <form onSubmit={submit} className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-5 pb-3 pt-14">
          <Link href="/app" className="text-[15px] font-medium text-ink-muted">Cancel</Link>
          <h1 className="text-[17px] font-semibold">List item</h1>
          <span className="w-12" />
        </div>
        <div className="flex flex-1 flex-col gap-4 px-5 pb-4 pt-1">
          <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[16px] border border-dashed border-border bg-surface-2 text-[14px] font-medium text-ink">
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            {files.length > 0 ? <span>Reference photo ready</span> : <><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/></svg>Quick snap for your records</>}
            <span className="text-[12px] font-normal text-ink-muted">Only you see this one</span>
          </label>
          {(own || shop) && (
            <label className="flex min-h-[72px] cursor-pointer items-center justify-between gap-3 rounded-[16px] border border-border bg-white px-4 py-3 text-[14px]">
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setShopFiles(Array.from(e.target.files ?? []))} />
              <span className="flex flex-col"><span className="font-medium">Photos for online</span><span className="text-[12px] text-ink-muted">{shopFiles.length > 0 ? `${shopFiles.length} chosen, first one is the cover` : "Up to 10. These go to your Shopify and the centre shop."}</span></span>
              <span className="pill pill-accent">{shopFiles.length > 0 ? "Change" : "Add"}</span>
            </label>
          )}

          <TicketCard sku={previewSku} hint="Assigned by the app, goes on the label and the till" />

          {ai && (files.length > 0 || shopFiles.length > 0) && (
            <div className="flex flex-col gap-1">
              <button type="button" className="btn-secondary" onClick={describe} disabled={aiBusy}>{aiBusy ? "Writing…" : "Write description with AI"}</button>
              <span className="text-[12px] text-ink-muted">{aiErr ?? "A suggestion from the photo. Check and edit it before listing."}</span>
            </div>
          )}

          <div><label className="field-label" htmlFor="title">Title</label><input id="title" className="field" placeholder="What is it" value={title} onChange={(e) => setTitle(e.target.value)} /></div>

          <div><label className="field-label" htmlFor="description">Description</label><textarea id="description" className="field min-h-[96px] py-2.5" placeholder="Optional. Condition, material, anything a buyer should know" maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} /></div>

          <div>
            <label className="field-label" htmlFor="price">Price</label>
            <div className="flex h-14 items-center gap-1.5 rounded-[12px] border border-border px-3.5">
              <span className="text-[24px] font-semibold text-ink-muted">£</span>
              <input id="price" type="number" inputMode="decimal" placeholder="0" className="num min-w-0 flex-1 border-0 bg-transparent text-[24px] font-semibold outline-none" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="field-label flex justify-between" htmlFor="cost">What you paid <span className="font-normal text-ink-muted">Private, only you see it</span></label>
            <div className="flex h-12 items-center gap-1.5 rounded-[12px] border border-border bg-surface px-3.5">
              <span className="text-[18px] font-semibold text-ink-muted">£</span>
              <input id="cost" type="number" inputMode="decimal" placeholder="0" className="num min-w-0 flex-1 border-0 bg-transparent text-[18px] font-semibold outline-none" value={cost} onChange={(e) => setCost(e.target.value)} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            </div>
          </div>

          {centres.length > 0 && (
            <div>
              <span className="field-label">Where is it</span>
              {centres.length === 1 ? (
                <div className="flex h-12 items-center justify-between rounded-[12px] border border-border px-3.5"><span className="text-[15px] font-medium">{centres[0].name}</span><span className="text-[12px] text-ink-muted">Only centre</span></div>
              ) : (
                <select className="field" value={centre} onChange={(e) => setCentre(e.target.value)}>{centres.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}<option value="">Not at a centre</option></select>
              )}
            </div>
          )}

          <div>
            <span className="field-label">Also list on</span>
            <ToggleGroup>
              <Toggle on={own} onChange={setOwn} label="Your Shopify" hint={hasOwnShopify ? "Photo and price go to your own shop" : "Connect Shopify in Settings first"} disabled={!hasOwnShopify} />
              {c && <Toggle on={shop} onChange={setShop} label={`${c.name} online shop`} hint={starter ? "Trade plan and above. Upgrade in Settings" : c.hasShop ? "The centre's Shopify store, we pack and post it. 20% commission" : "Centre has not connected a shop yet"} disabled={!c.hasShop || starter} />}
            </ToggleGroup>
            {/* Opens the moment an online toggle goes on: how it ships sets the buyer's delivery charge */}
            <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${own || shop ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <div className="mt-3 flex flex-col gap-1.5">
                  <span className="field-label">How does it ship? Sets the delivery charge the buyer sees</span>
                  <div className="card divide-y divide-border">
                    {DELIVERY.map((d) => (
                      <button type="button" key={d.id} onClick={() => setDelivery(d.id)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[14px]">
                        <span className="flex flex-col"><span className="font-medium">{d.label}</span><span className="text-[12px] text-ink-muted">{d.hint}</span></span>
                        <span className={`h-5 w-5 shrink-0 rounded-full border ${delivery === d.id ? "border-accent bg-accent" : "border-border"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <span className="field-label">Label</span>
            <ToggleGroup>
              <Toggle on={label} onChange={setLabel} label="Print label now" hint={label && printer ? `${printers.find((p) => p.id === printer)?.name ?? "Printer"}, ready` : "Off. It waits in Labels until you print it"} disabled={printers.length === 0} />
              {label && printers.length > 1 && (
                <div className="px-4 py-3"><select className="field" value={printer} onChange={(e) => setPrinter(e.target.value)}>{printers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              )}
            </ToggleGroup>
          </div>

          {err && <p className={`text-[13px] ${limit ? "text-warning" : "text-danger"}`}>{err}{limit && <> <Link href="/api/billing/portal" className="underline">Upgrade</Link></>}</p>}
        </div>
        <div className="sticky bottom-0 border-t border-border bg-white px-5 pb-7 pt-3">
          <button className="btn" disabled={busy}>{busy ? "Listing…" : "List item"}</button>
        </div>
      </form>
    </Phone>
  );
}
