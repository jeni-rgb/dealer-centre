-- Till PINs: never stored readable, and the hash lives in its own table that sessions cannot read.
-- Owners reset the PIN from Settings and see the new one exactly once.

create table if not exists centre_till_pins (
  centre_id uuid primary key references centres(id) on delete cascade,
  pin_hash text not null,
  updated_at timestamptz not null default now()
);
alter table centre_till_pins enable row level security;
revoke all on centre_till_pins from public, anon, authenticated;

-- carry existing hashes across, then drop both old columns
insert into centre_till_pins (centre_id, pin_hash)
select id, till_pin_hash from centres where till_pin_hash is not null
on conflict (centre_id) do nothing;

alter table centres drop column if exists till_pin_plain;
alter table centres drop column if exists till_pin_hash;
