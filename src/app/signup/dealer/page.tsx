import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { DealerSetup } from "./setup";

/**
 * Sign up is 3 steps (email, business, card). Setup is 5 and skippable
 * (centre and rent, till, printers, Shopify, summary). Step is driven by ?step=.
 */
export default async function DealerSignup({ searchParams }: { searchParams: Promise<{ step?: string; plan?: string }> }) {
  const me = await getMe();
  if (!me) redirect("/signin?next=/signup/dealer");
  const { step, plan } = await searchParams;
  const sb = await supabaseServer();
  let dealer: { name: string; code: string; plan: string; stripe_customer_id: string | null } | null = null;
  let centres: { name: string; status: string }[] = [];
  let hasShopify = false;
  let ownPrinters = 0;
  if (me.dealer_id) {
    const [{ data: d }, { data: c }, { data: ch }, { count }] = await Promise.all([
      sb.from("dealers").select("name, code, plan, stripe_customer_id").eq("id", me.dealer_id).single(),
      sb.from("dealer_centres").select("status, centres(name)").eq("dealer_id", me.dealer_id).is("left_at", null),
      sb.from("channels_public").select("type").eq("owner_type", "dealer").eq("owner_id", me.dealer_id).eq("type", "shopify"),
      sb.from("printers").select("id", { count: "exact", head: true }).eq("owner_type", "dealer").eq("owner_id", me.dealer_id),
    ]);
    dealer = d;
    centres = (c ?? []).map((x) => ({ name: (x.centres as unknown as { name: string })?.name ?? "", status: x.status }));
    hasShopify = (ch ?? []).length > 0;
    ownPrinters = count ?? 0;
  }
  const initial = step ?? (!dealer ? "business" : !dealer.stripe_customer_id ? "card" : "centre");
  return <DealerSetup email={me.email} initial={initial} dealer={dealer} centres={centres} hasShopify={hasShopify} ownPrinters={ownPrinters} plan={plan} />;
}
