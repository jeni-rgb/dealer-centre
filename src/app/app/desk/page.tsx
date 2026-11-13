import Link from "next/link";
import { requireDealer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { DealerNav, Screen, money } from "@/components/ui";
import { dealerWithListing } from "@/lib/billing/tokens";
import { namedSales } from "@/lib/billing/pricing";
import { PlanCompare } from "@/components/plan-compare";
import { groupName, rankSold } from "@/lib/full/insights";
import { DeskTools } from "./tools";

export const dynamic = "force-dynamic";

export default async function Desk() {
  const me = await requireDealer();
  const sb = await supabaseServer();
  const dealer = await dealerWithListing(sb, me.dealer_id, "name, plan, trial_ends_at");
  const full = !!dealer && namedSales(dealer);
  if (!full) {
    return (
      <Screen title="Your desk" back={{ href: "/app" }}>
        <PlanCompare join />
        <DealerNav active="today" />
      </Screen>
    );
  }
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const goal = await sb.from("dealers").select("weekly_goal_pence, export_token").eq("id", me.dealer_id).maybeSingle();
  const { data: links } = await sb.from("dealer_centres").select("centre_id, centres(name)").eq("dealer_id", me.dealer_id).is("left_at", null);
  const { data: sold } = await sb.from("sales").select("amount_pence, items(title, delivery)").eq("dealer_id", me.dealer_id).is("voided_at", null).gte("sold_at", since);
  const { data: slow } = await sb.from("items").select("id, title, sku, price_pence, listed_at, centres(name)").eq("dealer_id", me.dealer_id).eq("status", "live").lte("listed_at", since).order("listed_at").limit(12);
  const ranked = rankSold((sold ?? []).map((s) => {
    const item = s.items as unknown as { title: string; delivery: string } | null;
    return { title: item?.title ?? "Sale", group: groupName(item?.delivery), amountPence: s.amount_pence };
  }));
  const centres = (links ?? []).map((c) => ({
    id: c.centre_id,
    name: (c.centres as unknown as { name: string } | null)?.name ?? "Centre",
  }));

  return (
    <Screen title="Your desk" back={{ href: "/app" }}>
      <DeskTools
        centres={centres}
        goalPounds={(goal.data?.weekly_goal_pence ?? 0) / 100}
        exportToken={goal.error ? null : goal.data?.export_token ?? null}
      />
      <section className="flex flex-col gap-2">
        <h2 className="text-[16px] font-semibold">Best sellers, last 90 days</h2>
        {ranked.groups.length === 0 && <p className="card p-4 text-[14px] text-ink-muted">Nothing sold in the last 90 days.</p>}
        {ranked.groups.map((g) => (
          <div key={g.title} className="card flex items-center justify-between px-4 py-3 text-[14px]"><span className="font-medium">{g.title}</span><span className="text-ink-muted">{g.count} sold · {money(g.amountPence)}</span></div>
        ))}
        {ranked.items.slice(0, 5).map((item) => (
          <div key={item.title} className="flex items-center justify-between text-[14px]"><span className="truncate">{item.title}</span><span className="shrink-0 text-ink-muted">{item.count} · {money(item.amountPence)}</span></div>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-[16px] font-semibold">Slow stock</h2>
        {(slow ?? []).length === 0 && <p className="card p-4 text-[14px] text-ink-muted">Nothing has sat for 90 days.</p>}
        {(slow ?? []).map((item) => (
          <Link key={item.id} href={`/app/items/${item.id}`} className="card px-4 py-3">
            <div className="flex items-baseline justify-between gap-3"><span className="truncate font-medium">{item.title}</span><span className="shrink-0">{money(item.price_pence)}</span></div>
            <p className="mt-1 text-[13px] text-ink-muted">{(item.centres as unknown as { name: string } | null)?.name ?? "No centre"}. Still here after 90 days. Try a lower price.</p>
          </Link>
        ))}
      </section>
      <DealerNav active="today" />
    </Screen>
  );
}
