import Link from "next/link";
import { redirect } from "next/navigation";
import { currentCentre } from "@/lib/centre";

/** Server rendered welcome. Safe to refresh, safe to press Back from. */
export default async function Welcome({ searchParams }: { searchParams: Promise<{ centre?: string; paid?: string; preview?: string }> }) {
  const { centre: cp, paid, preview } = await searchParams;
  const centre = await currentCentre(cp);
  if (!centre) redirect("/signup/centre");
  const needsCard = (!centre.stripe_customer_id || preview === "pay") && paid !== "1";
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-[24px] font-semibold">{centre.name} is set up</h1>
      <p className="mt-1 text-[14px] text-ink-muted">{needsCard ? "One payment step, then three things to do in any order." : "Three things to do now, in any order."}</p>

      {needsCard ? (
        <div className="card mt-6 border-accent p-5">
          <div className="flex items-baseline justify-between"><span className="text-[15px] font-semibold">Dealer Centre for centres</span><span className="num text-[22px] font-bold">£299<span className="text-[13px] font-normal text-ink-muted"> /month</span></span></div>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-ink-muted">
            {centre.till === "square" ? <li>You already have Square: we connect it and load every dealer</li> : <li>Square Register Retail Kit on your counter, set up on site, yours after 12 months</li>}
            <li>Unlimited dealers, statements and dealer payouts worked out for you</li>
            <li>Your own online shop with every dealer&rsquo;s stock, run for you</li>
          </ul>
          <p className="mt-3 text-[13px] text-ink-muted">{centre.till === "square" ? "Monthly, 14 days free, cancel any time." : "12 month subscription, Square Register Retail Kit included and set up on site. First payment today, then monthly."}</p>
          <a href={`/api/billing/centre-checkout?centre=${centre.id}`} className="btn mt-4">{centre.till === "square" ? "Add card and start trial" : "Subscribe and book set up"}</a>
        </div>
      ) : paid === "1" ? (
        <div className="card mt-6 flex items-center justify-between p-4 text-[14px]"><span>Subscribed. We will be in touch within a day to book your set up.</span><span className="pill pill-success">Paid</span></div>
      ) : null}

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
