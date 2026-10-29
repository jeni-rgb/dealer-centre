-- Row level security. Tenancy is enforced here, not in app code.
-- Helper functions read the calling user's row once per statement.

create or replace function current_dealer_id() returns uuid
language sql stable security definer set search_path = public as $$
  select dealer_id from users where id = auth.uid()
$$;

create or replace function is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_platform_admin from users where id = auth.uid()), false)
$$;

create or replace function my_centre_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select centre_id from centre_owners where user_id = auth.uid()
$$;

create or replace function my_dealer_centre_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select centre_id from dealer_centres where dealer_id = current_dealer_id() and left_at is null
$$;

alter table users enable row level security;
alter table dealers enable row level security;
alter table centres enable row level security;
alter table centre_owners enable row level security;
alter table dealer_centres enable row level security;
alter table channels enable row level security;
alter table items enable row level security;
alter table item_listings enable row level security;
alter table sales enable row level security;
alter table printers enable row level security;
alter table label_templates enable row level security;
alter table print_jobs enable row level security;
alter table statements enable row level security;
alter table sku_counters enable row level security;
alter table jobs enable row level security;
alter table webhook_log enable row level security;
alter table alerts enable row level security;

-- Platform admin bypass on every table
do $$ declare t text;
begin
  foreach t in array array['users','dealers','centres','centre_owners','dealer_centres','channels','items',
    'item_listings','sales','printers','label_templates','print_jobs','statements','sku_counters','jobs','webhook_log','alerts']
  loop execute format('create policy %I_admin on %I for all using (is_platform_admin()) with check (is_platform_admin())', t, t);
  end loop;
end $$;

-- users: see and edit self
create policy users_self on users for select using (id = auth.uid());
create policy users_self_update on users for update using (id = auth.uid());

-- dealers: own row, or dealers linked to a centre you own
create policy dealers_own on dealers for all
  using (id = current_dealer_id()) with check (id = current_dealer_id());
create policy dealers_centre_view on dealers for select
  using (id in (select dealer_id from dealer_centres where centre_id in (select my_centre_ids())));

-- centres: owners full, dealers read the centres they belong to
create policy centres_owner on centres for all
  using (id in (select my_centre_ids())) with check (id in (select my_centre_ids()));
create policy centres_dealer_view on centres for select
  using (id in (select my_dealer_centre_ids()));
create policy centre_owners_self on centre_owners for select using (user_id = auth.uid());

-- dealer_centres: both sides see the link, owner edits mapping, dealer can request
create policy dc_dealer on dealer_centres for select using (dealer_id = current_dealer_id());
create policy dc_dealer_insert on dealer_centres for insert with check (dealer_id = current_dealer_id());
create policy dc_owner on dealer_centres for all
  using (centre_id in (select my_centre_ids())) with check (centre_id in (select my_centre_ids()));

-- channels: owner only. Tokens are never selected by the client; use a view in app code.
create policy channels_dealer on channels for all
  using (owner_type = 'dealer' and owner_id = current_dealer_id())
  with check (owner_type = 'dealer' and owner_id = current_dealer_id());
create policy channels_centre on channels for all
  using (owner_type = 'centre' and owner_id in (select my_centre_ids()))
  with check (owner_type = 'centre' and owner_id in (select my_centre_ids()));

-- items: dealer full, centre owner reads items placed at their centre
create policy items_dealer on items for all
  using (dealer_id = current_dealer_id()) with check (dealer_id = current_dealer_id());
create policy items_centre_view on items for select
  using (centre_id in (select my_centre_ids()));

create policy listings_dealer on item_listings for select
  using (item_id in (select id from items where dealer_id = current_dealer_id()));

-- sales: dealer sees own, centre owner sees sales at their centre only
create policy sales_dealer on sales for select using (dealer_id = current_dealer_id());
create policy sales_centre on sales for select using (centre_id in (select my_centre_ids()));

-- printers: own, plus centre printers of centres you belong to
create policy printers_dealer on printers for all
  using (owner_type = 'dealer' and owner_id = current_dealer_id())
  with check (owner_type = 'dealer' and owner_id = current_dealer_id());
create policy printers_centre on printers for all
  using (owner_type = 'centre' and owner_id in (select my_centre_ids()))
  with check (owner_type = 'centre' and owner_id in (select my_centre_ids()));
create policy printers_centre_shared on printers for select
  using (owner_type = 'centre' and owner_id in (select my_dealer_centre_ids()));

create policy templates_centre on label_templates for all
  using (centre_id is null or centre_id in (select my_centre_ids()))
  with check (centre_id in (select my_centre_ids()));
create policy templates_dealer_view on label_templates for select
  using (centre_id is null or centre_id in (select my_dealer_centre_ids()));

create policy print_jobs_dealer on print_jobs for all
  using (dealer_id = current_dealer_id()) with check (dealer_id = current_dealer_id());
create policy print_jobs_centre_view on print_jobs for select
  using (printer_id in (select id from printers where owner_type = 'centre' and owner_id in (select my_centre_ids())));

create policy statements_dealer on statements for select using (dealer_id = current_dealer_id());
create policy statements_centre on statements for all
  using (centre_id in (select my_centre_ids())) with check (centre_id in (select my_centre_ids()));

create policy alerts_dealer on alerts for all
  using (dealer_id = current_dealer_id()) with check (dealer_id = current_dealer_id());

-- jobs, webhook_log, sku_counters: service role and admin only (no user policies)

-- Public view of channels without secrets
create view channels_public as
  select id, type, owner_type, owner_id, external_account_id, location_id, status, last_webhook_at, created_at
  from channels;
