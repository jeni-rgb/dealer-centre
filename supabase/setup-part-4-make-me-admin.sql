-- Part 4: make Jeni the platform admin. Run AFTER you have signed in to the app once with this email.
update users set is_platform_admin = true, role = 'platform_admin' where email = 'thedealercentre@gmail.com';
-- If that says 0 rows, sign in at https://dealer-centre.vercel.app/signin first, then run it again.
