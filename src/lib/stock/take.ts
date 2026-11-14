import type { Admin } from "@/lib/supabase/server";
import { afterSale } from "@/lib/invoices/lines";
import { takeOnePlace, type PlaceQty } from "./places";

/** Take one from the place that sold it. A centre sale never touches Home or another centre. */
export async function takeOneAt(db: Admin, itemId: string, centreId: string | null, soldAt: string): Promise<{ soldOut: boolean }> {
  const { data: rows } = await db.from("item_places").select("id, centre_id, qty").eq("item_id", itemId);
  const places = (rows ?? []) as { id: string; centre_id: string | null; qty: number }[];
  if (!places.length) {
    const { data: item } = await db.from("items").select("qty").eq("id", itemId).maybeSingle();
    const next = afterSale(typeof item?.qty === "number" ? item.qty : 1);
    await db.from("items").update(next.soldOut ? { qty: 0, status: "sold", sold_at: soldAt } : { qty: next.qty }).eq("id", itemId).eq("status", "live");
    return { soldOut: next.soldOut };
  }
  const held: PlaceQty[] = places.map((p) => ({ centreId: p.centre_id, qty: p.qty }));
  const next = takeOnePlace(held, centreId);
  const src = places.find((p) => (p.centre_id ?? null) === centreId);
  if (next.taken && src) await db.from("item_places").update({ qty: src.qty - 1 }).eq("id", src.id);
  const soldOut = next.total <= 0;
  await db.from("items").update(soldOut ? { qty: 0, status: "sold", sold_at: soldAt } : { qty: next.total }).eq("id", itemId);
  return { soldOut };
}

/** Put one back where the voided sale came from. A blank centre is Home. */
export async function giveOneBack(db: Admin, itemId: string, centreId: string | null) {
  const { data: rows } = await db.from("item_places").select("id, centre_id, qty").eq("item_id", itemId);
  const places = (rows ?? []) as { id: string; centre_id: string | null; qty: number }[];
  if (!places.length) {
    const { data: item } = await db.from("items").select("qty, qty_start, status").eq("id", itemId).maybeSingle();
    const start = typeof item?.qty_start === "number" ? item.qty_start : 1;
    const qty = Math.min(start, (typeof item?.qty === "number" ? item.qty : 0) + 1);
    await db.from("items").update({ qty, status: "live", sold_at: null }).eq("id", itemId);
    return item?.status === "sold";
  }
  const src = places.find((p) => (p.centre_id ?? null) === centreId);
  if (src) await db.from("item_places").update({ qty: src.qty + 1 }).eq("id", src.id);
  else await db.from("item_places").insert({ item_id: itemId, centre_id: centreId, qty: 1 });
  const total = places.reduce((a, p) => a + p.qty, 0) + 1;
  const { data: item } = await db.from("items").select("status").eq("id", itemId).maybeSingle();
  await db.from("items").update({ qty: total, status: "live", sold_at: null }).eq("id", itemId);
  return item?.status === "sold";
}
