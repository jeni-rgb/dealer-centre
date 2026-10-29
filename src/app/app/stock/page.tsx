import Link from "next/link";
import { requireDealer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { DealerNav, Empty, Page } from "@/components/ui";
import { StockActions } from "./actions";


export default async function Stock({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const me = await requireDealer();
  const { f } = await searchParams;
  const sb = await supabaseServer();
  let q = sb
    .from("items")
    .select("id, sku, title, price_pence, listed_at, status, centre_id, photos, item_listings(status, channels:channel_id(type))")
    .eq("dealer_id", me.dealer_id)
    .order("listed_at", { ascending: false });
  q = f === "sold" ? q.eq("status", "sold") : q.eq("status", "live");
  const { data: items } = await q.limit(500);

  const filters = [
    ["", "Live"],
    ["sold", "Sold"],
  ];

  return (
    <Page
      title="Stock"
      action={
        <div className="flex gap-3 text-xs">
          {filters.map(([k, l]) => (
            <Link key={k} href={k ? `/app/stock?f=${k}` : "/app/stock"} className={(f ?? "") === k ? "text-ink font-medium underline" : "text-ink-3"}>
              {l}
            </Link>
          ))}
        </div>
      }
    >
      {(items ?? []).length === 0 ? (
        <Empty text="No stock listed yet." href="/app/items/new" cta="List your first item" />
      ) : (
        <StockActions
          items={(items ?? []).map((i) => {
            const online = (i.item_listings as unknown as { status: string; channels: { type: string } | null }[]).some((l) => l.channels?.type === "shopify" && l.status === "live");
            const floor = (i.item_listings as unknown as { status: string; channels: { type: string } | null }[]).some((l) => l.channels?.type === "square" && l.status === "live") || !!i.centre_id;
            return { id: i.id, sku: i.sku, title: i.title, price_pence: i.price_pence, listed_at: i.listed_at, status: i.status, online, floor, photo: (i.photos as { url?: string }[])[0]?.url ?? null };
          })}
        />
      )}
      <DealerNav active="/app/stock" />
    </Page>
  );
}

