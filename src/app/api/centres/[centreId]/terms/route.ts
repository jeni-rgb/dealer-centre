import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

const Input = z.object({
  commission: z.number().min(0).max(50), online: z.number().min(0).max(50), share: z.number().min(0).max(20),
  handling: z.number().min(0).max(20), rent_day: z.number().int().min(1).max(28), statement_day: z.number().int().min(1).max(28),
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
    commission_bps: Math.round(p.data.commission * 100), online_commission_bps: Math.round(p.data.online * 100), centre_online_share_bps: Math.round(p.data.share * 100),
    handling_fee_pence: Math.round(p.data.handling * 100), rent_day: p.data.rent_day, statement_day: p.data.statement_day,
  }).eq("id", centreId);
  return NextResponse.json({ ok: true });
}
