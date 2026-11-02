import Link from "next/link";
import { Logo } from "@/components/logo";
import { Phone, Browser } from "@/components/devices";

export type Section = { id: string; title: string; lead?: string; steps?: string[]; body?: React.ReactNode; phone?: string; browser?: string; tip?: string };

/** The manual layout: sticky contents on the left, sections with a screenshot beside each on the right. */
export function Guide({ eyebrow, title, intro, sections, tone = "accent", publicPage = true, related }: { eyebrow: string; title: string; intro: string; sections: Section[]; tone?: "accent" | "forest"; publicPage?: boolean; related?: { href: string; label: string }[] }) {
  const toneText = tone === "forest" ? "text-forest" : "text-accent";
  const toneBg = tone === "forest" ? "bg-forest" : "bg-accent";
  return (
    <main className="min-h-screen">
      {publicPage && (
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/"><Logo size={30} /></Link>
          <nav className="flex items-center gap-5 text-[14px] font-medium text-ink-muted"><Link href="/guides/dealers">Dealer guide</Link><Link href="/guides/centres">Centre guide</Link><Link href="/signin" className="btn-sm">Sign in</Link></nav>
        </header>
      )}
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
        <div className="max-w-3xl">
          <span className={`text-[13px] font-semibold uppercase tracking-[0.12em] ${toneText}`}>{eyebrow}</span>
          <h1 className="mt-3 text-[40px] font-bold leading-[1.05] tracking-[-0.02em] md:text-[52px]">{title}</h1>
          <p className="mt-5 text-[18px] leading-7 text-ink-muted">{intro}</p>
        </div>
        <div className="mt-12 grid gap-12 lg:grid-cols-[220px_1fr]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-muted">In this guide</div>
            <ol className="mt-3 flex flex-col gap-1.5 text-[14px]">
              {sections.map((s, i) => <li key={s.id}><a href={`#${s.id}`} className="flex gap-2 text-ink-muted hover:text-ink"><span className={`w-5 shrink-0 font-semibold ${toneText}`}>{i + 1}</span>{s.title}</a></li>)}
            </ol>
            {related && <div className="mt-8 flex flex-col gap-1.5 text-[13px]"><div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Also</div>{related.map((r) => <Link key={r.href} href={r.href} className={`${toneText} font-medium`}>{r.label}</Link>)}</div>}
          </aside>
          <div className="flex flex-col gap-16">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-6">
                <div className={`grid gap-8 ${s.phone || s.browser ? "md:grid-cols-[1fr_auto]" : ""} ${s.browser ? "md:grid-cols-1" : ""}`}>
                  <div>
                    <div className="flex items-center gap-3"><span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${toneBg} text-[13px] font-bold text-white`}>{i + 1}</span><h2 className="text-[26px] font-bold tracking-[-0.01em]">{s.title}</h2></div>
                    {s.lead && <p className="mt-3 text-[16px] leading-7 text-ink-muted">{s.lead}</p>}
                    {s.steps && <ol className="mt-4 flex flex-col gap-2.5">{s.steps.map((st, j) => <li key={j} className="flex gap-3 text-[15px] leading-6"><span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[12px] font-bold">{j + 1}</span><span>{st}</span></li>)}</ol>}
                    {s.body}
                    {s.tip && <div className="mt-5 rounded-[14px] border border-gold bg-gold-soft px-4 py-3 text-[14px] leading-6 text-warning"><span className="font-semibold">Tip. </span>{s.tip}</div>}
                  </div>
                  {s.phone && <Phone src={s.phone} alt={s.title} className="mx-auto w-[220px] md:mx-0" />}
                </div>
                {s.browser && <div className="mt-6"><Browser src={s.browser} alt={s.title} /></div>}
              </section>
            ))}
          </div>
        </div>
      </div>
      {publicPage && (
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 text-[13px] text-ink-muted md:flex-row md:items-center"><Logo size={24} /><nav className="flex gap-5"><Link href="/">Home</Link><Link href="/#pricing">Pricing</Link><Link href="/signin">Sign in</Link></nav></div>
        </footer>
      )}
    </main>
  );
}
