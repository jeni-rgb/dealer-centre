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
