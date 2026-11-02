import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { enqueue } from "@/lib/jobs/queue";

/** Phase 2: push every live item at the centre to its Square till (and centre shop) without re-adding. */
export async function POST(_req: Request, { params }: { params: Promise<{ centreId: string }> }) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const { centreId } = await params;
  const sb = await supabaseServer();
  const { data: owns } = await sb.from("centre_owners").select("centre_id").eq("centre_id", centreId).maybeSingle();
  if (!owns && !me.is_platform_admin) return NextResponse.json({ error: "no" }, { status: 403 });
  const db = supabaseAdmin();
  const { data: channels } = await db.from("channels").select("id, type").eq("owner_type", "centre").eq("owner_id", centreId).eq("status", "active").neq("type", "manual");
  // Re-queue failed and pending listings too, so a mapping fix flows through
  const { data: items } = await db.from("items").select("id").eq("centre_id", centreId).eq("status", "live");
  const ids = (items ?? []).map((i) => i.id);
  if (ids.length) {
    const { data: stuck } = await db.from("item_listings").select("id").in("item_id", ids).in("status", ["pending", "failed"]);
    for (const l of stuck ?? []) await enqueue(db, "sync_item_to_channel", { listing_id: l.id });
  }
  for (const c of channels ?? []) await enqueue(db, "backfill_channel", { channel_id: c.id });
  return NextResponse.json({ channels: (channels ?? []).length, items: ids.length });
}
