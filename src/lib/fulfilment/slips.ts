import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { OnlineOrder } from "./orders";
import { SERVICES, FORMATS } from "./clickdrop";

const INK = rgb(0.1, 0.1, 0.09), MUTED = rgb(0.42, 0.42, 0.38), LINE = rgb(0.85, 0.84, 0.78);
const money = (p: number) => `£${(p / 100).toFixed(2)}`;
const dmy = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString("en-GB") : "");
export const RETURNS_ADDRESS = process.env.RETURNS_ADDRESS ?? "Dealer Centre Ltd, Hardwick House, Agricultural Hall Plain, Norwich NR1 3FS";

/**
 * Despatch note, one A5 page per order, goes in the parcel. Order and despatch references, ship to, line with
 * SKU (ticket) and price, totals, service and tracking, parcel format and weight, pick/pack/check signatures.
 */
export async function renderDespatchNotes(orders: OnlineOrder[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 419.53, H = 595.28, M = 30;
  for (const o of orders) {
    const page = pdf.addPage([W, H]);
    let y = H - M;
    const text = (s: string, x: number, size: number, font: PDFFont = sans, color = INK, right = false) => { const w = font.widthOfTextAtSize(s, size); page.drawText(s, { x: right ? x - w : x, y, size, font, color }); };
    const rule = (dy = 4) => page.drawLine({ start: { x: M, y: y - dy }, end: { x: W - M, y: y - dy }, thickness: 0.6, color: LINE });
    const kv = (k: string, v: string, x: number) => { page.drawText(k, { x, y, size: 7.5, font: bold, color: MUTED }); page.drawText(v, { x, y: y - 11, size: 9.5, font: sans, color: INK }); };
    const service = SERVICES.find((s) => s.code === o.service_code)?.label ?? o.service_code ?? "";
    const format = FORMATS.find(([k]) => k === o.package_format)?.[1] ?? "";

    text("DESPATCH NOTE", M, 13, bold); text(o.despatch_note_no ? `DN-${o.despatch_note_no}` : "", W - M, 13, bold, INK, true);
    y -= 13; text(`${o.centre} online shop · fulfilled by Dealer Centre Ltd`, M, 8, sans, MUTED);
    y -= 24;
    kv("ORDER NO", o.order_name ?? "", M); kv("ORDER DATE", dmy(o.sold_at), M + 95); kv("DESPATCH DATE", dmy(o.despatched_at) || dmy(new Date().toISOString()), M + 190); kv("INTERNAL REF", o.sale_id.slice(0, 8).toUpperCase(), M + 285);
    y -= 30; rule(); y -= 16;
    text("SHIP TO", M, 7.5, bold, MUTED); text("DELIVERY SERVICE", M + 200, 7.5, bold, MUTED);
    y -= 12;
    const yTop = y;
    for (const l of [o.buyer ?? "", ...(o.address ?? "").split(", ")].filter(Boolean)) { text(l, M, 9.5); y -= 12; }
    const yAfterAddr = y;
    y = yTop;
    for (const l of [service ? `Royal Mail ${service}` : "Not yet booked", o.tracking ? `Tracking ${o.tracking}` : "", format ? `${format}${o.weight_grams ? `, ${o.weight_grams} g` : ""}` : ""].filter(Boolean)) { text(l, M + 200, 9.5); y -= 12; }
    y = Math.min(y, yAfterAddr) - 8; rule(); y -= 16;

    text("SKU", M, 7.5, bold, MUTED); text("DESCRIPTION", M + 70, 7.5, bold, MUTED); text("QTY", M + 270, 7.5, bold, MUTED, true); text("UNIT", M + 320, 7.5, bold, MUTED, true); text("TOTAL", W - M, 7.5, bold, MUTED, true);
    y -= 14;
    const title = o.title.length > 40 ? o.title.slice(0, 39) + "…" : o.title;
    text(o.ticket ?? "", M, 9.5, bold); text(title, M + 70, 9.5); text("1", M + 270, 9.5, sans, INK, true); text(money(o.amount_pence), M + 320, 9.5, sans, INK, true); text(money(o.amount_pence), W - M, 9.5, bold, INK, true);
    y -= 8; rule(); y -= 14;
    text("Goods total", M + 300, 9, sans, MUTED, true); text(money(o.amount_pence), W - M, 9, sans, INK, true); y -= 12;
    text("Postage", M + 300, 9, sans, MUTED, true); text("paid at checkout", W - M, 9, sans, MUTED, true); y -= 12;
    text("Paid in full online", M + 300, 9, bold, INK, true); text(money(o.amount_pence), W - M, 9, bold, INK, true);
    y -= 10; text("Second hand goods sold under the VAT margin scheme; no VAT is shown or reclaimable.", M, 7, sans, MUTED);
    y -= 22;
    if (o.note) { text("CUSTOMER INSTRUCTIONS", M, 7.5, bold, MUTED); y -= 12; text(o.note.length > 95 ? o.note.slice(0, 94) + "…" : o.note, M, 9); y -= 18; }
    text("HANDLING", M, 7.5, bold, MUTED); y -= 12;
    text("Antique or vintage item. Check condition against the listing before packing.", M, 8.5, sans, INK); y -= 11;
    text("Fragile: double box, wrap every surface, void fill on all sides, this way up.", M, 8.5, sans, INK);
    y -= 26;
    for (const [i, k] of ["PICKED BY", "PACKED BY", "CHECKED BY"].entries()) { page.drawText(k, { x: M + i * 120, y, size: 7.5, font: bold, color: MUTED }); page.drawLine({ start: { x: M + i * 120, y: y - 14 }, end: { x: M + i * 120 + 100, y: y - 14 }, thickness: 0.6, color: LINE }); }
    y -= 36;
    text("RETURNS", M, 7.5, bold, MUTED); y -= 12;
    text("Email hello@thedealercentre.co.uk with the order number within 14 days of delivery.", M, 8, sans, INK); y -= 10;
    text("Do not return without a returns reference.", M, 8, sans, INK); y -= 11;
    text(`Returns address: ${RETURNS_ADDRESS}`, M, 8, sans, MUTED);
    page.drawText(`Internal: dealer ${o.dealer ?? ""} ${o.dealer_code ? `(${o.dealer_code})` : ""} · pitch ${o.pitches.join(", ") || "?"} · ${o.centre} · collected ${dmy(o.collected_at) || "n/a"}`, { x: M, y: 16, size: 7, font: sans, color: MUTED });
  }
  if (orders.length === 0) pdf.addPage([W, H]);
  return pdf.save();
}

/** Labels first (one per parcel), then the despatch notes, in one print job. */
export async function mergeLabelsAndNotes(labels: Uint8Array[], notes: Uint8Array): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const bytes of [...labels, notes]) {
    const src = await PDFDocument.load(bytes);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}
