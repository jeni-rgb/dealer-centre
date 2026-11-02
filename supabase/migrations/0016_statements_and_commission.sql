-- Month end: dealer statements worked out by one shared calculation, and Dealer Centre's 15% of online sales
-- collected through Stripe as an invoice item on the centre's subscription. eBay is gone. Handling fee is gone.

-- 1. eBay removed
alter table items drop column if exists on_centre_ebay;
alter table dealers drop column if exists default_centre_ebay;

-- 2. Online commission is fixed: 20% of the sale, 15% Dealer Centre, 5% the centre. The handling fee was never
--    deducted anywhere, so it goes rather than being half finished.
update centres set online_commission_bps = 2000, centre_online_share_bps = 500;
alter table centres alter column online_commission_bps set default 2000;
alter table centres alter column centre_online_share_bps set default 500;
alter table centres drop column if exists handling_fee_pence;
alter table centres drop column if exists shop_fee_pence;

-- 3. Statements carry the split so the PDF, the dealer's view and the centre's view all read the same row
alter table statements add column if not exists floor_gross_pence integer not null default 0;
alter table statements add column if not exists online_gross_pence integer not null default 0;
alter table statements add column if not exists floor_commission_pence integer not null default 0;
alter table statements add column if not exists online_commission_pence integer not null default 0;
alter table statements add column if not exists sales_count integer not null default 0;
alter table statements add column if not exists issued_at timestamptz;
-- sessions read their own statements; only the service role writes them (the centre marks paid through the API)
drop policy if exists statements_centre on statements;
create policy statements_centre on statements for select using (centre_id in (select my_centre_ids()));
revoke insert, update, delete on statements from anon, authenticated;

-- 4. Dealer Centre's monthly commission per centre
create table if not exists centre_commissions (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references centres(id) on delete cascade,
  period date not null,                       -- first day of the month
  online_gross_pence integer not null default 0,
  platform_bps integer not null default 1500, -- Dealer Centre's share of online sales
  centre_bps integer not null default 500,    -- the centre's share
  platform_pence integer not null default 0,  -- 15%, before VAT
  vat_pence integer not null default 0,
  centre_pence integer not null default 0,    -- 5%, stays with the centre
  stripe_invoice_item_id text unique,
  charged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (centre_id, period)
);
alter table centre_commissions enable row level security;
revoke all on centre_commissions from public, anon;
revoke insert, update, delete on centre_commissions from authenticated;
grant select on centre_commissions to authenticated;
create policy centre_commissions_centre on centre_commissions for select using (centre_id in (select my_centre_ids()) or is_platform_admin());
