-- Items listed before a dealer was approved never carried the centre. Attach them now,
-- and only count approved dealers on the centre dashboard.

-- Backfill: every live item with no centre whose dealer is linked to exactly one centre
update items i set centre_id = dc.centre_id
from (
  select dealer_id, min(centre_id::text)::uuid as centre_id
  from dealer_centres where left_at is null and status in ('active', 'pending')
  group by dealer_id having count(*) = 1
) dc
where i.dealer_id = dc.dealer_id and i.centre_id is null and i.status = 'live';

-- Dashboard table: approved dealers only
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
  where dc.centre_id = p_centre_id and dc.left_at is null and dc.status = 'active'
  order by 6 desc
$$;
