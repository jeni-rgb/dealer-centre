import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me?.is_platform_admin) redirect("/signin?next=/admin");
  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <header className="mb-6 flex items-baseline justify-between border-b border-rule pb-3">
        <div className="text-sm font-medium">Dealer Centre <span className="text-ink-3">admin</span></div>
        <nav className="flex gap-5 text-sm"><Link href="/admin">Centres and dealers</Link><Link href="/admin/health">Health</Link></nav>
      </header>
      {children}
    </div>
  );
}
