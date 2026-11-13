import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { canonicalTicket } from "@/lib/sku";
import { applySumupTransaction } from "@/lib/sumup/sync";

const Input = z.object({ id: z.string().uuid(), ticket: z.string().min(3).max(16) });

/** Staff type the ticket for a SumUp payment the pull could not match. */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "Check the ticket" }, { status: 400 });
  const db = supabaseAdmin();
  const { data: row } = await db.from("sumup_transactions").select("id, connection_id, raw, sumup_id, amount_pence, transaction_code, paid_at, description").eq("id", p.data.id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: conn } = await db.from("sumup_connections").select("id, owner_type, owner_id, merchant_code, access_token, refresh_token, expires_at, synced_at").eq("id", row.connection_id).single();
  if (!conn) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conn.owner_type === "dealer" && conn.owner_id !== me.dealer_id && !me.is_platform_admin) return NextResponse.json({ error: "Not yours" }, { status: 403 });
  if (conn.owner_type === "centre" && !me.is_platform_admin) {
    const { data: own } = await db.from("centre_owners").select("centre_id").eq("centre_id", conn.owner_id).eq("user_id", me.id).maybeSingle();
    if (!own) return NextResponse.json({ error: "Not your centre" }, { status: 403 });
  }
  const ticket = canonicalTicket(p.data.ticket);
  const raw = (row.raw ?? {}) as { amount?: number; timestamp?: string; transaction_code?: string };
  await applySumupTransaction(db, conn, {
    id: row.sumup_id,
    amount: raw.amount ?? row.amount_pence / 100,
    timestamp: row.paid_at ?? undefined,
    transaction_code: row.transaction_code ?? undefined,
    product_summary: ticket,
    status: "SUCCESSFUL",
  }, ticket);
  return NextResponse.json({ ok: true });
}
