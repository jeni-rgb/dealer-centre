-- RLS and privilege tests. Run against a database with every migration applied:
--   psql -v ON_ERROR_STOP=1 -f tests/rls.sql
-- Each block sets the role and JWT claims the way PostgREST does, then asserts what must FAIL or return nothing.
\set ON_ERROR_STOP on
begin;

-- Fixtures: two dealers (A, B), one centre owned by user C, A's item with a cost
insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-000000000001','a@x'), ('bbbbbbbb-0000-0000-0000-000000000002','b@x'), ('cccccccc-0000-0000-0000-000000000003','c@x') on conflict do nothing;
insert into users (id, email, role) values ('aaaaaaaa-0000-0000-0000-000000000001','a@x','dealer'), ('bbbbbbbb-0000-0000-0000-000000000002','b@x','dealer'), ('cccccccc-0000-0000-0000-000000000003','c@x','centre_owner');
insert into dealers (id, name, code) values ('dddddddd-0000-0000-0000-00000000000a','Dealer A','DA'), ('dddddddd-0000-0000-0000-00000000000b','Dealer B','DB');
update users set dealer_id = 'dddddddd-0000-0000-0000-00000000000a' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
update users set dealer_id = 'dddddddd-0000-0000-0000-00000000000b' where id = 'bbbbbbbb-0000-0000-0000-000000000002';
insert into centres (id, name, status) values ('cccccccc-0000-0000-0000-0000000000c1','Test Centre','active');
insert into centre_owners (user_id, centre_id) values ('cccccccc-0000-0000-0000-000000000003','cccccccc-0000-0000-0000-0000000000c1');
insert into dealer_centres (dealer_id, centre_id, status) values ('dddddddd-0000-0000-0000-00000000000a','cccccccc-0000-0000-0000-0000000000c1','active');
insert into items (id, dealer_id, centre_id, sku, title, price_pence, cost_pence, status) values ('11111111-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-00000000000a','cccccccc-0000-0000-0000-0000000000c1','DA0001','A vase',1250,400,'live');
insert into sales (item_id, dealer_id, centre_id, channel_id, external_order_id, external_line_id, amount_pence, sold_at) select '11111111-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-00000000000a','cccccccc-0000-0000-0000-0000000000c1', ensure_manual_channel('cccccccc-0000-0000-0000-0000000000c1'), 'o1','l1',1250,now();

create or replace function expect_fail(sql text, label text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then return; end;
  raise exception 'EXPECTED FAILURE but succeeded: %', label;
end $$;
create or replace function expect_rows(sql text, n int, label text) returns void language plpgsql as $$
declare c int; begin execute 'select count(*) from (' || sql || ') q' into c; if c <> n then raise exception '% expected % rows, got %', label, n, c; end if; end $$;

-- ===== anon: nothing
set local role anon;
select expect_fail('select * from items', 'anon reads items');
select expect_fail('select * from items_centre_view', 'anon reads items view');
select expect_fail('select * from sales', 'anon reads sales');
select expect_fail('select * from centres', 'anon reads centres');
select expect_fail('select * from centre_till_pins', 'anon reads till pins');
select expect_fail('select dealer_summary(''dddddddd-0000-0000-0000-00000000000a'')', 'anon calls dealer_summary');
reset role;

-- ===== dealer B against dealer A's data
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select expect_rows('select id from items where dealer_id = ''dddddddd-0000-0000-0000-00000000000a''', 0, 'B sees A items');
select expect_fail('select * from centre_till_pins', 'session reads till pins');
select expect_rows('select id from sales where dealer_id = ''dddddddd-0000-0000-0000-00000000000a''', 0, 'B sees A sales');
select expect_rows('select id from dealers where id = ''dddddddd-0000-0000-0000-00000000000a''', 0, 'B sees dealer A');
select expect_fail('select cost_pence from items', 'B selects cost_pence');
select expect_fail('update users set is_platform_admin = true where id = ''bbbbbbbb-0000-0000-0000-000000000002''', 'B promotes self');
select expect_fail('update users set role = ''centre_owner'' where id = ''bbbbbbbb-0000-0000-0000-000000000002''', 'B changes role');
select expect_fail('update dealers set plan = ''pro'', monthly_sold_limit = 100000 where id = ''dddddddd-0000-0000-0000-00000000000b''', 'B upgrades own plan');
select expect_fail('update items set status = ''sold'' where dealer_id = ''dddddddd-0000-0000-0000-00000000000b''', 'B writes items');
select expect_fail('update sales set amount_pence = 1 where dealer_id = ''dddddddd-0000-0000-0000-00000000000b''', 'B edits sales');
select expect_fail('select access_token from channels', 'B reads tokens');
select expect_fail('insert into channels (type, owner_type, owner_id, external_account_id) values (''manual'',''dealer'',''dddddddd-0000-0000-0000-00000000000b'',''x'')', 'B inserts channel');
select expect_fail('select dealer_summary(''dddddddd-0000-0000-0000-00000000000a'')', 'B calls A summary');
select expect_fail('select * from centre_dealer_table(''cccccccc-0000-0000-0000-0000000000c1'')', 'B calls centre table');
select expect_fail('select * from sale_candidates(null, ''cccccccc-0000-0000-0000-0000000000c1'')', 'B calls sale_candidates');
select expect_fail('insert into dealer_centres (dealer_id, centre_id, status) values (''dddddddd-0000-0000-0000-00000000000b'',''cccccccc-0000-0000-0000-0000000000c1'',''active'')', 'B self-approves join');
-- what B may do: ask to join as pending
insert into dealer_centres (dealer_id, centre_id, status) values ('dddddddd-0000-0000-0000-00000000000b','cccccccc-0000-0000-0000-0000000000c1','pending');
reset role;

-- ===== dealer A sees own things, still no cost
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select expect_rows('select id from items where dealer_id = ''dddddddd-0000-0000-0000-00000000000a''', 1, 'A sees own item');
select expect_rows('select id from sales where dealer_id = ''dddddddd-0000-0000-0000-00000000000a''', 1, 'A sees own sale');
select expect_fail('select cost_pence from items', 'A selects cost_pence via session');
select expect_rows('select dealer_summary(''dddddddd-0000-0000-0000-00000000000a'')', 1, 'A calls own summary');
reset role;

-- ===== centre owner C sees sales at their centre, cannot see cost or tokens, cannot touch another centre
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select expect_rows('select id from sales where centre_id = ''cccccccc-0000-0000-0000-0000000000c1''', 1, 'C sees centre sales');
select expect_rows('select id from items_centre_view where centre_id = ''cccccccc-0000-0000-0000-0000000000c1''', 1, 'C sees centre items via view');
select expect_fail('select cost_pence from items', 'C selects cost_pence');
select expect_rows('select * from centre_dealer_table(''cccccccc-0000-0000-0000-0000000000c1'')', 1, 'C calls own centre table');
select expect_fail('select * from centre_dealer_table(''cccccccc-0000-0000-0000-0000000000c2'')', 'C calls other centre table');
select expect_fail('update sales set amount_pence = 1 where centre_id = ''cccccccc-0000-0000-0000-0000000000c1''', 'C edits sales directly');
reset role;

select 'ALL RLS TESTS PASSED' as result;
rollback;
