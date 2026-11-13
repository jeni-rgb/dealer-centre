import type { Admin } from "@/lib/supabase/server";
import { pushToDealer } from "@/lib/push/send";
import { displaySku } from "@/lib/sku";
import { missingLetter } from "@/lib/email/letters";
import { sendBranded } from "@/lib/email/send";

/** The runner could not find a sold item. Tell the centre owners and the dealer, so someone looks before the buyer is let down. */
export async function notifyMissing(db: Admin, saleId: string) {
  const { data: s } = await db.from("sales").select("id, dealer_id, centre_id, ticket_no, amount_pence, items(title), centres(name)").eq("id", saleId).single();
  if (!s) return;
  const title = (s.items as unknown as { title: string } | null)?.title ?? "an item";
  const ticket = s.ticket_no ? displaySku(s.ticket_no) : "no ticket";
  const centreName = (s.centres as unknown as { name: string } | null)?.name ?? "the centre";
  const amount = `£${(s.amount_pence / 100).toFixed(2)}`;
  const letter = missingLetter({ title, ticket, amount, centreName });
  const to = new Set<string>();
  if (s.centre_id) {
    const { data: owners } = await db.from("centre_owners").select("users(email)").eq("centre_id", s.centre_id);
    for (const o of owners ?? []) { const e = (o.users as unknown as { email: string } | null)?.email; if (e) to.add(e); }
  }
  if (s.dealer_id) {
    const { data: users } = await db.from("users").select("email").eq("dealer_id", s.dealer_id);
    for (const u of users ?? []) to.add(u.email);
    await pushToDealer(db, s.dealer_id, { title: "Not on the shelf", body: `${title}, ${ticket}, ${centreName}`, url: "/app/stock?f=sold", tag: `missing-${saleId}` }).catch(() => {});
  }
  const sent = await sendBranded(Array.from(to), letter);
  if (sent === "skipped") console.log("[missing]", letter.subject, Array.from(to));
}
