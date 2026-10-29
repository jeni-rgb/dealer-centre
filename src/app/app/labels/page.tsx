import { requireDealer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { DealerNav, Empty, Page, Rule, Sku } from "@/components/ui";


export default async function Labels() {
  const me = await requireDealer();
  const sb = await supabaseServer();
  const { data: jobs } = await sb
    .from("print_jobs")
    .select("id, status, created_at, item_id, items(sku, title), printers(name, owner_type, provider)")
    .eq("dealer_id", me.dealer_id)
    .order("created_at", { ascending: false })
    .limit(100);

  const groups = new Map<string, typeof jobs>();
  for (const j of jobs ?? []) {
    const p = j.printers as unknown as { name: string; owner_type: string } | null;
    const key = p ? `${p.name}${p.owner_type === "centre" ? " (shop)" : ""}` : "No printer";
    groups.set(key, [...(groups.get(key) ?? []), j]);
  }
  const readyIds = (jobs ?? []).filter((j) => j.status === "ready").map((j) => j.item_id);

  return (
    <Page
      title="Labels"
      action={readyIds.length > 0 && <a className="text-xs underline" href={`/api/labels/batch?ids=${readyIds.join(",")}`} target="_blank" rel="noreferrer">Print {readyIds.length} ready</a>}
    >
      {(jobs ?? []).length === 0 && <Empty text="No labels queued. Labels appear here when you list an item with a printer chosen." />}
      {[...groups.entries()].map(([printer, list]) => (
        <section key={printer} className="mb-6">
          <h2 className="mb-1 text-sm font-medium">{printer}</h2>
          <Rule />
          <ul>
            {(list ?? []).map((j) => {
              const it = j.items as unknown as { sku: string; title: string };
              const label = { queued: "Queued", ready: "Ready to print", sent: "Sent to printer", printed: "Printed", failed: "Failed" }[j.status as string];
              return (
                <li key={j.id} className="flex items-center justify-between border-b border-rule py-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate">{it.title}</div>
                    <div className="text-xs"><Sku sku={it.sku} /></div>
                  </div>
                  <span className={`text-xs ${j.status === "failed" ? "text-oxblood" : j.status === "printed" ? "text-ink-3" : "text-brass"}`}>{label}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <DealerNav active="/app/labels" />
    </Page>
  );
}
