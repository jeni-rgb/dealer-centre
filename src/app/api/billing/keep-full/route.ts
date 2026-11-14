import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

/** After Keep Full, when the free 25 still cover every label. Buy more, or load your own stock. */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.redirect(new URL("/signin", env.appUrl()));
  const url = new URL(req.url);
  const db = supabaseAdmin();
  if (url.searchParams.get("choice") === "self") {
    await db.from("dealers").update({ listing_mode: "self", full_labels_choice: "self" }).eq("id", me.dealer_id);
    return NextResponse.redirect(new URL("/api/billing/checkout", env.appUrl()));
  }
  const qty = Number(url.searchParams.get("qty"));
  if (!Number.isInteger(qty) || qty < 1 || qty > 5000) return NextResponse.redirect(new URL("/app/settings?step=who-labels", env.appUrl()));
  await db.from("dealers").update({ listing_mode: "staff" }).eq("id", me.dealer_id);
  const next = encodeURIComponent("/api/billing/after-labels");
  return NextResponse.redirect(new URL(`/api/billing/tokens?qty=${qty}&next=${next}`, env.appUrl()));
}
