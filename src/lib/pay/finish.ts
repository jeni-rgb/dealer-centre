import type { Admin } from "@/lib/supabase/server";
import { recordSale } from "@/lib/sales/record";
import type { ChannelRow } from "@/lib/channels/types";

/** A fair or away sale. The dealer's own channel, so it is not on a centre statement. */
export async function finishReaderPayment(db: Admin, token: string, reference: string | null): Promise<{ ok: boolean; itemId?: string }> {
  const { data: pay } = await db.from("reader_payments").select("id, dealer_id, item_id, amount_pence, status").eq("token", token).maybeSingle();
  if (!pay) return { ok: false };
  if (pay.status === "paid") return { ok: true, itemId: pay.item_id };
  const { data: item } = await db.from("items").select("id, sku, status").eq("id", pay.item_id).eq("dealer_id", pay.dealer_id).maybeSingle();
  if (!item || item.status === "sold") {
    await db.from("reader_payments").update({ status: "paid", reference }).eq("id", pay.id);
    return { ok: true, itemId: pay.item_id };
  }
  const { data: chId } = await db.rpc("ensure_dealer_manual_channel", { p_dealer_id: pay.dealer_id });
  const { data: channel } = await db.from("channels").select("*").eq("id", chId).single();
  await recordSale(db, channel as ChannelRow, {
    external_order_id: `reader-${token}`,
    external_line_id: "1",
    external_variant_id: null,
    external_item_id: null,
    sku: item.sku,
    category_id: null,
    note: null,
    amount_pence: pay.amount_pence,
    fees_pence: 0,
    payment_type: "CARD",
    sold_at: new Date().toISOString(),
    raw: { source: "reader", reference },
  });
  await db.from("reader_payments").update({ status: "paid", reference }).eq("id", pay.id);
  return { ok: true, itemId: item.id };
}
