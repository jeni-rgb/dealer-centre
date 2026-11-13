import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { namedSales } from "@/lib/billing/pricing";
import { feedRows, toCsv, type FeedKind } from "@/lib/full/export-data";

/** Private read only feed. The token is the only key. Stop it from Account or the desk. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 16) return new NextResponse("no", { status: 404 });
  const db = supabaseAdmin();
  const { data: dealer } = await db.from("dealers").select("id, plan, billing_model, taster_accepted_at, taster_ends_at, trial_ends_at").eq("export_token", token).maybeSingle();
  if (!dealer || !namedSales(dealer)) return new NextResponse("no", { status: 404 });
  const url = new URL(req.url);
  const kind: FeedKind = url.searchParams.get("kind") === "stock" ? "stock" : "sales";
  const rows = await feedRows(db, dealer.id, kind, url.searchParams.get("from") || undefined, url.searchParams.get("to") || undefined);
  if (url.searchParams.get("format") === "json") return NextResponse.json({ kind, rows });
  return new NextResponse(toCsv(rows), { headers: { "content-type": "text/csv", "content-disposition": `inline; filename="${kind}.csv"` } });
}
