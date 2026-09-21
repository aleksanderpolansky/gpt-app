# ARCTOR - E04 Snapshot Universal Assignments UI V1

Date: 2026-09-21
Release: ARCTOR_E04_SNAPSHOT_UNIVERSAL_ASSIGNMENTS_UI_V1_20260921
Baseline: 17ca63b40b23705234b292e6afaa3482b768ca64
Product commit: bdffc4bfb9480dd7890ac8558601f4b57ed06250

## Decision

Do not introduce a separate snapshot-allowed catalog or curator-maintained whitelist.
The existing active system parameter -> leaf observation-object assignments remain the single source of truth.
Fact role is determined when a fact is created; the assignment itself is not classified as source-only, snapshot-only, or result-only.

## UI change

- Removed the pilot-only parameterCode=mass query from /activity-facts/snapshot.
- The selector now receives all active numeric SYSTEM assignments that the existing snapshot API already permits.
- No new table, registry, boolean flag, or curator maintenance step was added.
- The form no longer auto-selects a single option; the user deliberately chooses the observation-object/parameter pair.
- Added localized explanation of what a state snapshot is.
- Added positive examples: body mass, temperature, blood pressure.
- Added negative examples: activity duration, repetitions, floors climbed.
- Added a hint next to the selector: choose a property describing state at the specified moment, not the result of an individual action.

## Important boundary

The server still validates that the selected pair is an active ownerless SYSTEM parameter assignment to an active GLOBAL system-model leaf observation object.
This release changes discovery/UI only; snapshot write validation is unchanged.

## Validation

- git diff --check: PASS
- scoped ESLint: PASS
- production build: PASS

## Next smoke

1. Open /activity-facts/snapshot?locale=ru.
2. Verify that the selector is no longer mass-only.
3. Verify that explanatory text is visible.
4. Choose Фактическая масса тела / Масса.
5. Save 96 kilogram with effective_at before the stair activity.
6. Confirm one snapshot fact on /activity-facts.
