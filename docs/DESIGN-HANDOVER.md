# Design handover, applied 30 Oct 2026

Source: Claude Design canvas "Dealer Centre design" and the handover doc. Direction: Dark header, white body, one blue accent, Inter, tabular figures.

Tokens are in `src/app/globals.css`. Components in `src/components/ui.tsx`.

## Decisions applied
1. Sold items live in Stock (Live and Sold switch). Statement gross sales links to Stock, Sold, filtered by month.
2. Cost price: `items.cost_pence`, private to the dealer. Item detail shows paid, asking, margin and a negotiating ladder (`src/app/app/items/[id]/margin.tsx`).
3. Sold price is the real price: `sales.amount_pence` is what was paid, `sales.listed_price_pence` is the ticket price. Stock, Sold shows the listed price struck through when they differ.
4. Three online channels per item: own Shopify, centre Shopify, centre eBay (`items.on_*`, dealer defaults on `dealers.default_*`). eBay adapter in `src/lib/channels/ebay.ts`. Centre online commission (27%), centre share (5%) and handling fee (£2.95) on the centre record.
5. Sign up 3 steps, setup 5 and skippable: `src/app/signup/dealer/setup.tsx`.
6. Centre picker searches every centre (`/api/centres/search`). Rent is self declared (`dealer_centres.rent_mode`, `rent_schedule`, `rent_set_by`) and correctable on Mapping.
7. Printers are additive: own plus every linked centre's till printer. Picker on Labels defaults to last used.
8. Every listed item has a `print_jobs` row. `not_printed` is the initial state when Print now is off. Labels screen has Print and Print all. Till printer jobs are sent immediately (hold until Print all is a one line change in `/api/labels/print`).
9. Till quick label: PIN gated, 44px dealer codes, keypad, print disabled until a price exists.
10. Centre owner never sees cost or margin: `items_centre_view` and the centre pages never select `cost_pence`.

## Plan tiers
£25 for 50 items, £100 for 100, £150 for 250. `dealers.item_limit` is set by the Stripe webhook from the price's `item_limit` metadata. `createItem` refuses above the limit with HTTP 402.

## Open questions carried
- Till printer timing: hold until Print all at the counter (recommended) vs print immediately.
- Centre store channels: dealer sets the online price (current). Centre fees are deducted on the sale.
- eBay: buy it now only (current).
- Rent: centre can override, `rent_set_by` records who set it; dealer notification not yet built.
- Label artwork in the new direction: label renderer is unchanged (black on white Code 128).
- Final product name, domain, wordmark.

## Phase 1 without a till, phase 2 with one (added 30 Oct)
- Looses has no POS. Every centre gets a `manual` channel. Centre owners record the day's collected tickets in **End of day** (`/centre/eod`): scan or type the ticket, cash or card, date, price paid. Each line goes through `record_sale`, so items close everywhere and dealers are notified.
- An unknown ticket is attributed to the dealer whose code it starts with (`src/lib/sales/record.ts`).
- When a Square till arrives, connecting it runs `backfill_channel`: every live item at the centre is pushed to Square with its existing SKU. "Push all stock to till" on Mapping re-runs it after dealers are mapped. Labels printed in phase 1 scan on the new till with no relabelling.
