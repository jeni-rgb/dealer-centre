import Link from "next/link";
import type { Metadata } from "next";
import { Logo, Mark } from "@/components/logo";
import { Phone, Browser } from "@/components/devices";

export const metadata: Metadata = {
  title: "Dealer Centre: stock, labels and sales for antique dealers and centres",
  description: "List an item once, print its label, and the ticket number runs the centre's till, your Shopify and the centre's online shop. A buzz on your phone when it sells. Statements that add themselves up. From £25 a month for dealers, £299 a month for centres.",
  alternates: { canonical: "https://thedealercentre.co.uk" },
  openGraph: { title: "Dealer Centre", description: "List it once. Label it once. Sell it on the floor or online. Never sell it twice.", url: "https://thedealercentre.co.uk", siteName: "Dealer Centre", images: ["/screens/dealer-today.jpg"], locale: "en_GB", type: "website" },
};

const dealerPlans = [
  { name: "Starter", price: "£25", who: "Up to 25 items sold a month", forWho: "A pitch you top up at weekends", bits: ["Unlimited stock listed", "Ticket numbers and labels", "Centre till, End of day, notifications", "Your own Shopify", "Margin on every item", "Monthly statement with PDF"], not: ["Centre online shop and eBay", "More than one centre"] },
  { name: "Trade", price: "£100", who: "Up to 50 items sold a month", forWho: "Full time at one centre", bits: ["Everything in Starter", "Centre online shop and eBay", "Priority support"], not: ["More than one centre"], featured: true },
  { name: "Pro", price: "£150", who: "Over 100 items sold a month", forWho: "Several pitches, several centres", bits: ["Everything in Trade", "Any number of centres on one account", "Export for your accountant", "Phone support"], not: [] },
];

const compare: [string, string, string, string][] = [
  ["Items sold a month", "Up to 25", "Up to 50", "Unlimited"],
  ["Stock you can list", "Unlimited", "Unlimited", "Unlimited"],
  ["Centres you sell at", "One", "One", "Any number"],
  ["Ticket numbers and labels", "✓", "✓", "✓"],
  ["Centre till, End of day, notifications", "✓", "✓", "✓"],
  ["Your own Shopify", "✓", "✓", "✓"],
  ["Margin and haggle guide on every item", "✓", "✓", "✓"],
  ["Monthly statement with PDF", "✓", "✓", "✓"],
  ["Centre online shop and eBay", "–", "✓", "✓"],
  ["Export for your accountant", "–", "–", "✓"],
  ["Support", "Email", "Priority email", "Priority email and phone"],
];

const faqs = [
  ["Does my centre need to be on Dealer Centre?", "No. If they are not, you add the centre yourself at sign up and your items carry its name. You mark things sold from your phone. When the centre joins, nothing changes for you."],
  ["We have an ordinary till. Do we have to change it?", "When a centre subscribes, the Square Register comes with it and replaces the old till on day one, set up by us. Card payments move to Square at 1.75%. If your dealers are on the app before you subscribe, their sales can still be recorded at End of day in the meantime."],
  ["What happens to dealers who do not want the app?", "They carry on as they are. The centre gives them a line in the system with the code already on their tickets, and their sales still get recorded and still get a statement."],
  ["Can I sell the same item on the floor and online?", "That is the point. One ticket number runs the till, your Shopify and the centre shop. The moment it sells anywhere, it comes off everywhere else."],
  ["What does the centre pay?", "£299 a month on a 12 month subscription, and the Square Register Retail Kit is included: till, cash drawer, receipt printer, scanner and label printer, set up on site and yours to keep after 12 months. Unlimited dealers, statements and payouts worked out, and the centre's own online shop run for you at 20% commission."],
  ["Is there a contract?", "Dealers: no, monthly, cancel from Settings, 14 days free. Centres that take the Register kit: 12 months, then monthly and the kit is yours. Centres already on Square: monthly, no commitment."],
];

const amazonTag = process.env.NEXT_PUBLIC_AMAZON_TAG ?? "";
const amazon = (q: string) => `https://www.amazon.co.uk/s?k=${encodeURIComponent(q)}${amazonTag ? `&tag=${amazonTag}` : ""}`;
const kit = [
  { name: "Label printer", pick: "Brother QL-820NWB", why: "Prints the ticket labels on wifi so any dealer can print to it. Zebra ZD411 (in the Square Retail Kit) and Dymo LabelWriter 550 also work.", price: "about £170", q: "Brother QL-820NWB label printer" },
  { name: "Labels", pick: "Brother DK-11209 (62 x 29 mm)", why: "Die cut, 800 a roll, the size every ticket label is laid out for. Two rolls lasts a centre a month.", price: "about £12 a roll", q: "Brother DK-11209 labels" },
];

const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
const productJsonLd = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Dealer Centre", applicationCategory: "BusinessApplication", operatingSystem: "Web, iOS, Android", description: "Stock, labels and sales for antique dealers and antiques centres.", offers: [{ "@type": "Offer", price: "25", priceCurrency: "GBP", name: "Starter" }, { "@type": "Offer", price: "100", priceCurrency: "GBP", name: "Trade" }, { "@type": "Offer", price: "150", priceCurrency: "GBP", name: "Pro" }, { "@type": "Offer", price: "299", priceCurrency: "GBP", name: "Centre" }] };

export default function Landing() {
  return (
    <main className="overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([productJsonLd, faqJsonLd]) }} />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo size={34} />
        <nav className="hidden items-center gap-7 text-[14px] font-medium text-ink-muted md:flex">
          <a href="#dealers">For dealers</a><a href="#centres">For centres</a><a href="#pricing">Pricing</a><a href="#kit">Kit</a><Link href="/guides/dealers">Guides</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/signin" className="hidden text-[14px] font-medium md:inline">Sign in</Link>
          <Link href="/signup" className="btn-sm">Get started</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pb-10 pt-10 md:pt-20">
        <Mark size={640} className="pointer-events-none absolute -right-40 -top-10 opacity-[0.05]" />
        <div className="grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr]">
          <div className="relative">
            <span className="text-[15px] font-semibold text-accent">For antique and vintage dealers who rent a pitch</span>
            <h1 className="mt-5 text-[44px] leading-[1.0] tracking-[-0.03em] md:text-[66px]">List it once.<br />Label it once.<br />Never sell it twice.</h1>
            <p className="mt-6 max-w-xl text-[19px] leading-8 text-ink-muted">One ticket number runs the centre&rsquo;s till, your Shopify and the centre&rsquo;s online shop. Your phone buzzes when it sells. Your statement adds itself up.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup?as=dealer" className="btn !w-auto !px-7">List my first item</Link>
              <Link href="/signup?as=centre" className="btn-outline !w-auto !px-7">Set up my centre</Link>
            </div>
            <p className="mt-4 text-[13px] text-ink-muted">From £25 a month. No contract. Works today with an ordinary till.</p>
          </div>
          <div className="relative mx-auto flex items-start justify-center">
            <Phone src="/screens/dealer-today.jpg" alt="Today screen: sales this month, recent sales" className="w-[260px] -rotate-3 md:w-[300px]" />
            <Phone src="/screens/dealer-item.jpg" alt="An item with its margin and channels" className="-ml-10 hidden w-[250px] translate-y-20 rotate-3 md:block" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="max-w-2xl text-[36px] leading-[1.08] md:text-[44px]">List it on your phone. It sells anywhere. You hear, and the statement writes itself.</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              ["List it on your phone", "Photo, title, price. The app gives it a ticket number and prints the barcoded label at the centre.", "/screens/dealer-list.jpg"],
              ["It sells, anywhere", "On the floor the till scans the ticket. Online it sells on your Shopify or the centre shop. The other places close instantly.", "/screens/dealer-sold.jpg"],
              ["You hear, the statement writes itself", "A buzz on your phone with what sold and for how much. Commission, rent and payouts worked out at month end.", "/screens/dealer-statement.jpg"],
            ].map(([t, b, img]) => (
              <div key={t} className="flex flex-col items-start">
                <Phone src={img} alt={t} className="w-[200px]" />
                <h3 className="mt-6 text-[22px] font-bold leading-7">{t}</h3>
                <p className="mt-2 text-[15px] leading-6 text-ink-muted">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dealers */}
      <section id="dealers" className="py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 md:grid-cols-2">
          <div className="order-2 flex justify-center md:order-1">
            <Phone src="/screens/dealer-item.jpg" alt="An item with its margin and channels" className="w-[280px] -rotate-2" />
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-[36px] leading-[1.08] md:text-[44px]">Your stock, your margin, your statement. In your pocket.</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {[
                ["One ticket number everywhere", "The label on the item, the centre's till, your Shopify. Sell it in one place and it comes off the others."],
                ["Mark as sold from a fair", "Cash in your pocket at a Sunday fair? Tap Mark as sold, elsewhere. No commission, no double selling."],
                ["Know your margin before you haggle", "What you paid stays private. The item page shows profit at asking, at 5, 10 and 15 percent off, and the lowest price that keeps a third."],
                ["A statement you can check", "Floor sales, online sales, commission, rent, net. Every month, with the PDF."],
              ].map(([t, b]) => <div key={t}><h3 className="text-[17px] font-bold leading-6">{t}</h3><p className="mt-1.5 text-[14px] leading-6 text-ink-muted">{b}</p></div>)}
            </div>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/signup?as=dealer" className="btn !w-auto !px-7">List my first item</Link><Link href="/guides/dealers" className="btn-outline !w-auto !px-7">Read the dealer guide</Link></div>
          </div>
        </div>
      </section>

      {/* Centres */}
      <section id="centres" className="bg-accent py-24 text-cream">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-[40px] leading-[1.02] text-cream md:text-[56px]">The till is included.</h2>
              <p className="mt-5 text-[18px] leading-8 text-[#E6E0BD]">Sign up as a centre and the Square Register arrives: cash drawer, receipt printer, barcode scanner, and a Brother label printer every dealer can print to from their phone. We set it up on site with every dealer loaded. £299 a month, nothing else.</p>
              <div className="mt-8 flex items-end gap-6">
                <div><div className="hand text-[24px] text-[#E6E0BD]">on its own</div><div className="swipe figure text-[44px] leading-none text-[#E6E0BD]">£1,429</div></div>
                <div><div className="hand text-[24px] text-gold">with Dealer Centre</div><div className="figure text-[64px] leading-none text-gold">£0</div></div>
              </div>
              <p className="hand mt-5 text-[22px] leading-6 text-[#E6E0BD]">12 month subscription at £299. That is it. No till to buy, no books to keep.</p>
              <Link href="/signup?as=centre" className="btn-secondary mt-6 !w-auto !px-8">Set up my centre</Link>
            </div>
            <figure className="relative overflow-hidden rounded-[24px] bg-white p-6">
              <img src="/kit/register-kit.jpg" alt="Square Register Retail Kit: Register with customer display, cash drawer, receipt printer, barcode scanner and label printer" className="w-full" />
              <figcaption className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px] font-semibold text-ink">{["Square Register", "Cash drawer", "Receipt printer", "Barcode scanner", "Brother label printer", "Set up on site", "Yours after 12 months"].map((b) => <span key={b}>{b}</span>)}</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="max-w-3xl text-[36px] leading-[1.08] md:text-[44px]">Sixty dealers. Sixty statements. Two minutes a day.</h2>
          <div className="mt-12">
            <Browser src="/screens/centre-dashboard.jpg" alt="Centre dashboard: month to date, dealers ranked, rent against sales" />
          </div>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {[
              ["Every sale recorded by the till", "Dealers on the app: scan the barcode. Dealers not on the app: tap their name, type the price. Cash or card, the Register does the rest. Nothing written in a book, ever."],
              ["Dealers and statements", "Unlimited dealers, on the app or not. Statements worked out: sales, commission, rent, net. Payouts listed, PDF per dealer. Dealers ranked: sales against rent, who has gone quiet."],
              ["Your online shop, run for you", "Your own Shopify and eBay, stocked by your dealers. We list, answer customers, pick, pack and post. No monthly cost: 20% commission on what sells. Items come off the floor the moment they sell online."],
            ].map(([t, b]) => <div key={t}><h3 className="text-[20px] font-bold leading-7">{t}</h3><p className="mt-2 text-[15px] leading-6 text-ink-muted">{b}</p></div>)}
          </div>
        </div>
      </section>

      <section className="bg-forest py-20 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 md:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="text-[32px] leading-[1.1] text-white md:text-[40px]">What it replaces</h2>
            <table className="mt-6 w-full text-[15px]">
              <tbody>
                {[
                  ["Cash book and card book per dealer", "The Register records it"],
                  ["Statement day with a calculator", "Done at midnight on the last day"],
                  ["Dealers ringing to ask what sold", "A buzz on their phone within a minute"],
                  ["Handwritten tickets nobody can read", "Printed barcoded labels"],
                  ["Items sold twice, floor and online", "One ticket number everywhere"],
                  ["A spreadsheet for who owes what", "Dealers ranked against rent, every day"],
                ].map(([a, b]) => <tr key={a} className="border-b border-white/15 last:border-0"><td className="py-3 pr-4 text-[#B9CFBF] line-through decoration-gold">{a}</td><td className="py-3 font-semibold">{b}</td></tr>)}
              </tbody>
            </table>
          </div>
          <div>
            <div className="grid grid-cols-3 gap-3">
              {[["£299", "a month, till included"], ["£5", "per dealer, at 60"], ["0 min", "a day on the books"]].map(([n, l]) => <div key={l} className="rounded-[16px] bg-white/10 px-4 py-5"><div className="figure text-[32px]">{n}</div><div className="mt-1 text-[12px] font-semibold text-[#C9DCCF]">{l}</div></div>)}
            </div>
            <p className="mt-6 text-[16px] leading-7 text-[#DCE8DD]">A centre taking £20,000 a week spends more than £299 a month on the person who adds up the books. The online shop, run for you, is where most centres find it pays for itself in the first month.</p>
            <Link href="/guides/centres" className="mt-6 inline-block text-[15px] font-bold text-white underline decoration-gold underline-offset-4">Read the centre guide</Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-[36px] leading-[1.08] md:text-[44px]">Dealers pay by what they sell. Centres pay one price, till included.</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-[16px] text-ink-muted">List as much stock as you like. 14 days free on every plan, card at sign up, nothing charged until day 14, cancel any time.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {dealerPlans.map((p) => (
              <div key={p.name} className={`card relative flex flex-col p-7 ${p.featured ? "border-accent ring-1 ring-accent" : ""}`}>
                {p.featured && <span className="absolute -top-3 left-6 rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">Most dealers</span>}
                <div className="text-[14px] font-semibold text-ink-muted">{p.name}</div>
                <div className="mt-2 flex items-baseline gap-1"><span className="figure text-[44px]">{p.price}</span><span className="text-[14px] text-ink-muted">/month</span></div>
                <div className="mt-1 text-[15px] font-semibold">{p.who}</div>
                <div className="text-[13px] text-ink-muted">{p.forWho}</div>
                <ul className="mt-5 flex flex-col gap-2 text-[14px] font-medium">{p.bits.map((b) => <li key={b} className="border-b border-border pb-2 last:border-0">{b}</li>)}</ul>
                {p.not.length > 0 && <ul className="mt-2 flex flex-col gap-2 text-[14px] text-ink-muted line-through decoration-[#C9B38A]">{p.not.map((b) => <li key={b}>{b}</li>)}</ul>}
                <Link href={`/signup?as=dealer&plan=${p.name.toLowerCase()}`} className={`mt-7 ${p.featured ? "btn" : "btn-outline"}`}>Choose {p.name}</Link>
              </div>
            ))}
          </div>
          <div className="card mt-8 overflow-hidden">
            <div className="border-b border-border px-6 py-4"><h4 className="text-[16px] font-semibold">What is in each plan</h4><p className="text-[13px] text-ink-muted">The only things that change between plans are how much you sell, where, and whether you use the centre&rsquo;s online shop.</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[14px]">
                <thead><tr className="border-b border-border text-left text-[13px] font-bold text-ink-muted"><th className="px-6 py-3 font-semibold">&nbsp;</th><th className="py-3 font-semibold">Starter £25</th><th className="py-3 font-semibold text-accent">Trade £100</th><th className="py-3 font-semibold">Pro £150</th></tr></thead>
                <tbody>{compare.map(([k, a, b, c]) => <tr key={k} className="border-b border-border last:border-0"><td className="px-6 py-3 font-semibold">{k}</td>{[a, b, c].map((v, i) => <td key={i} className={`py-3 ${v === "✓" ? "font-bold text-forest" : v === "–" ? "text-ink-muted" : "font-medium"}`}>{v === "✓" ? "Included" : v === "–" ? "Not included" : v}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-start justify-between gap-5 rounded-[20px] bg-forest p-7 text-white md:flex-row md:items-center">
            <div>
              <div className="text-[14px] font-semibold text-[#C9DCCF]">For centres</div>
              <div className="mt-1 flex items-baseline gap-1"><span className="figure text-[44px]">£299</span><span className="text-[14px] text-[#C9DCCF]">/month</span></div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[12px] bg-white/10 p-3"><div className="text-[14px] font-semibold">Need a till</div><div className="text-[13px] text-[#DCE8DD]">12 months. Square Register Retail Kit included, set up on site, yours after that.</div></div>
                <div className="rounded-[12px] bg-white/10 p-3"><div className="text-[14px] font-semibold">Already on Square</div><div className="text-[13px] text-[#DCE8DD]">Monthly, 14 days free, cancel any time. We connect it and load your dealers.</div></div>
              </div>
              <p className="mt-3 max-w-xl text-[14px] text-[#DCE8DD]">Both: unlimited dealers, statements and payouts worked out, and your own online shop run for you at 20% commission.</p>
            </div>
            <Link href="/signup?as=centre" className="btn-secondary !w-auto !px-7">Set up my centre</Link>
          </div>
        </div>
      </section>

      {/* Kit */}
      <section id="kit" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-[36px] leading-[1.08] md:text-[44px]">Dealers: the centre prints your labels. Or print your own.</h2>
          <p className="mt-3 max-w-2xl text-[16px] text-ink-muted">Every subscribed centre has a label printer on the counter and you can print to it from your phone. If you label at the kitchen table instead, this is all you need.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {kit.map((k) => (
              <a key={k.name} href={amazon(k.q)} target="_blank" rel="noreferrer sponsored" className="card flex flex-col p-5 transition hover:border-accent">
                <div className="flex items-center justify-between text-[13px] font-semibold text-ink-muted"><span>{k.name}</span><span>{k.price}</span></div>
                <div className="mt-1.5 text-[17px] font-semibold">{k.pick}</div>
                <p className="mt-1.5 flex-1 text-[14px] leading-6 text-ink-muted">{k.why}</p>
                <span className="mt-4 text-[13px] font-semibold text-accent">Find it on Amazon →</span>
              </a>
            ))}
            <div className="flex flex-col justify-center rounded-[18px] bg-surface-2 p-5 text-[14px] leading-6 text-ink-muted">
              <span className="font-semibold text-ink">Already have a printer?</span>
              Brother QL, Zebra ZD411 and Dymo LabelWriter all work; pick the model in Settings and the label lays itself out to the roll.
              <span className="mt-3 text-[12px]">Links go to Amazon. We may earn a small commission; the price to you is the same.</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-[36px] leading-[1.08] md:text-[44px]">Questions dealers ask</h2>
          <div className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {faqs.map(([q, a]) => <div key={q}><h3 className="text-[17px] font-bold leading-6">{q}</h3><p className="mt-2 text-[15px] leading-6 text-ink-muted">{a}</p></div>)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-[24px] bg-accent px-8 py-14 text-center text-cream">
          <Mark size={320} color="#FFFFFF" className="pointer-events-none absolute -right-16 -bottom-24 opacity-10" />
          <h2 className="relative text-[36px] text-cream md:text-[44px]">Your first item takes a minute</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-[16px] text-header-muted">Sign in with your email, name your business, list something. The label prints at the centre the moment you press List.</p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3"><Link href="/signup?as=dealer" className="btn-secondary !w-auto !px-7">List my first item</Link><Link href="/guides/dealers" className="btn-outline !w-auto !border-white/30 !bg-transparent !px-7 !text-cream">Read the guide</Link></div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 text-[13px] text-ink-muted md:flex-row md:items-center">
          <div className="flex flex-col gap-2"><Logo size={26} /><span>Dealer Centre Ltd, Norwich. hello@thedealercentre.co.uk</span></div>
          <nav className="flex flex-wrap gap-5"><Link href="/guides/dealers">Dealer guide</Link><Link href="/guides/centres">Centre guide</Link><a href="#pricing">Pricing</a><Link href="/signin">Sign in</Link></nav>
        </div>
      </footer>
    </main>
  );
}
