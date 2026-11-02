import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { squareClient } from "@/lib/channels/square";
import type { ChannelRow } from "@/lib/channels/types";

const Patch = z.object({
  square_category_id: z.string().nullable().optional(),
  create_square_category: z.boolean().optional(),
  pitch_numbers: z.array(z.string()).optional(),
  rent_pence: z.number().int().min(0).optional(),
  rent_mode: z.enum(["rent", "commission_only"]).optional(),
  rent_schedule: z.enum(["first", "fifteenth", "last", "weekly_friday", "weekly_monday", "quarterly"]).optional(),
  status: z.enum(["active", "pending", "declined"]).optional(),
});

/** Centre owner edits a dealer's link: category mapping, pitches, rent, approval. */
export async function PATCH(req: Request, { params }: { params: Promise<{ centreId: string; linkId: string }> }) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const { centreId, linkId } = await params;
  const sb = await supabaseServer();
  const { data: owns } = await sb.from("centre_owners").select("centre_id").eq("centre_id", centreId).maybeSingle();
  if (!owns && !me.is_platform_admin) return NextResponse.json({ error: "not your centre" }, { status: 403 });
  const p = Patch.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: link } = await db.from("dealer_centres").select("*, dealers(name, code)").eq("id", linkId).eq("centre_id", centreId).single();
  if (!link) return NextResponse.json({ error: "not found" }, { status: 404 });

  const upd: Record<string, unknown> = {};
  if (p.data.pitch_numbers) upd.pitch_numbers = p.data.pitch_numbers;
  if (p.data.rent_pence !== undefined) { upd.rent_pence = p.data.rent_pence; upd.rent_set_by = "centre"; }
  if (p.data.rent_mode) { upd.rent_mode = p.data.rent_mode; upd.rent_set_by = "centre"; }
  if (p.data.rent_schedule) { upd.rent_schedule = p.data.rent_schedule; upd.rent_set_by = "centre"; }
  if (p.data.square_category_id !== undefined) upd.square_category_id = p.data.square_category_id;
  if (p.data.status) { upd.status = p.data.status; if (p.data.status === "active" && !link.joined_at) upd.joined_at = new Date().toISOString(); if (p.data.status === "declined") upd.left_at = new Date().toISOString(); }

  // Create the dealer's category and a variable price catch all item in Square in one go.
  if (p.data.create_square_category) {
    const { data: ch } = await db.from("channels").select("*").eq("owner_type", "centre").eq("owner_id", centreId).eq("type", "square").eq("status", "active").maybeSingle();
    if (!ch) return NextResponse.json({ error: "Square not connected" }, { status: 400 });
    const c = squareClient((ch as ChannelRow).access_token!);
    const d = link.dealers as unknown as { name: string; code: string };
    const label = `${d.code} ${d.name}`;
    const r = await c.catalog.batchUpsert({
      idempotencyKey: `cat-${linkId}-${Date.now()}`,
      batches: [{
        objects: [
          { type: "CATEGORY", id: "#cat", presentAtAllLocations: true, categoryData: { name: label } },
          {
            type: "ITEM", id: "#item", presentAtAllLocations: true,
            itemData: {
              name: `${d.code} sale`, categoryId: "#cat",
              variations: [{ type: "ITEM_VARIATION", id: "#var", itemVariationData: { itemId: "#item", name: "Enter price", sku: `${d.code}-TILL`, pricingType: "VARIABLE_PRICING" } }],
            },
          },
        ],
      }],
    });
    const map = r.idMappings ?? [];
    upd.square_category_id = map.find((m) => m.clientObjectId === "#cat")?.objectId ?? null;
    upd.square_catchall_item_id = map.find((m) => m.clientObjectId === "#item")?.objectId ?? null;
    upd.square_catchall_variation_id = map.find((m) => m.clientObjectId === "#var")?.objectId ?? null;
  }

  await db.from("dealer_centres").update(upd).eq("id", linkId);

  // Approval: anything the dealer listed while waiting now belongs to this centre, so End of day can find the tickets.
  if (p.data.status === "active") {
    const { data: moved } = await db.from("items").update({ centre_id: centreId }).eq("dealer_id", link.dealer_id).is("centre_id", null).eq("status", "live").select("id");
    const { data: centreChannels } = await db.from("channels").select("id").eq("owner_type", "centre").eq("owner_id", centreId).eq("type", "square").eq("status", "active");
    if (moved?.length && centreChannels?.length) {
      const { enqueue } = await import("@/lib/jobs/queue");
      for (const it of moved) for (const ch of centreChannels) {
        const { data: l } = await db.from("item_listings").upsert({ item_id: it.id, channel_id: ch.id, status: "pending" }, { onConflict: "item_id,channel_id", ignoreDuplicates: true }).select("id").maybeSingle();
        if (l) await enqueue(db, "sync_item_to_channel", { listing_id: l.id });
      }
    }
  }
  return NextResponse.json({ ok: true, ...upd });
}
