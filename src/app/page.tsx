import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto max-w-2xl px-6 pt-20 pb-16">
      <div className="text-xs uppercase tracking-wide text-ink-3">Dealer Centre</div>
      <h1 className="mt-3 text-4xl font-medium leading-tight">List it once. Label it once. Sell it on the floor or online. Never sell it twice.</h1>
      <p className="mt-5 text-lg text-ink-2">For antique and vintage dealers who rent a pitch. One ticket number runs the centre's till, your Shopify and the label on the item.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link href="/signin?next=/signup/dealer" className="block rounded-[4px] border border-ink bg-ink p-5 text-paper">
          <div className="text-lg font-medium">I am a dealer</div>
          <div className="mt-1 text-sm text-paper/80">£150 a month, 30 days free. Works today with your Shopify, and with your centre's till once they connect.</div>
        </Link>
        <Link href="/signin?next=/signup/centre" className="block rounded-[4px] border border-rule bg-white p-5">
          <div className="text-lg font-medium">I run a centre</div>
          <div className="mt-1 text-sm text-ink-2">Free. Connect your Square till in five minutes. Dealer statements write themselves.</div>
        </Link>
      </div>
      <p className="mt-10 text-xs text-ink-3">Already signed up? <Link className="underline" href="/signin">Sign in</Link></p>
    </main>
  );
}
