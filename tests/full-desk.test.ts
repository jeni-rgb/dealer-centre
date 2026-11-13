import { describe, expect, it } from "vitest";
import { londonMidnight, sumBetween, weekRange } from "@/lib/full/weeks";
import { guessColumns, mapBringRows, parseCsv } from "@/lib/full/sumup";
import { groupName, rankSold } from "@/lib/full/insights";
import { BASIC_LINE, COMPARE_HEADLINE, FULL_POINTS } from "@/lib/billing/pricing";

const noDash = (s: string) => expect(s).not.toMatch(/[-–—]/);

describe("full desk", () => {
  it("starts the week on Monday in London, including summer time", () => {
    const nov = weekRange(new Date("2026-11-13T15:00:00Z"));
    expect(nov.thisStart.toISOString()).toBe(londonMidnight("2026-11-09").toISOString());
    expect(nov.lastStart.toISOString()).toBe(londonMidnight("2026-11-02").toISOString());
    const july = weekRange(new Date("2026-07-15T12:00:00Z"));
    expect(july.thisStart.toISOString()).toBe("2026-07-12T23:00:00.000Z");
    expect(sumBetween([
      { sold_at: "2026-11-10T12:00:00Z", amount_pence: 100 },
      { sold_at: "2026-11-03T12:00:00Z", amount_pence: 40 },
    ], nov.thisStart, nov.nextStart)).toBe(100);
  });

  it("reads a SumUp style file and a simple ticket file", () => {
    const sumup = parseCsv(`Date,Transaction code,Status,Payment type,Total,Description
01/11/2026,T1,Successful,Card,"£45.00","B14 0372 writing slope"
02/11/2026,T2,Failed,Card,£10.00,B140371
`);
    const cols = guessColumns(sumup[0]);
    expect(cols).toBeTruthy();
    const mapped = mapBringRows(sumup, cols!);
    expect(mapped.skipped).toBe(1);
    expect(mapped.rows).toEqual([{ ticket: "B14 0372", amountPence: 4500, soldAt: "2026-11-01T12:00:00.000Z", payment: "CARD" }]);

    const simple = parseCsv("ticket,amount,date\nB140358,120,2026-11-04");
    const simpleCols = guessColumns(simple[0]);
    expect(mapBringRows(simple, simpleCols!) .rows[0].amountPence).toBe(12000);
  });

  it("ranks what sold", () => {
    const ranked = rankSold([
      { title: "Jug", group: groupName("small"), amountPence: 2000 },
      { title: "Jug", group: groupName("small"), amountPence: 2500 },
      { title: "Coffer", group: groupName("furniture"), amountPence: 9000 },
    ]);
    expect(ranked.items[0].title).toBe("Coffer");
    expect(ranked.items.find((i) => i.title === "Jug")?.count).toBe(2);
    expect(ranked.groups[0].title).toBe("Furniture");
  });

  it("keeps the plan words free of dashes", () => {
    noDash(COMPARE_HEADLINE);
    noDash(BASIC_LINE);
    for (const line of FULL_POINTS) noDash(line);
  });
});
