-- SumUp account connection, pulled transactions, and a handheld reader payment that has not been recorded yet.
create table if not exists sumup_connections (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('centre', 'dealer')),
  owner_id uuid not null,
  merchant_code text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  synced_at timestamptz,
  connected_at timestamptz not null default now(),
  unique (owner_type, owner_id)
);

create table if not exists sumup_transactions (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references sumup_connections(id) on delete cascade,
  sumup_id text not null,
  transaction_code text,
  amount_pence integer not null,
  currency text not null default 'GBP',
  paid_at timestamptz,
  description text,
  ticket text,
  match_status text not null default 'unmatched',
  sale_id uuid,
  raw jsonb,
  unique (connection_id, sumup_id)
);

create table if not exists reader_payments (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  dealer_id uuid not null,
  item_id uuid not null,
  amount_pence integer not null,
  reader text not null,
  status text not null default 'pending',
  reference text,
  created_at timestamptz not null default now()
);

alter table sumup_connections enable row level security;
alter table sumup_transactions enable row level security;
alter table reader_payments enable row level security;
revoke all on sumup_connections, sumup_transactions, reader_payments from public, anon, authenticated;
