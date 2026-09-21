# ARCTOR - E03 prep approximate merge hotfix V1.1

Date: 2026-09-21
Release: ARCTOR_E03_PREP_APPROXIMATE_MERGE_HOTFIX_V1_1_20260921
Baseline: e3e445749567bf6b616f24c636e1d9170d648c41
Product commit: 423b3ea6fcaa3c4769d6eee1731cbb5203cf96e7

## Cause

The model-derived Count and deterministic Count had the same canonical key.
The previous merge kept the first item and discarded the duplicate.
Approximation evidence from deterministic extraction could therefore be lost.

## Fix

- Duplicate canonical measurements are merged instead of discarded.
- approximate becomes true when either source marks the measurement approximate.
- Highest confidence is preserved.
- When approximation evidence arrives later, the matching raw fragment is preserved.

## Validation

- git diff --check: PASS
- scoped ESLint: PASS
- production build: PASS

## Next smoke

Create a fresh stair activity with approximate floor count.
Expected: one Duration, one Count with approximation mark, localized typical activity.
If PASS, proceed to E03 source-fact materialization.
