import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { newPin, setTillPin } from "@/lib/till/pin";

/** Owner resets the till PIN. The new PIN is returned once and never stored readable. */
export async function POST(_req: Request, { params }: { params: Promise<{ centreId: string }> }) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const { centreId } = await params;
  const sb = await supabaseServer();
  const { data: owns } = await sb.from("centre_owners").select("centre_id").eq("centre_id", centreId).maybeSingle();
  if (!owns && !me.is_platform_admin) return NextResponse.json({ error: "not your centre" }, { status: 403 });
  const pin = newPin();
  try { await setTillPin(supabaseAdmin(), centreId, pin); } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }
  await supabaseAdmin().from("till_attempts").delete().eq("centre_id", centreId);
  return NextResponse.json({ pin });
}
