import { redirect } from "next/navigation";
import { currentCentre } from "@/lib/centre";
import { supabaseServer } from "@/lib/supabase/server";
import { Kpi, Pill, money } from "@/components/ui";
import { displaySku } from "@/lib/sku";

/** Centre online shop: what sold online, what needs picking, and the centre's share. */
export default async function CentreOnline({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const { centre: cp } = await searchParams;
  const centre = await currentCentre(cp);
  if (!centre) redirect("/signup/centre");
  const sb = await supabaseServer();
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const { data: sales } = await sb
    .from("sales")
    .select("id, amount_pence, sold_at, ticket_no, postage_pence, item_id, dealers(name, code), items(title, photos), channels:channel_id(type, owner_type), dealer_centres:dealer_id(pitch_numbers)")
    .eq("centre_id", centre.id).is("voided_at", null).gte("sold_at", monthStart.toISOString()).order("sold_at", { ascending: false });
  const online = (sales ?? []).filter((s) => { const c = s.channels as unknown as { type: string; owner_type: string }; return !["square", "manual"].includes(c?.type) && c?.owner_type === "centre"; });
  const gross = online.reduce((a, s) => a + s.amount_pence, 0);
  const share = Math.round((gross * centre.centre_online_share_bps) / 10000);
  const platformBps = centre.online_commission_bps - centre.centre_online_share_bps;
  const platform = Math.round((gross * platformBps) / 10000);
  const live = online.filter((s) => Date.now() - new Date(s.sold_at).getTime() < 3 * 86400000);
  // last closed month, as worked out and charged at month end
  const lastPeriod = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const lastKey = `${lastPeriod.getFullYear()}-${String(lastPeriod.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: lastCommission } = await sb.from("centre_commissions").select("online_gross_pence, platform_pence, vat_pence, centre_pence, charged_at, stripe_invoice_item_id").eq("centre_id", centre.id).eq("period", lastKey).maybeSingle();

  return (
    <>
      <div className="mb-6"><h1 className="text-[24px] font-semibold">Online shop</h1><p className="text-[13px] text-ink-muted">Sales through {centre.name}'s online shop. You pick, pack and hand over; dealers get paid on their statement.</p></div>
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <Kpi label="Online sales this month" value={money(gross)} />
        <Kpi label={`Dealer Centre ${platformBps / 100}%`} value={money(platform)} sub="Charged on your next invoice, + VAT" />
        <Kpi label={`Your centre ${centre.centre_online_share_bps / 100}%`} value={money(share)} sub="Stays with you" />
        <Kpi label="To pick" value={String(live.length)} sub="Sold in the last 3 days" tone={live.length ? "warning" : undefined} />
      </div>
      <p className="mb-8 text-[13px] text-ink-muted">
        {`Online commission is ${centre.online_commission_bps / 100}% of each online sale: ${platformBps / 100}% to Dealer Centre, ${centre.centre_online_share_bps / 100}% to your centre; the dealer gets the rest on their statement. `}
        {lastCommission
          ? `${lastPeriod.toLocaleDateString("en-GB", { month: "long" })}: online sales ${money(lastCommission.online_gross_pence)}, Dealer Centre ${platformBps / 100}% ${money(lastCommission.platform_pence)} (+ VAT ${money(lastCommission.vat_pence)}), your centre ${centre.centre_online_share_bps / 100}% ${money(lastCommission.centre_pence)}, ${lastCommission.stripe_invoice_item_id ? "charged on your next invoice" : "nothing to charge"}.`
          : `${lastPeriod.toLocaleDateString("en-GB", { month: "long" })}: worked out on the 1st and added to your next £299 invoice.`}
      </p>
      <div className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4"><h2 className="text-[16px] font-semibold">Picking list</h2></div>
        {online.length === 0 && <p className="px-5 py-8 text-center text-[14px] text-ink-muted">No online sales yet this month.</p>}
        {online.map((s) => {
          const it = s.items as unknown as { title: string; photos: { url?: string }[] } | null;
          const d = s.dealers as unknown as { name: string; code: string } | null;
          const ch = s.channels as unknown as { type: string };
          return (
            <div key={s.id} className="flex items-center gap-4 border-b border-border px-5 py-3 last:border-0">
              <div className="h-12 w-12 overflow-hidden rounded-[10px] bg-surface-2">{it?.photos?.[0]?.url && <img src={it.photos[0].url} alt="" className="h-full w-full object-cover" />}</div>
              <div className="flex flex-1 flex-col"><span className="text-[14px] font-medium">{it?.title ?? "Item"}</span><span className="text-[12px] text-ink-muted">{d?.name} · <span className="ticket">{d?.code}</span> · ticket {s.ticket_no ? displaySku(s.ticket_no) : "–"}</span></div>
              <Pill kind="neutral">Shop</Pill>
              <span className="w-24 text-right text-[12px] text-ink-muted">{new Date(s.sold_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              <span className="num w-20 text-right text-[14px] font-semibold">{money(s.amount_pence)}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
