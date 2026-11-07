import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

const Input = z.object({ mode: z.enum(["self", "staff"]) });

/** Who lists the stock. Saved before the card step. */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "Set up your business first." }, { status: 400 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "Choose who lists the stock." }, { status: 400 });
  const db = supabaseAdmin();
  const { data: dealer } = await db.from("dealers").select("listing_mode, card_added_at, listing_tokens_bought").eq("id", me.dealer_id).single();
  if (dealer?.listing_mode && dealer.listing_mode !== p.data.mode && (dealer.card_added_at || (dealer.listing_tokens_bought ?? 0) > 0)) {
    return NextResponse.json({ error: "That choice is already saved." }, { status: 400 });
  }
  const { error } = await db.from("dealers").update({ listing_mode: p.data.mode }).eq("id", me.dealer_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
