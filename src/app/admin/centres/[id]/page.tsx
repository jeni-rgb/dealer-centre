import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Kpi, Pill, money } from "@/components/ui";
import { centreOverview } from "@/lib/admin/centre";
import { periodLabel } from "@/lib/statements/compute";
import { Actions } from "../../actions";

const when = (s: string | null | undefined) => (s ? new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "never");
const stripeUrl = (id: string | null) => (id ? `https://dashboard.stripe.com/customers/${id}` : null);

/** One centre, everything the operator needs, and the buttons to act on it. */
export default async function CentreAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const o = await centreOverview(db, id);
  if (!o) notFound();
  const c = o.centre;
  const { data: log } = await db.from("admin_actions").select("action, detail, created_at, users:actor_id(email)").eq("target_type", "centre").eq("target_id", id).order("created_at", { ascending: false }).limit(20);
  const planPill = c.status === "unclaimed" ? <Pill kind="neutral">Added by dealers, unclaimed</Pill> : c.plan === "pro" ? <Pill kind="success">Paying</Pill> : c.plan === "comp" ? <Pill kind="accent">Free until {c.trial_ends_at ? new Date(c.trial_ends_at).toLocaleDateString("en-GB") : "?"}</Pill> : c.plan === "trial" ? <Pill kind="warning">Trial{c.trial_ends_at ? ` to ${new Date(c.trial_ends_at).toLocaleDateString("en-GB")}` : ""}</Pill> : <Pill kind="danger">{c.plan}</Pill>;
  const square = o.channels.find((x) => x.type === "square"), shop = o.channels.find((x) => x.type === "shopify");
  const stale = o.last_sale_recorded_at && Date.now() - new Date(o.last_sale_recorded_at).getTime() > 3 * 86400000;
  const api = `/api/admin/centres/${id}`;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin" className="text-[12px] text-ink-muted">‹ All centres</Link>
          <h1 className="text-[26px] font-semibold">{c.name}</h1>
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">{planPill}<span>code <span className="ticket">{c.invite_code}</span></span><span>· {c.till === "ordinary" ? "kit plan (no POS)" : c.till === "square" ? "own till plan, Square" : "own till plan, other POS"}</span><span>· {c.address ?? "no address"}</span><span>· since {new Date(c.created_at).toLocaleDateString("en-GB")}</span></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/centre?centre=${id}`} className="btn-sm">Open as this centre</Link>
          {stripeUrl(c.stripe_customer_id) && <a className="btn-sm-secondary" href={stripeUrl(c.stripe_customer_id)!} target="_blank" rel="noreferrer">Stripe customer</a>}
          <a className="btn-sm-secondary" href={`/api/admin/export?centre=${id}`}>CSV</a>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Kpi label="Sales this month" value={money(o.month.gross)} sub={`${o.month.count} sales · ${o.month.gross ? Math.round((o.month.card / o.month.gross) * 100) : 0}% card`} />
        <Kpi label="Online this month" value={money(o.month.online)} sub={`${o.month.online_count} orders · ${o.orders.open} open`} tone={o.orders.missing ? "danger" : undefined} />
        <Kpi label="Dealers" value={String(o.dealers.filter((d) => d.status === "active").length)} sub={`${o.dealers.filter((d) => d.on_app && d.status === "active").length} on the app · ${o.dealers.filter((d) => d.status === "pending").length} pending`} />
        <Kpi label="Live items" value={String(o.items_live)} />
        <Kpi label="Last sale recorded" value={o.last_sale_recorded_at ? new Date(o.last_sale_recorded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "never"} sub={stale ? "Over 3 days, check End of day" : `${o.month.eod_count} by End of day this month`} tone={stale ? "warning" : undefined} />
        <Kpi label={`Statements ${periodLabel(o.lastStatements.period).split(" ")[0]}`} value={`${o.lastStatements.paid}/${o.lastStatements.total} paid`} sub={o.lastStatements.owed ? `${money(o.lastStatements.owed)} still owed to dealers` : "All paid"} tone={o.lastStatements.owed ? "warning" : undefined} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 text-[15px] font-semibold">Account</h2>
          <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-[13px]">
            <dt className="text-ink-muted">Owners</dt><dd>{o.owners.length ? o.owners.map((w) => <span key={w.user_id} className="block">{w.email}</span>) : <span className="text-danger">No owner account</span>}</dd>
            <dt className="text-ink-muted">Plan</dt><dd>{c.plan} {c.trial_ends_at ? `· until ${new Date(c.trial_ends_at).toLocaleDateString("en-GB")}` : ""}</dd>
            <dt className="text-ink-muted">Stripe</dt><dd>{c.stripe_subscription_id ? <span>subscription {c.stripe_subscription_id}</span> : c.stripe_customer_id ? <span>customer {c.stripe_customer_id}, no subscription yet</span> : <span className="text-danger">No card on file</span>}</dd>
            <dt className="text-ink-muted">Terms</dt><dd>{c.commission_bps / 100}% floor · 20% online (15/5) · rent {c.charges_rent ? c.rent_frequency : "none"} · statement day {c.statement_day}</dd>
            <dt className="text-ink-muted">Square</dt><dd>{square ? `${square.status} · ${square.external_account_id} · last event ${when(square.last_webhook_at)}` : c.till === "square" ? <span className="text-danger">Not connected</span> : "n/a"}</dd>
            <dt className="text-ink-muted">Shopify shop</dt><dd>{shop ? `${shop.status} · ${shop.external_account_id} · last event ${when(shop.last_webhook_at)}` : <span className="text-warning">Not connected</span>}</dd>
            <dt className="text-ink-muted">Note</dt><dd className="whitespace-pre-wrap">{c.admin_note ?? <span className="text-ink-muted">none</span>}</dd>
          </dl>
          <div className="mt-4 border-t border-border pt-4">
            <Actions endpoint={api} actions={[
              { label: "Resend owner sign in link", body: { action: "resend_link", email: o.owners[0]?.email ?? "" }, prompt: o.owners[0] ? undefined : { key: "email", label: "Owner email", type: "email" } },
              { label: "Add an owner", body: { action: "add_owner" }, prompt: { key: "email", label: "Email of the new owner", type: "email" } },
              { label: "Add free months", body: { action: "free_months" }, prompt: { key: "months", label: "How many free months?", type: "number" } },
              { label: "Reset till PIN", body: { action: "reset_pin" }, confirm: "Reset the till PIN? The old one stops working now." },
              { label: "Set till: kit plan", body: { action: "set_till", till: "ordinary" } }, { label: "Set till: Square", body: { action: "set_till", till: "square" } }, { label: "Set till: other POS", body: { action: "set_till", till: "other" } },
              { label: "Edit note", body: { action: "note" }, prompt: { key: "note", label: "Private note about this centre" } },
              { label: "Mark paying (no Stripe)", body: { action: "set_plan", plan: "pro" }, confirm: "Mark as paying without Stripe? Only for centres invoiced by hand." },
              { label: "Cancel at period end", body: { action: "cancel_subscription", at_period_end: true }, confirm: "Cancel the Stripe subscription at the end of the paid period?", danger: true },
              { label: "Cancel now", body: { action: "cancel_subscription", at_period_end: false }, confirm: "Cancel immediately? Access stops now.", danger: true },
            ]} />
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-border px-5 py-3"><h2 className="text-[15px] font-semibold">Dealers</h2></div>
          <table className="w-full text-[13px]">
            <thead className="text-left text-[11px] text-ink-muted"><tr className="border-b border-border"><th className="px-4 py-2 font-medium">Dealer</th><th className="py-2 pr-3 font-medium">App</th><th className="py-2 pr-3 font-medium">Plan</th><th className="py-2 pr-3 font-medium">Pitch</th><th className="py-2 pr-3 text-right font-medium">Rent</th><th className="px-4 py-2 text-right font-medium">Sales MTD</th></tr></thead>
            <tbody>
              {o.dealers.filter((d) => !d.left_at).sort((a, b) => b.sales_month - a.sales_month).map((d) => (
                <tr key={d.dealer_id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2"><Link href={`/admin/dealers/${d.dealer_id}`} className="font-medium text-accent">{d.name}</Link> <span className="ticket text-ink-muted">{d.code}</span>{d.status === "pending" && <Pill kind="warning" className="ml-2">pending</Pill>}</td>
                  <td className="py-2 pr-3">{d.on_app ? <Pill kind="success">yes</Pill> : <Pill kind="neutral">no</Pill>}</td>
                  <td className="py-2 pr-3 text-ink-muted">{d.on_app ? d.plan : "–"}</td>
                  <td className="py-2 pr-3 text-ink-muted">{d.pitches.join(", ")}</td>
                  <td className="num py-2 pr-3 text-right text-ink-muted">{d.rent_mode === "rent" ? money(d.rent_pence) : "comm."}</td>
                  <td className="num px-4 py-2 text-right">{money(d.sales_month)}</td>
                </tr>
              ))}
              {o.dealers.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-muted">No dealers yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-border px-5 py-3"><h2 className="text-[15px] font-semibold">Online commission charged</h2></div>
          <table className="w-full text-[13px]">
            <thead className="text-left text-[11px] text-ink-muted"><tr className="border-b border-border"><th className="px-4 py-2 font-medium">Month</th><th className="py-2 text-right font-medium">Online sales</th><th className="py-2 text-right font-medium">Our 15%</th><th className="py-2 text-right font-medium">VAT</th><th className="py-2 text-right font-medium">Centre 5%</th><th className="px-4 py-2 text-right font-medium">Charged</th></tr></thead>
            <tbody>
              {o.commissions.map((m) => <tr key={m.period} className="border-b border-border last:border-0"><td className="px-4 py-2">{periodLabel(m.period)}</td><td className="num py-2 text-right">{money(m.online_gross_pence)}</td><td className="num py-2 text-right">{money(m.platform_pence)}</td><td className="num py-2 text-right text-ink-muted">{money(m.vat_pence)}</td><td className="num py-2 text-right text-ink-muted">{money(m.centre_pence)}</td><td className="px-4 py-2 text-right">{m.stripe_invoice_item_id ? <Pill kind="success">on invoice</Pill> : m.platform_pence ? <Pill kind="warning">not charged</Pill> : <span className="text-ink-muted">nothing</span>}</td></tr>)}
              {o.commissions.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-muted">No month end yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-border px-5 py-3"><h2 className="text-[15px] font-semibold">Admin actions on this centre</h2></div>
          <div className="divide-y divide-border text-[13px]">
            {(log ?? []).map((l, i) => <div key={i} className="flex items-center justify-between px-5 py-2"><span><span className="font-medium">{l.action.replace(/_/g, " ")}</span> <span className="text-ink-muted">{(l.users as unknown as { email: string } | null)?.email ?? ""}</span></span><span className="text-ink-muted">{when(l.created_at)}</span></div>)}
            {(log ?? []).length === 0 && <p className="px-5 py-6 text-center text-ink-muted">Nothing yet.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
