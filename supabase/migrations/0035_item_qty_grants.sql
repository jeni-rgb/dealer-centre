-- 0014 replaced table-wide select on items with a column list. 0032 added qty,
-- qty_start and invoice_id without granting them, so a dealer Stock select failed
-- and the page came back empty. Granting the same columns again is safe.

grant select (qty, qty_start, invoice_id) on items to authenticated;

-- Stock and the item screen read place counts with the signed-in dealer.
-- Writes stay on the service role.
grant select on item_places to authenticated;
drop policy if exists item_places_dealer on item_places;
create policy item_places_dealer on item_places for select
  using (item_id in (select id from items where dealer_id = current_dealer_id()));

-- Supplier invoices belong to one dealer. Skip the policy if dealer_id is not there.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'invoices' and column_name = 'dealer_id'
  ) then
    grant select on invoices to authenticated;
    execute 'drop policy if exists invoices_dealer on invoices';
    execute 'create policy invoices_dealer on invoices for select using (dealer_id = current_dealer_id())';
  end if;
end $$;

-- Label counts and SumUp tokens are read with the service role.
-- These two tables were created without row security, so a signed-in session
-- must not be able to read every dealer's rows if a default grant exists.
alter table label_prints enable row level security;
alter table label_bills enable row level security;
revoke all on label_prints from public, anon, authenticated;
revoke all on label_bills from public, anon, authenticated;
