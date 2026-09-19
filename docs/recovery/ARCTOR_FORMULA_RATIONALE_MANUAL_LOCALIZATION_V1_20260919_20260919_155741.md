# ARCTOR_FORMULA_RATIONALE_MANUAL_LOCALIZATION_V1_20260919

Date: 2026-09-19T14:01:01.681Z

## Decision

Formula rationale localization no longer calls OpenAI or any other machine-translation API. Administrators edit one locale at a time by switching the UI locale and pasting prepared text.

## Persistence

Existing translations are preserved. Saving one locale merges only that locale into the existing seven-locale translations object and creates the normal revision in platform_help_content_current/history.

## Defense in depth

POST /api/admin/formula-rationales now returns HTTP 405 FORMULA_RATIONALE_MACHINE_TRANSLATION_DISABLED. The formula-rationale server module no longer imports the machine translation function or navigator model catalog.

## Database

No schema migration. No destructive rewrite of existing rationale data.

## Validation before patch

BASELINE_ESLINT_TARGETS=PASS
BASELINE_TYPECHECK=PASS
BASELINE_BUILD=PASS
BASELINE_DIFF_CHECK=PASS

## Validation after patch

POSTPATCH_ESLINT_TARGETS=PASS
POSTPATCH_TYPECHECK=PASS
POSTPATCH_BUILD=PASS
POSTPATCH_DIFF_CHECK=PASS

## Implementation commit

b28756fd1cd3585264165caf4578eb81e515c9c0

## Baseline

aefdd8909f7368dfee6eb19121c9d00ddc1d9aa8
