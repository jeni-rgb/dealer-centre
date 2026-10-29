# Dealer Centre

List it once, label it once, sell it on the floor or online, never sell it twice.

Subscription app for antique and vintage dealers. One SKU runs the centre's Square till, the dealer's Shopify and the printed label. Multi tenant: platform, centres, dealers.

## Stack
Next.js 16, Supabase (Postgres, RLS, magic link auth, storage), Stripe Billing, Square API, Shopify GraphQL Admin API, pdf-lib + bwip-js labels, PrintNode for cloud printing, Resend email. Deployed on Vercel.

## Run locally
1. `cp .env.example .env.local` and fill it in.
2. Create a Supabase project, run `supabase/migrations/*.sql` in order in the SQL editor.
3. In Supabase Auth, set Site URL to your app URL and add `<app>/api/auth/callback` to redirect URLs.
4. `npm install --legacy-peer-deps && npm run dev`.
5. Sign in at `/signin`, then `/signup/dealer` or `/signup/centre`. Or sign in once with two emails and run `supabase/seed.sql` with them filled in.
6. Trigger the worker: `curl -X POST -H "Authorization: Bearer $JOBS_SECRET" http://localhost:3000/api/jobs/run`. On Vercel the cron in `vercel.json` calls it every minute.

## Square sandbox
Create an application at developer.squareup.com. Put the sandbox Application ID and secret in `.env`. Add webhook subscription pointing at `<app>/api/webhooks/square` for order.created, order.updated, payment.completed, refund.created, catalog.version.updated. Redirect URL: `<app>/api/oauth/square/callback`. Use the sandbox test account's Virtual Terminal to ring up sales.

## Shopify
Create a Partners account and a development store. Create an app, set redirect `<app>/api/oauth/shopify/callback`. Put the API key and secret in `.env`. Webhooks are registered automatically on connect.

## Stripe
Create a product with one recurring price (£150/month). Put the price id in `STRIPE_PRICE_ID`. Webhook to `<app>/api/webhooks/stripe` for checkout.session.completed and customer.subscription.*.

## Tests
`npx vitest run` covers SKU rules, sale matching and label rendering.

## Where things are
- `supabase/migrations` schema, RLS, SQL functions
- `src/lib/channels` Square and Shopify adapters behind one interface
- `src/lib/sales` matching and record_sale, the single entry point for every sale
- `src/lib/jobs` queue and handlers: fan out, close out, labels, reconciliation, notifications
- `src/lib/labels` PDF label renderer
- `src/app/app` dealer screens (mobile)
- `src/app/centre` centre owner screens
- `src/app/till` quick label for till staff
- `src/app/admin` platform admin
