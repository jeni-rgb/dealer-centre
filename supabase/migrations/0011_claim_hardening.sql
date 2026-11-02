-- Hardening for claim_placeholder_dealer: only the service role may call it, and the unique Stripe
-- columns are cleared on the throwaway row before they are copied across.
create or replace function claim_placeholder_dealer(p_user_id uuid, p_new_dealer_id uuid, p_placeholder_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_new dealers%rowtype;
begin
  -- Belt and braces even though execute is revoked below: the caller's user must own the new dealer row
  if not exists (select 1 from users where id = p_user_id and dealer_id = p_new_dealer_id) then
    raise exception 'That dealer does not belong to this user';
  end if;
  select * into v_new from dealers where id = p_new_dealer_id;
  if not exists (select 1 from dealers where id = p_placeholder_id and placeholder) then
    raise exception 'That dealer has already been claimed';
  end if;
  -- free the unique Stripe ids before copying them
  update dealers set stripe_customer_id = null, stripe_subscription_id = null where id = p_new_dealer_id;
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
  update dealer_centres set status = 'pending' where dealer_id = p_placeholder_id;
  update users set dealer_id = p_placeholder_id where id = p_user_id;
  delete from dealers where id = p_new_dealer_id;
end $$;
revoke execute on function claim_placeholder_dealer(uuid, uuid, uuid) from public, anon, authenticated;

-- Same treatment for the other definer functions that only the server should call
revoke execute on function ensure_dealer_manual_channel(uuid) from public, anon, authenticated;
