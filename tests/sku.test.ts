import { describe, it, expect } from "vitest";
import { normaliseSku, displaySku, suggestDealerCode, extractTicketFromNote, isValidDealerCode } from "@/lib/sku";

describe("sku", () => {
  it("normalises spaces, dashes and case", () => {
    expect(normaliseSku("b14 0372")).toBe("B140372");
    expect(normaliseSku("B14-0372")).toBe("B140372");
  });
  it("displays code and number apart", () => {
    expect(displaySku("B140372")).toBe("B14 0372");
    expect(displaySku("AB0001")).toBe("AB 0001");
  });
  it("suggests a dealer code from a name", () => {
    expect(suggestDealerCode("Bloom Antiques")).toBe("BA");
    expect(suggestDealerCode("Looses")).toBe("LOO");
    expect(isValidDealerCode(suggestDealerCode("The Old Rectory Antiques Co"))).toBe(true);
  });
  it("pulls a ticket from a till note", () => {
    expect(extractTicketFromNote("b14 372")).toBe("B140372");
    expect(extractTicketFromNote("B14-0372 blue jug")).toBe("B140372");
    expect(extractTicketFromNote("372", "B14")).toBe("B140372");
    expect(extractTicketFromNote("blue jug")).toBeNull();
  });
});
