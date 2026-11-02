import { redirect } from "next/navigation";
import { getMe, isOps } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { listOnlineOrders } from "@/lib/fulfilment/orders";
import { RunScreen } from "./screen";

/** The runner's phone: what to collect today, centre by centre, pitch by pitch. Big buttons. Staff only. */
export default async function Run() {
  const me = await getMe();
  if (!isOps(me)) redirect("/signin?next=/run");
  const orders = (await listOnlineOrders(supabaseAdmin(), { openOnly: true })).filter((o) => o.status === "new" || o.status === "missing");
  return <RunScreen orders={orders} />;
}
