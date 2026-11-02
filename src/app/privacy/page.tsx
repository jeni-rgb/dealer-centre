import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Privacy policy | Dealer Centre",
  description: "How Dealer Centre collects, uses and protects personal data.",
  alternates: { canonical: "https://thedealercentre.co.uk/privacy" },
};

const UPDATED = "2 November 2026";

const sections: { title: string; body: string[] }[] = [
  {
    "title": "Who we are",
    "body": [
      "Dealer Centre is run by Dealer Centre Ltd (company number [company number]), a company registered in England and Wales, registered office Hardwick House, Agricultural Hall Plain, Norwich NR1 3FS. For UK data protection law, we are the controller of the personal data described here. Contact us about your data at hello@thedealercentre.co.uk. ICO registration number: [ICO registration number]."
    ]
  },
  {
    "title": "What we collect",
    "body": [
      "Account details: your name, email address, business or centre name and address, your dealer code, and your role.",
      "Stock and sales: items you list with photos, descriptions, prices, ticket numbers and what you paid for them, plus sales, rent, commission and statements.",
      "Billing: your plan and subscription status. Card details are taken and held by Stripe; we never see your full card number.",
      "Connected accounts: if you connect Square or Shopify, we store the access keys those services give us so we can sync your stock and sales.",
      "Notifications: if you turn them on, the address your phone or browser gives us for sending alerts, and the type of device and browser.",
      "Technical data: sign in records, and the IP address and basic request logs our hosting keeps, used for security, such as limiting wrong till PIN attempts."
    ]
  },
  {
    "title": "Why we use it and our lawful basis",
    "body": [
      "To provide the service you signed up for: your account, listings, labels, till and End of day, statements, syncing to connected shops, notifications and billing. Our lawful basis is the contract with you.",
      "To keep the service secure, prevent fraud and fix problems, and to send you important service emails. Our lawful basis is our legitimate interests.",
      "To keep financial records and meet tax rules. Our lawful basis is legal obligation.",
      "We do not sell your data, and we do not use it for advertising."
    ]
  },
  {
    "title": "Who can see your data",
    "body": [
      "A dealer's purchase prices are private to that dealer. A centre can see the stock, sales and statements of dealers at that centre. Dealers cannot see each other's data.",
      "We use these providers to run Dealer Centre, under contracts that protect your data: Supabase (database, sign in and file storage), Vercel (hosting), Stripe (payments and subscriptions), Square (centre tills and payments), Shopify (online shops), Resend (sending emails), ImprovMX (forwarding emails sent to us), and Google Firebase (phone notifications). Square, Shopify and Stripe also act as controllers under their own privacy policies for the accounts you hold with them."
    ]
  },
  {
    "title": "International transfers",
    "body": [
      "Some providers store or process data outside the UK, including in the USA and the EU. Where they do, we rely on UK adequacy regulations or the UK International Data Transfer Addendum to keep it protected. [Confirm the Supabase project region.]"
    ]
  },
  {
    "title": "How long we keep it",
    "body": [
      "We keep your account data while your account is open. After it closes we delete or anonymise it within 12 months, except sales, statements and billing records, which we keep for 6 years for tax and accounting. Notification addresses are deleted when you turn notifications off or they stop working."
    ]
  },
  {
    "title": "Your rights",
    "body": [
      "You can ask for a copy of your data, ask us to correct or delete it, object to or ask us to restrict how we use it, and ask for it in a portable format. Email hello@thedealercentre.co.uk and we will reply within one month.",
      "If you are unhappy with how we handle your data, you can complain to the Information Commissioner's Office at ico.org.uk. We would like the chance to sort it out first."
    ]
  },
  {
    "title": "Cookies",
    "body": [
      "We only use cookies that are needed to keep you signed in and make the service work. We do not use advertising or analytics cookies, so we do not ask for cookie consent."
    ]
  },
  {
    "title": "Security",
    "body": [
      "Data is encrypted in transit, access is controlled so each account sees only its own data, and till PINs are stored securely. No system is perfectly secure, so keep your email account safe, because it is how you sign in."
    ]
  },
  {
    "title": "Changes",
    "body": [
      "We may update this policy. If a change matters, we will email you before it takes effect."
    ]
  }
];

export default function Privacy() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/"><Logo size={30} /></Link>
        <nav className="flex items-center gap-5 text-[14px] font-medium text-ink-muted"><Link href="/guides/dealers">Dealer guide</Link><Link href="/guides/centres">Centre guide</Link><Link href="/signin" className="btn-sm">Sign in</Link></nav>
      </header>
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-8">
        <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-accent">Legal</span>
        <h1 className="mt-3 text-[40px] font-bold leading-[1.05] tracking-[-0.02em] md:text-[52px]">Privacy policy</h1>
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
