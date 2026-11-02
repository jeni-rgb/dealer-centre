import { redirect } from "next/navigation";
import { getMe, isOps } from "@/lib/auth";
import { OpsNav } from "./nav";

/** Dealer Centre's own operations: the shop manager's desk and the runner's screen. Ops staff and admins. */
export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!isOps(me)) redirect("/signin?next=/ops/orders");
  return (
    <div className="min-h-screen bg-surface">
      <OpsNav admin={!!me?.is_platform_admin} />
      <main className="p-4 md:ml-[220px] md:p-8">{children}</main>
    </div>
  );
}
