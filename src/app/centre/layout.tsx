import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { CentreNav } from "./nav";

export default async function CentreLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/signin?next=/centre");
  const sb = await supabaseServer();
  const { data: owned } = await sb.from("centre_owners").select("centre_id, centres(name, plan, stripe_customer_id)").eq("user_id", me.id);
  if (!owned?.length && !me.is_platform_admin) redirect("/signup/centre");
  const c = owned?.[0]?.centres as unknown as { name: string; plan: string; stripe_customer_id: string | null } | undefined;
  const banner = c && !c.stripe_customer_id ? { text: "Subscribe to get your Square Register and set up day booked. £299 a month, 12 months.", cta: "Add card", href: `/api/billing/centre-checkout?centre=${owned?.[0]?.centre_id}` }
    : c && (c.plan === "lapsed" || c.plan === "cancelled") ? { text: "Your centre subscription has lapsed. Update your card to keep End of day and statements running.", cta: "Update card", href: "/api/billing/portal?centre=1" } : null;
  return (
    <div className="min-h-screen bg-surface">
      <CentreNav centreName={c?.name ?? "Centre"} />
      <main className="p-4 md:ml-[220px] md:p-8">
        {banner && <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-warning-soft px-4 py-3 text-[14px] text-warning"><span>{banner.text}</span><a href={banner.href} className="font-semibold underline">{banner.cta}</a></div>}
        {children}
      </main>
    </div>
  );
}
