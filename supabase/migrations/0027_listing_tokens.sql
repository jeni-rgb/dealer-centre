-- Who lists the stock, and prepaid listing tokens (£1 plus VAT each).
-- listing_mode null: dealers already with us. Staff may list without tokens, and a running
-- self serve trial is held in the app so the card is not charged until staff start 5 days.
alter table dealers add column if not exists listing_mode text check (listing_mode in ('self', 'staff'));
alter table dealers add column if not exists listing_tokens integer not null default 0 check (listing_tokens >= 0);
alter table dealers add column if not exists listing_tokens_bought integer not null default 0 check (listing_tokens_bought >= 0);
alter table dealers add column if not exists card_added_at timestamptz;

create table if not exists listing_token_entries (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references dealers(id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('purchase', 'list')),
  stripe_session_id text unique,
  item_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists listing_token_entries_dealer_idx on listing_token_entries (dealer_id);
alter table listing_token_entries enable row level security;

create or replace function apply_listing_tokens(p_dealer_id uuid, p_delta integer, p_reason text, p_session text, p_item uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_balance integer;
begin
  if p_reason not in ('purchase', 'list') then
    raise exception 'bad token reason';
  end if;
  if p_session is not null and exists (select 1 from listing_token_entries where stripe_session_id = p_session) then
    select listing_tokens into v_balance from dealers where id = p_dealer_id;
    return v_balance;
  end if;
  insert into listing_token_entries (dealer_id, delta, reason, stripe_session_id, item_id)
    values (p_dealer_id, p_delta, p_reason, p_session, p_item);
  update dealers set
    listing_tokens = listing_tokens + p_delta,
    listing_tokens_bought = listing_tokens_bought + case when p_reason = 'purchase' then p_delta else 0 end
    where id = p_dealer_id
    returning listing_tokens into v_balance;
  return v_balance;
end $$;

revoke all on function apply_listing_tokens(uuid, integer, text, text, uuid) from public, anon, authenticated;

-- Keep claim in step with the new columns, and move the token ledger onto the kept row.
create or replace function claim_placeholder_dealer(p_user_id uuid, p_new_dealer_id uuid, p_placeholder_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_new dealers%rowtype;
begin
  if not exists (select 1 from users where id = p_user_id and dealer_id = p_new_dealer_id) then
    raise exception 'That dealer does not belong to this user';
  end if;
  select * into v_new from dealers where id = p_new_dealer_id;
  if not exists (select 1 from dealers where id = p_placeholder_id and placeholder) then
    raise exception 'That dealer has already been claimed';
  end if;
  update dealers set stripe_customer_id = null, stripe_subscription_id = null where id = p_new_dealer_id;
  update dealers set
    name = coalesce(nullif(v_new.name, ''), name),
    plan = v_new.plan, stripe_customer_id = v_new.stripe_customer_id, stripe_subscription_id = v_new.stripe_subscription_id,
    trial_ends_at = v_new.trial_ends_at, monthly_sold_limit = v_new.monthly_sold_limit,
    listing_mode = v_new.listing_mode, listing_tokens = v_new.listing_tokens, listing_tokens_bought = v_new.listing_tokens_bought,
    card_added_at = v_new.card_added_at,
    placeholder = false
  where id = p_placeholder_id;
  update listing_token_entries set dealer_id = p_placeholder_id where dealer_id = p_new_dealer_id;
  update items set dealer_id = p_placeholder_id where dealer_id = p_new_dealer_id;
  update sales set dealer_id = p_placeholder_id where dealer_id = p_new_dealer_id;
  update channels set owner_id = p_placeholder_id where owner_type = 'dealer' and owner_id = p_new_dealer_id;
  update printers set owner_id = p_placeholder_id where owner_type = 'dealer' and owner_id = p_new_dealer_id;
  delete from dealer_centres where dealer_id = p_new_dealer_id;
  update dealer_centres set status = 'pending' where dealer_id = p_placeholder_id;
  update users set dealer_id = p_placeholder_id where id = p_user_id;
  delete from dealers where id = p_new_dealer_id;
end $$;
revoke execute on function claim_placeholder_dealer(uuid, uuid, uuid) from public, anon, authenticated;
