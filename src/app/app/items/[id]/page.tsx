import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDealer } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ChannelLabel, DaysBand, DealerNav, Pill, Screen, Sku, money, when } from "@/components/ui";
import { ItemActions } from "./actions";
import { MarginCard } from "./margin";

export default async function ItemDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireDealer();
  const { id } = await params;
  // Server client: cost_pence is hidden from sessions, and the dealer_id filter keeps this to their own stock.
  const sb = supabaseAdmin();
  const { data: item } = await sb
    .from("items")
    .select("*, centres(name, commission_bps, online_commission_bps), item_listings(status, last_error, channels:channel_id(type, owner_type)), sales(id, amount_pence, listed_price_pence, payment_type, sold_at, corrected_at, original_amount_pence, channels:channel_id(type, owner_type)), print_jobs(status)")
    .eq("id", id).eq("dealer_id", me.dealer_id).maybeSingle();
  if (!item) notFound();

  const centre = item.centres as unknown as { name: string; commission_bps: number; online_commission_bps: number } | null;
  const listings = item.item_listings as unknown as { status: string; last_error: string | null; channels: { type: string; owner_type: string } | null }[];
  const sale = (item.sales as unknown as { id: string; amount_pence: number; listed_price_pence: number | null; payment_type: string | null; sold_at: string; corrected_at: string | null; original_amount_pence: number | null; channels: { type: string; owner_type: string } | null }[])[0];
  const photos = item.photos as { url?: string }[];
  const label = (item.print_jobs as unknown as { status: string }[])[0];

  return (
    <Screen title="Item" back={{ href: "/app/stock" }}>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">{photos.map((p, i) => p.url && <img key={i} src={p.url} alt="" className="aspect-square w-full rounded-[10px] object-cover" />)}</div>
      )}
      <div>
        <h2 className="text-[20px] font-semibold leading-6">{item.title}</h2>
        <div className="mt-2 flex items-center gap-2 text-[12px] text-ink-muted">
          <Sku sku={item.sku} tag />
          {item.status === "sold" ? <Pill kind="success">Sold</Pill> : item.status === "withdrawn" ? <Pill kind="neutral">Withdrawn</Pill> : <DaysBand listedAt={item.listed_at} />}
          {centre && <span>{centre.name}</span>}
        </div>
      </div>

      <div className="card flex items-center justify-between p-4">
        <div><div className="text-[12px] text-ink-muted">{item.status === "sold" ? "Sold for" : "Asking"}</div><div className="figure text-[34px] leading-9">{money(sale?.amount_pence ?? item.price_pence)}</div></div>
        {sale && sale.listed_price_pence !== null && sale.amount_pence !== sale.listed_price_pence && (
          <div className="text-right"><div className="text-[12px] text-ink-muted">Listed at</div><div className="num text-[16px] text-ink-muted line-through">{money(sale.listed_price_pence)}</div></div>
        )}
      </div>

      <MarginCard pricePence={sale?.amount_pence ?? item.price_pence} costPence={item.cost_pence} commissionBps={sale?.channels?.type && ["shopify", "ebay"].includes(sale.channels.type) && sale.channels.owner_type === "centre" ? (centre?.online_commission_bps ?? 2000) : (centre?.commission_bps ?? 0)} sold={item.status === "sold"} />

      <div>
        <h3 className="mb-2 text-[15px] font-semibold">Channels</h3>
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-[14px] border border-border">
          {item.centre_id && <div className="flex h-[52px] items-center justify-between px-4"><span className="text-[15px] font-medium">Floor, {centre?.name}</span>{item.status === "sold" ? <Pill kind="neutral">Closed</Pill> : <Pill kind="success">On the till</Pill>}</div>}
          {listings.filter((l) => l.channels?.type !== "square").map((l, i) => (
            <div key={i} className="flex h-[52px] items-center justify-between px-4">
              <span className="text-[15px] font-medium"><ChannelLabel type={l.channels?.type} ownerType={l.channels?.owner_type} /></span>
              {l.status === "live" ? <Pill kind="success">Live</Pill> : l.status === "closed" ? <Pill kind="neutral">Closed</Pill> : l.status === "failed" ? <Pill kind="danger">Failed</Pill> : <Pill kind="accent">Syncing</Pill>}
            </div>
          ))}
          <div className="flex h-[52px] items-center justify-between px-4"><span className="text-[15px] font-medium">Label</span>{!label || label.status === "not_printed" ? <Pill kind="warning">Not printed</Pill> : label.status === "printed" || label.status === "sent" ? <Pill kind="success">Printed</Pill> : <Pill kind="accent">Queued</Pill>}</div>
        </div>
        {listings.some((l) => l.status === "failed") && <p className="mt-2 text-[12px] text-danger">{listings.find((l) => l.status === "failed")?.last_error?.slice(0, 120)}</p>}
      </div>

      {sale && (
        <div>
          <h3 className="mb-2 text-[15px] font-semibold">History</h3>
          <div className="card flex flex-col divide-y divide-border text-[14px]">
            <div className="flex items-center justify-between p-4"><span>Sold, <ChannelLabel type={sale.channels?.type} ownerType={sale.channels?.owner_type} />{sale.payment_type && sale.payment_type !== "online" ? `, ${sale.payment_type.toLowerCase()}` : ""}</span><span className="text-ink-muted">{when(sale.sold_at)}</span></div>
            {sale.corrected_at && sale.original_amount_pence !== null && <div className="flex items-center justify-between p-4"><span>Price corrected from {money(sale.original_amount_pence)}</span><span className="text-ink-muted">{when(sale.corrected_at)}</span></div>}
          </div>
        </div>
      )}
      <div className="card flex items-center justify-between p-4 text-[14px]"><span>Listed</span><span className="text-ink-muted">{new Date(item.listed_at).toLocaleDateString("en-GB")}</span></div>

      <ItemActions id={item.id} status={item.status} price={item.price_pence} atCentre={!!item.centre_id} sale={sale ? { id: sale.id, amount_pence: sale.amount_pence, payment_type: sale.payment_type, sold_at: sale.sold_at } : null} />
      <Link href="/app/stock" className="btn-ghost">Back to stock</Link>
      <DealerNav active="stock" />
    </Screen>
  );
}
