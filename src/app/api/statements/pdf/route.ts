import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { computeStatement, periodKey } from "@/lib/statements/compute";
import { renderStatementPdf } from "@/lib/statements/pdf";

/** Statement PDF, rendered from the live calculation so it always matches the screen. Dealers get their own; centre owners get any dealer at their centre. */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me) return new NextResponse("sign in", { status: 401 });
  const u = new URL(req.url);
  const centreId = u.searchParams.get("centre") ?? "";
  const period = u.searchParams.get("period") ?? periodKey(new Date());
  let dealerId = u.searchParams.get("dealer") ?? me.dealer_id ?? "";
  if (!/^\d{4}-\d{2}-01$/.test(period) || !centreId) return new NextResponse("bad request", { status: 400 });
  if (dealerId !== me.dealer_id && !me.is_platform_admin) {
    const sb = await supabaseServer();
    const { data: owns } = await sb.from("centre_owners").select("centre_id").eq("centre_id", centreId).maybeSingle();
    if (!owns) return new NextResponse("no", { status: 403 });
  }
  if (!dealerId) return new NextResponse("no dealer", { status: 400 });
  const st = await computeStatement(supabaseAdmin(), dealerId, centreId, period);
  if (!st) return new NextResponse("not found", { status: 404 });
  const bytes = await renderStatementPdf(st);
  return new NextResponse(Buffer.from(bytes), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="statement-${st.dealer.code}-${period.slice(0, 7)}.pdf"` } });
}
