import Link from "next/link";
import { redirect } from "next/navigation";
import { currentCentre } from "@/lib/centre";

/** Server rendered welcome. Safe to refresh, safe to press Back from. */
export default async function Welcome({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const { centre: cp } = await searchParams;
  const centre = await currentCentre(cp);
  if (!centre) redirect("/signup/centre");
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-[24px] font-semibold">{centre.name} is set up</h1>
      <p className="mt-1 text-[14px] text-ink-muted">Three things to do now, in any order.</p>

      <div className="card mt-6 p-5">
        <div className="text-[12px] text-ink-muted">Your centre code</div>
        <div className="ticket mt-1 text-[40px] leading-none">{centre.invite_code}</div>
        <p className="mt-3 text-[14px]">Give this to your dealers. They type it when they sign up, or they can just search for {centre.name}. You approve each one on the Dealers page and check the rent they declared.</p>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <Link href={`/centre/eod?centre=${centre.id}`} className="card flex items-center justify-between p-4"><span><span className="block text-[15px] font-medium">Try End of day</span><span className="text-[13px] text-ink-muted">Where you record the day's sold tickets. Takes two minutes an evening.</span></span><span className="text-accent">→</span></Link>
        <Link href={`/centre/mapping?centre=${centre.id}`} className="card flex items-center justify-between p-4"><span><span className="block text-[15px] font-medium">Approve dealers</span><span className="text-[13px] text-ink-muted">Join requests appear here as dealers sign up.</span></span><span className="text-accent">→</span></Link>
        <Link href={`/centre/settings?centre=${centre.id}`} className="card flex items-center justify-between p-4"><span><span className="block text-[15px] font-medium">Settings</span><span className="text-[13px] text-ink-muted">Rent, commission, printers{centre.till === "square" ? ", and connecting Square" : ""}.</span></span><span className="text-accent">→</span></Link>
      </div>

      <Link href={`/centre?centre=${centre.id}`} className="btn mt-6">Go to my dashboard</Link>
    </div>
  );
}
