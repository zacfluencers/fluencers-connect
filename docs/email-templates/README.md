# Email templates (Supabase Auth)

These are the emails Supabase sends for **signup confirmation** and **password
reset**. They are NOT part of the app's code - they live in the Supabase
dashboard. The default Supabase versions are bare, text-light, single-link
emails, which strict Microsoft 365 tenants tend to quarantine. These
replacements are branded, have real body text, a proper footer with sender
identity + postal address, and a balanced text-to-link ratio - all of which
improve inbox placement.

## Ready to paste

Both files are finalised - sender identity, the Gateshead postal address, and
`jonathan@fluencersgroup.com` as the public contact are already in the footer
(matching the Terms and Privacy pages).

## How to apply

1. Supabase dashboard -> **Authentication** -> **Emails** (Email Templates).
2. Open the **Confirm signup** template.
   - Subject: `Confirm your email for Fluencers Connect`
   - Message body: paste the full contents of `confirm-signup.html`.
3. Open the **Reset password** template.
   - Subject: `Reset your Fluencers Connect password`
   - Message body: paste the full contents of `reset-password.html`.
4. Save each one.

These keep Supabase's default `{{ .ConfirmationURL }}` link, so the login flow
is unchanged - safe to apply and instantly reversible (paste the old default
back if needed).

## Next step (bigger deliverability win, test first)

The single biggest improvement is putting the confirmation/reset link on
`connect.fluencersgroup.com` instead of `*.supabase.co`, using the existing
`/auth/confirm` route (token_hash flow). That removes the sender/link domain
mismatch that Microsoft treats as a phishing signal. It changes the login
mechanism, so it must be tested with a real signup + reset before rollout - do
this deliberately, not as part of the content paste above.
