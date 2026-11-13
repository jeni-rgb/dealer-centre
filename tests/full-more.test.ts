import { describe, expect, it } from "vitest";
import { findTicket, majorToPence, planMatch } from "@/lib/sumup/match";
import { checkRows, guessSheetMap } from "@/lib/items/sheet";
import { squareReaderUrl, sumupReaderUrl } from "@/lib/pay/links";

const noDash = (s: string) => expect(s).not.toMatch(/[-–—·]/);

describe("sumup match", () => {
  it("reads a ticket from a description and skips a sale the file already recorded", () => {
    expect(findTicket("B14 0372 writing slope")).toBe("B140372");
    expect(majorToPence(12.5)).toBe(1250);
    const dup = planMatch({
      description: "B14 0372",
      amountPence: 4500,
      day: "2026-11-01",
      live: [{ sku: "B140372" }],
      taken: [{ ticket: "B140372", amountPence: 4500, day: "2026-11-01" }],
    });
    expect(dup.kind).toBe("duplicate");
    const fresh = planMatch({
      description: "sold B14 0372",
      amountPence: 4500,
      day: "2026-11-02",
      live: [{ sku: "B140372" }],
      taken: [],
    });
    expect(fresh).toEqual({ kind: "matched", sku: "B140372" });
    expect(planMatch({ description: "no ticket here", amountPence: 100, day: "2026-11-02", live: [], taken: [] }).kind).toBe("unmatched");
  });
});

describe("stock sheet", () => {
  it("maps columns and flags a duplicate ticket", () => {
    const table = [
      ["Item", "Asking", "Ticket", "Notes", "Size", "Centre"],
      ["Oak coffer", "395", "", "old", "furniture", "Looses Emporium"],
      ["Jug", "12", "B140358", "", "small", "Looses Emporium"],
      ["Bowl", "nope", "", "", "tiny", "Nowhere"],
    ];
    const map = guessSheetMap(table[0]);
    const rows = checkRows(table, map, { tickets: ["B140358"], centres: ["Looses Emporium"] });
    expect(rows[0].status).toBe("ok");
    expect(rows[0].size).toBe("furniture");
    expect(rows[1].status).toBe("duplicate");
    expect(rows[2].status).toBe("error");
    for (const row of rows) noDash(row.message);
  });
});

describe("reader links", () => {
  it("prefills the amount and the ticket", () => {
    const sumup = sumupReaderUrl({ amountPence: 39500, ticket: "B14 0362", affiliateKey: "aff", callback: "https://example.com/api/pay/sumup?t=abc", foreignId: "abc" });
    expect(sumup).toContain("sumupmerchant://pay/1.0");
    expect(sumup).toContain("amount=395.00");
    expect(sumup).toContain("B14");
    const square = squareReaderUrl({ amountPence: 39500, ticket: "B14 0362", clientId: "sq", callback: "https://example.com/api/pay/square", state: "abc" });
    expect(square.startsWith("square-commerce-v1://payment/create?data=")).toBe(true);
    expect(decodeURIComponent(square)).toContain("39500");
    expect(decodeURIComponent(square)).toContain("B14 0362");
  });
});
