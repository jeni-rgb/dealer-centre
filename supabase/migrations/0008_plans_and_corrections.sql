-- Plans are by items sold per month, not stock held. Centres pay £299 a month.
alter table dealers add column if not exists monthly_sold_limit integer not null default 25;
alter table centres add column if not exists plan text not null default 'trial';
alter table centres add column if not exists stripe_customer_id text unique;
alter table centres add column if not exists stripe_subscription_id text unique;
alter table centres add column if not exists trial_ends_at timestamptz;

-- Sales can be corrected (price actually paid) by the dealer or the centre. Keep an audit trail.
alter table sales add column if not exists corrected_at timestamptz;
alter table sales add column if not exists corrected_by uuid references users(id) on delete set null;
alter table sales add column if not exists original_amount_pence integer;

-- Dealers may record a sale themselves (mark as sold) through their own manual channel.
create or replace function ensure_dealer_manual_channel(p_dealer_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from channels where type = 'manual' and owner_type = 'dealer' and owner_id = p_dealer_id;
  if v_id is null then
    insert into channels (type, owner_type, owner_id, external_account_id, status)
      values ('manual', 'dealer', p_dealer_id, 'manual:dealer:' || p_dealer_id::text, 'active') returning id into v_id;
  end if;
  return v_id;
end $$;

-- Dealers can update the amount on their own sales (RLS)
drop policy if exists sales_dealer_update on sales;
create policy sales_dealer_update on sales for update using (dealer_id = current_dealer_id()) with check (dealer_id = current_dealer_id());
drop policy if exists sales_centre_update on sales;
create policy sales_centre_update on sales for update using (centre_id in (select my_centre_ids())) with check (centre_id in (select my_centre_ids()));
