import Link from "next/link";
import { redirect } from "next/navigation";
import { currentCentre } from "@/lib/centre";
import { supabaseAdmin } from "@/lib/supabase/server";
import { money } from "@/components/ui";
import { StartCheck } from "@/components/stockcheck/start";
import { pastChecks } from "@/lib/stockcheck-pages";

export const dynamic = "force-dynamic";

/** Centre owner: check the whole floor, or one dealer's pitch, against what the system says is there. */
export default async function CentreStockCheck({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const { centre: cp } = await searchParams;
  const centre = await currentCentre(cp);
  if (!centre) redirect("/signup/centre");
  const db = supabaseAdmin();
  const q = `?centre=${centre.id}`;
  const [{ data: links }, checks] = await Promise.all([
    db.from("dealer_centres").select("dealer_id, pitch_numbers, dealers(name, code)").eq("centre_id", centre.id).eq("status", "active").is("left_at", null),
    pastChecks(db, { centreId: centre.id }),
  ]);
  const dealers = (links ?? []).map((l) => ({ id: l.dealer_id, name: (l.dealers as unknown as { name: string } | null)?.name ?? "", code: (l.dealers as unknown as { code: string } | null)?.code ?? "", pitches: (l.pitch_numbers ?? []) as string[] })).sort((a, b) => (a.pitches[0] ?? "").localeCompare(b.pitches[0] ?? "", undefined, { numeric: true }));
  const href = (id: string) => `/centre/stock-check/${id}${q}`;

  return (
    <>
      <div className="mb-6"><h1 className="text-[24px] font-semibold">Stock check</h1><p className="max-w-2xl text-[13px] text-ink-muted">Walk the floor scanning every ticket with a Bluetooth scanner or a phone camera. At the end you get what should be there and was not (stolen, moved, or sold without the ticket going through), and what is there that should not be.</p></div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="card flex items-center justify-between gap-4 p-5">
            <div><div className="text-[16px] font-semibold">The whole centre</div><div className="text-[13px] text-ink-muted">Every dealer, every pitch. Best done after closing.</div></div>
            <StartCheck centreId={centre.id} dealerId={null} href={href("{id}")} label="Start" className="btn-sm" />
          </div>
          <div className="card overflow-hidden">
            <div className="border-b border-border px-5 py-3"><h2 className="text-[15px] font-semibold">One pitch</h2></div>
            <div className="max-h-[420px] divide-y divide-border overflow-y-auto">
              {dealers.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-5 py-2.5 text-[13px]">
                  <span><span className="font-medium">{d.name}</span> <span className="ticket text-ink-muted">{d.code}</span>{d.pitches.length ? <span className="text-ink-muted"> · pitch {d.pitches.join(", ")}</span> : null}</span>
                  <StartCheck centreId={centre.id} dealerId={d.id} href={href("{id}")} label="Check" className="btn-sm-secondary" />
                </div>
              ))}
              {dealers.length === 0 && <p className="px-5 py-6 text-center text-ink-muted">No dealers yet.</p>}
            </div>
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="border-b border-border px-5 py-3"><h2 className="text-[15px] font-semibold">Past checks</h2></div>
          <div className="divide-y divide-border text-[13px]">
            {checks.map((c) => (
              <Link key={c.id} href={href(c.id)} className="flex items-center justify-between gap-3 px-5 py-3">
                <span><span className="font-medium">{new Date(c.started_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span> <span className="text-ink-muted">· {c.dealer ?? "Whole centre"}</span></span>
                <span className="text-right text-ink-muted">{c.status === "open" ? <span className="pill pill-accent">In progress</span> : <>{c.found} found · <span className={c.missing ? "font-semibold text-danger" : ""}>{c.missing} missing</span>{c.other ? ` · ${c.other} other` : ""}{c.stolen ? ` · ${money(c.stolen)} lost` : ""}{c.open ? <span className="pill pill-warning ml-2">{c.open} to answer</span> : null}</>}</span>
              </Link>
            ))}
            {checks.length === 0 && <p className="px-5 py-8 text-center text-ink-muted">No checks yet.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
