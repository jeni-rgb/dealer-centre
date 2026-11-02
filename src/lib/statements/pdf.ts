import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Statement } from "./compute";

const money = (p: number) => `${p < 0 ? "-" : ""}£${(Math.abs(p) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const INK = rgb(0.1, 0.1, 0.09), MUTED = rgb(0.42, 0.42, 0.38), LINE = rgb(0.85, 0.84, 0.78), OLIVE = rgb(0.42, 0.45, 0.25);

/** A4 monthly statement: the same numbers as the dealer's and the centre's screens, line by line. */
export async function renderStatementPdf(st: Statement): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 48;
  let page = pdf.addPage([W, H]);
  let y = H - M;

  const text = (s: string, x: number, size: number, font: PDFFont = sans, color = INK, right = false) => {
    const w = font.widthOfTextAtSize(s, size);
    page.drawText(s, { x: right ? x - w : x, y, size, font, color });
  };
  const rule = () => { page.drawLine({ start: { x: M, y: y - 4 }, end: { x: W - M, y: y - 4 }, thickness: 0.6, color: LINE }); };
  const newPage = () => { page = pdf.addPage([W, H]); y = H - M; };

  // Header
  text("Dealer Centre", M, 11, bold, OLIVE); text("Statement", W - M, 11, bold, OLIVE, true);
  y -= 26; text(st.dealer.name, M, 20, bold);
  y -= 16; text(`Dealer code ${st.dealer.code} · ${st.centre.name}`, M, 10.5, sans, MUTED);
  y -= 14; text(st.label, M, 10.5, sans, MUTED);
  text(st.status === "paid" && st.paid_at ? `Paid ${new Date(st.paid_at).toLocaleDateString("en-GB")}` : st.status === "issued" ? "Issued, awaiting payment" : "Running month, not yet issued", W - M, 10.5, sans, MUTED, true);

  // Summary box
  y -= 26;
  const rows: [string, string][] = [
    ["Floor sales", money(st.floor_gross_pence)],
    ["Online sales", money(st.online_gross_pence)],
    ["Gross", money(st.gross_pence)],
    [`Floor commission (${st.centre.commission_bps / 100}%)`, money(-st.floor_commission_pence)],
    [`Online commission (${st.centre.online_commission_bps / 100}%) and postage`, money(-st.online_commission_pence)],
    [`Rent: ${st.rent_note}`, money(-st.rent_pence)],
  ];
  for (const [k, v] of rows) { text(k, M, 10.5); text(v, W - M, 10.5, sans, INK, true); y -= 16; }
  rule(); y -= 14;
  text("Net owed to dealer", M, 13, bold); text(money(st.net_pence), W - M, 13, bold, INK, true);

  // Lines
  y -= 34; text(`Sales (${st.sales_count})`, M, 12, bold); y -= 18;
  const cols = { date: M, item: M + 52, ticket: M + 232, channel: M + 296, price: W - M - 130, comm: W - M - 62, net: W - M };
  const head = () => {
    text("Date", cols.date, 8.5, bold, MUTED); text("Item", cols.item, 8.5, bold, MUTED); text("Ticket", cols.ticket, 8.5, bold, MUTED); text("Where", cols.channel, 8.5, bold, MUTED);
    text("Price", cols.price, 8.5, bold, MUTED, true); text("Commn", cols.comm, 8.5, bold, MUTED, true); text("Net", cols.net, 8.5, bold, MUTED, true);
    y -= 6; rule(); y -= 12;
  };
  head();
  if (st.lines.length === 0) { text("No sales this month.", M, 10, sans, MUTED); y -= 14; }
  for (const l of st.lines) {
    if (y < M + 40) { newPage(); head(); }
    const title = l.title.length > 34 ? l.title.slice(0, 33) + "…" : l.title;
    text(new Date(l.sold_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), cols.date, 9.5);
    text(title, cols.item, 9.5); text(l.ticket ?? "", cols.ticket, 9.5); text(l.channel === "online" ? "Online" : "Floor", cols.channel, 9.5, sans, MUTED);
    text(money(l.price_pence), cols.price, 9.5, sans, INK, true); text(money(-l.commission_pence), cols.comm, 9.5, sans, MUTED, true); text(money(l.net_pence), cols.net, 9.5, bold, INK, true);
    y -= 15;
  }

  // Footer
  const foot = (p: PDFPage) => p.drawText("Dealer Centre Ltd, Hardwick House, Agricultural Hall Plain, Norwich NR1 3FS. Worked out by Dealer Centre from sales recorded at the centre.", { x: M, y: 28, size: 7.5, font: sans, color: MUTED });
  pdf.getPages().forEach(foot);
  return pdf.save();
}
