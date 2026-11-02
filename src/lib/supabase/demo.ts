/**
 * Demo mode. When DEMO_MODE=1 every page reads from these fixtures instead of Supabase.
 * Used for screenshots, design review and showing the app to traders with no account.
 * The fake client supports the subset of the Supabase query builder the pages use.
 */
import { cookies } from "next/headers";

const d = (daysAgo: number, h = 11, m = 20) => { const x = new Date(); x.setDate(x.getDate() - daysAgo); x.setHours(h, m, 0, 0); return x.toISOString(); };
const monthDay = (day: number) => { const x = new Date(); x.setDate(day); x.setHours(10, 0, 0, 0); return x.toISOString(); };

export const periodOf = (offset: number) => { const n = new Date(); const p = new Date(n.getFullYear(), n.getMonth() + offset, 1); return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-01`; };
const IDS = {
  user_dealer: "00000000-0000-0000-0000-00000000d001",
  user_centre: "00000000-0000-0000-0000-00000000c001",
  user_admin: "00000000-0000-0000-0000-00000000a001",
  dealer: "22222222-2222-2222-2222-222222222222",
  dealer2: "22222222-2222-2222-2222-222222222223",
  dealer3: "22222222-2222-2222-2222-222222222224",
  centre: "11111111-1111-1111-1111-111111111111",
  ch_manual: "33333333-3333-3333-3333-333333333331",
  ch_shopify: "33333333-3333-3333-3333-333333333332",
  ch_square: "33333333-3333-3333-3333-333333333333",
  printer_centre: "44444444-4444-4444-4444-444444444441",
  printer_own: "44444444-4444-4444-4444-444444444442",
};

const items = [
  ["i01", "B140372", "Victorian mahogany writing slope", 14500, 6000, 3, "live", true, true],
  ["i02", "B140371", "Pair of brass candlesticks", 3800, 1200, 12, "live", false, false],
  ["i03", "B140366", "Art Deco mantel clock, working", 22000, 9000, 41, "live", true, true],
  ["i04", "B140358", "Set of six Edwardian dining chairs", 48000, 21000, 67, "live", false, false],
  ["i05", "B140349", "Georgian silver sugar tongs", 6500, 2500, 94, "live", true, false],
  ["i06", "B140331", "Oak coffer, 17th century style", 39500, 18000, 128, "live", false, false],
  ["i07", "B140370", "Cranberry glass jug", 4200, 1500, 9, "sold", false, false],
  ["i08", "B140365", "Staffordshire spaniel pair", 11000, 4000, 20, "sold", true, false],
  ["i09", "B140362", "French enamel coffee pot", 3300, 900, 15, "sold", false, false],
  ["i10", "B140360", "Blue and white meat plate", 2800, 800, 30, "sold", false, false],
] as const;

const T: Record<string, Record<string, unknown>[]> = {
  users: [
    { id: IDS.user_dealer, email: "sam@bloomantiques.co.uk", role: "dealer", is_platform_admin: false, dealer_id: IDS.dealer },
    { id: IDS.user_centre, email: "thedealercentre@gmail.com", role: "centre_owner", is_platform_admin: false, dealer_id: null },
    { id: IDS.user_admin, email: "jeni@thedealercentre.com", role: "platform_admin", is_platform_admin: true, dealer_id: null },
  ],
  dealers: [
    { id: IDS.dealer, name: "Bloom Antiques", code: "B14", plan: "trial", trial_ends_at: d(-26), stripe_customer_id: "cus_demo", placeholder: false, item_limit: 250, monthly_sold_limit: 100000, default_own_shopify: true, default_centre_shopify: false, created_at: d(4) },
    { id: IDS.dealer2, name: "J Harrison", code: "JH", plan: "pro", trial_ends_at: null, stripe_customer_id: "cus_demo2", item_limit: 100, placeholder: false, monthly_sold_limit: 50, created_at: d(40) },
    { id: IDS.dealer3, name: "Marsh Vintage", code: "MV", plan: "pro", trial_ends_at: null, stripe_customer_id: "cus_demo3", item_limit: 50, placeholder: false, monthly_sold_limit: 25, created_at: d(55) },
  ],
  centres: [
    { id: IDS.centre, name: "Looses Emporium", address: "23 to 25 Magdalen Street, Norwich", commission_bps: 1000, online_commission_bps: 2000, centre_online_share_bps: 500, rent_day: 1, statement_day: 1, invite_code: "LOOSES", status: "active", till: "ordinary", charges_rent: true, rent_frequency: "monthly", plan: "pro", stripe_customer_id: "cus_demo_centre", created_at: d(10) },
  ],
  centre_owners: [{ user_id: IDS.user_centre, centre_id: IDS.centre }],
  dealer_centres: [
    { id: "dc1", dealer_id: IDS.dealer, centre_id: IDS.centre, status: "active", square_category_id: null, pitch_numbers: ["12", "14", "15"], rent_pence: 39000, rent_mode: "rent", rent_schedule: "first", rent_set_by: "dealer", joined_at: d(4), left_at: null },
    { id: "dc2", dealer_id: IDS.dealer2, centre_id: IDS.centre, status: "active", square_category_id: null, pitch_numbers: ["3"], rent_pence: 13000, rent_mode: "rent", rent_schedule: "first", rent_set_by: "centre", joined_at: d(40), left_at: null },
    { id: "dc3", dealer_id: IDS.dealer3, centre_id: IDS.centre, status: "pending", square_category_id: null, pitch_numbers: [], rent_pence: 9000, rent_mode: "rent", rent_schedule: "weekly_friday", rent_set_by: "dealer", joined_at: null, left_at: null },
  ],
  channels: [
    { id: IDS.ch_manual, type: "manual", owner_type: "centre", owner_id: IDS.centre, external_account_id: "manual", location_id: null, status: "active", last_webhook_at: null, created_at: d(10) },
    { id: IDS.ch_shopify, type: "shopify", owner_type: "dealer", owner_id: IDS.dealer, external_account_id: "bloom-antiques.myshopify.com", location_id: null, status: "active", last_webhook_at: d(1, 9, 5), created_at: d(4) },
  ],
  items: items.map(([id, sku, title, price, cost, age, status, shop, centreShop]) => ({
    id, dealer_id: IDS.dealer, centre_id: IDS.centre, sku, alt_skus: [], title, description: null, price_pence: price, listed_price_pence: price, cost_pence: cost,
    photos: [], status, listed_at: d(age), sold_at: status === "sold" ? d(age - (age > 20 ? 18 : 8)) : null, on_own_shopify: shop, on_centre_shopify: centreShop,
  })),
  item_listings: [
    { id: "l1", item_id: "i01", channel_id: IDS.ch_shopify, status: "live", external_id: "gid://shopify/Product/1", external_variant_id: "v1", last_error: null },
    { id: "l3", item_id: "i03", channel_id: IDS.ch_shopify, status: "live", external_id: "gid://shopify/Product/3", external_variant_id: "v3", last_error: null },
    { id: "l5", item_id: "i05", channel_id: IDS.ch_shopify, status: "pending", external_id: null, external_variant_id: null, last_error: null },
    { id: "l8", item_id: "i08", channel_id: IDS.ch_shopify, status: "closed", external_id: "gid://shopify/Product/8", external_variant_id: "v8", last_error: null },
  ],
  sales: [
    { id: "s1", item_id: "i07", dealer_id: IDS.dealer, centre_id: IDS.centre, channel_id: IDS.ch_manual, external_order_id: "eod1", amount_pence: 4200, listed_price_pence: 4200, discount_pence: 0, channel_fee_pence: 0, postage_pence: 0, payment_type: "CARD", ticket_no: "B140370", sold_at: d(0, 11, 20), voided_at: null, corrected_at: null, original_amount_pence: null },
    { id: "s2", item_id: "i08", dealer_id: IDS.dealer, centre_id: null, channel_id: IDS.ch_shopify, external_order_id: "sh1", amount_pence: 11000, listed_price_pence: 11000, discount_pence: 0, channel_fee_pence: 0, postage_pence: 0, payment_type: "online", ticket_no: "B140365", sold_at: d(0, 16, 40), voided_at: null, corrected_at: null, original_amount_pence: null },
    { id: "s3", item_id: "i09", dealer_id: IDS.dealer, centre_id: IDS.centre, channel_id: IDS.ch_manual, external_order_id: "eod2", amount_pence: 3000, listed_price_pence: 3300, discount_pence: 300, channel_fee_pence: 0, postage_pence: 0, payment_type: "CASH", ticket_no: "B140362", sold_at: d(0, 14, 5), voided_at: null, corrected_at: null, original_amount_pence: null },
    { id: "s4", item_id: "i10", dealer_id: IDS.dealer, centre_id: IDS.centre, channel_id: IDS.ch_manual, external_order_id: "eod3", amount_pence: 2800, listed_price_pence: 2800, discount_pence: 0, channel_fee_pence: 0, postage_pence: 0, payment_type: "CARD", ticket_no: "B140360", sold_at: d(0, 12, 0), voided_at: null, corrected_at: null, original_amount_pence: null },
    { id: "s5", item_id: null, dealer_id: IDS.dealer2, centre_id: IDS.centre, channel_id: IDS.ch_manual, external_order_id: "eod4", amount_pence: 8500, listed_price_pence: null, discount_pence: 0, channel_fee_pence: 0, postage_pence: 0, payment_type: "CARD", ticket_no: "JH0041", sold_at: d(0, 15, 30), voided_at: null, corrected_at: null, original_amount_pence: null },
    { id: "s6", item_id: null, dealer_id: null, centre_id: IDS.centre, channel_id: IDS.ch_manual, external_order_id: "eod5", amount_pence: 1500, listed_price_pence: null, discount_pence: 0, channel_fee_pence: 0, postage_pence: 0, payment_type: "CASH", ticket_no: null, sold_at: d(0, 13, 0), voided_at: null, corrected_at: null, original_amount_pence: null },
    { id: "s20", item_id: null, dealer_id: IDS.dealer, centre_id: IDS.centre, channel_id: IDS.ch_manual, external_order_id: "hist0", amount_pence: 28000, listed_price_pence: 28000, discount_pence: 0, channel_fee_pence: 0, postage_pence: 0, payment_type: "CARD", ticket_no: "B140340", sold_at: d(1, 9, 5), voided_at: null, corrected_at: null, original_amount_pence: null },
    { id: "s21", item_id: null, dealer_id: IDS.dealer, centre_id: null, channel_id: IDS.ch_shopify, external_order_id: "hist1", amount_pence: 19500, listed_price_pence: 19500, discount_pence: 0, channel_fee_pence: 0, postage_pence: 0, payment_type: "CARD", ticket_no: "B140338", sold_at: d(1, 10, 5), voided_at: null, corrected_at: null, original_amount_pence: null },
    { id: "s22", item_id: null, dealer_id: IDS.dealer, centre_id: IDS.centre, channel_id: IDS.ch_manual, external_order_id: "hist2", amount_pence: 42000, listed_price_pence: 42000, discount_pence: 0, channel_fee_pence: 0, postage_pence: 0, payment_type: "CASH", ticket_no: "B140335", sold_at: d(1, 11, 5), voided_at: null, corrected_at: null, original_amount_pence: null },
    { id: "s23", item_id: null, dealer_id: IDS.dealer, centre_id: IDS.centre, channel_id: IDS.ch_manual, external_order_id: "hist3", amount_pence: 12500, listed_price_pence: 12500, discount_pence: 0, channel_fee_pence: 0, postage_pence: 0, payment_type: "CARD", ticket_no: "B140333", sold_at: d(1, 12, 5), voided_at: null, corrected_at: null, original_amount_pence: null },
    { id: "s24", item_id: null, dealer_id: IDS.dealer, centre_id: null, channel_id: IDS.ch_shopify, external_order_id: "hist4", amount_pence: 36000, listed_price_pence: 36000, discount_pence: 0, channel_fee_pence: 0, postage_pence: 0, payment_type: "CARD", ticket_no: "B140330", sold_at: d(1, 13, 5), voided_at: null, corrected_at: null, original_amount_pence: null },
    { id: "s25", item_id: null, dealer_id: IDS.dealer, centre_id: IDS.centre, channel_id: IDS.ch_manual, external_order_id: "hist5", amount_pence: 22000, listed_price_pence: 22000, discount_pence: 0, channel_fee_pence: 0, postage_pence: 0, payment_type: "CARD", ticket_no: "B140328", sold_at: d(1, 14, 5), voided_at: null, corrected_at: null, original_amount_pence: null },
    { id: "s26", item_id: null, dealer_id: IDS.dealer, centre_id: IDS.centre, channel_id: IDS.ch_manual, external_order_id: "hist6", amount_pence: 48000, listed_price_pence: 48000, discount_pence: 0, channel_fee_pence: 0, postage_pence: 0, payment_type: "CARD", ticket_no: "B140325", sold_at: d(1, 15, 5), voided_at: null, corrected_at: null, original_amount_pence: null },
    { id: "s27", item_id: null, dealer_id: IDS.dealer, centre_id: IDS.centre, channel_id: IDS.ch_manual, external_order_id: "hist7", amount_pence: 15000, listed_price_pence: 15000, discount_pence: 0, channel_fee_pence: 0, postage_pence: 0, payment_type: "CASH", ticket_no: "B140322", sold_at: d(1, 16, 5), voided_at: null, corrected_at: null, original_amount_pence: null },
    { id: "s28", item_id: null, dealer_id: IDS.dealer, centre_id: null, channel_id: IDS.ch_shopify, external_order_id: "hist8", amount_pence: 26000, listed_price_pence: 26000, discount_pence: 0, channel_fee_pence: 0, postage_pence: 0, payment_type: "CARD", ticket_no: "B140318", sold_at: d(1, 17, 5), voided_at: null, corrected_at: null, original_amount_pence: null },
    { id: "s29", item_id: null, dealer_id: IDS.dealer, centre_id: IDS.centre, channel_id: IDS.ch_manual, external_order_id: "hist9", amount_pence: 14000, listed_price_pence: 14000, discount_pence: 0, channel_fee_pence: 0, postage_pence: 0, payment_type: "CARD", ticket_no: "B140315", sold_at: d(1, 18, 5), voided_at: null, corrected_at: null, original_amount_pence: null },
  ],
  till_attempts: [],
  centre_till_pins: [{ centre_id: IDS.centre, pin_hash: "49f4fac109d015150d1c755098642a70f2956ed629a3cdd7089a889bf658a9c2" }],
  printers: [
    { id: IDS.printer_centre, owner_type: "centre", owner_id: IDS.centre, centre_id: IDS.centre, name: "Till printer", provider: "printnode", provider_id: "7391", status: "ready", source: "centre" },
    { id: IDS.printer_own, owner_type: "dealer", owner_id: IDS.dealer, centre_id: null, name: "Brother QL at home", provider: "browser", provider_id: null, status: "ready", source: "own" },
  ],
  print_jobs: [
    { id: "p1", item_id: "i01", dealer_id: IDS.dealer, printer_id: IDS.printer_centre, status: "printed", created_at: d(3), updated_at: d(3) },
    { id: "p2", item_id: "i02", dealer_id: IDS.dealer, printer_id: null, status: "not_printed", created_at: d(12), updated_at: d(12) },
    { id: "p3", item_id: "i03", dealer_id: IDS.dealer, printer_id: IDS.printer_centre, status: "printed", created_at: d(41), updated_at: d(41) },
    { id: "p4", item_id: "i04", dealer_id: IDS.dealer, printer_id: null, status: "not_printed", created_at: d(67), updated_at: d(67) },
    { id: "p5", item_id: "i05", dealer_id: IDS.dealer, printer_id: IDS.printer_own, status: "ready", created_at: d(94), updated_at: d(2) },
    { id: "p6", item_id: "i06", dealer_id: IDS.dealer, printer_id: IDS.printer_centre, status: "printed", created_at: d(128), updated_at: d(128) },
  ],
  statements: [
    { id: "st1", dealer_id: IDS.dealer, centre_id: IDS.centre, period: periodOf(-1), gross_pence: 241000, commission_pence: 24100, rent_pence: 39000, net_pence: 177900, status: "paid", paid_at: d(3), pdf_path: null },
    { id: "st2", dealer_id: IDS.dealer, centre_id: IDS.centre, period: periodOf(-2), gross_pence: 198500, commission_pence: 19850, rent_pence: 39000, net_pence: 139650, status: "paid", paid_at: d(33), pdf_path: null },
  ],
  centre_commissions: [
    { id: "cc1", centre_id: IDS.centre, period: periodOf(-1), online_gross_pence: 86500, platform_bps: 1500, centre_bps: 500, platform_pence: 12975, vat_pence: 2595, centre_pence: 4325, stripe_invoice_item_id: "ii_demo", charged_at: d(1) },
  ],
  sku_counters: [{ dealer_id: IDS.dealer, next_number: 373 }],
  webhook_log: [
    { source: "shopify", event_type: "orders/create", status: "processed", received_at: d(1, 16, 40), error: null },
    { source: "stripe", event_type: "customer.subscription.updated", status: "processed", received_at: d(2, 8, 0), error: null },
    { source: "shopify", event_type: "products/update", status: "error", received_at: d(2, 9, 10), error: "shopify gql: product not found" },
  ],
  jobs: [{ id: "j1", type: "sync_item_to_channel", status: "failed", attempts: 2, last_error: "shopify gql: 429 throttled", updated_at: d(0, 9, 0) }],
  files: [],
};
T.channels_public = T.channels;
T.items_centre_view = T.items.map(({ cost_pence: _c, ...rest }) => rest);
void monthDay;

/* ---------- a tiny query builder over the fixtures ---------- */
type Row = Record<string, unknown>;
type Filter = (r: Row) => boolean;

const FK: Record<string, string> = { items: "item_id", dealers: "dealer_id", centres: "centre_id", channels: "channel_id", printers: "printer_id", users: "user_id" };
type Rel = { alias: string; table: string; fk: string | null; children: Rel[] };
/** Parse "a, b, rel:fk(x, y, nested(z))" into a tree of embeds. */
const parseSelect = (sel: string): Rel[] => {
  const rels: Rel[] = [];
  let i = 0;
  while (i < sel.length) {
    const m = /([a-z_]+)(?::([a-z_]+))?\(/y; m.lastIndex = i;
    const hit = m.exec(sel);
    if (!hit) { i++; continue; }
    let depth = 1, j = m.lastIndex;
    while (j < sel.length && depth > 0) { if (sel[j] === "(") depth++; else if (sel[j] === ")") depth--; j++; }
    const inner = sel.slice(m.lastIndex, j - 1);
    rels.push({ alias: hit[1], table: hit[1], fk: hit[2] ?? null, children: parseSelect(inner) });
    i = j;
  }
  return rels;
};

class Q implements PromiseLike<{ data: unknown; error: null; count: number | null }> {
  private filters: Filter[] = [];
  private orderBy: { col: string; asc: boolean } | null = null;
  private lim: number | null = null;
  private mode: "many" | "single" | "maybe" = "many";
  private rels: Rel[] = [];
  private head = false;
  constructor(private table: string) {}
  select(sel = "*", opts?: { count?: string; head?: boolean }) { this.rels = parseSelect(sel); this.head = !!opts?.head; return this; }
  eq(c: string, v: unknown) { this.filters.push((r) => r[c] === v); return this; }
  neq(c: string, v: unknown) { this.filters.push((r) => r[c] !== v); return this; }
  in(c: string, vs: unknown[]) { this.filters.push((r) => vs.includes(r[c])); return this; }
  is(c: string, v: unknown) { this.filters.push((r) => (v === null ? r[c] === null || r[c] === undefined : r[c] === v)); return this; }
  not(c: string, op: string, v: unknown) { this.filters.push((r) => !(op === "is" && v === null ? r[c] == null : r[c] === v)); return this; }
  gte(c: string, v: unknown) { this.filters.push((r) => String(r[c]) >= String(v)); return this; }
  lte(c: string, v: unknown) { this.filters.push((r) => String(r[c]) <= String(v)); return this; }
  lt(c: string, v: unknown) { this.filters.push((r) => String(r[c]) < String(v)); return this; }
  or(expr: string) {
    const parts = expr.split(",");
    this.filters.push((r) => parts.some((p) => {
      const [c, op, ...rest] = p.split("."); const v = rest.join(".");
      if (op === "is") return v === "null" ? r[c] == null : String(r[c]) === v;
      if (op === "gte") return String(r[c] ?? "") >= v;
      if (op === "lt") return String(r[c] ?? "") < v;
      if (op === "eq") return String(r[c]) === v;
      return String(r[c] ?? "").toLowerCase().includes(v.replace(/%/g, "").toLowerCase());
    }));
    return this;
  }
  contains() { return this; }
  order(c: string, o?: { ascending?: boolean }) { this.orderBy = { col: c, asc: o?.ascending ?? true }; return this; }
  limit(n: number) { this.lim = n; return this; }
  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  // writes are no ops in demo mode
  insert() { return this; } update() { return this; } upsert() { return this; } delete() { return this; }
  private embed(r: Row, rels: Rel[] = this.rels, table: string = this.table): Row {
    const out = { ...r };
    for (const rel of rels) {
      const target = T[rel.table] ?? T[rel.alias];
      if (!target) continue;
      const fk = rel.fk ?? FK[rel.table];
      if (fk && r[fk] !== undefined) {
        const hit = target.find((x) => x.id === r[fk]);
        out[rel.alias] = hit ? this.embed(hit, rel.children, rel.table) : null;
      } else {
        const back = FK[table];
        out[rel.alias] = back ? target.filter((x) => x[back] === r.id).map((x) => this.embed(x, rel.children, rel.table)) : [];
      }
    }
    return out;
  }
  private run() {
    let rows = (T[this.table] ?? []).filter((r) => this.filters.every((f) => f(r)));
    if (this.orderBy) { const { col, asc } = this.orderBy; rows = [...rows].sort((a, b) => (String(a[col] ?? "") < String(b[col] ?? "") ? -1 : 1) * (asc ? 1 : -1)); }
    if (this.lim) rows = rows.slice(0, this.lim);
    const count = rows.length;
    if (this.head) return { data: null, error: null, count };
    const data = rows.map((r) => this.embed(r));
    if (this.mode === "single" || this.mode === "maybe") return { data: data[0] ?? null, error: null, count };
    return { data, error: null, count };
  }
  then<R1 = unknown, R2 = never>(res?: ((v: { data: unknown; error: null; count: number | null }) => R1 | PromiseLike<R1>) | null, rej?: ((e: unknown) => R2 | PromiseLike<R2>) | null) { return Promise.resolve(this.run()).then(res, rej); }
}

const rpc = async (fn: string, args: Record<string, unknown>) => {
  if (fn === "dealer_summary") return { data: { today: 4200, week: 18200, month: 284000, last_month_to_date: 241000, items_sold_month: 14, items_live: 61 }, error: null };
  if (fn === "centre_dealer_table") return { data: [
    { dealer_id: IDS.dealer, name: "Bloom Antiques", code: "B14", pitch_numbers: ["12", "14", "15"], rent_pence: 39000, sales_month_pence: 284000, items_live: 61, last_sale_at: d(0) },
    { dealer_id: IDS.dealer2, name: "J Harrison", code: "JH", pitch_numbers: ["3"], rent_pence: 13000, sales_month_pence: 91500, items_live: 38, last_sale_at: d(2) },
    { dealer_id: "x1", name: "Anna Pell", code: "AP", pitch_numbers: ["21"], rent_pence: 11000, sales_month_pence: 9800, items_live: 22, last_sale_at: d(34) },
    { dealer_id: "x2", name: "R & M Collectables", code: "RM", pitch_numbers: ["7", "8"], rent_pence: 26000, sales_month_pence: 0, items_live: 44, last_sale_at: null },
  ], error: null };
  if (fn === "next_sku") return { data: "B140373", error: null };
  void args;
  return { data: null, error: null };
};

export async function demoRole(): Promise<"dealer" | "centre" | "admin"> {
  const c = (await cookies()).get("demo_role")?.value;
  return c === "centre" || c === "admin" ? c : "dealer";
}

export async function demoClient() {
  const role = await demoRole();
  const user = T.users.find((u) => (role === "dealer" ? u.id === IDS.user_dealer : role === "centre" ? u.id === IDS.user_centre : u.id === IDS.user_admin))!;
  return {
    from: (table: string) => new Q(table),
    rpc,
    auth: { getUser: async () => ({ data: { user: { id: user.id, email: user.email } }, error: null }), signOut: async () => ({ error: null }) },
    storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: "" } }), createSignedUrl: async () => ({ data: null }) }) },
  };
}

/** Admin client without cookies, for API routes and layouts in demo mode. */
export function demoSyncClient() {
  const user = T.users[0];
  return {
    from: (table: string) => new Q(table),
    rpc,
    auth: { getUser: async () => ({ data: { user: { id: user.id, email: user.email } }, error: null }), signOut: async () => ({ error: null }) },
    storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: "" } }), createSignedUrl: async () => ({ data: null }) }) },
  };
}

export const isDemo = () => process.env.DEMO_MODE === "1";
