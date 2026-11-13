import type { Tx } from "./sync";

export type SumupNotice =
  | { type: "checkout"; id: string }
  | { type: "solo"; merchantCode: string; clientTransactionId: string; status: string }
  | { type: "transaction"; merchantCode: string | null; tx: Tx }
  | { type: "ignore" };

type CheckoutBody = {
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  description?: string;
  checkout_reference?: string;
  transaction_code?: string;
  date?: string;
  merchant_code?: string;
  transactions?: Tx[];
};

function text(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function txFrom(raw: Record<string, unknown>): Tx | null {
  const id = text(raw.id ?? raw.transaction_id ?? raw.transaction_code);
  if (!id) return null;
  const amount = typeof raw.amount === "number" ? raw.amount : undefined;
  return {
    id: text(raw.id ?? raw.transaction_id) || undefined,
    transaction_id: text(raw.transaction_id) || undefined,
    transaction_code: text(raw.transaction_code) || undefined,
    amount,
    currency: text(raw.currency) || undefined,
    timestamp: text(raw.timestamp ?? raw.local_time) || undefined,
    status: text(raw.status) || undefined,
    product_summary: text(raw.product_summary ?? raw.description ?? raw.title) || undefined,
  };
}

/** SumUp posts one of these. Anything else is ignored so a new event does not fail the call. */
export function readSumupNotice(body: unknown): SumupNotice {
  if (!body || typeof body !== "object") return { type: "ignore" };
  const b = body as Record<string, unknown>;
  const event = text(b.event_type ?? b.eventType);
  const payload = b.payload && typeof b.payload === "object" ? (b.payload as Record<string, unknown>) : b;
  if (event === "CHECKOUT_STATUS_CHANGED") {
    const id = text(b.id);
    return id ? { type: "checkout", id } : { type: "ignore" };
  }
  if (event === "solo.transaction.updated") {
    const clientTransactionId = text(payload.client_transaction_id);
    const merchantCode = text(payload.merchant_code);
    if (!clientTransactionId || !merchantCode) return { type: "ignore" };
    return { type: "solo", merchantCode, clientTransactionId, status: text(payload.status) };
  }
  const tx = txFrom(payload);
  if (tx && (event.toLowerCase().includes("transaction") || typeof payload.amount === "number")) {
    return { type: "transaction", merchantCode: text(payload.merchant_code) || null, tx };
  }
  return { type: "ignore" };
}

/** A paid checkout becomes the card sales inside it. The description is kept so the ticket can be read. */
export function transactionsFromCheckout(checkout: CheckoutBody): Tx[] {
  if (text(checkout.status).toUpperCase() !== "PAID") return [];
  const note = [checkout.description, checkout.checkout_reference].filter(Boolean).join(" ");
  const paid = (checkout.transactions ?? []).flatMap((tx) => {
    const status = text(tx.status || "SUCCESSFUL").toUpperCase();
    if (status !== "SUCCESSFUL") return [];
    return [{
      ...tx,
      status: "SUCCESSFUL",
      product_summary: [tx.product_summary, note].filter(Boolean).join(" "),
    }];
  });
  if (paid.length || !checkout.id || !checkout.amount) return paid;
  return [{
    id: checkout.id,
    amount: checkout.amount,
    currency: checkout.currency,
    timestamp: checkout.date,
    transaction_code: checkout.transaction_code,
    status: "SUCCESSFUL",
    product_summary: note,
  }];
}
