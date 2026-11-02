-- Dealer Centre's own staff: runners and the shop manager. They see the orders desk and the run screen, nothing else.
alter type user_role add value if not exists 'ops_staff';
