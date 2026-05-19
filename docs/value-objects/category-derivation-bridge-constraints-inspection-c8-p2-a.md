# P4.10.0-C8-P2-A - Live Constraint Inspection SQL

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / value_object_category_links constraint inspection

## 1. Result

Created SQL file:

- docs/sql/P4.10.0-C8-P2_inspect_value_object_category_links_constraints.sql

## 2. Purpose

Before changing TypeScript bridge code, this SQL inspects live DB constraints for:

- value_object_category_links.category_role
- value_object_category_links.source
- unique constraint fields
- metadata_json constraint
- current sample rows

## 3. Why this is required

C8-P1 contract says Category Derivation should create category links only as an additive optional layer.

Before using source = category_derivation or category_role = semantic_component, we must verify that the live DB constraints allow those values.

## 4. Expected sections from Supabase SQL Editor

Report back these sections:

- 02_constraints
- 03_indexes
- 04_existing_category_role_values
- 05_existing_source_values
- 07_constraint_summary
- 08_next_decision_inputs

## 5. Next step

Run the SQL in Supabase SQL Editor.

Do not modify TypeScript code until P4.10.0-C8-P2-B result is reviewed.
