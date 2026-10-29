import { requireDealer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { DealerNav, Page } from "@/components/ui";
import { ListItemForm } from "./form";


export default async function NewItem() {
  const me = await requireDealer();
  const sb = await supabaseServer();
  const [{ data: centres }, { data: channels }, { data: printers }, { data: dealer }] = await Promise.all([
    sb.from("dealer_centres").select("centre_id, centres(name)").eq("dealer_id", me.dealer_id).eq("status", "active").is("left_at", null),
    sb.from("channels_public").select("type, owner_type, owner_id").eq("owner_type", "dealer").eq("owner_id", me.dealer_id).eq("status", "active"),
    sb.from("printers").select("id, name, owner_type, provider").eq("status", "ready"),
    sb.from("dealers").select("code").eq("id", me.dealer_id).single(),
  ]);
  const hasShopify = (channels ?? []).some((c) => c.type === "shopify");

  return (
    <Page title="List an item">
      <ListItemForm
        dealerCode={dealer?.code ?? ""}
        centres={(centres ?? []).map((c) => ({ id: c.centre_id, name: (c.centres as unknown as { name: string })?.name ?? "Centre" }))}
        hasShopify={hasShopify}
        printers={(printers ?? []).map((p) => ({ id: p.id, name: p.owner_type === "centre" ? `${p.name} (shop)` : p.name, provider: p.provider }))}
      />
      <DealerNav active="/app/items/new" />
    </Page>
  );
}
