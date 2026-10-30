-- Manual till: centres with no POS record floor sales at end of day from collected tickets.
alter type channel_type add value if not exists 'manual';

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
