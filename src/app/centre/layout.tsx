import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export default async function CentreLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/signin?next=/centre");
  const sb = await supabaseServer();
  const { data: owned } = await sb.from("centre_owners").select("centre_id, centres(name)").eq("user_id", me.id);
  if (!owned?.length && !me.is_platform_admin) redirect("/signup/centre");
  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <header className="mb-6 flex items-baseline justify-between border-b border-rule pb-3">
        <div className="text-sm font-medium">Dealer Centre <span className="text-ink-3">for centres</span></div>
        <nav className="flex gap-5 text-sm">
          <Link href="/centre">Dealers</Link>
          <Link href="/centre/mapping">Mapping</Link>
          <Link href="/centre/settings">Settings</Link>
          <Link href="/till" className="text-ink-3">Till</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
