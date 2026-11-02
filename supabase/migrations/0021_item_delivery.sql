-- How an item ships, chosen by the dealer when listing. Drives the delivery charge the buyer sees at checkout
-- (weight band on the Shopify product) and the parcel defaults at the packing bench.
--   small: Royal Mail small parcel  |  medium: Royal Mail medium parcel  |  large: courier parcel  |  furniture: collect or quote
alter table items add column if not exists delivery text not null default 'small' check (delivery in ('small', 'medium', 'large', 'furniture'));
-- items has a column level grant for sessions (0014); the new column must be in it or dealers cannot select *
grant select (delivery) on items to authenticated;
