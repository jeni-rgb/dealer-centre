-- Optional dealer logo for labels, and which handheld card machine Own POS opens.
alter table dealers add column if not exists logo_path text;
alter table dealers add column if not exists card_machine text;
