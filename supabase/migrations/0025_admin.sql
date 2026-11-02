-- Operator tooling: an audit trail of admin actions, and a private note per centre and dealer.
create table if not exists admin_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id) on delete set null,
  target_type text not null,
  target_id uuid,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table admin_actions enable row level security;
revoke all on admin_actions from public, anon, authenticated;
create index if not exists admin_actions_target_idx on admin_actions (target_type, target_id, created_at desc);
alter table centres add column if not exists admin_note text;
alter table dealers add column if not exists admin_note text;
-- dealers has a column level grant for sessions? no (full select); centres full select. Nothing else to grant.
