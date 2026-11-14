"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "@/components/ui";

export function PageHeader({ eyebrow, title, subtitle, children }: { eyebrow?: string; title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-[12px] font-medium text-ink-muted">{eyebrow}</p>}
        <h1 className="text-[26px] font-semibold leading-8">{title}</h1>
        {subtitle && <p className="mt-1 max-w-xl text-[13px] text-ink-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Tabs({ labels, children }: { labels: string[]; children: React.ReactNode }) {
  const [i, setI] = useState(0);
  const panels = Array.isArray(children) ? children : [children];
  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {labels.map((label, n) => (
          <button key={label} type="button" onClick={() => setI(n)} className={`shrink-0 border-b-2 px-3 py-2 text-[13px] font-medium ${n === i ? "border-accent text-ink" : "border-transparent text-ink-muted"}`}>{label}</button>
        ))}
      </div>
      <div className="pt-5">{panels[i]}</div>
    </div>
  );
}

const tone = (status: string) => status === "Active" ? "success" as const : status === "Trial" ? "warning" as const : status === "Free" ? "accent" as const : status === "Past due" || status === "No card" ? "danger" as const : "neutral" as const;

export function StatusBadge({ status }: { status: string }) {
  return <Pill kind={tone(status)}>{status}</Pill>;
}

type Col<T> = { key: string; label: string; align?: "right"; render: (row: T) => React.ReactNode; sort?: (row: T) => string | number };

export function DataTable<T extends { id: string; href?: string }>({ rows, columns, search, statuses, statusOf, placeholder }: {
  rows: T[];
  columns: Col<T>[];
  search: (row: T, q: string) => boolean;
  statuses?: string[];
  statusOf?: (row: T) => string;
  placeholder: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const shown = useMemo(() => {
    let list = rows.filter((row) => search(row, q.trim().toLowerCase()) && (status === "All" || !statusOf || statusOf(row) === status));
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sort) list = [...list].sort((a, b) => String(col.sort!(a)).localeCompare(String(col.sort!(b)), "en", { numeric: true }) * sort.dir);
    }
    return list;
  }, [rows, q, status, sort, columns, search, statusOf]);
  return (
    <div>
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center">
        <input className="field !h-9 sm:max-w-xs" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        {statuses && statusOf && (
          <select className="field !h-9 !w-auto" value={status} aria-label="Status" onChange={(e) => setStatus(e.target.value)}>
            <option>All</option>
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
        <span className="text-[12px] text-ink-muted sm:ml-auto">{shown.length} shown</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead className="text-left text-[11px] uppercase tracking-wide text-ink-muted">
            <tr className="border-b border-border">
              {columns.map((c) => (
                <th key={c.key} className={`px-4 py-2 font-medium ${c.align === "right" ? "text-right" : ""}`}>
                  {c.sort ? <button type="button" className="font-medium" onClick={() => setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 1 ? -1 : 1 }))}>{c.label}</button> : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id} className={`border-b border-border last:border-0 ${row.href ? "cursor-pointer hover:bg-surface" : ""}`} onClick={() => row.href && router.push(row.href)}>
                {columns.map((c) => <td key={c.key} className={`px-4 py-2.5 ${c.align === "right" ? "text-right" : ""}`}>{c.render(row)}</td>)}
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-ink-muted">Nothing matches.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
