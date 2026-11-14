-- Supplier invoices, and a quantity on each stock line. Existing items stay at 1.
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references dealers(id) on delete cascade,
  supplier text,
  file_path text,
  file_name text,
  created_at timestamptz not null default now()
);

alter table items add column if not exists qty integer not null default 1;
alter table items add column if not exists qty_start integer not null default 1;
alter table items add column if not exists invoice_id uuid references invoices(id) on delete set null;
alter table print_jobs add column if not exists copies integer not null default 1;

alter table invoices enable row level security;
revoke all on invoices from public, anon, authenticated;
