# Phase 1 Manual Test Checklist

- Login with a valid account and confirm dashboard loads.
- Signup with a test email and confirm the app handles email-confirmation settings correctly.
- Logout and confirm protected pages redirect to login.
- Refresh `/dashboard` while authenticated and confirm the session restores.
- Refresh `/dashboard` while logged out and confirm redirect to `/login`.
- Import a broker CSV and confirm trades save to Supabase.
- Import multiple completed trades in the same ticker on the same day and confirm they remain separate.
- Edit setup, grade, notes, mistake tags, emotion tags, and rules-followed, refresh, and confirm changes persist.
- Delete a trade, refresh, and confirm it remains deleted.
- Upload a PNG/JPG/WebP/GIF screenshot under 8 MB and confirm it displays.
- Refresh after screenshot upload and confirm the screenshot still displays.
- Replace a screenshot and confirm the old screenshot no longer appears.
- Remove a screenshot and confirm it stays removed after refresh.
- Save market context for a date and confirm it displays in the list.
- Save market context for the same date again and confirm it updates instead of duplicating.
- Confirm a user cannot view or modify another user's trades, market context, or screenshot objects.
- Check dashboard and trade table on a mobile-width viewport for basic usability.
- Run production build and smoke test the deployed app with real Supabase env vars.
