-- Demo seed. Run after the migrations, after you have signed in once with each email so auth.users rows exist.
-- Replace the two emails below.
do $$
declare
  v_centre uuid; v_dealer uuid; v_owner uuid; v_dealer_user uuid;
begin
  select id into v_owner from auth.users where email = 'OWNER_EMAIL';
  select id into v_dealer_user from auth.users where email = 'DEALER_EMAIL';

  insert into centres (name, address, commission_bps, rent_day, statement_day, invite_code)
    values ('Looses Emporium', '23 to 25 Magdalen Street, Norwich', 1000, 1, 1, 'LOOSES') returning id into v_centre;
  update centres set till_pin_hash = encode(digest(v_centre::text || ':1234', 'sha256'), 'hex') where id = v_centre;

  insert into dealers (name, code, plan, trial_ends_at) values ('Bloom Antiques', 'B14', 'trial', now() + interval '30 days') returning id into v_dealer;
  insert into dealer_centres (dealer_id, centre_id, pitch_numbers, rent_pence, status, joined_at)
    values (v_dealer, v_centre, '{12,14,15}', 39000, 'active', now());

  if v_owner is not null then
    insert into users (id, email, role) values (v_owner, 'OWNER_EMAIL', 'centre_owner') on conflict (id) do update set role = 'centre_owner';
    insert into centre_owners (user_id, centre_id) values (v_owner, v_centre);
  end if;
  if v_dealer_user is not null then
    insert into users (id, email, role, dealer_id) values (v_dealer_user, 'DEALER_EMAIL', 'dealer', v_dealer)
      on conflict (id) do update set role = 'dealer', dealer_id = v_dealer;
  end if;

  insert into printers (owner_type, owner_id, name, provider) values ('centre', v_centre, 'Till printer', 'browser');
end $$;
