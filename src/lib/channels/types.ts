export type ChannelRow = {
  id: string;
  type: "square" | "shopify" | "ebay";
  owner_type: "dealer" | "centre";
  owner_id: string;
  external_account_id: string;
  location_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  status: string;
};

export type ItemRow = {
  id: string;
  dealer_id: string;
  centre_id: string | null;
  sku: string;
  alt_skus: string[];
  title: string;
  description: string | null;
  price_pence: number;
  listed_price_pence: number | null;
  cost_pence: number | null;
  photos: { path: string; url?: string }[];
  status: "draft" | "live" | "sold" | "withdrawn";
  on_own_shopify: boolean;
  on_centre_shopify: boolean;
  on_centre_ebay: boolean;
};

export type ListingRef = { external_id: string; external_variant_id: string | null };

export type IncomingLine = {
  external_order_id: string;
  external_line_id: string | null;
  external_variant_id: string | null;
  external_item_id: string | null;
  sku: string | null;
  category_id: string | null;
  note: string | null;
  amount_pence: number;
  fees_pence: number;
  discount_pence?: number;
  postage_pence?: number;
  payment_type: string | null;
  sold_at: string;
  raw: unknown;
};

export interface ChannelAdapter {
  /** Create or update the item on the channel. Must be idempotent on listing id. */
  upsertItem(channel: ChannelRow, item: ItemRow, opts: { categoryId?: string | null; listingId: string; existing?: ListingRef | null }): Promise<ListingRef>;
  /** Set available quantity, 1 for live, 0 for sold. */
  setInventory(channel: ChannelRow, ref: ListingRef, qty: 0 | 1): Promise<void>;
  /** Fetch orders since a time, for reconciliation. */
  listOrderLines(channel: ChannelRow, since: Date): Promise<IncomingLine[]>;
}
