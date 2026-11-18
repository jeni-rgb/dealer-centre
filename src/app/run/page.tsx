import { redirect } from "next/navigation";
import { getMe, isOps } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { listOnlineOrders } from "@/lib/fulfilment/orders";
import { RunScreen } from "./screen";
import { PASSWORD_COPY } from "@/lib/password";
import { passwordNeed } from "@/lib/password-user";
import { PasswordContinue } from "@/components/password-continue";

/** The runner's phone: what to collect today, centre by centre, pitch by pitch. Big buttons. Staff only. */
export default async function Run() {
  const me = await getMe();
  if (!isOps(me)) redirect("/signin?next=/run");
  const need = await passwordNeed();
  if (need) {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="text-[24px] font-semibold">{PASSWORD_COPY.title}</h1>
        <p className="mt-1 text-[14px] text-ink-muted">{need === "temp" ? PASSWORD_COPY.temp : PASSWORD_COPY.missing}</p>
        <PasswordContinue />
      </div>
    );
  }
  const orders = (await listOnlineOrders(supabaseAdmin(), { openOnly: true })).filter((o) => o.status === "new" || o.status === "missing");
  return <RunScreen orders={orders} />;
}
