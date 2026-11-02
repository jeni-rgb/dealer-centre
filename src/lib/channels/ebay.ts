import { listingPhotos, type ChannelAdapter, type ChannelRow, type IncomingLine } from "./types";

/**
 * eBay via the Sell APIs: Inventory (create offer at the ticket price, buy it now only),
 * Fulfillment (orders), OAuth user tokens per centre account. Sandbox when EBAY_ENV is not production.
 * Buy it now only, no auctions, per the design handover open question default.
 */
const base = process.env.EBAY_ENV === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";
const authBase = process.env.EBAY_ENV === "production" ? "https://auth.ebay.com" : "https://auth.sandbox.ebay.com";
const SCOPES = [
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  "https://api.ebay.com/oauth/api_scope/sell.account",
].join(" ");

export const ebayOAuth = {
  authorizeUrl(state: string) {
    const p = new URLSearchParams({
      client_id: process.env.EBAY_CLIENT_ID!,
      redirect_uri: process.env.EBAY_RU_NAME!,
      response_type: "code",
      scope: SCOPES,
      state,
    });
    return `${authBase}/oauth2/authorize?${p}`;
  },
  async exchange(code: string) {
    const r = await fetch(`${base}/identity/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: "Basic " + Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString("base64"),
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: process.env.EBAY_RU_NAME! }),
    });
    if (!r.ok) throw new Error(`ebay token ${r.status}`);
    return (await r.json()) as { access_token: string; refresh_token: string; expires_in: number };
  },
  async refresh(refreshToken: string) {
    const r = await fetch(`${base}/identity/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: "Basic " + Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString("base64"),
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, scope: SCOPES }),
    });
    if (!r.ok) throw new Error(`ebay refresh ${r.status}`);
    return (await r.json()) as { access_token: string; expires_in: number };
  },
};

async function api(channel: ChannelRow, method: string, path: string, body?: unknown) {
  const r = await fetch(`${base}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${channel.access_token}`,
      "content-type": "application/json",
      "content-language": "en-GB",
      "x-ebay-c-marketplace-id": "EBAY_GB",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 204) return null;
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`ebay ${method} ${path} ${r.status}: ${JSON.stringify(j)}`);
  return j;
}

export const ebayAdapter: ChannelAdapter = {
  async upsertItem(channel, item, { existing }) {
    const sku = item.sku;
    // Inventory item keyed by SKU, idempotent by design
    await api(channel, "PUT", `/sell/inventory/v1/inventory_item/${sku}`, {
      availability: { shipToLocationAvailability: { quantity: 1 } },
      condition: "USED_GOOD",
      product: {
        title: item.title.slice(0, 80),
        description: item.description ?? item.title,
        imageUrls: listingPhotos(item).map((p) => p.url).slice(0, 12),
      },
    });
    if (existing?.external_id) {
      await api(channel, "PUT", `/sell/inventory/v1/offer/${existing.external_id}`, {
        sku,
        marketplaceId: "EBAY_GB",
        format: "FIXED_PRICE",
        availableQuantity: 1,
        pricingSummary: { price: { value: (item.price_pence / 100).toFixed(2), currency: "GBP" } },
        listingPolicies: {
          fulfillmentPolicyId: process.env.EBAY_FULFILLMENT_POLICY_ID,
          paymentPolicyId: process.env.EBAY_PAYMENT_POLICY_ID,
          returnPolicyId: process.env.EBAY_RETURN_POLICY_ID,
        },
        categoryId: process.env.EBAY_DEFAULT_CATEGORY_ID ?? "20081",
        merchantLocationKey: channel.location_id ?? undefined,
      });
      return existing;
    }
    const offer = await api(channel, "POST", "/sell/inventory/v1/offer", {
      sku,
      marketplaceId: "EBAY_GB",
      format: "FIXED_PRICE",
      availableQuantity: 1,
      pricingSummary: { price: { value: (item.price_pence / 100).toFixed(2), currency: "GBP" } },
      listingPolicies: {
        fulfillmentPolicyId: process.env.EBAY_FULFILLMENT_POLICY_ID,
        paymentPolicyId: process.env.EBAY_PAYMENT_POLICY_ID,
        returnPolicyId: process.env.EBAY_RETURN_POLICY_ID,
      },
      categoryId: process.env.EBAY_DEFAULT_CATEGORY_ID ?? "20081",
      merchantLocationKey: channel.location_id ?? undefined,
      listingDescription: item.description ?? item.title,
    });
    const offerId = offer.offerId as string;
    const pub = await api(channel, "POST", `/sell/inventory/v1/offer/${offerId}/publish`, {});
    return { external_id: offerId, external_variant_id: (pub?.listingId as string) ?? null };
  },

  async setInventory(channel, ref, qty) {
    if (!ref.external_id) return;
    if (qty === 0) {
      await api(channel, "POST", `/sell/inventory/v1/offer/${ref.external_id}/withdraw`, {}).catch(() => undefined);
    } else {
      await api(channel, "POST", `/sell/inventory/v1/offer/${ref.external_id}/publish`, {}).catch(() => undefined);
    }
  },

  async listOrderLines(channel, since) {
    const out: IncomingLine[] = [];
    let offset = 0;
    for (;;) {
      const j = await api(channel, "GET", `/sell/fulfillment/v1/order?filter=creationdate:[${since.toISOString()}..]&limit=100&offset=${offset}`);
      for (const o of j?.orders ?? []) {
        if (o.orderPaymentStatus !== "PAID") continue;
        for (const li of o.lineItems ?? []) {
          out.push({
            external_order_id: o.orderId,
            external_line_id: li.lineItemId,
            external_variant_id: li.legacyItemId ?? null,
            external_item_id: null,
            sku: li.sku ?? null,
            category_id: null,
            note: null,
            amount_pence: Math.round(parseFloat(li.lineItemCost?.value ?? "0") * 100),
            fees_pence: Math.round(parseFloat(li.ebayCollectAndRemitTaxes?.[0]?.amount?.value ?? "0") * 100),
            postage_pence: Math.round(parseFloat(li.deliveryCost?.shippingCost?.value ?? "0") * 100),
            payment_type: "ebay",
            sold_at: o.creationDate,
            raw: li,
          });
        }
      }
      if (!j?.next) break;
      offset += 100;
    }
    return out;
  },
};
