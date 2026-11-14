import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { applyBasicChoice } from "@/lib/billing/taster";

/** After the 14 days, the dealer stays on Basic. Full is the Stripe checkout. Labels are not charged here. */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const p = z.object({ choice: z.literal("basic") }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Choose Basic or Full." }, { status: 400 });
  const db = supabaseAdmin();
  const { data: dealer } = await db.from("dealers").select("billing_model, taster_accepted_at, taster_ends_at").eq("id", me.dealer_id).single();
  if (!dealer?.taster_accepted_at || !dealer.taster_ends_at) return NextResponse.json({ error: "Start the taster first." }, { status: 400 });
  if (dealer.billing_model === "full") return NextResponse.json({ error: "You are on Full." }, { status: 400 });
  if (new Date(dealer.taster_ends_at).getTime() > Date.now()) return NextResponse.json({ error: "Your 14 days are still running." }, { status: 400 });
  try {
    await applyBasicChoice(db, me.dealer_id);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
