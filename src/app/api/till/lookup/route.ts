import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkTillPin } from "@/lib/till/pin";
import { normaliseSku, ticketCandidates } from "@/lib/sku";

export const dynamic = "force-dynamic";

/** Till screen ticket lookup. PIN instead of a login. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const centreId = u.searchParams.get("centre") ?? ""; const pin = u.searchParams.get("pin") ?? ""; const raw = u.searchParams.get("ticket") ?? "";
  const db = supabaseAdmin();
  if (!centreId || !(await checkTillPin(db, centreId, pin))) return NextResponse.json({ error: "wrong PIN" }, { status: 401 });
  if (normaliseSku(raw).length < 3) return NextResponse.json({ item: null });
  const cands = ticketCandidates(raw);
  const { data } = await db.from("items").select("id, sku, title, price_pence, status, dealers(name, code)").eq("centre_id", centreId).in("sku", cands);
  const item = cands.map((c) => (data ?? []).find((i) => i.sku === c)).find(Boolean) ?? null;
  // Unknown ticket: still tell the till which dealer the code belongs to
  let dealer: { name: string; code: string } | null = item ? (item.dealers as unknown as { name: string; code: string }) : null;
  if (!item) {
    const prefix = normaliseSku(raw).match(/^([A-Z][A-Z0-9]{1,3}?)\d{1,4}$/)?.[1];
    if (prefix) {
      const { data: link } = await db.from("dealer_centres").select("dealers!inner(name, code)").eq("centre_id", centreId).is("left_at", null).eq("dealers.code", prefix).maybeSingle();
      dealer = (link?.dealers as unknown as { name: string; code: string } | null) ?? null;
    }
  }
  return NextResponse.json({ item: item ? { id: item.id, sku: item.sku, title: item.title, price_pence: item.price_pence, status: item.status } : null, dealer, ticket: item?.sku ?? cands[cands.length - 1] });
}
