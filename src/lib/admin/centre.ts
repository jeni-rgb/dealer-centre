import type { Admin } from "@/lib/supabase/server";
import { periodKey } from "@/lib/statements/compute";

/** Everything the operator needs about one centre, in one read. */
export async function centreOverview(db: Admin, centreId: string) {
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const since = monthStart.toISOString();
  const [{ data: centre }, { data: owners }, { data: links }, { data: appUsers }, { data: sales }, { data: channels }, { data: fulfil }, { data: commissions }, { data: statements }, { data: items }] = await Promise.all([
    db.from("centres").select("*").eq("id", centreId).single(),
    db.from("centre_owners").select("user_id, users(email, created_at)").eq("centre_id", centreId),
    db.from("dealer_centres").select("dealer_id, status, pitch_numbers, rent_pence, rent_mode, joined_at, left_at, dealers(name, code, plan, placeholder, trial_ends_at, monthly_sold_limit)").eq("centre_id", centreId),
    db.from("users").select("dealer_id").not("dealer_id", "is", null),
    db.from("sales").select("id, dealer_id, amount_pence, sold_at, payment_type, channels:channel_id(type, owner_type)").eq("centre_id", centreId).is("voided_at", null).gte("sold_at", since),
    db.from("channels").select("id, type, status, external_account_id, last_webhook_at, created_at").eq("owner_type", "centre").eq("owner_id", centreId),
    db.from("fulfilments").select("status").eq("centre_id", centreId),
    db.from("centre_commissions").select("period, online_gross_pence, platform_pence, vat_pence, centre_pence, stripe_invoice_item_id, charged_at").eq("centre_id", centreId).order("period", { ascending: false }).limit(6),
    db.from("statements").select("period, status, paid_at, net_pence").eq("centre_id", centreId).order("period", { ascending: false }).limit(200),
    db.from("items").select("id").eq("centre_id", centreId).eq("status", "live"),
  ]);
  if (!centre) return null;
  const onApp = new Set((appUsers ?? []).map((u) => u.dealer_id));
  const all = sales ?? [];
  const online = all.filter((s) => { const c = s.channels as unknown as { type: string; owner_type: string } | null; return !!c && c.owner_type === "centre" && !["square", "manual"].includes(c.type); });
  const manual = all.filter((s) => (s.channels as unknown as { type: string } | null)?.type === "manual");
  const { data: lastEod } = await db.from("sales").select("sold_at, created_at").eq("centre_id", centreId).is("voided_at", null).order("sold_at", { ascending: false }).limit(1);
  const lastPeriod = periodKey(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1));
  const lastStatements = (statements ?? []).filter((s) => s.period === lastPeriod);
  return {
    centre,
    owners: (owners ?? []).map((o) => ({ user_id: o.user_id, email: (o.users as unknown as { email: string } | null)?.email ?? "" })),
    dealers: (links ?? []).map((l) => { const d = l.dealers as unknown as { name: string; code: string; plan: string; placeholder: boolean; trial_ends_at: string | null; monthly_sold_limit: number } | null; return { dealer_id: l.dealer_id, name: d?.name ?? "", code: d?.code ?? "", plan: d?.plan ?? "", placeholder: !!d?.placeholder, on_app: onApp.has(l.dealer_id), status: l.status, pitches: l.pitch_numbers ?? [], rent_pence: l.rent_pence, rent_mode: l.rent_mode, left_at: l.left_at, sales_month: all.filter((s) => s.dealer_id === l.dealer_id).reduce((a, s) => a + s.amount_pence, 0) }; }),
    month: { gross: all.reduce((a, s) => a + s.amount_pence, 0), online: online.reduce((a, s) => a + s.amount_pence, 0), count: all.length, online_count: online.length, eod_count: manual.length, card: all.filter((s) => s.payment_type && s.payment_type !== "CASH").reduce((a, s) => a + s.amount_pence, 0) },
    channels: channels ?? [],
    orders: { open: (fulfil ?? []).filter((f) => ["new", "collected", "at_unit", "labelled"].includes(f.status)).length, missing: (fulfil ?? []).filter((f) => f.status === "missing").length },
    commissions: commissions ?? [],
    lastStatements: { period: lastPeriod, total: lastStatements.length, paid: lastStatements.filter((s) => s.paid_at).length, owed: lastStatements.filter((s) => !s.paid_at).reduce((a, s) => a + Math.max(0, s.net_pence), 0) },
    items_live: (items ?? []).length,
    last_sale_recorded_at: lastEod?.[0]?.created_at ?? lastEod?.[0]?.sold_at ?? null,
  };
}

export async function dealerOverview(db: Admin, dealerId: string) {
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const [{ data: dealer }, { data: users }, { data: links }, { data: sales }, { data: channels }, { data: live }, { data: pushes }, { data: statements }] = await Promise.all([
    db.from("dealers").select("*").eq("id", dealerId).single(),
    db.from("users").select("id, email, created_at").eq("dealer_id", dealerId),
    db.from("dealer_centres").select("centre_id, status, pitch_numbers, rent_pence, rent_mode, joined_at, left_at, centres(name, status)").eq("dealer_id", dealerId),
    db.from("sales").select("amount_pence, centre_id, channels:channel_id(type, owner_type)").eq("dealer_id", dealerId).is("voided_at", null).gte("sold_at", monthStart.toISOString()),
    db.from("channels").select("id, type, status, external_account_id, last_webhook_at").eq("owner_type", "dealer").eq("owner_id", dealerId),
    db.from("items").select("id").eq("dealer_id", dealerId).eq("status", "live"),
    db.from("push_subscriptions").select("id").eq("dealer_id", dealerId),
    db.from("statements").select("period, centre_id, status, paid_at, net_pence, centres(name)").eq("dealer_id", dealerId).order("period", { ascending: false }).limit(6),
  ]);
  if (!dealer) return null;
  return {
    dealer, users: users ?? [],
    centres: (links ?? []).map((l) => ({ ...l, name: (l.centres as unknown as { name: string } | null)?.name ?? "", centre_status: (l.centres as unknown as { status: string } | null)?.status ?? "" })),
    month: { gross: (sales ?? []).reduce((a, s) => a + s.amount_pence, 0), count: (sales ?? []).length },
    channels: channels ?? [],
    items_live: (live ?? []).length,
    push_devices: (pushes ?? []).length,
    statements: (statements ?? []).map((s) => ({ ...s, centre: (s.centres as unknown as { name: string } | null)?.name ?? "" })),
  };
}
