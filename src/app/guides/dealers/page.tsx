import type { Metadata } from "next";
import { Guide } from "@/components/guide";

export const metadata: Metadata = {
  title: "Dealer guide: how to list, label and sell with Dealer Centre",
  description: "A plain guide for antique and vintage dealers: sign up, join your centre, list an item, print the label, mark it sold at a fair, connect Shopify, read your statement.",
  alternates: { canonical: "https://thedealercentre.co.uk/guides/dealers" },
};

export default function DealerGuide() {
  return (
    <Guide
      eyebrow="Dealer guide"
      title="From a box of stock to a statement, on your phone"
      intro="Everything a dealer does in Dealer Centre, in the order you will do it. Ten minutes to read, a minute per item after that."
      related={[{ href: "/guides/centres", label: "Centre guide" }, { href: "/#pricing", label: "Pricing" }]}
      sections={[
        { id: "sign-up", title: "Sign up and add your card", lead: "There is no password. You sign in with a link sent to your email, every time.", steps: ["Go to thedealercentre.co.uk and press Start free.", "Enter your email, open the link it sends you.", "Name your business and choose your dealer code: two to four letters, usually what you already write on your tickets (B14, JH, RM).", "Pick a plan by how much you sell a month, add a card. Nothing is charged for 14 days."], tip: "Your dealer code becomes the first part of every ticket number, so use the one your centre already knows you by." , phone: "/screens/dealer-settings.webp" },
        { id: "centre", title: "Join your centre", lead: "Search for the centre by name or town. If it is on Dealer Centre you ask to join and they approve you. If it is not, add it yourself and carry on; nothing changes for you when they join later.", steps: ["Type the centre name.", "If the centre has already set you up, you will see your name in a list: tap it and your code and history come with you.", "Say whether you pay rent or commission only, and how much. The centre can correct it.", "Press Ask to join. Until they approve, you can still list."] },
        { id: "list", title: "List an item", lead: "This is the whole job. A quick snap for your own records, a title, a price, and what you paid (private). Press List and the ticket number is assigned and the label prints at the centre.", steps: ["Press List item on Today.", "Take a quick snap. Only you see this one.", "If the item is going online too, add Photos for online: up to ten, first one is the cover.", "Title and price. What you paid is optional and private; it powers the margin screen.", "Toggle where it goes: your Shopify, the centre shop. The centre floor is always on.", "Press List item. The label prints at the centre printer, or opens as a PDF if you print at home."], phone: "/screens/dealer-list.webp", tip: "Listed something with no label yet? Stock shows a No label filter and Labels prints them in a batch." },
        { id: "label", title: "The label and the ticket number", lead: "Every item gets one number, like B14 0372. It is on the label as a barcode and as words. The centre till scans it; the till screen or End of day can type it; your Shopify uses it as the SKU. One number, everywhere.", phone: "/screens/dealer-labels.webp" },
        { id: "sold", title: "When it sells", lead: "On the floor, the centre records it (till, iPad or End of day) and your phone buzzes within a minute. Online, Shopify or the centre shop tells us. Either way it comes off everywhere else the moment it sells.", steps: ["Turn on notifications from the card on Today. On iPhone, add the site to your home screen first.", "Sold online through the centre shop? Leave it exactly where it is: our runner collects it from the centre every other day, packs it and posts it. Nothing for you to do.", "Sold it yourself, cash in your pocket on the pitch? Open the item, Mark as sold, At the centre. It goes on your centre statement with commission, same as the till.", "Sold it at a fair or from home? Mark as sold, Elsewhere. No commission, and it is closed on Shopify and the till."], phone: "/screens/dealer-sold.webp" },
        { id: "margin", title: "Know your margin before you haggle", lead: "The dark card on every item is private to you. Paid, asking, profit at asking, then what you keep at 5, 10 and 15 percent off, after the centre's commission. The last line is the lowest price that still keeps a third.", phone: "/screens/dealer-item.webp" },
        { id: "corrections", title: "Fixing a mistake", lead: "Discounts happen and tickets get keyed wrong. Open the sold item: Correct sold price changes the figure (the original is kept for the audit trail), Undo sale puts it back on sale everywhere. The centre can do the same from End of day, and both of you see the correction." },
        { id: "shopify", title: "Your own Shopify", lead: "Optional. Connect it once in Settings and every item you toggle on appears in your shop with the same ticket number as its SKU. Sell it on the floor and the Shopify listing closes. Sell it on Shopify and the till closes.", steps: ["Settings, Connect Shopify, enter your store address (yourstore.myshopify.com).", "Approve Dealer Centre in Shopify.", "From then on the Your Shopify toggle is on by default when you list."] },
        { id: "statement", title: "Your statement", lead: "Every sale this month and every past month: date, item and ticket, price, floor or online, the commission taken (the centre's floor rate, or 20% online) and what is owed to you. Issued on the 1st; when the centre pays you it shows as paid. Download the PDF for any month; it is the same statement the centre sees.", phone: "/screens/dealer-statement.webp" },
        { id: "plan", title: "Plans and changing them", lead: "Plans go by what you sell a month, not what you list: Starter £25 for up to 25, Trade £100 for 26 to 50, Pro £150 for over 50, all + VAT. Listing is never blocked. If you sell past your tier, Today asks you to move up. Manage, change or cancel from Settings; it opens a secure page run by Stripe." },
      ]}
    />
  );
}
