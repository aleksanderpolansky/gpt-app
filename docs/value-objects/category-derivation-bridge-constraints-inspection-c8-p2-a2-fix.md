# P4.10.0-C8-P2-A2 - Constraint Inspection SQL Safe Fix

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / value_object_category_links constraint inspection SQL fix

## 1. Context

The previous inspection SQL failed in Supabase SQL Editor with:

- relation metadata_json_sourceLayer does not exist

## 2. Fix

Removed the whole 08_next_decision_inputs diagnostic section.

That section was only explanatory and was not needed for live DB constraint inspection.

## 3. Runtime impact

No application code changed.
No schema changed.
No data migration was performed.

## 4. Next step

Run the corrected SQL again in Supabase SQL Editor and report:

- 02_constraints
- 03_indexes
- 04_existing_category_role_values
- 05_existing_source_values
- 07_constraint_summary
