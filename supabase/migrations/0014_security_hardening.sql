-- Security hardening after the 2 Nov 2026 audit. Every write from the app already goes through the server
-- (service role), so client roles become read-only almost everywhere, and sensitive columns are hidden.

-- 1. The column-safe items view ran as its owner and was readable by anon.
alter view items_centre_view set (security_invoker = true);
revoke all on items_centre_view from anon, public;
grant select on items_centre_view to authenticated;

-- 1b. cost_pence is private to the dealer and is only ever read by the server. Nobody with a session can select it.
revoke all on items from anon, authenticated;
grant select (id, dealer_id, centre_id, sku, alt_skus, title, description, price_pence, listed_price_pence, photos, status, listed_at, sold_at, price_source, on_own_shopify, on_centre_shopify, on_centre_ebay, created_at, updated_at) on items to authenticated;

-- 2. Users could promote themselves. No client writes to users at all; the server does it.
drop policy if exists users_self_update on users;
revoke update, insert, delete on users from anon, authenticated;

-- 3. Protected fields writable through RLS
drop policy if exists dealers_own on dealers;
create policy dealers_own on dealers for select using (id = current_dealer_id());
revoke insert, update, delete on dealers from anon, authenticated;

drop policy if exists items_dealer on items;
create policy items_dealer on items for select using (dealer_id = current_dealer_id());

drop policy if exists sales_dealer_update on sales;
drop policy if exists sales_centre_update on sales;
revoke insert, update, delete on sales from anon, authenticated;

drop policy if exists dc_dealer_insert on dealer_centres;
create policy dc_dealer_insert on dealer_centres for insert
  with check (dealer_id = current_dealer_id() and status = 'pending' and left_at is null);

-- channels: tokens never leave the server
drop policy if exists channels_dealer on channels;
drop policy if exists channels_centre on channels;
create policy channels_dealer on channels for select using (owner_type = 'dealer' and owner_id = current_dealer_id());
create policy channels_centre on channels for select using (owner_type = 'centre' and owner_id in (select my_centre_ids()));
revoke all on channels from anon, authenticated;
grant select (id, type, owner_type, owner_id, external_account_id, location_id, status, last_webhook_at, created_at, updated_at) on channels to authenticated;

-- 5. Definer functions: guard them inside, so a caller can only ask about their own things
create or replace function dealer_summary(p_dealer_id uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  if not (p_dealer_id = current_dealer_id() or is_platform_admin() or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'not your dealer' using errcode = '42501';
  end if;
  select json_build_object(
    'today', coalesce((select sum(amount_pence) from sales where dealer_id = p_dealer_id and voided_at is null and sold_at >= date_trunc('day', now())), 0),
    'week', coalesce((select sum(amount_pence) from sales where dealer_id = p_dealer_id and voided_at is null and sold_at >= date_trunc('week', now())), 0),
    'month', coalesce((select sum(amount_pence) from sales where dealer_id = p_dealer_id and voided_at is null and sold_at >= date_trunc('month', now())), 0),
    'last_month_to_date', coalesce((select sum(amount_pence) from sales where dealer_id = p_dealer_id and voided_at is null
        and sold_at >= date_trunc('month', now() - interval '1 month') and sold_at < date_trunc('month', now() - interval '1 month') + (now() - date_trunc('month', now()))), 0),
    'items_sold_month', (select count(*) from sales where dealer_id = p_dealer_id and voided_at is null and sold_at >= date_trunc('month', now())),
    'items_live', (select count(*) from items where dealer_id = p_dealer_id and status = 'live')
  ) into r;
  return r;
end $$;

drop function if exists centre_dealer_table(uuid);
create or replace function centre_dealer_table(p_centre_id uuid)
returns table (
  dealer_id uuid, name text, code text, pitch_numbers text[], rent_pence integer,
  sales_month_pence bigint, items_live bigint, last_sale_at timestamptz, placeholder boolean
) language plpgsql stable security definer set search_path = public as $$
begin
  if not (p_centre_id in (select my_centre_ids()) or is_platform_admin() or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'not your centre' using errcode = '42501';
  end if;
  return query
  select d.id, d.name, d.code, dc.pitch_numbers, dc.rent_pence,
    coalesce((select sum(s.amount_pence) from sales s where s.dealer_id = d.id and s.centre_id = p_centre_id
      and s.voided_at is null and s.sold_at >= date_trunc('month', now())), 0)::bigint,
    (select count(*) from items i where i.dealer_id = d.id and i.centre_id = p_centre_id and i.status = 'live'),
    (select max(s.sold_at) from sales s where s.dealer_id = d.id and s.centre_id = p_centre_id and s.voided_at is null),
    d.placeholder
  from dealer_centres dc join dealers d on d.id = dc.dealer_id
  where dc.centre_id = p_centre_id and dc.left_at is null and dc.status = 'active'
  order by 6 desc;
end $$;

revoke execute on function dealer_summary(uuid) from public, anon;
grant execute on function dealer_summary(uuid) to authenticated, service_role;
revoke execute on function centre_dealer_table(uuid) from public, anon;
grant execute on function centre_dealer_table(uuid) to authenticated, service_role;

-- server-only helpers
revoke execute on function sale_candidates(uuid, uuid) from public, anon, authenticated;
revoke execute on function ensure_manual_channel(uuid) from public, anon, authenticated;
revoke execute on function next_sku(uuid) from public, anon, authenticated;
grant execute on function sale_candidates(uuid, uuid), ensure_manual_channel(uuid), next_sku(uuid) to service_role;

-- unclaimed centres were readable row-wide by anyone, PIN hash included. Search goes through the server.
drop policy if exists centres_read_unclaimed on centres;

-- anon (no session) has no business reading any table
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;

-- 6. Till PIN attempts: lock a centre for 15 minutes after 10 failures, per source
create table if not exists till_attempts (
  centre_id uuid not null references centres(id) on delete cascade,
  source text not null,
  failures integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (centre_id, source)
);
alter table till_attempts enable row level security;
revoke all on till_attempts from anon, authenticated;
