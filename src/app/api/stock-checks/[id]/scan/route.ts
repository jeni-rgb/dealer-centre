import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { canAccessCheck, loadCheck, recordScan } from "@/lib/stockcheck";

export const dynamic = "force-dynamic";
const Input = z.object({ raw: z.string().min(1).max(64) });

/** One scan. Returns what it is so the screen can beep and colour it. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  const { id } = await params;
  const db = supabaseAdmin();
  const check = await loadCheck(db, id);
  if (!check || !(await canAccessCheck(db, me, check.centre_id, check.dealer_id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (check.status !== "open") return NextResponse.json({ error: "This check is finished" }, { status: 409 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  return NextResponse.json(await recordScan(db, check, p.data.raw));
}
