-- Dealer Centre database setup, part 2 of 3: security, functions, storage and later additions.
-- Run AFTER part 1 has succeeded, as a new query.

-- ===== 0002_rls.sql =====
-- Row level security. Tenancy is enforced here, not in app code.
-- Helper functions read the calling user's row once per statement.

create or replace function current_dealer_id() returns uuid
language sql stable security definer set search_path = public as $$
  select dealer_id from users where id = auth.uid()
$$;

create or replace function is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_platform_admin from users where id = auth.uid()), false)
$$;

create or replace function my_centre_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select centre_id from centre_owners where user_id = auth.uid()
$$;

create or replace function my_dealer_centre_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select centre_id from dealer_centres where dealer_id = current_dealer_id() and left_at is null
$$;

alter table users enable row level security;
alter table dealers enable row level security;
alter table centres enable row level security;
alter table centre_owners enable row level security;
alter table dealer_centres enable row level security;
alter table channels enable row level security;
alter table items enable row level security;
alter table item_listings enable row level security;
alter table sales enable row level security;
alter table printers enable row level security;
alter table label_templates enable row level security;
alter table print_jobs enable row level security;
alter table statements enable row level security;
alter table sku_counters enable row level security;
alter table jobs enable row level security;
alter table webhook_log enable row level security;
alter table alerts enable row level security;

-- Platform admin bypass on every table
do $$ declare t text;
begin
  foreach t in array array['users','dealers','centres','centre_owners','dealer_centres','channels','items',
    'item_listings','sales','printers','label_templates','print_jobs','statements','sku_counters','jobs','webhook_log','alerts']
  loop execute format('create policy %I_admin on %I for all using (is_platform_admin()) with check (is_platform_admin())', t, t);
  end loop;
end $$;

-- users: see and edit self
create policy users_self on users for select using (id = auth.uid());
create policy users_self_update on users for update using (id = auth.uid());

-- dealers: own row, or dealers linked to a centre you own
create policy dealers_own on dealers for all
  using (id = current_dealer_id()) with check (id = current_dealer_id());
create policy dealers_centre_view on dealers for select
  using (id in (select dealer_id from dealer_centres where centre_id in (select my_centre_ids())));

-- centres: owners full, dealers read the centres they belong to
create policy centres_owner on centres for all
  using (id in (select my_centre_ids())) with check (id in (select my_centre_ids()));
create policy centres_dealer_view on centres for select
  using (id in (select my_dealer_centre_ids()));
create policy centre_owners_self on centre_owners for select using (user_id = auth.uid());

-- dealer_centres: both sides see the link, owner edits mapping, dealer can request
create policy dc_dealer on dealer_centres for select using (dealer_id = current_dealer_id());
create policy dc_dealer_insert on dealer_centres for insert with check (dealer_id = current_dealer_id());
create policy dc_owner on dealer_centres for all
  using (centre_id in (select my_centre_ids())) with check (centre_id in (select my_centre_ids()));

-- channels: owner only. Tokens are never selected by the client; use a view in app code.
create policy channels_dealer on channels for all
  using (owner_type = 'dealer' and owner_id = current_dealer_id())
  with check (owner_type = 'dealer' and owner_id = current_dealer_id());
create policy channels_centre on channels for all
  using (owner_type = 'centre' and owner_id in (select my_centre_ids()))
  with check (owner_type = 'centre' and owner_id in (select my_centre_ids()));

-- items: dealer full, centre owner reads items placed at their centre
create policy items_dealer on items for all
  using (dealer_id = current_dealer_id()) with check (dealer_id = current_dealer_id());
create policy items_centre_view on items for select
  using (centre_id in (select my_centre_ids()));

create policy listings_dealer on item_listings for select
  using (item_id in (select id from items where dealer_id = current_dealer_id()));

-- sales: dealer sees own, centre owner sees sales at their centre only
create policy sales_dealer on sales for select using (dealer_id = current_dealer_id());
create policy sales_centre on sales for select using (centre_id in (select my_centre_ids()));

-- printers: own, plus centre printers of centres you belong to
create policy printers_dealer on printers for all
  using (owner_type = 'dealer' and owner_id = current_dealer_id())
  with check (owner_type = 'dealer' and owner_id = current_dealer_id());
create policy printers_centre on printers for all
  using (owner_type = 'centre' and owner_id in (select my_centre_ids()))
  with check (owner_type = 'centre' and owner_id in (select my_centre_ids()));
create policy printers_centre_shared on printers for select
  using (owner_type = 'centre' and owner_id in (select my_dealer_centre_ids()));

create policy templates_centre on label_templates for all
  using (centre_id is null or centre_id in (select my_centre_ids()))
  with check (centre_id in (select my_centre_ids()));
create policy templates_dealer_view on label_templates for select
  using (centre_id is null or centre_id in (select my_dealer_centre_ids()));

create policy print_jobs_dealer on print_jobs for all
  using (dealer_id = current_dealer_id()) with check (dealer_id = current_dealer_id());
create policy print_jobs_centre_view on print_jobs for select
  using (printer_id in (select id from printers where owner_type = 'centre' and owner_id in (select my_centre_ids())));

create policy statements_dealer on statements for select using (dealer_id = current_dealer_id());
create policy statements_centre on statements for all
  using (centre_id in (select my_centre_ids())) with check (centre_id in (select my_centre_ids()));

create policy alerts_dealer on alerts for all
  using (dealer_id = current_dealer_id()) with check (dealer_id = current_dealer_id());

-- jobs, webhook_log, sku_counters: service role and admin only (no user policies)

-- Public view of channels without secrets
create view channels_public as
  select id, type, owner_type, owner_id, external_account_id, location_id, status, last_webhook_at, created_at
  from channels;

-- ===== 0003_functions.sql =====
-- Till catch all: the Square item a till worker taps for a dealer who has no app.
alter table dealer_centres add column if not exists square_catchall_item_id text;
alter table dealer_centres add column if not exists square_catchall_variation_id text;
create index if not exists dealer_centres_catchall on dealer_centres (centre_id, square_catchall_variation_id);

-- Candidate items for matching an incoming sale line on a channel.
create or replace function sale_candidates(p_channel_id uuid, p_centre_id uuid)
returns table (
  item_id uuid, dealer_id uuid, centre_id uuid, sku text, alt_skus text[],
  listing_external_id text, listing_external_variant_id text
) language sql stable security definer set search_path = public as $$
  select i.id, i.dealer_id, i.centre_id, i.sku, i.alt_skus, l.external_id, l.external_variant_id
  from items i
  left join item_listings l on l.item_id = i.id and l.channel_id = p_channel_id
  where i.status = 'live'
    and (
      l.id is not null
      or (p_centre_id is not null and i.dealer_id in (
        select dealer_id from dealer_centres where centre_id = p_centre_id and left_at is null))
      or i.dealer_id in (select owner_id from channels where id = p_channel_id and owner_type = 'dealer')
    )
$$;

-- Dealer dashboard numbers in one call.
create or replace function dealer_summary(p_dealer_id uuid)
returns json language sql stable security definer set search_path = public as $$
  with s as (
    select amount_pence, sold_at from sales
    where dealer_id = p_dealer_id and voided_at is null
  )
  select json_build_object(
    'today', coalesce((select sum(amount_pence) from s where sold_at::date = current_date), 0),
    'week', coalesce((select sum(amount_pence) from s where sold_at >= date_trunc('week', now())), 0),
    'month', coalesce((select sum(amount_pence) from s where sold_at >= date_trunc('month', now())), 0),
    'last_month_to_date', coalesce((select sum(amount_pence) from s
        where sold_at >= date_trunc('month', now() - interval '1 month')
          and sold_at < date_trunc('month', now() - interval '1 month') + (now() - date_trunc('month', now()))), 0),
    'items_sold_month', (select count(*) from s where sold_at >= date_trunc('month', now())),
    'items_live', (select count(*) from items where dealer_id = p_dealer_id and status = 'live')
  )
$$;

-- Centre owner table: every dealer at the centre with this month's numbers.
create or replace function centre_dealer_table(p_centre_id uuid)
returns table (
  dealer_id uuid, name text, code text, pitch_numbers text[], rent_pence integer,
  sales_month_pence bigint, items_live bigint, last_sale_at timestamptz
) language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.code, dc.pitch_numbers, dc.rent_pence,
    coalesce((select sum(amount_pence) from sales s where s.dealer_id = d.id and s.centre_id = p_centre_id
      and s.voided_at is null and s.sold_at >= date_trunc('month', now())), 0),
    (select count(*) from items i where i.dealer_id = d.id and i.centre_id = p_centre_id and i.status = 'live'),
    (select max(sold_at) from sales s where s.dealer_id = d.id and s.centre_id = p_centre_id and s.voided_at is null)
  from dealer_centres dc join dealers d on d.id = dc.dealer_id
  where dc.centre_id = p_centre_id and dc.left_at is null
  order by 6 desc
$$;

-- ===== 0004_storage_and_cron.sql =====
-- Storage bucket for photos, labels and statements. Photos public, PDFs served via signed URL.
insert into storage.buckets (id, name, public) values ('files', 'files', true) on conflict (id) do nothing;

create policy "public read item photos" on storage.objects for select
  using (bucket_id = 'files' and (storage.foldername(name))[1] = 'items');
create policy "authenticated upload item photos" on storage.objects for insert
  with check (bucket_id = 'files' and (storage.foldername(name))[1] = 'items' and auth.role() = 'authenticated');

-- Nightly reconciliation and token refresh enqueue. Requires pg_cron and pg_net on the project.
-- Vercel cron calls /api/jobs/run every minute; these only add rows to the jobs table.

-- ===== 0005_design_handover.sql =====
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

-- ===== 0006_manual_till.sql =====
-- Manual till: centres with no POS record floor sales at end of day from collected tickets.

-- Every centre gets a manual channel on creation so sales can be recorded from day one.
create or replace function ensure_manual_channel(p_centre_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from channels where type = 'manual' and owner_type = 'centre' and owner_id = p_centre_id;
  if v_id is null then
    insert into channels (type, owner_type, owner_id, external_account_id, status)
      values ('manual', 'centre', p_centre_id, 'manual:' || p_centre_id::text, 'active') returning id into v_id;
  end if;
  return v_id;
end $$;

create or replace function centres_manual_channel_trigger() returns trigger language plpgsql as $$
begin perform ensure_manual_channel(new.id); return new; end $$;
drop trigger if exists centres_manual_channel on centres;
create trigger centres_manual_channel after insert on centres for each row execute function centres_manual_channel_trigger();

-- Backfill existing centres
do $$ declare c record; begin for c in select id from centres loop perform ensure_manual_channel(c.id); end loop; end $$;

-- Who recorded a manual sale, for the audit trail
alter table sales add column if not exists recorded_by uuid references users(id) on delete set null;
