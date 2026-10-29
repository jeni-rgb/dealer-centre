import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

/** CSV export of a centre's sales. Built day one so a centre can always leave with its data. */
export async function GET(req: Request) {
  const me = await getMe();
  const centreId = new URL(req.url).searchParams.get("centre");
  if (!centreId) return new NextResponse("centre required", { status: 400 });
  if (!me?.is_platform_admin) {
    const { data } = await supabaseAdmin().from("centre_owners").select("centre_id").eq("user_id", me?.id ?? "").eq("centre_id", centreId).maybeSingle();
    if (!data) return new NextResponse("no", { status: 403 });
  }
  const { data: rows } = await supabaseAdmin()
    .from("sales").select("sold_at, amount_pence, payment_type, ticket_no, external_order_id, dealers(name, code), items(title)")
    .eq("centre_id", centreId).is("voided_at", null).order("sold_at");
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = ["sold_at,dealer,code,ticket,title,amount_gbp,payment,square_order"];
  for (const r of rows ?? []) {
    const d = r.dealers as unknown as { name: string; code: string } | null;
    lines.push([r.sold_at, d?.name, d?.code, r.ticket_no, (r.items as unknown as { title: string } | null)?.title, (r.amount_pence / 100).toFixed(2), r.payment_type, r.external_order_id].map(esc).join(","));
  }
  return new NextResponse(lines.join("\n"), { headers: { "content-type": "text/csv", "content-disposition": `attachment; filename="sales-${centreId}.csv"` } });
}
