import crypto from "node:crypto";
import type { Admin } from "@/lib/supabase/server";

/** scrypt with a per centre salt. Stored as "scrypt$<salt>$<hash>". Older sha256 hashes are accepted once and upgraded. */
export function hashPin(centreId: string, pin: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const h = crypto.scryptSync(`${centreId}:${pin}`, salt, 32).toString("hex");
  return `scrypt$${salt}$${h}`;
}

/** Store (or replace) a centre's PIN hash. Only ever called with the service role. */
export async function setTillPin(db: Admin, centreId: string, pin: string) {
  const { error } = await db.from("centre_till_pins").upsert({ centre_id: centreId, pin_hash: hashPin(centreId, pin), updated_at: new Date().toISOString() }, { onConflict: "centre_id" });
  if (error) throw new Error(error.message);
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
  const { data: row } = await db.from("centre_till_pins").select("pin_hash").eq("centre_id", centreId).maybeSingle();
  const ok = !!row?.pin_hash && verify(centreId, pin, row.pin_hash);
  if (ok) {
    if (att) await db.from("till_attempts").delete().eq("centre_id", centreId).eq("source", source);
    if (!row!.pin_hash.startsWith("scrypt$")) await setTillPin(db, centreId, pin);
    return true;
  }
  const failures = (att?.failures ?? 0) + 1;
  await db.from("till_attempts").upsert({ centre_id: centreId, source, failures, locked_until: failures >= MAX_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null, updated_at: new Date().toISOString() }, { onConflict: "centre_id,source" });
  return false;
}

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
