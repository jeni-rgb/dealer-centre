import { SERVICES as CD_SERVICES, buyPostage as clickdropBuy, type PostageRequest, type PostageResult } from "./clickdrop";
import { shiptheoryBuy, shiptheoryConfigured, shiptheoryFetchLabel, shiptheoryServices } from "./shiptheory";
import type { OnlineOrder } from "./orders";
import { sampleBuy } from "./sample";

/**
 * Which platform buys the postage. POSTAGE_PROVIDER=shiptheory|clickdrop; if unset, Shiptheory when its login is
 * present, otherwise Click & Drop. Both return a paid label and a tracking number; the desk does not care which.
 */
export type Provider = "shiptheory" | "clickdrop" | "sample";
export function provider(): Provider {
  const p = process.env.POSTAGE_PROVIDER;
  if (p === "shiptheory" || p === "clickdrop" || p === "sample") return p;
  if (process.env.DEMO_MODE === "1") return "sample";
  return shiptheoryConfigured() ? "shiptheory" : "clickdrop";
}
export const providerLabel = () => (provider() === "shiptheory" ? "Shiptheory" : provider() === "sample" ? "sample mode (no real postage)" : "Royal Mail Click & Drop");

export async function listServices(): Promise<{ code: string; label: string }[]> {
  if (provider() === "shiptheory") { try { return await shiptheoryServices(); } catch { return [{ code: "auto", label: "Let Shiptheory rules choose" }]; } }
  return CD_SERVICES;
}
/** Default service by value. POSTAGE_DEFAULT_SERVICE and POSTAGE_SPECIAL_SERVICE (over £150) are service codes for the provider in use. */
export function defaultService(amountPence: number, services: { code: string }[]): string {
  const want = amountPence > 15000 ? process.env.POSTAGE_SPECIAL_SERVICE : process.env.POSTAGE_DEFAULT_SERVICE;
  if (want && services.some((s) => s.code === want)) return want;
  if (provider() !== "shiptheory") return amountPence > 15000 ? CD_SERVICES[2].code : CD_SERVICES[0].code;
  return "auto";
}
export function buy(reqs: PostageRequest[]): Promise<PostageResult[]> {
  return provider() === "shiptheory" ? shiptheoryBuy(reqs) : provider() === "sample" ? sampleBuy(reqs) : clickdropBuy(reqs);
}
/** For a label that was pending at purchase time (Shiptheory allocates asynchronously). */
export function fetchPending(o: OnlineOrder): Promise<PostageResult> | null {
  return provider() === "shiptheory" ? shiptheoryFetchLabel(o, 8000) : null;
}
