import { canonicalTicket } from "@/lib/sku";
import { parseCsv } from "@/lib/full/sumup";

export const SHEET_FIELDS = ["title", "price", "ticket", "description", "size", "centre"] as const;
export type SheetField = (typeof SHEET_FIELDS)[number];
export type SheetMap = Record<SheetField, number>;

const SIZES: Record<string, "small" | "medium" | "large" | "furniture"> = {
  small: "small",
  smallpieces: "small",
  medium: "medium",
  mediumpieces: "medium",
  large: "large",
  largepieces: "large",
  furniture: "furniture",
};

export type SheetRow = {
  line: number;
  title: string;
  pricePence: number;
  ticket: string | null;
  description: string;
  size: "small" | "medium" | "large" | "furniture";
  centre: string;
  status: "ok" | "error" | "duplicate";
  message: string;
};

function norm(h: string): string {
  return h.toLowerCase().replace(/[^a-z]/g, "");
}

export function guessSheetMap(headers: string[]): SheetMap {
  const n = headers.map(norm);
  const find = (...names: string[]) => n.findIndex((h) => names.some((name) => h.includes(name)));
  return {
    title: find("title", "name", "item"),
    price: find("price", "amount", "asking"),
    ticket: find("ticket", "sku", "code"),
    description: find("description", "notes", "detail"),
    size: find("size", "category", "delivery"),
    centre: find("centre", "center", "shop", "location"),
  };
}

export function rowsFromCsv(text: string): string[][] {
  return parseCsv(text);
}

export function checkRows(table: string[][], map: SheetMap, known: { tickets: string[]; centres: string[] }): SheetRow[] {
  const seen = new Set<string>();
  const centres = new Map(known.centres.map((c) => [c.toLowerCase(), c]));
  const out: SheetRow[] = [];
  table.slice(1).forEach((cells, i) => {
    if (!cells.some((c) => c.trim())) return;
    const cell = (f: SheetField) => (map[f] >= 0 ? (cells[map[f]] ?? "").trim() : "");
    const title = cell("title");
    const priceRaw = cell("price").replace(/[^0-9.]/g, "");
    const price = Number(priceRaw);
    const ticketRaw = cell("ticket");
    const ticket = ticketRaw ? canonicalTicket(ticketRaw) : null;
    const sizeRaw = norm(cell("size"));
    const size = sizeRaw ? SIZES[sizeRaw] : "small";
    const centreRaw = cell("centre");
    const centre = centreRaw ? centres.get(centreRaw.toLowerCase()) ?? "" : "";
    const problems: string[] = [];
    if (title.length < 2) problems.push("Needs a title");
    if (!priceRaw || !Number.isFinite(price) || price <= 0) problems.push("Price is not a number");
    if (sizeRaw && !size) problems.push("Unknown size");
    if (centreRaw && !centre) problems.push("Unknown centre");
    if (ticket && (known.tickets.includes(ticket) || seen.has(ticket))) problems.push("Ticket already used");
    if (ticket) seen.add(ticket);
    const status = problems.some((p) => p === "Ticket already used") && problems.length === 1 ? "duplicate" : problems.length ? "error" : "ok";
    out.push({
      line: i + 2,
      title,
      pricePence: Number.isFinite(price) ? Math.round(price * 100) : 0,
      ticket,
      description: cell("description").slice(0, 2000),
      size: size ?? "small",
      centre: centre || centreRaw,
      status,
      message: problems.join(". ") || "Ready",
    });
  });
  return out.slice(0, 500);
}

export const SHEET_TEMPLATE = "title,price,ticket,description,size,centre\nOak coffer,395,,17th century style,furniture,Looses Emporium\n";
