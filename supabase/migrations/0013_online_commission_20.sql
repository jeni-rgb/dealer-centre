-- Online shop commission is 20% (was 27%). Existing centres move to the new rate; the column stays per centre.
alter table centres alter column online_commission_bps set default 2000;
update centres set online_commission_bps = 2000 where online_commission_bps = 2700;
