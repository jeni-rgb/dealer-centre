import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";

export default async function DealerLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/signin?next=/app");
  if (!me.dealer_id) redirect("/signup/dealer");
  return <>{children}</>;
}
