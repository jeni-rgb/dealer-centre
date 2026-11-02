import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { computeStatement, issueStatement } from "@/lib/statements/compute";

const Input = z.object({ dealer_id: z.string().uuid(), period: z.string().regex(/^\d{4}-\d{2}-01$/), paid: z.boolean() });

/** Centre marks a dealer's statement paid (or not). Issues the row first if month end has not run yet. */
export async function PATCH(req: Request, { params }: { params: Promise<{ centreId: string }> }) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const { centreId } = await params;
  const sb = await supabaseServer();
  const { data: owns } = await sb.from("centre_owners").select("centre_id").eq("centre_id", centreId).maybeSingle();
  if (!owns && !me.is_platform_admin) return NextResponse.json({ error: "not your centre" }, { status: 403 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();
  const st = await computeStatement(db, p.data.dealer_id, centreId, p.data.period);
  if (!st) return NextResponse.json({ error: "not found" }, { status: 404 });
  await issueStatement(db, st);
  const { error } = await db.from("statements").update({ paid_at: p.data.paid ? new Date().toISOString() : null, status: p.data.paid ? "paid" : "issued" })
    .eq("dealer_id", p.data.dealer_id).eq("centre_id", centreId).eq("period", p.data.period);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
