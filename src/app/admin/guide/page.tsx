import { Guide } from "@/components/guide";

export default function AdminGuide() {
  return (
    <Guide
      publicPage={false}
      eyebrow="Platform admin"
      title="Running Dealer Centre"
      intro="For whoever is onboarding centres and keeping the platform healthy. Not linked from the public site."
      sections={[
        { id: "onboard", title: "Onboard a centre in one form", lead: "Admin, Onboard a centre. Name, town, the owner's email, till type, commission and rent, and the dealer list pasted one per line with the code already on their tickets. It creates the centre, the owner's account and every dealer, and gives you a one use sign in link to send the owner. Free months is for centres you are comping; 0 means the normal 14 day trial with a card.", browser: "/screens/admin-onboard.webp" },
        { id: "centres", title: "Centres and dealers", lead: "Every centre with its plan status (paying, trial, no card, comp, or added by dealers and not yet claimed), Square connection, sales month to date, and a CSV export. Every dealer with plan and Shopify status. MRR split between dealers and centres.", browser: "/screens/admin.webp" },
        { id: "health", title: "Health", lead: "The last 48 hours of webhooks (Square, Shopify, Stripe), failed background jobs with their error, unmatched till sales, and listings that failed to sync. Check it after any integration change and when a dealer says a sale did not arrive.", browser: "/screens/admin-health.webp", tip: "A job that keeps failing retries at 1, 5, 15, 60 and 240 minutes and then stops. Fix the cause and it can be re queued from Health." },
        { id: "orders", title: "Online orders and postage", lead: "Admin, Online orders is the shop manager's desk. To collect: tick, Print run sheet, runner collects every other day, Mark collected (Mark missing emails the centre and dealer). At the unit: weigh, pick format and service, Buy postage and print labels: one PDF of paid labels then despatch notes, orders go to Despatched and Shopify emails the buyer the tracking. Refunds in Shopify flip the order to Refunded and void the sale.", steps: ["Postage provider: Shiptheory (SHIPTHEORY_EMAIL and SHIPTHEORY_PASSWORD in Vercel; Royal Mail on our business account plus Parcelforce, DPD, Evri; it manifests Royal Mail and books courier collections) or Royal Mail Click & Drop direct (CLICK_AND_DROP_API_KEY; manifest once a day in Click & Drop). POSTAGE_PROVIDER forces one.", "POSTAGE_DEFAULT_SERVICE and POSTAGE_SPECIAL_SERVICE (used over £150) are service codes from the provider's list; otherwise Tracked 48 and Special Delivery on Click & Drop, or Shiptheory's shipping rules.", "Each centre's Shopify store needs weight based shipping rates, because the item's delivery class sets the product weight: 0 to 2 kg Royal Mail tracked £4.95; 2 to 10 kg Royal Mail tracked £8.95; 10 to 30 kg courier £24.95; over 30 kg a £0 rate named 'Collect from the centre, or we quote delivery'. Settings, Shipping and delivery, General profile, add rates with weight conditions.", "RETURNS_ADDRESS is the unit address printed on every despatch note."] },
        { id: "open-as", title: "Opening a centre's dashboard", lead: "Admins can open any centre with /centre?centre=<id> (the link on the centres table). Everything you do there is as that centre, so be careful with End of day." },
        { id: "keys", title: "Keys and environment", steps: ["Vercel holds every secret: Supabase, Stripe (secret, webhook, three dealer prices, centre price), Square, Shopify, Resend, VAPID push keys, JOBS_SECRET.", "Supabase runs the scheduler: a cron every minute calls /api/jobs/run with JOBS_SECRET.", "Rotate Supabase service role, Stripe secret and Resend keys after any period of sharing them, and after onboarding help from outside."] },
        { id: "sql", title: "Database changes", lead: "Every change is a numbered file in supabase/migrations and a matching setup-part file for the SQL editor. Run them in order, once. The latest is part 14 (online orders, postage, item delivery class)." },
        { id: "money", title: "How the money works", body: (
          <table className="mt-4 w-full text-[14px]"><tbody>
            {[["Dealer subscriptions", "£25 / £100 / £150 a month + VAT by items sold (up to 25 / 26 to 50 / over 50). 14 day trial, Stripe."], ["Centre subscriptions", "Kit plan £299 a month + VAT: no POS, 12 months, Square Register kit included, no trial. Own till plan £249 a month + VAT: already has a POS (Square or other), monthly, 14 days free. Comp via free months at onboarding."], ["Online shop", "20% of each online sale: 15% Dealer Centre, 5% the centre, dealer gets the rest. Our 15% plus VAT is added to the centre's next Stripe invoice by the month end job on the 1st."], ["Floor sales", "Centre's own commission and rent, set in centre Settings. We take nothing on floor sales."]].map(([k, v]) => <tr key={k} className="border-b border-border"><td className="py-2.5 pr-4 font-semibold">{k}</td><td className="py-2.5 text-ink-muted">{v}</td></tr>)}
          </tbody></table>
        ) },
      ]}
    />
  );
}
