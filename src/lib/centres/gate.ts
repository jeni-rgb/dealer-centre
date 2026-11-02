import type { Admin } from "@/lib/supabase/server";

/** Several centres on one account is a Pro plan feature. Returns a message if this dealer cannot add another. */
export async function secondCentreBlocked(db: Admin, dealerId: string, centreId?: string): Promise<string | null> {
  const { data: links } = await db.from("dealer_centres").select("centre_id").eq("dealer_id", dealerId).is("left_at", null).in("status", ["active", "pending"]);
  const others = (links ?? []).filter((l) => l.centre_id !== centreId);
  if (others.length === 0) return null;
  const { data: dealer } = await db.from("dealers").select("monthly_sold_limit, plan").eq("id", dealerId).single();
  if ((dealer?.monthly_sold_limit ?? 0) >= 100000) return null;
  return "Selling at more than one centre is on the Pro plan (£150 a month + VAT). Upgrade in Settings, then add the centre.";
}
