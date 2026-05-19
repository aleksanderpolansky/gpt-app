# P4.10.0-C8-O3-A — Live DB Verification SQL for Route Derivation Rows

Date: 2026-05-19  
Project: gpt-app / AI-NAVIGATOR  
Scope: Category Derivation Layer v1 / live DB verification after C8-O2 runtime route test

## 1. Result

Created SQL verification file:

- docs/sql/P4.10.0-C8-O3_verify_route_derivation_rows.sql

## 2. Verification target

The SQL verifies the live DB rows created by the flagged runtime route test:

- eventId: 7bf83e7b-02f8-4882-8e7b-419c8843cee2
- derivationRunId: dd0db584-cad7-4925-9e2a-732a0676e174

Expected derivation rows:

- 5 rows in activity_category_derivations

Expected candidate slugs:

- walking
- work
- commute-to-work
- walking-to-work
- duration-minutes

Expected dryRun behavior:

- category_id is null for all derivation rows
- metadata_json.resolutionStatus is unresolved
- no contextual_categories creation is required for this check

## 3. Expected final verdict

The final SQL section should return:

- section: 07_final_verdict
- data.ok: true

## 4. Next step

Run the SQL file in Supabase SQL Editor and report these sections:

- 06_summary
- 07_final_verdict