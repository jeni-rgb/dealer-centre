-- Full desk: pitch size, weekly goal, and a private export link. Additive only.
alter table dealer_centres add column if not exists floor_target integer;
alter table dealers add column if not exists weekly_goal_pence integer;
alter table dealers add column if not exists export_token text;
create unique index if not exists dealers_export_token_idx on dealers (export_token) where export_token is not null;
