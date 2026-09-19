# ARCTOR_CONSEQUENCE_CASE_PAGES_V1_20260919

Date: 2026-09-19T14:58:15.088Z

## Architecture

The consequence constructor is split into a lightweight queue and an on-demand case page. The queue does not hydrate relationship candidates or formula contexts. A case page is addressed by /admin/consequence-constructor/[taskId] and loads one task plus its candidate/selected-target/formula context.

## Published formula rendering

Published formula versions are rendered as Published/Опубликована vN instead of being described as an unfinished draft.

## DB / executor

No database migration. No formula rewrite. No Formula Executor activation. No fact write.

## Baseline validation

BASELINE_ESLINT_TARGETS=PASS
BASELINE_TYPECHECK=PASS
BASELINE_BUILD=PASS
BASELINE_DIFF_CHECK=PASS

## Postpatch validation

POSTPATCH_ESLINT_TARGETS=PASS
POSTPATCH_TYPECHECK=PASS
POSTPATCH_BUILD=PASS
POSTPATCH_DIFF_CHECK=PASS

## Implementation commit

eaa093c9b196f7d49b702f2a0963e514691ce5db

## Baseline

e95a38e7dc1a3fbc7723154b770e04ef0c7427d5
