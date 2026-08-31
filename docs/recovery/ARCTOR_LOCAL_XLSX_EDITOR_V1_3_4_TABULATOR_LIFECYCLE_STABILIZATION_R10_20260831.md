# ARCTOR_LOCAL_XLSX_EDITOR_V1_3_4_TABULATOR_LIFECYCLE_STABILIZATION_R10

Date: 2026-08-31
Status: RELEASED / browser acceptance pending
Baseline: 315495e7e3d1fa6c880b58a97b6ec97b1f6a3c22
R3 reference: 6b5a8191f4a325750dd09fe271d23b16beb99486
Last known editing reference: c747c0b58d5cdb1e7f1da339c0c2a2457939d1be
Release commit: this recovery checkpoint is committed together with the release; use `git log -1` for the resulting SHA.

## Current state

- V1.3 sheet/row/column/bulk functionality is preserved.
- R4 manual edit bridge code is removed from production code by restoring the R3 code state only for files changed by R4 under the Tabulator/local-editor component zones.
- The XLSX column keeps the semantic editor key `editor: "arctor-expanded-input"`; `ArctorTabulator` resolves that key to the native `createExpandedEditor("input")` Tabulator editor.
- The XLSX-specific `options` object is memoized with React `useMemo`, preventing selection state renders from destroying/recreating Tabulator merely because the options object identity changed.
- R3 range-selection isolation remains intact because the patch starts from the R3 component code for R4-touched component files.
- Release-process lesson: R8 reached TypeScript but its source patcher placed `xlsxTableOptions` in a nested lexical scope. R9 fixed the memo lexical scope and passed TypeScript/ESLint/build. R10 changes no functional source patch; it fixes the release runner final changed-set gate so the newly created untracked recovery checkpoint is included before staging.

## Decision and reason

The failure chain was React lifecycle related: `cellClick -> setSelection -> render -> new inline options object -> ArctorTabulator effect cleanup -> table.destroy() -> new table`. R4 suppressed Edit errors by changing the shared `ArctorTabulator` resolver from `createExpandedEditor(...)` to `editor: false` and adding a manual click/double-click bridge. This release restores the exact R3 resolver, keeps the XLSX column key unchanged, and fixes the separate React lifecycle trigger instead of adding another editing workaround.

## Changed production code files

- `src/components/local-editors/local-spreadsheet-editor.tsx`
- `src/components/tables/arctor-tabulator.tsx`

## Evidence / automated gates

- `npm ci --no-audit --no-fund` on isolated scratch: PASS
- baseline full ESLint captured: 244 errors / 107 warnings
- deterministic source validator against exact R3 source: PASS
- `git diff --check`: PASS
- `tsc --noEmit`: PASS
- changed-files ESLint: 0 errors / 0 warnings
- full ESLint non-regression: 244 errors / 107 warnings
- `npm run build`: PASS
- main worktree was not mutated before all scratch gates passed

## Remaining browser acceptance

1. Open `/local-editors?locale=pl`.
2. Open an uploaded XLSX and a blank workbook.
3. Double-click a normal editable cell, type `TEST`, press Enter.
4. Confirm no red console errors.
5. Insert a row and a column and verify `TEST` shifts with the cell as expected.
6. Save/download and reopen the XLSX to confirm persistence.

Do not mark this stage fully closed until the browser acceptance above is confirmed.

## Continuation point

If browser acceptance passes, record PASS in the next recovery checkpoint and continue with XLSX table-editor functionality. If it fails, collect the exact console stack and do not introduce another custom editing bridge before comparing the live DOM/lifecycle against this release.
