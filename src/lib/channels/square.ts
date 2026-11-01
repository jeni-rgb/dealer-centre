import { SquareClient, SquareEnvironment, WebhooksHelper } from "square";
import type { ChannelAdapter, ChannelRow, IncomingLine, ItemRow, ListingRef } from "./types";
import { env as E } from "@/lib/env";

const env = E.square.production() ? SquareEnvironment.Production : SquareEnvironment.Sandbox;

export function squareClient(token: string) {
  return new SquareClient({ token, environment: env });
}

export const squareOAuth = {
  authorizeUrl(state: string) {
    const base = env === SquareEnvironment.Production ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
    const scopes = [
      "ITEMS_READ", "ITEMS_WRITE", "INVENTORY_READ", "INVENTORY_WRITE",
      "ORDERS_READ", "PAYMENTS_READ", "MERCHANT_PROFILE_READ",
    ].join("+");
    return `${base}/oauth2/authorize?client_id=${E.square.appId()}&scope=${scopes}&session=false&state=${state}`;
  },
  async exchange(code: string) {
    const c = new SquareClient({ environment: env });
    const r = await c.oAuth.obtainToken({
      clientId: E.square.appId()!,
      clientSecret: E.square.appSecret(),
      code,
      grantType: "authorization_code",
    });
    return r;
  },
  async refresh(refreshToken: string) {
    const c = new SquareClient({ environment: env });
    return c.oAuth.obtainToken({
      clientId: E.square.appId()!,
      clientSecret: E.square.appSecret(),
      refreshToken,
      grantType: "refresh_token",
    });
  },
};

export function verifySquareSignature(body: string, signature: string, url: string) {
  return WebhooksHelper.verifySignature({
    requestBody: body,
    signatureHeader: signature,
    signatureKey: E.square.webhookKey(),
    notificationUrl: url,
  });
}

export const squareAdapter: ChannelAdapter = {
  async upsertItem(channel, item, { categoryId, listingId, existing }) {
    const c = squareClient(channel.access_token!);
    let itemTempId = `#item-${listingId}`;
    let varTempId = `#var-${listingId}`;
    let itemVersion: bigint | undefined;
    let varVersion: bigint | undefined;
    if (existing?.external_id) {
      const cur = await c.catalog.object.get({ objectId: existing.external_id, includeRelatedObjects: false });
      const obj = cur.object as { id: string; version?: bigint; itemData?: { variations?: { id: string; version?: bigint }[] } } | undefined;
      if (obj) {
        itemTempId = obj.id;
        itemVersion = obj.version;
        const v = obj.itemData?.variations?.find((x) => x.id === existing.external_variant_id) ?? obj.itemData?.variations?.[0];
        if (v) { varTempId = v.id; varVersion = v.version; }
      }
    }
    const r = await c.catalog.object.upsert({
      idempotencyKey: `${listingId}-${item.price_pence}-${item.title.length}-${Date.now()}`,
      object: {
        type: "ITEM",
        id: itemTempId,
        version: itemVersion,
        presentAtAllLocations: true,
        itemData: {
          name: item.title,
          description: item.description ?? undefined,
          categoryId: categoryId ?? undefined,
          variations: [
            {
              type: "ITEM_VARIATION",
              id: varTempId,
              version: varVersion,
              itemVariationData: {
                itemId: itemTempId,
                name: "Regular",
                sku: item.sku,
                pricingType: "FIXED_PRICING",
                priceMoney: { amount: BigInt(item.price_pence), currency: "GBP" },
                trackInventory: true,
              },
            },
          ],
        },
      },
    });
    const map = r.idMappings ?? [];
    const realItem = map.find((m) => m.clientObjectId === itemTempId)?.objectId ?? r.catalogObject?.id ?? "";
    const realVar =
      map.find((m) => m.clientObjectId === varTempId)?.objectId ??
      (r.catalogObject as { itemData?: { variations?: { id?: string }[] } } | undefined)?.itemData?.variations?.[0]?.id ??
      null;
    const ref = { external_id: realItem, external_variant_id: realVar };
    if (!existing) await squareAdapter.setInventory(channel, ref, 1);
    return ref;
  },

  async setInventory(channel, ref, qty) {
    if (!ref.external_variant_id || !channel.location_id) return;
    const c = squareClient(channel.access_token!);
    await c.inventory.batchCreateChanges({
      idempotencyKey: `${ref.external_variant_id}-${qty}-${Date.now()}`,
      changes: [
        {
          type: "PHYSICAL_COUNT",
          physicalCount: {
            catalogObjectId: ref.external_variant_id,
            state: "IN_STOCK",
            locationId: channel.location_id,
            quantity: String(qty),
            occurredAt: new Date().toISOString(),
          },
        },
      ],
    });
  },

  async listOrderLines(channel, since) {
    const c = squareClient(channel.access_token!);
    const out: IncomingLine[] = [];
    let cursor: string | undefined;
    do {
      const r = await c.orders.search({
        locationIds: channel.location_id ? [channel.location_id] : [],
        cursor,
        query: {
          filter: {
            stateFilter: { states: ["COMPLETED"] },
            dateTimeFilter: { closedAt: { startAt: since.toISOString() } },
          },
          sort: { sortField: "CLOSED_AT", sortOrder: "ASC" },
        },
      });
      for (const o of r.orders ?? []) out.push(...squareOrderToLines(o));
      cursor = r.cursor ?? undefined;
    } while (cursor);
    return out;
  },
};

/** Flatten a Square order into one incoming line per line item. */
export function squareOrderToLines(o: {
  id?: string;
  closedAt?: string | null;
  createdAt?: string | null;
  tenders?: { type?: string | null }[] | null;
  lineItems?: {
    uid?: string | null;
    catalogObjectId?: string | null;
    name?: string | null;
    note?: string | null;
    variationName?: string | null;
    totalMoney?: { amount?: bigint | number | null } | null;
  }[] | null;
}): IncomingLine[] {
  const paymentType = o.tenders?.[0]?.type ?? null;
  const soldAt = o.closedAt ?? o.createdAt ?? new Date().toISOString();
  return (o.lineItems ?? []).map((li) => ({
    external_order_id: o.id ?? "",
    external_line_id: li.uid ?? null,
    external_variant_id: li.catalogObjectId ?? null,
    external_item_id: null,
    sku: null,
    category_id: null,
    note: li.note ?? null,
    amount_pence: Number(li.totalMoney?.amount ?? 0),
    fees_pence: 0,
    payment_type: paymentType,
    sold_at: soldAt,
    raw: li,
  }));
}
