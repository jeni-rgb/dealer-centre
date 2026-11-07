import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { enqueue } from "@/lib/jobs/queue";
import { canAccessCheck, loadCheck } from "@/lib/stockcheck";

const Input = z.object({ resolution: z.enum(["found_later", "sold_unrecorded", "stolen", "moved", "corrected", "other"]).nullable() });

/**
 * Say what happened to a line. "stolen" also takes the item off sale everywhere (withdrawn, channels closed),
 * so nobody can buy it online. Everything else is a note. null clears the answer.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; lineId: string }> }) {
  const me = await getMe();
  const { id, lineId } = await params;
  const db = supabaseAdmin();
  const check = await loadCheck(db, id);
  if (!check || !(await canAccessCheck(db, me, check.centre_id, check.dealer_id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const { data: line } = await db.from("stock_check_lines").select("id, item_id, outcome").eq("id", lineId).eq("check_id", id).maybeSingle();
  if (!line) return NextResponse.json({ error: "not found" }, { status: 404 });
  await db.from("stock_check_lines").update({ resolution: p.data.resolution, resolved_by: p.data.resolution ? me!.id : null, resolved_at: p.data.resolution ? new Date().toISOString() : null }).eq("id", lineId);
  if (p.data.resolution === "stolen" && line.item_id) {
    const { data: item } = await db.from("items").select("status").eq("id", line.item_id).maybeSingle();
    if (item?.status === "live") {
      await db.from("items").update({ status: "withdrawn" }).eq("id", line.item_id);
      await enqueue(db, "close_item_on_other_channels", { item_id: line.item_id, sold_channel_id: null });
    }
  }
  return NextResponse.json({ ok: true });
}
