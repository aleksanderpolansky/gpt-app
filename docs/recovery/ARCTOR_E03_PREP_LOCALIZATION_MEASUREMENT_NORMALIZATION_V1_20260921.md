# ARCTOR - E03 prep: localization and measurement normalization

Date: 2026-09-21
Release: ARCTOR_E03_PREP_LOCALIZATION_MEASUREMENT_NORMALIZATION_V1_20260921
Baseline: 847ba6d1c975c456517e32d324ae3cf9593730f8
Product commit: 0e34a2972a27af664e5175d6443671c647c1c556

## Implemented

- Stored typical-activity candidates are localized at read time using the current UI locale.
- Retry and wrong-match actions carry the current UI locale.
- Rejected template title is localized before it is written into curator evidence.
- Duration unit aliases such as minute/minutes are canonicalized before measurement merge.
- Stair floor counts are deterministically extracted when stair context is present.
- Floor-like model outputs are canonicalized to parameter count / measure type count / unit count.
- Approximate wording is preserved structurally as approximate=true and rendered with the approx sign.
- Known measurement labels are rendered in the current UI locale.
- Event timing duration is not shown twice when an extracted duration measurement is present.

## Validation

- git diff --check: PASS
- scoped ESLint on six changed product files: PASS
- production build: PASS

## No database migration

This release changes read-time localization and normalization logic only. No SQL migration is included.

## Next smoke

1. Reopen the activity that was created under English locale with locale=ru; Stair ascent must render as the Russian localized title.
2. Create a fresh Russian stair activity such as: Поднимался по лестнице 16 минут, примерно 9 этажей.
3. Basic analysis must show one extracted duration measurement and one canonical count measurement; count must retain approximate semantics.
4. If PASS, continue to E03 source-fact materialization.
