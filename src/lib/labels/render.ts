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

/** Renders one label as a single page PDF sized to the roll. Black on white, Code 128 of the SKU. */
export async function renderLabelPdf(input: LabelInput): Promise<Uint8Array> {
  const w = (input.widthMm ?? 62) * MM;
  const h = (input.heightMm ?? 29) * MM;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([w, h]);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  // Everything is laid out for 62 × 29 and scaled to the roll in use, so a 51 × 25 Zebra label keeps its proportions.
  const k = Math.min(h / (29 * MM), w / (62 * MM));
  const pad = 2 * MM * k;

  // Barcode across the top
  const barcodePng = await bwipjs.toBuffer({
    bcid: "code128",
    text: input.sku,
    scale: 3,
    height: 8,
    includetext: false,
  });
  const img = await pdf.embedPng(barcodePng);
  const bcH = 9 * MM * k;
  const bcW = Math.min(w - pad * 2 - 14 * MM * k, img.width * (bcH / img.height));
  page.drawImage(img, { x: pad, y: h - pad - bcH, width: bcW, height: bcH });

  // Dealer code, very large, top right
  const codeSize = 20 * k;
  const codeW = bold.widthOfTextAtSize(input.dealerCode, codeSize);
  page.drawText(input.dealerCode, { x: w - pad - codeW, y: h - pad - codeSize + 2, size: codeSize, font: bold, color: rgb(0, 0, 0) });

  // SKU in mono under barcode
  page.drawText(displaySku(input.sku), { x: pad, y: h - pad - bcH - 4 * MM * k, size: 9 * k, font: mono });

  // Price, large, bottom right
  const price = `£${(input.pricePence / 100).toFixed(input.pricePence % 100 === 0 ? 0 : 2)}`;
  const priceSize = 16 * k;
  const priceW = bold.widthOfTextAtSize(price, priceSize);
  page.drawText(price, { x: w - pad - priceW, y: pad, size: priceSize, font: bold });

  // Title, truncated to fit the remaining width. Taller labels (40mm+) get two title lines and separate centre/dealer lines.
  const titleSize = 7 * k;
  const smallSize = 5.5 * k;
  const maxTitleW = w - pad * 2 - priceW - 2 * MM * k;
  const tall = h >= 40 * MM;
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
    page.drawText(line, { x: pad, y, size: titleSize, font: sans });
    y += titleSize + 1;
  }
  const smallParts = [input.centreName, input.dealerName].map((t) => t?.trim()).filter(Boolean) as string[];
  const smallLines = tall ? [...smallParts].reverse() : smallParts.length ? [smallParts.join(" · ")] : [];
  for (const line of smallLines) {
    page.drawText(fit(line, smallSize), { x: pad, y, size: smallSize, font: sans, color: rgb(0.3, 0.3, 0.3) });
    y += smallSize + 1;
  }

  return pdf.save();
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
