import type { Admin } from "@/lib/supabase/server";

export type JobType =
  | "sync_item_to_channel"
  | "render_label"
  | "close_item_on_other_channels"
  | "reopen_item_on_channels"
  | "backfill_channel"
  | "notify_sale"
  | "reconcile_channel";

const BACKOFF_MINUTES = [1, 5, 15, 60, 240];

export async function enqueue(db: Admin, type: JobType, payload: Record<string, unknown>, runAt?: Date) {
  await db.from("jobs").insert({ type, payload, next_run_at: (runAt ?? new Date()).toISOString() });
}

export async function claimJobs(db: Admin, limit = 50) {
  const { data } = await db
    .from("jobs")
    .select("*")
    .eq("status", "queued")
    .lte("next_run_at", new Date().toISOString())
    .order("next_run_at")
    .limit(limit);
  const jobs = data ?? [];
  if (jobs.length) {
    await db.from("jobs").update({ status: "running" }).in("id", jobs.map((j) => j.id));
  }
  return jobs as { id: string; type: JobType; payload: Record<string, unknown>; attempts: number }[];
}

export async function completeJob(db: Admin, id: string) {
  await db.from("jobs").update({ status: "done" }).eq("id", id);
}

export async function failJob(db: Admin, id: string, attempts: number, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  const n = attempts + 1;
  if (n >= BACKOFF_MINUTES.length) {
    await db.from("jobs").update({ status: "dead", attempts: n, last_error: msg }).eq("id", id);
    return;
  }
  const next = new Date(Date.now() + BACKOFF_MINUTES[n] * 60_000).toISOString();
  await db.from("jobs").update({ status: "queued", attempts: n, last_error: msg, next_run_at: next }).eq("id", id);
}
