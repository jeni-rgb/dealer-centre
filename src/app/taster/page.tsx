import { supabaseAdmin } from "@/lib/supabase/server";
import { formatShortDate } from "@/lib/billing/pricing";
import { AcceptTaster } from "./accept";
import { PlanCompare } from "@/components/plan-compare";

export const dynamic = "force-dynamic";

/** Invite from the centre. The dealer opts in. That starts the 14 days. */
export default async function TasterPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  if (!t) return <Shell><p>This invite needs the link from your centre.</p></Shell>;
  const { data } = await supabaseAdmin().from("dealers").select("name, taster_accepted_at, taster_ends_at, billing_model").eq("taster_token", t).maybeSingle();
  if (!data) return <Shell><p>That link has expired. Ask your centre for a new one.</p></Shell>;
  const live = !!data.taster_accepted_at && !!data.taster_ends_at && new Date(data.taster_ends_at).getTime() > Date.now();
  return (
    <Shell>
      <p className="text-[13px] font-semibold text-accent">For {data.name}</p>
      <h1 className="mt-2 text-[32px] font-bold leading-tight">2 weeks of named sales, and 25 labels on us.</h1>
      {live ? (
        <p className="mt-4 text-[16px] leading-7">You said yes. Named sales run until {formatShortDate(data.taster_ends_at!)}. We will label your first 25 items. After that you go back to Basic unless you join Full at £25 a month plus VAT by Direct Debit.</p>
      ) : (
        <>
          <p className="mt-4 text-[16px] leading-7">Say yes and you get 2 weeks of Full, and we label your first 25 items for free. Nothing is charged. When the 2 weeks end you go back to Basic, unless you join Full.</p>
          <AcceptTaster token={t} />
          <div className="mt-10"><PlanCompare showHeadline /></div>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">{children}</main>;
}
