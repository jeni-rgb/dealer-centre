import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { claimJobs, completeJob, failJob } from "@/lib/jobs/queue";
import { handlers } from "@/lib/jobs/handlers";
import { holdUnstartedDealerTrials } from "@/lib/billing/dealer-trial";


/** Worker. Called every minute by Vercel cron or Supabase cron with the JOBS_SECRET. */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.JOBS_SECRET || (auth !== `Bearer ${process.env.JOBS_SECRET}` && auth !== `Bearer ${process.env.CRON_SECRET}`)) return new NextResponse("no", { status: 401 });
  const db = supabaseAdmin();
  const held = await holdUnstartedDealerTrials().catch((e) => { console.error("[dealer trial]", e); return { held: 0 }; });
  const jobs = await claimJobs(db);
  const results: Record<string, number> = { done: 0, failed: 0 };
  for (const j of jobs) {
    try {
      await handlers[j.type](db, j.payload);
      await completeJob(db, j.id);
      results.done++;
    } catch (e) {
      await failJob(db, j.id, j.attempts, e);
      results.failed++;
    }
  }
  return NextResponse.json({ ...results, held });
}

export async function GET(req: Request) {
  return POST(req);
}
