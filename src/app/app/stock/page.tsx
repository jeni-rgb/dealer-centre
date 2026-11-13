import Link from "next/link";
import { requireDealer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { DealerNav, Empty, Screen } from "@/components/ui";
import { StockList } from "./list";
import { StockSearch } from "./search";

// Build a PostgREST or() filter for a tolerant search on sku / title / description.
function searchFilter(raw: string): string | null {
  const q = raw.trim().toLowerCase().replace(/[^a-z0-9\s\-']/g, " ").replace(/\s+/g, " ").trim();
  if (!q) return null;
  const parts: string[] = [];
  const code = q.replace(/[\s\-]/g, "").match(/^([a-z]*)0*(\d+)$/);
  if (code) parts.push(`sku.imatch.^${code[1]}[a-z]*0*${code[2]}$`);
  const words = q.split(" ").filter(Boolean).map((w) => w.replace(/'/g, "_"));
  const ands = words.map((w) => `or(title.ilike.*${w}*,description.ilike.*${w}*,sku.ilike.*${w}*)`);
  parts.push(ands.length === 1 ? ands[0] : `and(${ands.join(",")})`);
  return parts.join(",");
}

export default async function Stock({ searchParams }: { searchParams: Promise<{ f?: string; month?: string; q?: string }> }) {
  const me = await requireDealer();
  const { f, month, q: search = "" } = await searchParams;
  const mode = f === "sold" ? "sold" : "live";
  const sb = await supabaseServer();

  let q = sb
    .from("items")
    .select("id, sku, title, price_pence, listed_price_pence, listed_at, sold_at, status, centre_id, qty, qty_start, centres(name), photos, item_listings(status, channels:channel_id(type, owner_type)), print_jobs(status), sales(amount_pence, channels:channel_id(type, owner_type))")
    .eq("dealer_id", me.dealer_id)
    .eq("status", mode);
  q = mode === "sold" ? q.order("sold_at", { ascending: false }) : q.order("listed_at", { ascending: false });
  if (f === "old") q = q.lte("listed_at", new Date(Date.now() - 90 * 86400000).toISOString());
  if (mode === "sold" && month) {
    const start = new Date(`${month}-01T00:00:00Z`);
    const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
    q = q.gte("sold_at", start.toISOString()).lt("sold_at", end.toISOString());
  }
  const sf = searchFilter(search);
  if (sf) q = q.or(sf);
  const { data: items } = await q.limit(500);

  const rows = (items ?? []).map((i) => {
    const listings = i.item_listings as unknown as { status: string; channels: { type: string; owner_type: string } | null }[];
    const live = (t: string, o?: string) => listings.some((l) => l.channels?.type === t && (!o || l.channels.owner_type === o) && l.status === "live");
    const pj = (i.print_jobs as unknown as { status: string }[])[0];
    const sale = (i.sales as unknown as { amount_pence: number; channels: { type: string; owner_type: string } | null }[])[0];
    return {
      id: i.id, sku: i.sku, title: i.title, price_pence: i.price_pence, listed_price_pence: i.listed_price_pence,
      listed_at: i.listed_at, sold_at: i.sold_at, status: i.status,
      floor: !!i.centre_id, ownShopify: live("shopify", "dealer"), centreShop: live("shopify", "centre"),
      noLabel: !pj || pj.status === "not_printed",
      photo: (i.photos as { url?: string }[])[0]?.url ?? null,
      sold_amount: sale?.amount_pence ?? null, sold_channel: sale?.channels ?? null,
      centre_name: (i.centres as unknown as { name: string } | null)?.name ?? null,
      qty: typeof i.qty === "number" ? i.qty : 1,
      qty_start: typeof i.qty_start === "number" ? i.qty_start : 1,
    };
  });

  return (
    <Screen title="Stock" right={<span className="flex gap-3"><Link href="/app/items/import" className="text-[13px] font-medium text-accent">Upload</Link><Link href="/app/stock-check" className="text-[13px] font-medium text-accent">Check</Link></span>}>
      <Link href="/app/items/invoice" className="text-[14px] font-medium text-accent">Add from an invoice</Link>
      <StockSearch initial={search} />
      <StockList rows={rows} mode={mode} filter={f ?? ""} />
      {rows.length === 0 && search.trim() ? <Empty text="No items match your search." /> : rows.length === 0 && (mode === "live" ? <Empty text="No stock listed yet." href="/app/items/new" cta="List your first item" /> : <Empty text="Nothing sold yet." />)}
      <DealerNav active="stock" />
    </Screen>
  );
}
