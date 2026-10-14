# ARCTor FEED F3.2.6 - Supabase database acceptance

Date: 2026-10-14
Contract: ARCTOR_FEED_F326_POSTCHECK_V1
Administrator-provided Supabase POSTCHECK: PASS

Verified with READ-ONLY POSTCHECK:
- installed: true
- legacyF325Installed: true
- nbuSnapshotSourceAllowed: true
- authenticatedDenied: true
- anonDenied: true
- serviceRoleExecute: true
- autoOff: true
- syntheticCasesPassed: 4
- syntheticCasesTotal: 4
- dbWritesPerformed during POSTCHECK: false

Synthetic test cases:
- PLN_match_100_140: expected true, actual true
- PLN_excludes_0_90: expected false, actual false
- EUR_only_no_NBU: expected true, actual true
- UAH_1400_1600: expected true, actual true

IMPORTANT:
- Test rates are SYNTHETIC, not official market quotations.
- SQL migration was already applied manually via Supabase SQL Editor.
- Do NOT automatically apply the migration again to production.
- Reconcile the remote Supabase migration history before any CLI db push.
- No personal activity changes or POINTS calculation changes.
- Source money facts and currencies remain unchanged.
- Legacy F3.2.5 function remains installed for rollback.
- Commercial automatic fact writing stays OFF.
- Real ECB/NBU network failure and fallback scenarios still require staging/browser acceptance.
- UI tests and Vercel deployment are pending at the time of this report.