import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

const Input = z.object({
  from: z.string().min(2).max(80),
  to: z.string().min(2).max(80),
  qty: z.number().int().min(1).max(200),
});

const placeId = (v: string) => v === "home" ? null : v;

/** Move a number of one stock line from one place to another. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const { id } = await params;
  const p = Input.safeParse(await req.json().catch(() => null));
  if (!p.success || p.data.from === p.data.to) return NextResponse.json({ error: "Pick two places and a number" }, { status: 400 });
  const db = supabaseAdmin();
  const { data: item } = await db.from("items").select("id, dealer_id").eq("id", id).eq("dealer_id", me.dealer_id).maybeSingle();
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const from = placeId(p.data.from);
  const to = placeId(p.data.to);
  const centreIds = [from, to].filter((x): x is string => !!x);
  if (centreIds.length) {
    const { data: links } = await db.from("dealer_centres").select("centre_id").eq("dealer_id", me.dealer_id).is("left_at", null).in("centre_id", centreIds);
    if ((links ?? []).length !== new Set(centreIds).size) return NextResponse.json({ error: "Not your centre" }, { status: 403 });
  }
  const { data: rows } = await db.from("item_places").select("id, centre_id, qty").eq("item_id", id);
  const src = (rows ?? []).find((r) => (r.centre_id ?? null) === from);
  if (!src || src.qty < p.data.qty) return NextResponse.json({ error: "Not enough there" }, { status: 400 });
  await db.from("item_places").update({ qty: src.qty - p.data.qty }).eq("id", src.id);
  const dst = (rows ?? []).find((r) => (r.centre_id ?? null) === to);
  if (dst) await db.from("item_places").update({ qty: dst.qty + p.data.qty }).eq("id", dst.id);
  else await db.from("item_places").insert({ item_id: id, centre_id: to, qty: p.data.qty });
  return NextResponse.json({ ok: true });
}
