import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pullAll } from "@/lib/sumup/sync";

/** Daily pull of connected SumUp accounts. Same secret as the other jobs. */}
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.JOBS_SECRET || (auth !== `Bearer ${process.env.JOBS_SECRET}` && auth !== `Bearer ${process.env.CRON_SECRET}`)) return new NextResponse("no", { status: 401 });
  const pulled = await pullAll(supabaseAdmin());
  return NextResponse.json({ pulled });
}

export async function POST(req: Request) {
  return GET(req);
}
