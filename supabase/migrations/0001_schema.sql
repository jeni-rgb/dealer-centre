-- Dealer Centre schema. Money is integer pence. All external ids are text.
create extension if not exists "pgcrypto";

create type user_role as enum ('platform_admin', 'centre_owner', 'dealer', 'dealer_staff');
create type channel_type as enum ('square', 'shopify');
create type owner_type as enum ('dealer', 'centre');
create type item_status as enum ('draft', 'live', 'sold', 'withdrawn');
create type listing_status as enum ('pending', 'live', 'closed', 'failed');
create type print_status as enum ('queued', 'ready', 'sent', 'printed', 'failed');
create type job_status as enum ('queued', 'running', 'done', 'failed', 'dead');
create type dealer_plan as enum ('trial', 'pro', 'lapsed', 'cancelled');

create table dealers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique check (code ~ '^[A-Z][A-Z0-9]{1,3}$'),
  code_locked boolean not null default false,
  plan dealer_plan not null default 'trial',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  trial_ends_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table centres (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  commission_bps integer not null default 1000,
  rent_day integer not null default 1 check (rent_day between 1 and 28),
  statement_day integer not null default 1 check (statement_day between 1 and 28),
  till_pin_hash text,
  label_template_id uuid,
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6)),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role user_role not null default 'dealer',
  is_platform_admin boolean not null default false,
  dealer_id uuid references dealers(id) on delete set null,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table centre_owners (
  user_id uuid not null references users(id) on delete cascade,
  centre_id uuid not null references centres(id) on delete cascade,
  primary key (user_id, centre_id)
);

create table dealer_centres (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references dealers(id) on delete cascade,
  centre_id uuid not null references centres(id) on delete cascade,
  square_category_id text,
  pitch_numbers text[] not null default '{}',
  rent_pence integer not null default 0,
  status text not null default 'pending',
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  unique (dealer_id, centre_id)
);
create index on dealer_centres (centre_id, square_category_id);

create table channels (
  id uuid primary key default gen_random_uuid(),
  type channel_type not null,
  owner_type owner_type not null,
  owner_id uuid not null,
  external_account_id text not null,
  location_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'active',
  last_webhook_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (type, external_account_id)
);
create index on channels (owner_type, owner_id);

create table items (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references dealers(id) on delete cascade,
  centre_id uuid references centres(id) on delete set null,
  sku text not null unique,
  alt_skus text[] not null default '{}',
  title text not null,
  description text,
  price_pence integer not null check (price_pence >= 0),
  photos jsonb not null default '[]'::jsonb,
  status item_status not null default 'live',
  listed_at timestamptz not null default now(),
  sold_at timestamptz,
  price_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on items (dealer_id, status);
create index on items (centre_id, status);
create index on items using gin (alt_skus);

create table item_listings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  channel_id uuid not null references channels(id) on delete cascade,
  external_id text,
  external_variant_id text,
  status listing_status not null default 'pending',
  synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (item_id, channel_id)
);
create index on item_listings (channel_id, external_variant_id);

create table sales (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id) on delete set null,
  dealer_id uuid references dealers(id) on delete set null,
  centre_id uuid references centres(id) on delete set null,
  channel_id uuid not null references channels(id) on delete cascade,
  external_order_id text not null,
  external_line_id text,
  amount_pence integer not null,
  fees_pence integer not null default 0,
  payment_type text,
  ticket_no text,
  sold_at timestamptz not null,
  voided_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (channel_id, external_order_id, external_line_id)
);
create index on sales (dealer_id, sold_at desc);
create index on sales (centre_id, sold_at desc);

create table printers (
  id uuid primary key default gen_random_uuid(),
  owner_type owner_type not null,
  owner_id uuid not null,
  name text not null,
  provider text not null default 'browser',
  provider_id text,
  label_width_mm integer not null default 62,
  label_height_mm integer not null default 29,
  status text not null default 'ready',
  created_at timestamptz not null default now()
);
create index on printers (owner_type, owner_id);

create table label_templates (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid references centres(id) on delete cascade,
  name text not null,
  width_mm integer not null default 62,
  height_mm integer not null default 29,
  layout jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table print_jobs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  dealer_id uuid not null references dealers(id) on delete cascade,
  printer_id uuid references printers(id) on delete set null,
  batch_id uuid,
  status print_status not null default 'queued',
  pdf_path text,
  provider_job_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on print_jobs (dealer_id, status);

create table statements (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references dealers(id) on delete cascade,
  centre_id uuid not null references centres(id) on delete cascade,
  period date not null,
  gross_pence integer not null default 0,
  commission_pence integer not null default 0,
  rent_pence integer not null default 0,
  net_pence integer not null default 0,
  pdf_path text,
  status text not null default 'draft',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (dealer_id, centre_id, period)
);

create table sku_counters (
  dealer_id uuid primary key references dealers(id) on delete cascade,
  next_number integer not null default 1
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  status job_status not null default 'queued',
  attempts integer not null default 0,
  next_run_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on jobs (status, next_run_at);

create table webhook_log (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references channels(id) on delete set null,
  source text not null,
  event_type text not null,
  external_event_id text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received',
  error text,
  payload jsonb,
  unique (source, external_event_id)
);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references dealers(id) on delete cascade,
  item_id uuid references items(id) on delete cascade,
  type text not null,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- SKU: dealer code + 4 digits, row locked so concurrent listings never collide.
create or replace function next_sku(p_dealer_id uuid)
returns text language plpgsql as $$
declare
  v_code text;
  v_n integer;
begin
  select code into v_code from dealers where id = p_dealer_id for update;
  if v_code is null then raise exception 'dealer not found'; end if;
  insert into sku_counters (dealer_id, next_number) values (p_dealer_id, 1)
    on conflict (dealer_id) do nothing;
  update sku_counters set next_number = next_number + 1
    where dealer_id = p_dealer_id returning next_number - 1 into v_n;
  update dealers set code_locked = true where id = p_dealer_id and code_locked = false;
  return v_code || lpad(v_n::text, 4, '0');
end $$;

-- updated_at trigger
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
do $$ declare t text;
begin
  foreach t in array array['dealers','centres','users','channels','items','print_jobs','jobs']
  loop execute format('create trigger %I_touch before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;
