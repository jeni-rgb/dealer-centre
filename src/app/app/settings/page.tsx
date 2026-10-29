import { requireDealer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { DealerNav, Page, Rule } from "@/components/ui";
import { SettingsForms } from "./forms";


export default async function Settings() {
  const me = await requireDealer();
  const sb = await supabaseServer();
  const [{ data: dealer }, { data: channels }, { data: links }, { data: printers }] = await Promise.all([
    sb.from("dealers").select("name, code, plan, trial_ends_at").eq("id", me.dealer_id).single(),
    sb.from("channels_public").select("id, type, external_account_id, status, last_webhook_at").eq("owner_type", "dealer").eq("owner_id", me.dealer_id),
    sb.from("dealer_centres").select("centre_id, status, centres(name)").eq("dealer_id", me.dealer_id).is("left_at", null),
    sb.from("printers").select("id, name, owner_type, provider, status"),
  ]);

  return (
    <Page title="Settings">
      <section className="mb-8">
        <h2 className="mb-1 text-sm font-medium">Account</h2>
        <Rule />
        <div className="py-3 text-sm">
          <div>{dealer?.name} <span className="sku text-ink-3">{dealer?.code}</span></div>
          <div className="text-xs text-ink-3">{me.email}</div>
          <div className="mt-2 text-xs">
            Plan: {dealer?.plan}{dealer?.plan === "trial" && dealer.trial_ends_at ? `, ends ${new Date(dealer.trial_ends_at).toLocaleDateString("en-GB")}` : ""}.{" "}
            <a className="underline" href="/api/billing/portal">Manage plan online</a>
          </div>
        </div>
      </section>

      <SettingsForms
        shopify={(channels ?? []).find((c) => c.type === "shopify") ?? null}
        square={(channels ?? []).find((c) => c.type === "square") ?? null}
        centres={(links ?? []).map((l) => ({ id: l.centre_id, name: (l.centres as unknown as { name: string })?.name ?? "", status: l.status }))}
        printers={(printers ?? []).map((p) => ({ id: p.id, name: p.name, owner_type: p.owner_type, provider: p.provider, status: p.status }))}
      />
      <DealerNav active="/app/settings" />
    </Page>
  );
}
