import { supabaseAdmin } from "@/lib/supabase/server";
import { money } from "@/components/ui";


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
    <div className="space-y-10 text-sm">
      <div className="grid grid-cols-4 gap-6">
        <div><div className="text-xs text-ink-3">Webhooks, 48h</div><div className="num text-2xl">{(webhooks ?? []).length}</div></div>
        <div><div className="text-xs text-ink-3">Jobs queued</div><div className="num text-2xl">{queued?.length ?? 0}</div></div>
        <div><div className="text-xs text-ink-3">Jobs failed or dead</div><div className={`num text-2xl ${(failedJobs ?? []).length ? "text-oxblood" : ""}`}>{(failedJobs ?? []).length}</div></div>
        <div><div className="text-xs text-ink-3">Unmatched sales</div><div className={`num text-2xl ${(unmatched ?? []).length ? "text-brass" : ""}`}>{(unmatched ?? []).length}</div></div>
      </div>

      <section>
        <h2 className="mb-2 font-medium">Failed listings</h2>
        {(failedListings ?? []).length === 0 ? <p className="text-ink-3">None.</p> : (
          <ul>{(failedListings ?? []).map((l) => <li key={l.id} className="border-b border-rule py-2"><span className="sku">{(l.items as unknown as { sku: string }).sku}</span> on {(l.channels as unknown as { type: string })?.type}: <span className="text-oxblood">{l.last_error}</span></li>)}</ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-medium">Unmatched sales</h2>
        {(unmatched ?? []).length === 0 ? <p className="text-ink-3">None.</p> : (
          <ul>{(unmatched ?? []).map((s) => <li key={s.id} className="flex justify-between border-b border-rule py-2"><span>{new Date(s.sold_at).toLocaleString("en-GB")} · {(s.centres as unknown as { name: string })?.name ?? "online"} · ticket {s.ticket_no ?? "none"}</span><span className="num">{money(s.amount_pence)}</span></li>)}</ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-medium">Failed jobs</h2>
        {(failedJobs ?? []).length === 0 ? <p className="text-ink-3">None.</p> : (
          <ul>{(failedJobs ?? []).map((j) => <li key={j.id} className="border-b border-rule py-2">{j.type} · {j.status} · {j.attempts} attempts · <span className="text-oxblood">{j.last_error}</span></li>)}</ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-medium">Recent webhooks</h2>
        <ul>{(webhooks ?? []).map((w, i) => <li key={i} className="flex justify-between border-b border-rule py-1 text-xs"><span>{w.source} · {w.event_type} · <span className={w.status === "error" ? "text-oxblood" : "text-ink-3"}>{w.status}</span>{w.error ? ` · ${w.error.slice(0, 80)}` : ""}</span><span className="text-ink-3">{new Date(w.received_at).toLocaleString("en-GB")}</span></li>)}</ul>
      </section>
    </div>
  );
}
