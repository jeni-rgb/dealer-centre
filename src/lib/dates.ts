/** Written UK dates, London time. 13 November, or 13 November 2026. */

export function ukDate(iso: string, withYear = false): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: withYear ? "numeric" : undefined,
    timeZone: "Europe/London",
  });
}

/** A calendar day stored as YYYY-MM-DD, shown as 13 November 2026. */
export function ukDateFromYmd(ymd: string): string {
  if (!ymd) return "Choose a date";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
