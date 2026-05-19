# P4.10.0-C8-P2-A1 - Constraint Inspection SQL Fix

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / value_object_category_links constraint inspection SQL fix

## 1. Context

P4.10.0-C8-P2-A created:

- docs/sql/P4.10.0-C8-P2_inspect_value_object_category_links_constraints.sql

When executed in Supabase SQL Editor, the query returned:

- ERROR: 3F000: schema metadata_json does not exist

## 2. Cause

The diagnostic JSON section contained the text metadata_json.sourceLayer.

Although intended as plain explanatory text, it was safer to remove the dot notation from the diagnostic string.

## 3. Fix

Changed diagnostic text from:

- metadata_json.sourceLayer

to:

- metadata_json_sourceLayer

## 4. Runtime impact

No application runtime code was changed.

No database schema was changed.

No data migration was performed.

## 5. Next step

Run the corrected SQL again in Supabase SQL Editor.
