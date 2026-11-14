import { requireDealer } from "@/lib/auth";
import { dealerWithListing } from "@/lib/billing/tokens";
import { namedSales } from "@/lib/billing/pricing";
import { supabaseServer } from "@/lib/supabase/server";
import { DealerNav, Screen } from "@/components/ui";
import { ImportForm } from "./form";

export default async function ImportPage() {
  const me = await requireDealer();
  const dealer = await dealerWithListing(await supabaseServer(), me.dealer_id, "plan");
  const full = !!dealer && namedSales(dealer);
  return (
    <Screen title="Upload stock" back={{ href: "/app/stock" }}>
      {full ? <ImportForm /> : <p className="text-[14px] text-ink-muted">Full includes a stock upload.</p>}
      <DealerNav active="stock" />
    </Screen>
  );
}
