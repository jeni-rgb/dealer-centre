import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { dealerWithListing } from "@/lib/billing/tokens";
import { namedSales } from "@/lib/billing/pricing";
import { feedRows, toCsv, type FeedKind } from "@/lib/full/export-data";

/** Download this dealer's sales or stock. Full and an active taster only. */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return new NextResponse("sign in", { status: 401 });
  const dealer = await dealerWithListing(supabaseAdmin(), me.dealer_id, "plan");
  if (!dealer || !namedSales(dealer)) return new NextResponse("Full", { status: 403 });
  const url = new URL(req.url);
  const kind: FeedKind = url.searchParams.get("kind") === "stock" ? "stock" : "sales";
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;
  const rows = await feedRows(supabaseAdmin(), me.dealer_id, kind, from, to);
  return new NextResponse(toCsv(rows), { headers: { "content-type": "text/csv", "content-disposition": `attachment; filename="${kind}.csv"` } });
}
