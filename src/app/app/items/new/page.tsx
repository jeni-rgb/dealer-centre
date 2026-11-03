import { requireDealer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { ListItemForm } from "./form";

export default async function NewItem() {
  const me = await requireDealer();
  const sb = await supabaseServer();
  const [{ data: centres }, { data: ownChannels }, { data: printers }, { data: dealer }, { data: counter }] = await Promise.all([
    sb.from("dealer_centres").select("centre_id, centres(name, id)").eq("dealer_id", me.dealer_id).eq("status", "active").is("left_at", null),
    sb.from("channels_public").select("type").eq("owner_type", "dealer").eq("owner_id", me.dealer_id).eq("status", "active"),
    sb.from("printers").select("id, name, owner_type, provider, status").eq("status", "ready"),
    sb.from("dealers").select("code, default_own_shopify, default_centre_shopify, item_limit, monthly_sold_limit").eq("id", me.dealer_id).single(),
    sb.from("sku_counters").select("next_number").eq("dealer_id", me.dealer_id).maybeSingle(),
  ]);
  const centreIds = (centres ?? []).map((c) => c.centre_id);
  const { data: centreChannels } = centreIds.length
    ? await sb.from("channels_public").select("type, owner_id").eq("owner_type", "centre").in("owner_id", centreIds).eq("status", "active")
    : { data: [] as { type: string; owner_id: string }[] };

  return (
    <ListItemForm
      dealerCode={dealer?.code ?? ""}
      nextNumber={counter?.next_number ?? 1}
      centres={(centres ?? []).map((c) => {
        const ch = (centreChannels ?? []).filter((x) => x.owner_id === c.centre_id);
        return { id: c.centre_id, name: (c.centres as unknown as { name: string })?.name ?? "Centre", hasShop: ch.some((x) => x.type === "shopify") };
      })}
      hasOwnShopify={(ownChannels ?? []).some((c) => c.type === "shopify")}
      defaults={{ own: dealer?.default_own_shopify ?? true, shop: dealer?.default_centre_shopify ?? false }} starter={(dealer?.monthly_sold_limit ?? 25) <= 25}
      aiEnabled={!!process.env.OPENAI_API_KEY}
      printers={(printers ?? []).map((p) => ({ id: p.id, name: p.owner_type === "centre" ? `${p.name} (till)` : p.name }))}
    />
  );
}
