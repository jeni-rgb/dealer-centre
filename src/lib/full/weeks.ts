/** Week boundaries in Europe/London. Monday starts the week. */

const WEEKDAY: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

export function londonDate(instant: Date): { ymd: string; weekday: string } {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
  const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short" }).format(instant);
  return { ymd, weekday };
}

/** UTC instant of midnight at the start of that London calendar day. */
export function londonMidnight(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  for (const hour of [0, 1]) {
    const guess = new Date(Date.UTC(y, m - 1, d, -hour, 0, 0));
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(guess);
    const get = (t: string) => parts.find((p) => p.type === t)?.value;
    const stamp = `${get("year")}-${get("month")}-${get("day")}`;
    if (stamp === ymd && get("hour") === "00") return guess;
  }
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function weekRange(now = new Date()): { thisStart: Date; lastStart: Date; nextStart: Date } {
  const { ymd, weekday } = londonDate(now);
  const monday = addDays(ymd, -(WEEKDAY[weekday] ?? 0));
  const thisStart = londonMidnight(monday);
  const lastStart = londonMidnight(addDays(monday, -7));
  const nextStart = londonMidnight(addDays(monday, 7));
  return { thisStart, lastStart, nextStart };
}

export function sumBetween(rows: { sold_at: string; amount_pence: number }[], from: Date, to: Date): number {
  const a = from.getTime();
  const b = to.getTime();
  return rows.reduce((n, r) => {
    const t = new Date(r.sold_at).getTime();
    return t >= a && t < b ? n + r.amount_pence : n;
  }, 0);
}
