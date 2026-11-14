import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { startTaster } from "@/lib/billing/taster";

/** Every new dealer starts 14 days of Full here. No card. */
export async function POST() {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "Set up your business first." }, { status: 400 });
  try {
    const started = await startTaster(supabaseAdmin(), me.dealer_id);
    return NextResponse.json({ ok: true, until: started.until, already: started.already });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
