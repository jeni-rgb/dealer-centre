"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { displaySku } from "@/lib/sku";

type Props = {
  dealerCode: string;
  centres: { id: string; name: string }[];
  hasShopify: boolean;
  printers: { id: string; name: string; provider: string }[];
};

export function ListItemForm({ dealerCode, centres, hasShopify, printers }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [centre, setCentre] = useState(centres[0]?.id ?? "");
  const [shopify, setShopify] = useState(hasShopify);
  const [printer, setPrinter] = useState(printers[0]?.id ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ sku: string; id: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const pence = Math.round(parseFloat(price || "0") * 100);
    if (title.trim().length < 2) return setErr("Give it a title.");
    if (!(pence >= 0)) return setErr("Enter a price.");
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const photos: { path: string; url: string }[] = [];
      for (const f of files.slice(0, 6)) {
        const path = `items/${crypto.randomUUID()}.${f.name.split(".").pop() ?? "jpg"}`;
        const { error } = await sb.storage.from("files").upload(path, f, { contentType: f.type });
        if (!error) photos.push({ path, url: sb.storage.from("files").getPublicUrl(path).data.publicUrl });
      }
      const r = await fetch("/api/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: desc || undefined, price_pence: pence, centre_id: centre || null, photos, list_on_shopify: shopify, printer_id: printer || null }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : "Could not list");
      setDone({ sku: j.item.sku, id: j.item.id });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="py-6">
        <div className="text-xs uppercase tracking-wide text-ink-3">Listed. Ticket number</div>
        <div className="sku mt-2 text-5xl font-medium">{displaySku(done.sku)}</div>
        <p className="mt-4 text-sm text-ink-2">
          {centre ? "On the till in a few seconds. " : ""}{shopify ? "Going live on Shopify. " : ""}{printer ? "Label printing." : "No label printed."}
        </p>
        <div className="mt-8 flex gap-2">
          <button className="btn flex-1" onClick={() => { setDone(null); setTitle(""); setPrice(""); setDesc(""); setFiles([]); }}>List another</button>
          <button className="btn-secondary flex-1" onClick={() => router.push(`/app/items/${done.id}`)}>View item</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block">
        <span className="mb-1 block text-xs text-ink-3">Photos</span>
        <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="block w-full text-sm" />
        {files.length > 0 && <span className="mt-1 block text-xs text-ink-2">{files.length} photo{files.length > 1 ? "s" : ""} ready</span>}
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-ink-3">Title</span>
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Victorian mahogany writing slope" autoFocus />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-ink-3">Price</span>
        <div className="flex items-center">
          <span className="mr-2 text-xl">£</span>
          <input className="field num text-2xl" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
        </div>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-ink-3">Description, optional</span>
        <textarea className="field" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </label>

      {centres.length > 0 && (
        <label className="block">
          <span className="mb-1 block text-xs text-ink-3">Where is it</span>
          <select className="field" value={centre} onChange={(e) => setCentre(e.target.value)}>
            {centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="">Not at a centre</option>
          </select>
        </label>
      )}

      <div className="space-y-3 border-t border-rule pt-4">
        <label className="flex items-center justify-between text-sm">
          <span>List on Shopify</span>
          <input type="checkbox" className="h-5 w-5 accent-ink" checked={shopify} disabled={!hasShopify} onChange={(e) => setShopify(e.target.checked)} />
        </label>
        {!hasShopify && <p className="text-xs text-ink-3">Connect Shopify in Settings to list online.</p>}
        <label className="block text-sm">
          <span className="mb-1 block">Print label</span>
          <select className="field" value={printer} onChange={(e) => setPrinter(e.target.value)}>
            {printers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="">Do not print now</option>
          </select>
        </label>
      </div>

      <p className="text-xs text-ink-3">Ticket number will be <span className="sku">{dealerCode} ····</span>, assigned when you list.</p>
      {err && <p className="text-sm text-oxblood">{err}</p>}
      <button className="btn w-full" disabled={busy}>{busy ? "Listing…" : "List it"}</button>
    </form>
  );
}
