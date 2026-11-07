import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentCentre } from "@/lib/centre";
import { supabaseAdmin } from "@/lib/supabase/server";
import { StockScanner } from "@/components/stockcheck/scanner";
import { StockResults } from "@/components/stockcheck/results";
import { checkResult, loadCheck } from "@/lib/stockcheck";
import { expectedCount } from "@/lib/stockcheck-pages";

export const dynamic = "force-dynamic";

export default async function CentreStockCheckRun({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ centre?: string }> }) {
  const { id } = await params;
  const { centre: cp } = await searchParams;
  const centre = await currentCentre(cp);
  if (!centre) redirect("/signup/centre");
  const db = supabaseAdmin();
  const check = await loadCheck(db, id);
  if (!check || check.centre_id !== centre.id) notFound();
  const { data: dealer } = check.dealer_id ? await db.from("dealers").select("name").eq("id", check.dealer_id).single() : { data: null };
  const scope = dealer ? `${dealer.name}'s pitch` : "The whole centre";
  const back = <Link href={`/centre/stock-check?centre=${centre.id}`} className="text-[13px] text-ink-muted">‹ All stock checks</Link>;
  if (check.status === "open") {
    const expected = await expectedCount(db, check.centre_id, check.dealer_id, check.started_at);
    return (
      <div className="max-w-xl">
        {back}
        <h1 className="mt-1 text-[24px] font-semibold">Stock check: {scope}</h1>
        <p className="mb-5 text-[13px] text-ink-muted">Started {new Date(check.started_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. {expected} items should be here.</p>
        <StockScanner checkId={id} expected={expected} scope={check.dealer_id ? "pitch" : "centre"} doneHref={`/centre/stock-check/${id}?centre=${centre.id}`} />
      </div>
    );
  }
  const r = await checkResult(db, check);
  return (
    <div className="max-w-3xl">
      {back}
      <h1 className="mt-1 text-[24px] font-semibold">Stock check: {scope}</h1>
      <p className="mb-5 text-[13px] text-ink-muted">{new Date(check.started_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}. The dealers concerned can see their own lines in the app.</p>
      <StockResults checkId={id} lines={r.lines} counts={r.counts} missingValue={r.missingValue} stolenValue={r.stolenValue} dealerView={false} />
    </div>
  );
}
