# ARCTOR_LOCAL_MINDMAP_EDITOR_V1_R4

Date: 2026-08-31
Status: RELEASED / browser round-trip acceptance pending
Baseline: ccb6a151489aabd6f6988543d9559aca6643c866
Release commit: this file is committed together with the release; use `git log -1` for SHA.

## Current state

- DOCX and XLSX local editors remain available and are not modified internally by this release.
- Mind maps now have a local editor based on the already-installed `@xyflow/react` 12.11.3.
- The native ARCTor file format is JSON in `.arctormap` (also accepts `.json`) and is validated before rendering.
- V1 supports: new map, add child, rename, branch drag, collapse/expand, subtree delete, undo/redo, local save and reopen.
- Mind-map content stays in browser memory and the user filesystem; no server/content API calls were added.

## Release-runner lessons

- V1 stopped safely in preflight because the patcher used an ambiguous `{file ? (` JSX anchor that occurred twice.
- R2 fixed that anchor but stopped safely at TypeScript: adding `mindmap` to the legacy `saveCopy` early-return made the `LocalEditorKind` guard exhaustive, so TypeScript narrowed the remaining branch to `never` and rejected `file.name`.
- R3 kept the correct saveCopy narrowing but stopped safely at changed-files ESLint with 6 errors. The R3 runner logged only aggregate counts, so no rule names were preserved in that report.
- R4 removes the six source patterns that are incompatible with the current React hooks lint model: synchronous load-state reset in the file effect and render-time reads of history refs. Render-visible history metadata now lives in React state while refs remain event/effect bookkeeping only.
- R4 also prints per-rule ESLint diagnostics into REPORT if a future changed-files lint gate fails.

## Changed production code

- `src/components/local-editors/local-editor-platform.tsx`
- `src/lib/local-editors/local-mindmap-format.ts`
- `src/components/local-editors/local-mindmap-editor.tsx`

## Automated evidence

- `npm ci --no-audit --no-fund` on isolated scratch: PASS
- baseline full ESLint captured: 244 errors / 107 warnings
- exact platform/policy/runtime/frame/package blobs: PASS
- `@xyflow/react` exact dependency 12.11.3: PASS
- mind-map format source SHA256 35b3a473296ba2af961fd22f084044dac09411d060926e5d7869ef269dc31b8d: PASS
- mind-map editor source SHA256 61c311b224f6daef5319687c80207625af6c8280fbad091fe4f72a57b898900e: PASS
- local-only source guard (no fetch/XHR/localStorage/sessionStorage/indexedDB/API path): PASS
- `git diff --check`: PASS
- `tsc --noEmit`: PASS
- changed-files ESLint: 0 errors / 0 warnings
- full ESLint non-regression: 244 errors / 107 warnings
- `npm run build`: PASS
- main worktree not mutated before all scratch gates passed

## Browser acceptance

1. Open `/local-editors?locale=pl`.
2. Click **Nowa pusta mapa myśli** and confirm the canvas opens.
3. Add a child and grandchild; rename one node; drag the parent and confirm its branch moves with it.
4. Collapse/expand the branch; verify Undo/Redo; delete a non-root branch.
5. Save `.arctormap`, reopen it with **Otwórz plik lokalny**, and confirm labels, hierarchy, positions and collapsed state survive.
6. Confirm there are no new console errors and no ARCTor document-content requests.

## Continuation point

If browser acceptance passes, close Local Mind Map Editor V1. PNG/PDF export, re-parenting, keyboard shortcuts and richer node styling belong to later iterations only if useful.
