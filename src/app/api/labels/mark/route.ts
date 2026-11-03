import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Marks the dealer's labels for these items as printed (after share, AirPrint, PDF, or by hand). */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const p = z.object({ item_ids: z.array(z.string().uuid()).min(1).max(200) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const { error } = await supabaseAdmin().from("print_jobs").update({ status: "printed", updated_at: new Date().toISOString() })
    .eq("dealer_id", me.dealer_id).in("item_id", p.data.item_ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
