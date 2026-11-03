"use client";
import { useEffect, useState } from "react";

type Label = { sku: string; svg: string };
const DPI = 300;

/** Rasterise an SVG label to a crisp black-on-white PNG at DPI, exact label size. */
async function toPng(svg: string, wMm: number, hMm: number): Promise<Blob> {
  const pw = Math.round((wMm / 25.4) * DPI), ph = Math.round((hMm / 25.4) * DPI);
  const sized = svg.replace(/width="[\d.]+mm" height="[\d.]+mm"/, `width="${pw}" height="${ph}"`);
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = pw; c.height = ph;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, pw, ph);
    ctx.drawImage(img, 0, 0, pw, ph);
    // Threshold to pure black/white so thermal printers get sharp bars and text.
    const d = ctx.getImageData(0, 0, pw, ph);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11 < 160 ? 0 : 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
    }
    ctx.putImageData(d, 0, 0);
    return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("png"))), "image/png"));
  } finally { URL.revokeObjectURL(url); }
}

export function PrintView({ labels, w, h, pdfUrl }: { labels: Label[]; w: number; h: number; pdfUrl: string }) {
  const [files, setFiles] = useState<File[] | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(true);

  useEffect(() => {
    let gone = false;
    (async () => {
      const fs: File[] = [];
      for (const l of labels) fs.push(new File([await toPng(l.svg, w, h)], `label-${l.sku}.png`, { type: "image/png" }));
      if (gone) return;
      setFiles(fs);
      setUrls(fs.map((f) => URL.createObjectURL(f)));
      setCanShare(!!navigator.canShare?.({ files: fs }));
    })().catch(() => setMsg("Couldn't make the label images. Use Open as PDF instead."));
    return () => { gone = true; };
  }, [labels, w, h]);

  async function share() {
    if (!files) return;
    try { await navigator.share({ files }); }
    catch (e) { if ((e as Error).name !== "AbortError") { setCanShare(false); setMsg("Sharing isn't available here. Save each image below and print it from your printer app."); } }
  }

  const btn = "min-h-[56px] w-full rounded-[14px] px-4 text-[17px] font-semibold";
  return (
    <>
      <style>{`@page { size: ${w}mm ${h}mm; margin: 0 } @media print { body * { visibility: hidden } .print-area, .print-area * { visibility: visible } .print-area { position: absolute; left: 0; top: 0 } .print-area img { width: ${w}mm; height: ${h}mm; display: block; break-after: page; margin: 0; border: 0 } }`}</style>
      <div className="mx-auto flex max-w-md flex-col gap-3 p-4 print:hidden">
        <h1 className="text-[22px] font-semibold">Print {labels.length} label{labels.length === 1 ? "" : "s"}</h1>
        <p className="text-[13px] text-ink-muted">{w} × {h} mm. Tap Send to printer app, then pick your printer&apos;s app (e.g. Jadens) from the list.</p>
        {canShare && <button onClick={share} disabled={!files} className={`${btn} bg-accent text-white disabled:opacity-50`}>{files ? "Send to printer app" : "Preparing labels…"}</button>}
        <button onClick={() => window.print()} className={`${btn} border border-border bg-white`}>Print (AirPrint)</button>
        <a href={pdfUrl} className="text-center text-[14px] underline">Open as PDF</a>
        <a href="/app/labels" className="text-center text-[14px] underline">Back to labels</a>
        {msg && <p className="text-[13px] text-danger">{msg}</p>}
      </div>
      <div className="print-area mx-auto flex max-w-md flex-col items-center gap-4 p-4 print:p-0">
        {labels.map((l, i) => (
          <div key={l.sku} className="flex w-full flex-col items-center gap-2">
            {urls[i]
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={urls[i]} alt={`Label ${l.sku}`} className="w-full border border-border print:border-0" style={{ aspectRatio: `${w} / ${h}` }} />
              : <div className="w-full border border-border" style={{ aspectRatio: `${w} / ${h}` }} dangerouslySetInnerHTML={{ __html: l.svg.replace(/width="[\d.]+mm" height="[\d.]+mm"/, 'width="100%" height="100%"') }} />}
            {urls[i] && !canShare && <a href={urls[i]} download={`label-${l.sku}.png`} className={`${btn} flex items-center justify-center bg-accent text-white print:hidden`}>Save image</a>}
          </div>
        ))}
      </div>
    </>
  );
}
