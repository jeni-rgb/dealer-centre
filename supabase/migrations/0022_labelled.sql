-- "Label generated" sits between postage applied and despatched, as in Click & Drop.
alter table fulfilments drop constraint if exists fulfilments_status_check;
alter table fulfilments add constraint fulfilments_status_check check (status in ('new', 'collected', 'at_unit', 'labelled', 'despatched', 'missing', 'refunded'));
alter table fulfilments add column if not exists labelled_at timestamptz;
