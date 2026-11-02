-- Fulfilment flow: new -> collected -> at_unit -> despatched, plus missing and refunded.
-- Despatched and refunded come from Shopify (Click & Drop marks the order fulfilled; refunds come from the store).
alter table fulfilments drop constraint if exists fulfilments_status_check;
update fulfilments set status = 'at_unit' where status = 'packed';
update fulfilments set status = 'despatched' where status = 'posted';
alter table fulfilments add constraint fulfilments_status_check check (status in ('new', 'collected', 'at_unit', 'despatched', 'missing', 'refunded'));
alter table fulfilments rename column packed_at to at_unit_at;
alter table fulfilments rename column posted_at to despatched_at;
alter table fulfilments add column if not exists slip_printed_at timestamptz;
alter table fulfilments add column if not exists refunded_at timestamptz;
alter table fulfilments add column if not exists shopify_fulfillment_id text;
