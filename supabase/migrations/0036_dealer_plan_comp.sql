-- Mark free stores plan comp. The original enum had no comp, so the update failed.
alter type dealer_plan add value if not exists 'comp';
