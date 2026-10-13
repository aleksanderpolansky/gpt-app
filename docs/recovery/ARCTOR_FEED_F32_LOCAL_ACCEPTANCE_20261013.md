# ARCTor F3.2A+B local acceptance

Date: 2026-10-13
Baseline commit: f1e4e45ea2e2be80495304fe48b17ecdd15eaeb4
Package: ARCTOR_FEED_F32_COMPACT_UI_ONTOLOGY_SELECTOR_V1_20261013
Backup: C:\Users\Admin\Downloads\ARCTOR_FEED_F32_BACKUP_20261013_163653
Scope: four source files (two modified, two newly added)

- F1.2 and F3.1A/F3.1B unchanged
- No SQL migration, facts written, or automatic fact-writing toggle
- Numeric parameters still via prior test URL (dedicated UI later)
- Search index: global active observation objects only
- No commit, push or deploy performed by installer
- Global ESLint: existing baseline errors, NOT claimed as PASS
- Scoped ESLint, TypeScript and build: completed successfully only if installer prints F32_LOCAL_PASS