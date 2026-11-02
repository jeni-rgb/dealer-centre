import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Kpi, money } from "@/components/ui";
import { listOnlineOrders } from "@/lib/fulfilment/orders";
import { OrdersDesk } from "./desk";

/** Shop manager's desk: every online order across every centre, where it is, and what to do next, in bulk. */
export default async function Orders({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const { centre } = await searchParams;
  const all = await listOnlineOrders(supabaseAdmin(), { centreId: centre || undefined });
  const centres = Array.from(new Map(all.map((o) => [o.centre_id, o.centre])).entries());
  const overdue = all.filter((o) => o.status === "new" && Date.now() - new Date(o.sold_at).getTime() > 2 * 86400000).length;
  const n = (s: string) => all.filter((o) => o.status === s).length;

  return (
    <>
      <div className="mb-5">
        <h1 className="text-[24px] font-semibold">Online orders</h1>
        <p className="text-[13px] text-ink-muted">Runner collects every other day against the run sheet. Packing slips at the unit. Postage and labels in Click &amp; Drop, which marks the order despatched here and emails the buyer.</p>
      </div>
      <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
        <Kpi label="To collect" value={String(n("new"))} sub={overdue ? `${overdue} waiting over 2 days` : "Next run"} tone={overdue ? "warning" : undefined} />
        <Kpi label="At the unit" value={String(n("collected") + n("at_unit"))} sub="Collected, not yet despatched" />
        <Kpi label="Despatched, 60 days" value={String(n("despatched"))} />
        <Kpi label="Missing" value={String(n("missing"))} tone={n("missing") ? "danger" : undefined} />
        <Kpi label="Online sales, 60 days" value={money(all.filter((o) => o.status !== "refunded").reduce((a, o) => a + o.amount_pence, 0))} />
      </div>
      {centres.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2 text-[13px]">
          <Link href="/admin/orders" className={`pill ${!centre ? "pill-accent" : "pill-neutral"}`}>All centres</Link>
          {centres.map(([id, name]) => <Link key={id} href={`/admin/orders?centre=${id}`} className={`pill ${centre === id ? "pill-accent" : "pill-neutral"}`}>{name}</Link>)}
        </div>
      )}
      <OrdersDesk orders={all} centreFilter={centre ?? null} />
    </>
  );
}
