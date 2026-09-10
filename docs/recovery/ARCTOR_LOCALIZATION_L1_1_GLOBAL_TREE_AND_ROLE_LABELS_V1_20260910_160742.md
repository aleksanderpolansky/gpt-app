# ARCTOR_LOCALIZATION_L1_1_GLOBAL_TREE_AND_ROLE_LABELS_V1 technical recovery checkpoint

- Timestamp: 2026-09-10T16:08:54.8381169+02:00
- Baseline: 5d94f4a7a2a0033c903aab419be8c4b0b0b2fe72
- Previous completed step: Localization L1 made semantic relation read paths locale-aware.
- Remaining reproduced defect: global-system ON title itself was localized, but breadcrumb/tree/parent/children/sibling structural views could still show canonical English names.
- Root cause: the global branch of readTreeNodes() called localizeGlobalSystemValueObject() without selecting metadata_json, so the resolver could not see the stored localizedContent used by current system ON rows.
- L1.1 fix:
  - include metadata_json in the global tree query;
  - keep using the existing global-system resolver, with no new translation engine;
  - localize user-facing node role labels instead of exposing root/intermediate/leaf technical codes;
  - localize structural-card role details passed to the relation map;
  - localize the global-system owner kind label while preserving the ARCTor Global System brand name.
- Expected visible result:
  - breadcrumb/path/root/structural parent use the selected locale;
  - parent/children/sibling relation-map cards use the selected locale;
  - RU shows Промежуточный instead of intermediate;
  - equivalent labels follow PL/UK/DE/ES/CS dynamically.
- Database changes: none.
- SQL: none.
- API changes: none.
- AI generation: none.
- Read-time writes: none.
- File changed:
  - src/app/value-objects/[id]/page.tsx
- Existing dependency unchanged and blob-gated:
  - src/lib/reality-core/global-system-value-object-localization.ts
- Verification:
  - exact HEAD == origin/main;
  - clean worktree;
  - exact page blob;
  - exact global-localizer dependency blob;
  - patch applied to temporary copy first;
  - explicit behavior markers;
  - changed-file ESLint;
  - git diff --check;
  - production build;
  - staged diff check;
  - commit/push verification;
  - final clean worktree.
- Backup: C:\Users\Admin\Downloads\ARCTOR_LOCALIZATION_L1_1_GLOBAL_TREE_AND_ROLE_LABELS_V1_20260910_160742_BACKUP.zip
- Continuation:
  1. verify RU breadcrumb and structure cards;
  2. verify RU node role label;
  3. check one PL or UK view;
  4. if PASS, close global-system ON localization and continue to L2 actor-owned ON localization.