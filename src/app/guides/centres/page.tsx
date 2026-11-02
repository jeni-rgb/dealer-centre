import type { Metadata } from "next";
import { Guide } from "@/components/guide";

export const metadata: Metadata = {
  title: "Centre guide: run an antiques centre's dealers, till and statements with Dealer Centre",
  description: "A plain guide for antiques centre owners: set up, add your dealers, record sales with an ordinary till or Square, End of day, statements and payouts, the online shop.",
  alternates: { canonical: "https://thedealercentre.co.uk/guides/centres" },
};

export default function CentreGuide() {
  return (
    <Guide
      eyebrow="Centre guide"
      tone="forest"
      title="Sixty dealers, one screen, two minutes a day"
      intro="How an antiques centre runs on Dealer Centre: from the six question sign up to statements that write themselves. Written for the person who cashes up, not for IT."
      related={[{ href: "/guides/dealers", label: "Dealer guide" }, { href: "/#pricing", label: "Pricing" }]}
      sections={[
        { id: "sign-up", title: "Set up in six questions", lead: "Name and town, roughly how many dealers, rent and when you take it, commission, what till you have, confirm. Then add a card: £299 a month, 14 days free, cancel any time.", steps: ["Go to thedealercentre.co.uk, press I run a centre, sign in with your email.", "Answer the six questions. If your dealers have already added your centre, it will offer it to you: press This is mine and they come with it.", "Add card and start trial.", "You get a centre code (give it to dealers) and a till PIN (for the Till screen)."], tip: "No Square? Choose Ordinary till. Everything works, and when you do get Square one button moves every item across." },
        { id: "dealers", title: "Add your dealers, on the app or not", lead: "Every dealer gets a line, whether or not they ever use the app. Use the code already on their tickets so nothing changes on the floor.", steps: ["Dealers page, Add a dealer: name, ticket code, pitches. One per line, as fast as you can type.", "Dealers who sign up to the app later pick their own name from a list and keep the same code and history.", "Join requests from dealers who signed up themselves appear on the Mapping page: approve, and check the rent they declared.", "Print code sheet gives you a one page list of who is who for the till."], browser: "/screens/centre-codes.jpg" },
        { id: "recording", title: "Recording sales with the till you have", lead: "Three ways, pick what suits the day. All three end up in the same place.", body: (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[["Till screen", "An iPad or phone by the till. Enter the PIN, scan or type the ticket, cash or card, done. Records at the moment of sale."], ["End of day", "Gather the tickets the till kept. Scan or type each one, correct any discounted price, press Record. Two minutes."], ["Square", "Connect it in Settings. Items appear on the till under each dealer's category with their barcode. The till records itself."]].map(([t, b]) => <div key={t} className="card p-4"><div className="text-[15px] font-semibold">{t}</div><p className="mt-1 text-[13px] leading-5 text-ink-muted">{b}</p></div>)}
          </div>
        ), browser: "/screens/centre-eod.jpg" },
        { id: "eod", title: "End of day, step by step", steps: ["End of day in the menu. The cursor is in the ticket box.", "Type the ticket number off each ticket and press Enter, or scan it. B14 372, b14372 and B14 0372 are all the same ticket.", "Title, dealer and price fill in. If the dealer gave a discount, overtype the price with what was paid.", "Tap Card or Cash for each.", "Press Record. Every dealer whose item sold gets a buzz on their phone.", "Below, Recorded this week lists every ticket. Edit a figure or Undo one that should not have gone through."], tip: "A ticket the app does not recognise is still recorded against the dealer's code (the first letters), so a dealer who is not on the app still gets paid." },
        { id: "dashboard", title: "The dashboard", lead: "Month to date, dealers ranked by sales with their rent beside it, who has not sold in 30 days, and any till sales that could not be matched to a dealer. Export to CSV for your accountant.", browser: "/screens/centre-dashboard.jpg" },
        { id: "statements", title: "Statements and payouts", lead: "At month end every dealer's statement is worked out: floor sales minus your commission and rent, online sales minus the online commission, net owed. Dealers see theirs in the app with a PDF. Rent on the first, fifteenth, last day, weekly or quarterly, as you set it." },
        { id: "online", title: "Your online shop", lead: "Connect the centre's Shopify in Settings and dealers can toggle items onto it when they list. We run the shop, answer the customers and pack the orders one day a week. You take a share of every online sale and the dealer gets the rest.", browser: "/screens/centre-online.jpg" },
        { id: "square", title: "When you buy a Square till", steps: ["Settings, Connect Square, approve.", "Mapping page: each dealer gets a Square category (Create in Square does it for you).", "Press Push all stock to till. Every live item appears in Square with its barcode. Nothing is retyped.", "From then on the till records the sale the moment it is rung through, and End of day is only for stragglers."] },
        { id: "settings", title: "Settings worth knowing", lead: "Rent and commission terms (including the online share), the till PIN, label printers, the centre's Shopify, and your subscription (opens a secure Stripe page to change card or cancel).", browser: "/screens/centre-settings.jpg" },
      ]}
    />
  );
}
