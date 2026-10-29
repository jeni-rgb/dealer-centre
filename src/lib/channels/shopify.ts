import crypto from "node:crypto";
import type { ChannelAdapter, ChannelRow, IncomingLine, ItemRow, ListingRef } from "./types";

const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-10";
const SCOPES = "read_products,write_products,read_inventory,write_inventory,read_orders";

export const shopifyOAuth = {
  authorizeUrl(shop: string, state: string) {
    const redirect = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/shopify/callback`;
    return `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(redirect)}&state=${state}`;
  },
  verifyHmac(query: URLSearchParams) {
    const hmac = query.get("hmac") ?? "";
    const rest = [...query.entries()].filter(([k]) => k !== "hmac").sort(([a], [b]) => a.localeCompare(b));
    const msg = rest.map(([k, v]) => `${k}=${v}`).join("&");
    const digest = crypto.createHmac("sha256", process.env.SHOPIFY_API_SECRET!).update(msg).digest("hex");
    return digest.length === hmac.length && crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
  },
  async exchange(shop: string, code: string) {
    const r = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ client_id: process.env.SHOPIFY_API_KEY, client_secret: process.env.SHOPIFY_API_SECRET, code }),
    });
    if (!r.ok) throw new Error(`shopify token exchange ${r.status}`);
    return (await r.json()) as { access_token: string; scope: string };
  },
};

export function verifyShopifyWebhook(rawBody: string, hmacHeader: string) {
  const digest = crypto.createHmac("sha256", process.env.SHOPIFY_API_SECRET!).update(rawBody, "utf8").digest("base64");
  return digest.length === hmacHeader.length && crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

async function gql<T>(channel: ChannelRow, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch(`https://${channel.external_account_id}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "content-type": "application/json", "X-Shopify-Access-Token": channel.access_token! },
    body: JSON.stringify({ query, variables }),
  });
  const j = (await r.json()) as { data?: T; errors?: unknown };
  if (!r.ok || j.errors) throw new Error(`shopify gql: ${JSON.stringify(j.errors ?? r.status)}`);
  return j.data as T;
}

async function primaryLocationId(channel: ChannelRow): Promise<string> {
  if (channel.location_id) return channel.location_id;
  const d = await gql<{ locations: { nodes: { id: string }[] } }>(channel, `{ locations(first: 1) { nodes { id } } }`);
  return d.locations.nodes[0].id;
}

export const shopifyAdapter: ChannelAdapter = {
  async upsertItem(channel, item, { listingId, existing }) {
    void listingId;
    if (existing?.external_id) {
      await gql(channel, `mutation($input: ProductInput!) { productUpdate(input: $input) { userErrors { message } } }`,
        { input: { id: existing.external_id, title: item.title, descriptionHtml: item.description ?? "" } });
      const d = await gql<{ product: { variants: { nodes: { id: string }[] } } | null }>(channel,
        `query($id: ID!) { product(id: $id) { variants(first: 1) { nodes { id } } } }`, { id: existing.external_id });
      const vid = d.product?.variants.nodes[0]?.id;
      if (vid) {
        await gql(channel, `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) { userErrors { message } } }`,
          { productId: existing.external_id, variants: [{ id: vid, price: (item.price_pence / 100).toFixed(2) }] });
      }
      return existing;
    }
    const create = await gql<{
      productCreate: { product: { id: string; variants: { nodes: { id: string; inventoryItem: { id: string } }[] } } | null; userErrors: { message: string }[] };
    }>(
      channel,
      `mutation($input: ProductInput!) {
        productCreate(input: $input) {
          product { id variants(first: 1) { nodes { id inventoryItem { id } } } }
          userErrors { message }
        }
      }`,
      {
        input: {
          title: item.title,
          descriptionHtml: item.description ?? "",
          status: "ACTIVE",
          tags: ["dealer-centre", `sku:${item.sku}`],
        },
      },
    );
    if (!create.productCreate.product) throw new Error(create.productCreate.userErrors.map((e) => e.message).join("; "));
    const product = create.productCreate.product;
    const variant = product.variants.nodes[0];

    await gql(
      channel,
      `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) { userErrors { message } }
      }`,
      {
        productId: product.id,
        variants: [
          {
            id: variant.id,
            price: (item.price_pence / 100).toFixed(2),
            inventoryItem: { sku: item.sku, tracked: true },
            inventoryPolicy: "DENY",
          },
        ],
      },
    );

    const ref = { external_id: product.id, external_variant_id: variant.inventoryItem.id };
    await shopifyAdapter.setInventory(channel, ref, 1);
    return ref;
  },

  async setInventory(channel, ref, qty) {
    if (!ref.external_variant_id) return;
    const locationId = await primaryLocationId(channel);
    await gql(
      channel,
      `mutation($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) { userErrors { message } }
      }`,
      {
        input: {
          name: "available",
          reason: "correction",
          ignoreCompareQuantity: true,
          quantities: [{ inventoryItemId: ref.external_variant_id, locationId, quantity: qty }],
        },
      },
    );
  },

  async listOrderLines(channel, since) {
    const out: IncomingLine[] = [];
    let after: string | null = null;
    do {
      const d: {
        orders: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          nodes: ShopifyOrder[];
        };
      } = await gql(
        channel,
        `query($q: String!, $after: String) {
          orders(first: 50, query: $q, after: $after) {
            pageInfo { hasNextPage endCursor }
            nodes { id createdAt displayFinancialStatus
              lineItems(first: 50) { nodes { id sku quantity product { id } variant { id inventoryItem { id } }
                discountedTotalSet { shopMoney { amount } } } } }
          }
        }`,
        { q: `created_at:>=${since.toISOString()} financial_status:paid`, after },
      );
      for (const o of d.orders.nodes) out.push(...shopifyOrderToLines(o));
      after = d.orders.pageInfo.hasNextPage ? d.orders.pageInfo.endCursor : null;
    } while (after);
    return out;
  },
};

type ShopifyOrder = {
  id: string;
  createdAt: string;
  lineItems: {
    nodes: {
      id: string;
      sku: string | null;
      product: { id: string } | null;
      variant: { id: string; inventoryItem: { id: string } } | null;
      discountedTotalSet: { shopMoney: { amount: string } };
    }[];
  };
};

export function shopifyOrderToLines(o: ShopifyOrder): IncomingLine[] {
  return o.lineItems.nodes.map((li) => ({
    external_order_id: o.id,
    external_line_id: li.id,
    external_variant_id: li.variant?.inventoryItem.id ?? null,
    external_item_id: li.product?.id ?? null,
    sku: li.sku,
    category_id: null,
    note: null,
    amount_pence: Math.round(parseFloat(li.discountedTotalSet.shopMoney.amount) * 100),
    fees_pence: 0,
    payment_type: "online",
    sold_at: o.createdAt,
    raw: li,
  }));
}

/** Webhook payloads are REST shaped. Convert to the same lines. */
export function shopifyWebhookOrderToLines(o: {
  admin_graphql_api_id: string;
  created_at: string;
  line_items: { admin_graphql_api_id: string; sku: string | null; product_id: number | null; variant_id: number | null; price: string; quantity: number; total_discount: string }[];
}): IncomingLine[] {
  return o.line_items.map((li) => ({
    external_order_id: o.admin_graphql_api_id,
    external_line_id: li.admin_graphql_api_id,
    external_variant_id: null,
    external_item_id: li.product_id ? `gid://shopify/Product/${li.product_id}` : null,
    sku: li.sku,
    category_id: null,
    note: null,
    amount_pence: Math.round((parseFloat(li.price) * li.quantity - parseFloat(li.total_discount || "0")) * 100),
    fees_pence: 0,
    payment_type: "online",
    sold_at: o.created_at,
    raw: li,
  }));
}
