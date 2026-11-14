import Stripe from "stripe";
import type { Admin } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { LABEL_PENCE, TASTER_FREE_LABELS, plusVat } from "@/lib/billing/pricing";

const VAT = 0.2;

export type LabelTally = {
  printed: number;
  freeUsed: number;
  owed: number;
  amountPence: number;
  vatPence: number;
  billed: number;
};

export function labelTally(printed: number, invoiced: number, prepaid = 0): LabelTally {
  const safePrinted = Math.max(0, printed);
  const covered = Math.max(0, invoiced) + Math.max(0, prepaid);
  const freeUsed = Math.min(TASTER_FREE_LABELS, safePrinted);
  const owed = Math.max(0, safePrinted - TASTER_FREE_LABELS - covered);
  const amountPence = owed * LABEL_PENCE;
  return { printed: safePrinted, freeUsed, owed, amountPence, vatPence: Math.round(amountPence * VAT), billed: covered };
}

/** Count one print once. Centre printers always count. A dealer's own printer counts only when we label their stock. */
export async function noteLabelPrinted(
  db: Admin,
  job: { id: string; dealer_id: string; copies?: number | null; printer_id?: string | null },
  output: "sent" | "ready" | "marked",
): Promise<void> {
  const { data: existing, error: lookupError } = await db.from("label_prints").select("id").eq("print_job_id", job.id).maybeSingle();
  if (lookupError || existing) return;
  const { data: dealer } = await db.from("dealers").select("listing_mode").eq("id", job.dealer_id).maybeSingle();
  let owner: string | null = null;
  if (job.printer_id) {
    const { data: printer } = await db.from("printers").select("owner_type").eq("id", job.printer_id).maybeSingle();
    owner = printer?.owner_type ?? null;
  }
  const centre = owner === "centre";
  const staff = dealer?.listing_mode === "staff";
  if (!centre && !(staff && (output === "marked" || output === "sent"))) return;
  await db.from("label_prints").insert({
    dealer_id: job.dealer_id,
    print_job_id: job.id,
    copies: Math.min(100, Math.max(1, Number(job.copies) || 1)),
    source: centre ? "centre" : "dealer",
  });
}

export type LabelBill = { id: string; copies: number; amount_pence: number; vat_pence: number; stripe_invoice_id: string | null; source: string | null; paid_at: string | null; created_at: string };

export async function labelFigures(db: Admin, dealerId: string): Promise<{ tally: LabelTally; unpaidCopies: number; unpaidPence: number; paidCopies: number; paidPence: number; bills: LabelBill[] }> {
  const empty = { tally: labelTally(0, 0), unpaidCopies: 0, unpaidPence: 0, paidCopies: 0, paidPence: 0, bills: [] as LabelBill[] };
  const [{ data: prints, error: printError }, { data: bills, error: billError }] = await Promise.all([
    db.from("label_prints").select("copies").eq("dealer_id", dealerId),
    db.from("label_bills").select("id, copies, amount_pence, vat_pence, stripe_invoice_id, source, paid_at, created_at").eq("dealer_id", dealerId).order("created_at", { ascending: false }),
  ]);
  if (printError || billError) return empty;
  const rows = (bills ?? []) as LabelBill[];
  const printed = (prints ?? []).reduce((sum, row) => sum + Number(row.copies || 0), 0);
  const invoiced = rows.reduce((sum, row) => sum + Number(row.copies || 0), 0);
  const unpaid = rows.filter((row) => !row.paid_at);
  const paid = rows.filter((row) => row.paid_at);
  const sumCopies = (list: LabelBill[]) => list.reduce((sum, row) => sum + Number(row.copies || 0), 0);
  const sumPence = (list: LabelBill[]) => list.reduce((sum, row) => sum + Number(row.amount_pence || 0), 0);
  return { tally: labelTally(printed, invoiced), unpaidCopies: sumCopies(unpaid), unpaidPence: sumPence(unpaid), paidCopies: sumCopies(paid), paidPence: sumPence(paid), bills: rows };
}

/** Jeni pressed Bill. One Stripe invoice for the labels owed, then the owed count goes back to 0. */
export async function billOwedLabels(db: Admin, dealerId: string): Promise<{ copies: number; amount: string; invoiceId: string | null }> {
  const { tally } = await labelFigures(db, dealerId);
  if (tally.owed < 1) throw new Error("Nothing owed.");
  const { data: dealer } = await db.from("dealers").select("id, name, stripe_customer_id").eq("id", dealerId).single();
  if (!dealer) throw new Error("Dealer not found");
  const amountPence = tally.owed * LABEL_PENCE;
  const vatPence = Math.round(amountPence * VAT);
  const demo = process.env.DEMO_MODE === "1" || !process.env.STRIPE_SECRET_KEY;
  let invoiceId: string | null = null;
  if (!demo) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const { data: person } = await db.from("users").select("email").eq("dealer_id", dealerId).limit(1).maybeSingle();
    let customerId = dealer.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({ name: dealer.name, email: person?.email ?? undefined, metadata: { dealer_id: dealerId } });
      customerId = customer.id;
      await db.from("dealers").update({ stripe_customer_id: customerId }).eq("id", dealerId);
    }
    const key = `labels-${dealerId}-${tally.billed}`;
    const taxRate = env.stripe.vatRate();
    await stripe.invoiceItems.create({
      customer: customerId,
      currency: "gbp",
      amount: taxRate ? amountPence : amountPence + vatPence,
      description: `${tally.owed} labels at 75p${taxRate ? "" : ", VAT included"}`,
      tax_rates: taxRate ? [taxRate] : undefined,
      metadata: { dealer_id: dealerId, purpose: "labels", copies: String(tally.owed) },
    }, { idempotencyKey: `${key}-item` });
    const customer = await stripe.customers.retrieve(customerId);
    const saved = !customer.deleted ? customer.invoice_settings?.default_payment_method : null;
    const paymentMethod = typeof saved === "string" ? saved : saved?.id;
    let invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: paymentMethod ? "charge_automatically" : "send_invoice",
      days_until_due: paymentMethod ? undefined : 14,
      pending_invoice_items_behavior: "include",
      auto_advance: true,
      metadata: { dealer_id: dealerId, purpose: "labels", copies: String(tally.owed) },
    }, { idempotencyKey: key });
    invoice = await stripe.invoices.finalizeInvoice(invoice.id);
    if (paymentMethod) {
      invoice = await stripe.invoices.pay(invoice.id).catch(() => invoice);
    } else {
      invoice = await stripe.invoices.sendInvoice(invoice.id).catch(() => invoice);
    }
    invoiceId = invoice.id;
  }
  const { error } = await db.from("label_bills").insert({
    dealer_id: dealerId,
    copies: tally.owed,
    amount_pence: amountPence,
    vat_pence: vatPence,
    stripe_invoice_id: invoiceId,
    source: "admin",
    paid_at: null,
  });
  if (error && !String(error.message).includes("duplicate")) throw new Error(error.message);
  return { copies: tally.owed, amount: plusVat(amountPence), invoiceId };
}

/** Labels bought up front. Recorded once per Stripe session so a retry does not count them twice. */
export async function recordPrepaidLabels(db: Admin, dealerId: string, qty: number, stripeId: string): Promise<void> {
  if (!Number.isInteger(qty) || qty < 1) return;
  const amountPence = qty * LABEL_PENCE;
  const { error } = await db.from("label_bills").insert({
    dealer_id: dealerId,
    copies: qty,
    amount_pence: amountPence,
    vat_pence: Math.round(amountPence * VAT),
    stripe_invoice_id: stripeId,
    source: "prepaid",
    paid_at: new Date().toISOString(),
  });
  if (error && !String(error.message).includes("duplicate")) throw new Error(error.message);
}

/**
 * Past the free 25, and they are keeping Full. Put only the still owed labels on the customer
 * so the first Full invoice picks them up. Anything already billed stays off that invoice.
 */
export async function attachOwedLabelsToFull(db: Admin, stripe: Stripe | null, dealerId: string, customerId: string): Promise<number> {
  const { tally, bills } = await labelFigures(db, dealerId);
  if (tally.printed <= TASTER_FREE_LABELS || tally.owed < 1) return 0;
  if (bills.some((bill) => bill.source === "full" && !bill.paid_at)) return tally.owed;
  const amountPence = tally.owed * LABEL_PENCE;
  const vatPence = Math.round(amountPence * VAT);
  const demo = process.env.DEMO_MODE === "1" || !process.env.STRIPE_SECRET_KEY;
  let ref: string | null = null;
  if (!demo) {
    if (!stripe) throw new Error("Stripe is not set up");
    const taxRate = env.stripe.vatRate();
    const item = await stripe.invoiceItems.create({
      customer: customerId,
      currency: "gbp",
      amount: taxRate ? amountPence : amountPence + vatPence,
      description: `${tally.owed} labels at 75p${taxRate ? "" : ", VAT included"}`,
      tax_rates: taxRate ? [taxRate] : undefined,
      metadata: { dealer_id: dealerId, purpose: "labels", copies: String(tally.owed) },
    }, { idempotencyKey: `full-labels-${dealerId}-${tally.billed}` });
    ref = item.id;
  }
  const { error } = await db.from("label_bills").insert({
    dealer_id: dealerId,
    copies: tally.owed,
    amount_pence: amountPence,
    vat_pence: vatPence,
    stripe_invoice_id: ref,
    source: "full",
    paid_at: null,
  });
  if (error && !String(error.message).includes("duplicate")) throw new Error(error.message);
  return tally.owed;
}

/** A Stripe invoice that included labels has been paid. Already paid rows stay as they are. */
export async function markLabelInvoicePaid(db: Admin, invoice: Stripe.Invoice): Promise<void> {
  const now = new Date().toISOString();
  const lines = invoice.lines?.data ?? [];
  const labelLine = lines.find((line) => line.metadata?.purpose === "labels");
  const dealerId = invoice.metadata?.dealer_id ?? labelLine?.metadata?.dealer_id;
  const isLabels = invoice.metadata?.purpose === "labels" || !!labelLine;
  if (invoice.id) {
    await db.from("label_bills").update({ paid_at: now }).eq("stripe_invoice_id", invoice.id).is("paid_at", null);
  }
  if (!isLabels || !dealerId) return;
  await db.from("label_bills").update({ paid_at: now, stripe_invoice_id: invoice.id }).eq("dealer_id", dealerId).eq("source", "full").is("paid_at", null);
}
