import { extractTicketFromNote, normaliseSku } from "@/lib/sku";
import type { IncomingLine } from "@/lib/channels/types";

/** Pure matching logic, no database. Tested in isolation. */

export type Candidate = {
  item_id: string;
  dealer_id: string;
  centre_id: string | null;
  sku: string;
  alt_skus: string[];
  listing_external_id: string | null;
  listing_external_variant_id: string | null;
};

export type CategoryMap = { square_category_id: string; dealer_id: string }[];

export type MatchResult =
  | { kind: "item"; item: Candidate; via: "variant" | "sku" | "alt_sku" | "ticket" }
  | { kind: "dealer_only"; dealer_id: string; ticket_no: string | null }
  | { kind: "unmatched" };

export function matchLine(line: IncomingLine, candidates: Candidate[], categories: CategoryMap): MatchResult {
  if (line.external_variant_id) {
    const c = candidates.find((x) => x.listing_external_variant_id === line.external_variant_id);
    if (c) return { kind: "item", item: c, via: "variant" };
  }
  if (line.external_item_id) {
    const c = candidates.find((x) => x.listing_external_id === line.external_item_id);
    if (c) return { kind: "item", item: c, via: "variant" };
  }
  if (line.sku) {
    const s = normaliseSku(line.sku);
    const c = candidates.find((x) => x.sku === s);
    if (c) return { kind: "item", item: c, via: "sku" };
    const a = candidates.find((x) => x.alt_skus.map(normaliseSku).includes(s));
    if (a) return { kind: "item", item: a, via: "alt_sku" };
  }
  // Square till path: dealer category plus ticket number in the note
  const dealerFromCategory = line.category_id
    ? categories.find((c) => c.square_category_id === line.category_id)?.dealer_id ?? null
    : null;
  const dealerCode = dealerFromCategory ? candidates.find((c) => c.dealer_id === dealerFromCategory)?.sku.replace(/\d{4}$/, "") : undefined;
  const ticket = extractTicketFromNote(line.note, dealerCode);
  if (ticket) {
    const c = candidates.find((x) => x.sku === ticket || x.alt_skus.map(normaliseSku).includes(ticket));
    if (c && (!dealerFromCategory || c.dealer_id === dealerFromCategory)) return { kind: "item", item: c, via: "ticket" };
  }
  if (dealerFromCategory) return { kind: "dealer_only", dealer_id: dealerFromCategory, ticket_no: ticket };
  return { kind: "unmatched" };
}
