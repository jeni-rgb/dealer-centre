import { env } from "@/lib/env";
import { dealerWithListing } from "@/lib/billing/tokens";
import { labelFigures } from "@/lib/billing/labels";
import { tasterLive } from "@/lib/billing/pricing";
import { requireDealer } from "@/lib/auth";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { DealerNav, Screen } from "@/components/ui";
import { SettingsView } from "./view";

export default async function Settings({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { step } = await searchParams;
  const me = await requireDealer();
  const sb = await supabaseServer();
  const [dealer, { data: channels }, { data: links }, { data: printers }, { data: people }] = await Promise.all([
    dealerWithListing(sb, me.dealer_id, "name, code, plan, trial_ends_at, item_limit, monthly_sold_limit, default_own_shopify, default_centre_shopify"),
    sb.from("channels_public").select("id, type, external_account_id, status, last_webhook_at").eq("owner_type", "dealer").eq("owner_id", me.dealer_id),
    sb.from("dealer_centres").select("centre_id, status, rent_pence, rent_mode, rent_schedule, centres(name)").eq("dealer_id", me.dealer_id).is("left_at", null),
    sb.from("printers").select("id, name, owner_type, provider, status, label_width_mm, label_height_mm, centres:centre_id(name)").neq("status", "removed"),
    supabaseAdmin().from("users").select("id, email").eq("dealer_id", me.dealer_id).order("email"),
  ]);
  const extra = await sb.from("dealers").select("logo_path, card_machine").eq("id", me.dealer_id).maybeSingle();
  const choice = await sb.from("dealers").select("taster_choice").eq("id", me.dealer_id).maybeSingle();
  const labels = await labelFigures(supabaseAdmin(), me.dealer_id);
  const choosePlan = !!dealer?.taster_accepted_at && !!dealer?.taster_ends_at && !tasterLive(dealer) && dealer.billing_model !== "full" && choice.data?.taster_choice !== "basic";
  const machine = extra.data?.card_machine === "sumup" || extra.data?.card_machine === "square" || extra.data?.card_machine === "zettle" ? extra.data.card_machine : null;
  return (
    <Screen title="Account" back={{ href: "/app" }}>
      <SettingsView
        email={me.email}
        meId={me.id}
        people={people ?? []}
        dealer={dealer!}
        shopify={(channels ?? []).find((c) => c.type === "shopify") ?? null}
        square={(channels ?? []).find((c) => c.type === "square") ?? null}
        centres={(links ?? []).map((l) => ({ id: l.centre_id, name: (l.centres as unknown as { name: string })?.name ?? "", status: l.status, rent_pence: l.rent_pence, rent_mode: l.rent_mode }))}
        printers={(printers ?? []).map((p) => ({ id: p.id, name: p.owner_type === "centre" ? `${(p.centres as unknown as { name: string })?.name ?? p.name} till` : p.name, own: p.owner_type === "dealer", cloud: p.provider === "printnode", w: p.label_width_mm, h: p.label_height_mm }))}
        sumupOn={env.sumup.configured()}
        hasLogo={!!extra.data?.logo_path}
        machine={machine}
        labels={{ printed: labels.tally.printed, owed: labels.tally.owed, amountPence: labels.tally.amountPence }}
        choosePlan={choosePlan}
        whoLabels={step === "who-labels"}
      />
      <DealerNav active="settings" />
    </Screen>
  );
}
