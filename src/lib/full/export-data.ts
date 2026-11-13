import type { Admin } from "@/lib/supabase/server";

export type FeedKind = "sales" | "stock";

export async function feedRows(db: Admin, dealerId: string, kind: FeedKind, from?: string, to?: string) {
  if (kind === "stock") {
    const { data } = await db.from("items").select("sku, title, price_pence, status, listed_at, centres(name)").eq("dealer_id", dealerId).in("status", ["live", "sold"]).order("listed_at", { ascending: false }).limit(2000);
    return (data ?? []).map((i) => ({
      ticket: i.sku,
      name: i.title,
      price_pence: i.price_pence,
      status: i.status,
      listed_at: i.listed_at,
      centre: (i.centres as unknown as { name: string } | null)?.name ?? "",
    }));
  }
  let q = db.from("sales").select("sold_at, amount_pence, payment_type, ticket_no, items(title), centres(name)").eq("dealer_id", dealerId).is("voided_at", null).order("sold_at", { ascending: false }).limit(5000);
  if (from) q = q.gte("sold_at", from);
  if (to) q = q.lt("sold_at", to);
  const { data } = await q;
  return (data ?? []).map((s) => ({
    sold_at: s.sold_at,
    ticket: s.ticket_no ?? "",
    name: (s.items as unknown as { title: string } | null)?.title ?? "",
    amount_pence: s.amount_pence,
    payment: s.payment_type ?? "",
    centre: (s.centres as unknown as { name: string } | null)?.name ?? "",
  }));
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}
