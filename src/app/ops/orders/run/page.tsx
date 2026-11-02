import { supabaseAdmin } from "@/lib/supabase/server";
import { money } from "@/components/ui";
import { listOnlineOrders } from "@/lib/fulfilment/orders";

/** The runner's sheet: what to collect, by centre, by pitch. Print it. */
export default async function RunSheet({ searchParams }: { searchParams: Promise<{ centre?: string; ids?: string }> }) {
  const { centre, ids } = await searchParams;
  const want = (ids ?? "").split(",").filter(Boolean);
  const orders = (await listOnlineOrders(supabaseAdmin(), { centreId: centre || undefined })).filter((o) => want.length ? want.includes(o.sale_id) : o.status === "new");
  const byCentre = orders.reduce<Record<string, typeof orders>>((m, o) => { (m[o.centre] ??= []).push(o); return m; }, {});
  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-[13px] text-ink print:p-0">
      <div className="mb-6 flex items-baseline justify-between"><h1 className="text-[22px] font-semibold">Collection run</h1><span className="text-ink-muted">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · {orders.length} item{orders.length === 1 ? "" : "s"}</span></div>
      {orders.length === 0 && <p className="text-ink-muted">Nothing to collect.</p>}
      {Object.entries(byCentre).map(([name, rows]) => (
        <section key={name} className="mb-8 break-inside-avoid">
          <h2 className="mb-2 border-b border-ink pb-1 text-[16px] font-semibold">{name} <span className="font-normal text-ink-muted">· {rows.length}</span></h2>
          <table className="w-full">
            <thead><tr className="text-left text-[11px] text-ink-muted"><th className="py-1 pr-3">☐</th><th className="py-1 pr-3">Pitch</th><th className="py-1 pr-3">Ticket</th><th className="py-1 pr-3">Item</th><th className="py-1 pr-3">Dealer</th><th className="py-1 text-right">Price</th></tr></thead>
            <tbody>
              {[...rows].sort((a, b) => (a.pitches[0] ?? "").localeCompare(b.pitches[0] ?? "", undefined, { numeric: true })).map((o) => (
                <tr key={o.sale_id} className="border-b border-border align-top">
                  <td className="py-2 pr-3 text-[16px]">☐</td><td className="py-2 pr-3 font-semibold">{o.pitches.join(", ") || "?"}</td><td className="ticket py-2 pr-3">{o.ticket ?? ""}</td><td className="py-2 pr-3">{o.title}</td><td className="py-2 pr-3 text-ink-muted">{o.dealer}</td><td className="num py-2 text-right">{money(o.amount_pence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <p className="mt-8 text-[11px] text-ink-muted">Tick each item as it goes in the van, then select them in Online orders and press Mark collected. Anything not on the shelf: Mark missing, which tells the centre and the dealer.</p>
    </div>
  );
}
