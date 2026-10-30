import { supabaseAdmin } from "@/lib/supabase/server";
import { Kpi, money } from "@/components/ui";


export default async function Health() {
  const db = supabaseAdmin();
  const since = new Date(Date.now() - 48 * 3600_000).toISOString();
  const [{ data: webhooks }, { data: failedJobs }, { data: unmatched }, { data: failedListings }, { data: queued }] = await Promise.all([
    db.from("webhook_log").select("source, event_type, status, received_at, error").gte("received_at", since).order("received_at", { ascending: false }).limit(50),
    db.from("jobs").select("id, type, status, attempts, last_error, updated_at").in("status", ["failed", "dead"]).order("updated_at", { ascending: false }).limit(50),
    db.from("sales").select("id, amount_pence, sold_at, ticket_no, centre_id, centres(name)").is("item_id", null).is("voided_at", null).order("sold_at", { ascending: false }).limit(50),
    db.from("item_listings").select("id, status, last_error, items(sku, title), channels:channel_id(type)").eq("status", "failed").limit(50),
    db.from("jobs").select("id", { count: "exact", head: true }).eq("status", "queued"),
  ]);

  return (
    <div className="space-y-8 text-[14px]">
      <h1 className="text-[24px] font-semibold">Health</h1>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Kpi label="Webhooks, 48h" value={String((webhooks ?? []).length)} />
        <Kpi label="Jobs queued" value={String(queued?.length ?? 0)} />
        <Kpi label="Jobs failed or dead" value={String((failedJobs ?? []).length)} tone={(failedJobs ?? []).length ? "danger" : undefined} />
        <Kpi label="Unmatched sales" value={String((unmatched ?? []).length)} tone={(unmatched ?? []).length ? "warning" : undefined} />
      </div>

      <section>
        <h2 className="mb-3 text-[16px] font-semibold">Failed listings</h2>
        {(failedListings ?? []).length === 0 ? <p className="card px-5 py-4 text-ink-muted">None.</p> : (
          <ul className="card divide-y divide-border px-5">{(failedListings ?? []).map((l) => <li key={l.id} className="py-2"><span className="ticket">{(l.items as unknown as { sku: string }).sku}</span> on {(l.channels as unknown as { type: string })?.type}: <span className="text-danger">{l.last_error}</span></li>)}</ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-[16px] font-semibold">Unmatched sales</h2>
        {(unmatched ?? []).length === 0 ? <p className="card px-5 py-4 text-ink-muted">None.</p> : (
          <ul className="card divide-y divide-border px-5">{(unmatched ?? []).map((s) => <li key={s.id} className="flex justify-between py-2"><span>{new Date(s.sold_at).toLocaleString("en-GB")} · {(s.centres as unknown as { name: string })?.name ?? "online"} · ticket {s.ticket_no ?? "none"}</span><span className="num">{money(s.amount_pence)}</span></li>)}</ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-[16px] font-semibold">Failed jobs</h2>
        {(failedJobs ?? []).length === 0 ? <p className="card px-5 py-4 text-ink-muted">None.</p> : (
          <ul className="card divide-y divide-border px-5">{(failedJobs ?? []).map((j) => <li key={j.id} className="py-2">{j.type} · {j.status} · {j.attempts} attempts · <span className="text-danger">{j.last_error}</span></li>)}</ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-[16px] font-semibold">Recent webhooks</h2>
        <ul className="card divide-y divide-border px-5">{(webhooks ?? []).map((w, i) => <li key={i} className="flex justify-between py-1.5 text-[12px]"><span>{w.source} · {w.event_type} · <span className={w.status === "error" ? "text-danger" : "text-ink-muted"}>{w.status}</span>{w.error ? ` · ${w.error.slice(0, 80)}` : ""}</span><span className="text-ink-muted">{new Date(w.received_at).toLocaleString("en-GB")}</span></li>)}</ul>
      </section>
    </div>
  );
}
