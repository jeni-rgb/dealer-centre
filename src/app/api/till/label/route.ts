import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createItem } from "@/lib/items/create";
import crypto from "node:crypto";

const Input = z.object({
  centre_id: z.string().uuid(),
  pin: z.string().min(4).max(8),
  dealer_id: z.string().uuid(),
  title: z.string().min(1).max(120),
  price_pence: z.number().int().min(0),
  ticket_no: z.string().max(12).optional(),
});

/**
 * Quick label from the till. No user login, centre PIN only.
 * Creates the item for the dealer and prints to the centre printer.
 */
export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const { centre_id, pin, dealer_id, title, price_pence, ticket_no } = parsed.data;
  const db = supabaseAdmin();

  const { data: centre } = await db.from("centres").select("till_pin_hash").eq("id", centre_id).single();
  const hash = crypto.createHash("sha256").update(`${centre_id}:${pin}`).digest("hex");
  if (!centre?.till_pin_hash || centre.till_pin_hash !== hash) return NextResponse.json({ error: "wrong PIN" }, { status: 401 });

  const { data: link } = await db.from("dealer_centres").select("id").eq("centre_id", centre_id).eq("dealer_id", dealer_id).is("left_at", null).maybeSingle();
  if (!link) return NextResponse.json({ error: "dealer not at this centre" }, { status: 403 });

  const { data: printer } = await db.from("printers").select("id").eq("owner_type", "centre").eq("owner_id", centre_id).eq("status", "ready").limit(1).maybeSingle();

  const item = await createItem(db, dealer_id, { title, price_pence, centre_id, photos: [], list_on_shopify: false, printer_id: printer?.id ?? null });
  if (ticket_no) await db.from("items").update({ alt_skus: [ticket_no.toUpperCase().replace(/[^A-Z0-9]/g, "")] }).eq("id", item.id);
  return NextResponse.json({ sku: item.sku, item_id: item.id, printed_to: printer?.id ?? null });
}
