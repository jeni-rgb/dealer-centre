import { redirect } from "next/navigation";
import { currentCentre } from "@/lib/centre";
import { supabaseServer } from "@/lib/supabase/server";
import { EodClient } from "./client";
import type { RecordedSale } from "./recorded";

/** End of day sales entry. Built for a phone in one hand and a pile of tickets in the other. */
export default async function Eod({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const { centre: cp } = await searchParams;
  const centre = await currentCentre(cp);
  if (!centre) redirect("/signup/centre");
  const sb = await supabaseServer();
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data } = await sb
    .from("sales")
    .select("id, amount_pence, original_amount_pence, payment_type, sold_at, ticket_no, items(title), dealers(name), channels:channel_id(type)")
    .eq("centre_id", centre.id).is("voided_at", null).gte("sold_at", since).order("sold_at", { ascending: false }).limit(200);
  const recorded: RecordedSale[] = (data ?? [])
    .filter((s) => ["manual", "square"].includes((s.channels as unknown as { type: string })?.type))
    .map((s) => ({ id: s.id, amount_pence: s.amount_pence, original_amount_pence: s.original_amount_pence, payment_type: s.payment_type, sold_at: s.sold_at, ticket_no: s.ticket_no, title: (s.items as unknown as { title: string } | null)?.title ?? null, dealer: (s.dealers as unknown as { name: string } | null)?.name ?? null }));
  return <EodClient centreId={centre.id} centreName={centre.name} recorded={recorded} />;
}
