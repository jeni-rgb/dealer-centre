import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { finishReaderPayment } from "@/lib/pay/finish";

/** Zettle may return here. If it does not, the dealer confirms on the item. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const token = u.searchParams.get("t") ?? u.searchParams.get("reference") ?? "";
  const ref = u.searchParams.get("reference") ?? token;
  const origin = u.origin;
  const done = token ? await finishReaderPayment(supabaseAdmin(), token, ref) : { ok: false };
  const next = done.itemId ? `/app/items/${done.itemId}` : "/app";
  return NextResponse.redirect(new URL(next, origin));
}
