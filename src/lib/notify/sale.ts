import { env } from "@/lib/env";
import type { Admin } from "@/lib/supabase/server";
import { displaySku } from "@/lib/sku";
import { pushToDealer } from "@/lib/push/send";
import { saleLetter } from "@/lib/email/letters";
import { sendBranded } from "@/lib/email/send";

/**
 * Sale notification: a push to every device the dealer turned notifications on in, and an email
 * to every user on the dealer account. Same words in both.
 */
export async function sendSaleNotification(
  db: Admin,
  p: { item_id: string | null; dealer_id: string; amount_pence?: number; ticket_no?: string | null; online?: boolean },
) {
  const { data: users } = await db.from("users").select("email").eq("dealer_id", p.dealer_id);
  if (!users?.length) return;

  let title = "Sale";
  let amount = `£${((p.amount_pence ?? 0) / 100).toFixed(2)}`;
  let ticket = p.ticket_no ? displaySku(p.ticket_no) : "No ticket";
  let place = "At the till";
  if (p.item_id) {
    const { data: item } = await db.from("items").select("title, price_pence, sku, centres(name)").eq("id", p.item_id).single();
    title = item?.title ?? "Sale";
    amount = `£${((item?.price_pence ?? p.amount_pence ?? 0) / 100).toFixed(2)}`;
    ticket = displaySku(item?.sku ?? p.ticket_no ?? "");
    const centre = (item?.centres as unknown as { name: string } | null)?.name;
    place = centre ? `at ${centre}` : p.online ? "Your Shopify" : "At the till";
  }
  const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
  const href = `${env.appUrl()}${p.item_id ? `/app/items/${p.item_id}` : "/app"}`;
  const letter = saleLetter({ title, amount, ticket, place, when: time, href, centreName: place.replace(/^at /, "") });

  await pushToDealer(db, p.dealer_id, { title: `Sold. ${title}`, body: `${amount}, ${place}, ${time}`, url: p.item_id ? `/app/items/${p.item_id}` : "/app", tag: `sale-${p.item_id ?? ticket}` }).catch((e) => console.error("[push]", e));

  const sent = await sendBranded(users.map((u) => u.email), letter);
  if (sent === "skipped") console.log("[notify]", letter.subject);
}
