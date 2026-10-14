# ARCTor FEED F3.2.6 Local Acceptance

Date: 2026-10-14
Baseline HEAD: 79bfeea01995bac428ef5d300004a9ffb8184c43
Contract: ARCTOR_FEED_F326_PATCH_V1
Result: ARCTOR_FEED_F326_LOCAL_PASS
Scoped ESLint: PASS
TypeScript: PASS
Production build: PASS
Git diff --check: PASS
Backup: C:\Users\Admin\Downloads\ARCTOR_FEED_F326_BACKUP_20261014_151845

Changes:
- lib/exchange-rates/feed-six-currency-f326.ts
- src/lib/messages/semanticFeedSearchF31.server.ts
- src/app/api/feed/price-facets/route.ts
- src/app/feed/SemanticFeedFilters.tsx
- supabase/migrations/20261014190000_arctor_feed_f326_selective_fx_and_nbu_snapshot.sql

Supabase PRECHECK: PENDING
Supabase APPLY: NOT EXECUTED
Supabase POSTCHECK: PENDING
Commit/push: NOT PERFORMED
Automatic commercial fact writing: MUST REMAIN OFF

Source amounts, POINTS calculation and all existing F325 functions remain unchanged.