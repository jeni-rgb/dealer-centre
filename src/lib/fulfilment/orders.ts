import type { Admin } from "@/lib/supabase/server";
import { displaySku } from "@/lib/sku";
import type { ShopifyAddress } from "@/lib/channels/shopify";

export type OrderStatus = "new" | "collected" | "at_unit" | "despatched" | "missing" | "refunded";
export type OnlineOrder = {
  sale_id: string; sold_at: string; amount_pence: number; ticket: string | null; title: string;
  dealer: string | null; dealer_code: string | null; pitches: string[];
  centre_id: string | null; centre: string;
  buyer: string | null; email: string | null; address: string | null; order_name: string | null; note: string | null;
  status: OrderStatus; collected_at: string | null; at_unit_at: string | null; despatched_at: string | null; slip_printed_at: string | null;
  carrier: string | null; tracking: string | null; fulfil_note: string | null; shopify_fulfilled: boolean;
};
type FulfilRow = { status: OrderStatus; collected_at: string | null; at_unit_at: string | null; despatched_at: string | null; slip_printed_at: string | null; carrier: string | null; tracking: string | null; note: string | null; shopify_fulfilled: boolean };

const addr = (a: ShopifyAddress | null | undefined) => a ? [a.address1, a.address2, a.city, a.province, a.zip, a.country].filter(Boolean).join(", ") : null;

/** Every centre shop sale with where it is. Admin wide, or one centre. */
export async function listOnlineOrders(db: Admin, opts: { centreId?: string; sinceDays?: number; openOnly?: boolean } = {}): Promise<OnlineOrder[]> {
  const since = new Date(Date.now() - (opts.sinceDays ?? 60) * 86400000).toISOString();
  let q = db.from("sales").select("id, sold_at, amount_pence, ticket_no, raw, centre_id, dealer_id, items(title), dealers(name, code), centres(name), channels:channel_id(type, owner_type), fulfilments(status, collected_at, at_unit_at, despatched_at, slip_printed_at, carrier, tracking, note, shopify_fulfilled)")
    .is("voided_at", null).gte("sold_at", since).order("sold_at", { ascending: false });
  if (opts.centreId) q = q.eq("centre_id", opts.centreId);
  const { data } = await q;
  const { data: links } = await db.from("dealer_centres").select("dealer_id, centre_id, pitch_numbers");
  const pitchesFor = (d: string | null, c: string | null) => (links ?? []).find((l) => l.dealer_id === d && l.centre_id === c)?.pitch_numbers ?? [];
  return (data ?? [])
    .filter((s) => { const ch = s.channels as unknown as { type: string; owner_type: string } | null; return !!ch && ch.owner_type === "centre" && !["square", "manual"].includes(ch.type); })
    .map((s) => {
      const raw = (s.raw ?? {}) as { title?: string; order?: { name?: string | null; email?: string | null; note?: string | null; shipping_address?: ShopifyAddress | null } };
      const fr = s.fulfilments as unknown as FulfilRow | FulfilRow[] | null;
      const f = Array.isArray(fr) ? fr[0] ?? null : fr;
      const d = s.dealers as unknown as { name: string; code: string } | null;
      return {
        sale_id: s.id, sold_at: s.sold_at, amount_pence: s.amount_pence, ticket: s.ticket_no ? displaySku(s.ticket_no) : null,
        title: (s.items as unknown as { title: string } | null)?.title ?? raw.title ?? "Item",
        dealer: d?.name ?? null, dealer_code: d?.code ?? null, pitches: pitchesFor(s.dealer_id, s.centre_id),
        centre_id: s.centre_id, centre: (s.centres as unknown as { name: string } | null)?.name ?? "Centre",
        buyer: raw.order?.shipping_address?.name ?? null, email: raw.order?.email ?? null, address: addr(raw.order?.shipping_address), order_name: raw.order?.name ?? null, note: raw.order?.note ?? null,
        status: f?.status ?? "new", collected_at: f?.collected_at ?? null, at_unit_at: f?.at_unit_at ?? null, despatched_at: f?.despatched_at ?? null, slip_printed_at: f?.slip_printed_at ?? null,
        carrier: f?.carrier ?? null, tracking: f?.tracking ?? null, fulfil_note: f?.note ?? null, shopify_fulfilled: !!f?.shopify_fulfilled,
      };
    })
    .filter((o) => !opts.openOnly || !["despatched", "refunded"].includes(o.status));
}

export const STATUS_LABEL: Record<OrderStatus, string> = { new: "To collect", collected: "Collected", at_unit: "At the unit", despatched: "Despatched", missing: "Missing", refunded: "Refunded" };

/** Only orders that still need something from us. */
export const isOpen = (s: OrderStatus) => s === "new" || s === "collected" || s === "at_unit" || s === "missing";
