import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

const Input = z.object({
  commission: z.number().min(0).max(50), rent_day: z.number().int().min(1).max(28), statement_day: z.number().int().min(1).max(28),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ centreId: string }> }) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const { centreId } = await params;
  const sb = await supabaseServer();
  const { data: owns } = await sb.from("centre_owners").select("centre_id").eq("centre_id", centreId).maybeSingle();
  if (!owns && !me.is_platform_admin) return NextResponse.json({ error: "no" }, { status: 403 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  await supabaseAdmin().from("centres").update({
    // Online commission is fixed at 20% (15% Dealer Centre, 5% the centre) and is not editable here.
    commission_bps: Math.round(p.data.commission * 100), rent_day: p.data.rent_day, statement_day: p.data.statement_day,
  }).eq("id", centreId);
  return NextResponse.json({ ok: true });
}
