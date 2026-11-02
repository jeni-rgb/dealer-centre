import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Kpi, Pill, money } from "@/components/ui";
import { dealerOverview } from "@/lib/admin/centre";
import { periodLabel } from "@/lib/statements/compute";
import { Actions } from "../../actions";
import { MoveCentre } from "./move";

const when = (s: string | null | undefined) => (s ? new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "never");

/** One dealer: plan against usage, centres, connections, statements, and the buttons. */
export default async function DealerAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const o = await dealerOverview(db, id);
  if (!o) notFound();
  const d = o.dealer;
  const [{ data: log }, { data: allCentres }] = await Promise.all([
    db.from("admin_actions").select("action, created_at, users:actor_id(email)").eq("target_type", "dealer").eq("target_id", id).order("created_at", { ascending: false }).limit(20),
    db.from("centres").select("id, name").neq("status", "unclaimed").order("name"),
  ]);
  const tier = d.monthly_sold_limit >= 100000 ? "Pro, over 50" : d.monthly_sold_limit > 25 ? "Trade, 26 to 50" : "Starter, up to 25";
  const over = d.monthly_sold_limit < 100000 && o.month.count > d.monthly_sold_limit;
  const shop = o.channels.find((c) => c.type === "shopify");
  const api = `/api/admin/dealers/${id}`;
  const active = o.centres.filter((c) => !c.left_at);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin" className="text-[12px] text-ink-muted">‹ All dealers</Link>
          <h1 className="text-[26px] font-semibold">{d.name} <span className="ticket text-[16px] text-ink-muted">{d.code}</span></h1>
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
            {d.placeholder ? <Pill kind="neutral">Not on the app (centre added)</Pill> : d.plan === "pro" ? <Pill kind="success">Paying</Pill> : d.plan === "trial" ? <Pill kind="warning">Trial{d.trial_ends_at ? ` to ${new Date(d.trial_ends_at).toLocaleDateString("en-GB")}` : ""}</Pill> : d.plan === "comp" ? <Pill kind="accent">Free</Pill> : <Pill kind="danger">{d.plan}</Pill>}
            <span>{tier}</span><span>· since {new Date(d.created_at).toLocaleDateString("en-GB")}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!d.placeholder && <a href={`/api/admin/impersonate?dealer=${id}`} className="btn-sm">Open the app as this dealer</a>}
          {d.stripe_customer_id && <a className="btn-sm-secondary" href={`https://dashboard.stripe.com/customers/${d.stripe_customer_id}`} target="_blank" rel="noreferrer">Stripe customer</a>}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Kpi label="Sold this month" value={String(o.month.count)} sub={d.monthly_sold_limit >= 100000 ? "no cap" : `of ${d.monthly_sold_limit} on plan`} tone={over ? "warning" : undefined} />
        <Kpi label="Sales this month" value={money(o.month.gross)} />
        <Kpi label="Live items" value={String(o.items_live)} />
        <Kpi label="Centres" value={String(active.length)} sub={active.map((c) => c.name).join(", ") || "none"} />
        <Kpi label="Notifications" value={o.push_devices ? `${o.push_devices} device${o.push_devices === 1 ? "" : "s"}` : "off"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 text-[15px] font-semibold">Account</h2>
          <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-[13px]">
            <dt className="text-ink-muted">Sign ins</dt><dd>{o.users.length ? o.users.map((u) => <span key={u.id} className="block">{u.email}</span>) : <span className="text-ink-muted">none, placeholder dealer</span>}</dd>
            <dt className="text-ink-muted">Plan</dt><dd>{d.plan} · {tier}{d.trial_ends_at ? ` · trial/free until ${new Date(d.trial_ends_at).toLocaleDateString("en-GB")}` : ""}</dd>
            <dt className="text-ink-muted">Stripe</dt><dd>{d.stripe_subscription_id ?? <span className="text-ink-muted">no subscription</span>}</dd>
            <dt className="text-ink-muted">Own Shopify</dt><dd>{shop ? `${shop.status} · ${shop.external_account_id} · last event ${when(shop.last_webhook_at)}` : "not connected"}</dd>
            <dt className="text-ink-muted">Defaults</dt><dd>own Shopify {d.default_own_shopify ? "on" : "off"} · centre shop {d.default_centre_shopify ? "on" : "off"}</dd>
            <dt className="text-ink-muted">Note</dt><dd className="whitespace-pre-wrap">{d.admin_note ?? <span className="text-ink-muted">none</span>}</dd>
          </dl>
          <div className="mt-4 border-t border-border pt-4">
            <Actions endpoint={api} actions={[
              { label: "Resend sign in link", body: { action: "resend_link", email: o.users[0]?.email ?? "" }, prompt: o.users[0] ? undefined : { key: "email", label: "Email", type: "email" } },
              { label: "Extend trial", body: { action: "extend_trial" }, prompt: { key: "days", label: "Extend by how many days?", type: "number" } },
              { label: "Plan: Starter", body: { action: "set_limit", monthly_sold_limit: 25 } }, { label: "Plan: Trade", body: { action: "set_limit", monthly_sold_limit: 50 } }, { label: "Plan: Pro", body: { action: "set_limit", monthly_sold_limit: 100000 } },
              { label: "Mark free", body: { action: "set_plan", plan: "comp" } }, { label: "Mark paying (no Stripe)", body: { action: "set_plan", plan: "pro" }, confirm: "Mark as paying without Stripe?" },
              { label: "Edit note", body: { action: "note" }, prompt: { key: "note", label: "Private note about this dealer" } },
              { label: "Cancel at period end", body: { action: "cancel_subscription", at_period_end: true }, confirm: "Cancel the Stripe subscription at period end?", danger: true },
            ]} />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-[15px] font-semibold">Centres</h2>
          <div className="divide-y divide-border text-[13px]">
            {o.centres.map((c) => <div key={c.centre_id} className="flex items-center justify-between py-2"><span><Link href={`/admin/centres/${c.centre_id}`} className="font-medium text-accent">{c.name}</Link> <span className="text-ink-muted">· pitch {c.pitch_numbers?.join(", ") || "?"} · {c.rent_mode === "rent" ? money(c.rent_pence) : "commission only"}</span></span>{c.left_at ? <Pill kind="neutral">left {new Date(c.left_at).toLocaleDateString("en-GB")}</Pill> : c.status === "pending" ? <Pill kind="warning">pending</Pill> : <Pill kind="success">active</Pill>}</div>)}
            {o.centres.length === 0 && <p className="py-4 text-ink-muted">Not at any centre.</p>}
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <MoveCentre dealerId={id} current={active.map((c) => ({ id: c.centre_id, name: c.name }))} centres={allCentres ?? []} />
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-border px-5 py-3"><h2 className="text-[15px] font-semibold">Statements</h2></div>
          <div className="divide-y divide-border text-[13px]">
            {o.statements.map((s, i) => <div key={i} className="flex items-center justify-between px-5 py-2"><span>{periodLabel(s.period)} <span className="text-ink-muted">· {s.centre}</span></span><span className="flex items-center gap-3"><span className="num">{money(s.net_pence)}</span>{s.paid_at ? <Pill kind="success">paid</Pill> : <Pill kind="warning">{s.status}</Pill>}</span></div>)}
            {o.statements.length === 0 && <p className="px-5 py-6 text-center text-ink-muted">No statements issued yet.</p>}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-border px-5 py-3"><h2 className="text-[15px] font-semibold">Admin actions on this dealer</h2></div>
          <div className="divide-y divide-border text-[13px]">
            {(log ?? []).map((l, i) => <div key={i} className="flex items-center justify-between px-5 py-2"><span><span className="font-medium">{l.action.replace(/_/g, " ")}</span> <span className="text-ink-muted">{(l.users as unknown as { email: string } | null)?.email ?? ""}</span></span><span className="text-ink-muted">{when(l.created_at)}</span></div>)}
            {(log ?? []).length === 0 && <p className="px-5 py-6 text-center text-ink-muted">Nothing yet.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
