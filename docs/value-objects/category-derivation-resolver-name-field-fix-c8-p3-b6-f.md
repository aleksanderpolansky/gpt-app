# P4.10.0-C8-P3-B6-F — Resolver name Field Fix

Date: 2026-05-20
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / contextual_categories insert payload

## 1. Runtime result after retry4

Browser Case 3 no longer fails on context_id.

New blocker:

- null value in column name of relation contextual_categories violates not-null constraint

## 2. Fix

Added required payload field:

- name: title

inside createCategory() contextual_categories insert payload.

## 3. Why this is correct

createCategory() already calculates:

- const title = normalizeTitle(candidate);

So the category name should use that normalized candidate title.

## 4. Next step

Rerun browser regression Case 3 non-dryRun.
