import Link from "next/link";
import { DealerNav, Icon, Phone, Pill, money } from "@/components/ui";

/** Static preview of the Today screen with the design brief's sample data. No database. Show this to traders on a phone. */
export default function Preview() {
  const recent = [
    ["Cranberry glass jug", "B14 0370", "Floor", "11:20", 4200],
    ["Staffordshire spaniel pair", "B14 0365", "Shopify", "Yesterday", 11000],
    ["French enamel coffee pot", "B14 0362", "Floor", "3 days ago", 3300],
  ] as const;
  return (
    <Phone>
      <header className="header-dark flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5"><span className="text-[12px] text-header-muted">Bloom Antiques · B14 · Looses Emporium</span><span className="text-[20px] font-semibold">Good afternoon, Jeni</span></div>
          <span className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/15 bg-white/10">{Icon.settings}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-header-muted">Sales this month</span>
          <div className="flex items-baseline gap-3"><span className="num text-[44px] font-bold leading-[48px] tracking-[-0.03em]">£2,840</span><span className="inline-flex h-6 items-center gap-1 rounded-[8px] bg-[rgba(52,211,153,0.16)] px-2 text-[12px] font-semibold text-header-green">{Icon.up}£430 vs last month</span></div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[["Today", "£185"], ["Week", "£610"], ["Sold", "14"], ["Live", "61"]].map(([l, v]) => <div key={l} className="header-stat"><span className="num text-[16px] font-semibold leading-5">{v}</span><span className="text-[11px] text-header-muted">{l}</span></div>)}
        </div>
      </header>
      <div className="flex flex-col gap-4 px-5 pt-5">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/preview" className="btn !h-12 !text-[14px]">{Icon.plus} List item</Link>
          <Link href="/preview" className="btn-secondary !h-12 !gap-1.5 !px-2 !text-[14px]">{Icon.printer} Labels<span className="pill pill-warning !h-5 !rounded-full whitespace-nowrap !px-1.5 !text-[11px]">2 to print</span></Link>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between py-1 pb-2"><h2 className="text-[16px] font-semibold">Recent sales</h2><span className="text-[13px] font-medium text-accent">View all</span></div>
          {recent.map(([title, sku, ch, t, p]) => (
            <div key={sku} className="row">
              <div className="h-11 w-11 shrink-0 rounded-[10px] bg-surface-2" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="truncate text-[14px] font-medium">{title}</span><span className="text-[12px] text-ink-muted">{sku} · {ch} · {t}</span></div>
              <span className="num text-[15px] font-semibold">{money(p)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-3 text-[13px] text-[#991B1B]"><span><strong className="font-semibold">3 items</strong> over 90 days on the floor</span><span className="font-semibold">Review</span></div>
        <div className="pt-2 text-center text-[12px] text-ink-muted">Preview with sample data. <Pill kind="neutral">Not live</Pill></div>
      </div>
      <DealerNav active="today" />
    </Phone>
  );
}
