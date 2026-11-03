import { createHmac, timingSafeEqual } from "crypto";

const secret = () => {
  const s = process.env.LABEL_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("no label token secret");
  return createHmac("sha256", s).update("dc-label-token-v1").digest();
};
const payload = (ids: string, w: number, h: number, dealer: string, exp: number) => `${ids}|${w}|${h}|${dealer}|${exp}`;
const sign = (p: string) => createHmac("sha256", secret()).update(p).digest("base64url");

/** Short-lived (10 min) signed token so the PDF opens in an iOS Safari sheet without PWA cookies. */
export function labelToken(ids: string, w: number, h: number, dealer: string) {
  const exp = Math.floor(Date.now() / 1000) + 600;
  return `${dealer}.${exp}.${sign(payload(ids, w, h, dealer, exp))}`;
}

/** Returns the dealer id if the token is valid for these params. */
export function verifyLabelToken(tok: string, ids: string, w: number, h: number): string | null {
  const [dealer, expS, sig] = tok.split(".");
  const exp = Number(expS);
  if (!dealer || !sig || !(exp > Date.now() / 1000)) return null;
  try {
    const a = Buffer.from(sig), b = Buffer.from(sign(payload(ids, w, h, dealer, exp)));
    return a.length === b.length && timingSafeEqual(a, b) ? dealer : null;
  } catch { return null; }
}
