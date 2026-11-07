import { notFound } from "next/navigation";
import { requireDealer } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DealerNav, Screen } from "@/components/ui";
import { StockScanner } from "@/components/stockcheck/scanner";
import { StockResults } from "@/components/stockcheck/results";
import { checkResult, loadCheck } from "@/lib/stockcheck";
import { expectedCount } from "@/lib/stockcheck-pages";

export const dynamic = "force-dynamic";

export default async function DealerStockCheckRun({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireDealer();
  const { id } = await params;
  const db = supabaseAdmin();
  const check = await loadCheck(db, id);
  if (!check || check.dealer_id !== me.dealer_id) notFound();
  const { data: centre } = await db.from("centres").select("name").eq("id", check.centre_id).single();
  const title = `${centre?.name ?? "Centre"}, ${new Date(check.started_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  if (check.status === "open") {
    const expected = await expectedCount(db, check.centre_id, check.dealer_id, check.started_at);
    return (
      <Screen title="Stock check" back={{ href: "/app/stock-check", label: "Checks" }}>
        <p className="text-[13px] text-ink-muted">{title}. Your pitch: {expected} items should be here.</p>
        <StockScanner checkId={id} expected={expected} scope="pitch" doneHref={`/app/stock-check/${id}`} />
        <DealerNav active="stock" />
      </Screen>
    );
  }
  const r = await checkResult(db, check);
  return (
    <Screen title="Stock check" back={{ href: "/app/stock-check", label: "Checks" }}>
      <p className="text-[13px] text-ink-muted">{title}. Finished {check.finished_at ? new Date(check.finished_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""}.</p>
      <StockResults checkId={id} lines={r.lines} counts={r.counts} missingValue={r.missingValue} stolenValue={r.stolenValue} dealerView />
      <DealerNav active="stock" />
    </Screen>
  );
}
