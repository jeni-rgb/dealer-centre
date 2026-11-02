import Link from "next/link";
import { Logo, Mark } from "@/components/logo";

export default function Landing() {
  return (
    <main className="relative mx-auto max-w-2xl overflow-hidden px-6 pb-16 pt-20">
      <Mark size={420} className="pointer-events-none absolute -right-24 top-8 opacity-[0.06]" />
      <Logo size={44} />
      <h1 className="relative mt-8 text-[44px] font-bold leading-[1.05] tracking-[-0.02em]">List it once. Label it once. Sell it on the floor or online. Never sell it twice.</h1>
      <p className="mt-5 text-[18px] text-ink-muted">For antique and vintage dealers who rent a pitch. One ticket number runs the centre's till, your Shopify and the label on the item.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link href="/signin?next=/signup/dealer" className="block rounded-[20px] bg-accent p-6 text-cream">
          <div className="text-[18px] font-semibold">I am a dealer</div>
          <div className="mt-1 text-[14px] text-header-muted">From £25 a month, 14 days free. Works today with your Shopify, and with your centre's till once they connect.</div>
        </Link>
        <Link href="/signin?next=/signup/centre" className="block rounded-[20px] bg-forest p-6 text-white">
          <div className="text-[18px] font-semibold">I run a centre</div>
          <div className="mt-1 text-[14px] text-[#C9DCCF]">£299 a month, 14 days free. Works with your till as it is today. Dealer statements write themselves.</div>
        </Link>
      </div>
      <p className="mt-10 text-[13px] text-ink-muted">Already signed up? <Link className="font-medium text-accent" href="/signin">Sign in</Link></p>
    </main>
  );
}
