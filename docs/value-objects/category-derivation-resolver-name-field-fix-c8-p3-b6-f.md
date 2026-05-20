# P4.10.0-C8-P3-B6-F-fix1 — Resolver name Field Fix

Date: 2026-05-20
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / contextual_categories insert payload

## 1. Problem

The first B6-F attempt failed before modifying resolver.ts.

The check result was:

- ok: false
- missingPatterns: name: title
- failedChecks: payload does not include name: title

Commit 1238027 added docs/check artifacts but did not modify resolver.ts.

## 2. Fix

B6-F-fix1 actually adds:

- name: title

inside createCategory() contextual_categories insert payload, immediately after:

- slug: normalizedSlug

## 3. Verification

The corrected check must return:

- diagnosticsCount: 0
- missingPatterns: []
- forbiddenFound: []
- failedChecks: []

## 4. Next step

Rerun browser regression Case 3 non-dryRun.
