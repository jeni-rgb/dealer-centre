import Link from "next/link";
import { BASIC_LINE, COMPARE_HEADLINE, FULL_POINTS, FULL_POUNDS } from "@/lib/billing/pricing";

const GROUPS: { name: string; indexes: number[] }[] = [
  { name: "Sales", indexes: [0, 1, 4] },
  { name: "Money", indexes: [2, 5] },
  { name: "Stock", indexes: [3, 6] },
  { name: "Tools", indexes: [7, 8] },
];

function split(line: string) {
  const cut = line.indexOf(". ");
  return { title: line.slice(0, cut), body: line.slice(cut + 2) };
}

/** Public pricing page: a slim Basic card, a rich Full card, and grouped tiles. */
export function PlanCompare({ join = false, showHeadline = true, center = false, variant = "lite" }: { join?: boolean; showHeadline?: boolean; center?: boolean; variant?: "marketing" | "lite" }) {
  const tiles = FULL_POINTS.map(split);
  let tileNumber = 0;
  const groups = GROUPS.map((group) => ({
    name: group.name,
    tiles: group.indexes.map((i) => ({ ...tiles[i], n: ++tileNumber })),
  }));
  if (variant === "lite") {
    return (
      <div className="flex flex-col gap-4 text-left">
        {showHeadline && <h2 className={`text-[22px] font-bold leading-tight ${center ? "text-center" : ""}`}>{COMPARE_HEADLINE}</h2>}
        <div className="grid grid-cols-1 gap-3">
          <section className="rounded-[16px] border border-border bg-white p-4">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Basic</div>
            <div className="mt-1 text-[22px] font-bold">Free</div>
            <p className="mt-2 text-[13px] leading-5 text-ink-muted">{BASIC_LINE}</p>
          </section>
          <section className="rounded-[16px] border border-accent bg-accent-soft p-4">
            <div className="flex items-center justify-between gap-2"><span className="text-[12px] font-semibold uppercase tracking-wide text-accent">Full</span><span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold text-ink">Recommended</span></div>
            <div className="mt-1 text-[22px] font-bold">£{FULL_POUNDS} <span className="text-[13px] font-medium text-ink-muted">a month plus VAT</span></div>
            <ul className="mt-3 flex flex-col gap-1.5 text-[13px] leading-5">
              {tiles.map((t) => <li key={t.title} className="flex gap-2"><span className="text-accent">✓</span><span><span className="font-semibold">{t.title}.</span> {t.body}</span></li>)}
            </ul>
            {join && <Link href="/signup?as=dealer" className="btn mt-4 !h-11">Join Full</Link>}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 text-left">
      {showHeadline && (
        <div className={center ? "text-center" : ""}>
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-accent">For dealers</p>
          <h2 className="mx-auto mt-2 max-w-3xl text-[32px] font-bold leading-[1.08] md:text-[46px]">{COMPARE_HEADLINE}</h2>
        </div>
      )}

      <div className="grid items-stretch gap-4 md:grid-cols-[0.72fr_1.28fr]">
        <section className="flex flex-col justify-between rounded-[24px] border border-border bg-white p-6 md:p-8">
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted">Basic</div>
            <div className="mt-3 figure text-[48px] leading-none">Free</div>
            <p className="mt-4 text-[16px] leading-7 text-ink-muted">{BASIC_LINE}</p>
          </div>
          <p className="mt-6 text-[13px] text-ink-muted">Your centre adds you. No sign up.</p>
        </section>
        <section className="relative overflow-hidden rounded-[24px] bg-accent p-6 text-cream shadow-[0_18px_50px_rgba(92,83,25,0.18)] md:p-8">
          <span className="absolute right-6 top-6 rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">Recommended</span>
          <div className="text-[13px] font-semibold uppercase tracking-wide text-[#E6E0BD]">Full</div>
          <div className="mt-3 flex items-baseline gap-2"><span className="figure text-[56px] leading-none">£{FULL_POUNDS}</span><span className="text-[15px] text-[#E6E0BD]">a month plus VAT</span></div>
          <p className="mt-3 max-w-md text-[15px] leading-6 text-[#F3EFD4]">One login and one bill, however many centres you trade in. Direct Debit.</p>
          {join && <Link href="/signup?as=dealer" className="btn-secondary mt-6 !w-auto shrink-0 whitespace-nowrap !px-7">Join Full</Link>}
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <section key={group.name} className="rounded-[22px] border border-border bg-white p-5 md:p-6">
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-accent">{group.name}</h3>
            <div className="mt-4 flex flex-col gap-4">
              {group.tiles.map((tile) => (
                <div key={tile.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-soft text-[13px] font-bold text-accent">{tile.n}</span>
                  <div>
                    <div className="text-[16px] font-semibold leading-5">{tile.title}</div>
                    <p className="mt-1 text-[14px] leading-6 text-ink-muted">{tile.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[22px] bg-surface-2 p-6">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Jody before</div>
          <p className="mt-2 text-[18px] font-semibold leading-6">A total from each centre, when they pay her.</p>
          <p className="mt-4 text-[14px] leading-6 text-ink-muted">Looses Emporium, paid. Magdalen, still to come. No names, no stock, nothing in between.</p>
        </div>
        <div className="rounded-[22px] border border-accent bg-white p-6">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-accent">Jody with Full</div>
          <div className="mt-3 rounded-[16px] bg-accent px-4 py-4 text-cream">
            <div className="text-[12px] text-[#E6E0BD]">This morning at Looses Emporium</div>
            <div className="mt-1 flex items-baseline justify-between gap-3"><span className="text-[16px] font-semibold">Oak coffer</span><span className="figure text-[22px]">£395</span></div>
            <div className="mt-2 text-[12px] text-[#E6E0BD]">This week £640. Last week £410. Goal £500.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
