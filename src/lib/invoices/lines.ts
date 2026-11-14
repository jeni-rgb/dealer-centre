import { parseCsv } from "@/lib/full/sumup";

export type InvoiceLine = { title: string; qty: number; costPence: number };

export type InvoiceVariant = { title: string; qty: number; sellPence: number; costPence: number };

const norm = (h: string) => h.toLowerCase().replace(/[^a-z]/g, "");

function pounds(raw: string): number {
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

/** Read a supplier CSV. Cost is each, unless the sheet only has a line total. */
export function linesFromCsv(text: string): InvoiceLine[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const heads = rows[0].map(norm);
  const find = (...names: string[]) => heads.findIndex((h) => names.some((n) => h === n || h.includes(n)));
  const titleAt = find("description", "item", "title", "product", "name");
  const qtyAt = find("qty", "quantity", "count");
  const eachAt = find("unitcost", "unitprice", "costeach", "each", "cost", "price");
  const totalAt = find("linetotal", "total", "amount");
  const out: InvoiceLine[] = [];
  for (const cells of rows.slice(1)) {
    if (!cells.some((c) => c.trim())) continue;
    const title = (titleAt >= 0 ? cells[titleAt] : cells[0] ?? "").trim();
    const qty = Math.max(0, Math.round(Number((qtyAt >= 0 ? cells[qtyAt] : "1").replace(/[^0-9.]/g, "")) || 0));
    let cost = eachAt >= 0 ? pounds(cells[eachAt] ?? "") : 0;
    const total = totalAt >= 0 && totalAt !== eachAt ? pounds(cells[totalAt] ?? "") : 0;
    if (!cost && total && qty) cost = Math.round(total / qty);
    if (title.length < 2 || qty < 1) continue;
    out.push({ title: title.slice(0, 120), qty: Math.min(qty, 200), costPence: cost });
  }
  return out.slice(0, 40);
}

/** Turn a model reply into lines. Unknown shapes become nothing. */
export function linesFromAi(raw: unknown): InvoiceLine[] {
  const lines = raw && typeof raw === "object" && Array.isArray((raw as { lines?: unknown }).lines) ? (raw as { lines: unknown[] }).lines : [];
  const out: InvoiceLine[] = [];
  for (const row of lines) {
    if (!row || typeof row !== "object") continue;
    const r = row as { title?: unknown; qty?: unknown; cost?: unknown; cost_pence?: unknown };
    const title = String(r.title ?? "").trim();
    const qty = Math.round(Number(r.qty) || 0);
    const costPence = Number.isFinite(Number(r.cost_pence)) ? Math.round(Number(r.cost_pence)) : Math.round(Number(r.cost) * 100);
    if (title.length < 2 || qty < 1 || costPence < 0) continue;
    out.push({ title: title.slice(0, 120), qty: Math.min(qty, 200), costPence });
  }
  return out.slice(0, 40);
}

export function supplierFromAi(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  return String((raw as { supplier?: unknown }).supplier ?? "").trim().slice(0, 80);
}

/** One sale takes one off the line. Zero left means sold out. */
export function afterSale(qty: number): { qty: number; soldOut: boolean } {
  const next = Math.max(0, Math.floor(qty) - 1);
  return { qty: next, soldOut: next === 0 };
}

/** A same day file sale is the duplicate. A second card payment is another box. */
export function fileAlreadyRecorded(orderIds: string[]): boolean {
  return orderIds.some((id) => id.length > 0 && !id.startsWith("sumup-"));
}

export function stockFlag(qty: number, qtyStart: number): "ok" | "low" | "out" {
  if (qty <= 0) return "out";
  if (qtyStart > 2 && qty <= 2) return "low";
  return "ok";
}
