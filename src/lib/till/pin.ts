import crypto from "node:crypto";
import type { Admin } from "@/lib/supabase/server";

/** True if the PIN opens this centre's till. */
export async function checkTillPin(db: Admin, centreId: string, pin: string) {
  const { data: centre } = await db.from("centres").select("till_pin_hash").eq("id", centreId).single();
  const hash = crypto.createHash("sha256").update(`${centreId}:${pin}`).digest("hex");
  return !!centre?.till_pin_hash && centre.till_pin_hash === hash;
}
