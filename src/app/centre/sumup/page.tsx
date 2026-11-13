import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { currentCentre } from "@/lib/centre";
import { supabaseAdmin } from "@/lib/supabase/server";
import { money } from "@/components/ui";
import { ukDate } from "@/lib/dates";
import { SumupQueue } from "@/components/sumup-queue";

export default async function CentreSumup({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const { centre: cp } = await searchParams;
  const centre = await currentCentre(cp);
  if (!centre) redirect("/signup/centre");
  if (!env.sumup.configured()) return <p className="text-[14px] text-ink-muted">SumUp is not set up.</p>;
  const db = supabaseAdmin();
  const { data: conn } = await db.from("sumup_connections").select("id").eq("owner_type", "centre").eq("owner_id", centre.id).maybeSingle();
  const { data: rows } = conn
    ? await db.from("sumup_transactions").select("id, amount_pence, paid_at, description").eq("connection_id", conn.id).eq("match_status", "unmatched").order("paid_at", { ascending: false }).limit(50)
    : { data: [] };
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="text-[24px] font-semibold">SumUp</h1>
      {conn ? <p className="text-[14px]">Connected.</p> : <a className="btn !w-auto" href={`/api/oauth/sumup?owner=centre&id=${centre.id}`}>Connect SumUp</a>}
      <p className="text-[13px] text-ink-muted">Card sales come in each hour. A SumUp file upload of the same ticket and amount on the same day is not recorded twice.</p>
      <SumupQueue rows={(rows ?? []).map((r) => ({ id: r.id, amount: money(r.amount_pence), when: r.paid_at ? ukDate(r.paid_at) : "", description: r.description ?? "" }))} />
    </div>
  );
}
