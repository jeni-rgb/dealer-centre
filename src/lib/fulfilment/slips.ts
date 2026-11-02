import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { OnlineOrder } from "./orders";

const INK = rgb(0.1, 0.1, 0.09), MUTED = rgb(0.42, 0.42, 0.38), LINE = rgb(0.85, 0.84, 0.78);
const money = (p: number) => `£${(p / 100).toFixed(2)}`;
export const RETURNS_ADDRESS = process.env.RETURNS_ADDRESS ?? "Dealer Centre Ltd, Hardwick House, Agricultural Hall Plain, Norwich NR1 3FS";

/** One A5 packing slip per order, in one PDF. Goes in the parcel. Buyer facing: the centre's name, not the dealer's cost. */
export async function renderPackingSlips(orders: OnlineOrder[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 419.53, H = 595.28, M = 32; // A5 portrait
  for (const o of orders) {
    const page = pdf.addPage([W, H]);
    let y = H - M;
    const text = (s: string, x: number, size: number, font: PDFFont = sans, color = INK, right = false) => { const w = font.widthOfTextAtSize(s, size); page.drawText(s, { x: right ? x - w : x, y, size, font, color }); };
    const rule = () => page.drawLine({ start: { x: M, y: y - 4 }, end: { x: W - M, y: y - 4 }, thickness: 0.6, color: LINE });

    text(o.centre, M, 16, bold); text("Packing slip", W - M, 10, bold, MUTED, true);
    y -= 14; text("Sold through the centre's online shop, run by Dealer Centre", M, 8.5, sans, MUTED);
    y -= 26; text("Deliver to", M, 8.5, bold, MUTED); y -= 13;
    for (const l of [o.buyer ?? "", ...(o.address ?? "").split(", ")].filter(Boolean)) { text(l, M, 11); y -= 13; }
    y -= 6; text(`Order ${o.order_name ?? ""}`, M, 9, sans, MUTED); text(`Sold ${new Date(o.sold_at).toLocaleDateString("en-GB")}`, W - M, 9, sans, MUTED, true);
    y -= 22; rule(); y -= 14;
    text("Item", M, 8.5, bold, MUTED); text("Ticket", M + 230, 8.5, bold, MUTED); text("Price", W - M, 8.5, bold, MUTED, true);
    y -= 15;
    const title = o.title.length > 48 ? o.title.slice(0, 47) + "…" : o.title;
    text(title, M, 11); text(o.ticket ?? "", M + 230, 10); text(money(o.amount_pence), W - M, 11, bold, INK, true);
    y -= 10; rule(); y -= 16;
    if (o.note) { text("Buyer's note", M, 8.5, bold, MUTED); y -= 13; text(o.note.length > 90 ? o.note.slice(0, 89) + "…" : o.note, M, 10, sans, INK); y -= 18; }
    text("Checked and packed by", M, 8.5, bold, MUTED); text("____________________", M + 110, 8.5, sans, MUTED);
    y -= 40;
    text("Something not right?", M, 9, bold);
    y -= 13; text("Email hello@thedealercentre.co.uk with your order number within 14 days.", M, 9, sans, MUTED);
    y -= 13; text("Returns to: " + RETURNS_ADDRESS, M, 8, sans, MUTED);
    page.drawText(`Internal: ${o.dealer ?? ""} ${o.dealer_code ? `(${o.dealer_code})` : ""} pitch ${o.pitches.join(", ") || "?"} · ${o.sale_id.slice(0, 8)}`, { x: M, y: 18, size: 7, font: sans, color: MUTED });
  }
  if (orders.length === 0) pdf.addPage([W, H]);
  return pdf.save();
}
