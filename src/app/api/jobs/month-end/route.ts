import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { runMonthEnd } from "@/lib/statements/month-end";

/** Month end. Vercel cron calls this on the 1st with the JOBS_SECRET. Safe to call again: it refreshes, never doubles. ?period=YYYY-MM-01 reruns a month. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.JOBS_SECRET || (auth !== `Bearer ${process.env.JOBS_SECRET}` && auth !== `Bearer ${process.env.CRON_SECRET}`)) return new NextResponse("no", { status: 401 });
  const period = new URL(req.url).searchParams.get("period") ?? undefined;
  const result = await runMonthEnd(supabaseAdmin(), period);
  return NextResponse.json(result);
}
export const POST = GET;
export const maxDuration = 300;
