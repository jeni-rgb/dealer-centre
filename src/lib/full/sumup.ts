/** Turn a paper book or a SumUp export into ticket sales. No hyphens in messages returned to the screen. */

export type BringRow = { ticket: string; amountPence: number; soldAt: string; payment: "CASH" | "CARD" };

export const TICKET = /\b([A-Za-z][A-Za-z0-9]{0,3}\s?\d{1,4})\b/;

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell.trim()); cell = ""; }
    else if (c === "\n") { row.push(cell.trim()); if (row.some((x) => x)) rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  row.push(cell.trim());
  if (row.some((x) => x)) rows.push(row);
  return rows;
}

function norm(h: string): string {
  return h.toLowerCase().replace(/[^a-z]/g, "");
}

export function guessColumns(headers: string[]): { date: number; amount: number; ticket: number; status: number; payment: number } | null {
  const n = headers.map(norm);
  const find = (...names: string[]) => n.findIndex((h) => names.some((name) => h.includes(name)));
  const date = find("date", "sold");
  const amount = find("total", "amount", "price", "paid", "gross");
  const ticket = find("ticket", "sku", "description", "reference", "product", "item");
  if (date < 0 || amount < 0 || ticket < 0) return null;
  return { date, amount, ticket, status: find("status"), payment: find("payment", "method", "type") };
}

function poundsToPence(raw: string): number | null {
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function toIsoDate(raw: string): string | null {
  const s = raw.trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}T12:00:00.000Z`;
  const gb = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (gb) return `${gb[3]}-${gb[2].padStart(2, "0")}-${gb[1].padStart(2, "0")}T12:00:00.000Z`;
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return null;
}

export function mapBringRows(table: string[][], columns: { date: number; amount: number; ticket: number; status: number; payment: number }): { rows: BringRow[]; skipped: number } {
  const body = table.slice(1);
  const rows: BringRow[] = [];
  let skipped = 0;
  for (const cells of body) {
    const status = columns.status >= 0 ? (cells[columns.status] ?? "") : "";
    if (status && !/success|paid|complete|ok/i.test(status)) { skipped++; continue; }
    const ticketMatch = (cells[columns.ticket] ?? "").match(TICKET);
    const amount = poundsToPence(cells[columns.amount] ?? "");
    const soldAt = toIsoDate(cells[columns.date] ?? "");
    if (!ticketMatch || !amount || !soldAt) { skipped++; continue; }
    const pay = (columns.payment >= 0 ? cells[columns.payment] ?? "" : "").toLowerCase();
    rows.push({ ticket: ticketMatch[1], amountPence: amount, soldAt, payment: pay.includes("cash") ? "CASH" : "CARD" });
  }
  return { rows, skipped };
}
