import { notFound } from "next/navigation";
import { requireDealer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { ChannelPill, DaysBand, DealerNav, Page, Rule, Sku, money } from "@/components/ui";
import { ItemActions } from "./actions";


export default async function ItemDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireDealer();
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: item } = await sb
    .from("items")
    .select("*, centres(name), item_listings(status, last_error, synced_at, channels:channel_id(type, owner_type)), sales(amount_pence, sold_at, channels:channel_id(type))")
    .eq("id", id)
    .eq("dealer_id", me.dealer_id)
    .maybeSingle();
  if (!item) notFound();

  const listings = item.item_listings as unknown as { status: string; last_error: string | null; channels: { type: string; owner_type: string } | null }[];
  const sale = (item.sales as unknown as { amount_pence: number; sold_at: string; channels: { type: string } | null }[])[0];
  const photos = item.photos as { url?: string }[];

  return (
    <Page title={item.title}>
      <div className="grid grid-cols-3 gap-1">
        {photos.map((p, i) => p.url && <img key={i} src={p.url} alt="" className="aspect-square w-full rounded-[2px] object-cover" />)}
      </div>
      <div className="mt-5 flex items-baseline justify-between">
        <div className="sku text-3xl font-medium">{<Sku sku={item.sku} />}</div>
        <div className="num text-2xl font-medium">{money(item.price_pence)}</div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-ink-2">
        {item.status === "sold" ? <ChannelPill kind="sold" /> : <DaysBand listedAt={item.listed_at} />}
        {item.centres && <span>{(item.centres as unknown as { name: string }).name}</span>}
        <span>Listed {new Date(item.listed_at).toLocaleDateString("en-GB")}</span>
      </div>
      {item.description && <p className="mt-4 text-sm text-ink-2">{item.description}</p>}

      <h2 className="mt-8 mb-2 text-sm font-medium">Channels</h2>
      <Rule />
      <ul>
        {listings.length === 0 && <li className="py-3 text-sm text-ink-2">Not on any channel yet.</li>}
        {listings.map((l, i) => (
          <li key={i} className="flex items-center justify-between border-b border-rule py-3 text-sm">
            <span>{l.channels?.type === "shopify" ? "Shopify" : l.channels?.owner_type === "centre" ? "Centre till" : "Own till"}</span>
            <span className={l.status === "failed" ? "text-oxblood" : l.status === "pending" ? "text-brass" : "text-ink-2"}>
              {l.status === "live" ? "Live" : l.status === "closed" ? "Closed" : l.status === "failed" ? `Failed: ${l.last_error?.slice(0, 60)}` : "Syncing…"}
            </span>
          </li>
        ))}
      </ul>

      {sale && (
        <>
          <h2 className="mt-8 mb-2 text-sm font-medium">Sale</h2>
          <Rule />
          <div className="flex items-center justify-between py-3 text-sm">
            <span>{new Date(sale.sold_at).toLocaleString("en-GB")} <ChannelPill kind={sale.channels?.type === "shopify" ? "online" : "floor"} /></span>
            <span className="num font-medium">{money(sale.amount_pence)}</span>
          </div>
        </>
      )}

      <ItemActions id={item.id} status={item.status} price={item.price_pence} />
      <DealerNav active="/app/stock" />
    </Page>
  );
}
