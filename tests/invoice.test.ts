import { describe, expect, it } from "vitest";
import { afterSale, fileAlreadyRecorded, linesFromAi, linesFromCsv, stockFlag } from "@/lib/invoices/lines";

const noDash = (s: string) => expect(s).not.toMatch(/[-–—·]/);

describe("invoice lines", () => {
  it("reads a supplier sheet and a model reply", () => {
    const lines = linesFromCsv("item,qty,cost\nKey box,20,1.50\n\"Blue jug, small\",4,12\n");
    expect(lines[0]).toEqual({ title: "Key box", qty: 20, costPence: 150 });
    expect(lines[1].title).toBe("Blue jug, small");
    expect(lines[1].costPence).toBe(1200);
    const ai = linesFromAi({ supplier: "Box Co", lines: [{ title: "Key box", qty: 20, cost: 1.5 }, { title: "x", qty: 0, cost: 1 }] });
    expect(ai).toEqual([{ title: "Key box", qty: 20, costPence: 150 }]);
  });

  it("takes one off a line and tells a second card sale from a file", () => {
    expect(afterSale(10)).toEqual({ qty: 9, soldOut: false });
    expect(afterSale(1)).toEqual({ qty: 0, soldOut: true });
    expect(fileAlreadyRecorded(["sumup-a", "sumup-b"])).toBe(false);
    expect(fileAlreadyRecorded(["eod-1"])).toBe(true);
    expect(stockFlag(8, 10)).toBe("ok");
    expect(stockFlag(2, 10)).toBe("low");
    expect(stockFlag(0, 10)).toBe("out");
    expect(stockFlag(1, 1)).toBe("ok");
    for (const s of ["8 left", "Low", "Sold out", "One for each box", "One for each kind", "Invoice kept"]) noDash(s);
  });
});
