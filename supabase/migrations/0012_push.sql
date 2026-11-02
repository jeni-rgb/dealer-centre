-- Push notifications: one row per device or browser a dealer has turned them on in.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  dealer_id uuid references dealers(id) on delete cascade,
  kind text not null check (kind in ('web', 'ios', 'android')),
  endpoint text not null,            -- web: push endpoint URL; native: device token
  keys jsonb,                        -- web: {p256dh, auth}
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  failed_at timestamptz,
  unique (endpoint)
);
alter table push_subscriptions enable row level security;
create policy push_own on push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index on push_subscriptions (dealer_id);
