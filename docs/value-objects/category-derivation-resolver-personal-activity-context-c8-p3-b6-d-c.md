# P4.10.0-C8-P3-B6-D-C — Resolver personal_activity Context Fix

Date: 2026-05-20
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / contextual_categories context_id fix

## 1. Problem

B6 browser suite Case 3 failed because Category Derivation resolver attempted to insert contextual_categories with context_id = null.

Live SQL confirmed:

- contextual_categories.context_id is NOT NULL
- contextual_categories uniqueness is context_id + lower(slug)
- personal_activity context exists and is active

## 2. Fix

Updated resolver:

- added DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE = personal_activity
- added findDefaultCategoryDerivationContextId()
- widened SupabaseSelectBuilder.eq value type to allow boolean
- made findExistingCategory context-aware
- added context_id to contextual_categories insert payload
- guarded category creation if default context is missing

## 3. Expected behavior

Resolver should now create missing candidates such as walking/work/commute-to-work/walking-to-work/duration-minutes under personal_activity context.

Route guards remain unchanged.

Bridge additionalCategoryLinks should only receive resolved candidates with valid categoryId.

## 4. Next verification

- Run targeted resolver smoke check
- Run browser Case 3 non-dryRun
- If successful, document B6-D-C result
