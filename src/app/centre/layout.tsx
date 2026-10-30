import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { CentreNav } from "./nav";

export default async function CentreLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/signin?next=/centre");
  const sb = await supabaseServer();
  const { data: owned } = await sb.from("centre_owners").select("centre_id, centres(name)").eq("user_id", me.id);
  if (!owned?.length && !me.is_platform_admin) redirect("/signup/centre");
  return (
    <div className="min-h-screen bg-surface">
      <CentreNav centreName={(owned?.[0]?.centres as unknown as { name: string })?.name ?? "Centre"} />
      <main className="ml-[220px] p-8">{children}</main>
    </div>
  );
}
