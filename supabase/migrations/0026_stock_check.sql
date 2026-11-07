-- Stock check: walk the floor with a scanner (or a phone camera), scan every ticket, then compare what was
-- scanned against what the system says should be there. New tables only; nothing existing changes.

create table if not exists stock_checks (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references centres(id) on delete cascade,
  dealer_id uuid references dealers(id) on delete cascade,      -- null: the whole centre; set: one dealer's pitch
  started_by uuid references users(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'open' check (status in ('open', 'done')),
  note text
);
create index if not exists stock_checks_centre_idx on stock_checks (centre_id, started_at desc);
create index if not exists stock_checks_dealer_idx on stock_checks (dealer_id, started_at desc);

-- Every scan as it happened, including repeats and tickets the system does not know.
create table if not exists stock_check_scans (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references stock_checks(id) on delete cascade,
  raw text not null,
  item_id uuid references items(id) on delete set null,
  outcome text not null,   -- found, sold, withdrawn, other_dealer, other_centre, unknown, repeat
  scanned_at timestamptz not null default now()
);
create index if not exists stock_check_scans_check_idx on stock_check_scans (check_id, scanned_at);

-- The result, written when the check is finished: one line per item that matters.
create table if not exists stock_check_lines (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references stock_checks(id) on delete cascade,
  item_id uuid references items(id) on delete set null,
  raw text,                -- the scanned text, for tickets the system does not know
  outcome text not null check (outcome in ('found', 'missing', 'sold_on_shelf', 'withdrawn_on_shelf', 'not_on_system', 'wrong_place')),
  resolution text check (resolution in ('found_later', 'sold_unrecorded', 'stolen', 'moved', 'corrected', 'other')),
  resolved_by uuid references users(id) on delete set null,
  resolved_at timestamptz,
  price_pence integer,     -- the asking price at the time, so losses can be valued
  unique (check_id, item_id, outcome)
);
create index if not exists stock_check_lines_check_idx on stock_check_lines (check_id, outcome);

-- Only the server (service role) reads and writes these; pages and routes check who may see each check.
alter table stock_checks enable row level security;
alter table stock_check_scans enable row level security;
alter table stock_check_lines enable row level security;
revoke all on stock_checks, stock_check_scans, stock_check_lines from public, anon, authenticated;
