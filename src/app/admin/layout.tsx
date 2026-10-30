import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { AdminNav } from "./nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me?.is_platform_admin) redirect("/signin?next=/admin");
  return (
    <div className="min-h-screen bg-surface">
      <AdminNav />
      <main className="ml-[220px] p-8">{children}</main>
    </div>
  );
}
