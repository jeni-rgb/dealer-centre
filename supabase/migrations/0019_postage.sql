-- Postage bought through the Royal Mail Click & Drop API (OBA). The label comes back paid; we keep it.
alter table fulfilments add column if not exists package_format text;        -- largeLetter, smallParcel, mediumParcel
alter table fulfilments add column if not exists weight_grams integer;
alter table fulfilments add column if not exists service_code text;          -- Click & Drop service code, e.g. TPS48
alter table fulfilments add column if not exists cd_order_identifier text;   -- Click & Drop order id
alter table fulfilments add column if not exists label_path text;            -- storage path of the label PDF
alter table fulfilments add column if not exists postage_pence integer;      -- what we paid, if known
alter table fulfilments add column if not exists despatch_note_no integer;
create sequence if not exists despatch_note_seq start 1001;
create or replace function next_despatch_note_no() returns integer language sql security definer set search_path = public as $$ select nextval('despatch_note_seq')::integer $$;
revoke all on function next_despatch_note_no() from public, anon, authenticated;
grant execute on function next_despatch_note_no() to service_role;
