import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { canAccessCheck, finishCheck, loadCheck } from "@/lib/stockcheck";

/** Finish: compare scans with what should be on the floor and write the result. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  const { id } = await params;
  const db = supabaseAdmin();
  const check = await loadCheck(db, id);
  if (!check || !(await canAccessCheck(db, me, check.centre_id, check.dealer_id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  await finishCheck(db, check);
  return NextResponse.json({ ok: true });
}
