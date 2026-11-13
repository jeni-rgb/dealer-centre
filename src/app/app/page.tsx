import Link from "next/link";
import { Mark } from "@/components/logo";
import { NotificationsCard } from "@/components/notifications";
import { dealerWithListing } from "@/lib/billing/tokens";
import { namedSales } from "@/lib/billing/pricing";
import { PlanCompare } from "@/components/plan-compare";
import { sumBetween, weekRange } from "@/lib/full/weeks";
import { requireDealer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { ChannelLabel, DealerNav, Icon, Phone, money, when } from "@/components/ui";
import { displaySku } from "@/lib/sku";

export default async function Today() {
  const me = await requireDealer();
  const sb = await supabaseServer();
  const weeks = weekRange();
  const goalSelect = await dealerWithListing(sb, me.dealer_id, "name, code, plan, trial_ends_at, monthly_sold_limit");
  const goalRow = await sb.from("dealers").select("weekly_goal_pence").eq("id", me.dealer_id).maybeSingle();
  const links = await sb.from("dealer_centres").select("status, centres(name), centre_id").eq("dealer_id", me.dealer_id).is("left_at", null);
  const [{ data: summary }, { data: recent }, { data: weekSales }, { data: toPrint }, { data: old }] = await Promise.all([
    sb.rpc("dealer_summary", { p_dealer_id: me.dealer_id }),
    sb.from("sales").select("id, amount_pence, sold_at, ticket_no, item_id, items(title, photos), centres(name), channels:channel_id(type, owner_type)").eq("dealer_id", me.dealer_id).is("voided_at", null).order("sold_at", { ascending: false }).limit(3),
    sb.from("sales").select("amount_pence, sold_at").eq("dealer_id", me.dealer_id).is("voided_at", null).gte("sold_at", weeks.lastStart.toISOString()).lt("sold_at", weeks.nextStart.toISOString()),
    sb.from("print_jobs").select("id", { count: "exact", head: true }).eq("dealer_id", me.dealer_id).in("status", ["not_printed", "ready"]),
    sb.from("items").select("id", { count: "exact", head: true }).eq("dealer_id", me.dealer_id).eq("status", "live").lte("listed_at", new Date(Date.now() - 90 * 86400000).toISOString()),
  ]);
  const dealer = goalSelect;
  const centres = links.data;
  const s = (summary ?? {}) as Record<string, number>;
  const delta = (s.month ?? 0) - (s.last_month_to_date ?? 0);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = me.email.split("@")[0].split(".")[0];
  const centreName = (centres ?? []).map((c) => (c.centres as unknown as { name: string })?.name).filter(Boolean)[0];
  const printCount = toPrint?.length ?? (toPrint as unknown as { count?: number })?.count ?? 0;
  const oldCount = old?.length ?? (old as unknown as { count?: number })?.count ?? 0;
  const pending = (centres ?? []).filter((c) => c.status !== "active");
  const thisWeek = sumBetween(weekSales ?? [], weeks.thisStart, weeks.nextStart);
  const lastWeek = sumBetween(weekSales ?? [], weeks.lastStart, weeks.thisStart);
  const goalPence = goalRow.data?.weekly_goal_pence ?? 0;

  return (
    <Phone>
      <header className="header-dark flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 text-[12px] text-header-muted"><span className="tag tag-dark !h-6 !text-[11px]">{dealer?.code}</span>{dealer?.name}{centreName ? ` at ${centreName}` : ""}</span>
            <span className="text-[20px] font-semibold capitalize">{greeting}, {firstName}</span>
          </div>
          <Link href="/app/settings" aria-label="Account" className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/15 bg-white/10">{Icon.settings}</Link>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-header-muted">Sales this month</span>
          <div className="flex items-baseline gap-3">
            <span className="figure text-[52px] leading-[52px]">{money(s.month ?? 0)}</span>
            {s.last_month_to_date > 0 && (
              <span className={`inline-flex h-6 items-center gap-1 rounded-[8px] px-2 text-[12px] font-semibold ${delta >= 0 ? "bg-white/15 text-header-green" : "bg-white/10 text-header-muted"}`}>
                {delta >= 0 && Icon.up}{money(Math.abs(delta))} vs last month
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[["Today", money(s.today ?? 0)], ["Week", money(thisWeek)], ["Sold", String(s.items_sold_month ?? 0)], ["Live", String(s.items_live ?? 0)]].map(([l, v]) => (
            <div key={l} className="header-stat"><span className="figure text-[18px] leading-5">{v}</span><span className="text-[11px] text-header-muted">{l}</span></div>
          ))}
        </div>
        <Mark size={200} color="#FFFFFF" className="watermark" />
      </header>

      <div className="flex flex-col gap-4 px-5 pt-5">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/app/items/new" className="btn !h-12 !text-[14px]">{Icon.plus} List item</Link>
          <Link href="/app/labels" className="btn-secondary !h-12 !gap-1.5 !px-2 !text-[14px]">{Icon.printer} Labels{printCount > 0 && <span className="pill pill-warning !h-5 !rounded-full whitespace-nowrap !px-1.5 !text-[11px]">{printCount} to print</span>}</Link>
        </div>

        <NotificationsCard vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? null} />
        {dealer && namedSales(dealer) && (
          <Link href="/app/desk" className="card p-4">
            <div className="flex items-baseline justify-between"><span className="text-[13px] text-ink-muted">Since Monday</span><span className="text-[13px] text-ink-muted">Last week {money(lastWeek)}</span></div>
            <div className="mt-1 figure text-[32px] leading-none">{money(thisWeek)}</div>
            {goalPence > 0 && <p className="mt-2 text-[13px] text-ink-muted">{thisWeek >= goalPence ? `Goal ${money(goalPence)} met.` : `${money(goalPence - thisWeek)} to the ${money(goalPence)} goal.`}</p>}
          </Link>
        )}
        {dealer && !namedSales(dealer) && <PlanCompare join />}
        {pending.map((c) => (
          <div key={c.centre_id} className="rounded-[14px] border border-[#FDE68A] bg-warning-soft px-3.5 py-3 text-[13px] text-warning">
            Waiting for {(c.centres as unknown as { name: string })?.name} to approve you.
          </div>
        ))}

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between py-1 pb-2">
            <h2 className="text-[16px] font-semibold">Recent sales</h2>
            <Link href="/app/stock?f=sold" className="text-[13px] font-medium text-accent">View all</Link>
          </div>
          {(recent ?? []).length === 0 && <p className="card p-4 text-[14px] text-ink-muted">Nothing sold yet.</p>}
          {(recent ?? []).map((r) => {
            const ch = r.channels as unknown as { type: string; owner_type: string } | null;
            const item = r.items as unknown as { title: string; photos: { url?: string }[] } | null;
            const centre = (r.centres as unknown as { name: string } | null)?.name;
            const shop = ch?.type === "shopify";
            const place = shop && ch?.owner_type !== "centre" ? "Your Shopify" : shop ? "Centre shop" : centre ? `at ${centre}` : "No centre";
            const where = shop ? null : <ChannelLabel type={ch?.type} ownerType={ch?.owner_type} />;
            return (
              <Link key={r.id} href={r.item_id ? `/app/items/${r.item_id}` : "/app/stock?f=sold"} className="row">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-surface-2">{item?.photos?.[0]?.url && <img src={item.photos[0].url} alt="" className="h-full w-full object-cover" />}</div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[14px] font-medium">{dealer && !namedSales(dealer) ? "Sale" : (item?.title ?? (r.ticket_no ? "Till sale" : "Unmatched sale"))}</span>
                  <span className="text-[12px] text-ink-muted">{place}</span>
                  {dealer && namedSales(dealer) && r.ticket_no ? <span className="ticket text-[12px]">{displaySku(r.ticket_no)}</span> : null}
                  <span className="text-[12px] text-ink-muted">{where}{where ? ", " : ""}{when(r.sold_at)}</span>
                </div>
                <span className="num text-[15px] font-semibold">{money(r.amount_pence)}</span>
              </Link>
            );
          })}
        </div>

        {oldCount > 0 && (
          <Link href="/app/stock?f=old" className="flex items-center justify-between gap-3 rounded-[14px] border border-[#EBC9C1] bg-danger-soft px-3.5 py-3 text-[13px] text-danger">
            <span><strong className="font-semibold">{oldCount} item{oldCount > 1 ? "s" : ""}</strong> over 90 days on the floor</span>
            <span className="font-semibold">Review</span>
          </Link>
        )}
      </div>
      <DealerNav active="today" />
    </Phone>
  );
}

