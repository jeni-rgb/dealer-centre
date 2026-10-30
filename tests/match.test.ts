import { describe, it, expect } from "vitest";
import { matchLine, type Candidate } from "@/lib/sales/match";
import type { IncomingLine } from "@/lib/channels/types";

const cands: Candidate[] = [
  { item_id: "i1", dealer_id: "d1", centre_id: "c1", sku: "B140372", alt_skus: ["OLD99"], listing_external_id: "sq-item-1", listing_external_variant_id: "sq-var-1" },
  { item_id: "i2", dealer_id: "d2", centre_id: "c1", sku: "JH0010", alt_skus: [], listing_external_id: null, listing_external_variant_id: null },
];
const cats = [{ square_category_id: "cat-b14", dealer_id: "d1" }, { square_category_id: "cat-jh", dealer_id: "d2" }];
const base: IncomingLine = { external_order_id: "o1", external_line_id: "l1", external_variant_id: null, external_item_id: null, sku: null, category_id: null, note: null, amount_pence: 100, fees_pence: 0, payment_type: null, sold_at: new Date().toISOString(), raw: {} };

describe("matchLine", () => {
  it("matches a scanned barcode via variant id", () => {
    const m = matchLine({ ...base, external_variant_id: "sq-var-1" }, cands, cats);
    expect(m).toMatchObject({ kind: "item", via: "variant" });
  });
  it("matches a Shopify sale via sku", () => {
    const m = matchLine({ ...base, sku: "b14 0372" }, cands, cats);
    expect(m).toMatchObject({ kind: "item", via: "sku" });
  });
  it("matches an old label via alt sku", () => {
    const m = matchLine({ ...base, sku: "old99" }, cands, cats);
    expect(m).toMatchObject({ kind: "item", via: "alt_sku" });
  });
  it("matches a till sale from category plus typed ticket", () => {
    const m = matchLine({ ...base, category_id: "cat-jh", note: "10" }, cands, cats);
    expect(m).toMatchObject({ kind: "item", via: "ticket" });
    if (m.kind === "item") expect(m.item.item_id).toBe("i2");
  });
  it("falls back to dealer only when the ticket is unknown", () => {
    const m = matchLine({ ...base, category_id: "cat-b14", note: "999" }, cands, cats);
    expect(m).toMatchObject({ kind: "dealer_only", dealer_id: "d1" });
  });
  it("refuses a ticket that belongs to a different dealer's category", () => {
    const m = matchLine({ ...base, category_id: "cat-jh", note: "B14 0372" }, cands, cats);
    expect(m.kind).toBe("dealer_only");
  });
  it("is unmatched with nothing to go on", () => {
    expect(matchLine(base, cands, cats).kind).toBe("unmatched");
  });
});

describe("ticket prefix", () => {
  it("reads a dealer code off a ticket", () => {
    expect("B140372".match(/^([A-Z][A-Z0-9]{1,3}?)\d{1,4}$/)?.[1]).toBe("B14");
    expect("JH0010".match(/^([A-Z][A-Z0-9]{1,3}?)\d{1,4}$/)?.[1]).toBe("JH");
  });
});
