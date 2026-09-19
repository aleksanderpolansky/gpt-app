# ARCTOR_FORMULA_RATIONALE_ADMIN_AND_USER_EXPLANATION_V1_0_1_20260919

Date: 2026-09-19T11:24:39.092Z

## Purpose

Add version-specific, administrator-editable formula rationales using the existing revisioned seven-locale help-content storage.

## Architecture

- no new database schema;
- rationale content is stored in platform_help_content_current/history under synthetic keys:
  formula-rationale:<ruleVersionId>:<section>;
- each save reuses the existing seven-locale translation and revision workflow;
- rationale content remains editable even after a formula calculation contract is published/immutable;
- rationale is bound to the exact formula rule version id;
- public read-only page is available for published formulas;
- Activity Facts shows "How was this calculated?" when calculation_rule_code + calculation_rule_version exist;
- Formula Builder links directly to the rationale editor.

Sections:
- summary
- method
- interpretation
- limitations
- aggregation

## Safety

DB schema writes: 0
Formula contract writes: 0
Fact writes: 0
Formula Executor changes: 0
Analytics changes: 0

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

d2b22b19417a3ce65596197857d681277ce1ab27

## Baseline

32e6303a1c4305b938a1ede10f769639bc0e82b3

## Continue

Open /admin/formula-rationales?locale=ru, select the stair-ascent formula version, and enter/save the five rationale sections before recording formula test evidence.
