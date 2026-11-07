import { redirect } from "next/navigation";
import Stripe from "stripe";
import { getMe } from "@/lib/auth";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { confirmTokenPurchase, dealerWithListing } from "@/lib/billing/tokens";
import { DealerSetup } from "./setup";

/**
 * Business, who lists the stock, then the card (£0.00 today).
 * Tokens come after the card, and only when Dealer Centre lists the stock.
 */
export default async function DealerSignup({ searchParams }: { searchParams: Promise<{ step?: string; plan?: string; list?: string; session_id?: string }> }) {
  const me = await getMe();
  if (!me) redirect("/signin?next=/signup/dealer");
  const { step, plan, list, session_id } = await searchParams;
  if (session_id && me.dealer_id && process.env.STRIPE_SECRET_KEY && process.env.DEMO_MODE !== "1") {
    await confirmTokenPurchase(supabaseAdmin(), new Stripe(process.env.STRIPE_SECRET_KEY), session_id, me.dealer_id).catch((e) => console.error("[tokens]", e));
  }
  const sb = await supabaseServer();
  let dealer: { name: string; code: string; plan: string; stripe_customer_id: string | null; listing_mode: "self" | "staff" | null; listing_tokens: number; listing_tokens_bought: number; card_added_at: string | null } | null = null;
  let centres: { name: string; status: string }[] = [];
  let hasShopify = false;
  let ownPrinters = 0;
  if (me.dealer_id) {
    const [d, { data: c }, { data: ch }, { count }] = await Promise.all([
      dealerWithListing(sb, me.dealer_id, "name, code, plan, stripe_customer_id"),
      sb.from("dealer_centres").select("status, centres(name)").eq("dealer_id", me.dealer_id).is("left_at", null),
      sb.from("channels_public").select("type").eq("owner_type", "dealer").eq("owner_id", me.dealer_id).neq("status", "removed").eq("type", "shopify"),
      sb.from("printers").select("id", { count: "exact", head: true }).eq("owner_type", "dealer").eq("owner_id", me.dealer_id),
    ]);
    dealer = d;
    centres = (c ?? []).map((x) => ({ name: (x.centres as unknown as { name: string })?.name ?? "", status: x.status }));
    hasShopify = (ch ?? []).length > 0;
    ownPrinters = count ?? 0;
  }
  const mode = dealer?.listing_mode ?? null;
  const initial = step ?? (
    !dealer ? "business" :
    !mode && !dealer.stripe_customer_id ? "who" :
    mode && !dealer.card_added_at ? "card" :
    mode === "staff" && (dealer?.listing_tokens_bought ?? 0) < 1 ? "tokens" :
    "centre"
  );
  const listHint = list === "self" || list === "staff" ? list : null;
  return <DealerSetup email={me.email} initial={initial} dealer={dealer} centres={centres} hasShopify={hasShopify} ownPrinters={ownPrinters} plan={plan} listHint={dealer?.listing_mode ? null : listHint} />;
}
