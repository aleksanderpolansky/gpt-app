# ARCTor FEED F3.2.3 — Database acceptance

Date: 2026-10-14
Contract: ARCTOR_FEED_F323_POSTCHECK_V1

Administrator-provided Supabase POSTCHECK: PASS

Verified by the reported read-only SQL:

- installed: true
- rlsEnabled: true
- serviceRead: true
- authenticatedDenied: true
- anonDenied: true
- autoOff: true
- approvedLeaves: 1
- fixtureApproved: true
- dbWritesPerformed during POSTCHECK: false

The curator-approved price registry was installed manually
through Supabase SQL Editor.

This commit records the migration source for future environments.

Important:
- Do not automatically reapply this migration in production.
- Reconcile remote Supabase migration history before CLI use.
- The price registry stores classifications, not price facts.
- Confirmed facts remain in existing ARCTor fact tables.
- F3.1A remains the server-side semantic search engine.
- Multiple price items in one activity still require item-level scoping.
- Global ESLint baseline failures remain outside this patch.
- Automatic commercial fact writing remains OFF.

Production API and browser acceptance tests remain pending.