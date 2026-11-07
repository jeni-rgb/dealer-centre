import Link from "next/link";
import { requireDealer } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DealerNav, Screen, money } from "@/components/ui";
import { StartCheck } from "@/components/stockcheck/start";
import { pastChecks } from "@/lib/stockcheck-pages";

export const dynamic = "force-dynamic";

/** Dealer: check their own pitch at a centre against what the app says is there. */
export default async function DealerStockCheck() {
  const me = await requireDealer();
  const db = supabaseAdmin();
  const { data: links } = await db.from("dealer_centres").select("centre_id, pitch_numbers, centres(name)").eq("dealer_id", me.dealer_id).eq("status", "active").is("left_at", null);
  const checks = await pastChecks(db, { dealerId: me.dealer_id });
  return (
    <Screen title="Stock check" back={{ href: "/app/stock", label: "Stock" }}>
      <p className="text-[14px] leading-6 text-ink-muted">Scan every ticket on your pitch with a Bluetooth scanner or the camera. When you finish, the app lists anything it expected that you did not scan, and anything you scanned that it did not expect.</p>
      {(links ?? []).length === 0 && <p className="card p-4 text-[14px] text-ink-muted">You are not at a centre yet, so there is no pitch to check.</p>}
      {(links ?? []).map((l) => (
        <div key={l.centre_id} className="card flex items-center justify-between gap-3 p-4">
          <div><div className="text-[15px] font-semibold">{(l.centres as unknown as { name: string } | null)?.name}</div><div className="text-[12px] text-ink-muted">{(l.pitch_numbers ?? []).length ? `Pitch ${(l.pitch_numbers as string[]).join(", ")}` : "Your pitch"}</div></div>
          <StartCheck centreId={l.centre_id} dealerId={me.dealer_id} href="/app/stock-check/{id}" label="Start" className="btn !h-11 !w-auto !px-5" />
        </div>
      ))}
      {checks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-[15px] font-semibold">Past checks</h2>
          <div className="card divide-y divide-border">
            {checks.map((c) => (
              <Link key={c.id} href={`/app/stock-check/${c.id}`} className="flex items-center justify-between px-4 py-3 text-[13px]">
                <span><span className="font-medium">{new Date(c.started_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span> <span className="text-ink-muted">· {c.centre}</span></span>
                <span className="text-right text-ink-muted">{c.status === "open" ? <span className="pill pill-accent">In progress</span> : <>{c.found} found · <span className={c.missing ? "font-semibold text-danger" : ""}>{c.missing} missing</span>{c.stolen ? ` · ${money(c.stolen)} lost` : ""}</>}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <DealerNav active="stock" />
    </Screen>
  );
}
