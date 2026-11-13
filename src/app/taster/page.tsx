import { supabaseAdmin } from "@/lib/supabase/server";
import { formatShortDate } from "@/lib/billing/pricing";
import { AcceptTaster } from "./accept";
import Link from "next/link";

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
      <h1 className="mt-2 text-[32px] font-bold leading-tight">2 weeks of named sales. 25 labels free.</h1>
      {live ? (
        <p className="mt-4 text-[16px] leading-7">Named sales until {formatShortDate(data.taster_ends_at!)}. Then Basic, unless you join Full at £25 a month plus VAT.</p>
      ) : (
        <>
          <p className="mt-4 text-[16px] leading-7">Nothing is charged. Then Basic, unless you join Full at £25 a month plus VAT.</p>
          <AcceptTaster token={t} />
          <ul className="mt-8 flex flex-col gap-2 text-[15px] leading-6">
            <li>Named sales, the minute they go through the till.</li>
            <li>What each centre owes you, before payout.</li>
            <li>Stock on the floor and what has sold.</li>
          </ul>
          <p className="mt-4 text-[14px]"><Link href="/#pricing" className="font-semibold text-accent">Full list</Link></p>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">{children}</main>;
}
