import { redirect } from "next/navigation";
import { currentCentre } from "@/lib/centre";
import { supabaseServer } from "@/lib/supabase/server";
import { Stat, money } from "@/components/ui";


export default async function CentreHome({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const { centre: cp } = await searchParams;
  const centre = await currentCentre(cp);
  if (!centre) redirect("/signup/centre");
  const sb = await supabaseServer();
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const [{ data: rows }, { data: sales }, { data: channel }, { data: pending }] = await Promise.all([
    sb.rpc("centre_dealer_table", { p_centre_id: centre.id }),
    sb.from("sales").select("amount_pence, payment_type, dealer_id").eq("centre_id", centre.id).is("voided_at", null).gte("sold_at", monthStart.toISOString()),
    sb.from("channels_public").select("id, status, last_webhook_at").eq("owner_type", "centre").eq("owner_id", centre.id).eq("type", "square").maybeSingle(),
    sb.from("dealer_centres").select("id").eq("centre_id", centre.id).eq("status", "pending"),
  ]);
  const total = (sales ?? []).reduce((a, s) => a + s.amount_pence, 0);
  const card = (sales ?? []).filter((s) => s.payment_type && s.payment_type !== "CASH").reduce((a, s) => a + s.amount_pence, 0);
  const unmatched = (sales ?? []).filter((s) => !s.dealer_id).length;
  const quiet = (rows ?? []).filter((r: { last_sale_at: string | null }) => !r.last_sale_at || Date.now() - new Date(r.last_sale_at).getTime() > 30 * 86400000).length;

  return (
    <>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-xl font-medium">{centre.name}</h1>
        <span className="text-xs text-ink-3">Centre code <span className="sku">{centre.invite_code}</span></span>
      </div>

      {!channel && (
        <div className="mb-6 flex items-center justify-between rounded-[4px] bg-brass-2 px-4 py-3 text-sm text-brass">
          <span>Square is not connected. Floor sales will not appear until it is.</span>
          <a className="underline" href={`/api/oauth/square?owner=centre&id=${centre.id}`}>Connect Square</a>
        </div>
      )}

      <div className="mb-8 grid grid-cols-5 gap-6">
        <Stat label="Month to date" value={money(total)} />
        <Stat label="Dealers" value={String((rows ?? []).length)} />
        <Stat label="Card share" value={total ? `${Math.round((card / total) * 100)}%` : "–"} />
        <Stat label="No sale in 30 days" value={String(quiet)} />
        <Stat label="Unmatched sales" value={String(unmatched)} />
      </div>

      {(pending ?? []).length > 0 && (
        <p className="mb-4 text-sm"><a className="underline" href="/centre/mapping">{(pending ?? []).length} dealer{(pending ?? []).length > 1 ? "s" : ""} waiting for approval</a></p>
      )}

      <table className="w-full text-sm">
        <thead className="text-left text-xs text-ink-3">
          <tr className="border-b border-rule">
            <th className="py-2 font-normal">Dealer</th>
            <th className="py-2 font-normal">Code</th>
            <th className="py-2 font-normal">Pitches</th>
            <th className="py-2 text-right font-normal">Sales this month</th>
            <th className="py-2 text-right font-normal">Rent</th>
            <th className="py-2 text-right font-normal">Sales ÷ rent</th>
            <th className="py-2 text-right font-normal">Live items</th>
            <th className="py-2 text-right font-normal">Last sale</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r: { dealer_id: string; name: string; code: string; pitch_numbers: string[]; rent_pence: number; sales_month_pence: number; items_live: number; last_sale_at: string | null }) => {
            const ratio = r.rent_pence ? (Number(r.sales_month_pence) / r.rent_pence).toFixed(1) : "–";
            const stale = !r.last_sale_at || Date.now() - new Date(r.last_sale_at).getTime() > 30 * 86400000;
            return (
              <tr key={r.dealer_id} className="border-b border-rule">
                <td className="py-2">{r.name}</td>
                <td className="sku py-2 text-ink-2">{r.code}</td>
                <td className="py-2 text-ink-2">{r.pitch_numbers.join(", ")}</td>
                <td className="num py-2 text-right font-medium">{money(Number(r.sales_month_pence))}</td>
                <td className="num py-2 text-right text-ink-2">{money(r.rent_pence)}</td>
                <td className={`num py-2 text-right ${Number(ratio) < 1 ? "text-oxblood" : ""}`}>{ratio}</td>
                <td className="num py-2 text-right">{r.items_live}</td>
                <td className={`py-2 text-right text-xs ${stale ? "text-oxblood" : "text-ink-3"}`}>{r.last_sale_at ? new Date(r.last_sale_at).toLocaleDateString("en-GB") : "Never"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
