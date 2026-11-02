-- (separate file: a new enum value cannot be used in the same transaction it is added in)
create or replace function is_ops_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from users where id = auth.uid() and (role = 'ops_staff' or is_platform_admin))
$$;
revoke all on function is_ops_staff() from public, anon;
grant execute on function is_ops_staff() to authenticated, service_role;
