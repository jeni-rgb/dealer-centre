import { requireDealer } from "@/lib/auth";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DealerNav, Screen, money } from "@/components/ui";
import { ukDate } from "@/lib/dates";
import { SumupQueue } from "@/components/sumup-queue";

export default async function DealerSumup() {
  const me = await requireDealer();
  if (!env.sumup.configured()) {
    return <Screen title="SumUp" back={{ href: "/app/settings" }}><p className="text-[14px] text-ink-muted">SumUp is not set up.</p><DealerNav active="settings" /></Screen>;
  }
  const db = supabaseAdmin();
  const { data: conn } = await db.from("sumup_connections").select("id").eq("owner_type", "dealer").eq("owner_id", me.dealer_id).maybeSingle();
  const { data: rows } = conn
    ? await db.from("sumup_transactions").select("id, amount_pence, paid_at, description").eq("connection_id", conn.id).eq("match_status", "unmatched").order("paid_at", { ascending: false }).limit(50)
    : { data: [] };
  return (
    <Screen title="SumUp" back={{ href: "/app/settings" }}>
      {conn ? <p className="text-[14px]">Connected. New card sales arrive each morning.</p> : <a className="btn" href="/api/oauth/sumup?owner=dealer">Connect SumUp</a>}
      <SumupQueue rows={(rows ?? []).map((r) => ({ id: r.id, amount: money(r.amount_pence), when: r.paid_at ? ukDate(r.paid_at) : "", description: r.description ?? "" }))} />
      <DealerNav active="settings" />
    </Screen>
  );
}
