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
        { id: "centres", title: "Centres and dealers", lead: "Every centre with its plan status (£299 + VAT paying, trial, no card, comp, or added by dealers and not yet claimed), Square connection, sales month to date, and a CSV export. Every dealer with plan and Shopify status. MRR split between dealers and centres.", browser: "/screens/admin.webp" },
        { id: "health", title: "Health", lead: "The last 48 hours of webhooks (Square, Shopify, Stripe), failed background jobs with their error, unmatched till sales, and listings that failed to sync. Check it after any integration change and when a dealer says a sale did not arrive.", browser: "/screens/admin-health.webp", tip: "A job that keeps failing retries at 1, 5, 15, 60 and 240 minutes and then stops. Fix the cause and it can be re queued from Health." },
        { id: "open-as", title: "Opening a centre's dashboard", lead: "Admins can open any centre with /centre?centre=<id> (the link on the centres table). Everything you do there is as that centre, so be careful with End of day." },
        { id: "keys", title: "Keys and environment", steps: ["Vercel holds every secret: Supabase, Stripe (secret, webhook, three dealer prices, centre price), Square, Shopify, Resend, VAPID push keys, JOBS_SECRET.", "Supabase runs the scheduler: a cron every minute calls /api/jobs/run with JOBS_SECRET.", "Rotate Supabase service role, Stripe secret and Resend keys after any period of sharing them, and after onboarding help from outside."] },
        { id: "sql", title: "Database changes", lead: "Every change is a numbered file in supabase/migrations and a matching setup-part file for the SQL editor. Run them in order, once. The latest is part 9 (push notifications)." },
        { id: "money", title: "How the money works", body: (
          <table className="mt-4 w-full text-[14px]"><tbody>
            {[["Dealer subscriptions", "£25 / £100 / £150 a month + VAT by items sold (up to 25 / 26 to 50 / over 50). 14 day trial, Stripe."], ["Centre subscription", "£299 a month + VAT. Already on Square: monthly, 14 days free. Needs a till: 12 months, Register kit included, no trial. Comp via free months at onboarding."], ["Online shop", "20% of each online sale: 15% Dealer Centre, 5% the centre, dealer gets the rest. Our 15% plus VAT is added to the centre's next Stripe invoice by the month end job on the 1st."], ["Floor sales", "Centre's own commission and rent, set in centre Settings. We take nothing on floor sales."]].map(([k, v]) => <tr key={k} className="border-b border-border"><td className="py-2.5 pr-4 font-semibold">{k}</td><td className="py-2.5 text-ink-muted">{v}</td></tr>)}
          </tbody></table>
        ) },
      ]}
    />
  );
}
