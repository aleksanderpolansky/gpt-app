# P4.10.0-C8-P3-B6-D-A — Live Context Resolution SQL Check

Date: 2026-05-20
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation resolver / contextual_categories context_id failure

## 1. Why this step exists

B6 browser suite proved that no-flag and dryRun=true scenarios pass, but non-dryRun fails because resolver tries to create contextual_categories without context_id.

B6-C proved from schema that contextual_categories.context_id is mandatory and that category uniqueness is context_id + slug.

Therefore resolver cannot be patched safely until the live contexts table is inspected.

## 2. SQL file

- docs/sql/P4.10.0-C8-P3-B6-D_live_context_resolution_check.sql

## 3. Run location

Run the SQL only in Supabase SQL Editor.

Do not run SQL in PowerShell.

## 4. What the SQL checks

- contexts columns
- contextual_categories columns
- all contexts rows
- likely default context candidates
- category count by context
- whether walking/work/commute-to-work/walking-to-work/duration-minutes already exist
- contextual_categories constraints
- contextual_categories indexes

## 5. Next step after SQL result

Use the live result to choose the minimal resolver fix:

- find existing context by code
- or create/find default context first
- then insert contextual_categories with valid context_id
- rerun browser Case 3 non-dryRun
