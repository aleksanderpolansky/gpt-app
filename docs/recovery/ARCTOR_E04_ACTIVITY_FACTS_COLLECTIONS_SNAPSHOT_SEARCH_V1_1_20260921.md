# ARCTOR — E04 Activity Facts Collections + Snapshot Search V1.1

Date: 2026-09-21
Release: ARCTOR_E04_ACTIVITY_FACTS_COLLECTIONS_SNAPSHOT_SEARCH_V1_1_20260921
Baseline: f368d37b25a2a7ab6d25a6b7788634796a02521c

## Previous V1 stop

V1 stopped before source changes, lint, build, commit and push.
The generated PowerShell runner contained an invalid control character in the local
payload path because a backslash sequence was produced incorrectly while packaging.

No product files were changed and HEAD remained on the expected baseline.

## Product changes

### Snapshot capture
- Add localized text search above the observation-object / parameter selector.
- Search narrows the existing active system assignments; no new snapshot whitelist/catalog.
- The success link opens the facts page directly in the state-snapshot collection.

### Facts list
- Add collection-style tabs:
  - all values;
  - planned values;
  - completed activities;
  - state snapshots;
  - other values.
- Add collection counters.
- Add a dedicated state-snapshot summary card.
- Cards view follows the selected collection.
- Legacy `factRoleCode=snapshot` links are interpreted as the snapshot collection.

## Boundaries

- No DB migration.
- No new snapshot catalog or whitelist.
- No change to snapshot POST validation.
- No facts API schema change.

## Validation

The package runner must pass:
- git diff --check
- scoped ESLint for both changed files
- production build

Only after PASS:
- product commit
- recovery commit
- push main
