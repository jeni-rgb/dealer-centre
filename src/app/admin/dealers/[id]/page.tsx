import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Kpi, Pill, money } from "@/components/ui";
import { dealerOverview } from "@/lib/admin/centre";
import { periodLabel } from "@/lib/statements/compute";
import { ActionMenu } from "../../actions";
import { MoveCentre } from "./move";
import { formatShortDate, plusVat } from "@/lib/billing/pricing";
import { labelFigures } from "@/lib/billing/labels";
import { reconcileDealerTrial } from "@/lib/billing/dealer-trial";
import { dealerAdminFacts } from "@/lib/admin/status";
import { PageHeader, StatusBadge, Tabs } from "../../ui";

const when = (s: string | null | undefined) => (s ? new Date(s).toLocaleString("en-GB", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }) : "Never");

/** One dealer: plan, billing, labels, stock and activity. */
export default async function DealerAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const o = await dealerOverview(db, id);
  if (!o) notFound();
  let d = o.dealer;
  if (d.stripe_subscription_id && d.plan === "trial" && !d.placeholder) {
    const synced = await reconcileDealerTrial(db, d).catch((e) => { console.error("[dealer trial]", e); return null; });
    if (synced) d = { ...d, plan: synced.plan, trial_ends_at: synced.trial_ends_at };
  }
  const labels = await labelFigures(db, id);
  const [{ data: log }, { data: allCentres }] = await Promise.all([
    db.from("admin_actions").select("action, created_at, users:actor_id(email)").eq("target_type", "dealer").eq("target_id", id).order("created_at", { ascending: false }).limit(20),
    db.from("centres").select("id, name").neq("status", "unclaimed").order("name"),
  ]);
  const facts = dealerAdminFacts(d);
  const tasterOn = facts.status === "Trial" && !!d.taster_ends_at && !!d.taster_accepted_at;
  const legacy = !d.billing_model;
  const over = legacy && d.monthly_sold_limit < 100000 && o.month.count > d.monthly_sold_limit;
  const shop = o.channels.find((c) => c.type === "shopify");
  const api = `/api/admin/dealers/${id}`;
  const active = o.centres.filter((c) => !c.left_at);
  const owed = labels.tally.owed;

  return (
    <>
      <PageHeader eyebrow="Dealers" title={d.name} subtitle={`Code ${d.code}. Created ${formatShortDate(d.created_at)}. ${facts.usage}.`}>
        <StatusBadge status={facts.status} />
        <Pill kind="neutral">{facts.plan}</Pill>
        {!d.placeholder && <a href={`/api/admin/impersonate?dealer=${id}`} className="btn-sm-secondary">Open as dealer</a>}
        <ActionMenu endpoint={api} actions={[
          { label: "Start taster", body: { action: "start_taster" }, confirm: "Start 14 days of named sales and 25 free labels? Nothing is charged.", disabled: d.billing_model === "full" || d.plan === "pro" || tasterOn },
          { label: "Extend taster", body: { action: "extend_trial" }, prompt: { key: "days", label: "Add how many days?", type: "number" } },
          { label: "Resend sign in link", body: { action: "resend_link", email: o.users[0]?.email ?? "" }, prompt: o.users[0] ? undefined : { key: "email", label: "Email", type: "email" } },
          { label: "Give Full free", body: { action: "set_plan", plan: "comp" }, confirm: "Give this dealer Full free, with unlimited named sales?" },
          { label: "Edit note", body: { action: "note" }, prompt: { key: "note", label: "Private note about this dealer" } },
          { label: "Bill labels", body: { action: "bill_labels" }, confirm: owed > 0 ? `Bill ${owed} labels, ${plusVat(labels.tally.amountPence)}?` : undefined, disabled: owed < 1, hint: owed < 1 ? "Nothing owed" : `${owed} labels, ${plusVat(labels.tally.amountPence)}` },
          { label: "Cancel at period end", body: { action: "cancel_subscription", at_period_end: true }, confirm: "Cancel the Stripe subscription at period end?", danger: true },
        ]} />
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Usage" value={String(o.month.count)} sub={legacy && d.monthly_sold_limit < 100000 ? `of ${d.monthly_sold_limit} this month` : "Unlimited"} tone={over ? "warning" : undefined} />
        <Kpi label="Sales" value={money(o.month.gross)} sub="This month" />
        <Kpi label="Live items" value={String(o.items_live)} />
        <Kpi label="Centres" value={String(active.length)} />
        <Kpi label="Users" value={String(o.users.length)} sub={o.push_devices ? `${o.push_devices} notified` : "Notifications off"} />
      </div>

      <Tabs labels={["Overview", "Billing", "Labels", "Stock", "Activity"]}>
        {[
          <div key="overview" className="grid gap-5 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="mb-3 text-[15px] font-semibold">Account</h2>
              <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-[13px]">
                <dt className="text-ink-muted">Plan</dt><dd>{facts.plan}</dd>
                <dt className="text-ink-muted">Status</dt><dd><StatusBadge status={facts.status} /></dd>
                <dt className="text-ink-muted">Usage</dt><dd>{facts.usage}</dd>
                <dt className="text-ink-muted">Users</dt><dd>{o.users.length ? o.users.map((u) => <span key={u.id} className="block">{u.email}</span>) : "None"}</dd>
                <dt className="text-ink-muted">Owner</dt><dd>{o.users[0]?.email ?? "None"}</dd>
                <dt className="text-ink-muted">Created</dt><dd>{formatShortDate(d.created_at)}</dd>
                <dt className="text-ink-muted">Note</dt><dd className="whitespace-pre-wrap">{d.admin_note ?? "None"}</dd>
              </dl>
            </section>
            <section className="card p-5">
              <h2 className="mb-3 text-[15px] font-semibold">Connections</h2>
              <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-[13px]">
                <dt className="text-ink-muted">Shopify</dt><dd>{shop ? `${shop.status}, ${shop.external_account_id}. Last event ${when(shop.last_webhook_at)}.` : "Not connected"}</dd>
                <dt className="text-ink-muted">Defaults</dt><dd>Own shop {d.default_own_shopify ? "on" : "off"}. Centre shop {d.default_centre_shopify ? "on" : "off"}.</dd>
                <dt className="text-ink-muted">Taster</dt><dd>{d.taster_accepted_at ? `Accepted ${formatShortDate(d.taster_accepted_at)}.${d.taster_ends_at ? ` Until ${formatShortDate(d.taster_ends_at)}.` : ""}` : "Not started"}{d.taster_token && facts.status !== "Active" ? <a className="mt-1 block text-accent" href={`/taster?t=${d.taster_token}`}>Open the invite</a> : null}</dd>
              </dl>
            </section>
          </div>,
          <section key="billing" className="card p-5">
            <h2 className="mb-3 text-[15px] font-semibold">Subscription</h2>
            <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-[13px]">
              <dt className="text-ink-muted">Subscription</dt><dd>{d.stripe_subscription_id ?? "None"}</dd>
              <dt className="text-ink-muted">Customer</dt><dd>{d.stripe_customer_id ? <a className="text-accent" href={`https://dashboard.stripe.com/customers/${d.stripe_customer_id}`} target="_blank" rel="noreferrer">{d.stripe_customer_id}</a> : "None"}</dd>
              <dt className="text-ink-muted">MRR</dt><dd>{facts.status === "Active" && d.plan === "pro" ? money((d.monthly_sold_limit ?? 25) >= 100000 ? 15000 : (d.monthly_sold_limit ?? 25) > 25 ? 10000 : 2500) : money(0)}</dd>
            </dl>
            <h3 className="mb-2 mt-6 text-[14px] font-semibold">Statements</h3>
            <div className="divide-y divide-border text-[13px]">
              {o.statements.map((s, i) => <div key={i} className="flex items-center justify-between py-2"><span>{periodLabel(s.period)}, {s.centre}</span><span className="flex items-center gap-3"><span className="num">{money(s.net_pence)}</span>{s.paid_at ? <Pill kind="success">Paid</Pill> : <Pill kind="warning">{s.status}</Pill>}</span></div>)}
              {o.statements.length === 0 && <p className="py-4 text-ink-muted">No statements yet.</p>}
            </div>
          </section>,
          <section key="labels" className="card p-5">
            <h2 className="mb-3 text-[15px] font-semibold">Labels</h2>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi label="Printed" value={String(labels.tally.printed)} sub={`Free used ${labels.tally.freeUsed}`} />
              <Kpi label="Owed" value={String(owed)} sub={owed > 0 ? plusVat(labels.tally.amountPence) : "Nothing owed"} tone={owed ? "warning" : undefined} />
              <Kpi label="Billed" value={String(labels.unpaidCopies)} sub={labels.unpaidCopies ? plusVat(labels.unpaidPence) : "None waiting"} />
              <Kpi label="Paid" value={String(labels.paidCopies)} sub={labels.paidCopies ? plusVat(labels.paidPence) : "None paid"} />
            </div>
            <p className="text-[13px] text-ink-muted">{d.listing_mode === "self" ? "Dealer loads their own stock. Centre labels still count." : d.listing_mode === "staff" ? "We label the stock. Those labels count too." : "Centre labels count. Their own labels count when we label the stock."}</p>
            <h3 className="mb-2 mt-5 text-[14px] font-semibold">Billing history</h3>
            <div className="divide-y divide-border text-[13px]">
              {labels.bills.map((b) => <div key={b.id} className="flex items-center justify-between py-2"><span>{b.copies} labels, {plusVat(b.amount_pence)}</span><span className="text-ink-muted">{b.paid_at ? "Paid" : "Billed"} {formatShortDate(b.created_at)}{b.stripe_invoice_id ? `. ${b.stripe_invoice_id}` : ""}</span></div>)}
              {labels.bills.length === 0 && <p className="py-4 text-ink-muted">No invoices yet.</p>}
            </div>
          </section>,
          <section key="stock" className="card p-5">
            <h2 className="mb-3 text-[15px] font-semibold">Centres</h2>
            <div className="divide-y divide-border text-[13px]">
              {o.centres.map((c) => <div key={c.centre_id} className="flex items-center justify-between py-2"><span><Link href={`/admin/centres/${c.centre_id}`} className="font-medium text-accent">{c.name}</Link> <span className="text-ink-muted">Pitch {c.pitch_numbers?.join(", ") || "none"}. {c.rent_mode === "rent" ? money(c.rent_pence) : "Commission only"}.</span></span>{c.left_at ? <Pill kind="neutral">Left {formatShortDate(c.left_at)}</Pill> : c.status === "pending" ? <Pill kind="warning">Pending</Pill> : <Pill kind="success">Active</Pill>}</div>)}
              {o.centres.length === 0 && <p className="py-4 text-ink-muted">Not at any centre.</p>}
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <MoveCentre dealerId={id} current={active.map((c) => ({ id: c.centre_id, name: c.name }))} centres={allCentres ?? []} />
            </div>
          </section>,
          <section key="activity" className="card overflow-hidden">
            <div className="border-b border-border px-5 py-3"><h2 className="text-[15px] font-semibold">Activity</h2></div>
            <div className="divide-y divide-border text-[13px]">
              {(log ?? []).map((l, i) => <div key={i} className="flex items-center justify-between px-5 py-2"><span><span className="font-medium">{l.action.replace(/_/g, " ")}</span> <span className="text-ink-muted">{(l.users as unknown as { email: string } | null)?.email ?? ""}</span></span><span className="text-ink-muted">{when(l.created_at)}</span></div>)}
              {(log ?? []).length === 0 && <p className="px-5 py-6 text-center text-ink-muted">Nothing yet.</p>}
            </div>
          </section>,
        ]}
      </Tabs>
    </>
  );
}
