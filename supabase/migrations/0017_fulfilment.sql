-- Online orders are collected, packed and posted by Dealer Centre. One row per online sale tracks where it is.
create table if not exists fulfilments (
  sale_id uuid primary key references sales(id) on delete cascade,
  centre_id uuid references centres(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'collected', 'packed', 'posted', 'missing')),
  collected_at timestamptz,
  packed_at timestamptz,
  posted_at timestamptz,
  carrier text,
  tracking text,
  note text,
  shopify_fulfilled boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table fulfilments enable row level security;
revoke all on fulfilments from public, anon;
revoke insert, update, delete on fulfilments from authenticated;
grant select on fulfilments to authenticated;
-- the centre sees where its orders are; dealers see their own; admin sees all; only the service role writes
create policy fulfilments_read on fulfilments for select using (
  is_platform_admin()
  or centre_id in (select my_centre_ids())
  or sale_id in (select id from sales where dealer_id = current_dealer_id())
);
create index if not exists fulfilments_status_idx on fulfilments (status, created_at);
