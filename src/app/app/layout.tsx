import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";

export default async function DealerLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/signin?next=/app");
  if (!me.dealer_id) {
    // A centre owner who typed /app by hand: send them to their dashboard rather than dealer sign up
    const { supabaseServer } = await import("@/lib/supabase/server");
    const sb = await supabaseServer();
    const { data: owned } = await sb.from("centre_owners").select("centre_id").eq("user_id", me.id).limit(1);
    redirect(owned?.length ? "/centre" : me.is_platform_admin ? "/admin" : "/signup/dealer");
  }
  return (
    <>
      {me.impersonating && <div className="sticky top-0 z-50 flex items-center justify-between bg-warning px-4 py-2 text-[13px] font-semibold text-ink"><span>Viewing the app as a dealer (admin)</span><a href="/api/admin/impersonate?stop=1" className="underline">Stop</a></div>}
      {children}
    </>
  );
}
