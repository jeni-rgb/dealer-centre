import { Resend } from "resend";
import { env } from "@/lib/env";
import type { Admin } from "@/lib/supabase/server";
import { displaySku } from "@/lib/sku";
import { pushToDealer } from "@/lib/push/send";

/**
 * Sale notification: a push to every device the dealer turned notifications on in, and an email
 * to every user on the dealer account. Same words in both.
 */
export async function sendSaleNotification(
  db: Admin,
  p: { item_id: string | null; dealer_id: string; amount_pence?: number; ticket_no?: string | null },
) {
  const { data: users } = await db.from("users").select("email").eq("dealer_id", p.dealer_id);
  if (!users?.length) return;

  let line: string;
  if (p.item_id) {
    const { data: item } = await db.from("items").select("title, price_pence, sku, centre_id, centres(name)").eq("id", p.item_id).single();
    const where = (item?.centres as unknown as { name: string } | null)?.name ?? "online";
    line = `Sold: ${item?.title}, £${((item?.price_pence ?? 0) / 100).toFixed(2)}, ${displaySku(item?.sku ?? "")}, at ${where}`;
  } else {
    line = `Sold: ticket ${p.ticket_no ? displaySku(p.ticket_no) : "unknown"}, £${((p.amount_pence ?? 0) / 100).toFixed(2)}, at the till`;
  }
  const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

  await pushToDealer(db, p.dealer_id, { title: line.split(", ")[0], body: `${line.split(", ").slice(1).join(", ")}, ${time}`, url: p.item_id ? `/app/items/${p.item_id}` : "/app/stock?f=sold", tag: `sale-${p.item_id ?? p.ticket_no ?? time}` }).catch((e) => console.error("[push]", e));

  if (!process.env.RESEND_API_KEY) {
    console.log("[notify]", line, time);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: env.emailFrom(),
    to: users.map((u) => u.email),
    subject: line,
    text: `${line}, ${time}.\n\nOpen Dealer Centre to see today's total.`,
  });
}
