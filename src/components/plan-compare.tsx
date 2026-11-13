import Link from "next/link";
import { BASIC_LINE, COMPARE_HEADLINE, FULL_POINTS, FULL_POUNDS } from "@/lib/billing/pricing";

/** Basic against Full. The same words on the public pricing page, Account, and the taster invite. */
export function PlanCompare({ join = false, showHeadline = true, center = false }: { join?: boolean; showHeadline?: boolean; center?: boolean }) {
  return (
    <div className="flex flex-col gap-5 text-left">
      {showHeadline && <h2 className={`text-[28px] font-bold leading-tight md:text-[36px] ${center ? "text-center" : ""}`}>{COMPARE_HEADLINE}</h2>}
      <div className="grid items-start gap-5 md:grid-cols-2">
        <section className="card flex flex-col p-6 md:p-7">
          <div className="text-[14px] font-semibold text-ink-muted">Basic</div>
          <div className="mt-2 figure text-[40px] leading-none">Free</div>
          <p className="mt-4 text-[15px] leading-7">{BASIC_LINE}</p>
        </section>
        <section className="card relative flex flex-col border-accent p-6 ring-1 ring-accent md:p-7">
          <span className="absolute -top-3 left-6 rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">Recommended</span>
          <div className="text-[14px] font-semibold text-ink-muted">Full</div>
          <div className="mt-2 flex items-baseline gap-1"><span className="figure text-[40px] leading-none">£{FULL_POUNDS}</span><span className="text-[14px] text-ink-muted">a month plus VAT</span></div>
          <ol className="mt-5 flex list-decimal flex-col gap-3 pl-5 text-[15px] leading-6">
            {FULL_POINTS.map((line) => <li key={line}>{line}</li>)}
          </ol>
          {join && <Link href="/signup?as=dealer" className="btn mt-6">Join Full</Link>}
        </section>
      </div>
    </div>
  );
}
