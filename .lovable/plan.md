# Update the notification sender email

## Change
- Change the active shared sender address from **visitor@resustainability.com** to **visitor@re.one** in Lovable Cloud.
- Keep the sender name **RESL-VMS**, SMTP login, password, server settings, email templates, design, and existing code and logic unchanged.
- Host approvals, visitor badge emails, password-reset emails, and other notifications using this shared configuration will use the new sender.

## Verification
- Read back the saved setting and confirm only the sender address changed.
- Send a test notification to a recipient you specify and check the received From address. The current SMTP login uses the old address; the mail provider must authorize **visitor@re.one** as a sender, or it may reject or rewrite the address. Do not change credentials automatically if that happens.

## Separate Linux production server
The configuration verified here is Lovable Cloud, not the separate server at **vms.resustainability.com**. Apply the same sender-only change through **Settings → SMTP** on that server if it also needs updating; its current settings and sender authorization remain unverified.

## Technical details
Update only `public.email_config.sender_email` on the confirmed active configuration row, guarded by its current address and active status. No source edits, redeployment, or server restart are needed for the Cloud setting.
