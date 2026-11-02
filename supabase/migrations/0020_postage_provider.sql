-- Which carrier platform a label was bought through, and the reference it has there.
alter table fulfilments add column if not exists postage_provider text;   -- clickdrop | shiptheory
alter table fulfilments add column if not exists carrier_reference text;  -- Click & Drop order id or Shiptheory reference
