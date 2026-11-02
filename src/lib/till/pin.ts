import crypto from "node:crypto";
import type { Admin } from "@/lib/supabase/server";

/** scrypt with a per centre salt. Stored as "scrypt$<salt>$<hash>". Older sha256 hashes are accepted once and upgraded. */
export function hashPin(centreId: string, pin: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const h = crypto.scryptSync(`${centreId}:${pin}`, salt, 32).toString("hex");
  return `scrypt$${salt}$${h}`;
}

export function newPin() {
  return String(crypto.randomInt(100000, 999999));
}

function verify(centreId: string, pin: string, stored: string) {
  if (stored.startsWith("scrypt$")) {
    const [, salt, h] = stored.split("$");
    const calc = crypto.scryptSync(`${centreId}:${pin}`, salt, 32);
    const want = Buffer.from(h, "hex");
    return calc.length === want.length && crypto.timingSafeEqual(calc, want);
  }
  const legacy = crypto.createHash("sha256").update(`${centreId}:${pin}`).digest();
  const want = Buffer.from(stored, "hex");
  return legacy.length === want.length && crypto.timingSafeEqual(legacy, want);
}

const MAX_FAILURES = 10, LOCK_MINUTES = 15;

/**
 * True if the PIN opens this centre's till. Ten wrong tries from one source locks that source out for 15 minutes.
 * source: the caller's IP (or "unknown").
 */
export async function checkTillPin(db: Admin, centreId: string, pin: string, source = "unknown"): Promise<boolean | "locked"> {
  const { data: att } = await db.from("till_attempts").select("failures, locked_until").eq("centre_id", centreId).eq("source", source).maybeSingle();
  if (att?.locked_until && new Date(att.locked_until) > new Date()) return "locked";
  const { data: centre } = await db.from("centres").select("till_pin_hash").eq("id", centreId).single();
  const ok = !!centre?.till_pin_hash && verify(centreId, pin, centre.till_pin_hash);
  if (ok) {
    if (att) await db.from("till_attempts").delete().eq("centre_id", centreId).eq("source", source);
    if (!centre!.till_pin_hash!.startsWith("scrypt$")) await db.from("centres").update({ till_pin_hash: hashPin(centreId, pin) }).eq("id", centreId);
    return true;
  }
  const failures = (att?.failures ?? 0) + 1;
  await db.from("till_attempts").upsert({ centre_id: centreId, source, failures, locked_until: failures >= MAX_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null, updated_at: new Date().toISOString() }, { onConflict: "centre_id,source" });
  return false;
}

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
