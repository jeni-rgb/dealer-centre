import type { Admin } from "@/lib/supabase/server";
import type { ChannelRow } from "@/lib/channels/types";
import { recordSale } from "@/lib/sales/record";
import { refreshSumup } from "./oauth";
import { findTicket, majorToPence } from "./match";

type Conn = {
  id: string;
  owner_type: "centre" | "dealer";
  owner_id: string;
  merchant_code: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  synced_at: string | null;
};

type Tx = {
  id?: string;
  transaction_id?: string;
  transaction_code?: string;
  amount?: number;
  currency?: string;
  timestamp?: string;
  local_time?: string;
  status?: string;
  product_summary?: string;
  description?: string;
  title?: string;
};

function txId(tx: Tx): string {
  return String(tx.id ?? tx.transaction_id ?? tx.transaction_code ?? "");
}

async function tokenFor(db: Admin, conn: Conn): Promise<string> {
  const fresh = conn.expires_at && new Date(conn.expires_at).getTime() > Date.now() + 60_000;
  if (fresh && conn.access_token) return conn.access_token;
  if (!conn.refresh_token) return conn.access_token ?? "";
  const next = await refreshSumup(conn.refresh_token);
  const expires = new Date(Date.now() + (next.expires_in ?? 3600) * 1000).toISOString();
  await db.from("sumup_connections").update({ access_token: next.access_token, refresh_token: next.refresh_token ?? conn.refresh_token, expires_at: expires }).eq("id", conn.id);
  return next.access_token;
}

async function channelFor(db: Admin, conn: Conn): Promise<ChannelRow | null> {
  if (conn.owner_type === "centre") {
    const { data: id } = await db.rpc("ensure_manual_channel", { p_centre_id: conn.owner_id });
    const { data } = await db.from("channels").select("*").eq("id", id).single();
    return data as ChannelRow;
  }
  const { data: id } = await db.rpc("ensure_dealer_manual_channel", { p_dealer_id: conn.owner_id });
  const { data } = await db.from("channels").select("*").eq("id", id).single();
  return data as ChannelRow;
}

async function alreadyTaken(db: Admin, ticket: string, amountPence: number, day: string): Promise<boolean> {
  const { data } = await db.from("sales").select("id").eq("ticket_no", ticket).eq("amount_pence", amountPence).gte("sold_at", `${day}T00:00:00.000Z`).lt("sold_at", `${day}T23:59:59.999Z`).limit(1);
  return !!data?.length;
}

/** Record one SumUp transaction, or leave it for staff if the ticket is missing. A file upload of the same ticket and amount on the same day is left alone. */
export async function applySumupTransaction(db: Admin, conn: Conn, tx: Tx, forcedTicket?: string) {
  const id = txId(tx);
  if (!id) return;
  const description = [tx.product_summary, tx.description, tx.title, forcedTicket].filter(Boolean).join(" ");
  const amountPence = majorToPence(Number(tx.amount));
  const paidAt = tx.timestamp ?? tx.local_time ?? new Date().toISOString();
  const day = paidAt.slice(0, 10);
  const ticket = forcedTicket ? forcedTicket : findTicket(description);
  const base = {
    connection_id: conn.id,
    sumup_id: id,
    transaction_code: tx.transaction_code ?? null,
    amount_pence: amountPence,
    currency: tx.currency ?? "GBP",
    paid_at: paidAt,
    description,
    ticket,
    raw: tx,
  };
  if (!amountPence || (tx.status && tx.status !== "SUCCESSFUL" && !forcedTicket)) {
    await db.from("sumup_transactions").upsert({ ...base, match_status: "ignored" }, { onConflict: "connection_id,sumup_id" });
    return;
  }
  if (ticket && await alreadyTaken(db, ticket, amountPence, day)) {
    await db.from("sumup_transactions").upsert({ ...base, match_status: "duplicate" }, { onConflict: "connection_id,sumup_id" });
    return;
  }
  const { data: item } = ticket
    ? await db.from("items").select("id, sku, status").eq("sku", ticket).eq("status", "live").maybeSingle()
    : { data: null };
  if (!item) {
    await db.from("sumup_transactions").upsert({ ...base, match_status: "unmatched" }, { onConflict: "connection_id,sumup_id" });
    return;
  }
  const channel = await channelFor(db, conn);
  if (!channel) return;
  const recorded = await recordSale(db, channel, {
    external_order_id: `sumup-${id}`,
    external_line_id: "1",
    external_variant_id: null,
    external_item_id: null,
    sku: item.sku,
    category_id: null,
    note: null,
    amount_pence: amountPence,
    fees_pence: 0,
    payment_type: "CARD",
    sold_at: paidAt,
    raw: { source: "sumup", transaction_code: tx.transaction_code ?? null },
  });
  await db.from("sumup_transactions").upsert({
    ...base,
    match_status: recorded.status === "duplicate" ? "duplicate" : "matched",
  }, { onConflict: "connection_id,sumup_id" });
}

export async function pullConnection(db: Admin, conn: Conn): Promise<number> {
  const token = await tokenFor(db, conn);
  if (!token) return 0;
  let merchant = conn.merchant_code;
  if (!merchant) {
    const me = await fetch("https://api.sumup.com/v0.1/me", { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json()).catch(() => null);
    merchant = me?.merchant_profile?.merchant_code ?? null;
    if (merchant) await db.from("sumup_connections").update({ merchant_code: merchant }).eq("id", conn.id);
  }
  if (!merchant) return 0;
  const since = conn.synced_at ?? new Date(Date.now() - 30 * 86400000).toISOString();
  const url = `https://api.sumup.com/v2.1/merchants/${encodeURIComponent(merchant)}/transactions/history?limit=100&order=descending&statuses[]=SUCCESSFUL&changes_since=${encodeURIComponent(since)}`;
  const hist = await fetch(url, { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json()).catch(() => null);
  const items = (hist?.items ?? []) as Tx[];
  for (const tx of items) await applySumupTransaction(db, conn, tx);
  await db.from("sumup_connections").update({ synced_at: new Date().toISOString() }).eq("id", conn.id);
  return items.length;
}

export async function pullAll(db: Admin): Promise<number> {
  const { data } = await db.from("sumup_connections").select("id, owner_type, owner_id, merchant_code, access_token, refresh_token, expires_at, synced_at");
  let n = 0;
  for (const conn of (data ?? []) as Conn[]) n += await pullConnection(db, conn).catch(() => 0);
  return n;
}
