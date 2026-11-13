-- Basic / Full pricing and the 2 week taster. Existing rows stay billing_model null (legacy plans).
alter table dealers add column if not exists billing_model text;
alter table dealers add column if not exists taster_token text;
alter table dealers add column if not exists taster_accepted_at timestamptz;
alter table dealers add column if not exists taster_ends_at timestamptz;
alter table dealers add column if not exists taster_invite_sent_at timestamptz;
alter table dealers add column if not exists taster_ended_notified_at timestamptz;
create unique index if not exists dealers_taster_token_idx on dealers (taster_token) where taster_token is not null;

-- Free taster labels use the same ledger, with their own reason, and count as paid so the crew can label.
create or replace function apply_listing_tokens(p_dealer_id uuid, p_delta integer, p_reason text, p_session text, p_item uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_balance integer;
begin
  if p_reason not in ('purchase', 'list', 'taster') then
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
    listing_tokens_bought = listing_tokens_bought + case when p_reason in ('purchase', 'taster') then p_delta else 0 end
  where id = p_dealer_id
  returning listing_tokens into v_balance;
  return v_balance;
end $$;

revoke all on function apply_listing_tokens(uuid, integer, text, text, uuid) from public, anon, authenticated;
