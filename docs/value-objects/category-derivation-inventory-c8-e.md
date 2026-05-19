# P4.10.0-C8-E — Category Derivation Inventory

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: exact inventory before Category Derivation Layer v1 schema/code implementation
Previous checkpoint: c79ce3d Document category derivation layer design

## Purpose

This document inventories the current schema and implementation surface before implementing Category Derivation Layer v1.

No runtime behavior is changed in this step.

Inventory targets:

- contextual_categories
- entity_classifications
- value_object_category_links
- activity_event_value_object_links
- mapper contracts
- bridge contracts
- free-text fallback metadata
- existing migrations touching categories and Value Object links
- possible existing derivation-related tables or fields

## Git status before inventory

```text
?? docs/value-objects/category-derivation-inventory-c8-e.md
```

## Recent commits

```text
c79ce3d Document category derivation layer design
c8e004d Document free-text value object runtime verification
4fbb9af Add debug free-text value object test route
c0b5386 Enable controlled free-text value object fallback
c46c9d2 Inspect controlled free-text value object fallback
b1601b5 Inspect free-text value object contracts
44a8e51 Document minimal free-text value object design
99cfcaa Inventory free-text value object runtime
5e2dd9a Document minimal value object schema gap analysis
e617400 Inventory category-derived value object foundation
```

## Potentially relevant tracked files

```text
docs/commercial/P4.8.0-A7.1_additive_migration_review.md
docs/commercial/P4.8.0-A7.3_post_migration_verification_result.md
docs/commercial/P4.8.0-A7_additive_migration_plan.md
docs/commercial/P4.8.0-D3.3_shared_helper_explicit_fallback.md
docs/commercial/P4.8.0-D4.3_live_migration_result.md
docs/p4-7-rubricator-inventory-raw.md
docs/p4-7-rubricator-mapping-decision.md
docs/sql/P4.8.0-A7.2_post_migration_verification.sql
docs/sql/P4.8.0-A7_additive_migration_draft.sql
docs/sql/P4.9.2-A4_category_link_runtime_verification.sql
docs/value-object-state-foundation-p4-7.md
docs/value-objects/P4.10.0-A2_repo_activity_processing_reference_inventory.txt
docs/value-objects/P4.10.0-A2_repo_category_rubricator_reference_inventory.txt
docs/value-objects/P4.10.0-A2_repo_value_object_reference_inventory.txt
docs/value-objects/P4.10.0-A3_category_derived_vo_inventory_checkpoint.md
docs/value-objects/P4.10.0-B2_minimal_schema_v4_2_gap_analysis_checkpoint.md
docs/value-objects/P4.10.0-C1_activity_route_file_inventory.txt
docs/value-objects/P4.10.0-C1_free_text_unknown_handling_inventory.txt
docs/value-objects/P4.10.0-C1_key_runtime_files_existence.txt
docs/value-objects/P4.10.0-C1_lib_activity_file_inventory.txt
docs/value-objects/P4.10.0-C1_runtime_processor_reference_inventory.txt
docs/value-objects/P4.10.0-C1_value_object_write_reference_inventory.txt
docs/value-objects/P4.10.0-C2_activity_value_object_lifecycle_evidence.txt
docs/value-objects/P4.10.0-C2_classification_lifecycle_evidence.txt
docs/value-objects/P4.10.0-C2_key_runtime_files_exact.txt
docs/value-objects/P4.10.0-C2_route_callers_evidence.txt
docs/value-objects/P4.10.0-C2_rubricator_value_object_mapper_evidence.txt
docs/value-objects/P4.10.0-C2_runtime_function_map.txt
docs/value-objects/P4.10.0-C2_value_object_bridge_projection_evidence.txt
docs/value-objects/P4.10.0-C3_free_text_processor_runtime_inventory_checkpoint.md
docs/value-objects/P4.10.0-C4_minimal_free_text_v1_design_decision.md
docs/value-objects/P4.10.0-C5_activity_value_object_lifecycle_contract.txt
docs/value-objects/P4.10.0-C5_contract_inspection_summary.txt
docs/value-objects/P4.10.0-C5_exact_contract_inspection_checkpoint.md
docs/value-objects/P4.10.0-C5_key_code_ranges.txt
docs/value-objects/P4.10.0-C5_route_insertion_contract.txt
docs/value-objects/P4.10.0-C5_rubricator_mapper_contract.txt
docs/value-objects/P4.10.0-C5_value_object_bridge_contract.txt
docs/value-objects/P4.10.0-C5b_controlled_fallback_inspection_checkpoint.md
docs/value-objects/P4.10.0-C5b_controlled_fallback_key_ranges.txt
docs/value-objects/P4.10.0-C5b_controlled_fallback_summary.txt
docs/value-objects/P4.10.0-C5b_controlled_text_fallback_mapper_evidence.txt
docs/value-objects/P4.10.0-C5b_lifecycle_flag_usage_evidence.txt
docs/value-objects/P4.10.0-C5b_registry_rules_fallback_evidence.txt
docs/value-objects/P4.10.0-C6-B_previous_activityValueObjectLifecycle.ts.txt
docs/value-objects/P4.10.0-C6-B_previous_rubricatorValueObjectMapper.ts.txt
docs/value-objects/P4.10.0-C6-C_controlled_free_text_fallback_implementation_checkpoint.md
docs/value-objects/P4.10.0-C7-D_debug_free_text_value_object_test_route_checkpoint.md
docs/value-objects/P4.10.0-C7-G_free_text_runtime_verification_checkpoint.md
docs/value-objects/P4.9.0-A1_live_schema_inventory_result.md
docs/value-objects/P4.9.0-A2_v4_2_gap_conclusion.md
docs/value-objects/P4.9.0-A3_local_code_routes_inventory.md
docs/value-objects/P4.9.0-A4_local_code_routes_inventory_conclusion.md
docs/value-objects/P4.9.0-A5_focused_live_schema_check_result.md
docs/value-objects/P4.9.0-A6_minimal_additive_migration_plan.md
docs/value-objects/P4.9.0-A7_live_migration_result.md
docs/value-objects/P4.9.0-A8_foundation_checkpoint.md
docs/value-objects/P4.9.1-A10_runtime_projection_checkpoint.md
docs/value-objects/P4.9.1-A1_runtime_writer_inventory.md
docs/value-objects/P4.9.1-A2_runtime_writer_inventory_conclusion.md
docs/value-objects/P4.9.1-A3_focused_writer_file_inspection.md
docs/value-objects/P4.9.1-A4_full_key_file_extraction.md
docs/value-objects/P4.9.1-A5_function_surface_map.md
docs/value-objects/P4.9.1-A6_hot_path_window_extraction.md
docs/value-objects/P4.9.1-A7_first_runtime_projection_plan.md
docs/value-objects/P4.9.1-A8_code_change_result.md
docs/value-objects/P4.9.1-A9_runtime_verification_result.md
docs/value-objects/P4.9.10-A1_debug_admin_guard_conventions_inspection.md
docs/value-objects/P4.9.10-A2_object_cloud_debug_exposure_guard_code_change_result.md
docs/value-objects/P4.9.10-A3_object_cloud_debug_guard_local_runtime_test_result.md
docs/value-objects/P4.9.10-A4_object_cloud_debug_guard_checkpoint.md
docs/value-objects/P4.9.11-A1_parent_child_value_object_read_model_audit_plan.md
docs/value-objects/P4.9.11-A2_parent_child_value_object_read_model_audit_result.md
docs/value-objects/P4.9.11-A3_parent_child_value_object_read_model_checkpoint.md
docs/value-objects/P4.9.12-A1_controlled_parent_child_value_object_hierarchy_strategy.md
docs/value-objects/P4.9.12-A1_hierarchy_strategy_checkpoint.md
docs/value-objects/P4.9.12-A2_value_object_hierarchy_profile_view_plan.md
docs/value-objects/P4.9.12-A3_value_object_hierarchy_profile_view_verification_result.md
docs/value-objects/P4.9.12-A4_controlled_hierarchy_strategy_and_read_model_checkpoint.md
docs/value-objects/P4.9.13-A1_controlled_hierarchy_candidate_audit_plan.md
docs/value-objects/P4.9.13-A2_controlled_hierarchy_candidate_audit_result.md
docs/value-objects/P4.9.13-A3_controlled_hierarchy_candidate_audit_checkpoint.md
docs/value-objects/P4.9.14-A1_value_object_identity_display_readiness_audit_plan.md
docs/value-objects/P4.9.14-A2_value_object_identity_display_readiness_audit_result.md
docs/value-objects/P4.9.14-A3_value_object_identity_display_readiness_checkpoint.md
docs/value-objects/P4.9.15-A1_controlled_first_hierarchy_write_strategy_audit_plan.md
docs/value-objects/P4.9.15-A2_controlled_first_hierarchy_write_strategy_audit_result.md
docs/value-objects/P4.9.15-A3_controlled_first_hierarchy_write_strategy_checkpoint.md
docs/value-objects/P4.9.15-A4_exact_preview_checkpoint.md
docs/value-objects/P4.9.15-A4_exact_preview_learning_business_german_hierarchy_write_plan.md
docs/value-objects/P4.9.15-A4_exact_preview_learning_business_german_hierarchy_write_result.md
docs/value-objects/P4.9.15-A5_guarded_write_checkpoint.md
docs/value-objects/P4.9.15-A5_guarded_write_learning_business_german_hierarchy_plan.md
docs/value-objects/P4.9.15-A5_guarded_write_learning_business_german_hierarchy_result.md
docs/value-objects/P4.9.15-A6_verification_checkpoint.md
docs/value-objects/P4.9.15-A6_verify_first_hierarchy_write_learning_business_german_plan.md
docs/value-objects/P4.9.15-A6_verify_first_hierarchy_write_learning_business_german_result.md
docs/value-objects/P4.9.16-A1_debug_api_ui_hierarchy_read_side_inspection.md
docs/value-objects/P4.9.16-A2_current_debug_api_route_full.ts.txt
docs/value-objects/P4.9.16-A2_current_debug_ui_page_full.tsx.txt
docs/value-objects/P4.9.16-A3_hierarchy_aware_debug_api_route_change_result.md
docs/value-objects/P4.9.16-A4_hierarchy_aware_debug_api_checkpoint.md
docs/value-objects/P4.9.16-A4_hierarchy_aware_debug_api_retest_result.md
docs/value-objects/P4.9.16-A4_hierarchy_aware_debug_api_retest_snapshot.json
docs/value-objects/P4.9.17-A1_previous_debug_cloud_profile_page_full.tsx.txt
docs/value-objects/P4.9.17-A4_hierarchy_aware_debug_ui_checkpoint.md
docs/value-objects/P4.9.2-A1_category_link_live_source_proof.md
docs/value-objects/P4.9.2-A2_category_link_runtime_integration_plan.md
docs/value-objects/P4.9.2-A3_category_link_code_change_result.md
docs/value-objects/P4.9.2-A4_category_link_runtime_verification_result.md
docs/value-objects/P4.9.2-A5_category_link_runtime_checkpoint.md
docs/value-objects/P4.9.3-A1_broaden_verification_audit_result.md
docs/value-objects/P4.9.3-A2_knee_template_runtime_verification_result.md
docs/value-objects/P4.9.3-A3_broadened_runtime_verification_checkpoint.md
docs/value-objects/P4.9.4-A1_object_cloud_read_audit_plan.md
docs/value-objects/P4.9.4-A2_object_cloud_read_audit_result.md
docs/value-objects/P4.9.4-A3_object_cloud_read_layer_checkpoint.md
docs/value-objects/P4.9.5-A1_object_cloud_sql_view_plan.md
docs/value-objects/P4.9.5-A2_object_cloud_sql_view_verification_result.md
docs/value-objects/P4.9.5-A3_reusable_object_cloud_read_interface_checkpoint.md
docs/value-objects/P4.9.6-A1_object_cloud_view_query_examples_plan.md
docs/value-objects/P4.9.6-A2_object_cloud_view_query_examples_verification_result.md
docs/value-objects/P4.9.6-A3_object_cloud_query_examples_checkpoint.md
docs/value-objects/P4.9.7-A1_api_route_conventions_inspection.md
docs/value-objects/P4.9.7-A2_focused_api_files_extraction.md
docs/value-objects/P4.9.7-A3_object_cloud_debug_api_endpoint_code_change_result.md
docs/value-objects/P4.9.7-A4_object_cloud_debug_api_endpoint_runtime_verification_result.md
docs/value-objects/P4.9.7-A5_object_cloud_debug_api_endpoint_checkpoint.md
docs/value-objects/P4.9.8-A1_ui_page_conventions_inspection.md
docs/value-objects/P4.9.8-A2_object_cloud_debug_ui_page_code_change_result.md
docs/value-objects/P4.9.8-A3_object_cloud_debug_ui_page_runtime_verification_result.md
docs/value-objects/P4.9.8-A4_object_cloud_debug_ui_page_checkpoint.md
docs/value-objects/P4.9.9-A1_object_cloud_security_read_exposure_inspection.md
docs/value-objects/P4.9.9-A2_object_cloud_security_boundary_runtime_test_result.md
docs/value-objects/P4.9.9-A3_object_cloud_security_read_exposure_checkpoint.md
docs/value-objects/category-derivation-layer-v1.md
lib/activity/activityProcessingLogs.ts
lib/activity/activityRubricatorClassificationLifecycle.ts
lib/activity/knownTemplateRubricatorRules.ts
lib/activity/rubricatorResolverLogMetadata.ts
lib/activity/rubricatorValueObjectMapper.ts
lib/activity/valueObjectBridge.ts
lib/supabase.ts
lib/value-objects/objectCloudDebugGuard.ts
src/app/admin/object-action/categories/CategoryAdminButtons.tsx
src/app/admin/object-action/categories/page.tsx
src/app/admin/object-action/classifications/page.tsx
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts
src/app/api/activity/debug/free-text-value-object-test/route.ts
src/app/api/object-action/categories/audit-verify/route.ts
src/app/api/object-action/categories/route.ts
src/app/api/value-objects/debug/cloud-profile/route.ts
src/app/api/value-objects/route.ts
src/app/value-objects/debug/cloud-profile/page.tsx
src/app/value-objects/new/page.tsx
src/app/value-objects/page.tsx
supabase/migrations/001_object_action_backbone.sql
supabase/migrations/002_seed_object_action_rubricator.sql
supabase/migrations/003_backfill_organization_directory_classifications.sql
supabase/migrations/004_enable_object_action_rls.sql
supabase/migrations/005_create_object_action_read_views_and_rpc.sql
supabase/migrations/006_seed_core_object_action_examples.sql
supabase/migrations/007_create_object_action_suggestion_requests.sql
supabase/migrations/008_create_platform_admins.sql
supabase/migrations/009_update_object_action_suggestion_admin_decision_constraint.sql
supabase/migrations/010_create_object_action_suggestion_events.sql
supabase/migrations/011_update_object_action_suggestion_request_source_constraint.sql
supabase/migrations/012_activity_recording_backbone.sql
supabase/migrations/013_activity_templates_v2.sql
supabase/migrations/014_activity_events_v2_template_link.sql
supabase/migrations/015_activity_impact_rules_v2_template_link.sql
supabase/migrations/016_activity_atomic_aggregate_updates.sql
supabase/migrations/017_activity_corrections.sql
supabase/migrations/018_activity_corrections_status_rollback.sql
supabase/migrations/019_activity_security_foundation.sql
supabase/migrations/020_activity_raw_signals.sql
supabase/migrations/021_activity_processing_logs.sql
supabase/migrations/022_activity_processing_logs_complete_event_stage.sql
supabase/migrations/023_value_object_state_foundation_p4_7.sql
supabase/migrations/024_activity_template_known_registry_rules.sql
supabase/migrations/025_p4_8_0_add_commercial_usage_and_purchase_currency.sql
supabase/migrations/026_p4_8_0_drop_obsolete_purchase_confirmations_currency.sql
```

## Potential schema / migration files

```text
docs/commercial/P4.8.0-A7.1_additive_migration_review.md
docs/commercial/P4.8.0-A7.3_post_migration_verification_result.md
docs/commercial/P4.8.0-A7_additive_migration_plan.md
docs/commercial/P4.8.0-D4.3_live_migration_result.md
docs/sql/P4.7.8-R-K1_known_template_chain_audit.sql
docs/sql/P4.7.8-R-L3_lightweight_known_template_chain_audit.sql
docs/sql/P4.7.8-R-L5_second_known_template_seed_and_audit.sql
docs/sql/P4.7.8-R-L6_second_known_template_cross_route_audit.sql
docs/sql/P4.7.8-R-L7_final_two_template_three_route_audit.sql
docs/sql/P4.7.9-R-A12_registry_table_seed_and_audit.sql
docs/sql/P4.7.9-R-A3_known_template_metadata_normalization.sql
docs/sql/P4.8.0-A2_live_schema_inventory.sql
docs/sql/P4.8.0-A6_live_structural_verification.sql
docs/sql/P4.8.0-A7.2_post_migration_verification.sql
docs/sql/P4.8.0-A7_additive_migration_draft.sql
docs/sql/P4.8.0-B1.2_purchase_confirmation_currency_contract_check.sql
docs/sql/P4.8.0-C1_organization_country_currency_live_check.sql
docs/sql/P4.8.0-D4.3_retire_purchase_confirmations_currency.sql
docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql
docs/sql/P4.9.1-A9_runtime_projection_verification.sql
docs/sql/P4.9.11-A1_parent_child_value_object_read_model_audit.sql
docs/sql/P4.9.12-A2_create_value_object_hierarchy_profiles_v1.sql
docs/sql/P4.9.13-A1_controlled_hierarchy_candidate_audit.sql
docs/sql/P4.9.14-A1_value_object_identity_display_readiness_audit.sql
docs/sql/P4.9.15-A1_controlled_first_hierarchy_write_strategy_audit.sql
docs/sql/P4.9.15-A4_exact_preview_learning_business_german_hierarchy_write.sql
docs/sql/P4.9.15-A5-D1_after_failed_guarded_write_diagnostic.sql
docs/sql/P4.9.15-A5_guarded_write_learning_business_german_hierarchy.sql
docs/sql/P4.9.15-A5_rollback_learning_business_german_hierarchy_template.sql
docs/sql/P4.9.15-A6_verify_first_hierarchy_write_learning_business_german.sql
docs/sql/P4.9.2-A4_category_link_runtime_verification.sql
docs/sql/P4.9.3-A2_knee_template_runtime_verification.sql
docs/sql/P4.9.4-A1_object_cloud_read_audit.sql
docs/sql/P4.9.5-A1_create_value_object_cloud_profiles_v1.sql
docs/sql/P4.9.6-A1_value_object_cloud_view_query_examples.sql
docs/value-objects/P4.9.0-A6_minimal_additive_migration_plan.md
docs/value-objects/P4.9.0-A7_live_migration_result.md
lib/supabase.ts
supabase/migrations/001_object_action_backbone.sql
supabase/migrations/002_seed_object_action_rubricator.sql
supabase/migrations/003_backfill_organization_directory_classifications.sql
supabase/migrations/004_enable_object_action_rls.sql
supabase/migrations/005_create_object_action_read_views_and_rpc.sql
supabase/migrations/006_seed_core_object_action_examples.sql
supabase/migrations/007_create_object_action_suggestion_requests.sql
supabase/migrations/008_create_platform_admins.sql
supabase/migrations/009_update_object_action_suggestion_admin_decision_constraint.sql
supabase/migrations/010_create_object_action_suggestion_events.sql
supabase/migrations/011_update_object_action_suggestion_request_source_constraint.sql
supabase/migrations/012_activity_recording_backbone.sql
supabase/migrations/013_activity_templates_v2.sql
supabase/migrations/014_activity_events_v2_template_link.sql
supabase/migrations/015_activity_impact_rules_v2_template_link.sql
supabase/migrations/016_activity_atomic_aggregate_updates.sql
supabase/migrations/017_activity_corrections.sql
supabase/migrations/018_activity_corrections_status_rollback.sql
supabase/migrations/019_activity_security_foundation.sql
supabase/migrations/020_activity_raw_signals.sql
supabase/migrations/021_activity_processing_logs.sql
supabase/migrations/022_activity_processing_logs_complete_event_stage.sql
supabase/migrations/023_value_object_state_foundation_p4_7.sql
supabase/migrations/024_activity_template_known_registry_rules.sql
supabase/migrations/025_p4_8_0_add_commercial_usage_and_purchase_currency.sql
supabase/migrations/026_p4_8_0_drop_obsolete_purchase_confirmations_currency.sql
```

## References: contextual_categories

```text
docs/commercial/P4.8.0-A2_schema_inventory_raw.md
84:| contextual_categories | 76 | 8 | 16 | supabase\migrations\001_object_action_backbone.sql:300<br>supabase\migrations\001_object_action_backbone.sql:303<br>supabase\migrations\001_object_action_backbone.sql:350 |
227:### contextual_categories
230:supabase\migrations\001_object_action_backbone.sql:300: create table if not exists contextual_categories (
231:supabase\migrations\001_object_action_backbone.sql:303: parent_id uuid references contextual_categories(id) on delete set null,
232:supabase\migrations\001_object_action_backbone.sql:371: contextual_category_id uuid references contextual_categories(id) on delete restrict,
233:supabase\migrations\001_object_action_backbone.sql:525: contextual_category_id uuid not null references contextual_categories(id) on delete cascade,
234:supabase\migrations\007_create_object_action_suggestion_requests.sql:33: ai_suggested_contextual_category_id uuid references contextual_categories(id) on delete set null,
235:supabase\migrations\007_create_object_action_suggestion_requests.sql:34: matched_existing_category_id uuid references contextual_categories(id) on delete set null,
236:supabase\migrations\010_create_object_action_suggestion_events.sql:21: matched_existing_category_id uuid null references contextual_categories(id),
237:supabase\migrations\010_create_object_action_suggestion_events.sql:22: created_contextual_category_id uuid null references contextual_categories(id),

docs/commercial/P4.8.0-A3_focused_critical_routes_review.md
579:| 373 | supabase.rpc("get_contextual_categories", { |

docs/commercial/P4.8.0-A3_focused_critical_routes_review_v2.md
795:| 373 | supabase.rpc("get_contextual_categories", { |

docs/commercial/P4.8.0-A4b_offer_items_semantic_check.md
166:| supabase/migrations/001_object_action_backbone.sql | 300 | create table if not exists contextual_categories ( |

docs/p4-7-rubricator-inventory-raw.md
125:- .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
181:- .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
240:- .\supabase\migrations\002_seed_object_action_rubricator.sql:399 - on contextual_categories.context_id = contexts.id
244:- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:58 - on contextual_categories.context_id = contexts.id
249:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:25 - on contexts.id = contextual_categories.context_id
255:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:114 - on contexts.id = contextual_categories.context_id
311:## Term: contextual_categories
332:- .\supabase\migrations\001_object_action_backbone.sql:300 - create table if not exists contextual_categories (
333:- .\supabase\migrations\001_object_action_backbone.sql:303 - parent_id uuid references contextual_categories(id) on delete set null,
334:- .\supabase\migrations\001_object_action_backbone.sql:314 - constraint contextual_categories_slug_not_empty
335:- .\supabase\migrations\001_object_action_backbone.sql:317 - constraint contextual_categories_name_not_empty
336:- .\supabase\migrations\001_object_action_backbone.sql:320 - constraint contextual_categories_status_allowed
337:- .\supabase\migrations\001_object_action_backbone.sql:335 - constraint contextual_categories_source_type_allowed
338:- .\supabase\migrations\001_object_action_backbone.sql:349 - create unique index if not exists contextual_categories_context_slug_unique_idx
339:- .\supabase\migrations\001_object_action_backbone.sql:350 - on contextual_categories (context_id, lower(slug));
340:- .\supabase\migrations\001_object_action_backbone.sql:352 - create index if not exists contextual_categories_context_id_idx
341:- .\supabase\migrations\001_object_action_backbone.sql:353 - on contextual_categories (context_id);
342:- .\supabase\migrations\001_object_action_backbone.sql:355 - create index if not exists contextual_categories_parent_id_idx
343:- .\supabase\migrations\001_object_action_backbone.sql:356 - on contextual_categories (parent_id);
344:- .\supabase\migrations\001_object_action_backbone.sql:358 - create index if not exists contextual_categories_status_idx
345:- .\supabase\migrations\001_object_action_backbone.sql:359 - on contextual_categories (status);
346:- .\supabase\migrations\001_object_action_backbone.sql:361 - create index if not exists contextual_categories_is_active_idx
347:- .\supabase\migrations\001_object_action_backbone.sql:362 - on contextual_categories (is_active);
348:- .\supabase\migrations\001_object_action_backbone.sql:371 - contextual_category_id uuid references contextual_categories(id) on delete restrict,
349:- .\supabase\migrations\001_object_action_backbone.sql:525 - contextual_category_id uuid not null references contextual_categories(id) on delete cascade,
350:- .\supabase\migrations\001_object_action_backbone.sql:659 - select 1 from pg_trigger where tgname = 'contextual_categories_set_updated_at'
351:- .\supabase\migrations\001_object_action_backbone.sql:661 - create trigger contextual_categories_set_updated_at
352:- .\supabase\migrations\001_object_action_backbone.sql:662 - before update on contextual_categories
353:- .\supabase\migrations\002_seed_object_action_rubricator.sql:175 - insert into contextual_categories (
354:- .\supabase\migrations\002_seed_object_action_rubricator.sql:240 - from contextual_categories existing
355:- .\supabase\migrations\002_seed_object_action_rubricator.sql:377 - contextual_categories.id,
356:- .\supabase\migrations\002_seed_object_action_rubricator.sql:398 - join contextual_categories
357:- .\supabase\migrations\002_seed_object_action_rubricator.sql:399 - on contextual_categories.context_id = contexts.id
358:- .\supabase\migrations\002_seed_object_action_rubricator.sql:400 - and lower(contextual_categories.slug) = lower(seed.category_slug)
359:- .\supabase\migrations\002_seed_object_action_rubricator.sql:404 - where existing.contextual_category_id = contextual_categories.id
360:- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:24 - contextual_categories.id as contextual_category_id,
361:- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:57 - join contextual_categories
362:- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:58 - on contextual_categories.context_id = contexts.id
363:- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:59 - and lower(contextual_categories.slug) = lower(business_categories.slug)
364:- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:68 - and existing.contextual_category_id = contextual_categories.id
365:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:3 - create or replace view public_contextual_categories
366:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:7 - contextual_categories.id as category_id,
367:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:8 - contextual_categories.context_id,
368:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:11 - contextual_categories.parent_id,
369:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:14 - contextual_categories.slug as category_slug,
370:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:15 - contextual_categories.name as category_default_name,
371:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:16 - contextual_categories.description as category_default_description,
372:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:17 - contextual_categories.status,
373:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:18 - contextual_categories.source_type,
374:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:19 - contextual_categories.sort_order,
375:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:20 - contextual_categories.is_active,
376:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:21 - contextual_categories.created_at,
377:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:22 - contextual_categories.updated_at
378:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:23 - from contextual_categories
379:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:25 - on contexts.id = contextual_categories.context_id
380:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:26 - left join contextual_categories parent_categories
381:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:27 - on parent_categories.id = contextual_categories.parent_id
382:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:28 - where contextual_categories.is_active = true
383:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:29 - and contextual_categories.status in ('approved', 'published')
384:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:33 - create or replace view directory_contextual_categories
385:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:37 - public_contextual_categories.category_id,
386:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:38 - public_contextual_categories.context_id,
387:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:39 - public_contextual_categories.context_code,
388:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:40 - public_contextual_categories.parent_id,
389:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:41 - public_contextual_categories.parent_slug,
390:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:42 - public_contextual_categories.parent_default_name,
391:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:43 - public_contextual_categories.category_slug,
447:- .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
1152:| contextual_categories | TBD | TBD | TBD | TBD | TBD | inventory needed |
1170:| contextual_categories | EXISTS | RLS_ENABLED | 1 |
1193:- contextual_categories

docs/p4-7-rubricator-mapping-decision.md
34:- contextual_categories
134:- entity_classifications / contextual_categories remain canonical classification records;
201:- read existing entity_classifications/contextual_categories if available;

docs/sql/P4.7.8-R-L5_second_known_template_seed_and_audit.sql
482:      from public.contextual_categories cc

docs/sql/P4.7.9-R-A3_known_template_metadata_normalization.sql
365:  left join public.contextual_categories cc

docs/sql/P4.8.0-A2_live_schema_inventory.sql
24:  ('contextual_categories'),
95:  ('contextual_categories'),
163:  ('contextual_categories'),
232:  ('contextual_categories'),
296:  ('contextual_categories'),
364:  ('contextual_categories'),

docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql
95:  category_table text NOT NULL DEFAULT 'contextual_categories',
105:      'contextual_categories',
108:      'object_action_contextual_categories'

docs/sql/P4.9.13-A1_controlled_hierarchy_candidate_audit.sql
48:  LEFT JOIN public.contextual_categories cc
49:    ON cl.category_table = 'contextual_categories'

docs/sql/P4.9.14-A1_value_object_identity_display_readiness_audit.sql
65:  LEFT JOIN public.contextual_categories cc
66:    ON cl.category_table = 'contextual_categories'

docs/sql/P4.9.2-A4_category_link_runtime_verification.sql
81:  LEFT JOIN public.contextual_categories cc
82:    ON cl.category_table = 'contextual_categories'

docs/sql/P4.9.3-A2_knee_template_runtime_verification.sql
112:  LEFT JOIN public.contextual_categories cc
113:    ON cl.category_table = 'contextual_categories'

docs/sql/P4.9.4-A1_object_cloud_read_audit.sql
15:  contextual_categories
38:  LEFT JOIN public.contextual_categories cc
39:    ON cl.category_table = 'contextual_categories'

docs/sql/P4.9.5-A1_create_value_object_cloud_profiles_v1.sql
15:- contextual_categories
46:  LEFT JOIN public.contextual_categories cc
47:    ON cl.category_table = 'contextual_categories'

docs/value-objects/P4.10.0-A2_repo_category_rubricator_reference_inventory.txt
150:C:\Users\Admin\Documents\projects\gpt-app\docs\commercial\P4.8.0-A2_schema_inventory_raw.md:84: | contextual_categories | 76 | 8 | 16 | supabase\migrations\001_object_action_backbone.sql:300<br>supabase\migrations\001_object_action_backbone.sql:303<br>supabase\migrations\001_object_action_backbone.sql:350 |
168:C:\Users\Admin\Documents\projects\gpt-app\docs\commercial\P4.8.0-A2_schema_inventory_raw.md:227: ### contextual_categories
169:C:\Users\Admin\Documents\projects\gpt-app\docs\commercial\P4.8.0-A2_schema_inventory_raw.md:230: supabase\migrations\001_object_action_backbone.sql:300: create table if not exists contextual_categories (
170:C:\Users\Admin\Documents\projects\gpt-app\docs\commercial\P4.8.0-A2_schema_inventory_raw.md:231: supabase\migrations\001_object_action_backbone.sql:303: parent_id uuid references contextual_categories(id) on delete set null,
171:C:\Users\Admin\Documents\projects\gpt-app\docs\commercial\P4.8.0-A2_schema_inventory_raw.md:232: supabase\migrations\001_object_action_backbone.sql:371: contextual_category_id uuid references contextual_categories(id) on delete restrict,
172:C:\Users\Admin\Documents\projects\gpt-app\docs\commercial\P4.8.0-A2_schema_inventory_raw.md:233: supabase\migrations\001_object_action_backbone.sql:525: contextual_category_id uuid not null references contextual_categories(id) on delete cascade,
173:C:\Users\Admin\Documents\projects\gpt-app\docs\commercial\P4.8.0-A2_schema_inventory_raw.md:234: supabase\migrations\007_create_object_action_suggestion_requests.sql:33: ai_suggested_contextual_category_id uuid references contextual_categories(id) on delete set null,
174:C:\Users\Admin\Documents\projects\gpt-app\docs\commercial\P4.8.0-A2_schema_inventory_raw.md:235: supabase\migrations\007_create_object_action_suggestion_requests.sql:34: matched_existing_category_id uuid references contextual_categories(id) on delete set null,
175:C:\Users\Admin\Documents\projects\gpt-app\docs\commercial\P4.8.0-A2_schema_inventory_raw.md:236: supabase\migrations\010_create_object_action_suggestion_events.sql:21: matched_existing_category_id uuid null references contextual_categories(id),
176:C:\Users\Admin\Documents\projects\gpt-app\docs\commercial\P4.8.0-A2_schema_inventory_raw.md:237: supabase\migrations\010_create_object_action_suggestion_events.sql:22: created_contextual_category_id uuid null references contextual_categories(id),
209:C:\Users\Admin\Documents\projects\gpt-app\docs\commercial\P4.8.0-A3_focused_critical_routes_review.md:579: | 373 | supabase.rpc("get_contextual_categories", { |
211:C:\Users\Admin\Documents\projects\gpt-app\docs\commercial\P4.8.0-A3_focused_critical_routes_review_v2.md:795: | 373 | supabase.rpc("get_contextual_categories", { |
218:C:\Users\Admin\Documents\projects\gpt-app\docs\commercial\P4.8.0-A4b_offer_items_semantic_check.md:166: | supabase/migrations/001_object_action_backbone.sql | 300 | create table if not exists contextual_categories ( |
241:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.7.8-R-L5_second_known_template_seed_and_audit.sql:482: from public.contextual_categories cc
312:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.7.9-R-A3_known_template_metadata_normalization.sql:365: left join public.contextual_categories cc
330:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.8.0-A2_live_schema_inventory.sql:24: ('contextual_categories'),
333:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.8.0-A2_live_schema_inventory.sql:95: ('contextual_categories'),
336:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.8.0-A2_live_schema_inventory.sql:163: ('contextual_categories'),
339:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.8.0-A2_live_schema_inventory.sql:232: ('contextual_categories'),
342:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.8.0-A2_live_schema_inventory.sql:296: ('contextual_categories'),
345:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.8.0-A2_live_schema_inventory.sql:364: ('contextual_categories'),
354:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:95: category_table text NOT NULL DEFAULT 'contextual_categories',
359:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:105: 'contextual_categories',
360:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:108: 'object_action_contextual_categories'
423:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.13-A1_controlled_hierarchy_candidate_audit.sql:48: LEFT JOIN public.contextual_categories cc
424:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.13-A1_controlled_hierarchy_candidate_audit.sql:49: ON cl.category_table = 'contextual_categories'
475:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.14-A1_value_object_identity_display_readiness_audit.sql:65: LEFT JOIN public.contextual_categories cc
476:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.14-A1_value_object_identity_display_readiness_audit.sql:66: ON cl.category_table = 'contextual_categories'
571:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:81: LEFT JOIN public.contextual_categories cc
572:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:82: ON cl.category_table = 'contextual_categories'
601:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:112: LEFT JOIN public.contextual_categories cc
602:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:113: ON cl.category_table = 'contextual_categories'
620:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.4-A1_object_cloud_read_audit.sql:15: contextual_categories
635:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.4-A1_object_cloud_read_audit.sql:38: LEFT JOIN public.contextual_categories cc
636:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.4-A1_object_cloud_read_audit.sql:39: ON cl.category_table = 'contextual_categories'
666:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.5-A1_create_value_object_cloud_profiles_v1.sql:15: - contextual_categories
681:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.5-A1_create_value_object_cloud_profiles_v1.sql:46: LEFT JOIN public.contextual_categories cc
682:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.5-A1_create_value_object_cloud_profiles_v1.sql:47: ON cl.category_table = 'contextual_categories'
755:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A1_live_schema_inventory_result.md:40: - contextual_categories
758:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A1_live_schema_inventory_result.md:43: - object_action_contextual_categories
759:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A1_live_schema_inventory_result.md:67: - contextual_categories: about 54 rows
762:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A1_live_schema_inventory_result.md:142: contextual_categories already has:
763:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A1_live_schema_inventory_result.md:154: object_action_contextual_categories connects object-action affordances with contextual categories.
768:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A2_v4_2_gap_conclusion.md:30: - contextual_categories as initial global category/rubricator layer
778:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:15: - contextual_categories and object-action rubricator tables
782:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:73: contextual_categories|contextual_category_events|contextual_category_translations|object_action_contextual_categories|business_categories|organization_categories|rubric|category
784:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:81: | lib/activity/activityRubricatorClassificationLifecycle.ts | 221 | .from("contextual_categories") |
822:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:119: | lib/activity/rubricatorValueObjectMapper.ts | 360 | \| "contextual_categories", |
824:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:121: | lib/activity/rubricatorValueObjectMapper.ts | 394 | readLookupRow(supabase, "contextual_categories", contextualCategoryId), |
828:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:125: | lib/objectAction/queries.ts | 462 | const { data, error } = await supabase.rpc("get_contextual_categories", { |
833:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:130: | lib/objectAction/queries.ts | 570 | .from("contextual_categories") |
871:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:168: | lib/objectAction/suggestionAnalysis.ts | 322 | "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.", |
926:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:223: | src/app/admin/object-action/categories/page.tsx | 596 | .from("contextual_categories") |
965:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:597: | lib/activity/activityRubricatorClassificationLifecycle.ts | 221 | .from("contextual_categories") |
984:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:684: | lib/objectAction/queries.ts | 462 | const { data, error } = await supabase.rpc("get_contextual_categories", { |
987:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:691: | lib/objectAction/queries.ts | 570 | .from("contextual_categories") |
988:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:701: | src/app/admin/object-action/categories/page.tsx | 596 | .from("contextual_categories") |
993:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:729: | src/app/admin/object-action/classifications/page.tsx | 625 | .from("contextual_categories") |
996:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A4_local_code_routes_inventory_conclusion.md:32: | contextual_categories | 14 |
997:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A4_local_code_routes_inventory_conclusion.md:33: | object_action_contextual_categories | 1 |
1014:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A5_focused_live_schema_check_result.md:15: - contextual_categories
1015:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A5_focused_live_schema_check_result.md:16: - object_action_contextual_categories
1042:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A8_foundation_checkpoint.md:79: 2. decide how to create value_object_category_links from contextual_categories
1063:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:416: contextual_categories|object_action_contextual_categories|contextual_category|rubric|object_type_code|action_type_code|context_code|category
1066:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:425: | docs/sql/P4.7.8-R-L5_second_known_template_seed_and_audit.sql | 482 | from public.contextual_categories cc |
1124:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:507: | docs/sql/P4.7.9-R-A3_known_template_metadata_normalization.sql | 365 | left join public.contextual_categories cc |
1140:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:526: | docs/sql/P4.8.0-A2_live_schema_inventory.sql | 24 | ('contextual_categories'), |
1141:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:527: | docs/sql/P4.8.0-A2_live_schema_inventory.sql | 95 | ('contextual_categories'), |
1142:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:528: | docs/sql/P4.8.0-A2_live_schema_inventory.sql | 163 | ('contextual_categories'), |
1143:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:529: | docs/sql/P4.8.0-A2_live_schema_inventory.sql | 232 | ('contextual_categories'), |
1144:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:530: | docs/sql/P4.8.0-A2_live_schema_inventory.sql | 296 | ('contextual_categories'), |
1145:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:531: | docs/sql/P4.8.0-A2_live_schema_inventory.sql | 364 | ('contextual_categories'), |
1152:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:538: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 95 | category_table text NOT NULL DEFAULT 'contextual_categories', |
1157:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:543: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 105 | 'contextual_categories', |
1158:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:544: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 108 | 'object_action_contextual_categories' |
1175:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:561: | lib/activity/activityRubricatorClassificationLifecycle.ts | 221 | .from("contextual_categories") |
1216:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:614: | lib/activity/rubricatorValueObjectMapper.ts | 360 | \| "contextual_categories", |
1218:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:616: | lib/activity/rubricatorValueObjectMapper.ts | 394 | readLookupRow(supabase, "contextual_categories", contextualCategoryId), |
1222:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:620: | lib/objectAction/queries.ts | 462 | const { data, error } = await supabase.rpc("get_contextual_categories", { |
1227:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:629: | lib/objectAction/queries.ts | 570 | .from("contextual_categories") |
1266:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:777: | lib/activity/activityRubricatorClassificationLifecycle.ts | 221 | .from("contextual_categories") |
1285:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:864: | lib/objectAction/queries.ts | 462 | const { data, error } = await supabase.rpc("get_contextual_categories", { |
1288:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:871: | lib/objectAction/queries.ts | 570 | .from("contextual_categories") |
1289:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:916: | src/app/admin/object-action/categories/page.tsx | 596 | .from("contextual_categories") |
1294:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:944: | src/app/admin/object-action/classifications/page.tsx | 625 | .from("contextual_categories") |
1298:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A2_runtime_writer_inventory_conclusion.md:39: | contextual_categories | 22 |
1299:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A2_runtime_writer_inventory_conclusion.md:40: | object_action_contextual_categories | 2 |
1368:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1115: 360:     | "contextual_categories",
1372:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1149: 394:       readLookupRow(supabase, "contextual_categories", contextualCategoryId),
1699:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1177: 917:         category_table: "contextual_categories",
1700:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1182: 917:         category_table: "contextual_categories",
2179:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.13-A1_controlled_hierarchy_candidate_audit_plan.md:18: - public.contextual_categories
2192:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.14-A1_value_object_identity_display_readiness_audit_plan.md:20: - public.contextual_categories
2242:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:15: - resolved_contextual_categories_count: 1
2244:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:22: - category_table: contextual_categories
2265:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:58: - category_table = contextual_categories
2292:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A4_category_link_runtime_verification_result.md:81: - category_table: contextual_categories
2306:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A5_category_link_runtime_checkpoint.md:19: - category_table: contextual_categories
2336:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.3-A2_knee_template_runtime_verification_result.md:90: - category_table: contextual_categories
2356:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.3-A3_broadened_runtime_verification_checkpoint.md:86: - contextual_categories
2361:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A1_object_cloud_read_audit_plan.md:23: - contextual_categories
2365:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A2_object_cloud_read_audit_result.md:17: - contextual_categories
2385:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A3_object_cloud_read_layer_checkpoint.md:24: - contextual_categories
2391:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.5-A1_object_cloud_sql_view_plan.md:19: - contextual_categories
2412:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.5-A3_reusable_object_cloud_read_interface_checkpoint.md:28: - contextual_categories
2619:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.9-A1_object_cloud_security_read_exposure_inspection.md:831: 15: - contextual_categories
2765:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:125: - .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
2802:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:181: - .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
2842:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:240: - .\supabase\migrations\002_seed_object_action_rubricator.sql:399 - on contextual_categories.context_id = contexts.id
2843:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:244: - .\supabase\migrations\003_backfill_organization_directory_classifications.sql:58 - on contextual_categories.context_id = contexts.id
2847:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:249: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:25 - on contexts.id = contextual_categories.context_id
2853:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:255: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:114 - on contexts.id = contextual_categories.context_id
2889:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:311: ## Term: contextual_categories
2895:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:332: - .\supabase\migrations\001_object_action_backbone.sql:300 - create table if not exists contextual_categories (
2896:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:333: - .\supabase\migrations\001_object_action_backbone.sql:303 - parent_id uuid references contextual_categories(id) on delete set null,
2897:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:334: - .\supabase\migrations\001_object_action_backbone.sql:314 - constraint contextual_categories_slug_not_empty
2898:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:335: - .\supabase\migrations\001_object_action_backbone.sql:317 - constraint contextual_categories_name_not_empty
2899:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:336: - .\supabase\migrations\001_object_action_backbone.sql:320 - constraint contextual_categories_status_allowed
2900:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:337: - .\supabase\migrations\001_object_action_backbone.sql:335 - constraint contextual_categories_source_type_allowed
2901:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:338: - .\supabase\migrations\001_object_action_backbone.sql:349 - create unique index if not exists contextual_categories_context_slug_unique_idx
2902:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:339: - .\supabase\migrations\001_object_action_backbone.sql:350 - on contextual_categories (context_id, lower(slug));
2903:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:340: - .\supabase\migrations\001_object_action_backbone.sql:352 - create index if not exists contextual_categories_context_id_idx
2904:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:341: - .\supabase\migrations\001_object_action_backbone.sql:353 - on contextual_categories (context_id);
2905:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:342: - .\supabase\migrations\001_object_action_backbone.sql:355 - create index if not exists contextual_categories_parent_id_idx
2906:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:343: - .\supabase\migrations\001_object_action_backbone.sql:356 - on contextual_categories (parent_id);
2907:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:344: - .\supabase\migrations\001_object_action_backbone.sql:358 - create index if not exists contextual_categories_status_idx
2908:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:345: - .\supabase\migrations\001_object_action_backbone.sql:359 - on contextual_categories (status);
2909:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:346: - .\supabase\migrations\001_object_action_backbone.sql:361 - create index if not exists contextual_categories_is_active_idx
2910:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:347: - .\supabase\migrations\001_object_action_backbone.sql:362 - on contextual_categories (is_active);
2911:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:348: - .\supabase\migrations\001_object_action_backbone.sql:371 - contextual_category_id uuid references contextual_categories(id) on delete restrict,
2912:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:349: - .\supabase\migrations\001_object_action_backbone.sql:525 - contextual_category_id uuid not null references contextual_categories(id) on delete cascade,
2913:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:350: - .\supabase\migrations\001_object_action_backbone.sql:659 - select 1 from pg_trigger where tgname = 'contextual_categories_set_updated_at'
2914:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:351: - .\supabase\migrations\001_object_action_backbone.sql:661 - create trigger contextual_categories_set_updated_at
2915:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:352: - .\supabase\migrations\001_object_action_backbone.sql:662 - before update on contextual_categories
2916:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:353: - .\supabase\migrations\002_seed_object_action_rubricator.sql:175 - insert into contextual_categories (
2917:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:354: - .\supabase\migrations\002_seed_object_action_rubricator.sql:240 - from contextual_categories existing
2918:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:355: - .\supabase\migrations\002_seed_object_action_rubricator.sql:377 - contextual_categories.id,
2919:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:356: - .\supabase\migrations\002_seed_object_action_rubricator.sql:398 - join contextual_categories
2920:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:357: - .\supabase\migrations\002_seed_object_action_rubricator.sql:399 - on contextual_categories.context_id = contexts.id
2921:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:358: - .\supabase\migrations\002_seed_object_action_rubricator.sql:400 - and lower(contextual_categories.slug) = lower(seed.category_slug)
2922:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:359: - .\supabase\migrations\002_seed_object_action_rubricator.sql:404 - where existing.contextual_category_id = contextual_categories.id
2923:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:360: - .\supabase\migrations\003_backfill_organization_directory_classifications.sql:24 - contextual_categories.id as contextual_category_id,
2924:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:361: - .\supabase\migrations\003_backfill_organization_directory_classifications.sql:57 - join contextual_categories
2925:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:362: - .\supabase\migrations\003_backfill_organization_directory_classifications.sql:58 - on contextual_categories.context_id = contexts.id
2926:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:363: - .\supabase\migrations\003_backfill_organization_directory_classifications.sql:59 - and lower(contextual_categories.slug) = lower(business_categories.slug)
2927:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:364: - .\supabase\migrations\003_backfill_organization_directory_classifications.sql:68 - and existing.contextual_category_id = contextual_categories.id
2928:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:365: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:3 - create or replace view public_contextual_categories
2929:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:366: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:7 - contextual_categories.id as category_id,
2930:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:367: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:8 - contextual_categories.context_id,
2931:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:368: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:11 - contextual_categories.parent_id,
2932:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:369: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:14 - contextual_categories.slug as category_slug,
2933:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:370: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:15 - contextual_categories.name as category_default_name,
2934:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:371: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:16 - contextual_categories.description as category_default_description,
2935:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:372: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:17 - contextual_categories.status,
2936:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:373: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:18 - contextual_categories.source_type,
2937:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:374: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:19 - contextual_categories.sort_order,
2938:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:375: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:20 - contextual_categories.is_active,
2939:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:376: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:21 - contextual_categories.created_at,
2940:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:377: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:22 - contextual_categories.updated_at
2941:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:378: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:23 - from contextual_categories
2942:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:379: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:25 - on contexts.id = contextual_categories.context_id
2943:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:380: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:26 - left join contextual_categories parent_categories
2944:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:381: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:27 - on parent_categories.id = contextual_categories.parent_id
2945:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:382: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:28 - where contextual_categories.is_active = true
2946:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:383: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:29 - and contextual_categories.status in ('approved', 'published')
2947:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:384: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:33 - create or replace view directory_contextual_categories
2948:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:385: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:37 - public_contextual_categories.category_id,
2949:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:386: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:38 - public_contextual_categories.context_id,
2950:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:387: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:39 - public_contextual_categories.context_code,
2951:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:388: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:40 - public_contextual_categories.parent_id,
2952:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:389: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:41 - public_contextual_categories.parent_slug,
2953:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:390: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:42 - public_contextual_categories.parent_default_name,
2954:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:391: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:43 - public_contextual_categories.category_slug,
2981:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:447: - .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
3268:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1152: | contextual_categories | TBD | TBD | TBD | TBD | TBD | inventory needed |
3270:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1170: | contextual_categories | EXISTS | RLS_ENABLED | 1 |
3278:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1193: - contextual_categories
3290:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-mapping-decision.md:34: - contextual_categories
3304:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-mapping-decision.md:134: - entity_classifications / contextual_categories remain canonical classification records;
3310:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-mapping-decision.md:201: - read existing entity_classifications/contextual_categories if available;
3382:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\activityRubricatorClassificationLifecycle.ts:221: .from("contextual_categories")
3503:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:360: | "contextual_categories",
3507:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:394: readLookupRow(supabase, "contextual_categories", contextualCategoryId),
3569:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:489: .from("contextual_categories")
3589:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:917: category_table: "contextual_categories",
3642:C:\Users\Admin\Documents\projects\gpt-app\lib\objectAction\queries.ts:462: const { data, error } = await supabase.rpc("get_contextual_categories", {
3657:C:\Users\Admin\Documents\projects\gpt-app\lib\objectAction\queries.ts:570: .from("contextual_categories")
3712:C:\Users\Admin\Documents\projects\gpt-app\lib\objectAction\suggestionAnalysis.ts:322: "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
3897:C:\Users\Admin\Documents\projects\gpt-app\src\app\admin\object-action\categories\page.tsx:596: .from("contextual_categories")
3999:C:\Users\Admin\Documents\projects\gpt-app\src\app\admin\object-action\classifications\page.tsx:625: .from("contextual_categories")
4429:C:\Users\Admin\Documents\projects\gpt-app\src\app\api\directory\filters\route.ts:373: supabase.rpc("get_contextual_categories", {
4472:C:\Users\Admin\Documents\projects\gpt-app\src\app\api\directory\organizations\[slug]\route.ts:344: .from("contextual_categories")
4506:C:\Users\Admin\Documents\projects\gpt-app\src\app\api\directory\organizations\route.ts:584: .from("contextual_categories")
4579:C:\Users\Admin\Documents\projects\gpt-app\src\app\api\object-action\categories\audit-verify\route.ts:344: .from("contextual_categories")
4626:C:\Users\Admin\Documents\projects\gpt-app\src\app\api\object-action\categories\route.ts:367: .from("contextual_categories")
4711:C:\Users\Admin\Documents\projects\gpt-app\src\app\api\object-action\categories\route.ts:724: .from("contextual_categories")
4804:C:\Users\Admin\Documents\projects\gpt-app\src\app\api\object-action\suggestions\route.ts:835: .from("contextual_categories")
4816:C:\Users\Admin\Documents\projects\gpt-app\src\app\api\object-action\suggestions\route.ts:896: .from("contextual_categories")
4823:C:\Users\Admin\Documents\projects\gpt-app\src\app\api\object-action\suggestions\route.ts:934: .from("contextual_categories")
4908:C:\Users\Admin\Documents\projects\gpt-app\src\app\api\object-action\suggestions\route.ts:1847: .from("contextual_categories")
4920:C:\Users\Admin\Documents\projects\gpt-app\src\app\api\object-action\suggestions\route.ts:1900: .from("contextual_categories")
5070:C:\Users\Admin\Documents\projects\gpt-app\src\app\directory\[slug]\page.tsx:466: .from("contextual_categories")
5164:C:\Users\Admin\Documents\projects\gpt-app\src\app\organizations\[id]\page.tsx:845: .from("contextual_categories")
5217:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:300: create table if not exists contextual_categories (
5218:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:303: parent_id uuid references contextual_categories(id) on delete set null,
5219:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:314: constraint contextual_categories_slug_not_empty
5220:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:317: constraint contextual_categories_name_not_empty
5221:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:320: constraint contextual_categories_status_allowed
5222:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:335: constraint contextual_categories_source_type_allowed
5223:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:349: create unique index if not exists contextual_categories_context_slug_unique_idx
5224:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:350: on contextual_categories (context_id, lower(slug));
5225:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:352: create index if not exists contextual_categories_context_id_idx
5226:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:353: on contextual_categories (context_id);
5227:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:355: create index if not exists contextual_categories_parent_id_idx
5228:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:356: on contextual_categories (parent_id);
5229:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:358: create index if not exists contextual_categories_status_idx
5230:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:359: on contextual_categories (status);
5231:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:361: create index if not exists contextual_categories_is_active_idx
5232:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:362: on contextual_categories (is_active);
5233:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:371: contextual_category_id uuid references contextual_categories(id) on delete restrict,
5238:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:525: contextual_category_id uuid not null references contextual_categories(id) on delete cascade,
5252:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:659: select 1 from pg_trigger where tgname = 'contextual_categories_set_updated_at'
5253:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:661: create trigger contextual_categories_set_updated_at
5254:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:662: before update on contextual_categories
5266:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\002_seed_object_action_rubricator.sql:175: insert into contextual_categories (
5267:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\002_seed_object_action_rubricator.sql:240: from contextual_categories existing
5273:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\002_seed_object_action_rubricator.sql:377: contextual_categories.id,
5275:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\002_seed_object_action_rubricator.sql:398: join contextual_categories
5276:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\002_seed_object_action_rubricator.sql:399: on contextual_categories.context_id = contexts.id
5277:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\002_seed_object_action_rubricator.sql:400: and lower(contextual_categories.slug) = lower(seed.category_slug)
5279:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\002_seed_object_action_rubricator.sql:404: where existing.contextual_category_id = contextual_categories.id
5281:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\003_backfill_organization_directory_classifications.sql:24: contextual_categories.id as contextual_category_id,
5287:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\003_backfill_organization_directory_classifications.sql:57: join contextual_categories
5288:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\003_backfill_organization_directory_classifications.sql:58: on contextual_categories.context_id = contexts.id
5289:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\003_backfill_organization_directory_classifications.sql:59: and lower(contextual_categories.slug) = lower(business_categories.slug)
5290:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\003_backfill_organization_directory_classifications.sql:68: and existing.contextual_category_id = contextual_categories.id
5291:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:3: create or replace view public_contextual_categories
5292:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:7: contextual_categories.id as category_id,
5293:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:8: contextual_categories.context_id,
5294:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:11: contextual_categories.parent_id,
5295:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:14: contextual_categories.slug as category_slug,
5296:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:15: contextual_categories.name as category_default_name,
5297:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:16: contextual_categories.description as category_default_description,
5298:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:17: contextual_categories.status,
5299:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:18: contextual_categories.source_type,
5300:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:19: contextual_categories.sort_order,
5301:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:20: contextual_categories.is_active,
5302:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:21: contextual_categories.created_at,
5303:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:22: contextual_categories.updated_at
5304:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:23: from contextual_categories
5305:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:25: on contexts.id = contextual_categories.context_id
5306:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:26: left join contextual_categories parent_categories
5307:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:27: on parent_categories.id = contextual_categories.parent_id
5308:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:28: where contextual_categories.is_active = true
5309:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:29: and contextual_categories.status in ('approved', 'published')
5310:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:33: create or replace view directory_contextual_categories
5311:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:37: public_contextual_categories.category_id,
5312:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:38: public_contextual_categories.context_id,
5313:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:39: public_contextual_categories.context_code,
5314:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:40: public_contextual_categories.parent_id,
5315:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:41: public_contextual_categories.parent_slug,
5316:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:42: public_contextual_categories.parent_default_name,
5317:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:43: public_contextual_categories.category_slug,
5318:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:44: public_contextual_categories.category_default_name,
5319:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:45: public_contextual_categories.category_default_description,
5320:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:46: public_contextual_categories.status,
5321:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:47: public_contextual_categories.source_type,
5322:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:48: public_contextual_categories.sort_order,
5323:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:49: public_contextual_categories.is_active,
5324:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:50: public_contextual_categories.created_at,
5325:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:51: public_contextual_categories.updated_at
5326:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:52: from public_contextual_categories
5327:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:53: where public_contextual_categories.context_code = 'business_directory';
5328:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:55: drop function if exists get_contextual_categories(text, text);
5329:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:57: create function get_contextual_categories(
5332:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:83: contextual_categories.id as category_id,
5333:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:86: contextual_categories.parent_id,
5334:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:88: contextual_categories.slug as category_slug,
5335:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:89: contextual_categories.name as default_name,
5336:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:90: contextual_categories.description as default_description,
5337:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:95: contextual_categories.name
5338:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:101: contextual_categories.description
5339:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:109: contextual_categories.status,
5340:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:110: contextual_categories.source_type,
5341:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:111: contextual_categories.sort_order
5342:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:112: from contextual_categories
5343:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:114: on contexts.id = contextual_categories.context_id
5344:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:115: left join contextual_categories parent_categories
5345:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:116: on parent_categories.id = contextual_categories.parent_id
5347:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:118: on requested_translation.contextual_category_id = contextual_categories.id
5349:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:121: on english_translation.contextual_category_id = contextual_categories.id
5351:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:124: on polish_translation.contextual_category_id = contextual_categories.id
5352:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:126: where contextual_categories.is_active = true
5353:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:127: and contextual_categories.status in ('approved', 'published')
5354:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:137: contextual_categories.sort_order,
5365:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:215: contextual_categories.id as category_id,
5366:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:216: contextual_categories.slug as category_slug,
5367:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:217: contextual_categories.name as default_name,
5368:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:222: contextual_categories.name
5369:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:232: join contextual_categories
5370:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:233: on contextual_categories.context_id = resolved_affordance.context_id
5371:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:234: and contextual_categories.is_active = true
5372:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:235: and contextual_categories.status in ('approved', 'published')
5374:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:237: on requested_translation.contextual_category_id = contextual_categories.id
5376:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:240: on english_translation.contextual_category_id = contextual_categories.id
5378:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:243: on polish_translation.contextual_category_id = contextual_categories.id
5379:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:247: contextual_categories.sort_order,
5380:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:251: grant select on public_contextual_categories to anon, authenticated;
5381:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:252: grant select on directory_contextual_categories to anon, authenticated;
5382:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:254: grant execute on function get_contextual_categories(text, text) to anon, authenticated;
5388:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\007_create_object_action_suggestion_requests.sql:33: ai_suggested_contextual_category_id uuid references contextual_categories(id) on delete set null,
5389:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\007_create_object_action_suggestion_requests.sql:34: matched_existing_category_id uuid references contextual_categories(id) on delete set null,
5446:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\010_create_object_action_suggestion_events.sql:21: matched_existing_category_id uuid null references contextual_categories(id),
5447:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\010_create_object_action_suggestion_events.sql:22: created_contextual_category_id uuid null references contextual_categories(id),

docs/value-objects/P4.10.0-A2_repo_value_object_reference_inventory.txt
769:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A8_foundation_checkpoint.md:79: 2. decide how to create value_object_category_links from contextual_categories

docs/value-objects/P4.10.0-B2_minimal_schema_v4_2_gap_analysis_checkpoint.md
36:- contextual_categories

docs/value-objects/P4.10.0-C5b_controlled_fallback_key_ranges.txt
309:.\lib\activity\rubricatorValueObjectMapper.ts:360:     | "contextual_categories",
343:.\lib\activity\rubricatorValueObjectMapper.ts:394:       readLookupRow(supabase, "contextual_categories", contextualCategoryId),

docs/value-objects/P4.10.0-C6-B_previous_rubricatorValueObjectMapper.ts.txt
360:    | "contextual_categories",
394:      readLookupRow(supabase, "contextual_categories", contextualCategoryId),

docs/value-objects/P4.10.0-C7-G_free_text_runtime_verification_checkpoint.md
106:- check whether contextualCategorySlug walking-to-work exists in contextual_categories;

docs/value-objects/P4.9.0-A1_live_schema_inventory_result.md
40:- contextual_categories
43:- object_action_contextual_categories
67:- contextual_categories: about 54 rows
142:contextual_categories already has:
154:object_action_contextual_categories connects object-action affordances with contextual categories.

docs/value-objects/P4.9.0-A2_v4_2_gap_conclusion.md
30:- contextual_categories as initial global category/rubricator layer

docs/value-objects/P4.9.0-A3_local_code_routes_inventory.md
15:- contextual_categories and object-action rubricator tables
73:contextual_categories|contextual_category_events|contextual_category_translations|object_action_contextual_categories|business_categories|organization_categories|rubric|category
81:| lib/activity/activityRubricatorClassificationLifecycle.ts | 221 | .from("contextual_categories") |
119:| lib/activity/rubricatorValueObjectMapper.ts | 360 | \| "contextual_categories", |
121:| lib/activity/rubricatorValueObjectMapper.ts | 394 | readLookupRow(supabase, "contextual_categories", contextualCategoryId), |
125:| lib/objectAction/queries.ts | 462 | const { data, error } = await supabase.rpc("get_contextual_categories", { |
130:| lib/objectAction/queries.ts | 570 | .from("contextual_categories") |
168:| lib/objectAction/suggestionAnalysis.ts | 322 | "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.", |
223:| src/app/admin/object-action/categories/page.tsx | 596 | .from("contextual_categories") |
597:| lib/activity/activityRubricatorClassificationLifecycle.ts | 221 | .from("contextual_categories") |
684:| lib/objectAction/queries.ts | 462 | const { data, error } = await supabase.rpc("get_contextual_categories", { |
691:| lib/objectAction/queries.ts | 570 | .from("contextual_categories") |
701:| src/app/admin/object-action/categories/page.tsx | 596 | .from("contextual_categories") |
729:| src/app/admin/object-action/classifications/page.tsx | 625 | .from("contextual_categories") |

docs/value-objects/P4.9.0-A4_local_code_routes_inventory_conclusion.md
32:| contextual_categories | 14 |
33:| object_action_contextual_categories | 1 |

docs/value-objects/P4.9.0-A5_focused_live_schema_check_result.md
15:- contextual_categories
16:- object_action_contextual_categories

docs/value-objects/P4.9.0-A8_foundation_checkpoint.md
79:2. decide how to create value_object_category_links from contextual_categories

docs/value-objects/P4.9.1-A1_runtime_writer_inventory.md
416:contextual_categories|object_action_contextual_categories|contextual_category|rubric|object_type_code|action_type_code|context_code|category
425:| docs/sql/P4.7.8-R-L5_second_known_template_seed_and_audit.sql | 482 | from public.contextual_categories cc |
507:| docs/sql/P4.7.9-R-A3_known_template_metadata_normalization.sql | 365 | left join public.contextual_categories cc |
526:| docs/sql/P4.8.0-A2_live_schema_inventory.sql | 24 | ('contextual_categories'), |
527:| docs/sql/P4.8.0-A2_live_schema_inventory.sql | 95 | ('contextual_categories'), |
528:| docs/sql/P4.8.0-A2_live_schema_inventory.sql | 163 | ('contextual_categories'), |
529:| docs/sql/P4.8.0-A2_live_schema_inventory.sql | 232 | ('contextual_categories'), |
530:| docs/sql/P4.8.0-A2_live_schema_inventory.sql | 296 | ('contextual_categories'), |
531:| docs/sql/P4.8.0-A2_live_schema_inventory.sql | 364 | ('contextual_categories'), |
538:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 95 | category_table text NOT NULL DEFAULT 'contextual_categories', |
543:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 105 | 'contextual_categories', |
544:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 108 | 'object_action_contextual_categories' |
561:| lib/activity/activityRubricatorClassificationLifecycle.ts | 221 | .from("contextual_categories") |
614:| lib/activity/rubricatorValueObjectMapper.ts | 360 | \| "contextual_categories", |
616:| lib/activity/rubricatorValueObjectMapper.ts | 394 | readLookupRow(supabase, "contextual_categories", contextualCategoryId), |
620:| lib/objectAction/queries.ts | 462 | const { data, error } = await supabase.rpc("get_contextual_categories", { |
629:| lib/objectAction/queries.ts | 570 | .from("contextual_categories") |
777:| lib/activity/activityRubricatorClassificationLifecycle.ts | 221 | .from("contextual_categories") |
864:| lib/objectAction/queries.ts | 462 | const { data, error } = await supabase.rpc("get_contextual_categories", { |
871:| lib/objectAction/queries.ts | 570 | .from("contextual_categories") |
916:| src/app/admin/object-action/categories/page.tsx | 596 | .from("contextual_categories") |
944:| src/app/admin/object-action/classifications/page.tsx | 625 | .from("contextual_categories") |

docs/value-objects/P4.9.1-A2_runtime_writer_inventory_conclusion.md
39:| contextual_categories | 22 |
40:| object_action_contextual_categories | 2 |

docs/value-objects/P4.9.1-A4_full_key_file_extraction.md
1115:  360:     | "contextual_categories",
1149:  394:       readLookupRow(supabase, "contextual_categories", contextualCategoryId),

docs/value-objects/P4.9.10-A1_debug_admin_guard_conventions_inspection.md
1177:  917:         category_table: "contextual_categories",
1182:  917:         category_table: "contextual_categories",

docs/value-objects/P4.9.13-A1_controlled_hierarchy_candidate_audit_plan.md
18:- public.contextual_categories

docs/value-objects/P4.9.14-A1_value_object_identity_display_readiness_audit_plan.md
20:- public.contextual_categories

docs/value-objects/P4.9.2-A1_category_link_live_source_proof.md
15:- resolved_contextual_categories_count: 1
22:- category_table: contextual_categories

docs/value-objects/P4.9.2-A2_category_link_runtime_integration_plan.md
58:- category_table = contextual_categories

docs/value-objects/P4.9.2-A4_category_link_runtime_verification_result.md
81:- category_table: contextual_categories

docs/value-objects/P4.9.2-A5_category_link_runtime_checkpoint.md
19:- category_table: contextual_categories

docs/value-objects/P4.9.3-A2_knee_template_runtime_verification_result.md
90:- category_table: contextual_categories

docs/value-objects/P4.9.3-A3_broadened_runtime_verification_checkpoint.md
86:- contextual_categories

docs/value-objects/P4.9.4-A1_object_cloud_read_audit_plan.md
23:- contextual_categories

docs/value-objects/P4.9.4-A2_object_cloud_read_audit_result.md
17:- contextual_categories

docs/value-objects/P4.9.4-A3_object_cloud_read_layer_checkpoint.md
24:- contextual_categories

docs/value-objects/P4.9.5-A1_object_cloud_sql_view_plan.md
19:- contextual_categories

docs/value-objects/P4.9.5-A3_reusable_object_cloud_read_interface_checkpoint.md
28:- contextual_categories

docs/value-objects/P4.9.9-A1_object_cloud_security_read_exposure_inspection.md
831:   15: - contextual_categories

docs/value-objects/category-derivation-layer-v1.md
22:Reason: mapping.metadata.classification is null, valueObjectBridge requires a resolved contextual category id, contextual_categories.slug = walking-to-work does not exist, and free-text fallback does not yet pass resolved category candidates into the bridge.
72:The resolver must receive category candidates, normalize slugs and aliases, search contextual_categories, reuse existing categories, create missing categories only under controlled policy, mark new categories as suggested or needs_review where appropriate, return resolved category ids, and preserve confidence/source/run metadata.
76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
119:Inventory targets: contextual_categories, entity_classifications, value_object_category_links, activity_event_value_object_links, processing logs, mapper contracts, bridge contracts, free-text fallback metadata, existing migrations touching contextual categories and VO links.

lib/activity/activityRubricatorClassificationLifecycle.ts
221:    .from("contextual_categories")

lib/activity/rubricatorValueObjectMapper.ts
406:    | "contextual_categories",
440:      readLookupRow(supabase, "contextual_categories", contextualCategoryId),

lib/activity/valueObjectBridge.ts
489:    .from("contextual_categories")
917:        category_table: "contextual_categories",

lib/objectAction/queries.ts
462:    const { data, error } = await supabase.rpc("get_contextual_categories", {
570:      .from("contextual_categories")

lib/objectAction/suggestionAnalysis.ts
322:        "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",

src/app/admin/object-action/categories/page.tsx
596:    .from("contextual_categories")

src/app/admin/object-action/classifications/page.tsx
625:            .from("contextual_categories")

src/app/api/directory/filters/route.ts
373:        supabase.rpc("get_contextual_categories", {

src/app/api/directory/organizations/[slug]/route.ts
344:    .from("contextual_categories")

src/app/api/directory/organizations/route.ts
584:    .from("contextual_categories")

src/app/api/object-action/categories/audit-verify/route.ts
344:    .from("contextual_categories")

src/app/api/object-action/categories/route.ts
367:    .from("contextual_categories")
724:    .from("contextual_categories")

src/app/api/object-action/suggestions/route.ts
835:    .from("contextual_categories")
896:    .from("contextual_categories")
934:    .from("contextual_categories")
1847:      .from("contextual_categories")
1900:      .from("contextual_categories")

src/app/directory/[slug]/page.tsx
466:    .from("contextual_categories")

src/app/organizations/[id]/page.tsx
844:      .from("contextual_categories")

supabase/migrations/001_object_action_backbone.sql
300:create table if not exists contextual_categories (
303:  parent_id uuid references contextual_categories(id) on delete set null,
314:  constraint contextual_categories_slug_not_empty
317:  constraint contextual_categories_name_not_empty
320:  constraint contextual_categories_status_allowed
335:  constraint contextual_categories_source_type_allowed
349:create unique index if not exists contextual_categories_context_slug_unique_idx
350:on contextual_categories (context_id, lower(slug));
352:create index if not exists contextual_categories_context_id_idx
353:on contextual_categories (context_id);
355:create index if not exists contextual_categories_parent_id_idx
356:on contextual_categories (parent_id);
358:create index if not exists contextual_categories_status_idx
359:on contextual_categories (status);
361:create index if not exists contextual_categories_is_active_idx
362:on contextual_categories (is_active);
371:  contextual_category_id uuid references contextual_categories(id) on delete restrict,
525:  contextual_category_id uuid not null references contextual_categories(id) on delete cascade,
659:    select 1 from pg_trigger where tgname = 'contextual_categories_set_updated_at'
661:    create trigger contextual_categories_set_updated_at
662:    before update on contextual_categories

supabase/migrations/002_seed_object_action_rubricator.sql
175:insert into contextual_categories (
240:  from contextual_categories existing
377:  contextual_categories.id,
398:join contextual_categories
399:  on contextual_categories.context_id = contexts.id
400: and lower(contextual_categories.slug) = lower(seed.category_slug)
404:  where existing.contextual_category_id = contextual_categories.id

supabase/migrations/003_backfill_organization_directory_classifications.sql
24:  contextual_categories.id as contextual_category_id,
57:join contextual_categories
58:  on contextual_categories.context_id = contexts.id
59: and lower(contextual_categories.slug) = lower(business_categories.slug)
68:    and existing.contextual_category_id = contextual_categories.id

supabase/migrations/005_create_object_action_read_views_and_rpc.sql
3:create or replace view public_contextual_categories
7:  contextual_categories.id as category_id,
8:  contextual_categories.context_id,
11:  contextual_categories.parent_id,
14:  contextual_categories.slug as category_slug,
15:  contextual_categories.name as category_default_name,
16:  contextual_categories.description as category_default_description,
17:  contextual_categories.status,
18:  contextual_categories.source_type,
19:  contextual_categories.sort_order,
20:  contextual_categories.is_active,
21:  contextual_categories.created_at,
22:  contextual_categories.updated_at
23:from contextual_categories
25:  on contexts.id = contextual_categories.context_id
26:left join contextual_categories parent_categories
27:  on parent_categories.id = contextual_categories.parent_id
28:where contextual_categories.is_active = true
29:  and contextual_categories.status in ('approved', 'published')
33:create or replace view directory_contextual_categories
37:  public_contextual_categories.category_id,
38:  public_contextual_categories.context_id,
39:  public_contextual_categories.context_code,
40:  public_contextual_categories.parent_id,
41:  public_contextual_categories.parent_slug,
42:  public_contextual_categories.parent_default_name,
43:  public_contextual_categories.category_slug,
44:  public_contextual_categories.category_default_name,
45:  public_contextual_categories.category_default_description,
46:  public_contextual_categories.status,
47:  public_contextual_categories.source_type,
48:  public_contextual_categories.sort_order,
49:  public_contextual_categories.is_active,
50:  public_contextual_categories.created_at,
51:  public_contextual_categories.updated_at
52:from public_contextual_categories
53:where public_contextual_categories.context_code = 'business_directory';
55:drop function if exists get_contextual_categories(text, text);
57:create function get_contextual_categories(
83:    contextual_categories.id as category_id,
86:    contextual_categories.parent_id,
88:    contextual_categories.slug as category_slug,
89:    contextual_categories.name as default_name,
90:    contextual_categories.description as default_description,
95:      contextual_categories.name
101:      contextual_categories.description
109:    contextual_categories.status,
110:    contextual_categories.source_type,
111:    contextual_categories.sort_order
112:  from contextual_categories
114:    on contexts.id = contextual_categories.context_id
115:  left join contextual_categories parent_categories
116:    on parent_categories.id = contextual_categories.parent_id
118:    on requested_translation.contextual_category_id = contextual_categories.id
121:    on english_translation.contextual_category_id = contextual_categories.id
124:    on polish_translation.contextual_category_id = contextual_categories.id
126:  where contextual_categories.is_active = true
127:    and contextual_categories.status in ('approved', 'published')
137:    contextual_categories.sort_order,
215:    contextual_categories.id as category_id,
216:    contextual_categories.slug as category_slug,
217:    contextual_categories.name as default_name,
222:      contextual_categories.name
232:  join contextual_categories
233:    on contextual_categories.context_id = resolved_affordance.context_id
234:   and contextual_categories.is_active = true
235:   and contextual_categories.status in ('approved', 'published')
237:    on requested_translation.contextual_category_id = contextual_categories.id
240:    on english_translation.contextual_category_id = contextual_categories.id
243:    on polish_translation.contextual_category_id = contextual_categories.id
247:    contextual_categories.sort_order,
251:grant select on public_contextual_categories to anon, authenticated;
252:grant select on directory_contextual_categories to anon, authenticated;
254:grant execute on function get_contextual_categories(text, text) to anon, authenticated;

supabase/migrations/007_create_object_action_suggestion_requests.sql
33:  ai_suggested_contextual_category_id uuid references contextual_categories(id) on delete set null,
34:  matched_existing_category_id uuid references contextual_categories(id) on delete set null,

supabase/migrations/010_create_object_action_suggestion_events.sql
21:  matched_existing_category_id uuid null references contextual_categories(id),
22:  created_contextual_category_id uuid null references contextual_categories(id),
```

## References: entity_classifications

```text
docs/activity/P4.7.9-R_registry_scaling.md
56:- entity_classifications
758:- no duplicate entity_classifications were created during server-side diagnostics;

docs/commercial/P4.8.0-A2_schema_inventory_raw.md
79:| entity_classifications | 12 | 1 | 13 | supabase\migrations\001_object_action_backbone.sql:364<br>supabase\migrations\001_object_action_backbone.sql:435<br>supabase\migrations\001_object_action_backbone.sql:446 |
260:### entity_classifications
263:supabase\migrations\001_object_action_backbone.sql:364: create table if not exists entity_classifications (

docs/commercial/P4.8.0-A4b_offer_items_semantic_check.md
167:| supabase/migrations/001_object_action_backbone.sql | 364 | create table if not exists entity_classifications ( |

docs/p4-7-rubricator-inventory-raw.md
125:- .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
181:- .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
397:## Term: entity_classifications
411:- .\supabase\migrations\001_object_action_backbone.sql:364 - create table if not exists entity_classifications (
412:- .\supabase\migrations\001_object_action_backbone.sql:383 - constraint entity_classifications_entity_type_not_empty
413:- .\supabase\migrations\001_object_action_backbone.sql:386 - constraint entity_classifications_role_allowed
414:- .\supabase\migrations\001_object_action_backbone.sql:399 - constraint entity_classifications_confidence_range
415:- .\supabase\migrations\001_object_action_backbone.sql:405 - constraint entity_classifications_status_allowed
416:- .\supabase\migrations\001_object_action_backbone.sql:420 - constraint entity_classifications_source_type_allowed
417:- .\supabase\migrations\001_object_action_backbone.sql:434 - create unique index if not exists entity_classifications_unique_dimension_idx
418:- .\supabase\migrations\001_object_action_backbone.sql:435 - on entity_classifications (
419:- .\supabase\migrations\001_object_action_backbone.sql:445 - create index if not exists entity_classifications_entity_idx
420:- .\supabase\migrations\001_object_action_backbone.sql:446 - on entity_classifications (lower(entity_type), entity_id);
421:- .\supabase\migrations\001_object_action_backbone.sql:448 - create index if not exists entity_classifications_object_type_id_idx
422:- .\supabase\migrations\001_object_action_backbone.sql:449 - on entity_classifications (object_type_id);
423:- .\supabase\migrations\001_object_action_backbone.sql:451 - create index if not exists entity_classifications_action_type_id_idx
424:- .\supabase\migrations\001_object_action_backbone.sql:452 - on entity_classifications (action_type_id);
425:- .\supabase\migrations\001_object_action_backbone.sql:454 - create index if not exists entity_classifications_context_id_idx
426:- .\supabase\migrations\001_object_action_backbone.sql:455 - on entity_classifications (context_id);
427:- .\supabase\migrations\001_object_action_backbone.sql:457 - create index if not exists entity_classifications_contextual_category_id_idx
428:- .\supabase\migrations\001_object_action_backbone.sql:458 - on entity_classifications (contextual_category_id);
429:- .\supabase\migrations\001_object_action_backbone.sql:460 - create index if not exists entity_classifications_status_idx
430:- .\supabase\migrations\001_object_action_backbone.sql:461 - on entity_classifications (status);
431:- .\supabase\migrations\001_object_action_backbone.sql:463 - create index if not exists entity_classifications_is_primary_idx
432:- .\supabase\migrations\001_object_action_backbone.sql:464 - on entity_classifications (is_primary);
433:- .\supabase\migrations\001_object_action_backbone.sql:668 - select 1 from pg_trigger where tgname = 'entity_classifications_set_updated_at'
434:- .\supabase\migrations\001_object_action_backbone.sql:670 - create trigger entity_classifications_set_updated_at
435:- .\supabase\migrations\001_object_action_backbone.sql:671 - before update on entity_classifications
436:- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:3 - insert into entity_classifications (
437:- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:62 - from entity_classifications existing
438:- .\src\app\admin\object-action\classifications\page.tsx:506 - .from("entity_classifications")
439:- .\src\app\api\directory\filters\route.ts:379 - .from("entity_classifications")
440:- .\src\app\api\directory\organizations\route.ts:546 - .from("entity_classifications")
441:- .\src\app\api\object-action\suggestions\route.ts:1350 - .from("entity_classifications")
442:- .\src\app\api\object-action\suggestions\route.ts:1479 - .from("entity_classifications")
443:- .\src\app\api\object-action\suggestions\route.ts:1534 - .from("entity_classifications")
444:- .\src\app\api\object-action\suggestions\route.ts:1540 - .from("entity_classifications")
445:- .\src\app\api\object-action\suggestions\route.ts:1566 - .from("entity_classifications")
446:- .\lib\objectAction\queries.ts:513 - .from("entity_classifications")
447:- .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
911:- .\supabase\migrations\001_object_action_backbone.sql:364 - create table if not exists entity_classifications (
913:- .\supabase\migrations\001_object_action_backbone.sql:383 - constraint entity_classifications_entity_type_not_empty
914:- .\supabase\migrations\001_object_action_backbone.sql:386 - constraint entity_classifications_role_allowed
916:- .\supabase\migrations\001_object_action_backbone.sql:399 - constraint entity_classifications_confidence_range
917:- .\supabase\migrations\001_object_action_backbone.sql:405 - constraint entity_classifications_status_allowed
918:- .\supabase\migrations\001_object_action_backbone.sql:420 - constraint entity_classifications_source_type_allowed
919:- .\supabase\migrations\001_object_action_backbone.sql:434 - create unique index if not exists entity_classifications_unique_dimension_idx
920:- .\supabase\migrations\001_object_action_backbone.sql:435 - on entity_classifications (
922:- .\supabase\migrations\001_object_action_backbone.sql:445 - create index if not exists entity_classifications_entity_idx
923:- .\supabase\migrations\001_object_action_backbone.sql:446 - on entity_classifications (lower(entity_type), entity_id);
924:- .\supabase\migrations\001_object_action_backbone.sql:448 - create index if not exists entity_classifications_object_type_id_idx
925:- .\supabase\migrations\001_object_action_backbone.sql:449 - on entity_classifications (object_type_id);
926:- .\supabase\migrations\001_object_action_backbone.sql:451 - create index if not exists entity_classifications_action_type_id_idx
927:- .\supabase\migrations\001_object_action_backbone.sql:452 - on entity_classifications (action_type_id);
928:- .\supabase\migrations\001_object_action_backbone.sql:454 - create index if not exists entity_classifications_context_id_idx
929:- .\supabase\migrations\001_object_action_backbone.sql:455 - on entity_classifications (context_id);
930:- .\supabase\migrations\001_object_action_backbone.sql:457 - create index if not exists entity_classifications_contextual_category_id_idx
931:- .\supabase\migrations\001_object_action_backbone.sql:458 - on entity_classifications (contextual_category_id);
932:- .\supabase\migrations\001_object_action_backbone.sql:460 - create index if not exists entity_classifications_status_idx
933:- .\supabase\migrations\001_object_action_backbone.sql:461 - on entity_classifications (status);
934:- .\supabase\migrations\001_object_action_backbone.sql:463 - create index if not exists entity_classifications_is_primary_idx
935:- .\supabase\migrations\001_object_action_backbone.sql:464 - on entity_classifications (is_primary);
936:- .\supabase\migrations\001_object_action_backbone.sql:668 - select 1 from pg_trigger where tgname = 'entity_classifications_set_updated_at'
937:- .\supabase\migrations\001_object_action_backbone.sql:670 - create trigger entity_classifications_set_updated_at
938:- .\supabase\migrations\001_object_action_backbone.sql:671 - before update on entity_classifications
939:- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:3 - insert into entity_classifications (
943:- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:62 - from entity_classifications existing
994:- .\supabase\migrations\001_object_action_backbone.sql:364 - create table if not exists entity_classifications (
995:- .\supabase\migrations\001_object_action_backbone.sql:383 - constraint entity_classifications_entity_type_not_empty
996:- .\supabase\migrations\001_object_action_backbone.sql:386 - constraint entity_classifications_role_allowed
997:- .\supabase\migrations\001_object_action_backbone.sql:399 - constraint entity_classifications_confidence_range
998:- .\supabase\migrations\001_object_action_backbone.sql:405 - constraint entity_classifications_status_allowed
999:- .\supabase\migrations\001_object_action_backbone.sql:420 - constraint entity_classifications_source_type_allowed
1000:- .\supabase\migrations\001_object_action_backbone.sql:434 - create unique index if not exists entity_classifications_unique_dimension_idx
1001:- .\supabase\migrations\001_object_action_backbone.sql:435 - on entity_classifications (
1002:- .\supabase\migrations\001_object_action_backbone.sql:445 - create index if not exists entity_classifications_entity_idx
1003:- .\supabase\migrations\001_object_action_backbone.sql:446 - on entity_classifications (lower(entity_type), entity_id);
1004:- .\supabase\migrations\001_object_action_backbone.sql:448 - create index if not exists entity_classifications_object_type_id_idx
1005:- .\supabase\migrations\001_object_action_backbone.sql:449 - on entity_classifications (object_type_id);
1006:- .\supabase\migrations\001_object_action_backbone.sql:451 - create index if not exists entity_classifications_action_type_id_idx
1007:- .\supabase\migrations\001_object_action_backbone.sql:452 - on entity_classifications (action_type_id);
1008:- .\supabase\migrations\001_object_action_backbone.sql:454 - create index if not exists entity_classifications_context_id_idx
1009:- .\supabase\migrations\001_object_action_backbone.sql:455 - on entity_classifications (context_id);
1010:- .\supabase\migrations\001_object_action_backbone.sql:457 - create index if not exists entity_classifications_contextual_category_id_idx
1011:- .\supabase\migrations\001_object_action_backbone.sql:458 - on entity_classifications (contextual_category_id);
1012:- .\supabase\migrations\001_object_action_backbone.sql:460 - create index if not exists entity_classifications_status_idx
1013:- .\supabase\migrations\001_object_action_backbone.sql:461 - on entity_classifications (status);
1014:- .\supabase\migrations\001_object_action_backbone.sql:463 - create index if not exists entity_classifications_is_primary_idx
1015:- .\supabase\migrations\001_object_action_backbone.sql:464 - on entity_classifications (is_primary);
1016:- .\supabase\migrations\001_object_action_backbone.sql:668 - select 1 from pg_trigger where tgname = 'entity_classifications_set_updated_at'
1017:- .\supabase\migrations\001_object_action_backbone.sql:670 - create trigger entity_classifications_set_updated_at
1018:- .\supabase\migrations\001_object_action_backbone.sql:671 - before update on entity_classifications
1019:- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:3 - insert into entity_classifications (
1021:- .\supabase\migrations\003_backfill_organization_directory_classifications.sql:62 - from entity_classifications existing
1047:- .\src\app\admin\object-action\classifications\page.tsx:506 - .from("entity_classifications")
1153:| entity_classifications | TBD | TBD | TBD | TBD | TBD | inventory needed |
1171:| entity_classifications | EXISTS | RLS_ENABLED | 1 |
1194:- entity_classifications

docs/p4-7-rubricator-mapping-decision.md
35:- entity_classifications
134:- entity_classifications / contextual_categories remain canonical classification records;
201:- read existing entity_classifications/contextual_categories if available;

docs/sql/P4.7.8-R-K1_known_template_chain_audit.sql
28:  FROM entity_classifications ec

docs/sql/P4.7.8-R-L3_lightweight_known_template_chain_audit.sql
36:  FROM entity_classifications ec

docs/sql/P4.7.8-R-L6_second_known_template_cross_route_audit.sql
60:  join entity_classifications ec

docs/sql/P4.7.8-R-L7_final_two_template_three_route_audit.sql
115:  join entity_classifications ec

docs/sql/P4.7.9-R-A3_known_template_metadata_normalization.sql
17:--   - Does NOT touch entity_classifications.

docs/sql/P4.8.0-A2_live_schema_inventory.sql
28:  ('entity_classifications'),
99:  ('entity_classifications'),
167:  ('entity_classifications'),
236:  ('entity_classifications'),
300:  ('entity_classifications'),
368:  ('entity_classifications'),

docs/value-object-state-foundation-p4-7.md
268:This smoke test used `allowControlledTextFallback: true`. `classificationSummary` was empty, so this test did not yet prove the production path through real `entity_classifications`.
276:## P4.7.6-R Real entity_classifications mapper path verification
345:The mapper used the real approved `entity_classifications` row. Controlled text fallback was disabled.
351:- entity_classifications_for_event: `1`
401:- entity_classifications_for_event: `1`
420:- real `entity_classifications` path

docs/value-objects/P4.10.0-A2_repo_category_rubricator_reference_inventory.txt
145:C:\Users\Admin\Documents\projects\gpt-app\docs\commercial\P4.8.0-A2_schema_inventory_raw.md:79: | entity_classifications | 12 | 1 | 13 | supabase\migrations\001_object_action_backbone.sql:364<br>supabase\migrations\001_object_action_backbone.sql:435<br>supabase\migrations\001_object_action_backbone.sql:446 |
177:C:\Users\Admin\Documents\projects\gpt-app\docs\commercial\P4.8.0-A2_schema_inventory_raw.md:263: supabase\migrations\001_object_action_backbone.sql:364: create table if not exists entity_classifications (
219:C:\Users\Admin\Documents\projects\gpt-app\docs\commercial\P4.8.0-A4b_offer_items_semantic_check.md:167: | supabase/migrations/001_object_action_backbone.sql | 364 | create table if not exists entity_classifications ( |
871:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:168: | lib/objectAction/suggestionAnalysis.ts | 322 | "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.", |
967:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:599: | lib/activity/activityRubricatorClassificationLifecycle.ts | 276 | .from("entity_classifications") |
969:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:601: | lib/activity/activityRubricatorClassificationLifecycle.ts | 548 | .from("entity_classifications") |
974:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:635: | lib/activity/rubricatorValueObjectMapper.ts | 330 | .from("entity_classifications") |
1268:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:779: | lib/activity/activityRubricatorClassificationLifecycle.ts | 276 | .from("entity_classifications") |
1270:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:781: | lib/activity/activityRubricatorClassificationLifecycle.ts | 548 | .from("entity_classifications") |
1275:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:815: | lib/activity/rubricatorValueObjectMapper.ts | 330 | .from("entity_classifications") |
2765:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:125: - .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
2802:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:181: - .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
2956:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:411: - .\supabase\migrations\001_object_action_backbone.sql:364 - create table if not exists entity_classifications (
2957:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:412: - .\supabase\migrations\001_object_action_backbone.sql:383 - constraint entity_classifications_entity_type_not_empty
2958:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:413: - .\supabase\migrations\001_object_action_backbone.sql:386 - constraint entity_classifications_role_allowed
2959:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:414: - .\supabase\migrations\001_object_action_backbone.sql:399 - constraint entity_classifications_confidence_range
2960:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:415: - .\supabase\migrations\001_object_action_backbone.sql:405 - constraint entity_classifications_status_allowed
2961:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:416: - .\supabase\migrations\001_object_action_backbone.sql:420 - constraint entity_classifications_source_type_allowed
2962:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:417: - .\supabase\migrations\001_object_action_backbone.sql:434 - create unique index if not exists entity_classifications_unique_dimension_idx
2963:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:418: - .\supabase\migrations\001_object_action_backbone.sql:435 - on entity_classifications (
2964:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:419: - .\supabase\migrations\001_object_action_backbone.sql:445 - create index if not exists entity_classifications_entity_idx
2965:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:420: - .\supabase\migrations\001_object_action_backbone.sql:446 - on entity_classifications (lower(entity_type), entity_id);
2966:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:421: - .\supabase\migrations\001_object_action_backbone.sql:448 - create index if not exists entity_classifications_object_type_id_idx
2967:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:422: - .\supabase\migrations\001_object_action_backbone.sql:449 - on entity_classifications (object_type_id);
2968:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:423: - .\supabase\migrations\001_object_action_backbone.sql:451 - create index if not exists entity_classifications_action_type_id_idx
2969:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:424: - .\supabase\migrations\001_object_action_backbone.sql:452 - on entity_classifications (action_type_id);
2970:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:425: - .\supabase\migrations\001_object_action_backbone.sql:454 - create index if not exists entity_classifications_context_id_idx
2971:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:426: - .\supabase\migrations\001_object_action_backbone.sql:455 - on entity_classifications (context_id);
2972:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:427: - .\supabase\migrations\001_object_action_backbone.sql:457 - create index if not exists entity_classifications_contextual_category_id_idx
2973:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:428: - .\supabase\migrations\001_object_action_backbone.sql:458 - on entity_classifications (contextual_category_id);
2974:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:429: - .\supabase\migrations\001_object_action_backbone.sql:460 - create index if not exists entity_classifications_status_idx
2975:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:430: - .\supabase\migrations\001_object_action_backbone.sql:461 - on entity_classifications (status);
2976:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:431: - .\supabase\migrations\001_object_action_backbone.sql:463 - create index if not exists entity_classifications_is_primary_idx
2977:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:432: - .\supabase\migrations\001_object_action_backbone.sql:464 - on entity_classifications (is_primary);
2978:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:433: - .\supabase\migrations\001_object_action_backbone.sql:668 - select 1 from pg_trigger where tgname = 'entity_classifications_set_updated_at'
2979:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:434: - .\supabase\migrations\001_object_action_backbone.sql:670 - create trigger entity_classifications_set_updated_at
2980:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:435: - .\supabase\migrations\001_object_action_backbone.sql:671 - before update on entity_classifications
2981:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:447: - .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
3151:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:911: - .\supabase\migrations\001_object_action_backbone.sql:364 - create table if not exists entity_classifications (
3153:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:913: - .\supabase\migrations\001_object_action_backbone.sql:383 - constraint entity_classifications_entity_type_not_empty
3154:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:914: - .\supabase\migrations\001_object_action_backbone.sql:386 - constraint entity_classifications_role_allowed
3156:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:916: - .\supabase\migrations\001_object_action_backbone.sql:399 - constraint entity_classifications_confidence_range
3157:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:917: - .\supabase\migrations\001_object_action_backbone.sql:405 - constraint entity_classifications_status_allowed
3158:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:918: - .\supabase\migrations\001_object_action_backbone.sql:420 - constraint entity_classifications_source_type_allowed
3159:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:919: - .\supabase\migrations\001_object_action_backbone.sql:434 - create unique index if not exists entity_classifications_unique_dimension_idx
3160:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:920: - .\supabase\migrations\001_object_action_backbone.sql:435 - on entity_classifications (
3162:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:922: - .\supabase\migrations\001_object_action_backbone.sql:445 - create index if not exists entity_classifications_entity_idx
3163:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:923: - .\supabase\migrations\001_object_action_backbone.sql:446 - on entity_classifications (lower(entity_type), entity_id);
3164:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:924: - .\supabase\migrations\001_object_action_backbone.sql:448 - create index if not exists entity_classifications_object_type_id_idx
3165:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:925: - .\supabase\migrations\001_object_action_backbone.sql:449 - on entity_classifications (object_type_id);
3166:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:926: - .\supabase\migrations\001_object_action_backbone.sql:451 - create index if not exists entity_classifications_action_type_id_idx
3167:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:927: - .\supabase\migrations\001_object_action_backbone.sql:452 - on entity_classifications (action_type_id);
3168:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:928: - .\supabase\migrations\001_object_action_backbone.sql:454 - create index if not exists entity_classifications_context_id_idx
3169:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:929: - .\supabase\migrations\001_object_action_backbone.sql:455 - on entity_classifications (context_id);
3170:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:930: - .\supabase\migrations\001_object_action_backbone.sql:457 - create index if not exists entity_classifications_contextual_category_id_idx
3171:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:931: - .\supabase\migrations\001_object_action_backbone.sql:458 - on entity_classifications (contextual_category_id);
3172:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:932: - .\supabase\migrations\001_object_action_backbone.sql:460 - create index if not exists entity_classifications_status_idx
3173:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:933: - .\supabase\migrations\001_object_action_backbone.sql:461 - on entity_classifications (status);
3174:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:934: - .\supabase\migrations\001_object_action_backbone.sql:463 - create index if not exists entity_classifications_is_primary_idx
3175:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:935: - .\supabase\migrations\001_object_action_backbone.sql:464 - on entity_classifications (is_primary);
3176:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:936: - .\supabase\migrations\001_object_action_backbone.sql:668 - select 1 from pg_trigger where tgname = 'entity_classifications_set_updated_at'
3177:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:937: - .\supabase\migrations\001_object_action_backbone.sql:670 - create trigger entity_classifications_set_updated_at
3178:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:938: - .\supabase\migrations\001_object_action_backbone.sql:671 - before update on entity_classifications
3180:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:994: - .\supabase\migrations\001_object_action_backbone.sql:364 - create table if not exists entity_classifications (
3181:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:995: - .\supabase\migrations\001_object_action_backbone.sql:383 - constraint entity_classifications_entity_type_not_empty
3182:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:996: - .\supabase\migrations\001_object_action_backbone.sql:386 - constraint entity_classifications_role_allowed
3183:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:997: - .\supabase\migrations\001_object_action_backbone.sql:399 - constraint entity_classifications_confidence_range
3184:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:998: - .\supabase\migrations\001_object_action_backbone.sql:405 - constraint entity_classifications_status_allowed
3185:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:999: - .\supabase\migrations\001_object_action_backbone.sql:420 - constraint entity_classifications_source_type_allowed
3186:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1000: - .\supabase\migrations\001_object_action_backbone.sql:434 - create unique index if not exists entity_classifications_unique_dimension_idx
3187:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1001: - .\supabase\migrations\001_object_action_backbone.sql:435 - on entity_classifications (
3188:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1002: - .\supabase\migrations\001_object_action_backbone.sql:445 - create index if not exists entity_classifications_entity_idx
3189:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1003: - .\supabase\migrations\001_object_action_backbone.sql:446 - on entity_classifications (lower(entity_type), entity_id);
3190:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1004: - .\supabase\migrations\001_object_action_backbone.sql:448 - create index if not exists entity_classifications_object_type_id_idx
3191:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1005: - .\supabase\migrations\001_object_action_backbone.sql:449 - on entity_classifications (object_type_id);
3192:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1006: - .\supabase\migrations\001_object_action_backbone.sql:451 - create index if not exists entity_classifications_action_type_id_idx
3193:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1007: - .\supabase\migrations\001_object_action_backbone.sql:452 - on entity_classifications (action_type_id);
3194:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1008: - .\supabase\migrations\001_object_action_backbone.sql:454 - create index if not exists entity_classifications_context_id_idx
3195:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1009: - .\supabase\migrations\001_object_action_backbone.sql:455 - on entity_classifications (context_id);
3196:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1010: - .\supabase\migrations\001_object_action_backbone.sql:457 - create index if not exists entity_classifications_contextual_category_id_idx
3197:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1011: - .\supabase\migrations\001_object_action_backbone.sql:458 - on entity_classifications (contextual_category_id);
3198:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1012: - .\supabase\migrations\001_object_action_backbone.sql:460 - create index if not exists entity_classifications_status_idx
3199:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1013: - .\supabase\migrations\001_object_action_backbone.sql:461 - on entity_classifications (status);
3200:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1014: - .\supabase\migrations\001_object_action_backbone.sql:463 - create index if not exists entity_classifications_is_primary_idx
3201:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1015: - .\supabase\migrations\001_object_action_backbone.sql:464 - on entity_classifications (is_primary);
3202:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1016: - .\supabase\migrations\001_object_action_backbone.sql:668 - select 1 from pg_trigger where tgname = 'entity_classifications_set_updated_at'
3203:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1017: - .\supabase\migrations\001_object_action_backbone.sql:670 - create trigger entity_classifications_set_updated_at
3204:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1018: - .\supabase\migrations\001_object_action_backbone.sql:671 - before update on entity_classifications
3304:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-mapping-decision.md:134: - entity_classifications / contextual_categories remain canonical classification records;
3310:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-mapping-decision.md:201: - read existing entity_classifications/contextual_categories if available;
3712:C:\Users\Admin\Documents\projects\gpt-app\lib\objectAction\suggestionAnalysis.ts:322: "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
5235:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:457: create index if not exists entity_classifications_contextual_category_id_idx
5236:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:458: on entity_classifications (contextual_category_id);

docs/value-objects/P4.10.0-C3_free_text_processor_runtime_inventory_checkpoint.md
62:3. That lifecycle creates or reuses entity_classifications for known templates.

docs/value-objects/P4.10.0-C4_minimal_free_text_v1_design_decision.md
36:3. Known-template lifecycle creates or reuses entity_classifications.

docs/value-objects/P4.10.0-C5b_controlled_fallback_key_ranges.txt
279:.\lib\activity\rubricatorValueObjectMapper.ts:330:     .from("entity_classifications")

docs/value-objects/P4.10.0-C6-B_previous_rubricatorValueObjectMapper.ts.txt
330:    .from("entity_classifications")

docs/value-objects/P4.9.0-A3_local_code_routes_inventory.md
168:| lib/objectAction/suggestionAnalysis.ts | 322 | "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.", |
599:| lib/activity/activityRubricatorClassificationLifecycle.ts | 276 | .from("entity_classifications") |
601:| lib/activity/activityRubricatorClassificationLifecycle.ts | 548 | .from("entity_classifications") |
635:| lib/activity/rubricatorValueObjectMapper.ts | 330 | .from("entity_classifications") |
686:| lib/objectAction/queries.ts | 513 | .from("entity_classifications") |
719:| src/app/admin/object-action/classifications/page.tsx | 506 | .from("entity_classifications") |

docs/value-objects/P4.9.1-A1_runtime_writer_inventory.md
779:| lib/activity/activityRubricatorClassificationLifecycle.ts | 276 | .from("entity_classifications") |
781:| lib/activity/activityRubricatorClassificationLifecycle.ts | 548 | .from("entity_classifications") |
815:| lib/activity/rubricatorValueObjectMapper.ts | 330 | .from("entity_classifications") |
866:| lib/objectAction/queries.ts | 513 | .from("entity_classifications") |
877:| scripts/diagnostics/P4.7.9-R-A7c_test_lifecycle_db_metadata_resolver.ts | 102 | .from("entity_classifications") |
879:| scripts/diagnostics/P4.7.9-R-A7c_test_lifecycle_db_metadata_resolver.ts | 137 | .from("entity_classifications") |
883:| scripts/diagnostics/P4.7.9-R-A8b2_inspect_record_route_event.ts | 96 | .from("entity_classifications") |
889:| scripts/diagnostics/P4.7.9-R-A8c3_inspect_complete_route_event.ts | 92 | .from("entity_classifications") |
904:| scripts/diagnostics/P4.7.9-R-A8d3_inspect_confirm_route_event.ts | 97 | .from("entity_classifications") |
934:| src/app/admin/object-action/classifications/page.tsx | 506 | .from("entity_classifications") |

docs/value-objects/P4.9.1-A4_full_key_file_extraction.md
1085:  330:     .from("entity_classifications")

docs/value-objects/P4.9.1-A5_function_surface_map.md
169:| 330 | \.from\( | .from("entity_classifications") |

docs/value-objects/P4.9.10-A1_debug_admin_guard_conventions_inspection.md
280:  276:     .from("entity_classifications")
1446:  513:       .from("entity_classifications")
7148:  306:       .from("entity_classifications")
7238:  546:       .from("entity_classifications")
11624:  428:       .from("entity_classifications")
12106:  812:     .from("entity_classifications")

docs/value-objects/category-derivation-layer-v1.md
119:Inventory targets: contextual_categories, entity_classifications, value_object_category_links, activity_event_value_object_links, processing logs, mapper contracts, bridge contracts, free-text fallback metadata, existing migrations touching contextual categories and VO links.

lib/activity/activityRubricatorClassificationLifecycle.ts
276:    .from("entity_classifications")
548:      .from("entity_classifications")

lib/activity/rubricatorValueObjectMapper.ts
376:    .from("entity_classifications")

lib/objectAction/queries.ts
513:      .from("entity_classifications")

lib/objectAction/suggestionAnalysis.ts
322:        "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",

scripts/diagnostics/P4.7.9-R-A7c_test_lifecycle_db_metadata_resolver.ts
102:    .from("entity_classifications")
137:    .from("entity_classifications")

scripts/diagnostics/P4.7.9-R-A8b2_inspect_record_route_event.ts
96:    .from("entity_classifications")
102:    throw new Error(`Failed to read entity_classifications: ${error.message}`);

scripts/diagnostics/P4.7.9-R-A8c3_inspect_complete_route_event.ts
92:    .from("entity_classifications")
98:    throw new Error(`Failed to read entity_classifications: ${error.message}`);

scripts/diagnostics/P4.7.9-R-A8d3_inspect_confirm_route_event.ts
97:    .from("entity_classifications")
103:    throw new Error(`Failed to read entity_classifications: ${error.message}`);

src/app/admin/object-action/classifications/page.tsx
506:    .from("entity_classifications")

src/app/api/directory/filters/route.ts
379:          .from("entity_classifications")

src/app/api/directory/organizations/[slug]/route.ts
306:      .from("entity_classifications")

src/app/api/directory/organizations/route.ts
546:      .from("entity_classifications")

src/app/api/object-action/suggestions/route.ts
1350:    .from("entity_classifications")
1479:    .from("entity_classifications")
1534:        .from("entity_classifications")
1540:        .from("entity_classifications")
1566:    .from("entity_classifications")

src/app/directory/[slug]/page.tsx
428:      .from("entity_classifications")

src/app/organizations/[id]/page.tsx
812:    .from("entity_classifications")

supabase/migrations/001_object_action_backbone.sql
364:create table if not exists entity_classifications (
383:  constraint entity_classifications_entity_type_not_empty
386:  constraint entity_classifications_role_allowed
399:  constraint entity_classifications_confidence_range
405:  constraint entity_classifications_status_allowed
420:  constraint entity_classifications_source_type_allowed
434:create unique index if not exists entity_classifications_unique_dimension_idx
435:on entity_classifications (
445:create index if not exists entity_classifications_entity_idx
446:on entity_classifications (lower(entity_type), entity_id);
448:create index if not exists entity_classifications_object_type_id_idx
449:on entity_classifications (object_type_id);
451:create index if not exists entity_classifications_action_type_id_idx
452:on entity_classifications (action_type_id);
454:create index if not exists entity_classifications_context_id_idx
455:on entity_classifications (context_id);
457:create index if not exists entity_classifications_contextual_category_id_idx
458:on entity_classifications (contextual_category_id);
460:create index if not exists entity_classifications_status_idx
461:on entity_classifications (status);
463:create index if not exists entity_classifications_is_primary_idx
464:on entity_classifications (is_primary);
668:    select 1 from pg_trigger where tgname = 'entity_classifications_set_updated_at'
670:    create trigger entity_classifications_set_updated_at
671:    before update on entity_classifications

supabase/migrations/003_backfill_organization_directory_classifications.sql
3:insert into entity_classifications (
62:  from entity_classifications existing
```

## References: value_object_category_links

```text
docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql
7:- create value_object_category_links;
92:CREATE TABLE IF NOT EXISTS public.value_object_category_links (
103:  CONSTRAINT value_object_category_links_category_table_check
110:  CONSTRAINT value_object_category_links_category_role_check
122:  CONSTRAINT value_object_category_links_source_check
124:  CONSTRAINT value_object_category_links_confidence_check
126:  CONSTRAINT value_object_category_links_metadata_is_object_check
128:  CONSTRAINT value_object_category_links_unique
132:CREATE INDEX IF NOT EXISTS idx_value_object_category_links_value_object_id
133:  ON public.value_object_category_links(value_object_id);
135:CREATE INDEX IF NOT EXISTS idx_value_object_category_links_category
136:  ON public.value_object_category_links(category_table, category_id);
138:CREATE INDEX IF NOT EXISTS idx_value_object_category_links_role
139:  ON public.value_object_category_links(category_role);
225:      'value_object_category_links',

docs/sql/P4.9.13-A1_controlled_hierarchy_candidate_audit.sql
47:  FROM public.value_object_category_links cl
160:    (SELECT count(*) FROM category_links) AS value_object_category_links_count,
236:  '03_value_object_category_links' AS section,

docs/sql/P4.9.14-A1_value_object_identity_display_readiness_audit.sql
64:  FROM public.value_object_category_links cl

docs/sql/P4.9.2-A4_category_link_runtime_verification.sql
3:Targeted verification after value_object_category_links runtime integration.
80:  FROM public.value_object_category_links cl
106:  FROM public.value_object_category_links cl
211:    (SELECT count(*) FROM public.value_object_category_links) AS global_value_object_category_links_count,
252:  '05_value_object_category_links_for_target_value_object' AS section,

docs/sql/P4.9.3-A2_knee_template_runtime_verification.sql
111:  FROM public.value_object_category_links cl
144:  FROM public.value_object_category_links cl
238:    (SELECT count(*) FROM public.value_object_category_links) AS global_category_links_count
277:  '05_value_object_category_links_for_target_value_object' AS section,

docs/sql/P4.9.4-A1_object_cloud_read_audit.sql
14:  value_object_category_links
37:  FROM public.value_object_category_links cl
205:    (SELECT count(*) FROM public.value_object_category_links) AS value_object_category_links_count,

docs/sql/P4.9.5-A1_create_value_object_cloud_profiles_v1.sql
14:- value_object_category_links
45:  FROM public.value_object_category_links cl

docs/value-objects/P4.10.0-A2_repo_category_rubricator_reference_inventory.txt
348:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:7: - create value_object_category_links;
353:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:92: CREATE TABLE IF NOT EXISTS public.value_object_category_links (
357:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:103: CONSTRAINT value_object_category_links_category_table_check
361:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:110: CONSTRAINT value_object_category_links_category_role_check
363:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:122: CONSTRAINT value_object_category_links_source_check
364:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:124: CONSTRAINT value_object_category_links_confidence_check
365:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:126: CONSTRAINT value_object_category_links_metadata_is_object_check
366:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:128: CONSTRAINT value_object_category_links_unique
368:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:132: CREATE INDEX IF NOT EXISTS idx_value_object_category_links_value_object_id
369:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:133: ON public.value_object_category_links(value_object_id);
370:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:135: CREATE INDEX IF NOT EXISTS idx_value_object_category_links_category
371:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:136: ON public.value_object_category_links(category_table, category_id);
372:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:138: CREATE INDEX IF NOT EXISTS idx_value_object_category_links_role
373:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:139: ON public.value_object_category_links(category_role);
374:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:225: 'value_object_category_links',
422:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.13-A1_controlled_hierarchy_candidate_audit.sql:47: FROM public.value_object_category_links cl
443:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.13-A1_controlled_hierarchy_candidate_audit.sql:160: (SELECT count(*) FROM category_links) AS value_object_category_links_count,
450:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.13-A1_controlled_hierarchy_candidate_audit.sql:236: '03_value_object_category_links' AS section,
474:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.14-A1_value_object_identity_display_readiness_audit.sql:64: FROM public.value_object_category_links cl
561:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:3: Targeted verification after value_object_category_links runtime integration.
570:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:80: FROM public.value_object_category_links cl
578:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:106: FROM public.value_object_category_links cl
582:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:211: (SELECT count(*) FROM public.value_object_category_links) AS global_value_object_category_links_count,
583:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:252: '05_value_object_category_links_for_target_value_object' AS section,
600:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:111: FROM public.value_object_category_links cl
608:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:144: FROM public.value_object_category_links cl
612:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:238: (SELECT count(*) FROM public.value_object_category_links) AS global_category_links_count
613:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:277: '05_value_object_category_links_for_target_value_object' AS section,
619:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.4-A1_object_cloud_read_audit.sql:14: value_object_category_links
634:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.4-A1_object_cloud_read_audit.sql:37: FROM public.value_object_category_links cl
657:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.4-A1_object_cloud_read_audit.sql:205: (SELECT count(*) FROM public.value_object_category_links) AS value_object_category_links_count,
665:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.5-A1_create_value_object_cloud_profiles_v1.sql:14: - value_object_category_links
680:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.5-A1_create_value_object_cloud_profiles_v1.sql:45: FROM public.value_object_category_links cl
770:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A2_v4_2_gap_conclusion.md:43: - value_object_category_links
959:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:542: relation_type|exposure_minutes|parent_value_object_id|needs_user_review|entity_protocol|commercial_usage|value_object_category_links|activity_event_value_object_links
998:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A4_local_code_routes_inventory_conclusion.md:42: | value_object_category_links | 1 |
1013:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A4_local_code_routes_inventory_conclusion.md:172: 1. value_object_category_links
1016:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A5_focused_live_schema_check_result.md:24: - value_object_category_links
1021:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A6_minimal_additive_migration_plan.md:42: ## Migration part 2 ÔÇö create value_object_category_links
1026:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A7_live_migration_result.md:12: - public.value_object_category_links
1028:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A7_live_migration_result.md:46: ## value_object_category_links
1039:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A8_foundation_checkpoint.md:32: - value_object_category_links
1042:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A8_foundation_checkpoint.md:79: 2. decide how to create value_object_category_links from contextual_categories
1043:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A10_runtime_projection_checkpoint.md:88: P4.9.2 ÔÇö connect value_object_category_links from reliable category/rubricator mapping.
1044:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A10_runtime_projection_checkpoint.md:95: - use existing classification metadata to populate value_object_category_links
1045:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:12: - value_object_category_links
1146:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:532: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 7 | - create value_object_category_links; |
1151:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:537: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 92 | CREATE TABLE IF NOT EXISTS public.value_object_category_links ( |
1155:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:541: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 103 | CONSTRAINT value_object_category_links_category_table_check |
1159:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:545: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 110 | CONSTRAINT value_object_category_links_category_role_check |
1161:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:547: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 122 | CONSTRAINT value_object_category_links_source_check |
1162:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:548: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 124 | CONSTRAINT value_object_category_links_confidence_check |
1163:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:549: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 126 | CONSTRAINT value_object_category_links_metadata_is_object_check |
1164:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:550: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 128 | CONSTRAINT value_object_category_links_unique |
1166:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:552: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 132 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_value_object_id |
1167:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:553: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 133 | ON public.value_object_category_links(value_object_id); |
1168:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:554: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 135 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_category |
1169:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:555: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 136 | ON public.value_object_category_links(category_table, category_id); |
1170:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:556: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 138 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_role |
1171:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:557: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 139 | ON public.value_object_category_links(category_role); |
1172:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:558: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 225 | 'value_object_category_links', |
1241:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:651: value_object_category_links|activity_event_value_object_links|value_object_usage_aggregates|exposure_minutes|parent_value_object_id|entity_protocol_characteristics_json|needs_user_review|category_origin_json|ui_visibility
1242:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:659: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 7 | - create value_object_category_links; |
1247:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:686: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 92 | CREATE TABLE IF NOT EXISTS public.value_object_category_links ( |
1248:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:687: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 103 | CONSTRAINT value_object_category_links_category_table_check |
1249:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:688: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 110 | CONSTRAINT value_object_category_links_category_role_check |
1250:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:689: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 122 | CONSTRAINT value_object_category_links_source_check |
1251:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:690: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 124 | CONSTRAINT value_object_category_links_confidence_check |
1252:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:691: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 126 | CONSTRAINT value_object_category_links_metadata_is_object_check |
1253:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:692: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 128 | CONSTRAINT value_object_category_links_unique |
1254:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:693: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 132 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_value_object_id |
1255:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:694: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 133 | ON public.value_object_category_links(value_object_id); |
1256:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:695: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 135 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_category |
1257:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:696: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 136 | ON public.value_object_category_links(category_table, category_id); |
1258:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:697: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 138 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_role |
1259:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:698: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 139 | ON public.value_object_category_links(category_role); |
1260:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:729: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 225 | 'value_object_category_links', |
1300:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A2_runtime_writer_inventory_conclusion.md:41: | value_object_category_links | 32 |
1308:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A2_runtime_writer_inventory_conclusion.md:189: - value_object_category_links
1309:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A2_runtime_writer_inventory_conclusion.md:202: 6. create value_object_category_links only when category/context data is known and reliable;
1310:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:10: - value_object_category_links
1333:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:862: value_object_category_links|activity_event_value_object_links|value_object_usage_aggregates|exposure_minutes
1334:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:877: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 7 | - create value_object_category_links; |
1335:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:880: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 92 | CREATE TABLE IF NOT EXISTS public.value_object_category_links ( |
1336:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:881: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 103 | CONSTRAINT value_object_category_links_category_table_check |
1337:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:882: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 110 | CONSTRAINT value_object_category_links_category_role_check |
1338:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:883: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 122 | CONSTRAINT value_object_category_links_source_check |
1339:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:884: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 124 | CONSTRAINT value_object_category_links_confidence_check |
1340:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:885: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 126 | CONSTRAINT value_object_category_links_metadata_is_object_check |
1341:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:886: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 128 | CONSTRAINT value_object_category_links_unique |
1342:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:887: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 132 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_value_object_id |
1343:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:888: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 133 | ON public.value_object_category_links(value_object_id); |
1344:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:889: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 135 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_category |
1345:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:890: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 136 | ON public.value_object_category_links(category_table, category_id); |
1346:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:891: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 138 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_role |
1347:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:892: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 139 | ON public.value_object_category_links(category_role); |
1348:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:923: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 225 | 'value_object_category_links', |
1546:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A5_function_surface_map.md:638: - defer value_object_category_links until category mapping is reliable.
1620:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A7_first_runtime_projection_plan.md:78: - create value_object_category_links in this step
1621:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A8_code_change_result.md:27: - value_object_category_links is not used yet
1623:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A9_runtime_verification_result.md:95: No value_object_category_links integration was done in this step.
1695:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1157: 913:     .from("value_object_category_links")
1698:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1173: 913:     .from("value_object_category_links")
2144:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A4_object_cloud_debug_guard_checkpoint.md:94: - value_object_category_links
2157:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.11-A3_parent_child_value_object_read_model_checkpoint.md:74: - value_object_category_links
2177:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.12-A4_controlled_hierarchy_strategy_and_read_model_checkpoint.md:92: - value_object_category_links
2178:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.13-A1_controlled_hierarchy_candidate_audit_plan.md:17: - public.value_object_category_links
2181:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.13-A2_controlled_hierarchy_candidate_audit_result.md:26: - value_object_category_links_count: 2
2189:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.13-A3_controlled_hierarchy_candidate_audit_checkpoint.md:43: - value_object_category_links_count: 2
2190:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.13-A3_controlled_hierarchy_candidate_audit_checkpoint.md:74: - value_object_category_links
2191:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.14-A1_value_object_identity_display_readiness_audit_plan.md:19: - public.value_object_category_links
2214:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.14-A3_value_object_identity_display_readiness_checkpoint.md:93: - value_object_category_links
2240:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:1: # P4.9.2-A1 ÔÇö value_object_category_links live source proof
2241:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:8: P4.9.2-A1 checked whether the new p491 runtime projection metadata contains enough reliable category/rubricator data to populate value_object_category_links.
2243:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:16: - existing_value_object_category_links_count: 0
2253:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:47: P4.9.2-A1 proves that value_object_category_links can be created from reliable existing runtime metadata.
2255:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:1: # P4.9.2-A2 ÔÇö value_object_category_links runtime integration plan
2256:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:8: Connect value_object_category_links from reliable category/rubricator mapping metadata.
2257:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:32: - public.value_object_category_links
2271:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:98: 6. confirm value_object_category_links_count > 0
2272:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:103: P4.9.2-A3 will replace lib/activity/valueObjectBridge.ts with full-file code adding value_object_category_links runtime support.
2274:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:14: - public.value_object_category_links
2279:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:41: - value_object_category_links
2283:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:65: If value_object_category_links upsert fails, the bridge logs a warning and records the error on createdItem.valueObjectCategoryLinkError, but it does not roll back the existing VOI pipeline or the p491 projection layer.
2289:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A4_category_link_runtime_verification_result.md:42: - global_value_object_category_links_count: 1
2291:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A4_category_link_runtime_verification_result.md:78: - table: value_object_category_links
2300:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A4_category_link_runtime_verification_result.md:91: - metadata_json.p492.projection: value_object_category_links
2301:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A4_category_link_runtime_verification_result.md:103: P4.9.2-A4 confirms that value_object_category_links runtime integration works.
2304:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A5_category_link_runtime_checkpoint.md:8: P4.9.2 connected value_object_category_links from reliable rubricator/classification metadata available in the Value Object Bridge mapping metadata.
2310:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A5_category_link_runtime_checkpoint.md:26: Prepared additive integration plan for value_object_category_links in lib/activity/valueObjectBridge.ts.
2315:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A5_category_link_runtime_checkpoint.md:37: - upserts into value_object_category_links
2317:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A5_category_link_runtime_checkpoint.md:48: - p492 value_object_category_links row is created
2335:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.3-A2_knee_template_runtime_verification_result.md:87: - table: value_object_category_links
2344:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.3-A2_knee_template_runtime_verification_result.md:100: - metadata_json.p492.projection: value_object_category_links
2352:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.3-A3_broadened_runtime_verification_checkpoint.md:37: - p492 value_object_category_links row exists
2355:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.3-A3_broadened_runtime_verification_checkpoint.md:85: - value_object_category_links
2359:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A1_object_cloud_read_audit_plan.md:14: 3. value_object_category_links
2360:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A1_object_cloud_read_audit_plan.md:22: - value_object_category_links
2364:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A2_object_cloud_read_audit_result.md:16: - value_object_category_links
2366:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A2_object_cloud_read_audit_result.md:29: - value_object_category_links_count: 2
2384:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A3_object_cloud_read_layer_checkpoint.md:23: - value_object_category_links
2386:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A3_object_cloud_read_layer_checkpoint.md:41: - value_object_category_links_count: 2
2390:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.5-A1_object_cloud_sql_view_plan.md:18: - value_object_category_links
2411:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.5-A3_reusable_object_cloud_read_interface_checkpoint.md:27: - value_object_category_links
2413:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.5-A3_reusable_object_cloud_read_interface_checkpoint.md:76: - value_object_category_links
2479:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A3_object_cloud_debug_api_endpoint_code_change_result.md:52: - value_object_category_links
2486:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A5_object_cloud_debug_api_endpoint_checkpoint.md:115: - value_object_category_links
2488:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A5_object_cloud_debug_api_endpoint_checkpoint.md:135: - value_object_category_links
2512:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.8-A2_object_cloud_debug_ui_page_code_change_result.md:46: - value_object_category_links
2516:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.8-A4_object_cloud_debug_ui_page_checkpoint.md:77: - value_object_category_links
2518:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.8-A4_object_cloud_debug_ui_page_checkpoint.md:99: - value_object_category_links
2618:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.9-A1_object_cloud_security_read_exposure_inspection.md:830: 14: - value_object_category_links
2669:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.9-A1_object_cloud_security_read_exposure_inspection.md:1323: 135: - value_object_category_links
2685:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.9-A1_object_cloud_security_read_exposure_inspection.md:1567: 99: - value_object_category_links
2686:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.9-A1_object_cloud_security_read_exposure_inspection.md:1570: 99: - value_object_category_links
2701:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.9-A3_object_cloud_security_read_exposure_checkpoint.md:101: - value_object_category_links
3588:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:913: .from("value_object_category_links")
3615:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:955: projection: "value_object_category_links",
3629:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1232: console.warn("P4.9.2 value_object_category_links upsert failed", {

docs/value-objects/P4.10.0-A2_repo_value_object_reference_inventory.txt
194:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:7: - create value_object_category_links;
229:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:92: CREATE TABLE IF NOT EXISTS public.value_object_category_links (
231:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:103: CONSTRAINT value_object_category_links_category_table_check
232:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:110: CONSTRAINT value_object_category_links_category_role_check
233:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:122: CONSTRAINT value_object_category_links_source_check
234:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:124: CONSTRAINT value_object_category_links_confidence_check
235:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:126: CONSTRAINT value_object_category_links_metadata_is_object_check
236:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:128: CONSTRAINT value_object_category_links_unique
237:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:132: CREATE INDEX IF NOT EXISTS idx_value_object_category_links_value_object_id
238:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:133: ON public.value_object_category_links(value_object_id);
239:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:135: CREATE INDEX IF NOT EXISTS idx_value_object_category_links_category
240:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:136: ON public.value_object_category_links(category_table, category_id);
241:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:138: CREATE INDEX IF NOT EXISTS idx_value_object_category_links_role
242:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:139: ON public.value_object_category_links(category_role);
275:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:225: 'value_object_category_links',
365:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.13-A1_controlled_hierarchy_candidate_audit.sql:47: FROM public.value_object_category_links cl
380:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.13-A1_controlled_hierarchy_candidate_audit.sql:160: (SELECT count(*) FROM category_links) AS value_object_category_links_count,
391:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.13-A1_controlled_hierarchy_candidate_audit.sql:236: '03_value_object_category_links' AS section,
405:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.14-A1_value_object_identity_display_readiness_audit.sql:64: FROM public.value_object_category_links cl
585:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:3: Targeted verification after value_object_category_links runtime integration.
588:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:80: FROM public.value_object_category_links cl
589:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:106: FROM public.value_object_category_links cl
592:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:211: (SELECT count(*) FROM public.value_object_category_links) AS global_value_object_category_links_count,
597:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:252: '05_value_object_category_links_for_target_value_object' AS section,
602:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:111: FROM public.value_object_category_links cl
603:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:144: FROM public.value_object_category_links cl
606:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:238: (SELECT count(*) FROM public.value_object_category_links) AS global_category_links_count
609:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:277: '05_value_object_category_links_for_target_value_object' AS section,
612:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.4-A1_object_cloud_read_audit.sql:14: value_object_category_links
613:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.4-A1_object_cloud_read_audit.sql:37: FROM public.value_object_category_links cl
624:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.4-A1_object_cloud_read_audit.sql:205: (SELECT count(*) FROM public.value_object_category_links) AS value_object_category_links_count,
626:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.5-A1_create_value_object_cloud_profiles_v1.sql:14: - value_object_category_links
630:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.5-A1_create_value_object_cloud_profiles_v1.sql:45: FROM public.value_object_category_links cl
675:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A2_v4_2_gap_conclusion.md:43: - value_object_category_links
709:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:542: relation_type|exposure_minutes|parent_value_object_id|needs_user_review|entity_protocol|commercial_usage|value_object_category_links|activity_event_value_object_links
718:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A4_local_code_routes_inventory_conclusion.md:42: | value_object_category_links | 1 |
722:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A4_local_code_routes_inventory_conclusion.md:172: 1. value_object_category_links
728:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A5_focused_live_schema_check_result.md:24: - value_object_category_links
741:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A6_minimal_additive_migration_plan.md:42: ## Migration part 2 ÔÇö create value_object_category_links
746:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A7_live_migration_result.md:12: - public.value_object_category_links
755:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A7_live_migration_result.md:46: ## value_object_category_links
759:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A8_foundation_checkpoint.md:32: - value_object_category_links
769:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A8_foundation_checkpoint.md:79: 2. decide how to create value_object_category_links from contextual_categories
777:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A10_runtime_projection_checkpoint.md:88: P4.9.2 ÔÇö connect value_object_category_links from reliable category/rubricator mapping.
778:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A10_runtime_projection_checkpoint.md:95: - use existing classification metadata to populate value_object_category_links
779:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:12: - value_object_category_links
785:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:532: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 7 | - create value_object_category_links; |
788:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:537: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 92 | CREATE TABLE IF NOT EXISTS public.value_object_category_links ( |
789:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:541: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 103 | CONSTRAINT value_object_category_links_category_table_check |
790:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:545: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 110 | CONSTRAINT value_object_category_links_category_role_check |
791:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:547: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 122 | CONSTRAINT value_object_category_links_source_check |
792:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:548: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 124 | CONSTRAINT value_object_category_links_confidence_check |
793:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:549: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 126 | CONSTRAINT value_object_category_links_metadata_is_object_check |
794:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:550: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 128 | CONSTRAINT value_object_category_links_unique |
795:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:552: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 132 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_value_object_id |
796:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:553: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 133 | ON public.value_object_category_links(value_object_id); |
797:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:554: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 135 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_category |
798:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:555: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 136 | ON public.value_object_category_links(category_table, category_id); |
799:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:556: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 138 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_role |
800:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:557: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 139 | ON public.value_object_category_links(category_role); |
801:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:558: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 225 | 'value_object_category_links', |
802:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:651: value_object_category_links|activity_event_value_object_links|value_object_usage_aggregates|exposure_minutes|parent_value_object_id|entity_protocol_characteristics_json|needs_user_review|category_origin_json|ui_visibility
804:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:659: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 7 | - create value_object_category_links; |
827:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:686: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 92 | CREATE TABLE IF NOT EXISTS public.value_object_category_links ( |
828:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:687: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 103 | CONSTRAINT value_object_category_links_category_table_check |
829:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:688: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 110 | CONSTRAINT value_object_category_links_category_role_check |
830:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:689: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 122 | CONSTRAINT value_object_category_links_source_check |
831:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:690: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 124 | CONSTRAINT value_object_category_links_confidence_check |
832:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:691: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 126 | CONSTRAINT value_object_category_links_metadata_is_object_check |
833:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:692: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 128 | CONSTRAINT value_object_category_links_unique |
834:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:693: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 132 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_value_object_id |
835:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:694: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 133 | ON public.value_object_category_links(value_object_id); |
836:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:695: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 135 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_category |
837:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:696: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 136 | ON public.value_object_category_links(category_table, category_id); |
838:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:697: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 138 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_role |
839:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:698: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 139 | ON public.value_object_category_links(category_role); |
870:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:729: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 225 | 'value_object_category_links', |
887:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A2_runtime_writer_inventory_conclusion.md:41: | value_object_category_links | 32 |
893:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A2_runtime_writer_inventory_conclusion.md:189: - value_object_category_links
899:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A2_runtime_writer_inventory_conclusion.md:202: 6. create value_object_category_links only when category/context data is known and reliable;
900:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:10: - value_object_category_links
907:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:862: value_object_category_links|activity_event_value_object_links|value_object_usage_aggregates|exposure_minutes
908:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:877: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 7 | - create value_object_category_links; |
911:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:880: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 92 | CREATE TABLE IF NOT EXISTS public.value_object_category_links ( |
912:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:881: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 103 | CONSTRAINT value_object_category_links_category_table_check |
913:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:882: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 110 | CONSTRAINT value_object_category_links_category_role_check |
914:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:883: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 122 | CONSTRAINT value_object_category_links_source_check |
915:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:884: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 124 | CONSTRAINT value_object_category_links_confidence_check |
916:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:885: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 126 | CONSTRAINT value_object_category_links_metadata_is_object_check |
917:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:886: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 128 | CONSTRAINT value_object_category_links_unique |
918:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:887: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 132 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_value_object_id |
919:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:888: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 133 | ON public.value_object_category_links(value_object_id); |
920:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:889: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 135 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_category |
921:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:890: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 136 | ON public.value_object_category_links(category_table, category_id); |
922:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:891: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 138 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_role |
923:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:892: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 139 | ON public.value_object_category_links(category_role); |
954:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:923: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 225 | 'value_object_category_links', |
979:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A5_function_surface_map.md:638: - defer value_object_category_links until category mapping is reliable.
991:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A7_first_runtime_projection_plan.md:78: - create value_object_category_links in this step
996:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A8_code_change_result.md:27: - value_object_category_links is not used yet
1005:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A9_runtime_verification_result.md:95: No value_object_category_links integration was done in this step.
1006:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1157: 913:     .from("value_object_category_links")
1007:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1173: 913:     .from("value_object_category_links")
1015:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A4_object_cloud_debug_guard_checkpoint.md:94: - value_object_category_links
1052:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.11-A3_parent_child_value_object_read_model_checkpoint.md:74: - value_object_category_links
1100:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.12-A4_controlled_hierarchy_strategy_and_read_model_checkpoint.md:92: - value_object_category_links
1107:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.13-A1_controlled_hierarchy_candidate_audit_plan.md:17: - public.value_object_category_links
1112:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.13-A2_controlled_hierarchy_candidate_audit_result.md:26: - value_object_category_links_count: 2
1116:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.13-A3_controlled_hierarchy_candidate_audit_checkpoint.md:43: - value_object_category_links_count: 2
1120:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.13-A3_controlled_hierarchy_candidate_audit_checkpoint.md:74: - value_object_category_links
1125:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.14-A1_value_object_identity_display_readiness_audit_plan.md:19: - public.value_object_category_links
1155:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.14-A3_value_object_identity_display_readiness_checkpoint.md:93: - value_object_category_links
1417:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:1: # P4.9.2-A1 ÔÇö value_object_category_links live source proof
1418:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:8: P4.9.2-A1 checked whether the new p491 runtime projection metadata contains enough reliable category/rubricator data to populate value_object_category_links.
1419:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:16: - existing_value_object_category_links_count: 0
1424:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:47: P4.9.2-A1 proves that value_object_category_links can be created from reliable existing runtime metadata.
1425:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:1: # P4.9.2-A2 ÔÇö value_object_category_links runtime integration plan
1426:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:8: Connect value_object_category_links from reliable category/rubricator mapping metadata.
1428:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:32: - public.value_object_category_links
1430:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:98: 6. confirm value_object_category_links_count > 0
1431:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:103: P4.9.2-A3 will replace lib/activity/valueObjectBridge.ts with full-file code adding value_object_category_links runtime support.
1432:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:14: - public.value_object_category_links
1433:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:41: - value_object_category_links
1436:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:65: If value_object_category_links upsert fails, the bridge logs a warning and records the error on createdItem.valueObjectCategoryLinkError, but it does not roll back the existing VOI pipeline or the p491 projection layer.
1437:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A4_category_link_runtime_verification_result.md:42: - global_value_object_category_links_count: 1
1444:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A4_category_link_runtime_verification_result.md:78: - table: value_object_category_links
1445:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A4_category_link_runtime_verification_result.md:91: - metadata_json.p492.projection: value_object_category_links
1446:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A4_category_link_runtime_verification_result.md:103: P4.9.2-A4 confirms that value_object_category_links runtime integration works.
1447:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A5_category_link_runtime_checkpoint.md:8: P4.9.2 connected value_object_category_links from reliable rubricator/classification metadata available in the Value Object Bridge mapping metadata.
1448:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A5_category_link_runtime_checkpoint.md:26: Prepared additive integration plan for value_object_category_links in lib/activity/valueObjectBridge.ts.
1449:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A5_category_link_runtime_checkpoint.md:37: - upserts into value_object_category_links
1452:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A5_category_link_runtime_checkpoint.md:48: - p492 value_object_category_links row is created
1459:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.3-A2_knee_template_runtime_verification_result.md:87: - table: value_object_category_links
1460:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.3-A2_knee_template_runtime_verification_result.md:100: - metadata_json.p492.projection: value_object_category_links
1463:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.3-A3_broadened_runtime_verification_checkpoint.md:37: - p492 value_object_category_links row exists
1466:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.3-A3_broadened_runtime_verification_checkpoint.md:85: - value_object_category_links
1469:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A1_object_cloud_read_audit_plan.md:14: 3. value_object_category_links
1472:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A1_object_cloud_read_audit_plan.md:22: - value_object_category_links
1475:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A2_object_cloud_read_audit_result.md:16: - value_object_category_links
1478:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A2_object_cloud_read_audit_result.md:29: - value_object_category_links_count: 2
1489:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A3_object_cloud_read_layer_checkpoint.md:23: - value_object_category_links
1492:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A3_object_cloud_read_layer_checkpoint.md:41: - value_object_category_links_count: 2
1497:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.5-A1_object_cloud_sql_view_plan.md:18: - value_object_category_links
1507:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.5-A3_reusable_object_cloud_read_interface_checkpoint.md:27: - value_object_category_links
1515:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.5-A3_reusable_object_cloud_read_interface_checkpoint.md:76: - value_object_category_links
1540:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A3_object_cloud_debug_api_endpoint_code_change_result.md:52: - value_object_category_links
1547:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A5_object_cloud_debug_api_endpoint_checkpoint.md:115: - value_object_category_links
1550:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A5_object_cloud_debug_api_endpoint_checkpoint.md:135: - value_object_category_links
1555:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.8-A2_object_cloud_debug_ui_page_code_change_result.md:46: - value_object_category_links
1559:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.8-A4_object_cloud_debug_ui_page_checkpoint.md:77: - value_object_category_links
1562:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.8-A4_object_cloud_debug_ui_page_checkpoint.md:99: - value_object_category_links
1577:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.9-A1_object_cloud_security_read_exposure_inspection.md:830: 14: - value_object_category_links
1618:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.9-A1_object_cloud_security_read_exposure_inspection.md:1323: 135: - value_object_category_links
1623:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.9-A1_object_cloud_security_read_exposure_inspection.md:1567: 99: - value_object_category_links
1625:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.9-A1_object_cloud_security_read_exposure_inspection.md:1570: 99: - value_object_category_links
1636:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.9-A3_object_cloud_security_read_exposure_checkpoint.md:101: - value_object_category_links
1689:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:913: .from("value_object_category_links")
1690:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:955: projection: "value_object_category_links",
1691:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1232: console.warn("P4.9.2 value_object_category_links upsert failed", {

docs/value-objects/P4.10.0-A3_category_derived_vo_inventory_checkpoint.md
26:- value_object_category_links
93:- value_object_category_links;

docs/value-objects/P4.10.0-B2_minimal_schema_v4_2_gap_analysis_checkpoint.md
27:- value_object_category_links
74:Confirmed live value_object_category_links model uses:

docs/value-objects/P4.10.0-C3_free_text_processor_runtime_inventory_checkpoint.md
74:- value_object_category_links

docs/value-objects/P4.10.0-C4_minimal_free_text_v1_design_decision.md
26:- it already handles value_object_category_links;
120:- value_object_category_links

docs/value-objects/P4.10.0-C5_key_code_ranges.txt
1016:.\lib\activity\valueObjectBridge.ts:1232:         console.warn("P4.9.2 value_object_category_links upsert failed", {

docs/value-objects/P4.10.0-C7-G_free_text_runtime_verification_checkpoint.md
102:- but value_object_category_links was not created for Walking to work.

docs/value-objects/P4.9.0-A2_v4_2_gap_conclusion.md
43:- value_object_category_links

docs/value-objects/P4.9.0-A3_local_code_routes_inventory.md
542:relation_type|exposure_minutes|parent_value_object_id|needs_user_review|entity_protocol|commercial_usage|value_object_category_links|activity_event_value_object_links

docs/value-objects/P4.9.0-A4_local_code_routes_inventory_conclusion.md
42:| value_object_category_links | 1 |
172:1. value_object_category_links

docs/value-objects/P4.9.0-A5_focused_live_schema_check_result.md
24:- value_object_category_links

docs/value-objects/P4.9.0-A6_minimal_additive_migration_plan.md
42:## Migration part 2 ÔÇö create value_object_category_links

docs/value-objects/P4.9.0-A7_live_migration_result.md
12:- public.value_object_category_links
46:## value_object_category_links

docs/value-objects/P4.9.0-A8_foundation_checkpoint.md
32:- value_object_category_links
79:2. decide how to create value_object_category_links from contextual_categories

docs/value-objects/P4.9.1-A10_runtime_projection_checkpoint.md
88:P4.9.2 ÔÇö connect value_object_category_links from reliable category/rubricator mapping.
95:- use existing classification metadata to populate value_object_category_links

docs/value-objects/P4.9.1-A1_runtime_writer_inventory.md
12:- value_object_category_links
532:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 7 | - create value_object_category_links; |
537:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 92 | CREATE TABLE IF NOT EXISTS public.value_object_category_links ( |
541:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 103 | CONSTRAINT value_object_category_links_category_table_check |
545:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 110 | CONSTRAINT value_object_category_links_category_role_check |
547:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 122 | CONSTRAINT value_object_category_links_source_check |
548:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 124 | CONSTRAINT value_object_category_links_confidence_check |
549:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 126 | CONSTRAINT value_object_category_links_metadata_is_object_check |
550:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 128 | CONSTRAINT value_object_category_links_unique |
552:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 132 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_value_object_id |
553:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 133 | ON public.value_object_category_links(value_object_id); |
554:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 135 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_category |
555:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 136 | ON public.value_object_category_links(category_table, category_id); |
556:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 138 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_role |
557:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 139 | ON public.value_object_category_links(category_role); |
558:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 225 | 'value_object_category_links', |
651:value_object_category_links|activity_event_value_object_links|value_object_usage_aggregates|exposure_minutes|parent_value_object_id|entity_protocol_characteristics_json|needs_user_review|category_origin_json|ui_visibility
659:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 7 | - create value_object_category_links; |
686:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 92 | CREATE TABLE IF NOT EXISTS public.value_object_category_links ( |
687:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 103 | CONSTRAINT value_object_category_links_category_table_check |
688:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 110 | CONSTRAINT value_object_category_links_category_role_check |
689:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 122 | CONSTRAINT value_object_category_links_source_check |
690:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 124 | CONSTRAINT value_object_category_links_confidence_check |
691:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 126 | CONSTRAINT value_object_category_links_metadata_is_object_check |
692:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 128 | CONSTRAINT value_object_category_links_unique |
693:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 132 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_value_object_id |
694:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 133 | ON public.value_object_category_links(value_object_id); |
695:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 135 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_category |
696:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 136 | ON public.value_object_category_links(category_table, category_id); |
697:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 138 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_role |
698:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 139 | ON public.value_object_category_links(category_role); |
729:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 225 | 'value_object_category_links', |

docs/value-objects/P4.9.1-A2_runtime_writer_inventory_conclusion.md
41:| value_object_category_links | 32 |
189:- value_object_category_links
202:6. create value_object_category_links only when category/context data is known and reliable;

docs/value-objects/P4.9.1-A3_focused_writer_file_inspection.md
10:- value_object_category_links
862:value_object_category_links|activity_event_value_object_links|value_object_usage_aggregates|exposure_minutes
877:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 7 | - create value_object_category_links; |
880:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 92 | CREATE TABLE IF NOT EXISTS public.value_object_category_links ( |
881:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 103 | CONSTRAINT value_object_category_links_category_table_check |
882:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 110 | CONSTRAINT value_object_category_links_category_role_check |
883:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 122 | CONSTRAINT value_object_category_links_source_check |
884:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 124 | CONSTRAINT value_object_category_links_confidence_check |
885:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 126 | CONSTRAINT value_object_category_links_metadata_is_object_check |
886:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 128 | CONSTRAINT value_object_category_links_unique |
887:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 132 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_value_object_id |
888:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 133 | ON public.value_object_category_links(value_object_id); |
889:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 135 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_category |
890:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 136 | ON public.value_object_category_links(category_table, category_id); |
891:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 138 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_role |
892:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 139 | ON public.value_object_category_links(category_role); |
923:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 225 | 'value_object_category_links', |

docs/value-objects/P4.9.1-A5_function_surface_map.md
638:- defer value_object_category_links until category mapping is reliable.

docs/value-objects/P4.9.1-A7_first_runtime_projection_plan.md
78:- create value_object_category_links in this step

docs/value-objects/P4.9.1-A8_code_change_result.md
27:- value_object_category_links is not used yet

docs/value-objects/P4.9.1-A9_runtime_verification_result.md
95:No value_object_category_links integration was done in this step.

docs/value-objects/P4.9.10-A1_debug_admin_guard_conventions_inspection.md
1157:  913:     .from("value_object_category_links")
1173:  913:     .from("value_object_category_links")

docs/value-objects/P4.9.10-A4_object_cloud_debug_guard_checkpoint.md
94:- value_object_category_links

docs/value-objects/P4.9.11-A3_parent_child_value_object_read_model_checkpoint.md
74:- value_object_category_links

docs/value-objects/P4.9.12-A4_controlled_hierarchy_strategy_and_read_model_checkpoint.md
92:- value_object_category_links

docs/value-objects/P4.9.13-A1_controlled_hierarchy_candidate_audit_plan.md
17:- public.value_object_category_links

docs/value-objects/P4.9.13-A2_controlled_hierarchy_candidate_audit_result.md
26:- value_object_category_links_count: 2

docs/value-objects/P4.9.13-A3_controlled_hierarchy_candidate_audit_checkpoint.md
43:- value_object_category_links_count: 2
74:- value_object_category_links

docs/value-objects/P4.9.14-A1_value_object_identity_display_readiness_audit_plan.md
19:- public.value_object_category_links

docs/value-objects/P4.9.14-A3_value_object_identity_display_readiness_checkpoint.md
93:- value_object_category_links

docs/value-objects/P4.9.2-A1_category_link_live_source_proof.md
1:´╗┐# P4.9.2-A1 ÔÇö value_object_category_links live source proof
8:P4.9.2-A1 checked whether the new p491 runtime projection metadata contains enough reliable category/rubricator data to populate value_object_category_links.
16:- existing_value_object_category_links_count: 0
47:P4.9.2-A1 proves that value_object_category_links can be created from reliable existing runtime metadata.

docs/value-objects/P4.9.2-A2_category_link_runtime_integration_plan.md
1:´╗┐# P4.9.2-A2 ÔÇö value_object_category_links runtime integration plan
8:Connect value_object_category_links from reliable category/rubricator mapping metadata.
32:- public.value_object_category_links
98:6. confirm value_object_category_links_count > 0
103:P4.9.2-A3 will replace lib/activity/valueObjectBridge.ts with full-file code adding value_object_category_links runtime support.

docs/value-objects/P4.9.2-A3_category_link_code_change_result.md
14:- public.value_object_category_links
41:- value_object_category_links
65:If value_object_category_links upsert fails, the bridge logs a warning and records the error on createdItem.valueObjectCategoryLinkError, but it does not roll back the existing VOI pipeline or the p491 projection layer.

docs/value-objects/P4.9.2-A4_category_link_runtime_verification_result.md
42:- global_value_object_category_links_count: 1
78:- table: value_object_category_links
91:- metadata_json.p492.projection: value_object_category_links
103:P4.9.2-A4 confirms that value_object_category_links runtime integration works.

docs/value-objects/P4.9.2-A5_category_link_runtime_checkpoint.md
8:P4.9.2 connected value_object_category_links from reliable rubricator/classification metadata available in the Value Object Bridge mapping metadata.
26:Prepared additive integration plan for value_object_category_links in lib/activity/valueObjectBridge.ts.
37:- upserts into value_object_category_links
48:- p492 value_object_category_links row is created

docs/value-objects/P4.9.3-A2_knee_template_runtime_verification_result.md
87:- table: value_object_category_links
100:- metadata_json.p492.projection: value_object_category_links

docs/value-objects/P4.9.3-A3_broadened_runtime_verification_checkpoint.md
37:- p492 value_object_category_links row exists
85:- value_object_category_links

docs/value-objects/P4.9.4-A1_object_cloud_read_audit_plan.md
14:3. value_object_category_links
22:- value_object_category_links

docs/value-objects/P4.9.4-A2_object_cloud_read_audit_result.md
16:- value_object_category_links
29:- value_object_category_links_count: 2

docs/value-objects/P4.9.4-A3_object_cloud_read_layer_checkpoint.md
23:- value_object_category_links
41:- value_object_category_links_count: 2

docs/value-objects/P4.9.5-A1_object_cloud_sql_view_plan.md
18:- value_object_category_links

docs/value-objects/P4.9.5-A3_reusable_object_cloud_read_interface_checkpoint.md
27:- value_object_category_links
76:- value_object_category_links

docs/value-objects/P4.9.7-A3_object_cloud_debug_api_endpoint_code_change_result.md
52:- value_object_category_links

docs/value-objects/P4.9.7-A5_object_cloud_debug_api_endpoint_checkpoint.md
115:- value_object_category_links
135:- value_object_category_links

docs/value-objects/P4.9.8-A2_object_cloud_debug_ui_page_code_change_result.md
46:- value_object_category_links

docs/value-objects/P4.9.8-A4_object_cloud_debug_ui_page_checkpoint.md
77:- value_object_category_links
99:- value_object_category_links

docs/value-objects/P4.9.9-A1_object_cloud_security_read_exposure_inspection.md
830:   14: - value_object_category_links
1323:  135: - value_object_category_links
1567:   99: - value_object_category_links
1570:   99: - value_object_category_links

docs/value-objects/P4.9.9-A3_object_cloud_security_read_exposure_checkpoint.md
101:- value_object_category_links

docs/value-objects/category-derivation-layer-v1.md
20:The free-text runtime pipeline creates the event and Value Object projection rows, but it does not create value_object_category_links.
32:Pipeline: free text / app action -> raw Activity Event -> Category Derivation Run -> rule-based extractor -> optional structured AI classifier -> categoryCandidates[] -> resolver slug to category_id -> activity_category_derivations -> Value Object Bridge -> value_object_category_links -> activity_event_value_object_links -> aggregates / snapshots.
80:After category candidates are resolved, the bridge must create Value Objects, Value Object instances, activity_event_value_object_links, value_object_category_links, usage aggregates, daily aggregates, snapshots and processing logs.
82:For free-text events, value_object_category_links must no longer remain empty when semantic category candidates are available.
102:Expected rows: activity_event, category_derivation_run, activity_category_derivations, value_objects, value_object_category_links, activity_event_value_object_links, usage aggregates, daily aggregates, snapshots and processing logs.
119:Inventory targets: contextual_categories, entity_classifications, value_object_category_links, activity_event_value_object_links, processing logs, mapper contracts, bridge contracts, free-text fallback metadata, existing migrations touching contextual categories and VO links.

lib/activity/valueObjectBridge.ts
913:    .from("value_object_category_links")
955:            projection: "value_object_category_links",
1232:        console.warn("P4.9.2 value_object_category_links upsert failed", {
```

## References: activity_event_value_object_links

```text
docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql
8:- create activity_event_value_object_links;
141:CREATE TABLE IF NOT EXISTS public.activity_event_value_object_links (
152:  CONSTRAINT activity_event_value_object_links_exposure_minutes_check
154:  CONSTRAINT activity_event_value_object_links_source_check
156:  CONSTRAINT activity_event_value_object_links_confidence_check
158:  CONSTRAINT activity_event_value_object_links_metadata_is_object_check
160:  CONSTRAINT activity_event_value_object_links_unique
164:CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_user_id
165:  ON public.activity_event_value_object_links(user_id);
167:CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_event_id
168:  ON public.activity_event_value_object_links(event_id);
170:CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_value_object_id
171:  ON public.activity_event_value_object_links(value_object_id);
173:CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_exposure
174:  ON public.activity_event_value_object_links(value_object_id, exposure_minutes);
226:      'activity_event_value_object_links',

docs/sql/P4.9.1-A9_runtime_projection_verification.sql
60:  FROM public.activity_event_value_object_links l
157:  '03_new_activity_event_value_object_links' AS section,

docs/sql/P4.9.14-A1_value_object_identity_display_readiness_audit.sql
143:  FROM public.activity_event_value_object_links aevl

docs/sql/P4.9.2-A4_category_link_runtime_verification.sql
59:  FROM public.activity_event_value_object_links l
212:    (SELECT count(*) FROM public.activity_event_value_object_links) AS global_new_v42_links_count,
238:  '03_new_activity_event_value_object_links' AS section,

docs/sql/P4.9.3-A2_knee_template_runtime_verification.sql
67:  FROM public.activity_event_value_object_links l
236:    (SELECT count(*) FROM public.activity_event_value_object_links) AS global_p491_projection_rows_count,
263:  '03_new_activity_event_value_object_links' AS section,

docs/sql/P4.9.4-A1_object_cloud_read_audit.sql
12:  activity_event_value_object_links
85:  FROM public.activity_event_value_object_links l
203:    (SELECT count(*) FROM public.activity_event_value_object_links) AS activity_event_value_object_links_count,

docs/sql/P4.9.5-A1_create_value_object_cloud_profiles_v1.sql
17:- activity_event_value_object_links
93:  FROM public.activity_event_value_object_links l

docs/value-objects/P4.10.0-A2_repo_activity_processing_reference_inventory.txt
921:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:942: 2. insert/upsert activity_event_value_object_links with exposure_minutes = activity_events.duration_minutes by default;

docs/value-objects/P4.10.0-A2_repo_category_rubricator_reference_inventory.txt
959:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:542: relation_type|exposure_minutes|parent_value_object_id|needs_user_review|entity_protocol|commercial_usage|value_object_category_links|activity_event_value_object_links
1241:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:651: value_object_category_links|activity_event_value_object_links|value_object_usage_aggregates|exposure_minutes|parent_value_object_id|entity_protocol_characteristics_json|needs_user_review|category_origin_json|ui_visibility
1333:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:862: value_object_category_links|activity_event_value_object_links|value_object_usage_aggregates|exposure_minutes
2250:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:40: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategoryId
2251:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:41: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategorySlug
2252:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:42: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategoryName

docs/value-objects/P4.10.0-A2_repo_value_object_reference_inventory.txt
195:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:8: - create activity_event_value_object_links;
243:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:141: CREATE TABLE IF NOT EXISTS public.activity_event_value_object_links (
246:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:152: CONSTRAINT activity_event_value_object_links_exposure_minutes_check
248:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:154: CONSTRAINT activity_event_value_object_links_source_check
249:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:156: CONSTRAINT activity_event_value_object_links_confidence_check
250:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:158: CONSTRAINT activity_event_value_object_links_metadata_is_object_check
251:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:160: CONSTRAINT activity_event_value_object_links_unique
252:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:164: CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_user_id
253:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:165: ON public.activity_event_value_object_links(user_id);
254:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:167: CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_event_id
255:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:168: ON public.activity_event_value_object_links(event_id);
256:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:170: CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_value_object_id
257:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:171: ON public.activity_event_value_object_links(value_object_id);
258:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:173: CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_exposure
259:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:174: ON public.activity_event_value_object_links(value_object_id, exposure_minutes);
276:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:226: 'activity_event_value_object_links',
283:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.1-A9_runtime_projection_verification.sql:60: FROM public.activity_event_value_object_links l
286:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.1-A9_runtime_projection_verification.sql:157: '03_new_activity_event_value_object_links' AS section,
411:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.14-A1_value_object_identity_display_readiness_audit.sql:143: FROM public.activity_event_value_object_links aevl
587:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:59: FROM public.activity_event_value_object_links l
593:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:212: (SELECT count(*) FROM public.activity_event_value_object_links) AS global_new_v42_links_count,
595:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:238: '03_new_activity_event_value_object_links' AS section,
599:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:67: FROM public.activity_event_value_object_links l
604:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:236: (SELECT count(*) FROM public.activity_event_value_object_links) AS global_p491_projection_rows_count,
607:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:263: '03_new_activity_event_value_object_links' AS section,
610:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.4-A1_object_cloud_read_audit.sql:12: activity_event_value_object_links
617:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.4-A1_object_cloud_read_audit.sql:85: FROM public.activity_event_value_object_links l
622:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.4-A1_object_cloud_read_audit.sql:203: (SELECT count(*) FROM public.activity_event_value_object_links) AS activity_event_value_object_links_count,
628:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.5-A1_create_value_object_cloud_profiles_v1.sql:17: - activity_event_value_object_links
634:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.5-A1_create_value_object_cloud_profiles_v1.sql:93: FROM public.activity_event_value_object_links l
709:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:542: relation_type|exposure_minutes|parent_value_object_id|needs_user_review|entity_protocol|commercial_usage|value_object_category_links|activity_event_value_object_links
719:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A4_local_code_routes_inventory_conclusion.md:43: | activity_event_value_object_links | 1 |
729:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A5_focused_live_schema_check_result.md:25: - activity_event_value_object_links
742:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A6_minimal_additive_migration_plan.md:52: ## Migration part 3 ÔÇö create activity_event_value_object_links
747:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A7_live_migration_result.md:13: - public.activity_event_value_object_links
753:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A7_live_migration_result.md:27: ## activity_event_value_object_links
760:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A8_foundation_checkpoint.md:33: - activity_event_value_object_links
770:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A8_foundation_checkpoint.md:80: 3. decide how to populate activity_event_value_object_links.exposure_minutes
772:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A10_runtime_projection_checkpoint.md:46: - activity_event_value_object_links
774:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A10_runtime_projection_checkpoint.md:63: - new activity_event_value_object_links row is created
780:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:13: - activity_event_value_object_links
802:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:651: value_object_category_links|activity_event_value_object_links|value_object_usage_aggregates|exposure_minutes|parent_value_object_id|entity_protocol_characteristics_json|needs_user_review|category_origin_json|ui_visibility
805:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:660: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 8 | - create activity_event_value_object_links; |
840:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:699: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 141 | CREATE TABLE IF NOT EXISTS public.activity_event_value_object_links ( |
842:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:701: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 152 | CONSTRAINT activity_event_value_object_links_exposure_minutes_check |
844:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:703: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 154 | CONSTRAINT activity_event_value_object_links_source_check |
845:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:704: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 156 | CONSTRAINT activity_event_value_object_links_confidence_check |
846:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:705: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 158 | CONSTRAINT activity_event_value_object_links_metadata_is_object_check |
847:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:706: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 160 | CONSTRAINT activity_event_value_object_links_unique |
848:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:707: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 164 | CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_user_id |
849:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:708: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 165 | ON public.activity_event_value_object_links(user_id); |
850:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:709: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 167 | CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_event_id |
851:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:710: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 168 | ON public.activity_event_value_object_links(event_id); |
852:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:711: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 170 | CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_value_object_id |
853:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:712: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 171 | ON public.activity_event_value_object_links(value_object_id); |
854:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:713: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 173 | CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_exposure |
855:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:714: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 174 | ON public.activity_event_value_object_links(value_object_id, exposure_minutes); |
871:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:730: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 226 | 'activity_event_value_object_links', |
888:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A2_runtime_writer_inventory_conclusion.md:42: | activity_event_value_object_links | 18 |
894:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A2_runtime_writer_inventory_conclusion.md:190: - activity_event_value_object_links
896:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A2_runtime_writer_inventory_conclusion.md:199: 3. create direct activity_event_value_object_links rows from event_id to value_object_id;
901:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:11: - activity_event_value_object_links
907:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:862: value_object_category_links|activity_event_value_object_links|value_object_usage_aggregates|exposure_minutes
909:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:878: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 8 | - create activity_event_value_object_links; |
924:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:893: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 141 | CREATE TABLE IF NOT EXISTS public.activity_event_value_object_links ( |
926:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:895: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 152 | CONSTRAINT activity_event_value_object_links_exposure_minutes_check |
928:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:897: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 154 | CONSTRAINT activity_event_value_object_links_source_check |
929:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:898: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 156 | CONSTRAINT activity_event_value_object_links_confidence_check |
930:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:899: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 158 | CONSTRAINT activity_event_value_object_links_metadata_is_object_check |
931:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:900: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 160 | CONSTRAINT activity_event_value_object_links_unique |
932:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:901: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 164 | CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_user_id |
933:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:902: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 165 | ON public.activity_event_value_object_links(user_id); |
934:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:903: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 167 | CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_event_id |
935:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:904: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 168 | ON public.activity_event_value_object_links(event_id); |
936:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:905: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 170 | CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_value_object_id |
937:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:906: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 171 | ON public.activity_event_value_object_links(value_object_id); |
938:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:907: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 173 | CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_exposure |
939:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:908: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 174 | ON public.activity_event_value_object_links(value_object_id, exposure_minutes); |
955:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:924: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 226 | 'activity_event_value_object_links', |
963:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:942: 2. insert/upsert activity_event_value_object_links with exposure_minutes = activity_events.duration_minutes by default;
965:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:15: - decide where to add activity_event_value_object_links;
977:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A5_function_surface_map.md:636: - insert/upsert activity_event_value_object_links;
980:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A6_hot_path_window_extraction.md:15: - decide where to add activity_event_value_object_links and value_object_usage_aggregates;
983:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A6_hot_path_window_extraction.md:1655: - upsert activity_event_value_object_links using event.id, event.user_id, mapping.valueObjectId, event.duration_minutes;
985:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A7_first_runtime_projection_plan.md:31: 1. public.activity_event_value_object_links
987:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A7_first_runtime_projection_plan.md:34: ## activity_event_value_object_links logic
992:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A7_first_runtime_projection_plan.md:98: 4. verify new activity_event_value_object_links row exists
994:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A8_code_change_result.md:16: - activity_event_value_object_links
997:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A8_code_change_result.md:41: 3. verify new activity_event_value_object_links row exists
999:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A9_runtime_verification_result.md:65: - table: activity_event_value_object_links
1001:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A9_runtime_verification_result.md:73: - metadata_json.p491.projection: activity_event_value_object_links
1013:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A4_object_cloud_debug_guard_checkpoint.md:92: - activity_event_value_object_links
1050:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.11-A3_parent_child_value_object_read_model_checkpoint.md:72: - activity_event_value_object_links
1098:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.12-A4_controlled_hierarchy_strategy_and_read_model_checkpoint.md:90: - activity_event_value_object_links
1118:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.13-A3_controlled_hierarchy_candidate_audit_checkpoint.md:72: - activity_event_value_object_links
1127:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.14-A1_value_object_identity_display_readiness_audit_plan.md:22: - public.activity_event_value_object_links
1153:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.14-A3_value_object_identity_display_readiness_checkpoint.md:91: - activity_event_value_object_links
1420:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:40: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategoryId
1421:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:41: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategorySlug
1422:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:42: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategoryName
1423:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:43: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.classificationRole
1427:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:23: - new p491 activity_event_value_object_links id
1429:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:65: - metadata_json.p492.sourceProjectionId = activity_event_value_object_links.id when available
1434:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:57: - activity_event_value_object_links
1438:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A4_category_link_runtime_verification_result.md:56: - table: activity_event_value_object_links
1440:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A4_category_link_runtime_verification_result.md:63: - metadata_json.p491.projection: activity_event_value_object_links
1450:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A5_category_link_runtime_checkpoint.md:46: - p491 activity_event_value_object_links row is created
1453:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.3-A2_knee_template_runtime_verification_result.md:63: - table: activity_event_value_object_links
1455:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.3-A2_knee_template_runtime_verification_result.md:71: - metadata_json.p491.projection: activity_event_value_object_links
1461:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.3-A3_broadened_runtime_verification_checkpoint.md:35: - p491 activity_event_value_object_links row exists
1464:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.3-A3_broadened_runtime_verification_checkpoint.md:83: - activity_event_value_object_links
1467:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A1_object_cloud_read_audit_plan.md:12: 1. activity_event_value_object_links
1470:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A1_object_cloud_read_audit_plan.md:20: - activity_event_value_object_links
1473:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A2_object_cloud_read_audit_result.md:14: - activity_event_value_object_links
1476:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A2_object_cloud_read_audit_result.md:27: - activity_event_value_object_links_count: 3
1487:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A3_object_cloud_read_layer_checkpoint.md:21: - activity_event_value_object_links
1490:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.4-A3_object_cloud_read_layer_checkpoint.md:39: - activity_event_value_object_links_count: 3
1499:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.5-A1_object_cloud_sql_view_plan.md:21: - activity_event_value_object_links
1509:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.5-A3_reusable_object_cloud_read_interface_checkpoint.md:30: - activity_event_value_object_links
1513:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.5-A3_reusable_object_cloud_read_interface_checkpoint.md:74: - activity_event_value_object_links
1538:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A3_object_cloud_debug_api_endpoint_code_change_result.md:50: - activity_event_value_object_links
1545:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A5_object_cloud_debug_api_endpoint_checkpoint.md:113: - activity_event_value_object_links
1548:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A5_object_cloud_debug_api_endpoint_checkpoint.md:133: - activity_event_value_object_links
1553:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.8-A2_object_cloud_debug_ui_page_code_change_result.md:44: - activity_event_value_object_links
1557:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.8-A4_object_cloud_debug_ui_page_checkpoint.md:75: - activity_event_value_object_links
1560:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.8-A4_object_cloud_debug_ui_page_checkpoint.md:97: - activity_event_value_object_links
1621:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.9-A1_object_cloud_security_read_exposure_inspection.md:1565: 97: - activity_event_value_object_links
1634:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.9-A3_object_cloud_security_read_exposure_checkpoint.md:99: - activity_event_value_object_links
1678:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:607: .from("activity_event_value_object_links")
1683:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:728: .from("activity_event_value_object_links")
1685:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:744: projection: "activity_event_value_object_links",

docs/value-objects/P4.10.0-A3_category_derived_vo_inventory_checkpoint.md
27:- activity_event_value_object_links
94:- activity_event_value_object_links;

docs/value-objects/P4.10.0-B2_minimal_schema_v4_2_gap_analysis_checkpoint.md
28:- activity_event_value_object_links
92:Confirmed live activity_event_value_object_links model includes:

docs/value-objects/P4.10.0-C3_free_text_processor_runtime_inventory_checkpoint.md
72:- activity_event_value_object_links

docs/value-objects/P4.10.0-C4_minimal_free_text_v1_design_decision.md
24:- it already handles activity_event_value_object_links;
121:- activity_event_value_object_links

docs/value-objects/P4.10.0-C6-C_controlled_free_text_fallback_implementation_checkpoint.md
90:- activity_event_value_object_links contains a link to the Value Object

docs/value-objects/P4.10.0-C7-D_debug_free_text_value_object_test_route_checkpoint.md
56:- activity_event_value_object_links contains the event/value-object link

docs/value-objects/P4.10.0-C7-G_free_text_runtime_verification_checkpoint.md
86:-> activity_event_value_object_links

docs/value-objects/P4.9.0-A3_local_code_routes_inventory.md
542:relation_type|exposure_minutes|parent_value_object_id|needs_user_review|entity_protocol|commercial_usage|value_object_category_links|activity_event_value_object_links

docs/value-objects/P4.9.0-A4_local_code_routes_inventory_conclusion.md
43:| activity_event_value_object_links | 1 |

docs/value-objects/P4.9.0-A5_focused_live_schema_check_result.md
25:- activity_event_value_object_links

docs/value-objects/P4.9.0-A6_minimal_additive_migration_plan.md
52:## Migration part 3 ÔÇö create activity_event_value_object_links

docs/value-objects/P4.9.0-A7_live_migration_result.md
13:- public.activity_event_value_object_links
27:## activity_event_value_object_links

docs/value-objects/P4.9.0-A8_foundation_checkpoint.md
33:- activity_event_value_object_links
80:3. decide how to populate activity_event_value_object_links.exposure_minutes

docs/value-objects/P4.9.1-A10_runtime_projection_checkpoint.md
46:- activity_event_value_object_links
63:- new activity_event_value_object_links row is created

docs/value-objects/P4.9.1-A1_runtime_writer_inventory.md
13:- activity_event_value_object_links
651:value_object_category_links|activity_event_value_object_links|value_object_usage_aggregates|exposure_minutes|parent_value_object_id|entity_protocol_characteristics_json|needs_user_review|category_origin_json|ui_visibility
660:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 8 | - create activity_event_value_object_links; |
699:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 141 | CREATE TABLE IF NOT EXISTS public.activity_event_value_object_links ( |
701:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 152 | CONSTRAINT activity_event_value_object_links_exposure_minutes_check |
703:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 154 | CONSTRAINT activity_event_value_object_links_source_check |
704:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 156 | CONSTRAINT activity_event_value_object_links_confidence_check |
705:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 158 | CONSTRAINT activity_event_value_object_links_metadata_is_object_check |
706:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 160 | CONSTRAINT activity_event_value_object_links_unique |
707:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 164 | CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_user_id |
708:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 165 | ON public.activity_event_value_object_links(user_id); |
709:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 167 | CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_event_id |
710:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 168 | ON public.activity_event_value_object_links(event_id); |
711:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 170 | CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_value_object_id |
712:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 171 | ON public.activity_event_value_object_links(value_object_id); |
713:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 173 | CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_exposure |
714:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 174 | ON public.activity_event_value_object_links(value_object_id, exposure_minutes); |
730:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 226 | 'activity_event_value_object_links', |

docs/value-objects/P4.9.1-A2_runtime_writer_inventory_conclusion.md
42:| activity_event_value_object_links | 18 |
190:- activity_event_value_object_links
199:3. create direct activity_event_value_object_links rows from event_id to value_object_id;

docs/value-objects/P4.9.1-A3_focused_writer_file_inspection.md
11:- activity_event_value_object_links
862:value_object_category_links|activity_event_value_object_links|value_object_usage_aggregates|exposure_minutes
878:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 8 | - create activity_event_value_object_links; |
893:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 141 | CREATE TABLE IF NOT EXISTS public.activity_event_value_object_links ( |
895:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 152 | CONSTRAINT activity_event_value_object_links_exposure_minutes_check |
897:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 154 | CONSTRAINT activity_event_value_object_links_source_check |
898:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 156 | CONSTRAINT activity_event_value_object_links_confidence_check |
899:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 158 | CONSTRAINT activity_event_value_object_links_metadata_is_object_check |
900:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 160 | CONSTRAINT activity_event_value_object_links_unique |
901:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 164 | CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_user_id |
902:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 165 | ON public.activity_event_value_object_links(user_id); |
903:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 167 | CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_event_id |
904:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 168 | ON public.activity_event_value_object_links(event_id); |
905:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 170 | CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_value_object_id |
906:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 171 | ON public.activity_event_value_object_links(value_object_id); |
907:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 173 | CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_exposure |
908:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 174 | ON public.activity_event_value_object_links(value_object_id, exposure_minutes); |
924:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 226 | 'activity_event_value_object_links', |
942:2. insert/upsert activity_event_value_object_links with exposure_minutes = activity_events.duration_minutes by default;

docs/value-objects/P4.9.1-A4_full_key_file_extraction.md
15:- decide where to add activity_event_value_object_links;

docs/value-objects/P4.9.1-A5_function_surface_map.md
636:- insert/upsert activity_event_value_object_links;

docs/value-objects/P4.9.1-A6_hot_path_window_extraction.md
15:- decide where to add activity_event_value_object_links and value_object_usage_aggregates;
1655:- upsert activity_event_value_object_links using event.id, event.user_id, mapping.valueObjectId, event.duration_minutes;

docs/value-objects/P4.9.1-A7_first_runtime_projection_plan.md
31:1. public.activity_event_value_object_links
34:## activity_event_value_object_links logic
98:4. verify new activity_event_value_object_links row exists

docs/value-objects/P4.9.1-A8_code_change_result.md
16:- activity_event_value_object_links
41:3. verify new activity_event_value_object_links row exists

docs/value-objects/P4.9.1-A9_runtime_verification_result.md
65:- table: activity_event_value_object_links
73:- metadata_json.p491.projection: activity_event_value_object_links

docs/value-objects/P4.9.10-A4_object_cloud_debug_guard_checkpoint.md
92:- activity_event_value_object_links

docs/value-objects/P4.9.11-A3_parent_child_value_object_read_model_checkpoint.md
72:- activity_event_value_object_links

docs/value-objects/P4.9.12-A4_controlled_hierarchy_strategy_and_read_model_checkpoint.md
90:- activity_event_value_object_links

docs/value-objects/P4.9.13-A3_controlled_hierarchy_candidate_audit_checkpoint.md
72:- activity_event_value_object_links

docs/value-objects/P4.9.14-A1_value_object_identity_display_readiness_audit_plan.md
22:- public.activity_event_value_object_links

docs/value-objects/P4.9.14-A3_value_object_identity_display_readiness_checkpoint.md
91:- activity_event_value_object_links

docs/value-objects/P4.9.2-A1_category_link_live_source_proof.md
40:- activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategoryId
41:- activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategorySlug
42:- activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategoryName
43:- activity_event_value_object_links.metadata_json.mappingMetadata.classification.classificationRole

docs/value-objects/P4.9.2-A2_category_link_runtime_integration_plan.md
23:- new p491 activity_event_value_object_links id
65:- metadata_json.p492.sourceProjectionId = activity_event_value_object_links.id when available

docs/value-objects/P4.9.2-A3_category_link_code_change_result.md
57:- activity_event_value_object_links

docs/value-objects/P4.9.2-A4_category_link_runtime_verification_result.md
56:- table: activity_event_value_object_links
63:- metadata_json.p491.projection: activity_event_value_object_links

docs/value-objects/P4.9.2-A5_category_link_runtime_checkpoint.md
46:- p491 activity_event_value_object_links row is created

docs/value-objects/P4.9.3-A2_knee_template_runtime_verification_result.md
63:- table: activity_event_value_object_links
71:- metadata_json.p491.projection: activity_event_value_object_links

docs/value-objects/P4.9.3-A3_broadened_runtime_verification_checkpoint.md
35:- p491 activity_event_value_object_links row exists
83:- activity_event_value_object_links

docs/value-objects/P4.9.4-A1_object_cloud_read_audit_plan.md
12:1. activity_event_value_object_links
20:- activity_event_value_object_links

docs/value-objects/P4.9.4-A2_object_cloud_read_audit_result.md
14:- activity_event_value_object_links
27:- activity_event_value_object_links_count: 3

docs/value-objects/P4.9.4-A3_object_cloud_read_layer_checkpoint.md
21:- activity_event_value_object_links
39:- activity_event_value_object_links_count: 3

docs/value-objects/P4.9.5-A1_object_cloud_sql_view_plan.md
21:- activity_event_value_object_links

docs/value-objects/P4.9.5-A3_reusable_object_cloud_read_interface_checkpoint.md
30:- activity_event_value_object_links
74:- activity_event_value_object_links

docs/value-objects/P4.9.7-A3_object_cloud_debug_api_endpoint_code_change_result.md
50:- activity_event_value_object_links

docs/value-objects/P4.9.7-A5_object_cloud_debug_api_endpoint_checkpoint.md
113:- activity_event_value_object_links
133:- activity_event_value_object_links

docs/value-objects/P4.9.8-A2_object_cloud_debug_ui_page_code_change_result.md
44:- activity_event_value_object_links

docs/value-objects/P4.9.8-A4_object_cloud_debug_ui_page_checkpoint.md
75:- activity_event_value_object_links
97:- activity_event_value_object_links

docs/value-objects/P4.9.9-A1_object_cloud_security_read_exposure_inspection.md
1565:   97: - activity_event_value_object_links

docs/value-objects/P4.9.9-A3_object_cloud_security_read_exposure_checkpoint.md
99:- activity_event_value_object_links

docs/value-objects/category-derivation-layer-v1.md
32:Pipeline: free text / app action -> raw Activity Event -> Category Derivation Run -> rule-based extractor -> optional structured AI classifier -> categoryCandidates[] -> resolver slug to category_id -> activity_category_derivations -> Value Object Bridge -> value_object_category_links -> activity_event_value_object_links -> aggregates / snapshots.
80:After category candidates are resolved, the bridge must create Value Objects, Value Object instances, activity_event_value_object_links, value_object_category_links, usage aggregates, daily aggregates, snapshots and processing logs.
102:Expected rows: activity_event, category_derivation_run, activity_category_derivations, value_objects, value_object_category_links, activity_event_value_object_links, usage aggregates, daily aggregates, snapshots and processing logs.
119:Inventory targets: contextual_categories, entity_classifications, value_object_category_links, activity_event_value_object_links, processing logs, mapper contracts, bridge contracts, free-text fallback metadata, existing migrations touching contextual categories and VO links.

lib/activity/valueObjectBridge.ts
607:    .from("activity_event_value_object_links")
728:    .from("activity_event_value_object_links")
744:            projection: "activity_event_value_object_links",
```

## References: category_derivation

```text
docs/value-objects/category-derivation-layer-v1.md
32:Pipeline: free text / app action -> raw Activity Event -> Category Derivation Run -> rule-based extractor -> optional structured AI classifier -> categoryCandidates[] -> resolver slug to category_id -> activity_category_derivations -> Value Object Bridge -> value_object_category_links -> activity_event_value_object_links -> aggregates / snapshots.
76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
102:Expected rows: activity_event, category_derivation_run, activity_category_derivations, value_objects, value_object_category_links, activity_event_value_object_links, usage aggregates, daily aggregates, snapshots and processing logs.
```

## References: activity_category_derivation

```text
docs/value-objects/category-derivation-layer-v1.md
32:Pipeline: free text / app action -> raw Activity Event -> Category Derivation Run -> rule-based extractor -> optional structured AI classifier -> categoryCandidates[] -> resolver slug to category_id -> activity_category_derivations -> Value Object Bridge -> value_object_category_links -> activity_event_value_object_links -> aggregates / snapshots.
76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
102:Expected rows: activity_event, category_derivation_run, activity_category_derivations, value_objects, value_object_category_links, activity_event_value_object_links, usage aggregates, daily aggregates, snapshots and processing logs.
```

## References: semantic_layer

```text
docs/value-objects/category-derivation-layer-v1.md
76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
```

## References: category_type

```text
docs/value-objects/category-derivation-layer-v1.md
76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
```

## References: source_type

```text
docs/activity/P4.7.9-R-A11c_registry_table_extraction_design.md
115:- source_type text not null default 'system_seed'

docs/p4-7-rubricator-inventory-raw.md
51:- .\supabase\migrations\001_object_action_backbone.sql:48 - constraint object_classes_source_type_allowed
88:- .\supabase\migrations\001_object_action_backbone.sql:105 - constraint object_types_source_type_allowed
147:- .\supabase\migrations\001_object_action_backbone.sql:164 - constraint action_types_source_type_allowed
209:- .\supabase\migrations\001_object_action_backbone.sql:220 - constraint contexts_source_type_allowed
282:- .\supabase\migrations\001_object_action_backbone.sql:270 - constraint object_action_affordances_source_type_allowed
337:- .\supabase\migrations\001_object_action_backbone.sql:335 - constraint contextual_categories_source_type_allowed
373:- .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:18 - contextual_categories.source_type,
416:- .\supabase\migrations\001_object_action_backbone.sql:420 - constraint entity_classifications_source_type_allowed
476:- .\supabase\migrations\001_object_action_backbone.sql:270 - constraint object_action_affordances_source_type_allowed
503:- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:88 - constraint object_action_suggestion_requests_source_type_allowed
656:- .\supabase\migrations\007_create_object_action_suggestion_requests.sql:88 - constraint object_action_suggestion_requests_source_type_allowed
918:- .\supabase\migrations\001_object_action_backbone.sql:420 - constraint entity_classifications_source_type_allowed
999:- .\supabase\migrations\001_object_action_backbone.sql:420 - constraint entity_classifications_source_type_allowed

docs/p4-7-schema-inventory-raw.md
1488:    constraint raw_activity_signals_source_type_check
1558:    create index if not exists idx_raw_activity_signals_source_type_received_at
1563:    on public.raw_activity_signals(source_type, received_at desc);
1583:    on public.raw_activity_signals(user_id, source_type, source_event_id)
1593:    on public.raw_activity_signals(user_id, source_type, idempotency_key)
1623:- .\supabase\migrations\020_activity_raw_signals.sql:38 - constraint raw_activity_signals_source_type_check
1637:- .\supabase\migrations\020_activity_raw_signals.sql:116 - create index if not exists idx_raw_activity_signals_source_type_received_at
1638:- .\supabase\migrations\020_activity_raw_signals.sql:117 - on public.raw_activity_signals(source_type, received_at desc);
1642:- .\supabase\migrations\020_activity_raw_signals.sql:123 - on public.raw_activity_signals(user_id, source_type, source_event_id)
1644:- .\supabase\migrations\020_activity_raw_signals.sql:127 - on public.raw_activity_signals(user_id, source_type, idempotency_key)

docs/sql/P4.7.8-R-K1_known_template_chain_audit.sql
160:      WHERE coalesce(to_jsonb(c)->>'source_type', '') = 'system_seed'

docs/sql/P4.7.8-R-L3_lightweight_known_template_chain_audit.sql
168:      WHERE coalesce(to_jsonb(c)->>'source_type', '') = 'system_seed'

docs/sql/P4.7.8-R-L5_second_known_template_seed_and_audit.sql
161:    source_type,
167:    default_source_type,

docs/sql/P4.7.8-R-L6_second_known_template_cross_route_audit.sql
249:        and coalesce(to_jsonb(c)->>'source_type', '') = 'system_seed'

docs/sql/P4.7.8-R-L7_final_two_template_three_route_audit.sql
335:        and coalesce(to_jsonb(c)->>'source_type', '') = 'system_seed'

docs/sql/P4.7.9-R-A12_registry_table_seed_and_audit.sql
48:    ) as source_type,
92:  source_type,
115:  source_type,
138:  source_type = excluded.source_type,
168:      'source_type', r.source_type,
209:    ) as source_type,
258:    (a.source_type = e.source_type) as source_type_ok,
290:        and source_type_ok
313:          'sourceTypeOk', source_type_ok,

docs/sql/P4.7.9-R-A3_known_template_metadata_normalization.sql
305:    t.default_metadata_json #>> '{knownTemplateRegistry,sourceType}' as registry_source_type,
379:      and j.registry_source_type = 'system_seed'

docs/value-object-state-foundation-p4-7.md
313:- source_type: `manual`

docs/value-objects/P4.10.0-A2_repo_activity_processing_reference_inventory.txt
1481:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-schema-inventory-raw.md:1488: constraint raw_activity_signals_source_type_check
1495:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-schema-inventory-raw.md:1558: create index if not exists idx_raw_activity_signals_source_type_received_at
1496:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-schema-inventory-raw.md:1563: on public.raw_activity_signals(source_type, received_at desc);
1500:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-schema-inventory-raw.md:1583: on public.raw_activity_signals(user_id, source_type, source_event_id)
1502:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-schema-inventory-raw.md:1593: on public.raw_activity_signals(user_id, source_type, idempotency_key)
1510:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-schema-inventory-raw.md:1623: - .\supabase\migrations\020_activity_raw_signals.sql:38 - constraint raw_activity_signals_source_type_check
1524:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-schema-inventory-raw.md:1637: - .\supabase\migrations\020_activity_raw_signals.sql:116 - create index if not exists idx_raw_activity_signals_source_type_received_at
1525:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-schema-inventory-raw.md:1638: - .\supabase\migrations\020_activity_raw_signals.sql:117 - on public.raw_activity_signals(source_type, received_at desc);
1529:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-schema-inventory-raw.md:1642: - .\supabase\migrations\020_activity_raw_signals.sql:123 - on public.raw_activity_signals(user_id, source_type, source_event_id)
1531:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-schema-inventory-raw.md:1644: - .\supabase\migrations\020_activity_raw_signals.sql:127 - on public.raw_activity_signals(user_id, source_type, idempotency_key)
2029:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\013_activity_templates_v2.sql:103: constraint activity_templates_source_type_check
2033:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\013_activity_templates_v2.sql:146: constraint activity_templates_default_source_type_check
2060:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\013_activity_templates_v2.sql:249: constraint activity_template_links_source_type_check
2180:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\020_activity_raw_signals.sql:38: constraint raw_activity_signals_source_type_check
2195:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\020_activity_raw_signals.sql:116: create index if not exists idx_raw_activity_signals_source_type_received_at
2196:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\020_activity_raw_signals.sql:117: on public.raw_activity_signals(source_type, received_at desc);
2200:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\020_activity_raw_signals.sql:123: on public.raw_activity_signals(user_id, source_type, source_event_id)
2202:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\020_activity_raw_signals.sql:127: on public.raw_activity_signals(user_id, source_type, idempotency_key)

docs/value-objects/P4.10.0-A2_repo_category_rubricator_reference_inventory.txt
830:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:127: | lib/objectAction/queries.ts | 515 | "id, entity_type, entity_id, object_type_id, action_type_id, context_id, contextual_category_id, classification_role, is_primary, confidence, status, source_type, classified_by_user_id, evidence_json, notes, created_at, updated_at" |
1224:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:626: | lib/objectAction/queries.ts | 515 | "id, entity_type, entity_id, object_type_id, action_type_id, context_id, contextual_category_id, classification_role, is_primary, confidence, status, source_type, classified_by_user_id, evidence_json, notes, created_at, updated_at" |
1725:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1448: 515:         "id, entity_type, entity_id, object_type_id, action_type_id, context_id, contextual_category_id, classification_role, is_primary, confidence, status, source_type, classified_by_user_id, evidence_json, notes, created_at, updated_at"
2711:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:51: - .\supabase\migrations\001_object_action_backbone.sql:48 - constraint object_classes_source_type_allowed
2735:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:88: - .\supabase\migrations\001_object_action_backbone.sql:105 - constraint object_types_source_type_allowed
2774:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:147: - .\supabase\migrations\001_object_action_backbone.sql:164 - constraint action_types_source_type_allowed
2811:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:209: - .\supabase\migrations\001_object_action_backbone.sql:220 - constraint contexts_source_type_allowed
2868:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:282: - .\supabase\migrations\001_object_action_backbone.sql:270 - constraint object_action_affordances_source_type_allowed
2900:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:337: - .\supabase\migrations\001_object_action_backbone.sql:335 - constraint contextual_categories_source_type_allowed
2936:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:373: - .\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:18 - contextual_categories.source_type,
2961:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:416: - .\supabase\migrations\001_object_action_backbone.sql:420 - constraint entity_classifications_source_type_allowed
2992:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:476: - .\supabase\migrations\001_object_action_backbone.sql:270 - constraint object_action_affordances_source_type_allowed
3019:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:503: - .\supabase\migrations\007_create_object_action_suggestion_requests.sql:88 - constraint object_action_suggestion_requests_source_type_allowed
3078:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:656: - .\supabase\migrations\007_create_object_action_suggestion_requests.sql:88 - constraint object_action_suggestion_requests_source_type_allowed
3158:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:918: - .\supabase\migrations\001_object_action_backbone.sql:420 - constraint entity_classifications_source_type_allowed
3185:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:999: - .\supabase\migrations\001_object_action_backbone.sql:420 - constraint entity_classifications_source_type_allowed
3652:C:\Users\Admin\Documents\projects\gpt-app\lib\objectAction\queries.ts:515: "id, entity_type, entity_id, object_type_id, action_type_id, context_id, contextual_category_id, classification_role, is_primary, confidence, status, source_type, classified_by_user_id, evidence_json, notes, created_at, updated_at"
3963:C:\Users\Admin\Documents\projects\gpt-app\src\app\admin\object-action\categories\page.tsx:1486: {category.source_type ?? "unknown_source"}
4662:C:\Users\Admin\Documents\projects\gpt-app\src\app\api\object-action\categories\route.ts:493: sourceType: params.previousCategory.source_type,
5208:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:270: constraint object_action_affordances_source_type_allowed
5222:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\001_object_action_backbone.sql:335: constraint contextual_categories_source_type_allowed
5299:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:18: contextual_categories.source_type,
5321:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:47: public_contextual_categories.source_type,
5340:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\005_create_object_action_read_views_and_rpc.sql:110: contextual_categories.source_type,
5397:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\007_create_object_action_suggestion_requests.sql:88: constraint object_action_suggestion_requests_source_type_allowed
5479:C:\Users\Admin\Documents\projects\gpt-app\supabase\migrations\024_activity_template_known_registry_rules.sql:74: constraint activity_template_known_registry_rules_source_type_not_blank

docs/value-objects/P4.10.0-C5b_controlled_fallback_key_ranges.txt
366:.\lib\activity\rubricatorValueObjectMapper.ts:417:     sourceType: getString(row, "source_type"),

docs/value-objects/P4.10.0-C6-B_previous_rubricatorValueObjectMapper.ts.txt
417:    sourceType: getString(row, "source_type"),

docs/value-objects/P4.9.0-A1_live_schema_inventory_result.md
150:- source_type

docs/value-objects/P4.9.0-A3_local_code_routes_inventory.md
127:| lib/objectAction/queries.ts | 515 | "id, entity_type, entity_id, object_type_id, action_type_id, context_id, contextual_category_id, classification_role, is_primary, confidence, status, source_type, classified_by_user_id, evidence_json, notes, created_at, updated_at" |

docs/value-objects/P4.9.1-A1_runtime_writer_inventory.md
626:| lib/objectAction/queries.ts | 515 | "id, entity_type, entity_id, object_type_id, action_type_id, context_id, contextual_category_id, classification_role, is_primary, confidence, status, source_type, classified_by_user_id, evidence_json, notes, created_at, updated_at" |

docs/value-objects/P4.9.1-A4_full_key_file_extraction.md
1172:  417:     sourceType: getString(row, "source_type"),
4730:   57:   source_type: string;
4736:   63:   default_source_type: string;
4765:   92:   source_type: string;
5254:  581:     source: mapTemplateLinkSourceToEventLinkSource(link.source_type),
5257:  584:       template_link_source_type: link.source_type,
5508:  835:       : template.default_source_type

docs/value-objects/P4.9.10-A1_debug_admin_guard_conventions_inspection.md
295:  290:         "source_type",
346:  560:         source_type: "system_seed",
363:  575:           "source_type",
776:   10:   "source_type",
793:   37:   source_type: string;
827:  365:     source_type: readRequiredString(input, "source_type", errors),
844:  412:     sourceType: row.source_type,
994:  417:     sourceType: getString(row, "source_type"),
1418:   67:   sourceType: EntityClassificationRow["source_type"];
1435:  202:     sourceType: row.source_type,
1448:  515:         "id, entity_type, entity_id, object_type_id, action_type_id, context_id, contextual_category_id, classification_role, is_primary, confidence, status, source_type, classified_by_user_id, evidence_json, notes, created_at, updated_at"
1721:  181:   source_type: ObjectActionSourceType;
2938:   53:   source_type: string;
3193:  520:       source_type,
5844:   92:   source_type: string;
5878:  581:     source: mapTemplateLinkSourceToEventLinkSource(link.source_type),
5881:  584:       template_link_source_type: link.source_type,
5919:   83:   source_type: string;
5953:  398:     source: mapTemplateLinkSourceToEventLinkSource(link.source_type),
5956:  401:       template_link_source_type: link.source_type,
5994:   61:   source_type: string;
6011:  428:         sourceType: link.source_type,
8340:   86:   source_type,
9033:  107:   source_type: string;
9249:  606:     sourceType: suggestion.source_type,
9265:  606:     sourceType: suggestion.source_type,
12096:  797:     source_type: string | null;
12113:  819:       source_type,
12147:  866:         sourceType: currentClassification.source_type,

docs/value-objects/P4.9.7-A1_api_route_conventions_inspection.md
3257:  187:       .eq("source_type", sourceType)
3268:  187:       .eq("source_type", sourceType)
3285:  208:       .eq("source_type", sourceType)
3296:  208:       .eq("source_type", sourceType)

docs/value-objects/P4.9.7-A2_focused_api_files_extraction.md
1153:  734:     sourceType: getStringField(row, "source_type"),
1503: 1084:               sourceType: getStringField(primaryRawSignal, "source_type"),
3093:  224:     defaultSourceType: asString(row.default_source_type),
3263:  394:       const source = asString(event.source) ?? asString(event.source_type);
3396:  527:     const source = asString(event.source) ?? asString(event.source_type);

docs/value-objects/category-derivation-layer-v1.md
76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.

lib/activity/activityRubricatorClassificationLifecycle.ts
290:        "source_type",
560:        source_type: "system_seed",
575:          "source_type",

lib/activity/importedActivityTemplateMapping.ts
54:  source_type: string | null;
62:  default_source_type: string | null;
156:      input.rawSignal.source_type,
294:    sourceType: template.source_type,
314:  const sourceType = normalizeText(template.source_type);
315:  const defaultSourceType = normalizeText(template.default_source_type);
316:  const rawSourceType = normalizeText(rawSignal.source_type);
405:        "id, slug, title, short_title, description, template_group, template_scope, source_type, status, is_active, owner_user_id, default_activity_type_id, legacy_activity_code_template_id, default_duration_minutes, default_status, default_source_type, default_privacy_scope, default_metadata_json, sort_order"
420:      "id, slug, title, short_title, description, template_group, template_scope, source_type, status, is_active, owner_user_id, default_activity_type_id, legacy_activity_code_template_id, default_duration_minutes, default_status, default_source_type, default_privacy_scope, default_metadata_json, sort_order"

lib/activity/knownTemplateRegistryTable.ts
10:  "source_type",
37:  source_type: string;
365:    source_type: readRequiredString(input, "source_type", errors),
412:    sourceType: row.source_type,

lib/activity/rawActivitySignals.ts
54:  source_type: RawActivitySignalSourceType;
147:      source_type: input.sourceType,

lib/activity/rubricatorValueObjectMapper.ts
463:    sourceType: getString(row, "source_type"),

lib/objectAction/queries.ts
67:  sourceType: EntityClassificationRow["source_type"];
202:    sourceType: row.source_type,
218:        "id, code, name, description, status, source_type, sort_order, is_active, created_at, updated_at"
253:        "id, object_class_id, code, name, description, status, source_type, sort_order, is_active, created_at, updated_at"
298:        "id, object_class_id, code, name, description, status, source_type, sort_order, is_active, created_at, updated_at"
322:          "id, code, name, description, status, source_type, sort_order, is_active, created_at, updated_at"
346:        "id, object_type_id, action_type_id, context_id, is_default, status, source_type, notes, created_at, updated_at"
384:        "id, code, name, description, status, source_type, sort_order, is_active, created_at, updated_at"
412:          "id, code, name, description, status, source_type, sort_order, is_active, created_at, updated_at"
515:        "id, entity_type, entity_id, object_type_id, action_type_id, context_id, contextual_category_id, classification_role, is_primary, confidence, status, source_type, classified_by_user_id, evidence_json, notes, created_at, updated_at"
527:          "id, code, name, description, status, source_type, sort_order, is_active, created_at, updated_at"

lib/objectAction/types.ts
94:  source_type: ObjectActionSourceType;
108:  source_type: ObjectActionSourceType;
121:  source_type: ObjectActionSourceType;
134:  source_type: ObjectActionSourceType;
148:  source_type: ObjectActionSourceType;
162:  source_type: ObjectActionSourceType;
181:  source_type: ObjectActionSourceType;
237:  source_type: ObjectActionSourceType;
248:  source_type: ObjectActionSourceType;
266:  source_type: ObjectActionSourceType;
284:  source_type: ObjectActionSourceType;
304:  source_type: ObjectActionSourceType;

src/app/admin/object-action/categories/page.tsx
59:  source_type: string | null;
606:      source_type,
1486:                              {category.source_type ?? "unknown_source"}

src/app/admin/object-action/classifications/page.tsx
53:  source_type: string;
520:      source_type,
1244:                              {classification.source_type}

src/app/admin/object-action/suggestions/page.tsx
48:  source_type: string;
676:      source_type,

src/app/api/activity/debug-trace/route.ts
734:    sourceType: getStringField(row, "source_type"),
1084:              sourceType: getStringField(primaryRawSignal, "source_type"),

src/app/api/activity/events/route.ts
224:    defaultSourceType: asString(row.default_source_type),
394:      const source = asString(event.source) ?? asString(event.source_type);
527:    const source = asString(event.source) ?? asString(event.source_type);

src/app/api/activity/intake/events/[id]/reject/route.ts
154:    sourceType: getFirstString(row, ["source_type", "sourceType"]),

src/app/api/activity/intake/events/[id]/route.ts
226:    sourceType: getFirstString(row, ["source_type", "sourceType"]),

src/app/api/activity/intake/route.ts
124:    sourceType: rawSignal.source_type,
187:      .eq("source_type", sourceType)
208:      .eq("source_type", sourceType)

src/app/api/activity/intake/signals/[id]/ignore/route.ts
76:    sourceType: getFirstString(row, ["source_type", "sourceType"]),

src/app/api/activity/intake/signals/[id]/promote/route.ts
169:    sourceType: rawSignal.source_type,
347:    `Imported ${rawSignal.source_type} activity signal`
376:    rawSignal.source_type,
583:    sourceType: rawSignal.source_type,
677:        rawSignalSourceType: rawSignal.source_type,

src/app/api/activity/intake/signals/route.ts
149:    sourceType: row.source_type,
248:      query = query.in("source_type", sourceTypes);

src/app/api/activity/record/route.ts
57:  source_type: string;
63:  default_source_type: string;
92:  source_type: string;
581:    source: mapTemplateLinkSourceToEventLinkSource(link.source_type),
584:      template_link_source_type: link.source_type,
835:      : template.default_source_type

src/app/api/activity/start/route.ts
48:  source_type: string;
54:  default_source_type: string;
83:  source_type: string;
398:    source: mapTemplateLinkSourceToEventLinkSource(link.source_type),
401:      template_link_source_type: link.source_type,
540:      : template.default_source_type

src/app/api/activity/templates/route.ts
26:  source_type: string;
32:  default_source_type: string;
61:  source_type: string;
166:      template.source_type,
400:      sourceType: template.source_type,
406:      defaultSourceType: template.default_source_type,
428:        sourceType: link.source_type,

src/app/api/directory/filters/route.ts
47:  source_type: string;

src/app/api/object-action/categories/route.ts
40:  source_type: string | null;
86:  source_type,
493:    sourceType: params.previousCategory.source_type,

src/app/api/object-action/suggestions/route.ts
63:  source_type: string;
107:  source_type: string;
230:  source_type,
606:    sourceType: suggestion.source_type,
1360:      source_type,
1516:    source_type: "owner_confirmed",
1855:        source_type: "owner_confirmed",
2318:      source_type: "user_submitted",

src/app/api/points/transactions/route.ts
84:      source_type,

src/app/organizations/[id]/page.tsx
797:    source_type: string | null;
819:      source_type,
866:        sourceType: currentClassification.source_type,

src/app/points/page.tsx
52:  source_type: string | null;
145:  const sourceType = transaction.source_type?.toLowerCase() ?? "";
763:                              {transaction.source_type ?? "ÔÇö"}

supabase/migrations/001_object_action_backbone.sql
21:  source_type text not null default 'system_seed',
48:  constraint object_classes_source_type_allowed
50:      source_type in (
78:  source_type text not null default 'system_seed',
105:  constraint object_types_source_type_allowed
107:      source_type in (
137:  source_type text not null default 'system_seed',
164:  constraint action_types_source_type_allowed
166:      source_type in (
193:  source_type text not null default 'system_seed',
220:  constraint contexts_source_type_allowed
222:      source_type in (
250:  source_type text not null default 'system_seed',
270:  constraint object_action_affordances_source_type_allowed
272:      source_type in (
308:  source_type text not null default 'system_seed',
335:  constraint contextual_categories_source_type_allowed
337:      source_type in (
376:  source_type text not null default 'manual',
420:  constraint entity_classifications_source_type_allowed
422:      source_type in (
550:  source_type text not null default 'system_seed',
583:  constraint concept_aliases_source_type_allowed
585:      source_type in (

supabase/migrations/002_seed_object_action_rubricator.sql
8:  source_type,
44:  source_type,
91:  source_type,
141:  source_type,
182:  source_type,
251:  source_type,

supabase/migrations/003_backfill_organization_directory_classifications.sql
14:  source_type,
32:  'migrated' as source_type,

supabase/migrations/005_create_object_action_read_views_and_rpc.sql
18:  contextual_categories.source_type,
47:  public_contextual_categories.source_type,
74:  source_type text,
110:    contextual_categories.source_type,

supabase/migrations/007_create_object_action_suggestion_requests.sql
16:  source_type text not null default 'user_submitted',
88:  constraint object_action_suggestion_requests_source_type_allowed
90:      source_type in (

supabase/migrations/013_activity_templates_v2.sql
57:  source_type text not null default 'system_seed',
68:  default_source_type text not null default 'manual_form',
103:  constraint activity_templates_source_type_check
105:      source_type in (
146:  constraint activity_templates_default_source_type_check
148:      default_source_type in (
231:  source_type text not null default 'template',
249:  constraint activity_template_links_source_type_check
251:      source_type in (
416:      source_type,
422:      default_source_type,
515:      source_type = 'system_seed',
521:      default_source_type = 'manual_form',
586:    source_type,

supabase/migrations/014_activity_events_v2_template_link.sql
45:    -- v2 source_type values
88:'Allows both legacy source values and Activity Recording Layer v2 source_type values.';

supabase/migrations/020_activity_raw_signals.sql
15:  source_type text not null,
38:  constraint raw_activity_signals_source_type_check
40:      source_type in (
116:create index if not exists idx_raw_activity_signals_source_type_received_at
117:on public.raw_activity_signals(source_type, received_at desc);
123:on public.raw_activity_signals(user_id, source_type, source_event_id)
127:on public.raw_activity_signals(user_id, source_type, idempotency_key)

supabase/migrations/024_activity_template_known_registry_rules.sql
28:  source_type text not null default 'system_seed',
74:  constraint activity_template_known_registry_rules_source_type_not_blank
75:    check (length(btrim(source_type)) > 0),
```

## References: needs_review

```text
docs/commercial/P4.8.0-D4_purchase_currency_sync_inventory.md
406:| 203 | input.geoArea.status === "needs_review") && |
409:| 223 | input.geoArea.status === "needs_review" |
433:| 489 | (geoArea.status === "suggested" \|\| geoArea.status === "needs_review") |

docs/p4-7-rubricator-inventory-raw.md
745:- .\src\app\admin\object-action\suggestions\page.tsx:134 - const DEFAULT_STATUS_FILTER: SuggestionStatusFilter = "needs_review";
772:- .\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:406 - `AI analysis can only run for draft, suggested or needs_review suggestions. Current status: "${currentStatus}".`

docs/value-objects/P4.10.0-A2_repo_category_rubricator_reference_inventory.txt
4219:C:\Users\Admin\Documents\projects\gpt-app\src\app\admin\object-action\suggestions\SuggestionModerationButtons.tsx:1121: or needs_review and AI status is new_category_suggested or
4885:C:\Users\Admin\Documents\projects\gpt-app\src\app\api\object-action\suggestions\route.ts:1756: `approve_new_category can only run for draft, suggested or needs_review suggestions. Current status: ${suggestion.status}.`

docs/value-objects/P4.10.0-C3_free_text_processor_runtime_inventory_checkpoint.md
115:- free-text classifier creates approved or needs_review classification/mapping from input_text;

docs/value-objects/P4.9.10-A1_debug_admin_guard_conventions_inspection.md
3607:   12:   | "needs_review"
7395:   15: type GeoAreaStatus = "approved" | "suggested" | "needs_review" | "rejected";
7451:   14: type GeoAreaStatus = "approved" | "suggested" | "needs_review" | "rejected";
7454:   14: type GeoAreaStatus = "approved" | "suggested" | "needs_review" | "rejected";
9124:  205: const DEFAULT_SUGGESTION_STATUS_FILTER: SuggestionStatusFilter = "needs_review";
9131:  205: const DEFAULT_SUGGESTION_STATUS_FILTER: SuggestionStatusFilter = "needs_review";
9193:  285:   "needs_review",

docs/value-objects/P4.9.7-A1_api_route_conventions_inspection.md
5403:  203:       input.geoArea.status === "needs_review") &&
5420:  489:       (geoArea.status === "suggested" || geoArea.status === "needs_review")

docs/value-objects/category-derivation-layer-v1.md
72:The resolver must receive category candidates, normalize slugs and aliases, search contextual_categories, reuse existing categories, create missing categories only under controlled policy, mark new categories as suggested or needs_review where appropriate, return resolved category ids, and preserve confidence/source/run metadata.

lib/objectAction/types.ts
4:  "needs_review",

src/app/admin/object-action/suggestions/SuggestionModerationButtons.tsx
103:  "needs_review",
109:  "needs_review",
115:  "needs_review",
406:        `AI analysis can only run for draft, suggested or needs_review suggestions. Current status: "${currentStatus}".`
1083:          AI analysis is available only for draft, suggested or needs_review
1101:          needs_review, AI status is matched_existing, and a matched existing
1121:          or needs_review and AI status is new_category_suggested or

src/app/admin/object-action/suggestions/page.tsx
12:  | "needs_review"
134:const DEFAULT_STATUS_FILTER: SuggestionStatusFilter = "needs_review";
140:  { value: "needs_review", label: "Needs review" },
243:  if (status === "needs_review" || status === "suggested") {
885:    (suggestion) => suggestion.status === "needs_review"

src/app/api/geo/areas/route.ts
15:type GeoAreaStatus = "approved" | "suggested" | "needs_review" | "rejected";
67:  "needs_review",
197:      (row.status === "suggested" || row.status === "needs_review")
386:    .in("status", ["suggested", "needs_review"])
475:            "Invalid status. Allowed values: approved, suggested, needs_review, rejected",

src/app/api/geo/suggestions/route.ts
14:type GeoAreaStatus = "approved" | "suggested" | "needs_review" | "rejected";

src/app/api/object-action/suggestions/route.ts
143:  | "needs_review"
205:const DEFAULT_SUGGESTION_STATUS_FILTER: SuggestionStatusFilter = "needs_review";
285:  "needs_review",
303:  "needs_review",
309:  "needs_review",
315:  "needs_review",
1179:      `AI analysis can only run for draft, suggested or needs_review suggestions. Current status: ${suggestion.status}.`
1604:      `approve_existing_match can only run for draft, suggested or needs_review suggestions. Current status: ${suggestion.status}.`
1756:      `approve_new_category can only run for draft, suggested or needs_review suggestions. Current status: ${suggestion.status}.`
2325:      status: "needs_review",

src/app/api/organizations/route.ts
203:      input.geoArea.status === "needs_review") &&
223:    input.geoArea.status === "needs_review"
489:      (geoArea.status === "suggested" || geoArea.status === "needs_review")

src/app/directory/components/DirectorySuggestionRequestForm.tsx
392:          <strong>needs_review</strong> and will not be published without

src/app/organizations/[id]/page.tsx
370:      (geoArea.status === "suggested" || geoArea.status === "needs_review")
924:      request.status === "needs_review"

src/app/organizations/new/page.tsx
90:      (geoArea.status === "suggested" || geoArea.status === "needs_review"),

supabase/migrations/001_object_action_backbone.sql
38:        'needs_review',
95:        'needs_review',
154:        'needs_review',
210:        'needs_review',
260:        'needs_review',
325:        'needs_review',
410:        'needs_review',
573:        'needs_review',

supabase/migrations/007_create_object_action_suggestion_requests.sql
38:  status text not null default 'needs_review',
129:        'needs_review',
236:  status = 'needs_review'
```

## References: needs_user_review

```text
docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql
19:  ADD COLUMN IF NOT EXISTS needs_user_review boolean NOT NULL DEFAULT false,
86:CREATE INDEX IF NOT EXISTS idx_value_objects_needs_user_review
87:  ON public.value_objects(needs_user_review);
234:        'needs_user_review',

docs/sql/P4.9.11-A1_parent_child_value_object_read_model_audit.sql
27:      'needs_user_review',
42:    vo.needs_user_review,
80:    vo.needs_user_review,

docs/sql/P4.9.12-A2_create_value_object_hierarchy_profiles_v1.sql
103:  vo.needs_user_review,
111:  parent_vo.needs_user_review AS parent_needs_user_review,
207:        'needsUserReview', needs_user_review,

docs/sql/P4.9.13-A1_controlled_hierarchy_candidate_audit.sql
24:    vo.needs_user_review,
94:    hp.needs_user_review,
197:        'needsUserReview', needs_user_review,
216:        'needsUserReview', avo.needs_user_review,

docs/sql/P4.9.14-A1_value_object_identity_display_readiness_audit.sql
33:    vo.needs_user_review,
169:        'needsUserReview', hp.needs_user_review,
203:    avo.needs_user_review,
309:        'needsUserReview', needs_user_review,

docs/sql/P4.9.15-A1_controlled_first_hierarchy_write_strategy_audit.sql
75:    vo.needs_user_review,
113:    vo.needs_user_review,
252:      'needs_user_review', false,

docs/sql/P4.9.15-A4_exact_preview_learning_business_german_hierarchy_write.sql
117:      'needs_user_review', false,
176:    needs_user_review,

docs/sql/P4.9.15-A5_guarded_write_learning_business_german_hierarchy.sql
131:    needs_user_review,
326:      hp.needs_user_review

docs/sql/P4.9.15-A6_verify_first_hierarchy_write_learning_business_german.sql
38:    vo.needs_user_review,
60:    vo.needs_user_review,
104:    hp.needs_user_review

docs/value-objects/P4.10.0-A2_repo_category_rubricator_reference_inventory.txt
959:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:542: relation_type|exposure_minutes|parent_value_object_id|needs_user_review|entity_protocol|commercial_usage|value_object_category_links|activity_event_value_object_links
1241:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:651: value_object_category_links|activity_event_value_object_links|value_object_usage_aggregates|exposure_minutes|parent_value_object_id|entity_protocol_characteristics_json|needs_user_review|category_origin_json|ui_visibility

docs/value-objects/P4.10.0-A2_repo_value_object_reference_inventory.txt
199:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:19: ADD COLUMN IF NOT EXISTS needs_user_review boolean NOT NULL DEFAULT false,
225:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:86: CREATE INDEX IF NOT EXISTS idx_value_objects_needs_user_review
226:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:87: ON public.value_objects(needs_user_review);
280:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:234: 'needs_user_review',
292:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.11-A1_parent_child_value_object_read_model_audit.sql:27: 'needs_user_review',
295:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.11-A1_parent_child_value_object_read_model_audit.sql:42: vo.needs_user_review,
305:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.11-A1_parent_child_value_object_read_model_audit.sql:80: vo.needs_user_review,
336:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.12-A2_create_value_object_hierarchy_profiles_v1.sql:103: vo.needs_user_review,
338:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.12-A2_create_value_object_hierarchy_profiles_v1.sql:111: parent_vo.needs_user_review AS parent_needs_user_review,
356:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.12-A2_create_value_object_hierarchy_profiles_v1.sql:207: 'needsUserReview', needs_user_review,
362:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.13-A1_controlled_hierarchy_candidate_audit.sql:24: vo.needs_user_review,
368:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.13-A1_controlled_hierarchy_candidate_audit.sql:94: hp.needs_user_review,
384:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.13-A1_controlled_hierarchy_candidate_audit.sql:197: 'needsUserReview', needs_user_review,
388:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.13-A1_controlled_hierarchy_candidate_audit.sql:216: 'needsUserReview', avo.needs_user_review,
402:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.14-A1_value_object_identity_display_readiness_audit.sql:33: vo.needs_user_review,
414:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.14-A1_value_object_identity_display_readiness_audit.sql:169: 'needsUserReview', hp.needs_user_review,
421:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.14-A1_value_object_identity_display_readiness_audit.sql:203: avo.needs_user_review,
433:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.14-A1_value_object_identity_display_readiness_audit.sql:309: 'needsUserReview', needs_user_review,
445:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.15-A1_controlled_first_hierarchy_write_strategy_audit.sql:75: vo.needs_user_review,
453:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.15-A1_controlled_first_hierarchy_write_strategy_audit.sql:113: vo.needs_user_review,
463:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.15-A1_controlled_first_hierarchy_write_strategy_audit.sql:252: 'needs_user_review', false,
482:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.15-A4_exact_preview_learning_business_german_hierarchy_write.sql:117: 'needs_user_review', false,
488:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.15-A4_exact_preview_learning_business_german_hierarchy_write.sql:176: needs_user_review,
524:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.15-A5_guarded_write_learning_business_german_hierarchy.sql:131: needs_user_review,
544:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.15-A5_guarded_write_learning_business_german_hierarchy.sql:326: hp.needs_user_review
558:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.15-A6_verify_first_hierarchy_write_learning_business_german.sql:38: vo.needs_user_review,
563:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.15-A6_verify_first_hierarchy_write_learning_business_german.sql:60: vo.needs_user_review,
572:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.15-A6_verify_first_hierarchy_write_learning_business_german.sql:104: hp.needs_user_review
683:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A2_v4_2_gap_conclusion.md:91: - needs_user_review
709:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:542: relation_type|exposure_minutes|parent_value_object_id|needs_user_review|entity_protocol|commercial_usage|value_object_category_links|activity_event_value_object_links
717:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A4_local_code_routes_inventory_conclusion.md:40: | needs_user_review | 1 |
725:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A4_local_code_routes_inventory_conclusion.md:176: 5. needs_user_review as interface/moderation flag
733:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A5_focused_live_schema_check_result.md:32: - needs_user_review
739:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A6_minimal_additive_migration_plan.md:29: - needs_user_review
751:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A7_live_migration_result.md:22: - needs_user_review boolean NOT NULL DEFAULT false
763:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A8_foundation_checkpoint.md:37: - needs_user_review
767:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A8_foundation_checkpoint.md:59: - needs_user_review as UI/moderation flag
802:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:651: value_object_category_links|activity_event_value_object_links|value_object_usage_aggregates|exposure_minutes|parent_value_object_id|entity_protocol_characteristics_json|needs_user_review|category_origin_json|ui_visibility
808:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:664: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 19 | ADD COLUMN IF NOT EXISTS needs_user_review boolean NOT NULL DEFAULT false, |
823:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:682: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 86 | CREATE INDEX IF NOT EXISTS idx_value_objects_needs_user_review |
824:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:683: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 87 | ON public.value_objects(needs_user_review); |
874:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:734: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 234 | 'needs_user_review', |
1025:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.11-A2_parent_child_value_object_read_model_audit_result.md:37: - needs_user_review: boolean, not null, default false
1031:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.11-A2_parent_child_value_object_read_model_audit_result.md:67: - needs_user_review: false
1035:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.11-A2_parent_child_value_object_read_model_audit_result.md:83: - needs_user_review: false
1048:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.11-A3_parent_child_value_object_read_model_checkpoint.md:59: - needs_user_review
1066:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.12-A1_controlled_parent_child_value_object_hierarchy_strategy.md:161: - needs_user_review = true/false;
1069:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.12-A1_controlled_parent_child_value_object_hierarchy_strategy.md:221: - needs_user_review;
1139:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.14-A2_value_object_identity_display_readiness_audit_result.md:41: - needs_user_review
1179:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.15-A4_exact_preview_learning_business_german_hierarchy_write_result.md:40: - needs_user_review: false
1201:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.15-A6_verify_first_hierarchy_write_learning_business_german_result.md:46: - needs_user_review: false
1701:C:\Users\Admin\Documents\projects\gpt-app\src\app\api\value-objects\debug\cloud-profile\route.ts:76: needs_user_review: boolean | null;
1723:C:\Users\Admin\Documents\projects\gpt-app\src\app\api\value-objects\debug\cloud-profile\route.ts:558: needsUserReview: row.needs_user_review,

docs/value-objects/P4.10.0-B2_minimal_schema_v4_2_gap_analysis_checkpoint.md
52:- needs_user_review

docs/value-objects/P4.9.0-A2_v4_2_gap_conclusion.md
91:- needs_user_review

docs/value-objects/P4.9.0-A3_local_code_routes_inventory.md
542:relation_type|exposure_minutes|parent_value_object_id|needs_user_review|entity_protocol|commercial_usage|value_object_category_links|activity_event_value_object_links

docs/value-objects/P4.9.0-A4_local_code_routes_inventory_conclusion.md
40:| needs_user_review | 1 |
176:5. needs_user_review as interface/moderation flag

docs/value-objects/P4.9.0-A5_focused_live_schema_check_result.md
32:- needs_user_review

docs/value-objects/P4.9.0-A6_minimal_additive_migration_plan.md
29:- needs_user_review

docs/value-objects/P4.9.0-A7_live_migration_result.md
22:- needs_user_review boolean NOT NULL DEFAULT false

docs/value-objects/P4.9.0-A8_foundation_checkpoint.md
37:- needs_user_review
59:- needs_user_review as UI/moderation flag

docs/value-objects/P4.9.1-A1_runtime_writer_inventory.md
651:value_object_category_links|activity_event_value_object_links|value_object_usage_aggregates|exposure_minutes|parent_value_object_id|entity_protocol_characteristics_json|needs_user_review|category_origin_json|ui_visibility
664:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 19 | ADD COLUMN IF NOT EXISTS needs_user_review boolean NOT NULL DEFAULT false, |
682:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 86 | CREATE INDEX IF NOT EXISTS idx_value_objects_needs_user_review |
683:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 87 | ON public.value_objects(needs_user_review); |
734:| docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 234 | 'needs_user_review', |

docs/value-objects/P4.9.11-A2_parent_child_value_object_read_model_audit_result.md
37:- needs_user_review: boolean, not null, default false
67:- needs_user_review: false
83:- needs_user_review: false

docs/value-objects/P4.9.11-A3_parent_child_value_object_read_model_checkpoint.md
59:- needs_user_review

docs/value-objects/P4.9.12-A1_controlled_parent_child_value_object_hierarchy_strategy.md
161:- needs_user_review = true/false;
221:- needs_user_review;

docs/value-objects/P4.9.14-A2_value_object_identity_display_readiness_audit_result.md
41:- needs_user_review

docs/value-objects/P4.9.15-A4_exact_preview_learning_business_german_hierarchy_write_result.md
40:- needs_user_review: false

docs/value-objects/P4.9.15-A6_verify_first_hierarchy_write_learning_business_german_result.md
46:- needs_user_review: false

src/app/api/value-objects/debug/cloud-profile/route.ts
76:  needs_user_review: boolean | null;
558:        needsUserReview: row.needs_user_review,
```

## References: aliases

```text
docs/activity-template-mapping-p4-4.md
174:## 8. P4.4.5 - Debug trace impact summary aliases
190:Fixed aliases:

docs/commercial/P4.8.0-A2_schema_inventory_raw.md
87:| aliases | 2 | 0 | 1 | supabase\migrations\013_activity_templates_v2.sql:11<br>supabase\migrations\013_activity_templates_v2.sql:798 |
182:### aliases

docs/commercial/P4.8.0-A4b_offer_items_semantic_check.md
172:| supabase/migrations/001_object_action_backbone.sql | 542 | create table if not exists concept_aliases ( |

docs/p4-7-rubricator-inventory-raw.md
125:- .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
181:- .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
447:- .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
1173:| object_action_aliases | MISSING | RLS_NOT_ENABLED_OR_MISSING | 0 |
1199:- object_action_aliases

docs/p4-7-rubricator-mapping-decision.md
40:- object_action_aliases

docs/sql/P4.8.0-A2_live_schema_inventory.sql
18:  ('aliases'),
89:  ('aliases'),
157:  ('aliases'),
226:  ('aliases'),
290:  ('aliases'),
358:  ('aliases'),

docs/value-objects/P4.10.0-A2_repo_activity_processing_reference_inventory.txt
74:C:\Users\Admin\Documents\projects\gpt-app\docs\commercial\P4.8.0-A2_schema_inventory_raw.md:87: | aliases | 2 | 0 | 1 | supabase\migrations\013_activity_templates_v2.sql:11<br>supabase\migrations\013_activity_templates_v2.sql:798 |

docs/value-objects/P4.10.0-A2_repo_category_rubricator_reference_inventory.txt
224:C:\Users\Admin\Documents\projects\gpt-app\docs\commercial\P4.8.0-A4b_offer_items_semantic_check.md:172: | supabase/migrations/001_object_action_backbone.sql | 542 | create table if not exists concept_aliases ( |
871:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:168: | lib/objectAction/suggestionAnalysis.ts | 322 | "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.", |
2765:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:125: - .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
2802:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:181: - .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
2981:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:447: - .\lib\objectAction\suggestionAnalysis.ts:322 - "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",
3272:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1173: | object_action_aliases | MISSING | RLS_NOT_ENABLED_OR_MISSING | 0 |
3280:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1199: - object_action_aliases
3292:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-mapping-decision.md:40: - object_action_aliases
3712:C:\Users\Admin\Documents\projects\gpt-app\lib\objectAction\suggestionAnalysis.ts:322: "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",

docs/value-objects/P4.9.0-A3_local_code_routes_inventory.md
168:| lib/objectAction/suggestionAnalysis.ts | 322 | "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.", |

docs/value-objects/category-derivation-layer-v1.md
72:The resolver must receive category candidates, normalize slugs and aliases, search contextual_categories, reuse existing categories, create missing categories only under controlled policy, mark new categories as suggested or needs_review where appropriate, return resolved category ids, and preserve confidence/source/run metadata.
76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.

lib/objectAction/suggestionAnalysis.ts
322:        "Do not create object_types, action_types, contextual_categories, entity_classifications, translations, or aliases.",

supabase/migrations/001_object_action_backbone.sql
542:create table if not exists concept_aliases (
554:  constraint concept_aliases_concept_type_allowed
565:  constraint concept_aliases_alias_text_not_empty
568:  constraint concept_aliases_status_allowed
583:  constraint concept_aliases_source_type_allowed
597:create unique index if not exists concept_aliases_unique_idx
598:on concept_aliases (
605:create index if not exists concept_aliases_lookup_idx
606:on concept_aliases (alias_normalized);
608:create index if not exists concept_aliases_concept_idx
609:on concept_aliases (concept_type, concept_id);
713:    select 1 from pg_trigger where tgname = 'concept_aliases_set_updated_at'
715:    create trigger concept_aliases_set_updated_at
716:    before update on concept_aliases

supabase/migrations/013_activity_templates_v2.sql
11:-- user_activity_shortcuts     = optional user/system shortcuts, aliases, buttons, NFC tags, voice phrases, legacy codes
798:'Optional shortcuts for activity templates: aliases, buttons, favorite actions, voice phrases, NFC tags, API aliases or legacy numeric codes. Codes are not the public primary architecture.';
```

## Contract: RubricatorValueObjectMappingResult

```text
docs/p4-7-rubricator-mapping-decision.md
208:RubricatorValueObjectMappingResult

docs/value-objects/P4.10.0-A2_repo_category_rubricator_reference_inventory.txt
1359:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:813: 58: export type RubricatorValueObjectMappingResult = {
1406:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1456: 701: ): Promise<RubricatorValueObjectMappingResult> {
1407:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1465: 710:   const result: RubricatorValueObjectMappingResult = {
1411:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1591: 10:   type RubricatorValueObjectMappingResult,
1413:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1607: 26:   mappingResult: RubricatorValueObjectMappingResult | null;
1558:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A6_hot_path_window_extraction.md:665: 701: ): Promise<RubricatorValueObjectMappingResult> {
1559:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A6_hot_path_window_extraction.md:674: 710:   const result: RubricatorValueObjectMappingResult = {
3311:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-mapping-decision.md:208: RubricatorValueObjectMappingResult
3410:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\activityValueObjectLifecycle.ts:10: type RubricatorValueObjectMappingResult,
3412:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\activityValueObjectLifecycle.ts:26: mappingResult: RubricatorValueObjectMappingResult | null;
3494:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:58: export type RubricatorValueObjectMappingResult = {
3541:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:701: ): Promise<RubricatorValueObjectMappingResult> {
3542:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:710: const result: RubricatorValueObjectMappingResult = {

docs/value-objects/P4.10.0-C4_minimal_free_text_v1_design_decision.md
107:- RubricatorValueObjectMappingResult

docs/value-objects/P4.10.0-C5_exact_contract_inspection_checkpoint.md
38:- mappingResult: RubricatorValueObjectMappingResult | null
44:- RubricatorValueObjectMappingResult

docs/value-objects/P4.10.0-C5_key_code_ranges.txt
12:.\lib\activity\activityValueObjectLifecycle.ts:10:   type RubricatorValueObjectMappingResult,
28:.\lib\activity\activityValueObjectLifecycle.ts:26:   mappingResult: RubricatorValueObjectMappingResult | null;
194:.\lib\activity\rubricatorValueObjectMapper.ts:58: export type RubricatorValueObjectMappingResult = {
500:.\lib\activity\rubricatorValueObjectMapper.ts:701: ): Promise<RubricatorValueObjectMappingResult> {
509:.\lib\activity\rubricatorValueObjectMapper.ts:710:   const result: RubricatorValueObjectMappingResult = {

docs/value-objects/P4.10.0-C5b_controlled_fallback_key_ranges.txt
653:.\lib\activity\rubricatorValueObjectMapper.ts:701: ): Promise<RubricatorValueObjectMappingResult> {
662:.\lib\activity\rubricatorValueObjectMapper.ts:710:   const result: RubricatorValueObjectMappingResult = {
704:.\lib\activity\activityValueObjectLifecycle.ts:10:   type RubricatorValueObjectMappingResult,
720:.\lib\activity\activityValueObjectLifecycle.ts:26:   mappingResult: RubricatorValueObjectMappingResult | null;

docs/value-objects/P4.10.0-C6-B_previous_activityValueObjectLifecycle.ts.txt
10:  type RubricatorValueObjectMappingResult,
26:  mappingResult: RubricatorValueObjectMappingResult | null;

docs/value-objects/P4.10.0-C6-B_previous_rubricatorValueObjectMapper.ts.txt
58:export type RubricatorValueObjectMappingResult = {
701:): Promise<RubricatorValueObjectMappingResult> {
710:  const result: RubricatorValueObjectMappingResult = {

docs/value-objects/P4.9.1-A4_full_key_file_extraction.md
813:   58: export type RubricatorValueObjectMappingResult = {
1456:  701: ): Promise<RubricatorValueObjectMappingResult> {
1465:  710:   const result: RubricatorValueObjectMappingResult = {
1591:   10:   type RubricatorValueObjectMappingResult,
1607:   26:   mappingResult: RubricatorValueObjectMappingResult | null;

docs/value-objects/P4.9.1-A6_hot_path_window_extraction.md
665:  701: ): Promise<RubricatorValueObjectMappingResult> {
674:  710:   const result: RubricatorValueObjectMappingResult = {

lib/activity/activityValueObjectLifecycle.ts
10:  type RubricatorValueObjectMappingResult,
26:  mappingResult: RubricatorValueObjectMappingResult | null;

lib/activity/rubricatorValueObjectMapper.ts
58:export type RubricatorValueObjectMappingResult = {
747:): Promise<RubricatorValueObjectMappingResult> {
756:  const result: RubricatorValueObjectMappingResult = {
```

## Contract: ValueObjectBridgeMapping

```text
docs/p4-7-rubricator-inventory-raw.md
1207:P4.7.2-R ÔÇö define mapping decision from contextual_category / entity_classification to ValueObjectBridgeMapping[].

docs/p4-7-rubricator-mapping-decision.md
23:Therefore, valueObjectBridge.ts remains a low-level bridge helper, but a higher-level mapping helper must convert Object-Action classification into ValueObjectBridgeMapping[].
158:- helper reads rubricator classification and produces ValueObjectBridgeMapping[];
188:ValueObjectBridgeMapping[]
203:- map it to one or more ValueObjectBridgeMapping objects;
248:-> ValueObjectBridgeMapping[]
282:| What should it output? | ValueObjectBridgeMapping[] |

docs/value-objects/P4.10.0-A2_repo_category_rubricator_reference_inventory.txt
3284:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1207: P4.7.2-R ÔÇö define mapping decision from contextual_category / entity_classification to ValueObjectBridgeMapping[].
3307:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-mapping-decision.md:158: - helper reads rubricator classification and produces ValueObjectBridgeMapping[];

docs/value-objects/P4.10.0-C5_exact_contract_inspection_checkpoint.md
45:- mappings: ValueObjectBridgeMapping[]
54:- ValueObjectBridgeMapping

docs/value-objects/P4.10.0-C5_key_code_ranges.txt
139:.\lib\activity\rubricatorValueObjectMapper.ts:3: import type { ValueObjectBridgeMapping } from "./valueObjectBridge";
201:.\lib\activity\rubricatorValueObjectMapper.ts:65:   mappings: ValueObjectBridgeMapping[];
216:.\lib\activity\rubricatorValueObjectMapper.ts:80:   relationType: ValueObjectBridgeMapping["relationType"];
219:.\lib\activity\rubricatorValueObjectMapper.ts:83:   deltaDirection: ValueObjectBridgeMapping["deltaDirection"];
462:.\lib\activity\rubricatorValueObjectMapper.ts:663: ): ValueObjectBridgeMapping | null {
642:.\lib\activity\valueObjectBridge.ts:81: export type ValueObjectBridgeMapping = {
681:.\lib\activity\valueObjectBridge.ts:120:   mappings: ValueObjectBridgeMapping[];

docs/value-objects/P4.10.0-C5b_controlled_fallback_key_ranges.txt
8:.\lib\activity\rubricatorValueObjectMapper.ts:65:   mappings: ValueObjectBridgeMapping[];
23:.\lib\activity\rubricatorValueObjectMapper.ts:80:   relationType: ValueObjectBridgeMapping["relationType"];
26:.\lib\activity\rubricatorValueObjectMapper.ts:83:   deltaDirection: ValueObjectBridgeMapping["deltaDirection"];
615:.\lib\activity\rubricatorValueObjectMapper.ts:663: ): ValueObjectBridgeMapping | null {

docs/value-objects/P4.10.0-C6-B_previous_rubricatorValueObjectMapper.ts.txt
3:import type { ValueObjectBridgeMapping } from "./valueObjectBridge";
65:  mappings: ValueObjectBridgeMapping[];
80:  relationType: ValueObjectBridgeMapping["relationType"];
83:  deltaDirection: ValueObjectBridgeMapping["deltaDirection"];
663:): ValueObjectBridgeMapping | null {

docs/value-objects/P4.9.1-A4_full_key_file_extraction.md
77:   40: export type ValueObjectBridgeMapping = {
116:   79:   mappings: ValueObjectBridgeMapping[];
197:  160: ): NonNullable<ValueObjectBridgeMapping["relationType"]> {
198:  161:   const allowed: NonNullable<ValueObjectBridgeMapping["relationType"]>[] = [
210:  173:     allowed.includes(value as NonNullable<ValueObjectBridgeMapping["relationType"]>)
212:  175:     return value as NonNullable<ValueObjectBridgeMapping["relationType"]>;
758:    3: import type { ValueObjectBridgeMapping } from "./valueObjectBridge";
820:   65:   mappings: ValueObjectBridgeMapping[];
835:   80:   relationType: ValueObjectBridgeMapping["relationType"];
838:   83:   deltaDirection: ValueObjectBridgeMapping["deltaDirection"];
1418:  663: ): ValueObjectBridgeMapping | null {

docs/value-objects/P4.9.1-A6_hot_path_window_extraction.md
433:   40: export type ValueObjectBridgeMapping = {
472:   79:   mappings: ValueObjectBridgeMapping[];
627:  663: ): ValueObjectBridgeMapping | null {

lib/activity/rubricatorValueObjectMapper.ts
3:import type { ValueObjectBridgeMapping } from "./valueObjectBridge";
65:  mappings: ValueObjectBridgeMapping[];
80:  relationType: ValueObjectBridgeMapping["relationType"];
83:  deltaDirection: ValueObjectBridgeMapping["deltaDirection"];
709:): ValueObjectBridgeMapping | null {

lib/activity/valueObjectBridge.ts
81:export type ValueObjectBridgeMapping = {
120:  mappings: ValueObjectBridgeMapping[];
246:): NonNullable<ValueObjectBridgeMapping["relationType"]> {
247:  const allowed: NonNullable<ValueObjectBridgeMapping["relationType"]>[] = [
259:    allowed.includes(value as NonNullable<ValueObjectBridgeMapping["relationType"]>)
261:    return value as NonNullable<ValueObjectBridgeMapping["relationType"]>;
```

## Implementation: valueObjectBridge

```text
docs/activity/P4.7.8-R_cross_route_verification.md
70:lib/activity/valueObjectBridge.ts  
112:- valueObjectBridge.ok: true
113:- valueObjectBridge.error: null
114:- valueObjectBridge.logId: 3c2dd9c2-e504-4792-847e-f7918b7e5341
125:- valueObjectBridge.ok: true
126:- valueObjectBridge.error: null
127:- valueObjectBridge.logId: 8491e472-d33d-4a68-81d5-35945f19fa27
237:- valueObjectBridge.ok: true
238:- valueObjectBridge.logId: a05ff3ef-62db-4a51-a634-1f7ae63462ff
337:- valueObjectBridge.ok: true
338:- valueObjectBridge.logId: 33401e4d-bd60-4c74-87e0-9605ba4ce1c0
438:- valueObjectBridge.ok: true
439:- valueObjectBridge.skipped: false
440:- valueObjectBridge.mapping.mappingsCount: 1
441:- valueObjectBridge.bridge.createdCount: 1
452:- processingLogs.valueObjectBridge.ok: true
474:- valueObjectBridge.ok: true
475:- valueObjectBridge.skipped: false
476:- valueObjectBridge.mapping.mappingsCount: 1
477:- valueObjectBridge.bridge.createdCount: 1
492:- processingLogs.valueObjectBridge.ok: true
717:- lib/activity/valueObjectBridge.ts

docs/commercial/P4.8.0-A3_code_routes_inventory.md
211:| lib/activity/valueObjectBridge.ts | 1 |  | ownership/auth checks likely relevant |
322:| lib/activity/valueObjectBridge.ts | 1 |  | ownership/auth checks likely relevant |
418:**lib/activity/valueObjectBridge.ts**
476:| lib/activity/valueObjectBridge.ts | 1 |  | ownership/auth checks likely relevant |

docs/p4-7-rubricator-mapping-decision.md
15:- lib/activity/valueObjectBridge.ts
23:Therefore, valueObjectBridge.ts remains a low-level bridge helper, but a higher-level mapping helper must convert Object-Action classification into ValueObjectBridgeMapping[].
176:lib/activity/valueObjectBridge.ts

docs/sql/P4.7.8-R-L6_second_known_template_cross_route_audit.sql
347:      'valueObjectBridgeProcessingLogCount', value_object_bridge_processing_log_count

docs/sql/P4.7.8-R-L7_final_two_template_three_route_audit.sql
457:      'valueObjectBridgeProcessingLogCount', value_object_bridge_processing_log_count

docs/value-object-state-foundation-p4-7.md
242:Added guard in `lib/activity/valueObjectBridge.ts`: if `value_object_state_deltas` already contains a row for `event_id + value_object_id + metric_key`, the bridge skips duplicate creation and returns `skipReason = already_processed_event_value_object_metric`.

docs/value-objects/P4.10.0-A2_repo_activity_processing_reference_inventory.txt
374:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:41: | lib/activity/valueObjectBridge.ts | 299 | .from("value_object_state_deltas") |
375:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:42: | lib/activity/valueObjectBridge.ts | 339 | tableName: "value_object_daily_aggregates" \| "value_object_state_snapshots", |
376:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:45: | lib/activity/valueObjectBridge.ts | 559 | .from("value_object_state_deltas") |
377:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:46: | lib/activity/valueObjectBridge.ts | 599 | "value_object_daily_aggregates", |
378:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:47: | lib/activity/valueObjectBridge.ts | 615 | .from("value_object_daily_aggregates") |
398:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:275: | lib/activity/valueObjectBridge.ts | 213 | .from("activity_events") |
474:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:528: | lib/activity/valueObjectBridge.ts | 299 | .from("value_object_state_deltas") |
475:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:529: | lib/activity/valueObjectBridge.ts | 339 | tableName: "value_object_daily_aggregates" \| "value_object_state_snapshots", |
493:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:644: | lib/activity/valueObjectBridge.ts | 213 | .from("activity_events") |
494:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:648: | lib/activity/valueObjectBridge.ts | 299 | .from("value_object_state_deltas") |
495:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:657: | lib/activity/valueObjectBridge.ts | 559 | .from("value_object_state_deltas") |
496:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:660: | lib/activity/valueObjectBridge.ts | 615 | .from("value_object_daily_aggregates") |
528:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:122: | lib/activity/valueObjectBridge.ts | 299 | .from("value_object_state_deltas") |
529:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:123: | lib/activity/valueObjectBridge.ts | 339 | tableName: "value_object_daily_aggregates" \| "value_object_state_snapshots", |
530:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:124: | lib/activity/valueObjectBridge.ts | 559 | .from("value_object_state_deltas") |
531:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:125: | lib/activity/valueObjectBridge.ts | 599 | "value_object_daily_aggregates", |
532:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:126: | lib/activity/valueObjectBridge.ts | 615 | .from("value_object_daily_aggregates") |
667:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:824: | lib/activity/valueObjectBridge.ts | 213 | .from("activity_events") |
668:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:828: | lib/activity/valueObjectBridge.ts | 299 | .from("value_object_state_deltas") |
669:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:837: | lib/activity/valueObjectBridge.ts | 559 | .from("value_object_state_deltas") |
670:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:840: | lib/activity/valueObjectBridge.ts | 615 | .from("value_object_daily_aggregates") |
867:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:798: | lib/activity/valueObjectBridge.ts | 299 | .from("value_object_state_deltas") |
868:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:799: | lib/activity/valueObjectBridge.ts | 339 | tableName: "value_object_daily_aggregates" \| "value_object_state_snapshots", |
869:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:800: | lib/activity/valueObjectBridge.ts | 559 | .from("value_object_state_deltas") |
870:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:801: | lib/activity/valueObjectBridge.ts | 599 | "value_object_daily_aggregates", |
871:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A3_focused_writer_file_inspection.md:802: | lib/activity/valueObjectBridge.ts | 615 | .from("value_object_daily_aggregates") |
1684:C:\Users\Admin\Documents\projects\gpt-app\docs\value-object-state-foundation-p4-7.md:242: Added guard in `lib/activity/valueObjectBridge.ts`: if `value_object_state_deltas` already contains a row for `event_id + value_object_id + metric_key`, the bridge skips duplicate creation and returns `skipReason = already_processed_event_value_object_metric`.
1725:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:407: .from("activity_events")
1726:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:525: .from("value_object_state_deltas")
1727:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:566: tableName: "value_object_daily_aggregates" | "value_object_state_snapshots",
1728:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1244: .from("value_object_state_deltas")
1729:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1284: "value_object_daily_aggregates",
1730:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1300: .from("value_object_daily_aggregates")

docs/value-objects/P4.10.0-A2_repo_category_rubricator_reference_inventory.txt
1051:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:265: | lib/activity/activityRubricatorClassificationLifecycle.ts | 326 | * - Value Object creation/processing remains delegated to activityValueObjectLifecycle/valueObjectBridge. |
1060:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:370: | src/app/api/activity/debug-rubricator-value-object-bridge/route.ts | 5 | import { processValueObjectBridgeForActivityEvent } from "../../../../../lib/activity/valueObjectBridge"; |
2254:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:49: The first implementation should use mapping.metadata.classification.contextualCategoryId inside lib/activity/valueObjectBridge.ts.
2272:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:103: P4.9.2-A3 will replace lib/activity/valueObjectBridge.ts with full-file code adding value_object_category_links runtime support.
2273:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:1: # P4.9.2-A3 ÔÇö valueObjectBridge.ts category-link code change result
2310:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A5_category_link_runtime_checkpoint.md:26: Prepared additive integration plan for value_object_category_links in lib/activity/valueObjectBridge.ts.
2311:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A5_category_link_runtime_checkpoint.md:30: Updated lib/activity/valueObjectBridge.ts with a category-link helper.
3545:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:14: type ValueObjectCategoryRole =
3546:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:53: type ContextualCategoryForLink = {
3547:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:61: type ExtractedCategoryLinkMetadata = {
3548:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:62: contextualCategoryId: string | null;
3549:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:63: contextualCategorySlug: string | null;
3550:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:64: contextualCategoryName: string | null;
3551:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:147: * P4.9.2 additive category bridge fields.
3552:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:149: * These connect a derived Value Object to reliable category/rubricator metadata.
3553:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:152: valueObjectCategoryLinkId: string | null;
3554:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:153: valueObjectCategoryLinkError: string | null;
3555:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:218: * The v4.2 projection/category tables currently allow:
3556:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:267: function normalizeCategoryRole(
3557:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:269: ): ValueObjectCategoryRole {
3558:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:270: const allowed: ValueObjectCategoryRole[] = [
3559:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:282: if (allowed.includes(value as ValueObjectCategoryRole)) {
3560:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:283: return value as ValueObjectCategoryRole;
3561:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:373: function extractCategoryLinkMetadata(
3562:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:375: ): ExtractedCategoryLinkMetadata {
3563:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:379: contextualCategoryId: asString(classification.contextualCategoryId),
3564:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:380: contextualCategorySlug: asString(classification.contextualCategorySlug),
3565:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:381: contextualCategoryName: asString(classification.contextualCategoryName),
3566:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:481: async function readContextualCategoryForLink(
3567:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:483: contextualCategoryId: string
3568:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:485: category: ContextualCategoryForLink | null;
3569:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:489: .from("contextual_categories")
3570:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:491: .eq("id", contextualCategoryId)
3571:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:496: category: null,
3572:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:503: category: null,
3573:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:509: category: data as ContextualCategoryForLink,
3574:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:849: async function upsertV42ValueObjectCategoryLink(params: {
3575:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:861: valueObjectCategoryLinkId: string | null;
3576:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:877: const categoryMetadata = extractCategoryLinkMetadata(mappingMetadata);
3577:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:879: if (!isUuid(categoryMetadata.contextualCategoryId)) {
3578:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:881: valueObjectCategoryLinkId: null,
3579:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:886: const categoryLookup = await readContextualCategoryForLink(
3580:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:888: categoryMetadata.contextualCategoryId
3581:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:891: if (categoryLookup.errorMessage) {
3582:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:893: valueObjectCategoryLinkId: null,
3583:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:894: errorMessage: categoryLookup.errorMessage,
3584:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:898: if (!categoryLookup.category) {
3585:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:900: valueObjectCategoryLinkId: null,
3586:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:906: const categoryRole = normalizeCategoryRole(
3587:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:907: categoryMetadata.classificationRole === "primary"
3588:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:913: .from("value_object_category_links")
3589:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:917: category_table: "contextual_categories",
3590:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:918: category_id: categoryMetadata.contextualCategoryId,
3591:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:919: category_role: categoryRole,
3592:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:928: mapper: categoryMetadata.mapper,
3593:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:929: mapperVersion: categoryMetadata.mapperVersion,
3594:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:930: controlledRule: categoryMetadata.controlledRule,
3595:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:932: classificationId: categoryMetadata.classificationId,
3596:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:933: classificationRole: categoryMetadata.classificationRole,
3597:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:934: contextId: categoryMetadata.contextId,
3598:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:935: contextCode: categoryMetadata.contextCode,
3599:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:936: contextName: categoryMetadata.contextName,
3600:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:937: objectTypeId: categoryMetadata.objectTypeId,
3601:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:938: objectTypeCode: categoryMetadata.objectTypeCode,
3602:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:939: objectTypeName: categoryMetadata.objectTypeName,
3603:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:940: actionTypeId: categoryMetadata.actionTypeId,
3604:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:941: actionTypeCode: categoryMetadata.actionTypeCode,
3605:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:942: actionTypeName: categoryMetadata.actionTypeName,
3606:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:943: contextualCategoryId: categoryMetadata.contextualCategoryId,
3607:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:944: contextualCategorySlug: categoryMetadata.contextualCategorySlug,
3608:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:945: contextualCategoryName: categoryMetadata.contextualCategoryName,
3609:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:947: resolvedContextualCategory: {
3610:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:948: id: categoryLookup.category.id,
3611:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:949: slug: categoryLookup.category.slug,
3612:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:950: name: categoryLookup.category.name,
3613:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:951: status: categoryLookup.category.status,
3614:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:952: isActive: categoryLookup.category.is_active,
3615:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:955: projection: "value_object_category_links",
3616:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:956: mode: "runtime_category_link_from_bridge_mapping_metadata",
3617:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:964: onConflict: "value_object_id,category_table,category_id,category_role",
3618:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:972: valueObjectCategoryLinkId: null,
3619:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:973: errorMessage: error?.message ?? "failed_to_upsert_value_object_category_link",
3620:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:978: valueObjectCategoryLinkId: (data as { id: string }).id,
3621:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1058: valueObjectCategoryLinkId: null,
3622:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1059: valueObjectCategoryLinkError: null,
3623:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1208: const categoryLink = await upsertV42ValueObjectCategoryLink({
3624:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1222: createdItem.valueObjectCategoryLinkId =
3625:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1223: categoryLink.valueObjectCategoryLinkId;
3626:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1224: createdItem.valueObjectCategoryLinkError = categoryLink.errorMessage;
3627:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1226: if (categoryLink.errorMessage) {
3628:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1229: * Category-link creation is additive and must not roll back the existing VOI
3629:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1232: console.warn("P4.9.2 value_object_category_links upsert failed", {
3630:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1238: errorMessage: categoryLink.errorMessage,

docs/value-objects/P4.10.0-A2_repo_value_object_reference_inventory.txt
691:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:40: | lib/activity/valueObjectBridge.ts | 254 | .from("value_objects") |
712:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:646: | lib/activity/valueObjectBridge.ts | 254 | .from("value_objects") |
884:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:826: | lib/activity/valueObjectBridge.ts | 254 | .from("value_objects") |
1431:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:103: P4.9.2-A3 will replace lib/activity/valueObjectBridge.ts with full-file code adding value_object_category_links runtime support.
1448:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A5_category_link_runtime_checkpoint.md:26: Prepared additive integration plan for value_object_category_links in lib/activity/valueObjectBridge.ts.
1677:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:448: .from("value_objects")
1678:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:607: .from("activity_event_value_object_links")
1679:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:639: .from("value_object_usage_aggregates")
1680:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:640: .select("id, usage_count, exposure_minutes, first_used_at")
1681:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:668: exposure_minutes: unknown;
1682:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:675: exposureMinutes: Math.max(0, asNumber(row.exposure_minutes, 0)),
1683:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:728: .from("activity_event_value_object_links")
1684:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:734: exposure_minutes: exposureMinutes,
1685:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:744: projection: "activity_event_value_object_links",
1686:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:801: .from("value_object_usage_aggregates")
1687:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:807: exposure_minutes: nextExposureMinutes,
1688:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:820: projection: "value_object_usage_aggregates",
1689:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:913: .from("value_object_category_links")
1690:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:955: projection: "value_object_category_links",
1691:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1232: console.warn("P4.9.2 value_object_category_links upsert failed", {

docs/value-objects/P4.10.0-C3_free_text_processor_runtime_inventory_checkpoint.md
65:6. activityValueObjectLifecycle then calls valueObjectBridge.
66:7. valueObjectBridge writes legacy and v4.2 projections.
70:valueObjectBridge already writes/updates:
80:Therefore valueObjectBridge is not the first place to change for free-text v1.
95:- Do not rewrite valueObjectBridge first.

docs/value-objects/P4.10.0-C4_minimal_free_text_v1_design_decision.md
19:Do not start by rewriting valueObjectBridge.ts.
23:- valueObjectBridge.ts already writes the important v4.2 projections;
39:6. activityValueObjectLifecycle then calls valueObjectBridge.
40:7. valueObjectBridge writes legacy and v4.2 projections.
51:6. Existing valueObjectBridge writes the same projections as for known templates.
133:- Do not redesign valueObjectBridge.
154:- extract exact TypeScript types from activityValueObjectLifecycle.ts, rubricatorValueObjectMapper.ts, and valueObjectBridge.ts;
162:- avoid modifying valueObjectBridge.ts unless required by exact type contract;

docs/value-objects/P4.10.0-C5_exact_contract_inspection_checkpoint.md
52:valueObjectBridge.ts exposes:

docs/value-objects/P4.10.0-C5_key_code_ranges.txt
8:.\lib\activity\activityValueObjectLifecycle.ts:6: } from "./valueObjectBridge";
139:.\lib\activity\rubricatorValueObjectMapper.ts:3: import type { ValueObjectBridgeMapping } from "./valueObjectBridge";
561:===== .\lib\activity\valueObjectBridge.ts:1-190 =====
562:.\lib\activity\valueObjectBridge.ts:1: import type { SupabaseClient } from "@supabase/supabase-js";
563:.\lib\activity\valueObjectBridge.ts:2: 
564:.\lib\activity\valueObjectBridge.ts:3: type BridgeSource =
565:.\lib\activity\valueObjectBridge.ts:4:   | "rule"
566:.\lib\activity\valueObjectBridge.ts:5:   | "manual"
567:.\lib\activity\valueObjectBridge.ts:6:   | "ai_draft"
568:.\lib\activity\valueObjectBridge.ts:7:   | "api"
569:.\lib\activity\valueObjectBridge.ts:8:   | "system"
570:.\lib\activity\valueObjectBridge.ts:9:   | "correction"
571:.\lib\activity\valueObjectBridge.ts:10:   | "commercial";
572:.\lib\activity\valueObjectBridge.ts:11: 
573:.\lib\activity\valueObjectBridge.ts:12: type V42ProjectionSource = "rule" | "ai" | "manual" | "system_seed" | "migration";
574:.\lib\activity\valueObjectBridge.ts:13: 
575:.\lib\activity\valueObjectBridge.ts:14: type ValueObjectCategoryRole =
576:.\lib\activity\valueObjectBridge.ts:15:   | "primary"
577:.\lib\activity\valueObjectBridge.ts:16:   | "semantic_component"
578:.\lib\activity\valueObjectBridge.ts:17:   | "context"
579:.\lib\activity\valueObjectBridge.ts:18:   | "object"
580:.\lib\activity\valueObjectBridge.ts:19:   | "action"
581:.\lib\activity\valueObjectBridge.ts:20:   | "goal"
582:.\lib\activity\valueObjectBridge.ts:21:   | "protocol"
583:.\lib\activity\valueObjectBridge.ts:22:   | "general_meaning"
584:.\lib\activity\valueObjectBridge.ts:23:   | "system_suggested";
585:.\lib\activity\valueObjectBridge.ts:24: 
586:.\lib\activity\valueObjectBridge.ts:25: type ValueObjectStateDeltaDirection =
587:.\lib\activity\valueObjectBridge.ts:26:   | "increase"
588:.\lib\activity\valueObjectBridge.ts:27:   | "decrease"
589:.\lib\activity\valueObjectBridge.ts:28:   | "neutral"
590:.\lib\activity\valueObjectBridge.ts:29:   | "set";
591:.\lib\activity\valueObjectBridge.ts:30: 
592:.\lib\activity\valueObjectBridge.ts:31: type ValueObjectInstanceStatus =
593:.\lib\activity\valueObjectBridge.ts:32:   | "draft"
594:.\lib\activity\valueObjectBridge.ts:33:   | "planned"
595:.\lib\activity\valueObjectBridge.ts:34:   | "active"
596:.\lib\activity\valueObjectBridge.ts:35:   | "completed"
597:.\lib\activity\valueObjectBridge.ts:36:   | "cancelled"
598:.\lib\activity\valueObjectBridge.ts:37:   | "archived";
599:.\lib\activity\valueObjectBridge.ts:38: 
600:.\lib\activity\valueObjectBridge.ts:39: type ActivityEventForValueObjectBridge = {
601:.\lib\activity\valueObjectBridge.ts:40:   id: string;
602:.\lib\activity\valueObjectBridge.ts:41:   user_id: string;
603:.\lib\activity\valueObjectBridge.ts:42:   status: string;
604:.\lib\activity\valueObjectBridge.ts:43:   started_at: string | null;
605:.\lib\activity\valueObjectBridge.ts:44:   ended_at: string | null;
606:.\lib\activity\valueObjectBridge.ts:45:   duration_minutes: number | null;
607:.\lib\activity\valueObjectBridge.ts:46:   title: string | null;
608:.\lib\activity\valueObjectBridge.ts:47:   description: string | null;
609:.\lib\activity\valueObjectBridge.ts:48:   performed_by_actor_id?: string | null;
610:.\lib\activity\valueObjectBridge.ts:49:   acting_as_actor_id?: string | null;
611:.\lib\activity\valueObjectBridge.ts:50:   acting_for_actor_id?: string | null;
612:.\lib\activity\valueObjectBridge.ts:51: };
613:.\lib\activity\valueObjectBridge.ts:52: 
614:.\lib\activity\valueObjectBridge.ts:53: type ContextualCategoryForLink = {
615:.\lib\activity\valueObjectBridge.ts:54:   id: string;
616:.\lib\activity\valueObjectBridge.ts:55:   slug: string | null;
617:.\lib\activity\valueObjectBridge.ts:56:   name: string | null;
618:.\lib\activity\valueObjectBridge.ts:57:   status: string | null;
619:.\lib\activity\valueObjectBridge.ts:58:   is_active: boolean | null;
620:.\lib\activity\valueObjectBridge.ts:59: };
621:.\lib\activity\valueObjectBridge.ts:60: 
622:.\lib\activity\valueObjectBridge.ts:61: type ExtractedCategoryLinkMetadata = {
623:.\lib\activity\valueObjectBridge.ts:62:   contextualCategoryId: string | null;
624:.\lib\activity\valueObjectBridge.ts:63:   contextualCategorySlug: string | null;
625:.\lib\activity\valueObjectBridge.ts:64:   contextualCategoryName: string | null;
626:.\lib\activity\valueObjectBridge.ts:65:   classificationRole: string | null;
627:.\lib\activity\valueObjectBridge.ts:66:   classificationId: string | null;
628:.\lib\activity\valueObjectBridge.ts:67:   contextId: string | null;
629:.\lib\activity\valueObjectBridge.ts:68:   contextCode: string | null;
630:.\lib\activity\valueObjectBridge.ts:69:   contextName: string | null;
631:.\lib\activity\valueObjectBridge.ts:70:   objectTypeId: string | null;
632:.\lib\activity\valueObjectBridge.ts:71:   objectTypeCode: string | null;
633:.\lib\activity\valueObjectBridge.ts:72:   objectTypeName: string | null;
634:.\lib\activity\valueObjectBridge.ts:73:   actionTypeId: string | null;
635:.\lib\activity\valueObjectBridge.ts:74:   actionTypeCode: string | null;
636:.\lib\activity\valueObjectBridge.ts:75:   actionTypeName: string | null;
637:.\lib\activity\valueObjectBridge.ts:76:   controlledRule: string | null;
638:.\lib\activity\valueObjectBridge.ts:77:   mapper: string | null;
639:.\lib\activity\valueObjectBridge.ts:78:   mapperVersion: string | null;
640:.\lib\activity\valueObjectBridge.ts:79: };
641:.\lib\activity\valueObjectBridge.ts:80: 
642:.\lib\activity\valueObjectBridge.ts:81: export type ValueObjectBridgeMapping = {
643:.\lib\activity\valueObjectBridge.ts:82:   valueObjectId: string;
644:.\lib\activity\valueObjectBridge.ts:83: 
645:.\lib\activity\valueObjectBridge.ts:84:   relationType?:
646:.\lib\activity\valueObjectBridge.ts:85:     | "executes"
647:.\lib\activity\valueObjectBridge.ts:86:     | "creates"
648:.\lib\activity\valueObjectBridge.ts:87:     | "uses"
649:.\lib\activity\valueObjectBridge.ts:88:     | "supports"
650:.\lib\activity\valueObjectBridge.ts:89:     | "consumes"
651:.\lib\activity\valueObjectBridge.ts:90:     | "updates_state"
652:.\lib\activity\valueObjectBridge.ts:91:     | "commercial_source"
653:.\lib\activity\valueObjectBridge.ts:92:     | "related_to";
654:.\lib\activity\valueObjectBridge.ts:93: 
655:.\lib\activity\valueObjectBridge.ts:94:   weight?: number;
656:.\lib\activity\valueObjectBridge.ts:95:   confidence?: number;
657:.\lib\activity\valueObjectBridge.ts:96:   source?: BridgeSource;
658:.\lib\activity\valueObjectBridge.ts:97: 
659:.\lib\activity\valueObjectBridge.ts:98:   instanceStatus?: ValueObjectInstanceStatus;
660:.\lib\activity\valueObjectBridge.ts:99:   instanceTitle?: string | null;
661:.\lib\activity\valueObjectBridge.ts:100:   instanceNote?: string | null;
662:.\lib\activity\valueObjectBridge.ts:101:   resultStatus?: string | null;
663:.\lib\activity\valueObjectBridge.ts:102:   qualityScore?: number | null;
664:.\lib\activity\valueObjectBridge.ts:103: 
665:.\lib\activity\valueObjectBridge.ts:104:   metricKey: string;
666:.\lib\activity\valueObjectBridge.ts:105:   metricUnit?: string | null;
667:.\lib\activity\valueObjectBridge.ts:106:   deltaValueNumeric?: number | null;
668:.\lib\activity\valueObjectBridge.ts:107:   deltaValueText?: string | null;
669:.\lib\activity\valueObjectBridge.ts:108:   deltaDirection?: ValueObjectStateDeltaDirection;
670:.\lib\activity\valueObjectBridge.ts:109: 
671:.\lib\activity\valueObjectBridge.ts:110:   aggregateDate?: string | null;
672:.\lib\activity\valueObjectBridge.ts:111:   aggregateType?: string;
673:.\lib\activity\valueObjectBridge.ts:112:   aggregateKey?: string;
674:.\lib\activity\valueObjectBridge.ts:113: 
675:.\lib\activity\valueObjectBridge.ts:114:   metadata?: Record<string, unknown>;
676:.\lib\activity\valueObjectBridge.ts:115: };
677:.\lib\activity\valueObjectBridge.ts:116: 
678:.\lib\activity\valueObjectBridge.ts:117: export type ProcessValueObjectBridgeInput = {
679:.\lib\activity\valueObjectBridge.ts:118:   supabase: SupabaseClient;
680:.\lib\activity\valueObjectBridge.ts:119:   eventId: string;
681:.\lib\activity\valueObjectBridge.ts:120:   mappings: ValueObjectBridgeMapping[];
682:.\lib\activity\valueObjectBridge.ts:121:   source?: BridgeSource;
683:.\lib\activity\valueObjectBridge.ts:122:   allowNonCompletedEvent?: boolean;
684:.\lib\activity\valueObjectBridge.ts:123:   processorName?: string;
685:.\lib\activity\valueObjectBridge.ts:124: };
686:.\lib\activity\valueObjectBridge.ts:125: 
687:.\lib\activity\valueObjectBridge.ts:126: export type ValueObjectBridgeCreatedItem = {
688:.\lib\activity\valueObjectBridge.ts:127:   valueObjectId: string;
689:.\lib\activity\valueObjectBridge.ts:128:   valueObjectInstanceId: string | null;
690:.\lib\activity\valueObjectBridge.ts:129:   linkId: string | null;
691:.\lib\activity\valueObjectBridge.ts:130:   stateDeltaId: string | null;
692:.\lib\activity\valueObjectBridge.ts:131:   aggregateId: string | null;
693:.\lib\activity\valueObjectBridge.ts:132:   snapshotId: string | null;
694:.\lib\activity\valueObjectBridge.ts:133: 
695:.\lib\activity\valueObjectBridge.ts:134:   /**
696:.\lib\activity\valueObjectBridge.ts:135:    * P4.9.1 additive v4.2 projection fields.
697:.\lib\activity\valueObjectBridge.ts:136:    *
698:.\lib\activity\valueObjectBridge.ts:137:    * These do not replace the old VOI pipeline:
699:.\lib\activity\valueObjectBridge.ts:138:    * - linkId still refers to activity_event_value_object_instance_links;
700:.\lib\activity\valueObjectBridge.ts:139:    * - activityEventValueObjectLinkId refers to the new direct v4.2 projection table;
701:.\lib\activity\valueObjectBridge.ts:140:    * - usageAggregateId refers to the new object-cloud/read-optimization aggregate.
702:.\lib\activity\valueObjectBridge.ts:141:    */
703:.\lib\activity\valueObjectBridge.ts:142:   activityEventValueObjectLinkId: string | null;
704:.\lib\activity\valueObjectBridge.ts:143:   usageAggregateId: string | null;
705:.\lib\activity\valueObjectBridge.ts:144:   v42ProjectionError: string | null;
706:.\lib\activity\valueObjectBridge.ts:145: 
707:.\lib\activity\valueObjectBridge.ts:146:   /**
708:.\lib\activity\valueObjectBridge.ts:147:    * P4.9.2 additive category bridge fields.
709:.\lib\activity\valueObjectBridge.ts:148:    *
710:.\lib\activity\valueObjectBridge.ts:149:    * These connect a derived Value Object to reliable category/rubricator metadata.
711:.\lib\activity\valueObjectBridge.ts:150:    * They do not replace VOI links, state deltas, aggregates, snapshots, or relation_type.
712:.\lib\activity\valueObjectBridge.ts:151:    */
713:.\lib\activity\valueObjectBridge.ts:152:   valueObjectCategoryLinkId: string | null;
714:.\lib\activity\valueObjectBridge.ts:153:   valueObjectCategoryLinkError: string | null;
715:.\lib\activity\valueObjectBridge.ts:154: 
716:.\lib\activity\valueObjectBridge.ts:155:   skipped: boolean;
717:.\lib\activity\valueObjectBridge.ts:156:   skipReason: string | null;
718:.\lib\activity\valueObjectBridge.ts:157: };
719:.\lib\activity\valueObjectBridge.ts:158: 
720:.\lib\activity\valueObjectBridge.ts:159: export type ProcessValueObjectBridgeResult = {
721:.\lib\activity\valueObjectBridge.ts:160:   ok: boolean;
722:.\lib\activity\valueObjectBridge.ts:161:   skipped: boolean;
723:.\lib\activity\valueObjectBridge.ts:162:   skipReason: string | null;
724:.\lib\activity\valueObjectBridge.ts:163:   eventId: string;
725:.\lib\activity\valueObjectBridge.ts:164:   eventStatus: string | null;
726:.\lib\activity\valueObjectBridge.ts:165:   mappingsRequested: number;
727:.\lib\activity\valueObjectBridge.ts:166:   created: ValueObjectBridgeCreatedItem[];
728:.\lib\activity\valueObjectBridge.ts:167:   errors: string[];
729:.\lib\activity\valueObjectBridge.ts:168: };
730:.\lib\activity\valueObjectBridge.ts:169: 
731:.\lib\activity\valueObjectBridge.ts:170: function clamp01(value: number | null | undefined, fallback: number): number {
732:.\lib\activity\valueObjectBridge.ts:171:   if (typeof value !== "number" || Number.isNaN(value)) {
733:.\lib\activity\valueObjectBridge.ts:172:     return fallback;
734:.\lib\activity\valueObjectBridge.ts:173:   }
735:.\lib\activity\valueObjectBridge.ts:174: 
736:.\lib\activity\valueObjectBridge.ts:175:   if (value < 0) {
737:.\lib\activity\valueObjectBridge.ts:176:     return 0;
738:.\lib\activity\valueObjectBridge.ts:177:   }
739:.\lib\activity\valueObjectBridge.ts:178: 
740:.\lib\activity\valueObjectBridge.ts:179:   if (value > 1) {
741:.\lib\activity\valueObjectBridge.ts:180:     return 1;
742:.\lib\activity\valueObjectBridge.ts:181:   }
743:.\lib\activity\valueObjectBridge.ts:182: 
744:.\lib\activity\valueObjectBridge.ts:183:   return value;
745:.\lib\activity\valueObjectBridge.ts:184: }
746:.\lib\activity\valueObjectBridge.ts:185: 
747:.\lib\activity\valueObjectBridge.ts:186: function normalizeSource(value: string | null | undefined): BridgeSource {
748:.\lib\activity\valueObjectBridge.ts:187:   const allowed: BridgeSource[] = [
749:.\lib\activity\valueObjectBridge.ts:188:     "rule",
750:.\lib\activity\valueObjectBridge.ts:189:     "manual",
751:.\lib\activity\valueObjectBridge.ts:190:     "ai_draft",
753:===== .\lib\activity\valueObjectBridge.ts:970-1260 =====
754:.\lib\activity\valueObjectBridge.ts:970:   if (error || !data) {
755:.\lib\activity\valueObjectBridge.ts:971:     return {
756:.\lib\activity\valueObjectBridge.ts:972:       valueObjectCategoryLinkId: null,
757:.\lib\activity\valueObjectBridge.ts:973:       errorMessage: error?.message ?? "failed_to_upsert_value_object_category_link",
758:.\lib\activity\valueObjectBridge.ts:974:     };
759:.\lib\activity\valueObjectBridge.ts:975:   }
760:.\lib\activity\valueObjectBridge.ts:976: 
761:.\lib\activity\valueObjectBridge.ts:977:   return {
762:.\lib\activity\valueObjectBridge.ts:978:     valueObjectCategoryLinkId: (data as { id: string }).id,
763:.\lib\activity\valueObjectBridge.ts:979:     errorMessage: null,
764:.\lib\activity\valueObjectBridge.ts:980:   };
765:.\lib\activity\valueObjectBridge.ts:981: }
766:.\lib\activity\valueObjectBridge.ts:982: 
767:.\lib\activity\valueObjectBridge.ts:983: export async function processValueObjectBridgeForActivityEvent(
768:.\lib\activity\valueObjectBridge.ts:984:   input: ProcessValueObjectBridgeInput
769:.\lib\activity\valueObjectBridge.ts:985: ): Promise<ProcessValueObjectBridgeResult> {
770:.\lib\activity\valueObjectBridge.ts:986:   const {
771:.\lib\activity\valueObjectBridge.ts:987:     supabase,
772:.\lib\activity\valueObjectBridge.ts:988:     eventId,
773:.\lib\activity\valueObjectBridge.ts:989:     mappings,
774:.\lib\activity\valueObjectBridge.ts:990:     source,
775:.\lib\activity\valueObjectBridge.ts:991:     allowNonCompletedEvent = false,
776:.\lib\activity\valueObjectBridge.ts:992:     processorName = "value_object_bridge_p4_7",
777:.\lib\activity\valueObjectBridge.ts:993:   } = input;
778:.\lib\activity\valueObjectBridge.ts:994: 
779:.\lib\activity\valueObjectBridge.ts:995:   const result: ProcessValueObjectBridgeResult = {
780:.\lib\activity\valueObjectBridge.ts:996:     ok: false,
781:.\lib\activity\valueObjectBridge.ts:997:     skipped: false,
782:.\lib\activity\valueObjectBridge.ts:998:     skipReason: null,
783:.\lib\activity\valueObjectBridge.ts:999:     eventId,
784:.\lib\activity\valueObjectBridge.ts:1000:     eventStatus: null,
785:.\lib\activity\valueObjectBridge.ts:1001:     mappingsRequested: mappings.length,
786:.\lib\activity\valueObjectBridge.ts:1002:     created: [],
787:.\lib\activity\valueObjectBridge.ts:1003:     errors: [],
788:.\lib\activity\valueObjectBridge.ts:1004:   };
789:.\lib\activity\valueObjectBridge.ts:1005: 
790:.\lib\activity\valueObjectBridge.ts:1006:   if (mappings.length === 0) {
791:.\lib\activity\valueObjectBridge.ts:1007:     result.ok = true;
792:.\lib\activity\valueObjectBridge.ts:1008:     result.skipped = true;
793:.\lib\activity\valueObjectBridge.ts:1009:     result.skipReason = "no_mappings";
794:.\lib\activity\valueObjectBridge.ts:1010:     return result;
795:.\lib\activity\valueObjectBridge.ts:1011:   }
796:.\lib\activity\valueObjectBridge.ts:1012: 
797:.\lib\activity\valueObjectBridge.ts:1013:   const { event, errorMessage } = await readActivityEvent(supabase, eventId);
798:.\lib\activity\valueObjectBridge.ts:1014: 
799:.\lib\activity\valueObjectBridge.ts:1015:   if (errorMessage) {
800:.\lib\activity\valueObjectBridge.ts:1016:     result.errors.push(errorMessage);
801:.\lib\activity\valueObjectBridge.ts:1017:     return result;
802:.\lib\activity\valueObjectBridge.ts:1018:   }
803:.\lib\activity\valueObjectBridge.ts:1019: 
804:.\lib\activity\valueObjectBridge.ts:1020:   if (!event) {
805:.\lib\activity\valueObjectBridge.ts:1021:     result.errors.push("Activity event not found.");
806:.\lib\activity\valueObjectBridge.ts:1022:     return result;
807:.\lib\activity\valueObjectBridge.ts:1023:   }
808:.\lib\activity\valueObjectBridge.ts:1024: 
809:.\lib\activity\valueObjectBridge.ts:1025:   result.eventStatus = event.status;
810:.\lib\activity\valueObjectBridge.ts:1026: 
811:.\lib\activity\valueObjectBridge.ts:1027:   if (!allowNonCompletedEvent && event.status !== "completed") {
812:.\lib\activity\valueObjectBridge.ts:1028:     result.ok = true;
813:.\lib\activity\valueObjectBridge.ts:1029:     result.skipped = true;
814:.\lib\activity\valueObjectBridge.ts:1030:     result.skipReason = `event_status_${event.status}_not_completed`;
815:.\lib\activity\valueObjectBridge.ts:1031:     return result;
816:.\lib\activity\valueObjectBridge.ts:1032:   }
817:.\lib\activity\valueObjectBridge.ts:1033: 
818:.\lib\activity\valueObjectBridge.ts:1034:   for (const mapping of mappings) {
819:.\lib\activity\valueObjectBridge.ts:1035:     const mappingSource = normalizeSource(mapping.source ?? source);
820:.\lib\activity\valueObjectBridge.ts:1036:     const confidence = clamp01(mapping.confidence, 1);
821:.\lib\activity\valueObjectBridge.ts:1037:     const weight = clamp01(mapping.weight, 1);
822:.\lib\activity\valueObjectBridge.ts:1038:     const deltaDirection = normalizeDeltaDirection(mapping.deltaDirection);
823:.\lib\activity\valueObjectBridge.ts:1039:     const relationType = normalizeRelationType(mapping.relationType);
824:.\lib\activity\valueObjectBridge.ts:1040:     const aggregateDate = mapping.aggregateDate ?? getDateFromEvent(event);
825:.\lib\activity\valueObjectBridge.ts:1041:     const aggregateType = mapping.aggregateType ?? "value_object";
826:.\lib\activity\valueObjectBridge.ts:1042:     const aggregateKey = mapping.aggregateKey ?? mapping.valueObjectId;
827:.\lib\activity\valueObjectBridge.ts:1043:     const signedDelta = getSignedNumericDelta(
828:.\lib\activity\valueObjectBridge.ts:1044:       mapping.deltaValueNumeric ?? null,
829:.\lib\activity\valueObjectBridge.ts:1045:       deltaDirection
830:.\lib\activity\valueObjectBridge.ts:1046:     );
831:.\lib\activity\valueObjectBridge.ts:1047: 
832:.\lib\activity\valueObjectBridge.ts:1048:     const createdItem: ValueObjectBridgeCreatedItem = {
833:.\lib\activity\valueObjectBridge.ts:1049:       valueObjectId: mapping.valueObjectId,
834:.\lib\activity\valueObjectBridge.ts:1050:       valueObjectInstanceId: null,
835:.\lib\activity\valueObjectBridge.ts:1051:       linkId: null,
836:.\lib\activity\valueObjectBridge.ts:1052:       stateDeltaId: null,
837:.\lib\activity\valueObjectBridge.ts:1053:       aggregateId: null,
838:.\lib\activity\valueObjectBridge.ts:1054:       snapshotId: null,
839:.\lib\activity\valueObjectBridge.ts:1055:       activityEventValueObjectLinkId: null,
840:.\lib\activity\valueObjectBridge.ts:1056:       usageAggregateId: null,
841:.\lib\activity\valueObjectBridge.ts:1057:       v42ProjectionError: null,
842:.\lib\activity\valueObjectBridge.ts:1058:       valueObjectCategoryLinkId: null,
843:.\lib\activity\valueObjectBridge.ts:1059:       valueObjectCategoryLinkError: null,
844:.\lib\activity\valueObjectBridge.ts:1060:       skipped: false,
845:.\lib\activity\valueObjectBridge.ts:1061:       skipReason: null,
846:.\lib\activity\valueObjectBridge.ts:1062:     };
847:.\lib\activity\valueObjectBridge.ts:1063: 
848:.\lib\activity\valueObjectBridge.ts:1064:     if (
849:.\lib\activity\valueObjectBridge.ts:1065:       mapping.deltaValueNumeric === null &&
850:.\lib\activity\valueObjectBridge.ts:1066:       mapping.deltaValueText === null &&
851:.\lib\activity\valueObjectBridge.ts:1067:       typeof mapping.deltaValueNumeric !== "number" &&
852:.\lib\activity\valueObjectBridge.ts:1068:       typeof mapping.deltaValueText !== "string"
853:.\lib\activity\valueObjectBridge.ts:1069:     ) {
854:.\lib\activity\valueObjectBridge.ts:1070:       createdItem.skipped = true;
855:.\lib\activity\valueObjectBridge.ts:1071:       createdItem.skipReason = "missing_delta_value";
856:.\lib\activity\valueObjectBridge.ts:1072:       result.created.push(createdItem);
857:.\lib\activity\valueObjectBridge.ts:1073:       continue;
858:.\lib\activity\valueObjectBridge.ts:1074:     }
859:.\lib\activity\valueObjectBridge.ts:1075: 
860:.\lib\activity\valueObjectBridge.ts:1076:     const existingStateDelta = await readExistingStateDeltaForMapping(
861:.\lib\activity\valueObjectBridge.ts:1077:       supabase,
862:.\lib\activity\valueObjectBridge.ts:1078:       event.id,
863:.\lib\activity\valueObjectBridge.ts:1079:       mapping.valueObjectId,
864:.\lib\activity\valueObjectBridge.ts:1080:       mapping.metricKey
865:.\lib\activity\valueObjectBridge.ts:1081:     );
866:.\lib\activity\valueObjectBridge.ts:1082: 
867:.\lib\activity\valueObjectBridge.ts:1083:     if (existingStateDelta.errorMessage) {
868:.\lib\activity\valueObjectBridge.ts:1084:       createdItem.skipped = true;
869:.\lib\activity\valueObjectBridge.ts:1085:       createdItem.skipReason = existingStateDelta.errorMessage;
870:.\lib\activity\valueObjectBridge.ts:1086:       result.created.push(createdItem);
871:.\lib\activity\valueObjectBridge.ts:1087:       continue;
872:.\lib\activity\valueObjectBridge.ts:1088:     }
873:.\lib\activity\valueObjectBridge.ts:1089: 
874:.\lib\activity\valueObjectBridge.ts:1090:     if (existingStateDelta.stateDeltaId) {
875:.\lib\activity\valueObjectBridge.ts:1091:       createdItem.valueObjectInstanceId =
876:.\lib\activity\valueObjectBridge.ts:1092:         existingStateDelta.valueObjectInstanceId;
877:.\lib\activity\valueObjectBridge.ts:1093:       createdItem.stateDeltaId = existingStateDelta.stateDeltaId;
878:.\lib\activity\valueObjectBridge.ts:1094:       createdItem.skipped = true;
879:.\lib\activity\valueObjectBridge.ts:1095:       createdItem.skipReason = "already_processed_event_value_object_metric";
880:.\lib\activity\valueObjectBridge.ts:1096:       result.created.push(createdItem);
881:.\lib\activity\valueObjectBridge.ts:1097:       continue;
882:.\lib\activity\valueObjectBridge.ts:1098:     }
883:.\lib\activity\valueObjectBridge.ts:1099: 
884:.\lib\activity\valueObjectBridge.ts:1100:     const ownerContext = await readValueObjectOwnerContext(
885:.\lib\activity\valueObjectBridge.ts:1101:       supabase,
886:.\lib\activity\valueObjectBridge.ts:1102:       mapping.valueObjectId
887:.\lib\activity\valueObjectBridge.ts:1103:     );
888:.\lib\activity\valueObjectBridge.ts:1104: 
889:.\lib\activity\valueObjectBridge.ts:1105:     if (ownerContext.errorMessage) {
890:.\lib\activity\valueObjectBridge.ts:1106:       createdItem.skipped = true;
891:.\lib\activity\valueObjectBridge.ts:1107:       createdItem.skipReason = ownerContext.errorMessage;
892:.\lib\activity\valueObjectBridge.ts:1108:       result.created.push(createdItem);
893:.\lib\activity\valueObjectBridge.ts:1109:       continue;
894:.\lib\activity\valueObjectBridge.ts:1110:     }
895:.\lib\activity\valueObjectBridge.ts:1111: 
896:.\lib\activity\valueObjectBridge.ts:1112:     const { data: voiData, error: voiError } = await supabase
897:.\lib\activity\valueObjectBridge.ts:1113:       .from("value_object_instances")
898:.\lib\activity\valueObjectBridge.ts:1114:       .insert({
899:.\lib\activity\valueObjectBridge.ts:1115:         user_id: event.user_id,
900:.\lib\activity\valueObjectBridge.ts:1116:         value_object_id: mapping.valueObjectId,
901:.\lib\activity\valueObjectBridge.ts:1117:         source_event_id: event.id,
902:.\lib\activity\valueObjectBridge.ts:1118:         owner_actor_id:
903:.\lib\activity\valueObjectBridge.ts:1119:           ownerContext.ownerActorId ??
904:.\lib\activity\valueObjectBridge.ts:1120:           event.acting_as_actor_id ??
905:.\lib\activity\valueObjectBridge.ts:1121:           event.performed_by_actor_id ??
906:.\lib\activity\valueObjectBridge.ts:1122:           null,
907:.\lib\activity\valueObjectBridge.ts:1123:         organization_id: ownerContext.organizationId,
908:.\lib\activity\valueObjectBridge.ts:1124:         status: mapping.instanceStatus ?? "completed",
909:.\lib\activity\valueObjectBridge.ts:1125:         started_at: event.started_at,
910:.\lib\activity\valueObjectBridge.ts:1126:         ended_at: event.ended_at,
911:.\lib\activity\valueObjectBridge.ts:1127:         duration_minutes: event.duration_minutes,
912:.\lib\activity\valueObjectBridge.ts:1128:         instance_title: mapping.instanceTitle ?? event.title,
913:.\lib\activity\valueObjectBridge.ts:1129:         instance_note: mapping.instanceNote ?? event.description,
914:.\lib\activity\valueObjectBridge.ts:1130:         result_status: mapping.resultStatus ?? null,
915:.\lib\activity\valueObjectBridge.ts:1131:         quality_score: mapping.qualityScore ?? null,
916:.\lib\activity\valueObjectBridge.ts:1132:         confidence,
917:.\lib\activity\valueObjectBridge.ts:1133:         source: mappingSource,
918:.\lib\activity\valueObjectBridge.ts:1134:         metadata_json: {
919:.\lib\activity\valueObjectBridge.ts:1135:           processorName,
920:.\lib\activity\valueObjectBridge.ts:1136:           eventId: event.id,
921:.\lib\activity\valueObjectBridge.ts:1137:           mappingMetadata: mapping.metadata ?? {},
922:.\lib\activity\valueObjectBridge.ts:1138:         },
923:.\lib\activity\valueObjectBridge.ts:1139:       })
924:.\lib\activity\valueObjectBridge.ts:1140:       .select("id")
925:.\lib\activity\valueObjectBridge.ts:1141:       .single();
926:.\lib\activity\valueObjectBridge.ts:1142: 
927:.\lib\activity\valueObjectBridge.ts:1143:     if (voiError || !voiData) {
928:.\lib\activity\valueObjectBridge.ts:1144:       createdItem.skipped = true;
929:.\lib\activity\valueObjectBridge.ts:1145:       createdItem.skipReason = voiError?.message ?? "failed_to_create_voi";
930:.\lib\activity\valueObjectBridge.ts:1146:       result.created.push(createdItem);
931:.\lib\activity\valueObjectBridge.ts:1147:       continue;
932:.\lib\activity\valueObjectBridge.ts:1148:     }
933:.\lib\activity\valueObjectBridge.ts:1149: 
934:.\lib\activity\valueObjectBridge.ts:1150:     const valueObjectInstanceId = (voiData as { id: string }).id;
935:.\lib\activity\valueObjectBridge.ts:1151:     createdItem.valueObjectInstanceId = valueObjectInstanceId;
936:.\lib\activity\valueObjectBridge.ts:1152: 
937:.\lib\activity\valueObjectBridge.ts:1153:     const { data: linkData, error: linkError } = await supabase
938:.\lib\activity\valueObjectBridge.ts:1154:       .from("activity_event_value_object_instance_links")
939:.\lib\activity\valueObjectBridge.ts:1155:       .insert({
940:.\lib\activity\valueObjectBridge.ts:1156:         user_id: event.user_id,
941:.\lib\activity\valueObjectBridge.ts:1157:         event_id: event.id,
942:.\lib\activity\valueObjectBridge.ts:1158:         value_object_instance_id: valueObjectInstanceId,
943:.\lib\activity\valueObjectBridge.ts:1159:         relation_type: relationType,
944:.\lib\activity\valueObjectBridge.ts:1160:         weight,
945:.\lib\activity\valueObjectBridge.ts:1161:         confidence,
946:.\lib\activity\valueObjectBridge.ts:1162:         source: mappingSource,
947:.\lib\activity\valueObjectBridge.ts:1163:         metadata_json: {
948:.\lib\activity\valueObjectBridge.ts:1164:           processorName,
949:.\lib\activity\valueObjectBridge.ts:1165:           valueObjectId: mapping.valueObjectId,
950:.\lib\activity\valueObjectBridge.ts:1166:         },
951:.\lib\activity\valueObjectBridge.ts:1167:       })
952:.\lib\activity\valueObjectBridge.ts:1168:       .select("id")
953:.\lib\activity\valueObjectBridge.ts:1169:       .single();
954:.\lib\activity\valueObjectBridge.ts:1170: 
955:.\lib\activity\valueObjectBridge.ts:1171:     if (linkError) {
956:.\lib\activity\valueObjectBridge.ts:1172:       result.errors.push(linkError.message);
957:.\lib\activity\valueObjectBridge.ts:1173:     } else if (linkData) {

## Field: contextualCategoryId

```text
docs/sql/P4.9.3-A2_knee_template_runtime_verification.sql
63:    l.metadata_json #>> '{mappingMetadata,classification,contextualCategoryId}' AS contextual_category_id_text,

docs/value-objects/P4.10.0-A2_repo_category_rubricator_reference_inventory.txt
589:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:63: l.metadata_json #>> '{mappingMetadata,classification,contextualCategoryId}' AS contextual_category_id_text,
786:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:83: | lib/activity/activityRubricatorClassificationLifecycle.ts | 301 | .eq("contextual_category_id", input.contextualCategoryId) |
792:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:89: | lib/activity/activityRubricatorClassificationLifecycle.ts | 555 | contextual_category_id: contextualCategoryId, |
823:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:120: | lib/activity/rubricatorValueObjectMapper.ts | 387 | const contextualCategoryId = getString(row, "contextual_category_id"); |
824:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:121: | lib/activity/rubricatorValueObjectMapper.ts | 394 | readLookupRow(supabase, "contextual_categories", contextualCategoryId), |
827:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:124: | lib/objectAction/queries.ts | 197 | contextualCategoryId: row.contextual_category_id, |
986:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:690: | lib/objectAction/queries.ts | 557 | const contextualCategoryIds = Array.from( |

## Field path: metadata.classification

```text
docs/value-objects/P4.10.0-A2_repo_category_rubricator_reference_inventory.txt
2254:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:49: The first implementation should use mapping.metadata.classification.contextualCategoryId inside lib/activity/valueObjectBridge.ts.
2259:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:38: - mapping.metadata.classification.contextualCategoryId

## References: classification

```text
docs/activity/P4.7.8-R_cross_route_verification.md
29:processing logs: create_event, link_event, process_impacts, rubricator_classification, value_object_bridge  
39:processing logs: ingest, complete_event, process_impacts, rubricator_classification, value_object_bridge  
49:processing logs: rubricator_classification, value_object_bridge  
90:3. Add documentation for known-template classification rules.
165:- classificationCount: 1
189:- Separate known-template rubricator classification rules from lifecycle logic.
190:- Keep activityRubricatorClassificationLifecycle focused on safe entity_classification creation.
209:Rubricator classification result:
214:- classificationStatus: approved
216:- classificationId: 8f11dc4e-f2e5-4135-9228-e0f8979cf3fb

## References: categoryCandidates

```text
docs/p4-7-rubricator-inventory-raw.md
585:- .\src\app\api\directory\organizations\route.ts:868 - objectActionCategoryMatchesFilter(classification, categoryCandidates)

docs/value-objects/P4.10.0-A2_repo_category_rubricator_reference_inventory.txt
3060:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:585: - .\src\app\api\directory\organizations\route.ts:868 - objectActionCategoryMatchesFilter(classification, categoryCandidates)
4536:C:\Users\Admin\Documents\projects\gpt-app\src\app\api\directory\organizations\route.ts:818: categoryCandidates: Set<string>
4541:C:\Users\Admin\Documents\projects\gpt-app\src\app\api\directory\organizations\route.ts:828: return comparableValues.some((value) => categoryCandidates.has(value));

## Fallback flag: allowControlledTextFallback

```text
docs/value-object-state-foundation-p4-7.md
175:  "allowControlledTextFallback": true
200:Real endpoint call was executed with `dryRun: false`, `createMissingControlledValueObject: true`, `allowControlledTextFallback: true`.

## Fallback flag: createMissingControlledValueObject

```text
docs/value-object-state-foundation-p4-7.md

## Preliminary findings to resolve in C8-F

The next implementation step must answer these questions from the inventory above:

1. Does contextual_categories already have semantic_layer, category_type, liases, status, source_type?
2. Do category_derivation_runs or similar tables already exist?
3. Do ctivity_category_derivations or similar tables already exist?
4. Does ValueObjectBridgeMapping already allow passing multiple category candidates?
5. Does the bridge currently support only one contextualCategoryId or multiple category links?
6. Where exactly should categoryCandidates[] be attached: mapper result metadata, mapping object, or separate processor output?
7. Where should resolver be placed: before mapper, inside mapper, or between mapper and bridge?
8. Which existing migrations already touch category links and must not be duplicated?
9. Which existing debug route should be used for regression after implementation?
10. Which schema additions can be purely additive and safe?

## C8-E conclusion placeholder

This is an inventory-only checkpoint. Runtime implementation starts in C8-F after reviewing this document.
