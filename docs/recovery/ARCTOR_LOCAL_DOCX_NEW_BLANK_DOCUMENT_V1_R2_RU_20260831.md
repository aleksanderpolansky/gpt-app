# ARCTOR_LOCAL_DOCX_NEW_BLANK_DOCUMENT_V1_R2

Date: 2026-08-31
Status: RELEASED / browser round-trip acceptance pending
Baseline: 4874bf50deefa5b6cc2f40f78e8eeac44e396109
Release commit: this file is committed together with the release; use `git log -1` for SHA.

## Current state

- DOCX opening/editing/local saving remains unchanged; this release does not modify `local-docx-editor.tsx`.
- The local editors platform now offers a localized **New blank document** action for DOCX.
- The new document is a deterministic minimal valid OOXML/DOCX ZIP package held only in browser memory.
- Creating a blank document activates the same DOCX privacy guard before the editor mounts.
- XLSX and mind-map code paths are not modified.

## Decision and reason

The current product goal is a minimal self-contained local office toolkit, not full Excel parity. After XLSX basic editing passed, the next gap was creation of a DOCX without requiring an existing source file.

## Changed production code

- `src/components/local-editors/local-editor-platform.tsx`
- `src/lib/local-editors/blank-docx-template.ts`

## Automated evidence

- `npm ci --no-audit --no-fund` on isolated scratch: PASS
- baseline full ESLint captured: 244 errors / 107 warnings
- exact baseline blob + DOCX editor contract: PASS
- blank DOCX deterministic payload SHA256 2760dbea12affdbda7334e63d8b524a0adeb38f4e83541e2c037d6e1b44a02ed + ZIP entry/CRC/OOXML contract: PASS
- `git diff --check`: PASS
- `tsc --noEmit`: PASS
- changed-files ESLint: 0 errors / 0 warnings
- full ESLint non-regression: 244 errors / 107 warnings
- `npm run build`: PASS
- main worktree not mutated before all scratch gates passed

## Browser acceptance

1. Open `/local-editors?locale=pl` (and optionally another locale).
2. Click **Nowy pusty dokument**.
3. Confirm the DOCX editor opens without console errors and the file name is `ARCTor-document.docx`.
4. Type a short text, save locally, then reopen the downloaded DOCX.
5. Confirm the text survives save/reopen and no document content is uploaded to ARCTor.

## Continuation point

If browser round-trip passes, close the new-file creation stage and proceed to local mind maps. Do not expand DOCX/XLSX feature scope unless a concrete user problem requires it.
