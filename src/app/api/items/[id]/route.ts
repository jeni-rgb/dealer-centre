import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { enqueue } from "@/lib/jobs/queue";

const Patch = z.object({
  price_pence: z.number().int().min(0).optional(),
  title: z.string().min(2).max(120).optional(),
  status: z.enum(["withdrawn", "live"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const { id } = await params;
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();
  const { data: item } = await db.from("items").select("id, status").eq("id", id).eq("dealer_id", me.dealer_id).maybeSingle();
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

  const upd: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.price_pence !== undefined || parsed.data.title !== undefined) upd.price_source = "app";
  await db.from("items").update(upd).eq("id", id);

  if (parsed.data.status === "withdrawn") {
    await enqueue(db, "close_item_on_other_channels", { item_id: id, sold_channel_id: null });
  } else if (parsed.data.status === "live" && item.status === "withdrawn") {
    await enqueue(db, "reopen_item_on_channels", { item_id: id });
  } else if (parsed.data.price_pence !== undefined || parsed.data.title !== undefined) {
    const { data: listings } = await db.from("item_listings").select("id").eq("item_id", id).eq("status", "live");
    for (const l of listings ?? []) {
      await db.from("item_listings").update({ status: "pending" }).eq("id", l.id);
      await enqueue(db, "sync_item_to_channel", { listing_id: l.id });
    }
  }
  return NextResponse.json({ ok: true });
}
