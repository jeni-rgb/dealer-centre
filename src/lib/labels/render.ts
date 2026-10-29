import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import bwipjs from "bwip-js/node";
import { displaySku } from "@/lib/sku";

export type LabelInput = {
  sku: string;
  dealerCode: string;
  title: string;
  pricePence: number;
  centreName?: string | null;
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

  const pad = 2 * MM;

  // Barcode across the top
  const barcodePng = await bwipjs.toBuffer({
    bcid: "code128",
    text: input.sku,
    scale: 3,
    height: 8,
    includetext: false,
  });
  const img = await pdf.embedPng(barcodePng);
  const bcH = 9 * MM;
  const bcW = Math.min(w - pad * 2 - 14 * MM, img.width * (bcH / img.height));
  page.drawImage(img, { x: pad, y: h - pad - bcH, width: bcW, height: bcH });

  // Dealer code, very large, top right
  const codeSize = 20;
  const codeW = bold.widthOfTextAtSize(input.dealerCode, codeSize);
  page.drawText(input.dealerCode, { x: w - pad - codeW, y: h - pad - codeSize + 2, size: codeSize, font: bold, color: rgb(0, 0, 0) });

  // SKU in mono under barcode
  page.drawText(displaySku(input.sku), { x: pad, y: h - pad - bcH - 4 * MM, size: 9, font: mono });

  // Price, large, bottom right
  const price = `£${(input.pricePence / 100).toFixed(input.pricePence % 100 === 0 ? 0 : 2)}`;
  const priceSize = 16;
  const priceW = bold.widthOfTextAtSize(price, priceSize);
  page.drawText(price, { x: w - pad - priceW, y: pad, size: priceSize, font: bold });

  // Title, truncated to fit the remaining width
  const titleSize = 7;
  const maxTitleW = w - pad * 2 - priceW - 2 * MM;
  let title = input.title;
  while (sans.widthOfTextAtSize(title, titleSize) > maxTitleW && title.length > 3) title = title.slice(0, -2) + "…";
  page.drawText(title, { x: pad, y: pad + 1, size: titleSize, font: sans });

  if (input.centreName) {
    page.drawText(input.centreName, { x: pad, y: pad + 1 + titleSize + 1, size: 5.5, font: sans, color: rgb(0.3, 0.3, 0.3) });
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
