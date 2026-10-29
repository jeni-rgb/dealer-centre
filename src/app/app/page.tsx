import Link from "next/link";
import { requireDealer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { ChannelPill, DealerNav, Hero, Page, Rule, Sku, Stat, money } from "@/components/ui";


export default async function Today() {
  const me = await requireDealer();
  const sb = await supabaseServer();
  const [{ data: summary }, { data: recent }, { data: dealer }, { data: centres }] = await Promise.all([
    sb.rpc("dealer_summary", { p_dealer_id: me.dealer_id }),
    sb.from("sales").select("id, amount_pence, sold_at, ticket_no, items(title), channels:channel_id(type, owner_type)").eq("dealer_id", me.dealer_id).is("voided_at", null).order("sold_at", { ascending: false }).limit(10),
    sb.from("dealers").select("name, code, plan, trial_ends_at").eq("id", me.dealer_id).single(),
    sb.from("dealer_centres").select("status, centres(name), centre_id").eq("dealer_id", me.dealer_id).is("left_at", null),
  ]);
  const s = (summary ?? {}) as Record<string, number>;
  const pace = s.last_month_to_date ? Math.round(((s.month - s.last_month_to_date) / s.last_month_to_date) * 100) : null;

  // Centre without a Square connection yet
  const unconnected = (centres ?? []).filter((c) => c.status !== "active");

  return (
    <Page title={dealer?.name ?? "Today"} action={<span className="sku text-sm text-ink-3">{dealer?.code}</span>}>
      <Hero
        label="Sales this month"
        value={money(s.month ?? 0)}
        sub={pace === null ? undefined : pace >= 0 ? `${pace}% ahead of last month at this point` : `${Math.abs(pace)}% behind last month at this point`}
      />
      <div className="mt-6 grid grid-cols-3 gap-4">
        <Stat label="Today" value={money(s.today ?? 0)} />
        <Stat label="This week" value={money(s.week ?? 0)} />
        <Stat label="Live" value={String(s.items_live ?? 0)} />
      </div>

      {dealer?.plan === "trial" && dealer.trial_ends_at && (
        <p className="mt-6 text-xs text-ink-2">Trial ends {new Date(dealer.trial_ends_at).toLocaleDateString("en-GB")}.</p>
      )}
      {unconnected.map((c) => (
        <p key={c.centre_id} className="mt-4 rounded-[4px] bg-brass-2 px-3 py-2 text-sm text-brass">
          Waiting for {(c.centres as unknown as { name: string })?.name} to approve you. Floor sales appear once they do.
        </p>
      ))}

      <div className="mt-8 mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-medium">Last sold</h2>
        <Link href="/app/stock" className="text-xs text-ink-3">Stock</Link>
      </div>
      <Rule />
      {(recent ?? []).length === 0 && <p className="py-6 text-sm text-ink-2">Nothing sold yet. List an item and it appears here when it goes.</p>}
      <ul>
        {(recent ?? []).map((r) => {
          const ch = r.channels as unknown as { type: string } | null;
          const item = r.items as unknown as { title: string } | null;
          return (
            <li key={r.id} className="flex items-center justify-between border-b border-rule py-3">
              <div className="min-w-0">
                <div className="truncate text-sm">{item?.title ?? (r.ticket_no ? "Till sale" : "Unmatched sale")}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-3">
                  {r.ticket_no && <Sku sku={r.ticket_no} />}
                  <span>{new Date(r.sold_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  <ChannelPill kind={ch?.type === "shopify" ? "online" : "floor"} />
                </div>
              </div>
              <div className="num text-base font-medium">{money(r.amount_pence)}</div>
            </li>
          );
        })}
      </ul>
      <DealerNav active="/app" />
    </Page>
  );
}
