import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { Logo, Mark } from "@/components/logo";
import { Phone, Browser } from "@/components/devices";

export const metadata: Metadata = {
  title: "Dealer Centre: stock, labels and sales for antique dealers and centres",
  description: "List an item once, print its label, and the ticket number runs the centre's till, your Shopify and the centre's online shop. A buzz on your phone when it sells. Statements that add themselves up. From £25 a month + VAT for dealers, from £249 a month + VAT for centres.",
  alternates: { canonical: "https://thedealercentre.co.uk" },
  openGraph: { title: "Dealer Centre", description: "List it once. Label it once. Sell it on the floor or online. Never sell it twice.", url: "https://thedealercentre.co.uk", siteName: "Dealer Centre", images: ["/screens/dealer-today.jpg"], locale: "en_GB", type: "website" },
};

/** Proof strip under the hero. Rendered only once these are filled in. */
const PROOF: { liveAt: string; founder: string } | null = null;
// const PROOF = { liveAt: "Live at [centre name], [town]", founder: "Built with my dad, a dealer for [N] years" };

const dealerPlans = [
  { name: "Starter", price: "£25", who: "Up to 25 items sold a month", forWho: "A pitch you top up at weekends", bits: ["Unlimited stock listed", "Ticket numbers and labels", "Centre till, End of day, notifications", "Your own Shopify", "Margin on every item", "Monthly statement with PDF"], not: ["Centre online shop", "More than one centre"] },
  { name: "Trade", price: "£100", who: "26 to 50 items sold a month", forWho: "Full time at one centre", bits: ["Everything in Starter", "Centre online shop", "Priority support"], not: ["More than one centre"], featured: true },
  { name: "Pro", price: "£150", who: "Over 50 items sold a month", forWho: "Several pitches, several centres", bits: ["Everything in Trade", "Any number of centres on one account", "Export for your accountant", "Phone support"], not: [] },
];

const compare: [string, string, string, string][] = [
  ["Items sold a month", "Up to 25", "26 to 50", "Over 50"],
  ["Stock you can list", "Unlimited", "Unlimited", "Unlimited"],
  ["Centres you sell at", "One", "One", "Any number"],
  ["Ticket numbers and labels", "✓", "✓", "✓"],
  ["Centre till, End of day, notifications", "✓", "✓", "✓"],
  ["Your own Shopify", "✓", "✓", "✓"],
  ["Margin and haggle guide on every item", "✓", "✓", "✓"],
  ["Monthly statement with PDF", "✓", "✓", "✓"],
  ["Centre online shop", "–", "✓", "✓"],
  ["Export for your accountant", "–", "–", "✓"],
  ["Support", "Email", "Priority email", "Priority email and phone"],
];

const faqs = [
  ["Does my centre need to be on Dealer Centre?", "No. If they are not, you add the centre yourself at sign up and your items carry its name. You mark things sold from your phone. When the centre joins, nothing changes for you."],
  ["We have an ordinary till. Do we have to change it?", "When a centre subscribes, the Square Register comes with it and replaces the old till on day one, set up by us. Card payments move to Square at 1.75%. If your dealers are on the app before you subscribe, their sales can still be recorded at End of day in the meantime."],
  ["What happens to dealers who do not want the app?", "They carry on as they are. The centre gives them a line in the system with the code already on their tickets, and their sales still get recorded and still get a statement."],
  ["Who posts what sells online?", "We do, all of it. A Dealer Centre runner collects from every centre every other day, packs the item at our unit and posts it, and our online shop manager handles the buyer from first question to delivery. The centre does nothing and the dealer does nothing: leave the item where it is. The buyer pays postage at checkout and that covers the delivery, so the dealer's share is worked out on the item price."],
  ["Can I sell the same item on the floor and online?", "That is the point. One ticket number runs the till, your Shopify and the centre shop. The moment it sells anywhere, it comes off everywhere else."],
  ["What does the centre pay?", "Two plans. Kit plan, £299 a month + VAT: for centres with no POS, a 12 month subscription with the Square Register Retail Kit included, set up on site and yours to keep after 12 months, no free trial. Own till plan, £249 a month + VAT: you already have a POS, keep it; Square connects directly and any other till works beside our till screen. Monthly, 14 days free, cancel any time. Both include unlimited dealers, statements and payouts worked out, and the centre's own online shop run for you at 20% commission (15% to Dealer Centre, 5% to the centre)."],
  ["Is there a contract?", "Dealers: no, monthly, cancel from Settings, 14 days free. Kit plan centres: 12 months, then monthly and the kit is yours. Own till plan centres: monthly, no commitment."],
  ["We have a till that is not Square. Does it work?", "Yes. Card payments carry on through your machine. Sales are recorded on the Dealer Centre till screen beside it (an iPad with a PIN) or at End of day, and the item comes off the online shop the moment it is recorded. Square is the only till that connects directly, which is why the kit plan uses it."],
  ["Can I get my data out?", "Yes. Your stock list exports as a spreadsheet from Stock, every statement downloads as a PDF, and centres can export dealers and sales as CSV. If you leave, email hello@thedealercentre.co.uk and we send you everything."],
  ["Who can see what I paid?", "Only you. Cost prices are never shown to the centre, to other dealers, or on any shop. The centre sees your stock, your sales and your statement, nothing more."],
  ["Who is behind Dealer Centre?", "Dealer Centre Ltd, Hardwick House, Agricultural Hall Plain, Norwich NR1 3FS. Built in Norfolk with a family of antique dealers."],
];

const amazonTag = process.env.NEXT_PUBLIC_AMAZON_TAG ?? "";
const amazon = (q: string) => `https://www.amazon.co.uk/s?k=${encodeURIComponent(q)}${amazonTag ? `&tag=${amazonTag}` : ""}`;
const kit = [
  { name: "Label printer", pick: "Brother QL-820NWB", why: "Prints the ticket labels on wifi so any dealer can print to it. Zebra ZD411 (in the Square Retail Kit) and Dymo LabelWriter 550 also work.", price: "about £170", q: "Brother QL-820NWB label printer" },
  { name: "Labels", pick: "Brother DK-11209 (62 x 29 mm)", why: "Die cut, 800 a roll, the size every ticket label is laid out for. Two rolls lasts a centre a month.", price: "about £12 a roll", q: "Brother DK-11209 labels" },
];

const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
const offer = (name: string, price: string) => ({ "@type": "Offer", name, price, priceCurrency: "GBP", priceSpecification: { "@type": "UnitPriceSpecification", price, priceCurrency: "GBP", valueAddedTaxIncluded: false, billingIncrement: 1, unitCode: "MON", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" } } });
const productJsonLd = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Dealer Centre", applicationCategory: "BusinessApplication", operatingSystem: "Web, iOS, Android", description: "Stock, labels and sales for antique dealers and antiques centres.", provider: { "@type": "Organization", name: "Dealer Centre Ltd", address: { "@type": "PostalAddress", streetAddress: "Hardwick House, Agricultural Hall Plain", addressLocality: "Norwich", postalCode: "NR1 3FS", addressCountry: "GB" } }, offers: [offer("Starter", "25"), offer("Trade", "100"), offer("Pro", "150"), offer("Centre, kit plan", "299"), offer("Centre, own till plan", "249")] };

export default function Landing() {
  return (
    <main className="overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([productJsonLd, faqJsonLd]) }} />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo size={34} />
        <nav className="hidden items-center gap-7 text-[14px] font-medium text-ink-muted md:flex">
          <a href="#dealers">For dealers</a><a href="#centres">For centres</a><a href="#online-shop">Online shop</a><a href="#pricing">Pricing</a><a href="#kit">Kit</a><Link href="/guides/dealers">Guides</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/signin" className="text-[14px] font-medium">Sign in</Link>
          <Link href="/signup" className="btn-sm">Start free</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pb-10 pt-10 md:pt-20">
        <Mark size={640} className="pointer-events-none absolute -right-40 -top-10 opacity-[0.05]" />
        <div className="grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr]">
          <div className="relative">
            <span className="text-[15px] font-semibold text-accent">For antique and vintage centres and their dealers</span>
            <h1 className="mt-5 text-[40px] leading-[1.0] tracking-[-0.03em] md:text-[66px]">One ticket.<br />Sold once.<br />Everywhere.</h1>
            <p className="mt-6 max-w-xl text-[19px] leading-8 text-ink-muted">Dealer Centre runs your antiques centre&rsquo;s till, labels, online shop and dealer statements from a single ticket number. Dealers list from their phone and hear the moment it sells.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup?as=centre" className="btn !w-auto !px-7">I run a centre</Link>
              <Link href="/signup?as=dealer" className="btn-outline !w-auto !px-7">I&rsquo;m a dealer</Link>
            </div>
            <p className="mt-4 text-[13px] text-ink-muted">Dealers from £25 a month + VAT. Centres from £249 a month + VAT. 14 days free for dealers and for centres with their own till.</p>
          </div>
          <div className="relative order-first mx-auto flex items-start justify-center md:order-none">
            <Phone src="/screens/dealer-today.webp" alt="Today screen: sales this month, recent sales" className="w-[220px] -rotate-3 md:w-[300px]" priority />
            <Phone src="/screens/dealer-item.webp" alt="An item with its margin and channels" className="-ml-10 hidden w-[250px] translate-y-20 rotate-3 md:block" />
          </div>
        </div>
        {PROOF && (
          <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-2 border-t border-border pt-6 text-[14px] font-semibold text-ink-muted">
            <span>{PROOF.liveAt}</span><span>{PROOF.founder}</span>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="max-w-2xl text-[36px] leading-[1.08] md:text-[44px]">List it. Sell it anywhere. It comes off everywhere else.</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              ["List it on your phone", "Photo, title, price. The app gives it a ticket number and prints the barcoded label at the centre.", "/screens/dealer-list.webp"],
              ["It sells, anywhere", "On the floor the till scans the ticket. Online it sells on your Shopify or the centre shop. The other places close instantly.", "/screens/dealer-sold.webp"],
              ["You hear, the statement writes itself", "A buzz on your phone with what sold and for how much. Commission, rent and payouts worked out at month end.", "/screens/dealer-statement.webp"],
            ].map(([t, b, img], i) => (
              <div key={t} className="flex flex-col items-start">
                <div className="flex items-end gap-4">
                  <Phone src={img} alt={t} className="w-[200px]" />
                  {i === 1 && <SoldEverywhere />}
                </div>
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
            <Phone src="/screens/dealer-item.webp" alt="An item with its margin and channels" className="w-[280px] -rotate-2" />
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
              <p className="mt-5 text-[18px] leading-8 text-[#E6E0BD]">Square Register Retail Kit included on the 12 month plan: Register, cash drawer, receipt printer, barcode scanner and a Brother label printer every dealer can print to from their phone. Set up on site with every dealer loaded. Yours to keep after 12 months.</p>
              <p className="mt-4 text-[16px] leading-7 text-cream">Already have a POS? Keep it: £249 a month + VAT, monthly, 14 days free. Either way your online shop is built and run for you.</p>
              <p className="hand mt-6 text-[26px] leading-7 text-gold">£299 a month + VAT with the Register. No till to buy, no books to keep.</p>
              <p className="mt-4 text-[13px] text-[#E6E0BD]">Barcode label printing on Square needs Square&rsquo;s Retail Plus plan. Dealer Centre prints labels to the Brother from any phone without it.</p>
              <Link href="/signup?as=centre" className="btn-secondary mt-6 !w-auto !px-8">Set up my centre</Link>
            </div>
            <figure className="relative overflow-hidden rounded-[24px] bg-white p-6">
              <Image src="/kit/register-kit.jpg" alt="Square Register Retail Kit: Register with customer display, cash drawer, receipt printer, barcode scanner and label printer" width={439} height={191} sizes="(max-width: 768px) 100vw, 540px" className="h-auto w-full" />
              <figcaption className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px] font-semibold text-ink">{["Square Register", "Cash drawer", "Receipt printer", "Barcode scanner", "Brother label printer", "Set up on site", "Yours after 12 months"].map((b) => <span key={b}>{b}</span>)}</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Online shop, run for you */}
      <section id="online-shop" className="bg-white py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 md:grid-cols-2">
          <div>
            <h2 className="text-[36px] leading-[1.08] md:text-[44px]">Your online shop. Stocked by your dealers. Run, packed and posted by us.</h2>
            <p className="mt-5 text-[18px] leading-8 text-ink-muted">Most centres have thousands of items that only the people who walk through the door ever see. Dealer Centre puts them online under your centre&rsquo;s name and does the whole job: listing, customers, payment, collection, packing and posting. Nothing to do and nothing to pay up front.</p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {[
                ["We build it and list it", "Every item a dealer switches on goes up with its photos, price and ticket number. New stock appears the day it is listed."],
                ["Our shop manager deals with the buyer", "Questions, payment, order emails and the receipt are handled by a person whose job it is. You hear when something sells."],
                ["Our runner collects, packs and posts it", "A Dealer Centre runner calls at your centre every other day, takes sold items off the shelf, packs them properly at our unit and posts them. You never touch a parcel."],
                ["It comes off the floor instantly", "Sold online, the ticket is dead on the till. Sold on the floor, the listing closes. Nothing is sold twice."],
              ].map(([t, b]) => <div key={t}><h3 className="text-[17px] font-bold leading-6">{t}</h3><p className="mt-1.5 text-[14px] leading-6 text-ink-muted">{b}</p></div>)}
            </div>
            <div className="mt-8 rounded-[18px] bg-surface-2 p-5">
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <div><div className="figure text-[36px]">20%</div><div className="text-[12px] font-semibold text-ink-muted">commission on what sells online</div></div>
                <div><div className="figure text-[36px] text-forest">5%</div><div className="text-[12px] font-semibold text-ink-muted">of every online sale is yours</div></div>
                <div><div className="figure text-[36px]">£0</div><div className="text-[12px] font-semibold text-ink-muted">to set up, included in both centre plans</div></div>
              </div>
              <p className="mt-3 text-[13px] text-ink-muted">15% to Dealer Centre, 5% to your centre, the dealer gets the rest on their statement. No monthly fee for the shop.</p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <Browser src="/screens/centre-online.webp" alt="Centre online shop page: online sales, your share, picking list" />
            <p className="text-center text-[13px] text-ink-muted">The centre&rsquo;s view: what sold online, your 5%, and what our runner is collecting.</p>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="max-w-3xl text-[36px] leading-[1.08] md:text-[44px]">Sixty dealers. Sixty statements. Two minutes a day.</h2>
          <div className="mt-12">
            <Browser src="/screens/centre-dashboard.webp" alt="Centre dashboard: month to date, dealers ranked, rent against sales" />
          </div>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {[
              ["Every sale recorded by the till", "Dealers on the app: scan the barcode. Dealers not on the app: tap their name, type the price. Cash or card, the Register does the rest. Nothing written in a book, ever."],
              ["Dealers and statements", "Unlimited dealers, on the app or not. Statements worked out: sales, commission, rent, net. Payouts listed, PDF per dealer. Dealers ranked: sales against rent, who has gone quiet."],
              ["Your online shop, run for you", "Every dealer's stock, listed and sold online under your centre's name. Our shop manager lists it, answers the customer and takes the payment; our runner collects it from your shelf, packs it and posts it. You do nothing. 20% commission on what sells online (15% Dealer Centre, 5% to your centre)."],
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
              {[["£249", "+ VAT a month, from"], ["Unlimited", "dealers"], ["Month end", "statements done"]].map(([n, l]) => <div key={l} className="rounded-[16px] bg-white/10 px-4 py-5"><div className="figure text-[28px]">{n}</div><div className="mt-1 text-[12px] font-semibold text-[#C9DCCF]">{l}</div></div>)}
            </div>
            {/* [PLACEHOLDER] a real line about what a centre spends on the books today, from Jeni:
            <p className="mt-6 text-[16px] leading-7 text-[#DCE8DD]">...</p> */}
            <p className="mt-6 text-[16px] leading-7 text-[#DCE8DD]">The till records every sale, the statements add themselves up at month end, and your online shop is built and run for you with every dealer's stock in it. That shop is most of what the subscription pays for.</p>
            <Link href="/guides/centres" className="mt-6 inline-block text-[15px] font-bold text-white underline decoration-gold underline-offset-4">Read the centre guide</Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-[36px] leading-[1.08] md:text-[44px]">Dealers pay by what they sell. Centres pay one price, till included.</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-[16px] text-ink-muted">14 days free on every plan, card at sign up, nothing charged until day 14, cancel any time. List as much stock as you like. All prices + VAT.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {dealerPlans.map((p) => (
              <div key={p.name} className={`card relative flex flex-col p-7 ${p.featured ? "border-accent ring-1 ring-accent" : ""}`}>
                {p.featured && <span className="absolute -top-3 left-6 rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">Most dealers</span>}
                <div className="text-[14px] font-semibold text-ink-muted">{p.name}</div>
                <div className="mt-2 flex items-baseline gap-1"><span className="figure text-[44px]">{p.price}</span><span className="text-[14px] text-ink-muted">/month + VAT</span></div>
                <div className="mt-1 text-[13px] font-semibold text-forest">14 days free, then {p.price} a month + VAT</div>
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
                <thead><tr className="border-b border-border text-left text-[13px] font-bold text-ink-muted"><th className="px-6 py-3 font-semibold">&nbsp;</th><th className="py-3 font-semibold">Starter £25 + VAT</th><th className="py-3 font-semibold text-accent">Trade £100 + VAT</th><th className="py-3 font-semibold">Pro £150 + VAT</th></tr></thead>
                <tbody>{compare.map(([k, a, b, c]) => <tr key={k} className="border-b border-border last:border-0"><td className="px-6 py-3 font-semibold">{k}</td>{[a, b, c].map((v, i) => <td key={i} className={`py-3 ${v === "✓" ? "font-bold text-forest" : v === "–" ? "text-ink-muted" : "font-medium"}`}>{v === "✓" ? "Included" : v === "–" ? "Not included" : v}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-start justify-between gap-5 rounded-[20px] bg-forest p-7 text-white md:flex-row md:items-center">
            <div>
              <div className="text-[14px] font-semibold text-[#C9DCCF]">For centres</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[12px] bg-white/10 p-4">
                  <div className="text-[14px] font-semibold">Kit plan</div>
                  <div className="mt-1 flex items-baseline gap-1"><span className="figure text-[36px]">£299</span><span className="text-[13px] text-[#C9DCCF]">/month + VAT</span></div>
                  <div className="mt-2 text-[13px] text-[#DCE8DD]">No POS yet. Square Register Retail Kit included, set up on site, yours after 12 months. 12 month subscription, no free trial.</div>
                </div>
                <div className="rounded-[12px] bg-white/10 p-4">
                  <div className="text-[14px] font-semibold">Own till plan</div>
                  <div className="mt-1 flex items-baseline gap-1"><span className="figure text-[36px]">£249</span><span className="text-[13px] text-[#C9DCCF]">/month + VAT</span></div>
                  <div className="mt-2 text-[13px] text-[#DCE8DD]">Already have a POS. Square connects directly; any other till works beside our till screen. Monthly, 14 days free, cancel any time.</div>
                </div>
              </div>
              <p className="mt-3 max-w-xl text-[14px] text-[#DCE8DD]">Both plans: unlimited dealers, statements and payouts worked out, and your own online shop built and run for you, no set up fee, 20% commission on what sells (15% Dealer Centre, 5% to your centre).</p>
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
          <h2 className="text-[36px] leading-[1.08] md:text-[44px]">Questions dealers and centres ask</h2>
          <div className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {faqs.map(([q, a]) => <div key={q}><h3 className="text-[17px] font-bold leading-6">{q}</h3><p className="mt-2 text-[15px] leading-6 text-ink-muted">{a}</p></div>)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-[24px] bg-accent px-8 py-14 text-center text-cream">
          <Mark size={320} color="#FFFFFF" className="pointer-events-none absolute -right-16 -bottom-24 opacity-10" />
          <h2 className="relative text-[36px] text-cream md:text-[44px]">Start with one item, or one centre.</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-[16px] text-header-muted">Sign in with your email and you are listing, or setting up your centre, in a minute.</p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3"><Link href="/signup?as=centre" className="btn-secondary !w-auto !px-7">I run a centre</Link><Link href="/signup?as=dealer" className="btn-outline !w-auto !border-white/30 !bg-transparent !px-7 !text-cream">I&rsquo;m a dealer</Link></div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 text-[13px] text-ink-muted md:flex-row md:items-center">
          <div className="flex flex-col gap-2"><Logo size={26} /><span>Dealer Centre Ltd, Hardwick House, Agricultural Hall Plain, Norwich NR1 3FS. hello@thedealercentre.co.uk</span><span>All prices shown are plus VAT.</span></div>
          <nav className="flex flex-wrap gap-5"><Link href="/guides/dealers">Dealer guide</Link><Link href="/guides/centres">Centre guide</Link><a href="#pricing">Pricing</a><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/signin">Sign in</Link></nav>
        </div>
      </footer>
    </main>
  );
}

/** Two frames: the item sells on the floor, and the online listing greys out. */
function SoldEverywhere() {
  return (
    <div className="hidden w-[160px] flex-col gap-2 pb-6 sm:flex" aria-hidden="true">
      <div className="rounded-[12px] border border-border bg-surface p-3 text-[11px]">
        <div className="flex items-center justify-between"><span className="font-semibold">TD00042</span><span className="whitespace-nowrap rounded-full bg-forest px-2 py-0.5 text-[9px] font-bold text-white">Sold on the floor</span></div>
        <div className="mt-1 text-ink-muted">Georgian sugar tongs</div>
        <div className="font-semibold">£65</div>
      </div>
      <div className="rounded-[12px] border border-dashed border-border bg-surface-2 p-3 text-[11px] text-ink-muted opacity-60">
        <div className="flex items-center justify-between"><span className="font-semibold">Online shop</span><span className="text-[10px] font-bold">Closed</span></div>
        <div className="mt-1 line-through">Georgian sugar tongs</div>
        <div className="line-through">£65</div>
      </div>
    </div>
  );
}
