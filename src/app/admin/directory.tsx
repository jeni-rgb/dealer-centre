"use client";
import { money } from "@/components/ui";
import { DataTable, StatusBadge } from "./ui";

export type CentreRow = { id: string; href: string; name: string; code: string; status: string; square: string; sales: number };
export type DealerRow = { id: string; href: string; name: string; code: string; status: string; plan: string; usage: string; shopify: string; sales: number; joined: string };

const statuses = ["Active", "Trial", "Free", "Cancelled", "Past due", "No card", "Unclaimed"];

export function CentresTable({ rows }: { rows: CentreRow[] }) {
  return (
    <DataTable
      rows={rows}
      placeholder="Search centres"
      statuses={statuses}
      statusOf={(r) => r.status}
      search={(r, q) => `${r.name} ${r.code}`.toLowerCase().includes(q)}
      columns={[
        { key: "name", label: "Centre", sort: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "code", label: "Code", sort: (r) => r.code, render: (r) => <span className="ticket text-[12px]">{r.code}</span> },
        { key: "status", label: "Status", sort: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
        { key: "square", label: "Square", sort: (r) => r.square, render: (r) => r.square },
        { key: "sales", label: "Sales", align: "right", sort: (r) => r.sales, render: (r) => <span className="num">{money(r.sales)}</span> },
      ]}
    />
  );
}

export function DealersTable({ rows }: { rows: DealerRow[] }) {
  return (
    <DataTable
      rows={rows}
      placeholder="Search dealers"
      statuses={statuses}
      statusOf={(r) => r.status}
      search={(r, q) => `${r.name} ${r.code}`.toLowerCase().includes(q)}
      columns={[
        { key: "name", label: "Dealer", sort: (r) => r.name, render: (r) => <span className="font-medium">{r.name} <span className="ticket text-[12px] text-ink-muted">{r.code}</span></span> },
        { key: "status", label: "Status", sort: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
        { key: "plan", label: "Plan", sort: (r) => r.plan, render: (r) => <span><span className="font-medium">{r.plan}</span><span className="mt-0.5 block text-[11px] text-ink-muted">{r.usage}</span></span> },
        { key: "shopify", label: "Shopify", sort: (r) => r.shopify, render: (r) => r.shopify },
        { key: "sales", label: "Sales", align: "right", sort: (r) => r.sales, render: (r) => <span className="num">{money(r.sales)}</span> },
        { key: "joined", label: "Created", sort: (r) => r.joined, render: (r) => <span className="text-ink-muted">{r.joined}</span> },
      ]}
    />
  );
}
