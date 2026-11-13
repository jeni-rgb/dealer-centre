import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Terms of service | Dealer Centre",
  description: "The terms for dealers and centres using Dealer Centre.",
  alternates: { canonical: "https://thedealercentre.co.uk/terms" },
};

const UPDATED = "7 November 2026";

const sections: { title: string; body: string[] }[] = [
  {
    "title": "Who we are",
    "body": [
      "Dealer Centre is run by Dealer Centre Ltd (company number [company number]), a company registered in England and Wales, registered office Hardwick House, Agricultural Hall Plain, Norwich NR1 3FS. You can reach us at hello@thedealercentre.co.uk.",
      "These terms apply to everyone who uses thedealercentre.co.uk and the Dealer Centre apps: dealers, antiques centres and their staff. By creating an account or using the service you agree to them. Dealer Centre is a business tool, so you use it as a business, not as a consumer."
    ]
  },
  {
    "title": "What Dealer Centre does",
    "body": [
      "Dealer Centre lets dealers list stock, print ticket labels and track sales, and lets centres record sales at the till, run End of day, send statements and work out what each dealer is owed. It can connect to Square, Shopify and Stripe so an item listed once can be sold on the floor or online without being sold twice."
    ]
  },
  {
    "title": "Your account",
    "body": [
      "You sign in with a link sent to your email. There is no password, so keep your email account secure, because anyone who can read it can sign in as you.",
      "You must be 18 or over and give us accurate details. You are responsible for everything done through your account, including by staff you give access to and anyone using your centre till PIN. Tell us straight away at hello@thedealercentre.co.uk if you think someone else has used your account."
    ]
  },
  {
    "title": "Dealer plans",
    "body": [
      "Basic is free for every dealer at a centre that uses Dealer Centre. You do not need to sign up. Basic shows sales totals only, on a sales sheet sent with the centre payout. It does not show item names.",
      "Full costs £25 a month plus VAT, by Direct Debit. It shows every sale with the item name, price, date and centre, live in the app. Unlimited sales. One account and one bill however many centres you sell at. You can cancel any month from Account, which opens a secure page run by Stripe.",
      "If we label your stock, that is 75p an item plus VAT. Loading your own stock is free. If you agree to a taster, your first 25 items are labelled free and you get 2 weeks of named sales, then you return to Basic unless you start Full. All prices in these terms are plus VAT."
    ]
  },
  {
    "title": "Centre plans",
    "body": [
      "There are two centre plans, set by your answer to \"Do you already have a POS?\" when you sign up. All prices are plus VAT.",
      "Own till plan, £249 a month: for centres that already have a till or card machine. A monthly subscription with 14 days free. You can cancel at any time and it stops at the end of the period you have paid for. Square connects to Dealer Centre directly; any other till is used alongside the Dealer Centre till screen or End of day.",
      "Kit plan, £299 a month: for centres with no POS. A 12 month subscription with the Square Register kit included. There is no free trial and the first payment is taken when you subscribe. Both plans include unlimited dealers, statements and payout figures."
    ]
  },
  {
    "title": "Free trials",
    "body": [
      "Full has no free trial. A taster, if you say yes, is 2 weeks of named sales and 25 items labelled free, then you return to Basic unless you start Full at £25 a month plus VAT. Nothing is charged for the taster. Centres on the own till plan get 14 days free from the day they add a card. There is no trial on the kit plan. A centre's monthly fee is reduced by £2.50 plus VAT for each dealer on Full."
    ]
  },
  {
    "title": "Billing and renewal",
    "body": [
      "Full is taken by Direct Debit where your bank allows it, otherwise by card, through Stripe, monthly in advance. Subscriptions renew automatically until cancelled. Centre plans are taken by card through Stripe.",
      "If a payment fails, we will ask you to update your card. If it is still unpaid, we may limit your account until it is paid, as set out under Suspension. We may change our prices with at least 30 days notice by email; the new price applies from your next renewal after that. The price for a centre on the kit plan does not go up during its first 12 months."
    ]
  },
  {
    "title": "The kit plan and the Register kit",
    "body": [
      "If you take the kit plan, you agree to pay £299 a month plus VAT for 12 months from the date you subscribe. After 12 months it carries on monthly and you can cancel at any time.",
      "The kit is the Square Register Retail Kit: Square Register (2nd generation), 2D corded barcode scanner, Square Register tactile PIN guide, USB cash drawer, USB and Ethernet receipt printer, and USB barcode label printer. A barcode stand is not included. Dealer Centre arranges delivery and sets it up at your centre. Square charges its own fees and plans separately, and barcode label printing through Square needs Square for Retail Plus.",
      "The kit stays ours until you have paid all 12 monthly payments. It then becomes yours to keep. Until then, look after it, keep it at your centre and do not sell or lend it. If the Square hardware develops a fault, we will help you claim under Square's warranty. [Confirm warranty arrangements.]",
      "If you end the subscription during the first 12 months, or we end it because you have not paid, you must pay the months left in the 12 month term straight away. Square's own fees for card payments are charged by Square, not by us."
    ]
  },
  {
    "title": "Cancelling",
    "body": [
      "Dealers and centres on the own till plan can cancel at any time from Settings. Cancelling stops the next renewal and you keep access until the end of the period you have paid for. We do not refund part months.",
      "Centres on the kit plan can cancel once the 12 months are up by emailing hello@thedealercentre.co.uk; the self service page does not offer cancelling during the term.",
      "When an account closes, your listings stop syncing to Square and Shopify. You can download your statements before you leave. We keep records as set out in our privacy policy."
    ]
  },
  {
    "title": "Commission, statements and payouts",
    "body": [
      "Each centre sets its own floor commission and rent for its dealers. Items sold through a centre's online shop carry a 20% online commission on the sale price: 15% goes to Dealer Centre and 5% to the centre. Dealer Centre fulfils online orders: our staff collect sold items from the centre on a regular run (currently every other day), pack them and post them, and handle the buyer. The centre keeps the sold item safe and available for collection, and tells us straight away if it has been sold on the floor or cannot be found. Responsibility for the item passes to Dealer Centre on collection. The buyer pays postage at checkout, which Dealer Centre keeps against the cost of delivery; commission is worked out on the item price. Dealer Centre's 15% plus VAT is worked out at the end of each month and added to the centre's next monthly invoice. Sales in a dealer's own Shopify shop carry no centre or online commission.",
      "Dealer Centre works out each dealer's statement: floor sales, online sales, commission, rent and what is owed. Sale money never passes through Dealer Centre. Floor sales are paid into the centre's till, centre online sales into the centre's Shopify account, and a dealer's own online sales into the dealer's own Shopify account. The centre pays its dealers directly, and Dealer Centre is not responsible for payments between centres and dealers. Stripe is only used for Dealer Centre subscriptions.",
      "Statements are only as good as the sales recorded. Centres must correct mistakes promptly, and the original figure is kept for the record."
    ]
  },
  {
    "title": "Dealers' responsibilities",
    "body": [
      "You are the seller of your items. You must have the right to sell them and they must be legal to sell in the UK. Do not list stolen goods, fakes sold as genuine, or items covered by restrictions such as ivory, protected species, weapons or recalled goods, unless the law allows it and you meet its rules.",
      "Descriptions, prices, condition, age and origin must be accurate. You are responsible to buyers for your items, including returns and consumer rights. You are responsible for your own tax and records. Photos and text you upload must be yours or used with permission, and you give us permission to show them in the app, on the till and in connected shops."
    ]
  },
  {
    "title": "Centres' responsibilities",
    "body": [
      "Record sales accurately and promptly, keep your till PIN private and change it if it may be known. Approve only real dealers at your centre. Pay your dealers what their statements show, on the terms you agreed with them. You are responsible for your shop, your staff and your Square account, and for keeping items sold online safe until our runner collects them."
    ]
  },
  {
    "title": "Other services we connect to",
    "body": [
      "Dealer Centre connects to Square, Shopify and Stripe, and sends emails through Resend. Those services have their own terms, which you agree to with them. We are not responsible for them being unavailable, for their fees, or for changes they make. If a connection fails, an item could appear for sale in two places for a short time; we try to prevent this but cannot promise it never happens.",
      "If you turn on notifications, we send alerts to your phone or browser when you sell something and for account updates. You can turn them off in your phone or browser settings."
    ]
  },
  {
    "title": "Availability",
    "body": [
      "We work to keep Dealer Centre running all the time but cannot promise it will never be interrupted, for example for maintenance or problems with our hosting or other providers. Keep a way to take sales if the app is unavailable. We may change or improve features over time, and will tell you before removing anything important to your plan."
    ]
  },
  {
    "title": "Our liability",
    "body": [
      "Nothing in these terms limits liability for death or personal injury caused by negligence, fraud, or anything else the law does not allow us to limit.",
      "We are not liable for loss of profit, sales, business, data or goodwill, or for any indirect loss. We are not liable for disputes between dealers, centres and buyers, or for items listed by dealers.",
      "Otherwise, our total liability to you in any 12 months is limited to the amount you paid us in that period."
    ]
  },
  {
    "title": "Your data",
    "body": [
      "We handle personal data as explained in our privacy policy at thedealercentre.co.uk/privacy. Your data is stored with our hosting providers. A dealer's purchase prices are private to that dealer. A centre sees its dealers' stock and sales at that centre. You own your data and can ask for a copy at any time."
    ]
  },
  {
    "title": "Suspension and closing accounts",
    "body": [
      "We may suspend or close an account if payment is overdue, if these terms are seriously broken, if we reasonably suspect fraud or illegal items, or if the account puts the service or others at risk. Where we can, we will tell you first and give you a chance to put it right."
    ]
  },
  {
    "title": "Changes to these terms",
    "body": [
      "We may update these terms. If a change matters, we will email you at least 30 days before it takes effect. Carrying on using Dealer Centre after that means you accept the new terms. If you do not, you can cancel before they take effect, and for centres on the kit plan a change that materially harms you lets you leave without the early ending charge."
    ]
  },
  {
    "title": "General",
    "body": [
      "These terms are the whole agreement between us about Dealer Centre. If any part cannot be enforced, the rest still applies. You may not transfer your account without our agreement.",
      "These terms are governed by the law of England and Wales, and the courts of England and Wales deal with any dispute. Please email hello@thedealercentre.co.uk first so we can try to sort it out."
    ]
  }
];

export default function Terms() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/"><Logo size={30} /></Link>
        <nav className="flex items-center gap-5 text-[14px] font-medium text-ink-muted"><Link href="/guides/dealers">Dealer guide</Link><Link href="/guides/centres">Centre guide</Link><Link href="/signin" className="btn-sm">Sign in</Link></nav>
      </header>
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-8">
        <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-accent">Legal</span>
        <h1 className="mt-3 text-[40px] font-bold leading-[1.05] tracking-[-0.02em] md:text-[52px]">Terms of service</h1>
        <p className="mt-5 text-[15px] text-ink-muted">Last updated {UPDATED}</p>
        {sections.map((s, i) => (
          <section key={s.title} id={`s${i + 1}`} className="mt-10">
            <h2 className="text-[22px] font-semibold">{i + 1}. {s.title}</h2>
            {s.body.map((p, j) => <p key={j} className="mt-3 text-[16px] leading-7 text-ink-muted">{p}</p>)}
          </section>
        ))}
      </div>
    </main>
  );
}
