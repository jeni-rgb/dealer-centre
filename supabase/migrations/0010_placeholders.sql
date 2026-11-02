-- Phase 1 and 2 of the ladder.
-- Dealers can add a centre that is not on Dealer Centre yet (status 'unclaimed'); the owner claims it at sign up.
-- Centres can add dealers who have no app yet (placeholder = true); the dealer claims their row at sign up.

alter table centres add column if not exists created_by_dealer_id uuid references dealers(id) on delete set null;
alter table dealers add column if not exists placeholder boolean not null default false;
alter table dealers add column if not exists created_by_centre_id uuid references centres(id) on delete set null;
alter table dealers add column if not exists contact_email text;

-- Dealer codes were unique across the whole platform. With sixty placeholders per centre that cannot hold:
-- two centres will both have an "RM". Codes are now unique per centre (enforced below), and a dealer's
-- tickets are always read in the context of a centre, so nothing else changes.
alter table dealers drop constraint if exists dealers_code_key;

create or replace function check_dealer_code_unique_in_centre() returns trigger
language plpgsql as $$
declare v_code text; v_clash int;
begin
  select code into v_code from dealers where id = new.dealer_id;
  select count(*) into v_clash
  from dealer_centres dc join dealers d on d.id = dc.dealer_id
  where dc.centre_id = new.centre_id and dc.left_at is null and dc.dealer_id <> new.dealer_id and d.code = v_code;
  if v_clash > 0 then
    raise exception 'Dealer code % is already used at this centre', v_code using errcode = '23505';
  end if;
  return new;
end $$;
drop trigger if exists dealer_centres_code_unique on dealer_centres;
create trigger dealer_centres_code_unique before insert or update of dealer_id, centre_id on dealer_centres
  for each row execute function check_dealer_code_unique_in_centre();

-- Unclaimed centres are visible to dealers searching, so they can join them
drop policy if exists centres_read_unclaimed on centres;
create policy centres_read_unclaimed on centres for select using (status = 'unclaimed');

-- Dashboard table: include placeholders (they have tickets on the floor) and say which they are
drop function if exists centre_dealer_table(uuid);
create or replace function centre_dealer_table(p_centre_id uuid)
returns table (
  dealer_id uuid, name text, code text, pitch_numbers text[], rent_pence integer,
  sales_month_pence bigint, items_live bigint, last_sale_at timestamptz, placeholder boolean
) language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.code, dc.pitch_numbers, dc.rent_pence,
    coalesce((select sum(amount_pence) from sales s where s.dealer_id = d.id and s.centre_id = p_centre_id
      and s.voided_at is null and s.sold_at >= date_trunc('month', now())), 0),
    (select count(*) from items i where i.dealer_id = d.id and i.centre_id = p_centre_id and i.status = 'live'),
    (select max(sold_at) from sales s where s.dealer_id = d.id and s.centre_id = p_centre_id and s.voided_at is null),
    d.placeholder
  from dealer_centres dc join dealers d on d.id = dc.dealer_id
  where dc.centre_id = p_centre_id and dc.left_at is null and dc.status = 'active'
  order by 6 desc
$$;

-- Claim a placeholder dealer: the signing up dealer's fresh row is folded into the placeholder,
-- so the code on the floor tickets is kept and every sale already recorded is theirs.
create or replace function claim_placeholder_dealer(p_user_id uuid, p_new_dealer_id uuid, p_placeholder_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_new dealers%rowtype;
begin
  select * into v_new from dealers where id = p_new_dealer_id;
  if not exists (select 1 from dealers where id = p_placeholder_id and placeholder) then
    raise exception 'That dealer has already been claimed';
  end if;
  update dealers set
    name = coalesce(nullif(v_new.name, ''), name),
    plan = v_new.plan, stripe_customer_id = v_new.stripe_customer_id, stripe_subscription_id = v_new.stripe_subscription_id,
    trial_ends_at = v_new.trial_ends_at, monthly_sold_limit = v_new.monthly_sold_limit,
    placeholder = false
  where id = p_placeholder_id;
  update items set dealer_id = p_placeholder_id where dealer_id = p_new_dealer_id;
  update sales set dealer_id = p_placeholder_id where dealer_id = p_new_dealer_id;
  update channels set owner_id = p_placeholder_id where owner_type = 'dealer' and owner_id = p_new_dealer_id;
  update printers set owner_id = p_placeholder_id where owner_type = 'dealer' and owner_id = p_new_dealer_id;
  delete from dealer_centres where dealer_id = p_new_dealer_id;
  -- the centre confirms it is really them
  update dealer_centres set status = 'pending' where dealer_id = p_placeholder_id;
  update users set dealer_id = p_placeholder_id where id = p_user_id;
  delete from dealers where id = p_new_dealer_id;
end $$;
