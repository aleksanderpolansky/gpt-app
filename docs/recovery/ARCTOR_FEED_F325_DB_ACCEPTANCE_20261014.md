# ARCTor FEED F3.2.5 - Database acceptance

Date: 2026-10-14
Contract: ARCTOR_FEED_F325_POSTCHECK_V1
Administrator-reported Supabase POSTCHECK: PASS

- installed: true
- serviceRoleExecute: true
- authenticatedDenied: true
- anonDenied: true
- autoOff: true
- legacyF324Works: true
- sameEventValencia: true
- syntheticCasesPassed: 8
- syntheticCasesTotal: 8
- testRatesAreSynthetic: true
- dbWritesPerformed during POSTCHECK: false

Tested simulated cross-currency matches for EUR, PLN, USD, UAH, GBP, CZK,
plus negative range controls. Synthetic rates DO NOT validate live ECB/NBU rates.

Deployment notes:
- SQL function applied manually via Supabase SQL Editor.
- This Git migration records the applied source; do not automatically reapply
  it in production before reconciling Supabase migration history.
- Live provider connectivity and currency conversion UI still require
  production browser/API acceptance after Vercel Ready.
- This patch preserves F3.2.4 and commercial POINTS business logic.
- The commercial automatic fact-writing switch remains OFF.
- Multi-item same-event scoping is a known future limitation.
- Existing global ESLint baseline failures are outside this patch.