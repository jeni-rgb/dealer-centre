import type { Admin } from "@/lib/supabase/server";
import { displaySku } from "@/lib/sku";

/**
 * One calculation for a dealer's month at a centre. The dealer's earnings view, the centre's dealer
 * statements, the PDF and the month end job all call this, so the numbers can never disagree.
 *
 * Rules:
 *  - Floor sales (till, End of day, Square): the centre's floor commission on the price.
 *  - Centre online shop sales: 20% online commission (15% Dealer Centre, 5% the centre), taken from
 *    channel_fee_pence as recorded on the sale, plus any postage the centre charged against the dealer.
 *  - Rent: the pitch rent for the month if the dealer is on rent (monthly as is; weekly times the number
 *    of that weekday in the month; quarterly in January, April, July and October).
 *  - A dealer's own Shopify sales and "sold elsewhere" are not centre sales and are not on this statement.
 */

export type StatementLine = {
  sale_id: string;
  sold_at: string;
  title: string;
  ticket: string | null;
  channel: "floor" | "online";
  payment: string | null;
  price_pence: number;
  commission_pence: number;
  net_pence: number;
};

export type Statement = {
  dealer: { id: string; name: string; code: string };
  centre: { id: string; name: string; commission_bps: number; online_commission_bps: number };
  period: string;                  // YYYY-MM-01
  label: string;                   // "November 2026"
  lines: StatementLine[];
  floor_gross_pence: number;
  online_gross_pence: number;
  gross_pence: number;
  floor_commission_pence: number;
  online_commission_pence: number;
  commission_pence: number;
  rent_pence: number;
  rent_note: string;
  net_pence: number;
  sales_count: number;
  paid_at: string | null;
  status: "running" | "issued" | "paid";
};

export function periodKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
export function periodBounds(period: string) {
  const [y, m] = period.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}
export function periodLabel(period: string) {
  const { start } = periodBounds(period);
  return start.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function weekdaysInMonth(start: Date, end: Date, weekday: number) {
  let n = 0;
  for (const d = new Date(start); d < end; d.setDate(d.getDate() + 1)) if (d.getDay() === weekday) n++;
  return n;
}

export function rentForMonth(link: { rent_pence: number; rent_mode: string; rent_schedule: string }, period: string, chargesRent: boolean) {
  if (!chargesRent || link.rent_mode !== "rent" || !link.rent_pence) return { rent: 0, note: "Commission only" };
  const { start, end } = periodBounds(period);
  switch (link.rent_schedule) {
    case "weekly_friday": { const n = weekdaysInMonth(start, end, 5); return { rent: link.rent_pence * n, note: `${n} Fridays at ${pounds(link.rent_pence)}` }; }
    case "weekly_monday": { const n = weekdaysInMonth(start, end, 1); return { rent: link.rent_pence * n, note: `${n} Mondays at ${pounds(link.rent_pence)}` }; }
    case "quarterly": return start.getMonth() % 3 === 0 ? { rent: link.rent_pence, note: "Quarterly rent due this month" } : { rent: 0, note: "Quarterly rent, not due this month" };
    default: return { rent: link.rent_pence, note: "Monthly rent" };
  }
}

const pounds = (p: number) => `£${(p / 100).toFixed(2)}`;

export async function computeStatement(db: Admin, dealerId: string, centreId: string, period: string): Promise<Statement | null> {
  const { start, end } = periodBounds(period);
  const [{ data: dealer }, { data: centre }, { data: link }, { data: sales }, { data: existing }] = await Promise.all([
    db.from("dealers").select("id, name, code").eq("id", dealerId).single(),
    db.from("centres").select("id, name, commission_bps, online_commission_bps, charges_rent").eq("id", centreId).single(),
    db.from("dealer_centres").select("rent_pence, rent_mode, rent_schedule").eq("dealer_id", dealerId).eq("centre_id", centreId).maybeSingle(),
    db.from("sales").select("id, sold_at, amount_pence, channel_fee_pence, postage_pence, payment_type, ticket_no, items(title), channels:channel_id(type, owner_type)")
      .eq("dealer_id", dealerId).eq("centre_id", centreId).is("voided_at", null).gte("sold_at", start.toISOString()).lt("sold_at", end.toISOString()).order("sold_at", { ascending: true }),
    db.from("statements").select("status, paid_at").eq("dealer_id", dealerId).eq("centre_id", centreId).eq("period", period).maybeSingle(),
  ]);
  if (!dealer || !centre) return null;

  const lines: StatementLine[] = (sales ?? []).map((s) => {
    const ch = s.channels as unknown as { type: string; owner_type: string } | null;
    const online = !!ch && !["square", "manual"].includes(ch.type) && ch.owner_type === "centre";
    const commission = online
      ? (s.channel_fee_pence || Math.round((s.amount_pence * centre.online_commission_bps) / 10000)) + (s.postage_pence ?? 0)
      : Math.round((s.amount_pence * centre.commission_bps) / 10000);
    const ticket = s.ticket_no ? displaySku(s.ticket_no) : null;
    return {
      sale_id: s.id, sold_at: s.sold_at, title: (s.items as unknown as { title: string } | null)?.title ?? (ticket ? `Ticket ${ticket}` : "Sale"),
      ticket, channel: online ? "online" : "floor", payment: s.payment_type,
      price_pence: s.amount_pence, commission_pence: commission, net_pence: s.amount_pence - commission,
    };
  });
  const sum = (f: (l: StatementLine) => number) => lines.reduce((a, l) => a + f(l), 0);
  const floor_gross = sum((l) => (l.channel === "floor" ? l.price_pence : 0));
  const online_gross = sum((l) => (l.channel === "online" ? l.price_pence : 0));
  const floor_commission = sum((l) => (l.channel === "floor" ? l.commission_pence : 0));
  const online_commission = sum((l) => (l.channel === "online" ? l.commission_pence : 0));
  const { rent, note } = link ? rentForMonth(link, period, centre.charges_rent !== false) : { rent: 0, note: "Not at this centre" };
  const now = periodKey(new Date());
  return {
    dealer, centre: { id: centre.id, name: centre.name, commission_bps: centre.commission_bps, online_commission_bps: centre.online_commission_bps },
    period, label: periodLabel(period), lines,
    floor_gross_pence: floor_gross, online_gross_pence: online_gross, gross_pence: floor_gross + online_gross,
    floor_commission_pence: floor_commission, online_commission_pence: online_commission, commission_pence: floor_commission + online_commission,
    rent_pence: rent, rent_note: note, net_pence: floor_gross + online_gross - floor_commission - online_commission - rent,
    sales_count: lines.length, paid_at: existing?.paid_at ?? null,
    status: existing?.paid_at ? "paid" : period < now ? "issued" : "running",
  };
}

/** Store (or refresh) the statement row for a closed month. Never touches paid_at. */
export async function issueStatement(db: Admin, st: Statement) {
  const { error } = await db.from("statements").upsert({
    dealer_id: st.dealer.id, centre_id: st.centre.id, period: st.period,
    gross_pence: st.gross_pence, floor_gross_pence: st.floor_gross_pence, online_gross_pence: st.online_gross_pence,
    commission_pence: st.commission_pence, floor_commission_pence: st.floor_commission_pence, online_commission_pence: st.online_commission_pence,
    rent_pence: st.rent_pence, net_pence: st.net_pence, sales_count: st.sales_count, issued_at: new Date().toISOString(),
    status: st.paid_at ? "paid" : "issued",
  }, { onConflict: "dealer_id,centre_id,period" });
  if (error) throw new Error(error.message);
}
