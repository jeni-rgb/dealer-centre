import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { dealerWithListing } from "@/lib/billing/tokens";
import { namedSales } from "@/lib/billing/pricing";

const Input = z.object({
  weekly_goal_pounds: z.number().min(0).max(1000000).optional(),
  export_token: z.enum(["new", "stop"]).optional(),
});

/** Save a weekly goal, or turn the private export link on or off. */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const dealer = await dealerWithListing(supabaseAdmin(), me.dealer_id, "plan");
  if (!dealer || !namedSales(dealer)) return NextResponse.json({ error: "Full" }, { status: 403 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();
  if (p.data.weekly_goal_pounds !== undefined) {
    const { error } = await db.from("dealers").update({ weekly_goal_pence: Math.round(p.data.weekly_goal_pounds * 100) }).eq("id", me.dealer_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (p.data.export_token) {
    const token = p.data.export_token === "new" ? randomBytes(18).toString("hex") : null;
    const { error } = await db.from("dealers").update({ export_token: token }).eq("id", me.dealer_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, export_token: token });
  }
  return NextResponse.json({ ok: true });
}
