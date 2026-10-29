import Link from "next/link";
import { displaySku } from "@/lib/sku";

export const money = (pence: number) =>
  `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: pence % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export function Sku({ sku }: { sku: string }) {
  return <span className="sku text-ink-2">{displaySku(sku)}</span>;
}

export function ChannelPill({ kind, label }: { kind: "floor" | "online" | "sold" | "both"; label?: string }) {
  const cls = kind === "sold" ? "pill-sold" : kind === "online" ? "pill-online" : "pill-floor";
  const text = label ?? (kind === "floor" ? "Floor" : kind === "online" ? "Online" : kind === "both" ? "Floor + online" : "Sold");
  return <span className={`pill ${cls}`}>{text}</span>;
}

export function DaysBand({ listedAt }: { listedAt: string }) {
  const days = Math.floor((Date.now() - new Date(listedAt).getTime()) / 86400000);
  const cls = days >= 120 ? "band-120" : days >= 90 ? "band-90" : days >= 60 ? "band-60" : "text-ink-3";
  return <span className={`num rounded-[2px] px-1.5 py-0.5 text-[11px] ${cls}`}>{days}d</span>;
}

export function Hero({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink-3">{label}</div>
      <div className="num text-5xl font-medium leading-none mt-1">{value}</div>
      {sub && <div className="text-sm text-ink-2 mt-2">{sub}</div>}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-ink-3">{label}</div>
      <div className="num text-xl font-medium">{value}</div>
    </div>
  );
}

export function Rule() {
  return <hr className="border-rule" />;
}

export function DealerNav({ active }: { active: string }) {
  const items = [
    ["/app", "Today"],
    ["/app/stock", "Stock"],
    ["/app/items/new", "List"],
    ["/app/labels", "Labels"],
    ["/app/statements", "Money"],
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 border-t border-rule bg-paper">
      <div className="mx-auto grid max-w-md grid-cols-5 text-center text-xs">
        {items.map(([href, label]) => (
          <Link key={href} href={href} className={`py-3 ${active === href ? "text-ink font-medium" : "text-ink-3"}`}>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function Page({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-6">
      <div className="flex items-baseline justify-between mb-5">
        <h1 className="text-lg font-medium">{title}</h1>
        {action}
      </div>
      {children}
    </main>
  );
}

export function Empty({ text, href, cta }: { text: string; href?: string; cta?: string }) {
  return (
    <div className="py-10 text-center text-sm text-ink-2">
      <p>{text}</p>
      {href && cta && (
        <Link href={href} className="btn mt-4">
          {cta}
        </Link>
      )}
    </div>
  );
}
