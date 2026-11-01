# Branded sign in emails

Supabase sends the sign in link from noreply@mail.app.supabase.io until you give it your own sender. Two steps.

## 1. A sending domain in Resend (needs a domain you own)
1. Buy the domain if you have not, e.g. thedealercentre.com or dealercentre.co.uk.
2. resend.com > Domains > Add domain. Resend shows three DNS records (TXT, MX, CNAME). Add them where the domain is registered. Verification takes a few minutes to an hour.
3. Resend > API keys: you can reuse the key already in Vercel.

Until a domain is verified, Resend can only send to your own address, and Supabase cannot use it.

## 2. Tell Supabase to send through Resend
Supabase > Project Settings > Authentication > SMTP Settings > Enable custom SMTP:
- Sender email: hello@thedealercentre.com (any address at the verified domain)
- Sender name: Dealer Centre
- Host: smtp.resend.com
- Port: 465
- Username: resend
- Password: your Resend API key
Save.

## 3. The email itself
Supabase > Authentication > Email Templates > Magic Link.
- Subject: Your Dealer Centre sign in link
- Body: paste docs/email-templates/magic-link.html
Save. The {{ .ConfirmationURL }} tag must stay exactly as written.

Then set EMAIL_FROM in Vercel to `Dealer Centre <hello@thedealercentre.com>` so sale notifications come from the same address.
