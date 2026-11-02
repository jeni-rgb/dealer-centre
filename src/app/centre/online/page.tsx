import { redirect } from "next/navigation";
import { currentCentre } from "@/lib/centre";
import { supabaseServer } from "@/lib/supabase/server";
import { Kpi, Pill, money } from "@/components/ui";
import { listOnlineOrders, STATUS_LABEL } from "@/lib/fulfilment/orders";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Centre online shop: what sold online, what needs picking, and the centre's share. */
export default async function CentreOnline({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const { centre: cp } = await searchParams;
  const centre = await currentCentre(cp);
  if (!centre) redirect("/signup/centre");
  const sb = await supabaseServer();
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const orders = await listOnlineOrders(supabaseAdmin(), { centreId: centre.id });
  const online = orders.filter((o) => o.sold_at >= monthStart.toISOString());
  const gross = online.reduce((a, s) => a + s.amount_pence, 0);
  const share = Math.round((gross * centre.centre_online_share_bps) / 10000);
  const platformBps = centre.online_commission_bps - centre.centre_online_share_bps;
  const platform = Math.round((gross * platformBps) / 10000);
  const live = orders.filter((o) => o.status === "new");
  // last closed month, as worked out and charged at month end
  const lastPeriod = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const lastKey = `${lastPeriod.getFullYear()}-${String(lastPeriod.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: lastCommission } = await sb.from("centre_commissions").select("online_gross_pence, platform_pence, vat_pence, centre_pence, charged_at, stripe_invoice_item_id").eq("centre_id", centre.id).eq("period", lastKey).maybeSingle();

  return (
    <>
      <div className="mb-6"><h1 className="text-[24px] font-semibold">Online shop</h1><p className="text-[13px] text-ink-muted">Sales through {centre.name}'s online shop. Our runner collects every other day, then packs and posts each one. Leave sold items where they are, or to one side. Dealers get paid on their statement.</p></div>
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <Kpi label="Online sales this month" value={money(gross)} />
        <Kpi label={`Dealer Centre ${platformBps / 100}%`} value={money(platform)} sub="Charged on your next invoice, + VAT" />
        <Kpi label={`Your centre ${centre.centre_online_share_bps / 100}%`} value={money(share)} sub="Stays with you" />
        <Kpi label="Awaiting collection" value={String(live.length)} sub="Our runner collects every other day" tone={live.length ? "warning" : undefined} />
      </div>
      <p className="mb-8 text-[13px] text-ink-muted">
        {`Online commission is ${centre.online_commission_bps / 100}% of each online sale: ${platformBps / 100}% to Dealer Centre, ${centre.centre_online_share_bps / 100}% to your centre; the dealer gets the rest on their statement. `}
        {lastCommission
          ? `${lastPeriod.toLocaleDateString("en-GB", { month: "long" })}: online sales ${money(lastCommission.online_gross_pence)}, Dealer Centre ${platformBps / 100}% ${money(lastCommission.platform_pence)} (+ VAT ${money(lastCommission.vat_pence)}), your centre ${centre.centre_online_share_bps / 100}% ${money(lastCommission.centre_pence)}, ${lastCommission.stripe_invoice_item_id ? "charged on your next invoice" : "nothing to charge"}.`
          : `${lastPeriod.toLocaleDateString("en-GB", { month: "long" })}: worked out on the 1st and added to your next £299 invoice.`}
      </p>
      <div className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4"><h2 className="text-[16px] font-semibold">Online orders and where they are</h2></div>
        {orders.length === 0 && <p className="px-5 py-8 text-center text-[14px] text-ink-muted">No online sales yet.</p>}
        {orders.slice(0, 40).map((o) => (
          <div key={o.sale_id} className="flex items-center gap-4 border-b border-border px-5 py-3 last:border-0">
            <div className="flex flex-1 flex-col"><span className="text-[14px] font-medium">{o.title}</span><span className="text-[12px] text-ink-muted">{o.dealer} · <span className="ticket">{o.dealer_code}</span>{o.pitches.length ? ` · pitch ${o.pitches.join(", ")}` : ""} · ticket {o.ticket ?? "–"}</span></div>
            <Pill kind={o.status === "new" ? "warning" : o.status === "despatched" ? "success" : o.status === "missing" || o.status === "refunded" ? "danger" : "neutral"}>{o.status === "new" ? "Leave on shelf" : o.status === "missing" ? "Not found, please look" : STATUS_LABEL[o.status]}</Pill>
            <span className="w-24 text-right text-[12px] text-ink-muted">{new Date(o.sold_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            <span className="num w-20 text-right text-[14px] font-semibold">{money(o.amount_pence)}</span>
          </div>
        ))}
      </div>
    </>
  );
}
