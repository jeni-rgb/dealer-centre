import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { finishReaderPayment } from "@/lib/pay/finish";

/** SumUp app returns here. A failed payment is not recorded. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const token = u.searchParams.get("t") ?? u.searchParams.get("foreign-tx-id") ?? "";
  const status = u.searchParams.get("smp-status") ?? "";
  const ref = u.searchParams.get("smp-tx-code");
  const origin = u.origin;
  if (status && status !== "success") return NextResponse.redirect(new URL("/app", origin));
  const done = token ? await finishReaderPayment(supabaseAdmin(), token, ref) : { ok: false };
  const next = done.itemId ? `/app/items/${done.itemId}` : "/app";
  return NextResponse.redirect(new URL(next, origin));
}
