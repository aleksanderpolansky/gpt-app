# ARCTOR_LOCALIZATION_L2_1_ACTOR_ON_READ_CONTRACT_V1_0_1 technical recovery checkpoint

- Timestamp: 2026-09-10T17:54:42.5312975+02:00
- Baseline: b644c50af6829d268c40acda7b6babcac82581ca
- Global-system localization L1 + L1.1 remains accepted and unchanged.
- Problem: actor-owned ON ordinary reads still used ensureActorValueObjectLocalizationsV1, so opening a page/catalog could register sources, generate AI translations and write variants.
- Decision: separate READ from translation MATERIALIZATION.
- Added read-only resolver:
  - src/lib/localization/valueObjectReadLocalization.server.ts
  - precedence: usable platform registry -> legacy metadata_json.localizedContent -> canonical/current text
  - registry read failure falls back safely and does not break ON display
  - no source registration, no AI generation, no variant write
- Core read paths switched:
  - actor-owned ON detail title/description
  - actor-owned ON tree titles
  - /api/value-objects actor-owned catalog GET
  - /api/value-objects/[id]/relations actor-owned candidates and linked ON titles
- UI cleanup:
  - visible part_of marker now has 7-locale display labels
  - canonical relation code remains unchanged in data
- Existing writeful engine remains unchanged:
  - src/lib/localization/valueObjectOnDemandLocalization.server.ts
  - reserved for explicit/future materialization/backfill flows
- Database changes: none
- SQL: none
- AI generation on touched reads: none
- Localization writes on touched reads: none
- Not in L2.1:
  - remaining raw-title-risk endpoints from the audit
  - backfill/materialization policy rewrite
  - AI-Navigator stored-message translation policy
- Verification:
  - exact HEAD/origin/main + clean worktree
  - exact source/dependency blob gates
  - helper SHA256 + Git blob gate
  - patch on temp copies first
  - static no-AI/no-write markers
  - ESLint changed files
  - git diff --check
  - production build
  - staged diff check
  - commit/push/final clean verification
- Backup: C:\Users\Admin\Downloads\ARCTOR_LOCALIZATION_L2_1_ACTOR_ON_READ_CONTRACT_V1_0_1_20260910_175328_BACKUP.zip
- Acceptance:
  1. actor-owned ON detail/tree still show existing localized text in RU/ES/PL
  2. actor-owned relation candidates/linked ONs use requested locale
  3. part_of is displayed as a localized human label
  4. global-system L1/L1.1 behavior is unchanged