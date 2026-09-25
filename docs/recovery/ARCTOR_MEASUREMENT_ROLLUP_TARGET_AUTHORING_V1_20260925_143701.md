# ARCTor Measurement Rollup Target Authoring V1

Date: 2026-09-25 14:39:15
Baseline: 4acddeb886e227ccc0be5614c2330b7e9251f04d

## Implemented

- Admin-only manual rollup_target editor on global system leaf ON cards.
- Rollup metadata is stored only on the target leaf under metadata_json.measurementRollupV1.
- Ordinary leaves store no rollup role.
- Source leaves are selected by the target and do not receive component flags.
- Universal numeric system parameter is selected explicitly.
- V1 source leaves are restricted to active sibling leaves under the same parent/root.
- V1 policy is fixed: SUM, all sources required, direct preferred, missing UNKNOWN, discrepancy flagged.
- Optimistic updated_at guard prevents silent concurrent metadata overwrite.
- Seven UI locales: EN/PL/RU/UK/DE/ES/CS.
- No database migration.
- Installer performed no DB writes.
- Analytics runtime consumption remains a separate next step.

## Verification

- dedicated validator
- metadata runtime self-test
- ESLint
- TypeScript --noEmit
- git diff --check
- production Next build

Commit/push/deploy were not performed by this patch installer.