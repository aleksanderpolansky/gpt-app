# P4.10.0-C8-O3-C - Live DB Verification Result

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / live DB verification after flagged route runtime test

## 1. Context

P4.10.0-C8-O2 verified that the debug route runtime works with Category Derivation enabled behind the feature flag.

Target runtime test:

- endpoint: /api/activity/debug/free-text-value-object-test
- inputText: walked to work for 15 minutes
- enableCategoryDerivation: true
- categoryDerivationDryRun: true
- categoryDerivationCreatePolicy: suggested_only

Target IDs:

- eventId: 7bf83e7b-02f8-4882-8e7b-419c8843cee2
- derivationRunId: dd0db584-cad7-4925-9e2a-732a0676e174

## 2. SQL used

The live DB verification was executed in Supabase SQL Editor using:

- docs/sql/P4.10.0-C8-O3_verify_route_derivation_rows.sql

## 3. Verified event row

The target activity event exists:

- id: 7bf83e7b-02f8-4882-8e7b-419c8843cee2
- input_text: walked to work for 15 minutes
- title: Walked to work - C8-O2 flagged only
- status: completed
- source: manual_chat
- duration_minutes: 15
- categoryDerivationEnabled: true
- categoryDerivationDryRun: true
- categoryDerivationCreatePolicy: suggested_only

## 4. Verified category_derivation_runs row

The target derivation run exists:

- id: dd0db584-cad7-4925-9e2a-732a0676e174
- activity_event_id: 7bf83e7b-02f8-4882-8e7b-419c8843cee2
- status: completed
- processor_version: category_derivation_v1
- rule_version: rules_v1
- confidence: 0.922
- input_text: walked to work for 15 minutes
- needs_user_confirmation: true

The output_json contains:

- ok: true
- skipped: false
- candidateCount: 5
- resolvedCandidateCount: 0
- unresolvedCandidateCount: 5

## 5. Verified activity_category_derivations rows

Expected row count:

- 5

Actual row count:

- 5

Expected candidate slugs:

- walking
- work
- commute-to-work
- walking-to-work
- duration-minutes

All expected slugs were found.

## 6. Dry run behavior

Because categoryDerivationDryRun was true:

- category_id is null for all 5 derivation rows
- metadata_json.resolutionStatus is unresolved for all 5 derivation rows
- source is rule for all 5 derivation rows
- no contextual_categories creation was required for this verification

This is the expected behavior.

## 7. SQL summary

06_summary returned:

- run_rows_count: 1
- event_rows_count: 1
- derivation_rows_count: 5
- expected_slugs_found_count: 5
- expected_slugs_count: 5
- all_expected_slugs_found: true
- all_category_ids_null_expected_for_dry_run: true
- all_resolution_status_unresolved: true
- all_sources_rule: true

## 8. Final verdict

07_final_verdict returned:

- ok: true
- run_rows_count: 1
- event_rows_count: 1
- derivation_rows_count: 5
- expected_slugs_found_count: 5
- expected_slugs_count: 5
- all_expected_slugs_found: true
- all_category_ids_null_expected_for_dry_run: true
- all_resolution_status_unresolved: true
- all_sources_rule: true

## 9. Conclusion

P4.10.0-C8-O3 result: PASSED.

Live DB verification confirms that the flagged debug route created:

- one activity_events row
- one category_derivation_runs row
- five activity_category_derivations rows

The rows match the expected Category Derivation output for the phrase:

- walked to work for 15 minutes

## 10. Important boundary

value_object_category_links are still not created from Category Derivation candidates.

This is expected.

C8-O only integrates extraction, resolution and persistence into the debug route.

The bridge/category-link integration belongs to C8-P.

## 11. Next step

Proceed to P4.10.0-C8-P:

- inspect current value_object_category_links creation path
- design safe bridge integration for resolved category candidates
- connect resolved category_id values to value_object_category_links
- keep dryRun/unresolved behavior safe
- verify that C8-O behavior remains stable