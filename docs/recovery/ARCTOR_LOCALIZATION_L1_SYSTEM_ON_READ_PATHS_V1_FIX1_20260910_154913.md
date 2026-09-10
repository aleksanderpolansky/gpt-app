# ARCTOR_LOCALIZATION_L1_SYSTEM_ON_READ_PATHS_V1_FIX1 technical recovery checkpoint

- Timestamp: 2026-09-10T15:50:27.0102314+02:00
- Baseline: 96b8af8fdbbfb269192d415d8f15c8310e4ef4c0
- Previous attempt: ARCTOR_LOCALIZATION_L1_SYSTEM_ON_READ_PATHS_V1.
- Previous attempt result: failed safely while patching TEMP copies; repository source was never mutated, no recovery file and no commit were created.
- Previous failure root cause: the patcher treated const { actorContext, errorResponse } = await resolveRouteActorContext(); as a globally unique anchor although that line exists in more than one exported route handler.
- FIX1 change to deployment method: route mutations are scoped to the intended exported GET/POST function before matching inner anchors.
- Product scope:
  - reuse existing localizeGlobalSystemValueObject;
  - /relations accepts locale and localizes global-system candidates;
  - /relationship-coverage accepts locale and localizes current ON, links and candidates;
  - coverage POST responses preserve locale after review/add/remove/reset;
  - map and embedded editor explicitly send locale.
- No AI translation is generated during read.
- No database changes.
- No SQL.
- Actor-owned localization is unchanged and remains L2.
- Report encoding: FIX1 writes a consistent UTF-8 REPORT.txt.
- Files changed:
  - src/app/api/value-objects/[id]/relations/route.ts
  - src/app/api/value-objects/[id]/relationship-coverage/route.ts
  - src/components/workspace/value-objects/value-object-relationship-map.tsx
  - src/components/workspace/value-objects/value-object-relationship-coverage-review.tsx
- Existing dependency left unchanged:
  - src/lib/reality-core/global-system-value-object-localization.ts
- Verification:
  - exact baseline HEAD == origin/main;
  - clean worktree;
  - exact Git blob gates for all changed files and resolver dependency;
  - patch on temporary copies before repository mutation;
  - explicit post-patch behavior markers;
  - ESLint on changed files;
  - git diff --check;
  - production build;
  - staged diff check;
  - commit/push verification;
  - final clean worktree.
- Backup: C:\Users\Admin\Downloads\ARCTOR_LOCALIZATION_L1_SYSTEM_ON_READ_PATHS_V1_FIX1_20260910_154913_BACKUP.zip
- Acceptance:
  1. RU global ON relation candidate dropdown shows RU names;
  2. existing linked global ON titles also show RU names;
  3. after review/add/remove response remains RU;
  4. repeat with PL or UK to prove locale is dynamic.