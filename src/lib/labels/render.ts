import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import bwipjs from "bwip-js/node";
import { displaySku } from "@/lib/sku";

export type LabelInput = {
  sku: string;
  dealerCode: string;
  title: string;
  pricePence: number;
  centreName?: string | null;
  dealerName?: string | null;
  qrUrl?: string | null;
  widthMm?: number;
  heightMm?: number;
};

const MM = 72 / 25.4;

type TextOp = { kind: "text"; text: string; x: number; y: number; size: number; font: "sans" | "bold" | "mono"; grey?: boolean };
type BarOp = { kind: "barcode"; x: number; y: number; width: number; height: number };
type RectOp = { kind: "rect"; x: number; y: number; width: number; height: number; line: number };
type Layout = { w: number; h: number; ops: (TextOp | BarOp | RectOp)[] };

/** Lays out one label in PDF points (origin bottom left). Shared by the PDF and SVG/PNG outputs. */
async function layoutLabel(input: LabelInput, barAspect: number): Promise<Layout> {
  const w = (input.widthMm ?? 62) * MM;
  const h = (input.heightMm ?? 29) * MM;
  const pdf = await PDFDocument.create();
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ops: Layout["ops"] = [];

  // Laid out for 62 × 29 and scaled to the roll. Tall labels (40mm+) get bigger text.
  const k = Math.min(h / (29 * MM), w / (62 * MM));
  const pad = 2 * MM * k;
  const tall = h >= 40 * MM;
  if (tall) return layoutTall(input, barAspect, w, h, sans, bold);

  // Dealer code, top right. Measured first so the barcode always leaves a clear gap.
  const bcH = 9 * MM * k;
  let codeSize = Math.min(20 * k, bcH * 1.2);
  let codeW = bold.widthOfTextAtSize(input.dealerCode, codeSize);
  const maxCodeW = w * 0.38;
  if (codeW > maxCodeW) { codeSize *= maxCodeW / codeW; codeW = maxCodeW; }
  const bcW = Math.max(10 * MM * k, Math.min(bcH * barAspect, w - pad * 3 - codeW));
  ops.push({ kind: "barcode", x: pad, y: h - pad - bcH, width: bcW, height: bcH });
  // Cap height of Helvetica Bold ≈ 0.72em; centre the code vertically in the barcode band.
  const capH = codeSize * 0.72;
  ops.push({ kind: "text", text: input.dealerCode, x: w - pad - codeW, y: h - pad - bcH / 2 - capH / 2, size: codeSize, font: "bold" });

  const skuSize = (tall ? 10 : 9) * k;
  ops.push({ kind: "text", text: displaySku(input.sku), x: pad, y: h - pad - bcH - skuSize - 1.5 * MM * k, size: skuSize, font: "mono" });

  const price = `£${(input.pricePence / 100).toFixed(input.pricePence % 100 === 0 ? 0 : 2)}`;
  const priceSize = (tall ? 22 : 16) * k;
  const priceW = bold.widthOfTextAtSize(price, priceSize);
  ops.push({ kind: "text", text: price, x: w - pad - priceW, y: pad, size: priceSize, font: "bold" });

  const titleSize = (tall ? 9.5 : 7) * k;
  const smallSize = (tall ? 7 : 5.5) * k;
  const maxTitleW = w - pad * 2 - priceW - 2 * MM * k;
  const fit = (t: string, size: number) => {
    let out = t;
    while (sans.widthOfTextAtSize(out, size) > maxTitleW && out.length > 3) out = out.slice(0, -2) + "…";
    return out;
  };
  let titleLines: string[];
  if (tall && sans.widthOfTextAtSize(input.title, titleSize) > maxTitleW) {
    const words = input.title.split(/\s+/);
    let first = "";
    while (words.length && sans.widthOfTextAtSize((first + " " + words[0]).trim(), titleSize) <= maxTitleW) first = (first + " " + words.shift()).trim();
    if (!first) first = fit(words.shift() ?? "", titleSize);
    titleLines = words.length ? [first, fit(words.join(" "), titleSize)] : [first];
  } else titleLines = [fit(input.title, titleSize)];
  let y = pad + 1;
  for (const line of [...titleLines].reverse()) {
    ops.push({ kind: "text", text: line, x: pad, y, size: titleSize, font: "sans" });
    y += titleSize + 1;
  }
  const smallParts = [input.centreName, input.dealerName].map((t) => t?.trim()).filter(Boolean) as string[];
  const smallLines = tall ? [...smallParts].reverse() : smallParts.length ? [smallParts.join(" · ")] : [];
  for (const line of smallLines) {
    ops.push({ kind: "text", text: fit(line, smallSize), x: pad, y, size: smallSize, font: "sans", grey: true });
    y += smallSize + 1;
  }
  return { w, h, ops };
}

type Font = Awaited<ReturnType<PDFDocument["embedFont"]>>;

/** Wrap text into at most maxLines lines of width maxW; returns null if it doesn't fit. */
function wrap(font: Font, text: string, size: number, maxW: number, maxLines: number): string[] | null {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const wd of words) {
    const t = cur ? cur + " " + wd : wd;
    if (font.widthOfTextAtSize(t, size) <= maxW) cur = t;
    else { if (!cur) return null; lines.push(cur); cur = wd; if (font.widthOfTextAtSize(cur, size) > maxW) return null; }
  }
  if (cur) lines.push(cur);
  return lines.length <= maxLines ? lines : null;
}

/** Largest size (down to min) at which text wraps into maxLines; at min, truncates the last line. */
function fitWrap(font: Font, text: string, start: number, min: number, maxW: number, maxLines: number, maxH: number) {
  for (let size = start; size >= min; size -= 0.5) {
    const l = wrap(font, text, size, maxW, maxLines);
    if (l && l.length * size * 1.1 <= maxH) return { size, lines: l };
  }
  const lines = wrap(font, text, min, maxW, 99) ?? [text];
  const out = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let last = out[maxLines - 1] + "…";
    while (font.widthOfTextAtSize(last, min) > maxW && last.length > 2) last = last.slice(0, -2) + "…";
    out[maxLines - 1] = last;
  }
  return { size: min, lines: out };
}

/** Tall labels (40mm+): dealer name across the top, big price, title, then barcode with a boxed code along the bottom. */
function layoutTall(input: LabelInput, barAspect: number, w: number, h: number, sans: Font, bold: Font): Layout {
  const ops: Layout["ops"] = [];
  const s = h / (50 * MM); // 1 at 50mm tall
  const pad = 2.5 * MM * s;
  const innerW = w - pad * 2;
  const centre = (t: string, size: number, font: Font) => (w - font.widthOfTextAtSize(t, size)) / 2;

  // Bottom band: barcode + SKU on the left, boxed dealer code on the right.
  const bcH = 6.5 * MM * s;
  const skuGap = 1.5 * MM * s;
  const skuMax = 15 * s;
  const codeSize = Math.min(16 * s, (innerW * 0.3) / Math.max(1, bold.widthOfTextAtSize(input.dealerCode, 1)));
  const boxW = bold.widthOfTextAtSize(input.dealerCode, codeSize) + 3 * MM * s;
  const boxX = w - pad - boxW;
  const skuText = displaySku(input.sku);
  const skuSize = Math.min(skuMax, (boxX - pad - skuGap) / Math.max(1, bold.widthOfTextAtSize(skuText, 1)));
  const bandH = bcH + skuSize * 0.72 + 1.2 * MM * s;
  ops.push({ kind: "rect", x: boxX, y: pad, width: boxW, height: bandH, line: 1.2 * s });
  ops.push({ kind: "text", text: input.dealerCode, x: boxX + (boxW - bold.widthOfTextAtSize(input.dealerCode, codeSize)) / 2, y: pad + bandH / 2 - codeSize * 0.36, size: codeSize, font: "bold" });
  const bcW = Math.min(bcH * barAspect * 1.6, boxX - pad - 2 * MM * s);
  ops.push({ kind: "barcode", x: pad, y: pad + bandH - bcH, width: bcW, height: bcH });
  ops.push({ kind: "text", text: skuText, x: pad, y: pad, size: skuSize, font: "bold" });

  let bottom = pad + bandH + 1.5 * MM * s;
  const centreName = input.centreName?.trim();
  if (centreName) {
    const cs = 6.5 * s;
    ops.push({ kind: "text", text: fitWrap(sans, centreName, cs, cs, innerW, 1, cs * 2).lines[0], x: pad, y: bottom, size: cs, font: "sans", grey: true });
    bottom += cs + 1.5;
  }

  // Top: dealer trading name, bold uppercase, centred, up to 2 lines, auto-shrunk.
  let top = h - pad;
  const name = (input.dealerName?.trim() || input.dealerCode).toUpperCase();
  const nm = fitWrap(bold, name, 15 * s, 7 * s, innerW, 2, h * 0.24);
  for (const line of nm.lines) {
    top -= nm.size * 0.85;
    ops.push({ kind: "text", text: line, x: centre(line, nm.size, bold), y: top, size: nm.size, font: "bold" });
    top -= nm.size * 0.25;
  }

  // Price, large and bold, centred.
  const price = `£${(input.pricePence / 100).toFixed(input.pricePence % 100 === 0 ? 0 : 2)}`;
  const priceSize = 24 * s;
  top -= 1 * MM * s + priceSize * 0.75;
  ops.push({ kind: "text", text: price, x: centre(price, priceSize, bold), y: top, size: priceSize, font: "bold" });
  top -= 1.5 * MM * s;

  // Title in the space left, up to 3 lines.
  const tt = fitWrap(sans, input.title, 11 * s, 7 * s, innerW, 3, Math.max(0, top - bottom));
  for (const line of tt.lines) {
    top -= tt.size * 0.85;
    if (top < bottom) break;
    ops.push({ kind: "text", text: line, x: centre(line, tt.size, sans), y: top, size: tt.size, font: "sans" });
    top -= tt.size * 0.25;
  }
  return { w, h, ops };
}

const barOpts = (sku: string) => ({ bcid: "code128", text: sku, scale: 3, height: 8, includetext: false });

/** Renders one label as a single page PDF sized to the roll. Black on white, Code 128 of the SKU. */
export async function renderLabelPdf(input: LabelInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fonts = {
    sans: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    mono: await pdf.embedFont(StandardFonts.Courier),
  };
  const img = await pdf.embedPng(await bwipjs.toBuffer(barOpts(input.sku)));
  const { w, h, ops } = await layoutLabel(input, img.width / img.height);
  const page = pdf.addPage([w, h]);
  for (const o of ops) {
    if (o.kind === "barcode") page.drawImage(img, o);
    else if (o.kind === "rect") page.drawRectangle({ x: o.x, y: o.y, width: o.width, height: o.height, borderWidth: o.line, borderColor: rgb(0, 0, 0) });
    else page.drawText(o.text, { x: o.x, y: o.y, size: o.size, font: fonts[o.font], color: o.grey ? rgb(0.3, 0.3, 0.3) : rgb(0, 0, 0) });
  }
  return pdf.save();
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Same label as a vector SVG (viewBox in points, size in mm). Rasterised to PNG in the browser for share/print. */
export async function renderLabelSvg(input: LabelInput): Promise<string> {
  const bar = bwipjs.toSVG(barOpts(input.sku));
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(bar)!;
  const { w, h, ops } = await layoutLabel(input, Number(vb[1]) / Number(vb[2]));
  const family = { sans: "Helvetica, Arial, sans-serif", bold: "Helvetica, Arial, sans-serif", mono: "Courier, 'Courier New', monospace" };
  const parts = ops.map((o) => {
    if (o.kind === "barcode") {
      const inner = bar.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
      return `<svg x="${o.x}" y="${h - o.y - o.height}" width="${o.width}" height="${o.height}" viewBox="0 0 ${vb[1]} ${vb[2]}" preserveAspectRatio="none" shape-rendering="crispEdges">${inner}</svg>`;
    }
    if (o.kind === "rect") return `<rect x="${o.x + o.line / 2}" y="${h - o.y - o.height + o.line / 2}" width="${o.width - o.line}" height="${o.height - o.line}" fill="none" stroke="#000" stroke-width="${o.line}"/>`;
    return `<text x="${o.x}" y="${h - o.y}" font-size="${o.size}" font-family="${family[o.font]}"${o.font === "bold" ? ' font-weight="700"' : ""} fill="${o.grey ? "#4d4d4d" : "#000"}">${esc(o.text)}</text>`;
  });
  const wm = input.widthMm ?? 62, hm = input.heightMm ?? 29;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${wm}mm" height="${hm}mm" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#fff"/>${parts.join("")}</svg>`;
}

/** Several labels, one page each, for batch printing on a roll. */
export async function renderLabelBatch(inputs: LabelInput[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const i of inputs) {
    const one = await PDFDocument.load(await renderLabelPdf(i));
    const [p] = await out.copyPages(one, [0]);
    out.addPage(p);
  }
  return out.save();
}
