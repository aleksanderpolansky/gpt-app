# ARCTor FEED F3.2.4 - Database acceptance

Date: 2026-10-14
Contract: ARCTOR_FEED_F324_POSTCHECK_V1
Administrator-provided POSTCHECK result: PASS

Confirmed:
- functionEvidence: true
- functionFacets: true
- functionSearch: true
- legacyF31Installed: true
- legacySearchWorks: true
- parameterFirstIndex: true
- serviceRoleExecute: true
- anonymousAndAuthenticatedDenied: true
- findLidl20to40EUR: true
- exclude0to20EUR: true
- exclude20to40PLN: true
- sameEventValencia: true
- eurFacet: true
- autoOff: true
- dbWritesPerformed during POSTCHECK: false

F3.2.4 searches confirmed money_value facts attached to
eligible public commercial publications through existing F1.2 links.

The database migration was applied manually in Supabase SQL Editor.
This Git commit records the migration source.

Restrictions:
- Do not automatically reapply the migration in production.
- Reconcile Supabase remote migration history before CLI use.
- Legacy F3.1A remains available.
- Personal activity facts are not added to public search.
- Automatic commercial fact writing remains OFF.
- Multiple items in one event still need item-level scoping.
- Production browser tests remain pending.
- Global ESLint baseline failures are outside this patch.