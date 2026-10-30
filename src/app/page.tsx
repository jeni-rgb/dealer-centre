import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto max-w-2xl px-6 pb-16 pt-20">
      <div className="text-[13px] font-semibold text-accent">Dealer Centre</div>
      <h1 className="mt-3 text-[40px] font-bold leading-[1.1] tracking-[-0.02em]">List it once. Label it once. Sell it on the floor or online. Never sell it twice.</h1>
      <p className="mt-5 text-[18px] text-ink-muted">For antique and vintage dealers who rent a pitch. One ticket number runs the centre's till, your Shopify and the label on the item.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link href="/signin?next=/signup/dealer" className="block rounded-[16px] bg-ink p-5 text-white">
          <div className="text-[18px] font-semibold">I am a dealer</div>
          <div className="mt-1 text-[14px] text-header-muted">From £25 a month, 30 days free. Works today with your Shopify, and with your centre's till once they connect.</div>
        </Link>
        <Link href="/signin?next=/signup/centre" className="card block p-5">
          <div className="text-[18px] font-semibold">I run a centre</div>
          <div className="mt-1 text-[14px] text-ink-muted">Free. Connect your Square till in five minutes. Dealer statements write themselves.</div>
        </Link>
      </div>
      <p className="mt-10 text-[13px] text-ink-muted">Already signed up? <Link className="font-medium text-accent" href="/signin">Sign in</Link></p>
    </main>
  );
}
