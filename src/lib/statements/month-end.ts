import Stripe from "stripe";
import { env } from "@/lib/env";
import type { Admin } from "@/lib/supabase/server";
import { computeStatement, issueStatement, periodKey, periodBounds, periodLabel, type Statement } from "./compute";
import { CENTRE_FULL_CREDIT_PENCE } from "@/lib/billing/pricing";
import { pounds } from "@/lib/email/layout";
import { statementLetter } from "@/lib/email/letters";
import { sendBranded } from "@/lib/email/send";

const PLATFORM_BPS = 1500, CENTRE_BPS = 500, VAT_BPS = 2000;

/**
 * Month end for one period (default: the month that has just closed).
 * 1. Every dealer at every centre gets a statement row (upsert, so running twice refreshes rather than duplicates).
 * 2. Every centre's online sales are totalled; Dealer Centre's 15% plus VAT goes on the centre's Stripe customer as
 *    an invoice item, so it is charged with the next £299 invoice. Recorded in centre_commissions with the invoice
 *    item id, and never charged twice: the row's stripe_invoice_item_id and a Stripe idempotency key both guard it.
 */
export async function runMonthEnd(db: Admin, period = lastClosedPeriod()) {
  const { start, end } = periodBounds(period);
  const out = { period, statements: 0, commissions: 0, charged: 0, credits: 0, errors: [] as string[] };

  const { data: centres } = await db.from("centres").select("id, name, stripe_customer_id, status").neq("status", "unclaimed");
  for (const c of centres ?? []) {
    // 1. statements: everyone linked to the centre during the month
    const { data: links } = await db.from("dealer_centres").select("dealer_id").eq("centre_id", c.id).neq("status", "pending").or(`left_at.is.null,left_at.gte.${start.toISOString()}`);
    for (const l of links ?? []) {
      try {
        const st = await computeStatement(db, l.dealer_id, c.id, period);
        if (st) { await issueStatement(db, st); out.statements++; await emailStatement(db, st); }
      } catch (e) { out.errors.push(`statement ${c.id}/${l.dealer_id}: ${(e as Error).message}`); }
    }

    // 2. commission
    try {
      const { data: sales } = await db.from("sales").select("amount_pence, channels:channel_id(type, owner_type)")
        .eq("centre_id", c.id).is("voided_at", null).gte("sold_at", start.toISOString()).lt("sold_at", end.toISOString());
      const online = (sales ?? []).filter((s) => { const ch = s.channels as unknown as { type: string; owner_type: string } | null; return !!ch && !["square", "manual"].includes(ch.type) && ch.owner_type === "centre"; });
      const gross = online.reduce((a, s) => a + s.amount_pence, 0);
      const platform = Math.round((gross * PLATFORM_BPS) / 10000);
      const vat = Math.round((platform * VAT_BPS) / 10000);
      const centreShare = Math.round((gross * CENTRE_BPS) / 10000);

      const { data: row } = await db.from("centre_commissions").upsert({
        centre_id: c.id, period, online_gross_pence: gross, platform_bps: PLATFORM_BPS, centre_bps: CENTRE_BPS,
        platform_pence: platform, vat_pence: vat, centre_pence: centreShare, updated_at: new Date().toISOString(),
      }, { onConflict: "centre_id,period" }).select("id, stripe_invoice_item_id").single();
      out.commissions++;

      if (row && !row.stripe_invoice_item_id && platform > 0 && c.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const taxRate = env.stripe.vatRate(); // a 20% VAT tax rate id; if unset, VAT is added into the amount
        const item = await stripe.invoiceItems.create({
          customer: c.stripe_customer_id,
          currency: "gbp",
          amount: taxRate ? platform : platform + vat,
          description: `Online shop commission, ${periodLabel(period)}: 15% of £${(gross / 100).toFixed(2)} online sales${taxRate ? "" : " including VAT"}`,
          tax_rates: taxRate ? [taxRate] : undefined,
          metadata: { centre_id: c.id, period, online_gross_pence: String(gross), platform_pence: String(platform), vat_pence: String(vat) },
        }, { idempotencyKey: `commission-${c.id}-${period}` });
        await db.from("centre_commissions").update({ stripe_invoice_item_id: item.id, charged_at: new Date().toISOString() }).eq("id", row.id);
        out.charged++;
      }
      await creditFullDealers(db, c, period).then((n) => { out.credits += n; }).catch((e) => out.errors.push(`full credit ${c.id}: ${(e as Error).message}`));
    } catch (e) { out.errors.push(`commission ${c.id}: ${(e as Error).message}`); }
  }
  return out;
}

/** £2.50 ex VAT off the centre fee for each dealer on the new Full plan. Legacy plans are not counted. Idempotent in Stripe. */
async function creditFullDealers(db: Admin, c: { id: string; stripe_customer_id: string | null }, period: string): Promise<number> {
  if (!c.stripe_customer_id || !process.env.STRIPE_SECRET_KEY) return 0;
  const { data: links, error } = await db.from("dealer_centres").select("dealer_id, dealers(billing_model, plan)").eq("centre_id", c.id).is("left_at", null);
  if (error) return 0;
  const count = (links ?? []).filter((l) => (l.dealers as unknown as { billing_model?: string; plan?: string } | null)?.billing_model === "full").length;
  if (!count) return 0;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const taxRate = env.stripe.vatRate();
  await stripe.invoiceItems.create({
    customer: c.stripe_customer_id,
    currency: "gbp",
    amount: -CENTRE_FULL_CREDIT_PENCE * count,
    description: `Full dealers at your centre: £2.50 off for each of ${count}`,
    tax_rates: taxRate ? [taxRate] : undefined,
    metadata: { centre_id: c.id, period, full_dealers: String(count) },
  }, { idempotencyKey: `full-credit-${c.id}-${period}` });
  return count;
}

/** One statement email per dealer, centre and month. A second month end run does not send it again. */
async function emailStatement(db: Admin, st: Statement) {
  try {
    const key = `${st.dealer.id}:${st.centre.id}:${st.period}`;
    const { data } = await db.from("admin_actions").select("detail").eq("action", "statement_email").eq("target_id", st.dealer.id);
    if ((data ?? []).some((r) => (r.detail as { key?: string } | null)?.key === key)) return;
    const { data: users } = await db.from("users").select("email").eq("dealer_id", st.dealer.id);
    const to = (users ?? []).map((u) => u.email).filter((e): e is string => !!e);
    const sent = await sendBranded(to, statementLetter({
      dealerName: st.dealer.name,
      centreName: st.centre.name,
      period: st.label,
      net: pounds(st.net_pence),
      sales: st.sales_count,
      href: `${env.appUrl()}/app/statements`,
    }));
    if (sent === "sent") {
      await db.from("admin_actions").insert({ actor_id: null, target_type: "dealer", target_id: st.dealer.id, action: "statement_email", detail: { key } });
    }
  } catch (e) {
    console.error("[statement email]", e);
  }
}

/** The month before the current one, as YYYY-MM-01. */
export function lastClosedPeriod(now = new Date()) {
  return periodKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
}
