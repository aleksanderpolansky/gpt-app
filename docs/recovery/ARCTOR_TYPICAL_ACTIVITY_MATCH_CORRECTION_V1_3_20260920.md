# ARCTOR - Typical Activity Match Correction V1.3

Date: 2026-09-20
Release: ARCTOR_TYPICAL_ACTIVITY_MATCH_CORRECTION_V1_3_FINALIZE_20260920
Baseline before product change: f7c0935e962108a7a8ace261ca008961ecad2da6
Product commit: 6712f7701be8a885e9c661e83954158a02f1b6f9

## Implemented

- Localized typical-activity candidate title for the active locale with fallback.
- Completed automatic recognition is labeled as an automatic match rather than a mere possible candidate.
- Added explicit wrong-match action on the activity analysis card.
- Rejection preserves the user activity and records ARCTOR_USER_TYPICAL_ACTIVITY_REJECTION_V1.
- Rejected match is routed to Reality Curator with a distinct queue reason and rejected title.
- Same rejected candidate is removed from the active durable analysis result.
- No SQL migration and no parallel persisted template-binding mechanism were added.

## Validation

- Scoped ESLint for all five product files: PASS
- Production build: PASS
- git diff --check: PASS

## Full-lint baseline note

The preceding repository-wide npm lint run reported 351 existing problems (244 errors, 107 warnings).
None of the five files changed by this release appeared in that full-lint error output.
Therefore this release is gated by scoped ESLint on its five product files plus the successful production build.

## Recovery rule

Revert the product commit above to remove the behavior change.
No database migration is required for rollback.

## Next point

After deployment, smoke-test two paths on a fresh activity:
1. correct automatic typical-activity recognition -> continue to E03 source facts;
2. explicit wrong-match rejection -> raw signal appears in Reality Curator and does not immediately regain the rejected candidate.
