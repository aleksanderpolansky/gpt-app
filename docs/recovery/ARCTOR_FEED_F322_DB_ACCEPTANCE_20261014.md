# ARCTor FEED F3.2.2 - Database acceptance

Date: 2026-10-14
Contract: ARCTOR_FEED_F322_POSTCHECK_V1
Administrator-reported Supabase result: PASS

Confirmed:
- installed: true
- rlsEnabled: true
- serviceRoleCrud: true
- authenticatedRead: false
- authenticatedWrite: false
- anonRead: false
- ownerIndexPresent: true
- autoEnabled: false
- dbWritesPerformed during POSTCHECK: false

The SQL table was installed manually in Supabase SQL Editor.
This commit records the matching migration source.

Important:
- Do not blindly reapply the migration via Supabase CLI.
- Reconcile remote migration history before a future CLI migration.
- Cross-account API authorization requires production testing.
- Saved search tabs store conditions, not copies of publications.
- Automatic commercial fact writing remains OFF.
- Global ESLint baseline errors are outside this patch.