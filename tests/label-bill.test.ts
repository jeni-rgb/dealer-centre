import { describe, expect, it } from "vitest";
import { labelTally } from "@/lib/billing/labels";
import { labelAccountLine, plusVat } from "@/lib/billing/pricing";

describe("label bills", () => {
  it("keeps the first 25 free and leaves the rest owed", () => {
    const open = labelTally(31, 0);
    expect(open.freeUsed).toBe(25);
    expect(open.owed).toBe(6);
    expect(open.amountPence).toBe(450);
    expect(plusVat(open.amountPence)).toBe("£4.50 plus VAT");
    const line = labelAccountLine(31, 6);
    expect(line).toBe("Labels so far: 31. 25 free, 6 at 75p.");
    expect(line).not.toMatch(/[-–—·]/);
    expect(labelTally(31, 6).owed).toBe(0);
    expect(labelTally(35, 4).owed).toBe(6);
    expect(labelTally(20, 0).owed).toBe(0);
    expect(labelTally(40, 4, 6).owed).toBe(5);
  });
});
