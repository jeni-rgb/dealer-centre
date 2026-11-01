import Link from "next/link";
import { requireDealer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { ChannelLabel, DealerNav, Icon, Phone, money, when } from "@/components/ui";
import { displaySku } from "@/lib/sku";

export default async function Today() {
  const me = await requireDealer();
  const sb = await supabaseServer();
  const [{ data: summary }, { data: recent }, { data: dealer }, { data: centres }, { data: toPrint }, { data: old }] = await Promise.all([
    sb.rpc("dealer_summary", { p_dealer_id: me.dealer_id }),
    sb.from("sales").select("id, amount_pence, sold_at, ticket_no, item_id, items(title, photos), channels:channel_id(type, owner_type)").eq("dealer_id", me.dealer_id).is("voided_at", null).order("sold_at", { ascending: false }).limit(3),
    sb.from("dealers").select("name, code, plan, trial_ends_at, monthly_sold_limit").eq("id", me.dealer_id).single(),
    sb.from("dealer_centres").select("status, centres(name), centre_id").eq("dealer_id", me.dealer_id).is("left_at", null),
    sb.from("print_jobs").select("id", { count: "exact", head: true }).eq("dealer_id", me.dealer_id).in("status", ["not_printed", "ready"]),
    sb.from("items").select("id", { count: "exact", head: true }).eq("dealer_id", me.dealer_id).eq("status", "live").lte("listed_at", new Date(Date.now() - 90 * 86400000).toISOString()),
  ]);
  const s = (summary ?? {}) as Record<string, number>;
  const delta = (s.month ?? 0) - (s.last_month_to_date ?? 0);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = me.email.split("@")[0].split(".")[0];
  const centreName = (centres ?? []).map((c) => (c.centres as unknown as { name: string })?.name).filter(Boolean)[0];
  const printCount = toPrint?.length ?? (toPrint as unknown as { count?: number })?.count ?? 0;
  const oldCount = old?.length ?? (old as unknown as { count?: number })?.count ?? 0;
  const pending = (centres ?? []).filter((c) => c.status !== "active");

  return (
    <Phone>
      <header className="header-dark flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] text-header-muted">{dealer?.name} · {dealer?.code}{centreName ? ` · ${centreName}` : ""}</span>
            <span className="text-[20px] font-semibold capitalize">{greeting}, {firstName}</span>
          </div>
          <Link href="/app/settings" aria-label="Settings" className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/15 bg-white/10">{Icon.settings}</Link>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-header-muted">Sales this month</span>
          <div className="flex items-baseline gap-3">
            <span className="num text-[44px] font-bold leading-[48px] tracking-[-0.03em]">{money(s.month ?? 0)}</span>
            {s.last_month_to_date > 0 && (
              <span className={`inline-flex h-6 items-center gap-1 rounded-[8px] px-2 text-[12px] font-semibold ${delta >= 0 ? "bg-[rgba(52,211,153,0.16)] text-header-green" : "bg-white/10 text-header-muted"}`}>
                {delta >= 0 && Icon.up}{money(Math.abs(delta))} vs last month
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[["Today", money(s.today ?? 0)], ["Week", money(s.week ?? 0)], ["Sold", String(s.items_sold_month ?? 0)], ["Live", String(s.items_live ?? 0)]].map(([l, v]) => (
            <div key={l} className="header-stat"><span className="num text-[16px] font-semibold leading-5">{v}</span><span className="text-[11px] text-header-muted">{l}</span></div>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-4 px-5 pt-5">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/app/items/new" className="btn !h-12 !text-[14px]">{Icon.plus} List item</Link>
          <Link href="/app/labels" className="btn-secondary !h-12 !gap-1.5 !px-2 !text-[14px]">{Icon.printer} Labels{printCount > 0 && <span className="pill pill-warning !h-5 !rounded-full whitespace-nowrap !px-1.5 !text-[11px]">{printCount} to print</span>}</Link>
        </div>

        {dealer && dealer.monthly_sold_limit < 100000 && (s.items_sold_month ?? 0) >= dealer.monthly_sold_limit && (
          <Link href="/api/billing/portal" className="card flex items-center justify-between border-accent p-4 text-[14px]"><span><span className="block font-medium">Good month: {s.items_sold_month} sold</span><span className="text-[12px] text-ink-muted">That is past the {dealer.monthly_sold_limit} on your plan. Nothing stops, but please move up a tier.</span></span><span className="text-[13px] font-medium text-accent">Upgrade</span></Link>
        )}
        {dealer?.plan === "trial" && dealer.trial_ends_at && (
          <p className="text-[12px] text-ink-muted">Trial ends {new Date(dealer.trial_ends_at).toLocaleDateString("en-GB")}. <Link className="text-accent" href="/api/billing/portal">Manage plan</Link></p>
        )}
        {pending.map((c) => (
          <div key={c.centre_id} className="rounded-[14px] border border-[#FDE68A] bg-warning-soft px-3.5 py-3 text-[13px] text-warning">
            Waiting for {(c.centres as unknown as { name: string })?.name} to approve you. Floor sales appear once they do.
          </div>
        ))}

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between py-1 pb-2">
            <h2 className="text-[16px] font-semibold">Recent sales</h2>
            <Link href="/app/stock?f=sold" className="text-[13px] font-medium text-accent">View all</Link>
          </div>
          {(recent ?? []).length === 0 && <p className="card p-4 text-[14px] text-ink-muted">Nothing sold yet. It will show here the moment it does.</p>}
          {(recent ?? []).map((r) => {
            const ch = r.channels as unknown as { type: string; owner_type: string } | null;
            const item = r.items as unknown as { title: string; photos: { url?: string }[] } | null;
            return (
              <Link key={r.id} href={r.item_id ? `/app/items/${r.item_id}` : "/app/stock?f=sold"} className="row">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-surface-2">{item?.photos?.[0]?.url && <img src={item.photos[0].url} alt="" className="h-full w-full object-cover" />}</div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[14px] font-medium">{item?.title ?? (r.ticket_no ? "Till sale" : "Unmatched sale")}</span>
                  <span className="text-[12px] text-ink-muted">{r.ticket_no ? displaySku(r.ticket_no) : "No ticket"} · <ChannelLabel type={ch?.type} ownerType={ch?.owner_type} /> · {when(r.sold_at)}</span>
                </div>
                <span className="num text-[15px] font-semibold">{money(r.amount_pence)}</span>
              </Link>
            );
          })}
        </div>

        {oldCount > 0 && (
          <Link href="/app/stock?f=old" className="flex items-center justify-between gap-3 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-3 text-[13px] text-[#991B1B]">
            <span><strong className="font-semibold">{oldCount} item{oldCount > 1 ? "s" : ""}</strong> over 90 days on the floor</span>
            <span className="font-semibold">Review</span>
          </Link>
        )}
      </div>
      <DealerNav active="today" />
    </Phone>
  );
}

