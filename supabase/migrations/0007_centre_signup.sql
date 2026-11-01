-- Centre sign up rewritten as a conversation. Extra columns the questions capture.
alter table centres add column if not exists charges_rent boolean not null default true;
alter table centres add column if not exists rent_frequency text not null default 'monthly';
alter table centres add column if not exists dealer_count integer;
alter table centres add column if not exists till text not null default 'ordinary';
-- The till PIN is generated for them and shown in Settings, so it is kept readable to the owner.
alter table centres add column if not exists till_pin_plain text;
