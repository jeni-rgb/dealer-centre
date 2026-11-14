import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/server";
import { readSumupNotice } from "@/lib/sumup/events";
import { applySumupNotice } from "@/lib/sumup/sync";

/** SumUp posts a checkout or reader result here. The sale is recorded, then we reply. */
export async function POST(req: Request) {
  const secret = env.sumup.webhookSecret();
  const u = new URL(req.url);
  const given = req.headers.get("x-sumup-secret") ?? u.searchParams.get("secret") ?? "";
  if (!secret || given !== secret) return new NextResponse(null, { status: 401 });
  const notice = readSumupNotice(await req.json().catch(() => null));
  if (notice.type !== "ignore") await applySumupNotice(supabaseAdmin(), notice);
  return new NextResponse(null, { status: 200 });
}
