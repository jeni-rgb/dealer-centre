-- How many of a stock line sit at each centre. A blank centre is Home.
create table if not exists item_places (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  centre_id uuid references centres(id) on delete cascade,
  qty integer not null default 0 check (qty >= 0)
);

create unique index if not exists item_places_centre on item_places (item_id, centre_id) where centre_id is not null;
create unique index if not exists item_places_home on item_places (item_id) where centre_id is null;

alter table print_jobs add column if not exists centre_id uuid references centres(id) on delete set null;
alter table print_jobs add column if not exists place_label text;

alter table item_places enable row level security;
revoke all on item_places from public, anon, authenticated;
