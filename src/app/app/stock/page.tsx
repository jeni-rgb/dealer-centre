import { requireDealer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { DealerNav, Empty, Screen } from "@/components/ui";
import { StockList } from "./list";

export default async function Stock({ searchParams }: { searchParams: Promise<{ f?: string; month?: string }> }) {
  const me = await requireDealer();
  const { f, month } = await searchParams;
  const mode = f === "sold" ? "sold" : "live";
  const sb = await supabaseServer();

  let q = sb
    .from("items")
    .select("id, sku, title, price_pence, listed_price_pence, listed_at, sold_at, status, centre_id, photos, item_listings(status, channels:channel_id(type, owner_type)), print_jobs(status), sales(amount_pence, channels:channel_id(type, owner_type))")
    .eq("dealer_id", me.dealer_id)
    .eq("status", mode);
  q = mode === "sold" ? q.order("sold_at", { ascending: false }) : q.order("listed_at", { ascending: false });
  if (f === "old") q = q.lte("listed_at", new Date(Date.now() - 90 * 86400000).toISOString());
  if (mode === "sold" && month) {
    const start = new Date(`${month}-01T00:00:00Z`);
    const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
    q = q.gte("sold_at", start.toISOString()).lt("sold_at", end.toISOString());
  }
  const { data: items } = await q.limit(500);

  const rows = (items ?? []).map((i) => {
    const listings = i.item_listings as unknown as { status: string; channels: { type: string; owner_type: string } | null }[];
    const live = (t: string, o?: string) => listings.some((l) => l.channels?.type === t && (!o || l.channels.owner_type === o) && l.status === "live");
    const pj = (i.print_jobs as unknown as { status: string }[])[0];
    const sale = (i.sales as unknown as { amount_pence: number; channels: { type: string; owner_type: string } | null }[])[0];
    return {
      id: i.id, sku: i.sku, title: i.title, price_pence: i.price_pence, listed_price_pence: i.listed_price_pence,
      listed_at: i.listed_at, sold_at: i.sold_at, status: i.status,
      floor: !!i.centre_id, ownShopify: live("shopify", "dealer"), centreShop: live("shopify", "centre"), ebay: live("ebay"),
      noLabel: !pj || pj.status === "not_printed",
      photo: (i.photos as { url?: string }[])[0]?.url ?? null,
      sold_amount: sale?.amount_pence ?? null, sold_channel: sale?.channels ?? null,
    };
  });

  return (
    <Screen title="Stock">
      <StockList rows={rows} mode={mode} filter={f ?? ""} />
      {rows.length === 0 && (mode === "live" ? <Empty text="No stock listed yet." href="/app/items/new" cta="List your first item" /> : <Empty text="Nothing sold yet." />)}
      <DealerNav active="stock" />
    </Screen>
  );
}
