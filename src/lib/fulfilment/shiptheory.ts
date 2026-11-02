import type { OnlineOrder } from "./orders";
import type { PostageRequest, PostageResult } from "./clickdrop";

/**
 * Shiptheory: one account that books Royal Mail (on your business account), Parcelforce, DPD, Evri, DHL and pallets,
 * returns the label, manifests Royal Mail and books carrier collections. Env: SHIPTHEORY_EMAIL, SHIPTHEORY_PASSWORD.
 * Services come from the account (GET /services). "auto" leaves the choice to the shipping rules set up in Shiptheory.
 */
const BASE = "https://api.shiptheory.com/v1";
let tokenCache: { token: string; at: number } | null = null;
let servicesCache: { list: { code: string; label: string }[]; at: number } | null = null;

async function token(): Promise<string> {
  if (tokenCache && Date.now() - tokenCache.at < 50 * 60000) return tokenCache.token;
  const r = await fetch(`${BASE}/token`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ email: process.env.SHIPTHEORY_EMAIL, password: process.env.SHIPTHEORY_PASSWORD }) });
  const j = (await r.json().catch(() => ({}))) as { data?: { token?: string }; message?: string };
  if (!r.ok || !j.data?.token) throw new Error(`Shiptheory sign in failed: ${j.message ?? r.status}`);
  tokenCache = { token: j.data.token, at: Date.now() };
  return tokenCache.token;
}
async function api<T>(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; body: T }> {
  const r = await fetch(`${BASE}${path}`, { ...init, headers: { "content-type": "application/json", accept: "application/json", authorization: `Bearer ${await token()}`, ...(init.headers ?? {}) } });
  return { ok: r.ok, status: r.status, body: (await r.json().catch(() => ({}))) as T };
}

export const shiptheoryConfigured = () => !!process.env.SHIPTHEORY_EMAIL && !!process.env.SHIPTHEORY_PASSWORD;

/** Every delivery service on the account as "Carrier · Service", id as the code. Cached for ten minutes. */
export async function shiptheoryServices(): Promise<{ code: string; label: string }[]> {
  if (servicesCache && Date.now() - servicesCache.at < 10 * 60000) return servicesCache.list;
  const { ok, body } = await api<{ delivery_services?: Record<string, Record<string, { id: string }>> }>("/services");
  const list: { code: string; label: string }[] = [{ code: "auto", label: "Let Shiptheory rules choose" }];
  if (ok) for (const [carrier, services] of Object.entries(body.delivery_services ?? {})) for (const [name, s] of Object.entries(services)) list.push({ code: String(s.id), label: `${carrier} · ${name}` });
  servicesCache = { list, at: Date.now() };
  return list;
}

const ref = (o: OnlineOrder) => `DC${o.sale_id.replace(/-/g, "").slice(0, 22)}`.toUpperCase(); // under 25 chars, unique per sale
const splitName = (full: string | null) => { const parts = (full ?? "Customer").trim().split(/\s+/); return { firstname: parts[0] ?? "Customer", lastname: parts.slice(1).join(" ") || "." }; };

/** Book the shipments, then wait briefly for labels. Anything not ready comes back as "pending" and is fetched on Reprint. */
export async function shiptheoryBuy(reqs: PostageRequest[]): Promise<PostageResult[]> {
  const out: PostageResult[] = [];
  for (const { order: o, weightGrams, serviceCode } of reqs) {
    const a = o.address_parts ?? {};
    const body = {
      reference: ref(o), reference2: o.order_name ?? o.ticket ?? "",
      ...(serviceCode && serviceCode !== "auto" ? { delivery_service: Number(serviceCode) } : {}),
      shipment_detail: { weight: Math.max(0.01, weightGrams / 1000), parcels: 1, value: o.amount_pence / 100, shipping_price: 0, instructions: o.note?.slice(0, 200) ?? undefined, currency_code: "GBP", ship_date: new Date().toISOString().slice(0, 10), sales_source: `Dealer Centre · ${o.centre}` },
      recipient: { ...splitName(o.buyer), address_line_1: a.address1 ?? "", address_line_2: a.address2 ?? undefined, city: a.city ?? "", county: a.province ?? undefined, postcode: a.zip ?? "", country: a.country_code ?? "GB", email: o.email ?? undefined },
      products: [{ name: o.title.slice(0, 100), sku: o.ticket ?? o.sale_id.slice(0, 8), qty: 1, value: o.amount_pence / 100, weight: Math.max(0.01, weightGrams / 1000) }],
    };
    const { ok, body: res } = await api<{ message?: string; error?: unknown }>("/shipments", { method: "POST", body: JSON.stringify(body) });
    if (!ok) {
      const already = /already exists|duplicate/i.test(JSON.stringify(res));
      if (!already) { out.push({ sale_id: o.sale_id, ok: false, error: res.message ?? JSON.stringify(res.error ?? res).slice(0, 200) }); continue; }
    }
    out.push(await shiptheoryFetchLabel(o, 20000));
  }
  return out;
}

/** Poll one shipment for its label. */
export async function shiptheoryFetchLabel(o: OnlineOrder, waitMs = 0): Promise<PostageResult> {
  const deadline = Date.now() + waitMs;
  for (;;) {
    const { body } = await api<{ shipment?: { status?: string; label?: string; tracking_number?: string; carrier?: string; messages?: { message?: string }[] } }>(`/shipments/${ref(o)}`);
    const s = body.shipment;
    if (s?.label && s.status === "Complete") return { sale_id: o.sale_id, ok: true, orderIdentifier: ref(o), tracking: s.tracking_number ?? null, labelPdf: Buffer.from(s.label, "base64"), carrier: s.carrier ?? null };
    if (s?.status === "Failed" || s?.status === "Print Error") return { sale_id: o.sale_id, ok: false, error: `Shiptheory ${s.status}: ${s.messages?.map((m) => m.message).filter(Boolean).join("; ") || "see Shiptheory"}` };
    if (Date.now() >= deadline) return { sale_id: o.sale_id, ok: false, error: `label still being allocated (${s?.status ?? "unknown"}); press Reprint in a minute`, pending: true };
    await new Promise((r) => setTimeout(r, 2500));
  }
}
