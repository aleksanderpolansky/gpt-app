# ARCTOR - E03 prep Cyrillic approximation boundary fix

Date: 2026-09-21
Release: ARCTOR_E03_PREP_APPROXIMATE_CYRILLIC_BOUNDARY_FIX_V1_20260921
Baseline: 2320c3a3bdcf309654cca4cf4f61cac6c52ed1ad
Product commit: 4a18a792143b13f6ced0db9edf784c23b94c22cc

## Root cause

The stair-count regex started with JavaScript word-boundary token \b.
JavaScript \b is based on ASCII-style word characters and did not treat the leading Cyrillic word примерно as the intended boundary.
The regex therefore skipped the approximation word and matched only 8 этажей.
As a result the deterministic measurement itself had approximate=false, so merge logic had no approximation evidence to preserve.

## Fix

- Removed the ASCII word-boundary prefix from the stair-count expression.
- The matched raw fragment now includes примерно/около and equivalent supported approximation words.
- Existing duplicate-evidence merge logic remains unchanged.

## Validation

- regex self-test: PASS
- git diff --check: PASS
- scoped ESLint: PASS
- production build: PASS

## Next smoke

Create a new Russian stair activity with примерно N этажей.
Expected: one Duration; one Count shown with approximation mark; localized typical activity.
If PASS, close E03 preparation and start source-fact materialization.
