# P4.10.0-C8-L2 — Unicode Sanity Check for Cyrillic Rules

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / Unicode Cyrillic rule verification

## 1. Why this check was needed

C8-L1 passed, but PowerShell preview displayed Russian strings in the JSON result as mojibake.

Before moving to the Supabase resolver layer, C8-L2 verifies that the deterministic extractor matches true Unicode Cyrillic input strings.

## 2. Result

- PASS
- ok: true
- passed cases: 5 / 5

## 3. Runtime impact

No database writes were made.

No mapper, bridge or route behavior was changed.

The check only executed the pure deriveCategoryCandidates() function locally.

## 4. Result artifact

- docs/value-objects/category-derivation-unicode-sanity-c8-l2-result.json

## 5. Next step

Proceed to P4.10.0-C8-M: add resolver.ts with Supabase lookup/create policy, still not integrated into the runtime route.
