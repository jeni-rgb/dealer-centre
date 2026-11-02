import Link from "next/link";
import { Logo, Mark } from "./logo";
import { displaySku } from "@/lib/sku";

export const money = (pence: number) =>
  `${pence < 0 ? "−" : ""}£${(Math.abs(pence) / 100).toLocaleString("en-GB", { minimumFractionDigits: pence % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export const when = (iso: string) => {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export function Sku({ sku, className = "", tag = false }: { sku: string; className?: string; tag?: boolean }) {
  if (tag) return <span className={`tag ${className}`}>{displaySku(sku)}</span>;
  return <span className={`ticket ${className}`}>{displaySku(sku)}</span>;
}

export function Pill({ kind, children, className = "" }: { kind: "neutral" | "accent" | "success" | "warning" | "danger"; children: React.ReactNode; className?: string }) {
  return <span className={`pill pill-${kind} ${className}`}>{children}</span>;
}

export function ChannelLabel({ type, ownerType }: { type: string | null | undefined; ownerType?: string | null }) {
  if (type === "shopify") return <>{ownerType === "centre" ? "Centre shop" : "Shopify"}</>;
  return <>Floor</>;
}

export function DaysBand({ listedAt }: { listedAt: string }) {
  const days = Math.floor((Date.now() - new Date(listedAt).getTime()) / 86400000);
  if (days >= 90) return <Pill kind="danger">{days}d</Pill>;
  if (days >= 60) return <Pill kind="warning">{days}d</Pill>;
  return <span className="text-[12px] text-ink-muted">{days}d</span>;
}

export function Toggle({ on, onChange, label, hint, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <button type="button" className="toggle-row disabled:opacity-50" onClick={() => !disabled && onChange(!on)} disabled={disabled} aria-pressed={on}>
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-medium">{label}</span>
        {hint && <span className="text-[12px] leading-4 text-ink-muted">{hint}</span>}
      </span>
      <span className={`relative h-7 w-[46px] shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-[#CBD5E1]"}`}>
        <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white transition-all ${on ? "left-[21px]" : "left-[3px]"}`} />
      </span>
    </button>
  );
}

export function ToggleGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col overflow-hidden rounded-[14px] border border-border divide-y divide-border">{children}</div>;
}

export function TicketCard({ sku, hint }: { sku: string; hint: string }) {
  return (
    <div className="relative flex items-center justify-between overflow-hidden rounded-[16px] bg-forest px-4 py-3.5 text-white">
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] text-header-muted">Ticket number</span>
        <span className="tag tag-lg tag-dark">{displaySku(sku)}</span>
      </div>
      <span className="relative max-w-[120px] text-right text-[12px] leading-4 text-header-muted">{hint}</span>
      <Mark size={96} color="#FFFFFF" className="watermark" />
    </div>
  );
}

const Icon = {
  home: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11 12 3l9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>,
  stock: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>,
  statement: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>,
  settings: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>,
  printer: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></svg>,
  up: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>,
  check: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>,
};
export { Icon };

export function DealerNav({ active }: { active: "today" | "stock" | "statement" | "settings" }) {
  const items: [string, string, keyof typeof Icon, string][] = [
    ["today", "/app", "home", "Today"],
    ["stock", "/app/stock", "stock", "Stock"],
    ["statement", "/app/statements", "statement", "Statement"],
    ["settings", "/app/settings", "settings", "Settings"],
  ];
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-border bg-surface/95 px-2 pb-6 pt-2 backdrop-blur">
      {items.map(([key, href, icon, label]) => (
        <Link key={key} href={href} aria-current={active === key ? "page" : undefined} className={`flex h-12 flex-col items-center justify-center gap-1 text-[11px] ${active === key ? "font-semibold text-accent" : "font-medium text-header-muted"}`}>
          {Icon[icon]}
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function Phone({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-screen max-w-[390px] bg-surface pb-28">{children}</div>;
}

export function Screen({ title, back, children, right }: { title: string; back?: { href: string; label?: string }; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Phone>
      <div className="flex items-center justify-between px-5 pb-3 pt-14">
        {back ? <Link href={back.href} className="text-[15px] font-medium text-ink-muted">{back.label ?? "Back"}</Link> : <span className="w-12" />}
        <h1 className="text-[17px] font-semibold">{title}</h1>
        <span className="flex w-12 justify-end">{right}</span>
      </div>
      <div className="flex flex-col gap-4 px-5">{children}</div>
    </Phone>
  );
}

export function Empty({ text, href, cta }: { text: string; href?: string; cta?: string }) {
  return (
    <div className="card relative overflow-hidden p-6 text-center text-[14px] text-ink-muted">
      <Mark size={120} className="watermark" />
      <p className="relative">{text}</p>
      {href && cta && <Link href={href} className="btn mt-4">{cta}</Link>}
    </div>
  );
}

export function Sidebar({ items, title }: { items: [string, string, boolean][]; title: string }) {
  return (
    <>
      <aside className="sidebar hidden md:block">
        <div className="mb-6 px-3"><Logo size={26} /><span className="mt-2 block text-[12px] text-ink-muted">{title}</span></div>
        <nav className="flex flex-col gap-1">
          {items.map(([label, href, active]) => (
            <Link key={href} href={href} className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}>{label}</Link>
          ))}
        </nav>
      </aside>
      <nav className="flex gap-1 overflow-x-auto border-b border-border bg-white px-3 py-2 md:hidden">
        {items.map(([label, href, active]) => (
          <Link key={href} href={href} className={`whitespace-nowrap rounded-[10px] px-3 py-2 text-[13px] font-medium ${active ? "bg-accent-soft text-accent-text" : "text-ink-muted"}`}>{label}</Link>
        ))}
      </nav>
    </>
  );
}

export function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "danger" | "warning" }) {
  return (
    <div className="kpi min-w-[200px]">
      <div className="text-[12px] font-medium text-ink-muted">{label}</div>
      <div className={`figure mt-1 text-[34px] leading-9 ${tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : ""}`}>{value}</div>
      {sub && <div className="mt-1 text-[12px] text-ink-muted">{sub}</div>}
    </div>
  );
}
