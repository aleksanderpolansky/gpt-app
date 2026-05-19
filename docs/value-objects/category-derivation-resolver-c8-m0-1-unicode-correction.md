# P4.10.0-C8-M0.1 — Resolver Unicode Slug Normalization Correction

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / resolver correction

## 1. Context

P4.10.0-C8-M added:

- lib/activity/categoryDerivation/resolver.ts

Commit:

- 0537c97 Add category derivation resolver

The file was created, committed and pushed, but preview showed mojibake inside normalizeSlug regex:

- curly apostrophe regexp was rendered incorrectly
- Cyrillic range regexp was rendered incorrectly

## 2. Correction

This checkpoint rewrites resolver.ts with ASCII-safe Unicode escape sequences:

- \u2019 for the curly apostrophe
- \u0400-\u04ff for Cyrillic characters

The slug normalizer is exported as:

- normalizeCategoryCandidateSlug

This allows the next mock verification step to test Cyrillic slug normalization directly.

## 3. Runtime impact

No route, mapper or bridge integration is added in this correction.

The resolver remains not connected to runtime flow.

## 4. Next step

Proceed to P4.10.0-C8-M1: local mock verification of resolver logic without live DB writes.