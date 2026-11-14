-- Labels are counted when they print. The first 25 are free. The rest stay owed until Admin bills them.
alter table dealers add column if not exists taster_choice text;

create table if not exists label_prints (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references dealers(id) on delete cascade,
  print_job_id uuid,
  copies integer not null check (copies > 0),
  source text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists label_prints_job on label_prints (print_job_id) where print_job_id is not null;
create index if not exists label_prints_dealer on label_prints (dealer_id);

alter table dealers add column if not exists full_labels_choice text;

create table if not exists label_bills (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references dealers(id) on delete cascade,
  copies integer not null check (copies > 0),
  amount_pence integer not null,
  vat_pence integer not null,
  stripe_invoice_id text,
  source text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists label_bills_dealer on label_bills (dealer_id, created_at desc);
create unique index if not exists label_bills_invoice on label_bills (stripe_invoice_id) where stripe_invoice_id is not null;
