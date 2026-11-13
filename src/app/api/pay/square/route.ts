import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { finishReaderPayment } from "@/lib/pay/finish";

/** Square Point of Sale returns here. iOS sends a data JSON. Android sends query fields. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  let token = u.searchParams.get("state") ?? "";
  let status = u.searchParams.get("status") ?? "";
  let ref = u.searchParams.get("transaction_id") ?? u.searchParams.get("client_transaction_id");
  const data = u.searchParams.get("data");
  if (data) {
    try {
      const parsed = JSON.parse(data) as { state?: string; status?: string; transaction_id?: string };
      token = parsed.state ?? token;
      status = parsed.status ?? status;
      ref = parsed.transaction_id ?? ref;
    } catch { /* keep the query fields */ }
  }
  const origin = u.origin;
  const failed = status && !/ok|success/i.test(status);
  if (failed || !token) return NextResponse.redirect(new URL("/app", origin));
  const done = await finishReaderPayment(supabaseAdmin(), token, ref);
  const next = done.itemId ? `/app/items/${done.itemId}` : "/app";
  return NextResponse.redirect(new URL(next, origin));
}
