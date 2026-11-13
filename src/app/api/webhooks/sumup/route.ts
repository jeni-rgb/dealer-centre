import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pullAll } from "@/lib/sumup/sync";

/** Optional. SumUp can call this after a payment. The secret must match SUMUP_WEBHOOK_SECRET. The pull is the reliable path. */
export async function POST(req: Request) {
  const secret = env.sumup.webhookSecret();
  const u = new URL(req.url);
  const given = req.headers.get("x-sumup-secret") ?? u.searchParams.get("secret") ?? "";
  if (!secret || given !== secret) return new NextResponse("no", { status: 401 });
  const n = await pullAll(supabaseAdmin());
  return NextResponse.json({ pulled: n });
}
