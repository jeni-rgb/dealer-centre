import { money } from "@/components/ui";

/**
 * Private margin card. profit = paid price x (1 minus commission) minus cost.
 * floor to keep a third = cost / (1 minus commission) / (2/3), rounded up.
 */
export function MarginCard({ pricePence, costPence, commissionBps, sold }: { pricePence: number; costPence: number | null; commissionBps: number; sold: boolean }) {
  if (costPence === null || costPence === undefined) {
    return <div className="card p-4 text-[13px] text-ink-muted">Add what you paid to see your margin and a negotiating ladder. Only you can see it.</div>;
  }
  const rate = 1 - commissionBps / 10000;
  const net = (p: number) => Math.round(p * rate) - costPence;
  const floor = Math.ceil(costPence / rate / (2 / 3));
  const ladder = [1, 0.95, 0.9, 0.85].map((f) => Math.round((pricePence * f) / 100) * 100);
  const profit = net(pricePence);

  return (
    <div className="rounded-[16px] bg-ink p-4 text-white">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-header-muted">Private · only you</span>
        <span className="text-[12px] text-header-muted">Commission {commissionBps / 100}%</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="header-stat"><span className="num text-[16px] font-semibold">{money(costPence)}</span><span className="text-[11px] text-header-muted">Paid</span></div>
        <div className="header-stat"><span className="num text-[16px] font-semibold">{money(pricePence)}</span><span className="text-[11px] text-header-muted">{sold ? "Sold" : "Asking"}</span></div>
        <div className="header-stat"><span className={`num text-[16px] font-semibold ${profit < 0 ? "text-[#FCA5A5]" : "text-header-green"}`}>{money(profit)}</span><span className="text-[11px] text-header-muted">{sold ? "Profit" : "If sold at asking"}</span></div>
      </div>
      {!sold && (
        <>
          <div className="mt-4 text-[12px] text-header-muted">If they haggle</div>
          <div className="mt-1.5 flex flex-col divide-y divide-white/10">
            {ladder.map((p, i) => (
              <div key={i} className="flex h-9 items-center justify-between text-[14px]">
                <span>{i === 0 ? "Asking" : `${Math.round((1 - p / pricePence) * 100)}% off`} · {money(p)}</span>
                <span className={`num ${net(p) < 0 ? "text-[#FCA5A5]" : ""}`}>{money(net(p))} profit</span>
              </div>
            ))}
            <div className="flex h-9 items-center justify-between text-[14px] font-semibold">
              <span>Lowest to keep a third</span>
              <span className="num text-header-green">{money(floor)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
