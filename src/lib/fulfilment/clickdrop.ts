import type { OnlineOrder } from "./orders";

/**
 * Royal Mail Click & Drop API (Online Business Account). One call creates the order, applies postage and returns the
 * paid label as a PDF with the tracking number. Manifesting is done once a day in Click & Drop itself.
 * Env: CLICK_AND_DROP_API_KEY. Service codes are per account: copy them from Click & Drop > Settings > Shipping services.
 */
const BASE = "https://api.parcel.royalmail.com/api/v1";

export type PackageFormat = "largeLetter" | "smallParcel" | "mediumParcel";
export const FORMATS: [PackageFormat, string][] = [["largeLetter", "Large letter"], ["smallParcel", "Small parcel"], ["mediumParcel", "Medium parcel"]];

/** Service codes, overridable by env because they differ between accounts. */
export const SERVICES: { code: string; label: string }[] = [
  { code: process.env.RM_SERVICE_TRACKED48 ?? "TPS48", label: "Tracked 48" },
  { code: process.env.RM_SERVICE_TRACKED24 ?? "TPN24", label: "Tracked 24" },
  { code: process.env.RM_SERVICE_SPECIAL ?? "SD1", label: "Special Delivery by 1pm" },
];
/** Default service by value: anything over £150 goes Special Delivery (insured), the rest Tracked 48. */
export const defaultService = (amountPence: number) => (amountPence > 15000 ? SERVICES[2].code : SERVICES[0].code);

export type PostageRequest = { order: OnlineOrder; format: PackageFormat; weightGrams: number; serviceCode: string };
export type PostageResult = { sale_id: string; ok: true; orderIdentifier: string; tracking: string | null; labelPdf: Uint8Array } | { sale_id: string; ok: false; error: string };

export async function buyPostage(reqs: PostageRequest[]): Promise<PostageResult[]> {
  const key = process.env.CLICK_AND_DROP_API_KEY;
  if (!key) return reqs.map((r) => ({ sale_id: r.order.sale_id, ok: false, error: "CLICK_AND_DROP_API_KEY is not set" }));
  const items = reqs.map(({ order: o, format, weightGrams, serviceCode }) => {
    const a = o.address_parts ?? {};
    return {
      orderReference: o.order_name ?? o.sale_id.slice(0, 8),
      recipient: {
        address: { fullName: o.buyer ?? "Customer", addressLine1: a.address1 ?? "", addressLine2: a.address2 ?? undefined, city: a.city ?? "", county: a.province ?? undefined, postcode: a.zip ?? "", countryCode: a.country_code ?? "GB" },
        emailAddress: o.email ?? undefined,
      },
      orderDate: o.sold_at,
      subtotal: o.amount_pence / 100, shippingCostCharged: 0, total: o.amount_pence / 100, currencyCode: "GBP",
      packages: [{ weightInGrams: weightGrams, packageFormatIdentifier: format, contents: [{ name: o.title.slice(0, 250), SKU: o.ticket ?? undefined, quantity: 1, unitValue: o.amount_pence / 100, unitWeightInGrams: weightGrams }] }],
      postageDetails: { serviceCode, sendNotificationsTo: "recipient" },
      label: { includeLabelInResponse: true, includeCN: false, includeReturnsLabel: false },
    };
  });
  const r = await fetch(`${BASE}/orders`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify({ items }) });
  const j = (await r.json().catch(() => ({}))) as {
    successfulOrders?: { orderIdentifier: number; orderReference: string; trackingNumber?: string; label?: string }[];
    failedOrders?: { order?: { orderReference?: string }; errors?: { errorMessage?: string }[] }[];
    message?: string;
  };
  if (!r.ok) return reqs.map((q) => ({ sale_id: q.order.sale_id, ok: false, error: j.message ?? `Click & Drop ${r.status}` }));
  return reqs.map((q) => {
    const ref = q.order.order_name ?? q.order.sale_id.slice(0, 8);
    const ok = (j.successfulOrders ?? []).find((s) => s.orderReference === ref);
    if (ok?.label) return { sale_id: q.order.sale_id, ok: true, orderIdentifier: String(ok.orderIdentifier), tracking: ok.trackingNumber ?? null, labelPdf: Buffer.from(ok.label, "base64") };
    const bad = (j.failedOrders ?? []).find((f) => f.order?.orderReference === ref);
    return { sale_id: q.order.sale_id, ok: false, error: bad?.errors?.map((e) => e.errorMessage).join("; ") || (ok ? "label not returned" : "not accepted") };
  });
}
