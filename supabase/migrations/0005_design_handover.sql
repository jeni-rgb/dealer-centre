-- Changes from the design handover, 30 Oct 2026.

-- 1. Cost price, private to the dealer. 2. Listed price kept separately from the sale price.
alter table items add column if not exists cost_pence integer;
alter table items add column if not exists listed_price_pence integer;
update items set listed_price_pence = price_pence where listed_price_pence is null;

-- Per item channel switches (defaults copied from the dealer record at creation)
alter table items add column if not exists on_own_shopify boolean not null default true;
alter table items add column if not exists on_centre_shopify boolean not null default false;
alter table items add column if not exists on_centre_ebay boolean not null default false;

alter table dealers add column if not exists default_own_shopify boolean not null default true;
alter table dealers add column if not exists default_centre_shopify boolean not null default false;
alter table dealers add column if not exists default_centre_ebay boolean not null default false;
alter table dealers add column if not exists item_limit integer not null default 50;

-- 3. Sold price is the real price
alter table sales add column if not exists listed_price_pence integer;
alter table sales add column if not exists discount_pence integer not null default 0;
alter table sales add column if not exists channel_fee_pence integer not null default 0;
alter table sales add column if not exists postage_pence integer not null default 0;

-- 4. eBay as a channel type. Centre online commission and the £2.95 handling fee live on the centre.
alter type channel_type add value if not exists 'ebay';
alter table centres add column if not exists online_commission_bps integer not null default 2700;
alter table centres add column if not exists centre_online_share_bps integer not null default 500;
alter table centres add column if not exists handling_fee_pence integer not null default 295;
alter table centres add column if not exists shop_fee_pence integer not null default 39900;

-- 6. Rent declared by the dealer, correctable by the centre
create type rent_mode as enum ('rent', 'commission_only');
create type rent_schedule as enum ('first', 'fifteenth', 'last', 'weekly_friday', 'weekly_monday', 'quarterly');
alter table dealer_centres add column if not exists rent_mode rent_mode not null default 'rent';
alter table dealer_centres add column if not exists rent_schedule rent_schedule not null default 'first';
alter table dealer_centres add column if not exists rent_set_by text not null default 'dealer';

-- 7. Printers: own or centre, access derived from dealer_centres
alter table printers add column if not exists source text not null default 'own';
alter table printers add column if not exists centre_id uuid references centres(id) on delete cascade;
update printers set source = 'centre', centre_id = owner_id where owner_type = 'centre';

-- 8. Every listed item has a label record. not_printed is the initial state.
alter type print_status add value if not exists 'not_printed' before 'queued';
alter table print_jobs add column if not exists requested_at timestamptz;
alter table print_jobs alter column printer_id drop not null;

-- Statements: centre store postage and fees
alter table statements add column if not exists fees_pence integer not null default 0;
alter table statements add column if not exists online_gross_pence integer not null default 0;
alter table statements add column if not exists online_commission_pence integer not null default 0;

-- 10. Centre owner never sees cost. Replace the centre view policy on items with a column safe view.
drop policy if exists items_centre_view on items;
create view items_centre_view as
  select id, dealer_id, centre_id, sku, title, price_pence, listed_price_pence, photos, status, listed_at, sold_at
  from items;
grant select on items_centre_view to authenticated;
-- RLS on the view is enforced via the underlying table policies plus this owner policy:
create policy items_centre_view on items for select
  using (centre_id in (select my_centre_ids()));
-- Note: the API layer must select from items_centre_view for centre owner requests so cost_pence is never returned.

-- Margin helper used by Item detail. Done client side too; here for statements and reports.
create or replace function item_margin(p_price integer, p_cost integer, p_commission_bps integer)
returns integer language sql immutable as $$
  select case when p_cost is null then null else round(p_price * (1 - p_commission_bps / 10000.0))::integer - p_cost end
$$;
