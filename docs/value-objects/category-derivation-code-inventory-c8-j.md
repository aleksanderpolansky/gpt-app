# P4.10.0-C8-J — Category Derivation Code Inventory

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: exact code inventory before Category Derivation runtime implementation
Previous checkpoint: 1598cc1 Plan category derivation extractor implementation

This is an inventory-only checkpoint.

No runtime code is changed in this step.

Goal: identify exact mapper, bridge, debug route and Supabase helper surfaces before adding Category Derivation types, rule extractor, resolver and persistence.

## Git status before inventory

```text
?? docs/value-objects/category-derivation-code-inventory-c8-j.md
```

## Recent commits

```text
1598cc1 Plan category derivation extractor implementation
9c3411e Document category derivation runtime regression
d7d09e4 Document corrected category derivation safety check failure
4876269 Document category derivation repo safety check
3c3ae22 Document category derivation live migration verification
317f9db Add category derivation schema verification SQL
2f216d2 Draft category derivation additive schema SQL
8b1271a Plan category derivation additive schema
e7a9c44 Inventory category derivation implementation surface
c79ce3d Document category derivation layer design
c8e004d Document free-text value object runtime verification
4fbb9af Add debug free-text value object test route
c0b5386 Enable controlled free-text value object fallback
c46c9d2 Inspect controlled free-text value object fallback
b1601b5 Inspect free-text value object contracts
```

## Primary target files

- FOUND: lib/activity/rubricatorValueObjectMapper.ts (865 lines)
- FOUND: lib/activity/valueObjectBridge.ts (1394 lines)
- FOUND: src/app/api/activity/debug/free-text-value-object-test/route.ts (351 lines)
- FOUND: lib/supabase.ts (14 lines)
- MISSING: lib/supabase/server.ts
- MISSING: lib/supabase/client.ts
- MISSING: lib/supabase/admin.ts
- MISSING: src/lib/supabase.ts
- MISSING: src/lib/supabase/server.ts
- MISSING: src/lib/supabase/client.ts
- MISSING: src/lib/supabase/admin.ts

## Relevant tracked files by name

```text
docs/p4-7-rubricator-inventory-raw.md
docs/p4-7-rubricator-mapping-decision.md
docs/sql/P4.10.0-C8-G2_verify_category_derivation_schema.sql
docs/sql/P4.10.0-C8-G_additive_category_derivation_schema.sql
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
docs/value-objects/category-derivation-implementation-plan-c8-i.md
docs/value-objects/category-derivation-inventory-c8-e.md
docs/value-objects/category-derivation-layer-v1.md
docs/value-objects/category-derivation-live-migration-result-c8-g3.md
docs/value-objects/category-derivation-repo-safety-c8-h1-1-corrected.txt
docs/value-objects/category-derivation-repo-safety-c8-h1-2-conclusion.md
docs/value-objects/category-derivation-repo-safety-c8-h1.txt
docs/value-objects/category-derivation-runtime-regression-c8-h2.md
docs/value-objects/category-derivation-schema-plan-c8-f.md
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

## Snippets: lib/activity/rubricatorValueObjectMapper.ts

```text

----- match pattern: ValueObjectBridgeMapping | lines 1-9 -----
    1: import type { SupabaseClient } from "@supabase/supabase-js";
    2: 
    3: import type { ValueObjectBridgeMapping } from "./valueObjectBridge";
    4: 
    5: type GenericRow = Record<string, unknown>;
    6: 
    7: type ActivityEventForRubricatorMapping = {
    8:   id: string;
    9:   user_id: string;

----- match pattern: classification | lines 20-32 -----
   20:   template_id: string | null;
   21:   performed_by_actor_id: string | null;
   22:   acting_as_actor_id: string | null;
   23:   acting_for_actor_id: string | null;
   24: };
   25: 
   26: export type RubricatorClassificationSummary = {
   27:   classificationId: string;
   28:   entityType: string | null;
   29:   entityId: string | null;
   30:   objectTypeId: string | null;
   31:   objectTypeCode: string | null;
   32:   objectTypeName: string | null;

----- match pattern: classification | lines 21-33 -----
   21:   performed_by_actor_id: string | null;
   22:   acting_as_actor_id: string | null;
   23:   acting_for_actor_id: string | null;
   24: };
   25: 
   26: export type RubricatorClassificationSummary = {
   27:   classificationId: string;
   28:   entityType: string | null;
   29:   entityId: string | null;
   30:   objectTypeId: string | null;
   31:   objectTypeCode: string | null;
   32:   objectTypeName: string | null;
   33:   actionTypeId: string | null;

----- match pattern: contextualCategoryId | lines 33-45 -----
   33:   actionTypeId: string | null;
   34:   actionTypeCode: string | null;
   35:   actionTypeName: string | null;
   36:   contextId: string | null;
   37:   contextCode: string | null;
   38:   contextName: string | null;
   39:   contextualCategoryId: string | null;
   40:   contextualCategorySlug: string | null;
   41:   contextualCategoryName: string | null;
   42:   classificationRole: string | null;
   43:   isPrimary: boolean;
   44:   confidence: number | null;
   45:   status: string | null;

----- match pattern: classification | lines 36-48 -----
   36:   contextId: string | null;
   37:   contextCode: string | null;
   38:   contextName: string | null;
   39:   contextualCategoryId: string | null;
   40:   contextualCategorySlug: string | null;
   41:   contextualCategoryName: string | null;
   42:   classificationRole: string | null;
   43:   isPrimary: boolean;
   44:   confidence: number | null;
   45:   status: string | null;
   46:   sourceType: string | null;
   47:   evidence: Record<string, unknown>;
   48: };

----- match pattern: RubricatorValueObjectMappingResult | lines 52-64 -----
   52:   eventId: string;
   53:   allowNonCompletedEvent?: boolean;
   54:   createMissingControlledValueObject?: boolean;
   55:   allowControlledTextFallback?: boolean;
   56: };
   57: 
   58: export type RubricatorValueObjectMappingResult = {
   59:   ok: boolean;
   60:   skipped: boolean;
   61:   skipReason: string | null;
   62:   eventId: string;
   63:   eventStatus: string | null;
   64:   classificationSummary: RubricatorClassificationSummary[];

----- match pattern: classification | lines 58-70 -----
   58: export type RubricatorValueObjectMappingResult = {
   59:   ok: boolean;
   60:   skipped: boolean;
   61:   skipReason: string | null;
   62:   eventId: string;
   63:   eventStatus: string | null;
   64:   classificationSummary: RubricatorClassificationSummary[];
   65:   mappings: ValueObjectBridgeMapping[];
   66:   errors: string[];
   67: };
   68: 
   69: type ControlledRubricatorValueObjectRule = {
   70:   ruleKey: string;

----- match pattern: ValueObjectBridgeMapping | lines 59-71 -----
   59:   ok: boolean;
   60:   skipped: boolean;
   61:   skipReason: string | null;
   62:   eventId: string;
   63:   eventStatus: string | null;
   64:   classificationSummary: RubricatorClassificationSummary[];
   65:   mappings: ValueObjectBridgeMapping[];
   66:   errors: string[];
   67: };
   68: 
   69: type ControlledRubricatorValueObjectRule = {
   70:   ruleKey: string;
   71:   valueObjectTitle: string;

----- match pattern: ValueObjectBridgeMapping | lines 74-86 -----
   74:   valueObjectUnitType: string;
   75:   defaultDurationMinutes: number | null;
   76:   objectTypeCode: string;
   77:   actionTypeCode: string;
   78:   contextCode: string;
   79:   contextualCategorySlug: string;
   80:   relationType: ValueObjectBridgeMapping["relationType"];
   81:   metricKey: string;
   82:   metricUnit: string;
   83:   deltaDirection: ValueObjectBridgeMapping["deltaDirection"];
   84:   aggregateType: string;
   85:   fallbackNeedleGroups: string[][];
   86: };

----- match pattern: ValueObjectBridgeMapping | lines 77-89 -----
   77:   actionTypeCode: string;
   78:   contextCode: string;
   79:   contextualCategorySlug: string;
   80:   relationType: ValueObjectBridgeMapping["relationType"];
   81:   metricKey: string;
   82:   metricUnit: string;
   83:   deltaDirection: ValueObjectBridgeMapping["deltaDirection"];
   84:   aggregateType: string;
   85:   fallbackNeedleGroups: string[][];
   86: };
   87: 
   88: const CONTROLLED_RUBRICATOR_VALUE_OBJECT_RULES: readonly ControlledRubricatorValueObjectRule[] = [
   89:   {

----- match pattern: aggregateType | lines 78-90 -----
   78:   contextCode: string;
   79:   contextualCategorySlug: string;
   80:   relationType: ValueObjectBridgeMapping["relationType"];
   81:   metricKey: string;
   82:   metricUnit: string;
   83:   deltaDirection: ValueObjectBridgeMapping["deltaDirection"];
   84:   aggregateType: string;
   85:   fallbackNeedleGroups: string[][];
   86: };
   87: 
   88: const CONTROLLED_RUBRICATOR_VALUE_OBJECT_RULES: readonly ControlledRubricatorValueObjectRule[] = [
   89:   {
   90:     ruleKey: "german_business_writing_practice_duration",

----- match pattern: aggregateType | lines 99-111 -----
   99:     contextCode: "learning",
  100:     contextualCategorySlug: "business-german",
  101:     relationType: "executes",
  102:     metricKey: "duration_minutes",
  103:     metricUnit: "minutes",
  104:     deltaDirection: "increase",
  105:     aggregateType: "value_object",
  106:     fallbackNeedleGroups: [
  107:       ["german", "deutsch", "Ð½ÐµÐ¼ÐµÑ†", "niemieck", "alemÃ¡n"],
  108:       [
  109:         "practice",
  110:         "practise",
  111:         "learn",

----- match pattern: aggregateType | lines 148-160 -----
  148:     contextCode: "health",
  149:     contextualCategorySlug: "knee-exercises",
  150:     relationType: "executes",
  151:     metricKey: "duration_minutes",
  152:     metricUnit: "minutes",
  153:     deltaDirection: "increase",
  154:     aggregateType: "value_object",
  155:     fallbackNeedleGroups: [
  156:       ["knee", "ÐºÐ¾Ð»ÐµÐ½Ð¾", "kolano", "rodilla", "knie"],
  157:       [
  158:         "train",
  159:         "training",
  160:         "exercise",

----- match pattern: walking_to_work_duration | lines 168-180 -----
  168:         "training",
  169:       ],
  170:       ["health", "body", "rehab", "recovery", "load", "Ð·Ð´Ð¾Ñ€Ð¾Ð²", "salud", "gesundheit"],
  171:     ],
  172:   },
  173:   {
  174:     ruleKey: "walking_to_work_duration",
  175:     valueObjectTitle: "Walking to work",
  176:     valueObjectType: "health_activity",
  177:     valueObjectDescription:
  178:       "Controlled P4.10.0-C6 free-text value object for walking to work / commuting on foot. No medical diagnosis or treatment claim.",
  179:     valueObjectUnitType: "minutes",
  180:     defaultDurationMinutes: 15,

----- match pattern: aggregateType | lines 183-195 -----
  183:     contextCode: "commute",
  184:     contextualCategorySlug: "walking-to-work",
  185:     relationType: "executes",
  186:     metricKey: "duration_minutes",
  187:     metricUnit: "minutes",
  188:     deltaDirection: "increase",
  189:     aggregateType: "value_object",
  190:     fallbackNeedleGroups: [
  191:       [
  192:         "walk",
  193:         "walking",
  194:         "walked",
  195:         "foot",

----- match pattern: classification | lines 307-319 -----
  307: }
  308: 
  309: function includesAny(text: string, needles: string[]): boolean {
  310:   return needles.some((needle) => text.includes(needle.toLowerCase()));
  311: }
  312: 
  313: function isApprovedActivityEventClassification(row: GenericRow): boolean {
  314:   const entityType = getString(row, "entity_type");
  315:   const status = getString(row, "status");
  316: 
  317:   return (
  318:     (entityType === "activity_event" || entityType === "activity_events") &&
  319:     status === "approved"

----- match pattern: classification | lines 362-374 -----
  362:   return {
  363:     event: (data as ActivityEventForRubricatorMapping | null) ?? null,
  364:     errorMessage: null,
  365:   };
  366: }
  367: 
  368: async function readEntityClassifications(
  369:   supabase: SupabaseClient,
  370:   eventId: string
  371: ): Promise<{
  372:   rows: GenericRow[];
  373:   errorMessage: string | null;
  374: }> {

----- match pattern: classification | lines 370-382 -----
  370:   eventId: string
  371: ): Promise<{
  372:   rows: GenericRow[];
  373:   errorMessage: string | null;
  374: }> {
  375:   const { data, error } = await supabase
  376:     .from("entity_classifications")
  377:     .select("*")
  378:     .eq("entity_id", eventId)
  379:     .order("is_primary", { ascending: false })
  380:     .order("created_at", { ascending: false })
  381:     .limit(20);
  382: 

----- match pattern: classification | lines 385-397 -----
  385:       rows: [],
  386:       errorMessage: error.message,
  387:     };
  388:   }
  389: 
  390:   const rows = ((data as GenericRow[] | null) ?? []).filter(
  391:     isApprovedActivityEventClassification
  392:   );
  393: 
  394:   return {
  395:     rows,
  396:     errorMessage: null,
  397:   };

----- match pattern: classification | lines 420-432 -----
  420:     return null;
  421:   }
  422: 
  423:   return data as GenericRow;
  424: }
  425: 
  426: async function summarizeClassification(
  427:   supabase: SupabaseClient,
  428:   row: GenericRow
  429: ): Promise<RubricatorClassificationSummary> {
  430:   const objectTypeId = getString(row, "object_type_id");
  431:   const actionTypeId = getString(row, "action_type_id");
  432:   const contextId = getString(row, "context_id");

----- match pattern: classification | lines 423-435 -----
  423:   return data as GenericRow;
  424: }
  425: 
  426: async function summarizeClassification(
  427:   supabase: SupabaseClient,
  428:   row: GenericRow
  429: ): Promise<RubricatorClassificationSummary> {
  430:   const objectTypeId = getString(row, "object_type_id");
  431:   const actionTypeId = getString(row, "action_type_id");
  432:   const contextId = getString(row, "context_id");
  433:   const contextualCategoryId = getString(row, "contextual_category_id");
  434: 
  435:   const [objectType, actionType, context, contextualCategory] =

----- match pattern: contextualCategoryId | lines 427-439 -----
  427:   supabase: SupabaseClient,
  428:   row: GenericRow
  429: ): Promise<RubricatorClassificationSummary> {
  430:   const objectTypeId = getString(row, "object_type_id");
  431:   const actionTypeId = getString(row, "action_type_id");
  432:   const contextId = getString(row, "context_id");
  433:   const contextualCategoryId = getString(row, "contextual_category_id");
  434: 
  435:   const [objectType, actionType, context, contextualCategory] =
  436:     await Promise.all([
  437:       readLookupRow(supabase, "object_types", objectTypeId),
  438:       readLookupRow(supabase, "action_types", actionTypeId),
  439:       readLookupRow(supabase, "contexts", contextId),

----- match pattern: contextualCategoryId | lines 434-446 -----
  434: 
  435:   const [objectType, actionType, context, contextualCategory] =
  436:     await Promise.all([
  437:       readLookupRow(supabase, "object_types", objectTypeId),
  438:       readLookupRow(supabase, "action_types", actionTypeId),
  439:       readLookupRow(supabase, "contexts", contextId),
  440:       readLookupRow(supabase, "contextual_categories", contextualCategoryId),
  441:     ]);
  442: 
  443:   return {
  444:     classificationId: getString(row, "id") ?? "",
  445:     entityType: getString(row, "entity_type"),
  446:     entityId: getString(row, "entity_id"),

----- match pattern: classification | lines 438-450 -----
  438:       readLookupRow(supabase, "action_types", actionTypeId),
  439:       readLookupRow(supabase, "contexts", contextId),
  440:       readLookupRow(supabase, "contextual_categories", contextualCategoryId),
  441:     ]);
  442: 
  443:   return {
  444:     classificationId: getString(row, "id") ?? "",
  445:     entityType: getString(row, "entity_type"),
  446:     entityId: getString(row, "entity_id"),
  447:     objectTypeId,
  448:     objectTypeCode: getString(objectType, "code"),
  449:     objectTypeName: getString(objectType, "name"),
  450:     actionTypeId,

----- match pattern: contextualCategoryId | lines 450-462 -----
  450:     actionTypeId,
  451:     actionTypeCode: getString(actionType, "code"),
  452:     actionTypeName: getString(actionType, "name"),
  453:     contextId,
  454:     contextCode: getString(context, "code"),
  455:     contextName: getString(context, "name"),
  456:     contextualCategoryId,
  457:     contextualCategorySlug: getString(contextualCategory, "slug"),
  458:     contextualCategoryName: getString(contextualCategory, "name"),
  459:     classificationRole: getString(row, "classification_role"),
  460:     isPrimary: getBoolean(row, "is_primary"),
  461:     confidence: getNumber(row, "confidence"),
  462:     status: getString(row, "status"),

----- match pattern: classification | lines 453-465 -----
  453:     contextId,
  454:     contextCode: getString(context, "code"),
  455:     contextName: getString(context, "name"),
  456:     contextualCategoryId,
  457:     contextualCategorySlug: getString(contextualCategory, "slug"),
  458:     contextualCategoryName: getString(contextualCategory, "name"),
  459:     classificationRole: getString(row, "classification_role"),
  460:     isPrimary: getBoolean(row, "is_primary"),
  461:     confidence: getNumber(row, "confidence"),
  462:     status: getString(row, "status"),
  463:     sourceType: getString(row, "source_type"),
  464:     evidence: getObject(row, "evidence_json"),
  465:   };

----- match pattern: classification | lines 462-474 -----
  462:     status: getString(row, "status"),
  463:     sourceType: getString(row, "source_type"),
  464:     evidence: getObject(row, "evidence_json"),
  465:   };
  466: }
  467: 
  468: function classificationMatchesRule(
  469:   classification: RubricatorClassificationSummary,
  470:   rule: ControlledRubricatorValueObjectRule
  471: ): boolean {
  472:   return (
  473:     normalizeKey(classification.objectTypeCode) === normalizeKey(rule.objectTypeCode) &&
  474:     normalizeKey(classification.actionTypeCode) === normalizeKey(rule.actionTypeCode) &&

----- match pattern: classification | lines 463-475 -----
  463:     sourceType: getString(row, "source_type"),
  464:     evidence: getObject(row, "evidence_json"),
  465:   };
  466: }
  467: 
  468: function classificationMatchesRule(
  469:   classification: RubricatorClassificationSummary,
  470:   rule: ControlledRubricatorValueObjectRule
  471: ): boolean {
  472:   return (
  473:     normalizeKey(classification.objectTypeCode) === normalizeKey(rule.objectTypeCode) &&
  474:     normalizeKey(classification.actionTypeCode) === normalizeKey(rule.actionTypeCode) &&
  475:     normalizeKey(classification.contextCode) === normalizeKey(rule.contextCode) &&

----- match pattern: classification | lines 467-479 -----
  467: 
  468: function classificationMatchesRule(
  469:   classification: RubricatorClassificationSummary,
  470:   rule: ControlledRubricatorValueObjectRule
  471: ): boolean {
  472:   return (
  473:     normalizeKey(classification.objectTypeCode) === normalizeKey(rule.objectTypeCode) &&
  474:     normalizeKey(classification.actionTypeCode) === normalizeKey(rule.actionTypeCode) &&
  475:     normalizeKey(classification.contextCode) === normalizeKey(rule.contextCode) &&
  476:     normalizeKey(classification.contextualCategorySlug) ===
  477:       normalizeKey(rule.contextualCategorySlug)
  478:   );
  479: }

----- match pattern: classification | lines 468-480 -----
  468: function classificationMatchesRule(
  469:   classification: RubricatorClassificationSummary,
  470:   rule: ControlledRubricatorValueObjectRule
  471: ): boolean {
  472:   return (
  473:     normalizeKey(classification.objectTypeCode) === normalizeKey(rule.objectTypeCode) &&
  474:     normalizeKey(classification.actionTypeCode) === normalizeKey(rule.actionTypeCode) &&
  475:     normalizeKey(classification.contextCode) === normalizeKey(rule.contextCode) &&
  476:     normalizeKey(classification.contextualCategorySlug) ===
  477:       normalizeKey(rule.contextualCategorySlug)
  478:   );
  479: }
  480: 

----- match pattern: classification | lines 469-481 -----
  469:   classification: RubricatorClassificationSummary,
  470:   rule: ControlledRubricatorValueObjectRule
  471: ): boolean {
  472:   return (
  473:     normalizeKey(classification.objectTypeCode) === normalizeKey(rule.objectTypeCode) &&
  474:     normalizeKey(classification.actionTypeCode) === normalizeKey(rule.actionTypeCode) &&
  475:     normalizeKey(classification.contextCode) === normalizeKey(rule.contextCode) &&
  476:     normalizeKey(classification.contextualCategorySlug) ===
  477:       normalizeKey(rule.contextualCategorySlug)
  478:   );
  479: }
  480: 
  481: function classificationSearchText(

----- match pattern: classification | lines 470-482 -----
  470:   rule: ControlledRubricatorValueObjectRule
  471: ): boolean {
  472:   return (
  473:     normalizeKey(classification.objectTypeCode) === normalizeKey(rule.objectTypeCode) &&
  474:     normalizeKey(classification.actionTypeCode) === normalizeKey(rule.actionTypeCode) &&
  475:     normalizeKey(classification.contextCode) === normalizeKey(rule.contextCode) &&
  476:     normalizeKey(classification.contextualCategorySlug) ===
  477:       normalizeKey(rule.contextualCategorySlug)
  478:   );
  479: }
  480: 
  481: function classificationSearchText(
  482:   classification: RubricatorClassificationSummary | null

----- match pattern: classification | lines 475-487 -----
  475:     normalizeKey(classification.contextCode) === normalizeKey(rule.contextCode) &&
  476:     normalizeKey(classification.contextualCategorySlug) ===
  477:       normalizeKey(rule.contextualCategorySlug)
  478:   );
  479: }
  480: 
  481: function classificationSearchText(
  482:   classification: RubricatorClassificationSummary | null
  483: ): string {
  484:   if (!classification) {
  485:     return "";
  486:   }
  487: 

----- match pattern: classification | lines 476-488 -----
  476:     normalizeKey(classification.contextualCategorySlug) ===
  477:       normalizeKey(rule.contextualCategorySlug)
  478:   );
  479: }
  480: 
  481: function classificationSearchText(
  482:   classification: RubricatorClassificationSummary | null
  483: ): string {
  484:   if (!classification) {
  485:     return "";
  486:   }
  487: 
  488:   return joinSearchText([

----- match pattern: classification | lines 478-490 -----
  478:   );
  479: }
  480: 
  481: function classificationSearchText(
  482:   classification: RubricatorClassificationSummary | null
  483: ): string {
  484:   if (!classification) {
  485:     return "";
  486:   }
  487: 
  488:   return joinSearchText([
  489:     classification.objectTypeCode,
  490:     classification.objectTypeName,

----- match pattern: classification | lines 483-495 -----
  483: ): string {
  484:   if (!classification) {
  485:     return "";
  486:   }
  487: 
  488:   return joinSearchText([
  489:     classification.objectTypeCode,
  490:     classification.objectTypeName,
  491:     classification.actionTypeCode,
  492:     classification.actionTypeName,
  493:     classification.contextCode,
  494:     classification.contextName,
  495:     classification.contextualCategorySlug,

----- match pattern: classification | lines 484-496 -----
  484:   if (!classification) {
  485:     return "";
  486:   }
  487: 
  488:   return joinSearchText([
  489:     classification.objectTypeCode,
  490:     classification.objectTypeName,
  491:     classification.actionTypeCode,
  492:     classification.actionTypeName,
  493:     classification.contextCode,
  494:     classification.contextName,
  495:     classification.contextualCategorySlug,
  496:     classification.contextualCategoryName,

----- match pattern: classification | lines 485-497 -----
  485:     return "";
  486:   }
  487: 
  488:   return joinSearchText([
  489:     classification.objectTypeCode,
  490:     classification.objectTypeName,
  491:     classification.actionTypeCode,
  492:     classification.actionTypeName,
  493:     classification.contextCode,
  494:     classification.contextName,
  495:     classification.contextualCategorySlug,
  496:     classification.contextualCategoryName,
  497:   ]);

----- match pattern: classification | lines 486-498 -----
  486:   }
  487: 
  488:   return joinSearchText([
  489:     classification.objectTypeCode,
  490:     classification.objectTypeName,
  491:     classification.actionTypeCode,
  492:     classification.actionTypeName,
  493:     classification.contextCode,
  494:     classification.contextName,
  495:     classification.contextualCategorySlug,
  496:     classification.contextualCategoryName,
  497:   ]);
  498: }

----- match pattern: classification | lines 487-499 -----
  487: 
  488:   return joinSearchText([
  489:     classification.objectTypeCode,
  490:     classification.objectTypeName,
  491:     classification.actionTypeCode,
  492:     classification.actionTypeName,
  493:     classification.contextCode,
  494:     classification.contextName,
  495:     classification.contextualCategorySlug,
  496:     classification.contextualCategoryName,
  497:   ]);
  498: }
  499: 

----- match pattern: classification | lines 488-500 -----
  488:   return joinSearchText([
  489:     classification.objectTypeCode,
  490:     classification.objectTypeName,
  491:     classification.actionTypeCode,
  492:     classification.actionTypeName,
  493:     classification.contextCode,
  494:     classification.contextName,
  495:     classification.contextualCategorySlug,
  496:     classification.contextualCategoryName,
  497:   ]);
  498: }
  499: 
  500: function eventSearchText(event: ActivityEventForRubricatorMapping): string {

----- match pattern: classification | lines 489-501 -----
  489:     classification.objectTypeCode,
  490:     classification.objectTypeName,
  491:     classification.actionTypeCode,
  492:     classification.actionTypeName,
  493:     classification.contextCode,
  494:     classification.contextName,
  495:     classification.contextualCategorySlug,
  496:     classification.contextualCategoryName,
  497:   ]);
  498: }
  499: 
  500: function eventSearchText(event: ActivityEventForRubricatorMapping): string {
  501:   return joinSearchText([

----- match pattern: classification | lines 490-502 -----
  490:     classification.objectTypeName,
  491:     classification.actionTypeCode,
  492:     classification.actionTypeName,
  493:     classification.contextCode,
  494:     classification.contextName,
  495:     classification.contextualCategorySlug,
  496:     classification.contextualCategoryName,
  497:   ]);
  498: }
  499: 
  500: function eventSearchText(event: ActivityEventForRubricatorMapping): string {
  501:   return joinSearchText([
  502:     event.title,

----- match pattern: classification | lines 503-515 -----
  503:     event.description,
  504:     event.input_text,
  505:     event.event_code,
  506:   ]);
  507: }
  508: 
  509: function eventOrClassificationMatchesFallbackRule(
  510:   event: ActivityEventForRubricatorMapping,
  511:   classification: RubricatorClassificationSummary | null,
  512:   rule: ControlledRubricatorValueObjectRule,
  513:   allowTextFallback: boolean
  514: ): boolean {
  515:   const haystack = joinSearchText([

----- match pattern: classification | lines 505-517 -----
  505:     event.event_code,
  506:   ]);
  507: }
  508: 
  509: function eventOrClassificationMatchesFallbackRule(
  510:   event: ActivityEventForRubricatorMapping,
  511:   classification: RubricatorClassificationSummary | null,
  512:   rule: ControlledRubricatorValueObjectRule,
  513:   allowTextFallback: boolean
  514: ): boolean {
  515:   const haystack = joinSearchText([
  516:     classificationSearchText(classification),
  517:     allowTextFallback ? eventSearchText(event) : "",

----- match pattern: classification | lines 510-522 -----
  510:   event: ActivityEventForRubricatorMapping,
  511:   classification: RubricatorClassificationSummary | null,
  512:   rule: ControlledRubricatorValueObjectRule,
  513:   allowTextFallback: boolean
  514: ): boolean {
  515:   const haystack = joinSearchText([
  516:     classificationSearchText(classification),
  517:     allowTextFallback ? eventSearchText(event) : "",
  518:   ]);
  519: 
  520:   if (!haystack) {
  521:     return false;
  522:   }

----- match pattern: classification | lines 525-537 -----
  525:     includesAny(haystack, needleGroup)
  526:   );
  527: }
  528: 
  529: function findControlledRubricatorValueObjectRule(input: {
  530:   event: ActivityEventForRubricatorMapping;
  531:   summaries: RubricatorClassificationSummary[];
  532:   allowTextFallback: boolean;
  533: }): {
  534:   rule: ControlledRubricatorValueObjectRule;
  535:   classification: RubricatorClassificationSummary | null;
  536: } | null {
  537:   for (const summary of input.summaries) {

----- match pattern: classification | lines 529-541 -----
  529: function findControlledRubricatorValueObjectRule(input: {
  530:   event: ActivityEventForRubricatorMapping;
  531:   summaries: RubricatorClassificationSummary[];
  532:   allowTextFallback: boolean;
  533: }): {
  534:   rule: ControlledRubricatorValueObjectRule;
  535:   classification: RubricatorClassificationSummary | null;
  536: } | null {
  537:   for (const summary of input.summaries) {
  538:     const exactRule = CONTROLLED_RUBRICATOR_VALUE_OBJECT_RULES.find((rule) =>
  539:       classificationMatchesRule(summary, rule)
  540:     );
  541: 

----- match pattern: classification | lines 533-545 -----
  533: }): {
  534:   rule: ControlledRubricatorValueObjectRule;
  535:   classification: RubricatorClassificationSummary | null;
  536: } | null {
  537:   for (const summary of input.summaries) {
  538:     const exactRule = CONTROLLED_RUBRICATOR_VALUE_OBJECT_RULES.find((rule) =>
  539:       classificationMatchesRule(summary, rule)
  540:     );
  541: 
  542:     if (exactRule) {
  543:       return {
  544:         rule: exactRule,
  545:         classification: summary,

----- match pattern: classification | lines 539-551 -----
  539:       classificationMatchesRule(summary, rule)
  540:     );
  541: 
  542:     if (exactRule) {
  543:       return {
  544:         rule: exactRule,
  545:         classification: summary,
  546:       };
  547:     }
  548:   }
  549: 
  550:   if (!input.allowTextFallback) {
  551:     return null;

----- match pattern: classification | lines 549-561 -----
  549: 
  550:   if (!input.allowTextFallback) {
  551:     return null;
  552:   }
  553: 
  554:   const fallbackRule = CONTROLLED_RUBRICATOR_VALUE_OBJECT_RULES.find((rule) =>
  555:     eventOrClassificationMatchesFallbackRule(
  556:       input.event,
  557:       null,
  558:       rule,
  559:       input.allowTextFallback
  560:     )
  561:   );

----- match pattern: classification | lines 563-575 -----
  563:   if (!fallbackRule) {
  564:     return null;
  565:   }
  566: 
  567:   return {
  568:     rule: fallbackRule,
  569:     classification: null,
  570:   };
  571: }
  572: 
  573: async function findControlledValueObject(
  574:   supabase: SupabaseClient,
  575:   event: ActivityEventForRubricatorMapping,

----- match pattern: classification | lines 700-712 -----
  700:   };
  701: }
  702: 
  703: function buildControlledMapping(
  704:   event: ActivityEventForRubricatorMapping,
  705:   valueObjectId: string,
  706:   classification: RubricatorClassificationSummary | null,
  707:   valueObjectCreated: boolean,
  708:   rule: ControlledRubricatorValueObjectRule
  709: ): ValueObjectBridgeMapping | null {
  710:   if (event.duration_minutes === null) {
  711:     return null;
  712:   }

----- match pattern: valueObjectCreated | lines 701-713 -----
  701: }
  702: 
  703: function buildControlledMapping(
  704:   event: ActivityEventForRubricatorMapping,
  705:   valueObjectId: string,
  706:   classification: RubricatorClassificationSummary | null,
  707:   valueObjectCreated: boolean,
  708:   rule: ControlledRubricatorValueObjectRule
  709: ): ValueObjectBridgeMapping | null {
  710:   if (event.duration_minutes === null) {
  711:     return null;
  712:   }
  713: 

----- match pattern: ValueObjectBridgeMapping | lines 703-715 -----
  703: function buildControlledMapping(
  704:   event: ActivityEventForRubricatorMapping,
  705:   valueObjectId: string,
  706:   classification: RubricatorClassificationSummary | null,
  707:   valueObjectCreated: boolean,
  708:   rule: ControlledRubricatorValueObjectRule
  709: ): ValueObjectBridgeMapping | null {
  710:   if (event.duration_minutes === null) {
  711:     return null;
  712:   }
  713: 
  714:   const confidence = normalizeConfidence(classification?.confidence ?? null);
  715: 

----- match pattern: classification | lines 708-720 -----
  708:   rule: ControlledRubricatorValueObjectRule
  709: ): ValueObjectBridgeMapping | null {
  710:   if (event.duration_minutes === null) {
  711:     return null;
  712:   }
  713: 
  714:   const confidence = normalizeConfidence(classification?.confidence ?? null);
  715: 
  716:   return {
  717:     valueObjectId,
  718:     relationType: rule.relationType,
  719:     weight: 1,
  720:     confidence,

----- match pattern: aggregateType | lines 727-739 -----
  727:     metricKey: rule.metricKey,
  728:     metricUnit: rule.metricUnit,
  729:     deltaValueNumeric: event.duration_minutes,
  730:     deltaValueText: null,
  731:     deltaDirection: rule.deltaDirection,
  732:     aggregateDate: null,
  733:     aggregateType: rule.aggregateType,
  734:     aggregateKey: valueObjectId,
  735:     metadata: {
  736:       mapper: "rubricatorValueObjectMapper",
  737:       mapperVersion: "p4_7_8_r_l5",
  738:       controlledRule: rule.ruleKey,
  739:       valueObjectCreated,

----- match pattern: aggregateKey | lines 728-740 -----
  728:     metricUnit: rule.metricUnit,
  729:     deltaValueNumeric: event.duration_minutes,
  730:     deltaValueText: null,
  731:     deltaDirection: rule.deltaDirection,
  732:     aggregateDate: null,
  733:     aggregateType: rule.aggregateType,
  734:     aggregateKey: valueObjectId,
  735:     metadata: {
  736:       mapper: "rubricatorValueObjectMapper",
  737:       mapperVersion: "p4_7_8_r_l5",
  738:       controlledRule: rule.ruleKey,
  739:       valueObjectCreated,
  740:       classification,

----- match pattern: metadata | lines 729-741 -----
  729:     deltaValueNumeric: event.duration_minutes,
  730:     deltaValueText: null,
  731:     deltaDirection: rule.deltaDirection,
  732:     aggregateDate: null,
  733:     aggregateType: rule.aggregateType,
  734:     aggregateKey: valueObjectId,
  735:     metadata: {
  736:       mapper: "rubricatorValueObjectMapper",
  737:       mapperVersion: "p4_7_8_r_l5",
  738:       controlledRule: rule.ruleKey,
  739:       valueObjectCreated,
  740:       classification,
  741:     },

----- match pattern: controlledRule | lines 732-744 -----
  732:     aggregateDate: null,
  733:     aggregateType: rule.aggregateType,
  734:     aggregateKey: valueObjectId,
  735:     metadata: {
  736:       mapper: "rubricatorValueObjectMapper",
  737:       mapperVersion: "p4_7_8_r_l5",
  738:       controlledRule: rule.ruleKey,
  739:       valueObjectCreated,
  740:       classification,
  741:     },
  742:   };
  743: }
  744: 

----- match pattern: valueObjectCreated | lines 733-745 -----
  733:     aggregateType: rule.aggregateType,
  734:     aggregateKey: valueObjectId,
  735:     metadata: {
  736:       mapper: "rubricatorValueObjectMapper",
  737:       mapperVersion: "p4_7_8_r_l5",
  738:       controlledRule: rule.ruleKey,
  739:       valueObjectCreated,
  740:       classification,
  741:     },
  742:   };
  743: }
  744: 
  745: export async function resolveValueObjectMappingsFromRubricatorForActivityEvent(

----- match pattern: classification | lines 734-746 -----
  734:     aggregateKey: valueObjectId,
  735:     metadata: {
  736:       mapper: "rubricatorValueObjectMapper",
  737:       mapperVersion: "p4_7_8_r_l5",
  738:       controlledRule: rule.ruleKey,
  739:       valueObjectCreated,
  740:       classification,
  741:     },
  742:   };
  743: }
  744: 
  745: export async function resolveValueObjectMappingsFromRubricatorForActivityEvent(
  746:   input: ResolveValueObjectMappingsFromRubricatorInput

----- match pattern: RubricatorValueObjectMappingResult | lines 741-753 -----
  741:     },
  742:   };
  743: }
  744: 
  745: export async function resolveValueObjectMappingsFromRubricatorForActivityEvent(
  746:   input: ResolveValueObjectMappingsFromRubricatorInput
  747: ): Promise<RubricatorValueObjectMappingResult> {
  748:   const {
  749:     supabase,
  750:     eventId,
  751:     allowNonCompletedEvent = false,
  752:     createMissingControlledValueObject = false,
  753:     allowControlledTextFallback = false,

----- match pattern: RubricatorValueObjectMappingResult | lines 750-762 -----
  750:     eventId,
  751:     allowNonCompletedEvent = false,
  752:     createMissingControlledValueObject = false,
  753:     allowControlledTextFallback = false,
  754:   } = input;
  755: 
  756:   const result: RubricatorValueObjectMappingResult = {
  757:     ok: false,
  758:     skipped: false,
  759:     skipReason: null,
  760:     eventId,
  761:     eventStatus: null,
  762:     classificationSummary: [],

----- match pattern: classification | lines 756-768 -----
  756:   const result: RubricatorValueObjectMappingResult = {
  757:     ok: false,
  758:     skipped: false,
  759:     skipReason: null,
  760:     eventId,
  761:     eventStatus: null,
  762:     classificationSummary: [],
  763:     mappings: [],
  764:     errors: [],
  765:   };
  766: 
  767:   const { event, errorMessage: eventError } = await readActivityEvent(
  768:     supabase,

----- match pattern: classification | lines 785-797 -----
  785:     result.ok = true;
  786:     result.skipped = true;
  787:     result.skipReason = `event_status_${event.status}_not_completed`;
  788:     return result;
  789:   }
  790: 
  791:   const { rows: classificationRows, errorMessage: classificationError } =
  792:     await readEntityClassifications(supabase, eventId);
  793: 
  794:   if (classificationError) {
  795:     result.errors.push(classificationError);
  796:     return result;
  797:   }

----- match pattern: classification | lines 786-798 -----
  786:     result.skipped = true;
  787:     result.skipReason = `event_status_${event.status}_not_completed`;
  788:     return result;
  789:   }
  790: 
  791:   const { rows: classificationRows, errorMessage: classificationError } =
  792:     await readEntityClassifications(supabase, eventId);
  793: 
  794:   if (classificationError) {
  795:     result.errors.push(classificationError);
  796:     return result;
  797:   }
  798: 

----- match pattern: classification | lines 788-800 -----
  788:     return result;
  789:   }
  790: 
  791:   const { rows: classificationRows, errorMessage: classificationError } =
  792:     await readEntityClassifications(supabase, eventId);
  793: 
  794:   if (classificationError) {
  795:     result.errors.push(classificationError);
  796:     return result;
  797:   }
  798: 
  799:   const summaries = await Promise.all(
  800:     classificationRows.map((row) => summarizeClassification(supabase, row))

----- match pattern: classification | lines 789-801 -----
  789:   }
  790: 
  791:   const { rows: classificationRows, errorMessage: classificationError } =
  792:     await readEntityClassifications(supabase, eventId);
  793: 
  794:   if (classificationError) {
  795:     result.errors.push(classificationError);
  796:     return result;
  797:   }
  798: 
  799:   const summaries = await Promise.all(
  800:     classificationRows.map((row) => summarizeClassification(supabase, row))
  801:   );

----- match pattern: classification | lines 794-806 -----
  794:   if (classificationError) {
  795:     result.errors.push(classificationError);
  796:     return result;
  797:   }
  798: 
  799:   const summaries = await Promise.all(
  800:     classificationRows.map((row) => summarizeClassification(supabase, row))
  801:   );
  802: 
  803:   result.classificationSummary = summaries;
  804: 
  805:   if (summaries.length === 0 && !allowControlledTextFallback) {
  806:     result.ok = true;

----- match pattern: classification | lines 797-809 -----
  797:   }
  798: 
  799:   const summaries = await Promise.all(
  800:     classificationRows.map((row) => summarizeClassification(supabase, row))
  801:   );
  802: 
  803:   result.classificationSummary = summaries;
  804: 
  805:   if (summaries.length === 0 && !allowControlledTextFallback) {
  806:     result.ok = true;
  807:     result.skipped = true;
  808:     result.skipReason = "no_approved_activity_event_classification";
  809:     return result;

----- match pattern: classification | lines 802-814 -----
  802: 
  803:   result.classificationSummary = summaries;
  804: 
  805:   if (summaries.length === 0 && !allowControlledTextFallback) {
  806:     result.ok = true;
  807:     result.skipped = true;
  808:     result.skipReason = "no_approved_activity_event_classification";
  809:     return result;
  810:   }
  811: 
  812:   const ruleMatch = findControlledRubricatorValueObjectRule({
  813:     event,
  814:     summaries,

----- match pattern: classification | lines 843-855 -----
  843:     return result;
  844:   }
  845: 
  846:   const mapping = buildControlledMapping(
  847:     event,
  848:     valueObjectResult.valueObjectId,
  849:     ruleMatch.classification,
  850:     valueObjectResult.created,
  851:     ruleMatch.rule
  852:   );
  853: 
  854:   if (!mapping) {
  855:     result.ok = true;
```

## Snippets: lib/activity/valueObjectBridge.ts

```text

----- match pattern: metadata | lines 55-67 -----
   55:   slug: string | null;
   56:   name: string | null;
   57:   status: string | null;
   58:   is_active: boolean | null;
   59: };
   60: 
   61: type ExtractedCategoryLinkMetadata = {
   62:   contextualCategoryId: string | null;
   63:   contextualCategorySlug: string | null;
   64:   contextualCategoryName: string | null;
   65:   classificationRole: string | null;
   66:   classificationId: string | null;
   67:   contextId: string | null;

----- match pattern: contextualCategoryId | lines 56-68 -----
   56:   name: string | null;
   57:   status: string | null;
   58:   is_active: boolean | null;
   59: };
   60: 
   61: type ExtractedCategoryLinkMetadata = {
   62:   contextualCategoryId: string | null;
   63:   contextualCategorySlug: string | null;
   64:   contextualCategoryName: string | null;
   65:   classificationRole: string | null;
   66:   classificationId: string | null;
   67:   contextId: string | null;
   68:   contextCode: string | null;

----- match pattern: classification | lines 59-71 -----
   59: };
   60: 
   61: type ExtractedCategoryLinkMetadata = {
   62:   contextualCategoryId: string | null;
   63:   contextualCategorySlug: string | null;
   64:   contextualCategoryName: string | null;
   65:   classificationRole: string | null;
   66:   classificationId: string | null;
   67:   contextId: string | null;
   68:   contextCode: string | null;
   69:   contextName: string | null;
   70:   objectTypeId: string | null;
   71:   objectTypeCode: string | null;

----- match pattern: classification | lines 60-72 -----
   60: 
   61: type ExtractedCategoryLinkMetadata = {
   62:   contextualCategoryId: string | null;
   63:   contextualCategorySlug: string | null;
   64:   contextualCategoryName: string | null;
   65:   classificationRole: string | null;
   66:   classificationId: string | null;
   67:   contextId: string | null;
   68:   contextCode: string | null;
   69:   contextName: string | null;
   70:   objectTypeId: string | null;
   71:   objectTypeCode: string | null;
   72:   objectTypeName: string | null;

----- match pattern: ValueObjectBridgeMapping | lines 75-87 -----
   75:   actionTypeName: string | null;
   76:   controlledRule: string | null;
   77:   mapper: string | null;
   78:   mapperVersion: string | null;
   79: };
   80: 
   81: export type ValueObjectBridgeMapping = {
   82:   valueObjectId: string;
   83: 
   84:   relationType?:
   85:     | "executes"
   86:     | "creates"
   87:     | "uses"

----- match pattern: metadata | lines 108-120 -----
  108:   deltaDirection?: ValueObjectStateDeltaDirection;
  109: 
  110:   aggregateDate?: string | null;
  111:   aggregateType?: string;
  112:   aggregateKey?: string;
  113: 
  114:   metadata?: Record<string, unknown>;
  115: };
  116: 
  117: export type ProcessValueObjectBridgeInput = {
  118:   supabase: SupabaseClient;
  119:   eventId: string;
  120:   mappings: ValueObjectBridgeMapping[];

----- match pattern: ValueObjectBridgeMapping | lines 114-126 -----
  114:   metadata?: Record<string, unknown>;
  115: };
  116: 
  117: export type ProcessValueObjectBridgeInput = {
  118:   supabase: SupabaseClient;
  119:   eventId: string;
  120:   mappings: ValueObjectBridgeMapping[];
  121:   source?: BridgeSource;
  122:   allowNonCompletedEvent?: boolean;
  123:   processorName?: string;
  124: };
  125: 
  126: export type ValueObjectBridgeCreatedItem = {

----- match pattern: stateDeltaId | lines 124-136 -----
  124: };
  125: 
  126: export type ValueObjectBridgeCreatedItem = {
  127:   valueObjectId: string;
  128:   valueObjectInstanceId: string | null;
  129:   linkId: string | null;
  130:   stateDeltaId: string | null;
  131:   aggregateId: string | null;
  132:   snapshotId: string | null;
  133: 
  134:   /**
  135:    * P4.9.1 additive v4.2 projection fields.
  136:    *

----- match pattern: usageAggregateId | lines 134-146 -----
  134:   /**
  135:    * P4.9.1 additive v4.2 projection fields.
  136:    *
  137:    * These do not replace the old VOI pipeline:
  138:    * - linkId still refers to activity_event_value_object_instance_links;
  139:    * - activityEventValueObjectLinkId refers to the new direct v4.2 projection table;
  140:    * - usageAggregateId refers to the new object-cloud/read-optimization aggregate.
  141:    */
  142:   activityEventValueObjectLinkId: string | null;
  143:   usageAggregateId: string | null;
  144:   v42ProjectionError: string | null;
  145: 
  146:   /**

----- match pattern: usageAggregateId | lines 137-149 -----
  137:    * These do not replace the old VOI pipeline:
  138:    * - linkId still refers to activity_event_value_object_instance_links;
  139:    * - activityEventValueObjectLinkId refers to the new direct v4.2 projection table;
  140:    * - usageAggregateId refers to the new object-cloud/read-optimization aggregate.
  141:    */
  142:   activityEventValueObjectLinkId: string | null;
  143:   usageAggregateId: string | null;
  144:   v42ProjectionError: string | null;
  145: 
  146:   /**
  147:    * P4.9.2 additive category bridge fields.
  148:    *
  149:    * These connect a derived Value Object to reliable category/rubricator metadata.

----- match pattern: metadata | lines 143-155 -----
  143:   usageAggregateId: string | null;
  144:   v42ProjectionError: string | null;
  145: 
  146:   /**
  147:    * P4.9.2 additive category bridge fields.
  148:    *
  149:    * These connect a derived Value Object to reliable category/rubricator metadata.
  150:    * They do not replace VOI links, state deltas, aggregates, snapshots, or relation_type.
  151:    */
  152:   valueObjectCategoryLinkId: string | null;
  153:   valueObjectCategoryLinkError: string | null;
  154: 
  155:   skipped: boolean;

----- match pattern: valueObjectCategoryLinkId | lines 146-158 -----
  146:   /**
  147:    * P4.9.2 additive category bridge fields.
  148:    *
  149:    * These connect a derived Value Object to reliable category/rubricator metadata.
  150:    * They do not replace VOI links, state deltas, aggregates, snapshots, or relation_type.
  151:    */
  152:   valueObjectCategoryLinkId: string | null;
  153:   valueObjectCategoryLinkError: string | null;
  154: 
  155:   skipped: boolean;
  156:   skipReason: string | null;
  157: };
  158: 

----- match pattern: valueObjectCategoryLinkError | lines 147-159 -----
  147:    * P4.9.2 additive category bridge fields.
  148:    *
  149:    * These connect a derived Value Object to reliable category/rubricator metadata.
  150:    * They do not replace VOI links, state deltas, aggregates, snapshots, or relation_type.
  151:    */
  152:   valueObjectCategoryLinkId: string | null;
  153:   valueObjectCategoryLinkError: string | null;
  154: 
  155:   skipped: boolean;
  156:   skipReason: string | null;
  157: };
  158: 
  159: export type ProcessValueObjectBridgeResult = {

----- match pattern: metadata | lines 215-227 -----
  215:   }
  216: 
  217:   /*
  218:    * The v4.2 projection/category tables currently allow:
  219:    * rule | ai | manual | system_seed | migration
  220:    *
  221:    * Bridge-specific sources such as api/correction/commercial are kept in metadata,
  222:    * while the table-level source remains rule-compatible.
  223:    */
  224:   return "rule";
  225: }
  226: 
  227: function normalizeDeltaDirection(

----- match pattern: ValueObjectBridgeMapping | lines 240-252 -----
  240: 
  241:   return "neutral";
  242: }
  243: 
  244: function normalizeRelationType(
  245:   value: string | null | undefined
  246: ): NonNullable<ValueObjectBridgeMapping["relationType"]> {
  247:   const allowed: NonNullable<ValueObjectBridgeMapping["relationType"]>[] = [
  248:     "executes",
  249:     "creates",
  250:     "uses",
  251:     "supports",
  252:     "consumes",

----- match pattern: ValueObjectBridgeMapping | lines 241-253 -----
  241:   return "neutral";
  242: }
  243: 
  244: function normalizeRelationType(
  245:   value: string | null | undefined
  246: ): NonNullable<ValueObjectBridgeMapping["relationType"]> {
  247:   const allowed: NonNullable<ValueObjectBridgeMapping["relationType"]>[] = [
  248:     "executes",
  249:     "creates",
  250:     "uses",
  251:     "supports",
  252:     "consumes",
  253:     "updates_state",

----- match pattern: ValueObjectBridgeMapping | lines 253-265 -----
  253:     "updates_state",
  254:     "commercial_source",
  255:     "related_to",
  256:   ];
  257: 
  258:   if (
  259:     allowed.includes(value as NonNullable<ValueObjectBridgeMapping["relationType"]>)
  260:   ) {
  261:     return value as NonNullable<ValueObjectBridgeMapping["relationType"]>;
  262:   }
  263: 
  264:   return "executes";
  265: }

----- match pattern: ValueObjectBridgeMapping | lines 255-267 -----
  255:     "related_to",
  256:   ];
  257: 
  258:   if (
  259:     allowed.includes(value as NonNullable<ValueObjectBridgeMapping["relationType"]>)
  260:   ) {
  261:     return value as NonNullable<ValueObjectBridgeMapping["relationType"]>;
  262:   }
  263: 
  264:   return "executes";
  265: }
  266: 
  267: function normalizeCategoryRole(

----- match pattern: metadata | lines 367-379 -----
  367:     return Math.abs(value);
  368:   }
  369: 
  370:   return value;
  371: }
  372: 
  373: function extractCategoryLinkMetadata(
  374:   metadata: Record<string, unknown>
  375: ): ExtractedCategoryLinkMetadata {
  376:   const classification = asRecord(metadata.classification) ?? {};
  377: 
  378:   return {
  379:     contextualCategoryId: asString(classification.contextualCategoryId),

----- match pattern: metadata | lines 368-380 -----
  368:   }
  369: 
  370:   return value;
  371: }
  372: 
  373: function extractCategoryLinkMetadata(
  374:   metadata: Record<string, unknown>
  375: ): ExtractedCategoryLinkMetadata {
  376:   const classification = asRecord(metadata.classification) ?? {};
  377: 
  378:   return {
  379:     contextualCategoryId: asString(classification.contextualCategoryId),
  380:     contextualCategorySlug: asString(classification.contextualCategorySlug),

----- match pattern: metadata | lines 369-381 -----
  369: 
  370:   return value;
  371: }
  372: 
  373: function extractCategoryLinkMetadata(
  374:   metadata: Record<string, unknown>
  375: ): ExtractedCategoryLinkMetadata {
  376:   const classification = asRecord(metadata.classification) ?? {};
  377: 
  378:   return {
  379:     contextualCategoryId: asString(classification.contextualCategoryId),
  380:     contextualCategorySlug: asString(classification.contextualCategorySlug),
  381:     contextualCategoryName: asString(classification.contextualCategoryName),

----- match pattern: classification | lines 370-382 -----
  370:   return value;
  371: }
  372: 
  373: function extractCategoryLinkMetadata(
  374:   metadata: Record<string, unknown>
  375: ): ExtractedCategoryLinkMetadata {
  376:   const classification = asRecord(metadata.classification) ?? {};
  377: 
  378:   return {
  379:     contextualCategoryId: asString(classification.contextualCategoryId),
  380:     contextualCategorySlug: asString(classification.contextualCategorySlug),
  381:     contextualCategoryName: asString(classification.contextualCategoryName),
  382:     classificationRole: asString(classification.classificationRole),

----- match pattern: contextualCategoryId | lines 373-385 -----
  373: function extractCategoryLinkMetadata(
  374:   metadata: Record<string, unknown>
  375: ): ExtractedCategoryLinkMetadata {
  376:   const classification = asRecord(metadata.classification) ?? {};
  377: 
  378:   return {
  379:     contextualCategoryId: asString(classification.contextualCategoryId),
  380:     contextualCategorySlug: asString(classification.contextualCategorySlug),
  381:     contextualCategoryName: asString(classification.contextualCategoryName),
  382:     classificationRole: asString(classification.classificationRole),
  383:     classificationId: asString(classification.classificationId),
  384:     contextId: asString(classification.contextId),
  385:     contextCode: asString(classification.contextCode),

----- match pattern: classification | lines 374-386 -----
  374:   metadata: Record<string, unknown>
  375: ): ExtractedCategoryLinkMetadata {
  376:   const classification = asRecord(metadata.classification) ?? {};
  377: 
  378:   return {
  379:     contextualCategoryId: asString(classification.contextualCategoryId),
  380:     contextualCategorySlug: asString(classification.contextualCategorySlug),
  381:     contextualCategoryName: asString(classification.contextualCategoryName),
  382:     classificationRole: asString(classification.classificationRole),
  383:     classificationId: asString(classification.classificationId),
  384:     contextId: asString(classification.contextId),
  385:     contextCode: asString(classification.contextCode),
  386:     contextName: asString(classification.contextName),

----- match pattern: classification | lines 375-387 -----
  375: ): ExtractedCategoryLinkMetadata {
  376:   const classification = asRecord(metadata.classification) ?? {};
  377: 
  378:   return {
  379:     contextualCategoryId: asString(classification.contextualCategoryId),
  380:     contextualCategorySlug: asString(classification.contextualCategorySlug),
  381:     contextualCategoryName: asString(classification.contextualCategoryName),
  382:     classificationRole: asString(classification.classificationRole),
  383:     classificationId: asString(classification.classificationId),
  384:     contextId: asString(classification.contextId),
  385:     contextCode: asString(classification.contextCode),
  386:     contextName: asString(classification.contextName),
  387:     objectTypeId: asString(classification.objectTypeId),

----- match pattern: classification | lines 376-388 -----
  376:   const classification = asRecord(metadata.classification) ?? {};
  377: 
  378:   return {
  379:     contextualCategoryId: asString(classification.contextualCategoryId),
  380:     contextualCategorySlug: asString(classification.contextualCategorySlug),
  381:     contextualCategoryName: asString(classification.contextualCategoryName),
  382:     classificationRole: asString(classification.classificationRole),
  383:     classificationId: asString(classification.classificationId),
  384:     contextId: asString(classification.contextId),
  385:     contextCode: asString(classification.contextCode),
  386:     contextName: asString(classification.contextName),
  387:     objectTypeId: asString(classification.objectTypeId),
  388:     objectTypeCode: asString(classification.objectTypeCode),

----- match pattern: classification | lines 377-389 -----
  377: 
  378:   return {
  379:     contextualCategoryId: asString(classification.contextualCategoryId),
  380:     contextualCategorySlug: asString(classification.contextualCategorySlug),
  381:     contextualCategoryName: asString(classification.contextualCategoryName),
  382:     classificationRole: asString(classification.classificationRole),
  383:     classificationId: asString(classification.classificationId),
  384:     contextId: asString(classification.contextId),
  385:     contextCode: asString(classification.contextCode),
  386:     contextName: asString(classification.contextName),
  387:     objectTypeId: asString(classification.objectTypeId),
  388:     objectTypeCode: asString(classification.objectTypeCode),
  389:     objectTypeName: asString(classification.objectTypeName),

----- match pattern: classification | lines 378-390 -----
  378:   return {
  379:     contextualCategoryId: asString(classification.contextualCategoryId),
  380:     contextualCategorySlug: asString(classification.contextualCategorySlug),
  381:     contextualCategoryName: asString(classification.contextualCategoryName),
  382:     classificationRole: asString(classification.classificationRole),
  383:     classificationId: asString(classification.classificationId),
  384:     contextId: asString(classification.contextId),
  385:     contextCode: asString(classification.contextCode),
  386:     contextName: asString(classification.contextName),
  387:     objectTypeId: asString(classification.objectTypeId),
  388:     objectTypeCode: asString(classification.objectTypeCode),
  389:     objectTypeName: asString(classification.objectTypeName),
  390:     actionTypeId: asString(classification.actionTypeId),

----- match pattern: classification | lines 379-391 -----
  379:     contextualCategoryId: asString(classification.contextualCategoryId),
  380:     contextualCategorySlug: asString(classification.contextualCategorySlug),
  381:     contextualCategoryName: asString(classification.contextualCategoryName),
  382:     classificationRole: asString(classification.classificationRole),
  383:     classificationId: asString(classification.classificationId),
  384:     contextId: asString(classification.contextId),
  385:     contextCode: asString(classification.contextCode),
  386:     contextName: asString(classification.contextName),
  387:     objectTypeId: asString(classification.objectTypeId),
  388:     objectTypeCode: asString(classification.objectTypeCode),
  389:     objectTypeName: asString(classification.objectTypeName),
  390:     actionTypeId: asString(classification.actionTypeId),
  391:     actionTypeCode: asString(classification.actionTypeCode),

----- match pattern: classification | lines 380-392 -----
  380:     contextualCategorySlug: asString(classification.contextualCategorySlug),
  381:     contextualCategoryName: asString(classification.contextualCategoryName),
  382:     classificationRole: asString(classification.classificationRole),
  383:     classificationId: asString(classification.classificationId),
  384:     contextId: asString(classification.contextId),
  385:     contextCode: asString(classification.contextCode),
  386:     contextName: asString(classification.contextName),
  387:     objectTypeId: asString(classification.objectTypeId),
  388:     objectTypeCode: asString(classification.objectTypeCode),
  389:     objectTypeName: asString(classification.objectTypeName),
  390:     actionTypeId: asString(classification.actionTypeId),
  391:     actionTypeCode: asString(classification.actionTypeCode),
  392:     actionTypeName: asString(classification.actionTypeName),

----- match pattern: classification | lines 381-393 -----
  381:     contextualCategoryName: asString(classification.contextualCategoryName),
  382:     classificationRole: asString(classification.classificationRole),
  383:     classificationId: asString(classification.classificationId),
  384:     contextId: asString(classification.contextId),
  385:     contextCode: asString(classification.contextCode),
  386:     contextName: asString(classification.contextName),
  387:     objectTypeId: asString(classification.objectTypeId),
  388:     objectTypeCode: asString(classification.objectTypeCode),
  389:     objectTypeName: asString(classification.objectTypeName),
  390:     actionTypeId: asString(classification.actionTypeId),
  391:     actionTypeCode: asString(classification.actionTypeCode),
  392:     actionTypeName: asString(classification.actionTypeName),
  393:     controlledRule: asString(metadata.controlledRule),

----- match pattern: classification | lines 382-394 -----
  382:     classificationRole: asString(classification.classificationRole),
  383:     classificationId: asString(classification.classificationId),
  384:     contextId: asString(classification.contextId),
  385:     contextCode: asString(classification.contextCode),
  386:     contextName: asString(classification.contextName),
  387:     objectTypeId: asString(classification.objectTypeId),
  388:     objectTypeCode: asString(classification.objectTypeCode),
  389:     objectTypeName: asString(classification.objectTypeName),
  390:     actionTypeId: asString(classification.actionTypeId),
  391:     actionTypeCode: asString(classification.actionTypeCode),
  392:     actionTypeName: asString(classification.actionTypeName),
  393:     controlledRule: asString(metadata.controlledRule),
  394:     mapper: asString(metadata.mapper),

----- match pattern: classification | lines 383-395 -----
  383:     classificationId: asString(classification.classificationId),
  384:     contextId: asString(classification.contextId),
  385:     contextCode: asString(classification.contextCode),
  386:     contextName: asString(classification.contextName),
  387:     objectTypeId: asString(classification.objectTypeId),
  388:     objectTypeCode: asString(classification.objectTypeCode),
  389:     objectTypeName: asString(classification.objectTypeName),
  390:     actionTypeId: asString(classification.actionTypeId),
  391:     actionTypeCode: asString(classification.actionTypeCode),
  392:     actionTypeName: asString(classification.actionTypeName),
  393:     controlledRule: asString(metadata.controlledRule),
  394:     mapper: asString(metadata.mapper),
  395:     mapperVersion: asString(metadata.mapperVersion),

----- match pattern: classification | lines 384-396 -----
  384:     contextId: asString(classification.contextId),
  385:     contextCode: asString(classification.contextCode),
  386:     contextName: asString(classification.contextName),
  387:     objectTypeId: asString(classification.objectTypeId),
  388:     objectTypeCode: asString(classification.objectTypeCode),
  389:     objectTypeName: asString(classification.objectTypeName),
  390:     actionTypeId: asString(classification.actionTypeId),
  391:     actionTypeCode: asString(classification.actionTypeCode),
  392:     actionTypeName: asString(classification.actionTypeName),
  393:     controlledRule: asString(metadata.controlledRule),
  394:     mapper: asString(metadata.mapper),
  395:     mapperVersion: asString(metadata.mapperVersion),
  396:   };

----- match pattern: classification | lines 385-397 -----
  385:     contextCode: asString(classification.contextCode),
  386:     contextName: asString(classification.contextName),
  387:     objectTypeId: asString(classification.objectTypeId),
  388:     objectTypeCode: asString(classification.objectTypeCode),
  389:     objectTypeName: asString(classification.objectTypeName),
  390:     actionTypeId: asString(classification.actionTypeId),
  391:     actionTypeCode: asString(classification.actionTypeCode),
  392:     actionTypeName: asString(classification.actionTypeName),
  393:     controlledRule: asString(metadata.controlledRule),
  394:     mapper: asString(metadata.mapper),
  395:     mapperVersion: asString(metadata.mapperVersion),
  396:   };
  397: }

----- match pattern: classification | lines 386-398 -----
  386:     contextName: asString(classification.contextName),
  387:     objectTypeId: asString(classification.objectTypeId),
  388:     objectTypeCode: asString(classification.objectTypeCode),
  389:     objectTypeName: asString(classification.objectTypeName),
  390:     actionTypeId: asString(classification.actionTypeId),
  391:     actionTypeCode: asString(classification.actionTypeCode),
  392:     actionTypeName: asString(classification.actionTypeName),
  393:     controlledRule: asString(metadata.controlledRule),
  394:     mapper: asString(metadata.mapper),
  395:     mapperVersion: asString(metadata.mapperVersion),
  396:   };
  397: }
  398: 

----- match pattern: metadata | lines 387-399 -----
  387:     objectTypeId: asString(classification.objectTypeId),
  388:     objectTypeCode: asString(classification.objectTypeCode),
  389:     objectTypeName: asString(classification.objectTypeName),
  390:     actionTypeId: asString(classification.actionTypeId),
  391:     actionTypeCode: asString(classification.actionTypeCode),
  392:     actionTypeName: asString(classification.actionTypeName),
  393:     controlledRule: asString(metadata.controlledRule),
  394:     mapper: asString(metadata.mapper),
  395:     mapperVersion: asString(metadata.mapperVersion),
  396:   };
  397: }
  398: 
  399: async function readActivityEvent(

----- match pattern: metadata | lines 388-400 -----
  388:     objectTypeCode: asString(classification.objectTypeCode),
  389:     objectTypeName: asString(classification.objectTypeName),
  390:     actionTypeId: asString(classification.actionTypeId),
  391:     actionTypeCode: asString(classification.actionTypeCode),
  392:     actionTypeName: asString(classification.actionTypeName),
  393:     controlledRule: asString(metadata.controlledRule),
  394:     mapper: asString(metadata.mapper),
  395:     mapperVersion: asString(metadata.mapperVersion),
  396:   };
  397: }
  398: 
  399: async function readActivityEvent(
  400:   supabase: SupabaseClient,

----- match pattern: metadata | lines 389-401 -----
  389:     objectTypeName: asString(classification.objectTypeName),
  390:     actionTypeId: asString(classification.actionTypeId),
  391:     actionTypeCode: asString(classification.actionTypeCode),
  392:     actionTypeName: asString(classification.actionTypeName),
  393:     controlledRule: asString(metadata.controlledRule),
  394:     mapper: asString(metadata.mapper),
  395:     mapperVersion: asString(metadata.mapperVersion),
  396:   };
  397: }
  398: 
  399: async function readActivityEvent(
  400:   supabase: SupabaseClient,
  401:   eventId: string

----- match pattern: contextualCategoryId | lines 477-489 -----
  477:     errorMessage: null,
  478:   };
  479: }
  480: 
  481: async function readContextualCategoryForLink(
  482:   supabase: SupabaseClient,
  483:   contextualCategoryId: string
  484: ): Promise<{
  485:   category: ContextualCategoryForLink | null;
  486:   errorMessage: string | null;
  487: }> {
  488:   const { data, error } = await supabase
  489:     .from("contextual_categories")

----- match pattern: contextualCategoryId | lines 485-497 -----
  485:   category: ContextualCategoryForLink | null;
  486:   errorMessage: string | null;
  487: }> {
  488:   const { data, error } = await supabase
  489:     .from("contextual_categories")
  490:     .select("id, slug, name, status, is_active")
  491:     .eq("id", contextualCategoryId)
  492:     .maybeSingle();
  493: 
  494:   if (error) {
  495:     return {
  496:       category: null,
  497:       errorMessage: error.message,

----- match pattern: stateDeltaId | lines 514-526 -----
  514: async function readExistingStateDeltaForMapping(
  515:   supabase: SupabaseClient,
  516:   eventId: string,
  517:   valueObjectId: string,
  518:   metricKey: string
  519: ): Promise<{
  520:   stateDeltaId: string | null;
  521:   valueObjectInstanceId: string | null;
  522:   errorMessage: string | null;
  523: }> {
  524:   const { data, error } = await supabase
  525:     .from("value_object_state_deltas")
  526:     .select("id, value_object_instance_id")

----- match pattern: stateDeltaId | lines 529-541 -----
  529:     .eq("metric_key", metricKey)
  530:     .order("created_at", { ascending: true })
  531:     .limit(1);
  532: 
  533:   if (error) {
  534:     return {
  535:       stateDeltaId: null,
  536:       valueObjectInstanceId: null,
  537:       errorMessage: error.message,
  538:     };
  539:   }
  540: 
  541:   const rows =

----- match pattern: stateDeltaId | lines 545-557 -----
  545:     }> | null) ?? [];
  546: 
  547:   const firstRow = rows[0] ?? null;
  548: 
  549:   if (!firstRow) {
  550:     return {
  551:       stateDeltaId: null,
  552:       valueObjectInstanceId: null,
  553:       errorMessage: null,
  554:     };
  555:   }
  556: 
  557:   return {

----- match pattern: stateDeltaId | lines 552-564 -----
  552:       valueObjectInstanceId: null,
  553:       errorMessage: null,
  554:     };
  555:   }
  556: 
  557:   return {
  558:     stateDeltaId: firstRow.id,
  559:     valueObjectInstanceId: firstRow.value_object_instance_id,
  560:     errorMessage: null,
  561:   };
  562: }
  563: 
  564: async function readExistingNumericValue(

----- match pattern: activity_event_value_object_links | lines 601-613 -----
  601:   source: V42ProjectionSource
  602: ): Promise<{
  603:   id: string | null;
  604:   errorMessage: string | null;
  605: }> {
  606:   const { data, error } = await supabase
  607:     .from("activity_event_value_object_links")
  608:     .select("id")
  609:     .eq("event_id", eventId)
  610:     .eq("value_object_id", valueObjectId)
  611:     .eq("source", source)
  612:     .maybeSingle();
  613: 

----- match pattern: metadata | lines 684-696 -----
  684:   valueObjectId: string;
  685:   valueObjectInstanceId: string;
  686:   oldVoiLinkId: string | null;
  687:   bridgeSource: BridgeSource;
  688:   confidence: number;
  689:   processorName: string;
  690:   mappingMetadata: Record<string, unknown>;
  691: }): Promise<{
  692:   activityEventValueObjectLinkId: string | null;
  693:   usageAggregateId: string | null;
  694:   errorMessage: string | null;
  695: }> {
  696:   const {

----- match pattern: usageAggregateId | lines 687-699 -----
  687:   bridgeSource: BridgeSource;
  688:   confidence: number;
  689:   processorName: string;
  690:   mappingMetadata: Record<string, unknown>;
  691: }): Promise<{
  692:   activityEventValueObjectLinkId: string | null;
  693:   usageAggregateId: string | null;
  694:   errorMessage: string | null;
  695: }> {
  696:   const {
  697:     supabase,
  698:     event,
  699:     valueObjectId,

----- match pattern: metadata | lines 699-711 -----
  699:     valueObjectId,
  700:     valueObjectInstanceId,
  701:     oldVoiLinkId,
  702:     bridgeSource,
  703:     confidence,
  704:     processorName,
  705:     mappingMetadata,
  706:   } = params;
  707: 
  708:   const projectionSource = normalizeV42ProjectionSource(bridgeSource);
  709:   const exposureMinutes = normalizeExposureMinutes(event.duration_minutes);
  710:   const nowIso = new Date().toISOString();
  711: 

----- match pattern: usageAggregateId | lines 716-728 -----
  716:     projectionSource
  717:   );
  718: 
  719:   if (existingProjection.errorMessage) {
  720:     return {
  721:       activityEventValueObjectLinkId: null,
  722:       usageAggregateId: null,
  723:       errorMessage: existingProjection.errorMessage,
  724:     };
  725:   }
  726: 
  727:   const { data: projectionData, error: projectionError } = await supabase
  728:     .from("activity_event_value_object_links")

----- match pattern: activity_event_value_object_links | lines 722-734 -----
  722:       usageAggregateId: null,
  723:       errorMessage: existingProjection.errorMessage,
  724:     };
  725:   }
  726: 
  727:   const { data: projectionData, error: projectionError } = await supabase
  728:     .from("activity_event_value_object_links")
  729:     .upsert(
  730:       {
  731:         user_id: event.user_id,
  732:         event_id: event.id,
  733:         value_object_id: valueObjectId,
  734:         exposure_minutes: exposureMinutes,

----- match pattern: metadata | lines 731-743 -----
  731:         user_id: event.user_id,
  732:         event_id: event.id,
  733:         value_object_id: valueObjectId,
  734:         exposure_minutes: exposureMinutes,
  735:         source: projectionSource,
  736:         confidence,
  737:         metadata_json: {
  738:           processorName,
  739:           bridgeSource,
  740:           valueObjectInstanceId,
  741:           oldActivityEventValueObjectInstanceLinkId: oldVoiLinkId,
  742:           mappingMetadata,
  743:           p491: {

----- match pattern: metadata | lines 736-748 -----
  736:         confidence,
  737:         metadata_json: {
  738:           processorName,
  739:           bridgeSource,
  740:           valueObjectInstanceId,
  741:           oldActivityEventValueObjectInstanceLinkId: oldVoiLinkId,
  742:           mappingMetadata,
  743:           p491: {
  744:             projection: "activity_event_value_object_links",
  745:             mode: "additive_v4_2_runtime_projection",
  746:           },
  747:         },
  748:         updated_at: nowIso,

----- match pattern: activity_event_value_object_links | lines 738-750 -----
  738:           processorName,
  739:           bridgeSource,
  740:           valueObjectInstanceId,
  741:           oldActivityEventValueObjectInstanceLinkId: oldVoiLinkId,
  742:           mappingMetadata,
  743:           p491: {
  744:             projection: "activity_event_value_object_links",
  745:             mode: "additive_v4_2_runtime_projection",
  746:           },
  747:         },
  748:         updated_at: nowIso,
  749:       },
  750:       {

----- match pattern: usageAggregateId | lines 754-766 -----
  754:     .select("id")
  755:     .single();
  756: 
  757:   if (projectionError || !projectionData) {
  758:     return {
  759:       activityEventValueObjectLinkId: null,
  760:       usageAggregateId: null,
  761:       errorMessage:
  762:         projectionError?.message ?? "failed_to_upsert_activity_event_value_object_link",
  763:     };
  764:   }
  765: 
  766:   const activityEventValueObjectLinkId = (projectionData as { id: string }).id;

----- match pattern: metadata | lines 765-777 -----
  765: 
  766:   const activityEventValueObjectLinkId = (projectionData as { id: string }).id;
  767: 
  768:   /*
  769:    * Avoid usage overcounting:
  770:    * - if the direct event -> VO projection already existed, do not increment usage again;
  771:    * - still keep the projection row updated above for metadata/confidence freshness.
  772:    */
  773:   if (existingProjection.id) {
  774:     return {
  775:       activityEventValueObjectLinkId,
  776:       usageAggregateId: null,
  777:       errorMessage: null,

----- match pattern: usageAggregateId | lines 770-782 -----
  770:    * - if the direct event -> VO projection already existed, do not increment usage again;
  771:    * - still keep the projection row updated above for metadata/confidence freshness.
  772:    */
  773:   if (existingProjection.id) {
  774:     return {
  775:       activityEventValueObjectLinkId,
  776:       usageAggregateId: null,
  777:       errorMessage: null,
  778:     };
  779:   }
  780: 
  781:   const existingUsage = await readExistingV42UsageAggregate(
  782:     supabase,

----- match pattern: usageAggregateId | lines 784-796 -----
  784:     valueObjectId
  785:   );
  786: 
  787:   if (existingUsage.errorMessage) {
  788:     return {
  789:       activityEventValueObjectLinkId,
  790:       usageAggregateId: null,
  791:       errorMessage: existingUsage.errorMessage,
  792:     };
  793:   }
  794: 
  795:   const firstUsedAt = existingUsage.firstUsedAt ?? getEventFirstUsedAt(event);
  796:   const lastUsedAt = getEventLastUsedAt(event);

----- match pattern: metadata | lines 806-818 -----
  806:         usage_count: nextUsageCount,
  807:         exposure_minutes: nextExposureMinutes,
  808:         first_used_at: firstUsedAt,
  809:         last_used_at: lastUsedAt,
  810:         last_event_id: event.id,
  811:         source: projectionSource,
  812:         metadata_json: {
  813:           processorName,
  814:           bridgeSource,
  815:           lastActivityEventValueObjectLinkId: activityEventValueObjectLinkId,
  816:           lastValueObjectInstanceId: valueObjectInstanceId,
  817:           lastOldActivityEventValueObjectInstanceLinkId: oldVoiLinkId,
  818:           lastExposureMinutes: exposureMinutes,

----- match pattern: usageAggregateId | lines 830-842 -----
  830:     .select("id")
  831:     .single();
  832: 
  833:   if (usageError || !usageData) {
  834:     return {
  835:       activityEventValueObjectLinkId,
  836:       usageAggregateId: null,
  837:       errorMessage:
  838:         usageError?.message ?? "failed_to_upsert_value_object_usage_aggregate",
  839:     };
  840:   }
  841: 
  842:   return {

----- match pattern: usageAggregateId | lines 838-850 -----
  838:         usageError?.message ?? "failed_to_upsert_value_object_usage_aggregate",
  839:     };
  840:   }
  841: 
  842:   return {
  843:     activityEventValueObjectLinkId,
  844:     usageAggregateId: (usageData as { id: string }).id,
  845:     errorMessage: null,
  846:   };
  847: }
  848: 
  849: async function upsertV42ValueObjectCategoryLink(params: {
  850:   supabase: SupabaseClient;

----- match pattern: metadata | lines 853-865 -----
  853:   valueObjectInstanceId: string;
  854:   oldVoiLinkId: string | null;
  855:   activityEventValueObjectLinkId: string | null;
  856:   bridgeSource: BridgeSource;
  857:   confidence: number;
  858:   processorName: string;
  859:   mappingMetadata: Record<string, unknown>;
  860: }): Promise<{
  861:   valueObjectCategoryLinkId: string | null;
  862:   errorMessage: string | null;
  863: }> {
  864:   const {
  865:     supabase,

----- match pattern: valueObjectCategoryLinkId | lines 855-867 -----
  855:   activityEventValueObjectLinkId: string | null;
  856:   bridgeSource: BridgeSource;
  857:   confidence: number;
  858:   processorName: string;
  859:   mappingMetadata: Record<string, unknown>;
  860: }): Promise<{
  861:   valueObjectCategoryLinkId: string | null;
  862:   errorMessage: string | null;
  863: }> {
  864:   const {
  865:     supabase,
  866:     event,
  867:     valueObjectId,

----- match pattern: metadata | lines 868-880 -----
  868:     valueObjectInstanceId,
  869:     oldVoiLinkId,
  870:     activityEventValueObjectLinkId,
  871:     bridgeSource,
  872:     confidence,
  873:     processorName,
  874:     mappingMetadata,
  875:   } = params;
  876: 
  877:   const categoryMetadata = extractCategoryLinkMetadata(mappingMetadata);
  878: 
  879:   if (!isUuid(categoryMetadata.contextualCategoryId)) {
  880:     return {

----- match pattern: metadata | lines 871-883 -----
  871:     bridgeSource,
  872:     confidence,
  873:     processorName,
  874:     mappingMetadata,
  875:   } = params;
  876: 
  877:   const categoryMetadata = extractCategoryLinkMetadata(mappingMetadata);
  878: 
  879:   if (!isUuid(categoryMetadata.contextualCategoryId)) {
  880:     return {
  881:       valueObjectCategoryLinkId: null,
  882:       errorMessage: null,
  883:     };

----- match pattern: contextualCategoryId | lines 873-885 -----
  873:     processorName,
  874:     mappingMetadata,
  875:   } = params;
  876: 
  877:   const categoryMetadata = extractCategoryLinkMetadata(mappingMetadata);
  878: 
  879:   if (!isUuid(categoryMetadata.contextualCategoryId)) {
  880:     return {
  881:       valueObjectCategoryLinkId: null,
  882:       errorMessage: null,
  883:     };
  884:   }
  885: 

----- match pattern: valueObjectCategoryLinkId | lines 875-887 -----
  875:   } = params;
  876: 
  877:   const categoryMetadata = extractCategoryLinkMetadata(mappingMetadata);
  878: 
  879:   if (!isUuid(categoryMetadata.contextualCategoryId)) {
  880:     return {
  881:       valueObjectCategoryLinkId: null,
  882:       errorMessage: null,
  883:     };
  884:   }
  885: 
  886:   const categoryLookup = await readContextualCategoryForLink(
  887:     supabase,

----- match pattern: contextualCategoryId | lines 882-894 -----
  882:       errorMessage: null,
  883:     };
  884:   }
  885: 
  886:   const categoryLookup = await readContextualCategoryForLink(
  887:     supabase,
  888:     categoryMetadata.contextualCategoryId
  889:   );
  890: 
  891:   if (categoryLookup.errorMessage) {
  892:     return {
  893:       valueObjectCategoryLinkId: null,
  894:       errorMessage: categoryLookup.errorMessage,

----- match pattern: valueObjectCategoryLinkId | lines 887-899 -----
  887:     supabase,
  888:     categoryMetadata.contextualCategoryId
  889:   );
  890: 
  891:   if (categoryLookup.errorMessage) {
  892:     return {
  893:       valueObjectCategoryLinkId: null,
  894:       errorMessage: categoryLookup.errorMessage,
  895:     };
  896:   }
  897: 
  898:   if (!categoryLookup.category) {
  899:     return {

----- match pattern: valueObjectCategoryLinkId | lines 894-906 -----
  894:       errorMessage: categoryLookup.errorMessage,
  895:     };
  896:   }
  897: 
  898:   if (!categoryLookup.category) {
  899:     return {
  900:       valueObjectCategoryLinkId: null,
  901:       errorMessage: null,
  902:     };
  903:   }
  904: 
  905:   const projectionSource = normalizeV42ProjectionSource(bridgeSource);
  906:   const categoryRole = normalizeCategoryRole(

----- match pattern: classification | lines 901-913 -----
  901:       errorMessage: null,
  902:     };
  903:   }
  904: 
  905:   const projectionSource = normalizeV42ProjectionSource(bridgeSource);
  906:   const categoryRole = normalizeCategoryRole(
  907:     categoryMetadata.classificationRole === "primary"
  908:       ? "primary"
  909:       : "semantic_component"
  910:   );
  911: 
  912:   const { data, error } = await supabase
  913:     .from("value_object_category_links")

----- match pattern: value_object_category_links | lines 907-919 -----
  907:     categoryMetadata.classificationRole === "primary"
  908:       ? "primary"
  909:       : "semantic_component"
  910:   );
  911: 
  912:   const { data, error } = await supabase
  913:     .from("value_object_category_links")
  914:     .upsert(
  915:       {
  916:         value_object_id: valueObjectId,
  917:         category_table: "contextual_categories",
  918:         category_id: categoryMetadata.contextualCategoryId,
  919:         category_role: categoryRole,

----- match pattern: contextualCategoryId | lines 912-924 -----
  912:   const { data, error } = await supabase
  913:     .from("value_object_category_links")
  914:     .upsert(
  915:       {
  916:         value_object_id: valueObjectId,
  917:         category_table: "contextual_categories",
  918:         category_id: categoryMetadata.contextualCategoryId,
  919:         category_role: categoryRole,
  920:         source: projectionSource,
  921:         confidence,
  922:         metadata_json: {
  923:           processorName,
  924:           bridgeSource,

----- match pattern: metadata | lines 916-928 -----
  916:         value_object_id: valueObjectId,
  917:         category_table: "contextual_categories",
  918:         category_id: categoryMetadata.contextualCategoryId,
  919:         category_role: categoryRole,
  920:         source: projectionSource,
  921:         confidence,
  922:         metadata_json: {
  923:           processorName,
  924:           bridgeSource,
  925:           valueObjectInstanceId,
  926:           oldActivityEventValueObjectInstanceLinkId: oldVoiLinkId,
  927:           activityEventValueObjectLinkId,
  928:           mapper: categoryMetadata.mapper,

----- match pattern: metadata | lines 922-934 -----
  922:         metadata_json: {
  923:           processorName,
  924:           bridgeSource,
  925:           valueObjectInstanceId,
  926:           oldActivityEventValueObjectInstanceLinkId: oldVoiLinkId,
  927:           activityEventValueObjectLinkId,
  928:           mapper: categoryMetadata.mapper,
  929:           mapperVersion: categoryMetadata.mapperVersion,
  930:           controlledRule: categoryMetadata.controlledRule,
  931:           classification: {
  932:             classificationId: categoryMetadata.classificationId,
  933:             classificationRole: categoryMetadata.classificationRole,
  934:             contextId: categoryMetadata.contextId,

----- match pattern: metadata | lines 923-935 -----
  923:           processorName,
  924:           bridgeSource,
  925:           valueObjectInstanceId,
  926:           oldActivityEventValueObjectInstanceLinkId: oldVoiLinkId,
  927:           activityEventValueObjectLinkId,
  928:           mapper: categoryMetadata.mapper,
  929:           mapperVersion: categoryMetadata.mapperVersion,
  930:           controlledRule: categoryMetadata.controlledRule,
  931:           classification: {
  932:             classificationId: categoryMetadata.classificationId,
  933:             classificationRole: categoryMetadata.classificationRole,
  934:             contextId: categoryMetadata.contextId,
  935:             contextCode: categoryMetadata.contextCode,

----- match pattern: metadata | lines 924-936 -----
  924:           bridgeSource,
  925:           valueObjectInstanceId,
  926:           oldActivityEventValueObjectInstanceLinkId: oldVoiLinkId,
  927:           activityEventValueObjectLinkId,
  928:           mapper: categoryMetadata.mapper,
  929:           mapperVersion: categoryMetadata.mapperVersion,
  930:           controlledRule: categoryMetadata.controlledRule,
  931:           classification: {
  932:             classificationId: categoryMetadata.classificationId,
  933:             classificationRole: categoryMetadata.classificationRole,
  934:             contextId: categoryMetadata.contextId,
  935:             contextCode: categoryMetadata.contextCode,
  936:             contextName: categoryMetadata.contextName,

----- match pattern: classification | lines 925-937 -----
  925:           valueObjectInstanceId,
  926:           oldActivityEventValueObjectInstanceLinkId: oldVoiLinkId,
  927:           activityEventValueObjectLinkId,
  928:           mapper: categoryMetadata.mapper,
  929:           mapperVersion: categoryMetadata.mapperVersion,
  930:           controlledRule: categoryMetadata.controlledRule,
  931:           classification: {
  932:             classificationId: categoryMetadata.classificationId,
  933:             classificationRole: categoryMetadata.classificationRole,
  934:             contextId: categoryMetadata.contextId,
  935:             contextCode: categoryMetadata.contextCode,
  936:             contextName: categoryMetadata.contextName,
  937:             objectTypeId: categoryMetadata.objectTypeId,

----- match pattern: classification | lines 926-938 -----
  926:           oldActivityEventValueObjectInstanceLinkId: oldVoiLinkId,
  927:           activityEventValueObjectLinkId,
  928:           mapper: categoryMetadata.mapper,
  929:           mapperVersion: categoryMetadata.mapperVersion,
  930:           controlledRule: categoryMetadata.controlledRule,
  931:           classification: {
  932:             classificationId: categoryMetadata.classificationId,
  933:             classificationRole: categoryMetadata.classificationRole,
  934:             contextId: categoryMetadata.contextId,
  935:             contextCode: categoryMetadata.contextCode,
  936:             contextName: categoryMetadata.contextName,
  937:             objectTypeId: categoryMetadata.objectTypeId,
  938:             objectTypeCode: categoryMetadata.objectTypeCode,

----- match pattern: classification | lines 927-939 -----
  927:           activityEventValueObjectLinkId,
  928:           mapper: categoryMetadata.mapper,
  929:           mapperVersion: categoryMetadata.mapperVersion,
  930:           controlledRule: categoryMetadata.controlledRule,
  931:           classification: {
  932:             classificationId: categoryMetadata.classificationId,
  933:             classificationRole: categoryMetadata.classificationRole,
  934:             contextId: categoryMetadata.contextId,
  935:             contextCode: categoryMetadata.contextCode,
  936:             contextName: categoryMetadata.contextName,
  937:             objectTypeId: categoryMetadata.objectTypeId,
  938:             objectTypeCode: categoryMetadata.objectTypeCode,
  939:             objectTypeName: categoryMetadata.objectTypeName,

----- match pattern: metadata | lines 928-940 -----
  928:           mapper: categoryMetadata.mapper,
  929:           mapperVersion: categoryMetadata.mapperVersion,
  930:           controlledRule: categoryMetadata.controlledRule,
  931:           classification: {
  932:             classificationId: categoryMetadata.classificationId,
  933:             classificationRole: categoryMetadata.classificationRole,
  934:             contextId: categoryMetadata.contextId,
  935:             contextCode: categoryMetadata.contextCode,
  936:             contextName: categoryMetadata.contextName,
  937:             objectTypeId: categoryMetadata.objectTypeId,
  938:             objectTypeCode: categoryMetadata.objectTypeCode,
  939:             objectTypeName: categoryMetadata.objectTypeName,
  940:             actionTypeId: categoryMetadata.actionTypeId,

----- match pattern: metadata | lines 929-941 -----
  929:           mapperVersion: categoryMetadata.mapperVersion,
  930:           controlledRule: categoryMetadata.controlledRule,
  931:           classification: {
  932:             classificationId: categoryMetadata.classificationId,
  933:             classificationRole: categoryMetadata.classificationRole,
  934:             contextId: categoryMetadata.contextId,
  935:             contextCode: categoryMetadata.contextCode,
  936:             contextName: categoryMetadata.contextName,
  937:             objectTypeId: categoryMetadata.objectTypeId,
  938:             objectTypeCode: categoryMetadata.objectTypeCode,
  939:             objectTypeName: categoryMetadata.objectTypeName,
  940:             actionTypeId: categoryMetadata.actionTypeId,
  941:             actionTypeCode: categoryMetadata.actionTypeCode,

----- match pattern: metadata | lines 930-942 -----
  930:           controlledRule: categoryMetadata.controlledRule,
  931:           classification: {
  932:             classificationId: categoryMetadata.classificationId,
  933:             classificationRole: categoryMetadata.classificationRole,
  934:             contextId: categoryMetadata.contextId,
  935:             contextCode: categoryMetadata.contextCode,
  936:             contextName: categoryMetadata.contextName,
  937:             objectTypeId: categoryMetadata.objectTypeId,
  938:             objectTypeCode: categoryMetadata.objectTypeCode,
  939:             objectTypeName: categoryMetadata.objectTypeName,
  940:             actionTypeId: categoryMetadata.actionTypeId,
  941:             actionTypeCode: categoryMetadata.actionTypeCode,
  942:             actionTypeName: categoryMetadata.actionTypeName,

----- match pattern: metadata | lines 931-943 -----
  931:           classification: {
  932:             classificationId: categoryMetadata.classificationId,
  933:             classificationRole: categoryMetadata.classificationRole,
  934:             contextId: categoryMetadata.contextId,
  935:             contextCode: categoryMetadata.contextCode,
  936:             contextName: categoryMetadata.contextName,
  937:             objectTypeId: categoryMetadata.objectTypeId,
  938:             objectTypeCode: categoryMetadata.objectTypeCode,
  939:             objectTypeName: categoryMetadata.objectTypeName,
  940:             actionTypeId: categoryMetadata.actionTypeId,
  941:             actionTypeCode: categoryMetadata.actionTypeCode,
  942:             actionTypeName: categoryMetadata.actionTypeName,
  943:             contextualCategoryId: categoryMetadata.contextualCategoryId,

----- match pattern: metadata | lines 932-944 -----
  932:             classificationId: categoryMetadata.classificationId,
  933:             classificationRole: categoryMetadata.classificationRole,
  934:             contextId: categoryMetadata.contextId,
  935:             contextCode: categoryMetadata.contextCode,
  936:             contextName: categoryMetadata.contextName,
  937:             objectTypeId: categoryMetadata.objectTypeId,
  938:             objectTypeCode: categoryMetadata.objectTypeCode,
  939:             objectTypeName: categoryMetadata.objectTypeName,
  940:             actionTypeId: categoryMetadata.actionTypeId,
  941:             actionTypeCode: categoryMetadata.actionTypeCode,
  942:             actionTypeName: categoryMetadata.actionTypeName,
  943:             contextualCategoryId: categoryMetadata.contextualCategoryId,
  944:             contextualCategorySlug: categoryMetadata.contextualCategorySlug,

----- match pattern: metadata | lines 933-945 -----
  933:             classificationRole: categoryMetadata.classificationRole,
  934:             contextId: categoryMetadata.contextId,
  935:             contextCode: categoryMetadata.contextCode,
  936:             contextName: categoryMetadata.contextName,
  937:             objectTypeId: categoryMetadata.objectTypeId,
  938:             objectTypeCode: categoryMetadata.objectTypeCode,
  939:             objectTypeName: categoryMetadata.objectTypeName,
  940:             actionTypeId: categoryMetadata.actionTypeId,
  941:             actionTypeCode: categoryMetadata.actionTypeCode,
  942:             actionTypeName: categoryMetadata.actionTypeName,
  943:             contextualCategoryId: categoryMetadata.contextualCategoryId,
  944:             contextualCategorySlug: categoryMetadata.contextualCategorySlug,
  945:             contextualCategoryName: categoryMetadata.contextualCategoryName,

----- match pattern: metadata | lines 934-946 -----
  934:             contextId: categoryMetadata.contextId,
  935:             contextCode: categoryMetadata.contextCode,
  936:             contextName: categoryMetadata.contextName,
  937:             objectTypeId: categoryMetadata.objectTypeId,
  938:             objectTypeCode: categoryMetadata.objectTypeCode,
  939:             objectTypeName: categoryMetadata.objectTypeName,
  940:             actionTypeId: categoryMetadata.actionTypeId,
  941:             actionTypeCode: categoryMetadata.actionTypeCode,
  942:             actionTypeName: categoryMetadata.actionTypeName,
  943:             contextualCategoryId: categoryMetadata.contextualCategoryId,
  944:             contextualCategorySlug: categoryMetadata.contextualCategorySlug,
  945:             contextualCategoryName: categoryMetadata.contextualCategoryName,
  946:           },

----- match pattern: metadata | lines 935-947 -----
  935:             contextCode: categoryMetadata.contextCode,
  936:             contextName: categoryMetadata.contextName,
  937:             objectTypeId: categoryMetadata.objectTypeId,
  938:             objectTypeCode: categoryMetadata.objectTypeCode,
  939:             objectTypeName: categoryMetadata.objectTypeName,
  940:             actionTypeId: categoryMetadata.actionTypeId,
  941:             actionTypeCode: categoryMetadata.actionTypeCode,
  942:             actionTypeName: categoryMetadata.actionTypeName,
  943:             contextualCategoryId: categoryMetadata.contextualCategoryId,
  944:             contextualCategorySlug: categoryMetadata.contextualCategorySlug,
  945:             contextualCategoryName: categoryMetadata.contextualCategoryName,
  946:           },
  947:           resolvedContextualCategory: {

----- match pattern: metadata | lines 936-948 -----
  936:             contextName: categoryMetadata.contextName,
  937:             objectTypeId: categoryMetadata.objectTypeId,
  938:             objectTypeCode: categoryMetadata.objectTypeCode,
  939:             objectTypeName: categoryMetadata.objectTypeName,
  940:             actionTypeId: categoryMetadata.actionTypeId,
  941:             actionTypeCode: categoryMetadata.actionTypeCode,
  942:             actionTypeName: categoryMetadata.actionTypeName,
  943:             contextualCategoryId: categoryMetadata.contextualCategoryId,
  944:             contextualCategorySlug: categoryMetadata.contextualCategorySlug,
  945:             contextualCategoryName: categoryMetadata.contextualCategoryName,
  946:           },
  947:           resolvedContextualCategory: {
  948:             id: categoryLookup.category.id,

----- match pattern: contextualCategoryId | lines 937-949 -----
  937:             objectTypeId: categoryMetadata.objectTypeId,
  938:             objectTypeCode: categoryMetadata.objectTypeCode,
  939:             objectTypeName: categoryMetadata.objectTypeName,
  940:             actionTypeId: categoryMetadata.actionTypeId,
  941:             actionTypeCode: categoryMetadata.actionTypeCode,
  942:             actionTypeName: categoryMetadata.actionTypeName,
  943:             contextualCategoryId: categoryMetadata.contextualCategoryId,
  944:             contextualCategorySlug: categoryMetadata.contextualCategorySlug,
  945:             contextualCategoryName: categoryMetadata.contextualCategoryName,
  946:           },
  947:           resolvedContextualCategory: {
  948:             id: categoryLookup.category.id,
  949:             slug: categoryLookup.category.slug,

----- match pattern: metadata | lines 938-950 -----
  938:             objectTypeCode: categoryMetadata.objectTypeCode,
  939:             objectTypeName: categoryMetadata.objectTypeName,
  940:             actionTypeId: categoryMetadata.actionTypeId,
  941:             actionTypeCode: categoryMetadata.actionTypeCode,
  942:             actionTypeName: categoryMetadata.actionTypeName,
  943:             contextualCategoryId: categoryMetadata.contextualCategoryId,
  944:             contextualCategorySlug: categoryMetadata.contextualCategorySlug,
  945:             contextualCategoryName: categoryMetadata.contextualCategoryName,
  946:           },
  947:           resolvedContextualCategory: {
  948:             id: categoryLookup.category.id,
  949:             slug: categoryLookup.category.slug,
  950:             name: categoryLookup.category.name,

----- match pattern: metadata | lines 939-951 -----
  939:             objectTypeName: categoryMetadata.objectTypeName,
  940:             actionTypeId: categoryMetadata.actionTypeId,
  941:             actionTypeCode: categoryMetadata.actionTypeCode,
  942:             actionTypeName: categoryMetadata.actionTypeName,
  943:             contextualCategoryId: categoryMetadata.contextualCategoryId,
  944:             contextualCategorySlug: categoryMetadata.contextualCategorySlug,
  945:             contextualCategoryName: categoryMetadata.contextualCategoryName,
  946:           },
  947:           resolvedContextualCategory: {
  948:             id: categoryLookup.category.id,
  949:             slug: categoryLookup.category.slug,
  950:             name: categoryLookup.category.name,
  951:             status: categoryLookup.category.status,

----- match pattern: value_object_category_links | lines 949-961 -----
  949:             slug: categoryLookup.category.slug,
  950:             name: categoryLookup.category.name,
  951:             status: categoryLookup.category.status,
  952:             isActive: categoryLookup.category.is_active,
  953:           },
  954:           p492: {
  955:             projection: "value_object_category_links",
  956:             mode: "runtime_category_link_from_bridge_mapping_metadata",
  957:             sourceEventId: event.id,
  958:             sourceProjectionId: activityEventValueObjectLinkId,
  959:           },
  960:         },
  961:         updated_at: new Date().toISOString(),

----- match pattern: metadata | lines 950-962 -----
  950:             name: categoryLookup.category.name,
  951:             status: categoryLookup.category.status,
  952:             isActive: categoryLookup.category.is_active,
  953:           },
  954:           p492: {
  955:             projection: "value_object_category_links",
  956:             mode: "runtime_category_link_from_bridge_mapping_metadata",
  957:             sourceEventId: event.id,
  958:             sourceProjectionId: activityEventValueObjectLinkId,
  959:           },
  960:         },
  961:         updated_at: new Date().toISOString(),
  962:       },

----- match pattern: valueObjectCategoryLinkId | lines 966-978 -----
  966:     )
  967:     .select("id")
  968:     .single();
  969: 
  970:   if (error || !data) {
  971:     return {
  972:       valueObjectCategoryLinkId: null,
  973:       errorMessage: error?.message ?? "failed_to_upsert_value_object_category_link",
  974:     };
  975:   }
  976: 
  977:   return {
  978:     valueObjectCategoryLinkId: (data as { id: string }).id,

----- match pattern: valueObjectCategoryLinkId | lines 972-984 -----
  972:       valueObjectCategoryLinkId: null,
  973:       errorMessage: error?.message ?? "failed_to_upsert_value_object_category_link",
  974:     };
  975:   }
  976: 
  977:   return {
  978:     valueObjectCategoryLinkId: (data as { id: string }).id,
  979:     errorMessage: null,
  980:   };
  981: }
  982: 
  983: export async function processValueObjectBridgeForActivityEvent(
  984:   input: ProcessValueObjectBridgeInput

----- match pattern: stateDeltaId | lines 1046-1058 -----
 1046:     );
 1047: 
 1048:     const createdItem: ValueObjectBridgeCreatedItem = {
 1049:       valueObjectId: mapping.valueObjectId,
 1050:       valueObjectInstanceId: null,
 1051:       linkId: null,
 1052:       stateDeltaId: null,
 1053:       aggregateId: null,
 1054:       snapshotId: null,
 1055:       activityEventValueObjectLinkId: null,
 1056:       usageAggregateId: null,
 1057:       v42ProjectionError: null,
 1058:       valueObjectCategoryLinkId: null,

----- match pattern: usageAggregateId | lines 1050-1062 -----
 1050:       valueObjectInstanceId: null,
 1051:       linkId: null,
 1052:       stateDeltaId: null,
 1053:       aggregateId: null,
 1054:       snapshotId: null,
 1055:       activityEventValueObjectLinkId: null,
 1056:       usageAggregateId: null,
 1057:       v42ProjectionError: null,
 1058:       valueObjectCategoryLinkId: null,
 1059:       valueObjectCategoryLinkError: null,
 1060:       skipped: false,
 1061:       skipReason: null,
 1062:     };

----- match pattern: valueObjectCategoryLinkId | lines 1052-1064 -----
 1052:       stateDeltaId: null,
 1053:       aggregateId: null,
 1054:       snapshotId: null,
 1055:       activityEventValueObjectLinkId: null,
 1056:       usageAggregateId: null,
 1057:       v42ProjectionError: null,
 1058:       valueObjectCategoryLinkId: null,
 1059:       valueObjectCategoryLinkError: null,
 1060:       skipped: false,
 1061:       skipReason: null,
 1062:     };
 1063: 
 1064:     if (

----- match pattern: valueObjectCategoryLinkError | lines 1053-1065 -----
 1053:       aggregateId: null,
 1054:       snapshotId: null,
 1055:       activityEventValueObjectLinkId: null,
 1056:       usageAggregateId: null,
 1057:       v42ProjectionError: null,
 1058:       valueObjectCategoryLinkId: null,
 1059:       valueObjectCategoryLinkError: null,
 1060:       skipped: false,
 1061:       skipReason: null,
 1062:     };
 1063: 
 1064:     if (
 1065:       mapping.deltaValueNumeric === null &&

(truncated after 100 context blocks)
```

## Snippets: src/app/api/activity/debug/free-text-value-object-test/route.ts

```text

----- match pattern: valueObjectBridge | lines 3-15 -----
    3: 
    4: import {
    5:   ACTIVITY_RECORDING_DISABLED_MESSAGE,
    6:   ACTIVITY_RECORDING_ENABLED,
    7: } from "../../../../../../lib/activity/activityRecordingConfig";
    8: import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
    9: import { processActivityValueObjectBridge } from "../../../../../../lib/activity/activityValueObjectLifecycle";
   10: import { safeCreateActivityProcessingLog } from "../../../../../../lib/activity/activityProcessingLogs";
   11: import { supabase } from "../../../../../../lib/supabase";
   12: 
   13: export const dynamic = "force-dynamic";
   14: 
   15: type FreeTextValueObjectTestBody = {

----- match pattern: free-text-value-object-test | lines 131-143 -----
  131:   };
  132: }
  133: 
  134: export async function GET() {
  135:   return NextResponse.json({
  136:     ok: true,
  137:     endpoint: "/api/activity/debug/free-text-value-object-test",
  138:     enabled: ACTIVITY_RECORDING_ENABLED,
  139:     status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
  140:     message: ACTIVITY_RECORDING_ENABLED
  141:       ? "Debug-only endpoint for testing completed free-text Activity Event -> Value Object fallback mapping."
  142:       : ACTIVITY_RECORDING_DISABLED_MESSAGE,
  143:     example: {

----- match pattern: walked to work | lines 138-150 -----
  138:     enabled: ACTIVITY_RECORDING_ENABLED,
  139:     status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
  140:     message: ACTIVITY_RECORDING_ENABLED
  141:       ? "Debug-only endpoint for testing completed free-text Activity Event -> Value Object fallback mapping."
  142:       : ACTIVITY_RECORDING_DISABLED_MESSAGE,
  143:     example: {
  144:       inputText: "walked to work for 15 minutes",
  145:       durationMinutes: 15,
  146:       title: "Walked to work",
  147:     },
  148:   });
  149: }
  150: 

----- match pattern: walked to work | lines 140-152 -----
  140:     message: ACTIVITY_RECORDING_ENABLED
  141:       ? "Debug-only endpoint for testing completed free-text Activity Event -> Value Object fallback mapping."
  142:       : ACTIVITY_RECORDING_DISABLED_MESSAGE,
  143:     example: {
  144:       inputText: "walked to work for 15 minutes",
  145:       durationMinutes: 15,
  146:       title: "Walked to work",
  147:     },
  148:   });
  149: }
  150: 
  151: export async function POST(request: Request) {
  152:   if (!ACTIVITY_RECORDING_ENABLED) {

----- match pattern: processingRunId | lines 206-218 -----
  206:         error: timing.error,
  207:       },
  208:       { status: 400 }
  209:     );
  210:   }
  211: 
  212:   const processingRunId = randomUUID();
  213:   const processingStartedAt = new Date();
  214:   const nowIso = new Date().toISOString();
  215: 
  216:   const { data: createdEventData, error: createError } = await supabase
  217:     .from("activity_events")
  218:     .insert({

----- match pattern: activity_template_id | lines 218-230 -----
  218:     .insert({
  219:       user_id: appUser.id,
  220:       performed_by_actor_id: personActor.id,
  221:       acting_as_actor_id: personActor.id,
  222:       acting_for_actor_id: null,
  223:       activity_type_id: null,
  224:       activity_template_id: null,
  225:       template_id: null,
  226:       event_code: null,
  227:       input_text: inputText,
  228:       title: asString(body.title) ?? "Free-text activity test",
  229:       description: asString(body.description),
  230:       started_at: timing.startedAt,

----- match pattern: duration_minutes | lines 226-238 -----
  226:       event_code: null,
  227:       input_text: inputText,
  228:       title: asString(body.title) ?? "Free-text activity test",
  229:       description: asString(body.description),
  230:       started_at: timing.startedAt,
  231:       ended_at: timing.endedAt,
  232:       duration_minutes: timing.durationMinutes,
  233:       source: "manual_chat",
  234:       status: "completed",
  235:       privacy_scope: "private",
  236:       processing_status: "processed",
  237:       metadata_json: {
  238:         parser: "debug_free_text_value_object_test_v1",

----- match pattern: manual_chat | lines 227-239 -----
  227:       input_text: inputText,
  228:       title: asString(body.title) ?? "Free-text activity test",
  229:       description: asString(body.description),
  230:       started_at: timing.startedAt,
  231:       ended_at: timing.endedAt,
  232:       duration_minutes: timing.durationMinutes,
  233:       source: "manual_chat",
  234:       status: "completed",
  235:       privacy_scope: "private",
  236:       processing_status: "processed",
  237:       metadata_json: {
  238:         parser: "debug_free_text_value_object_test_v1",
  239:         p4Step: "P4.10.0-C7",

----- match pattern: P4.10.0-C7 | lines 233-245 -----
  233:       source: "manual_chat",
  234:       status: "completed",
  235:       privacy_scope: "private",
  236:       processing_status: "processed",
  237:       metadata_json: {
  238:         parser: "debug_free_text_value_object_test_v1",
  239:         p4Step: "P4.10.0-C7",
  240:         freeTextValueObjectTest: true,
  241:         aiUsed: false,
  242:         createdAt: nowIso,
  243:       },
  244:     })
  245:     .select()

----- match pattern: valueObjectBridge | lines 254-266 -----
  254:       { status: 500 }
  255:     );
  256:   }
  257: 
  258:   const createdEvent = createdEventData as { id: string };
  259: 
  260:   const bridgeResult = await processActivityValueObjectBridge({
  261:     supabase,
  262:     eventId: createdEvent.id,
  263:     processorName: "activity_debug_free_text_value_object_test",
  264:     allowNonCompletedEvent: false,
  265:   });
  266: 

----- match pattern: processingRunId | lines 265-277 -----
  265:   });
  266: 
  267:   const logResult = await safeCreateActivityProcessingLog({
  268:     userId: appUser.id,
  269:     rawSignalId: null,
  270:     activityEventId: createdEvent.id,
  271:     processingRunId,
  272:     processorName: "activity_debug_free_text_value_object_test",
  273:     processingStage: "finalize",
  274:     processingStatus: bridgeResult.ok
  275:       ? bridgeResult.skipped
  276:         ? "skipped"
  277:         : "completed"

----- match pattern: free-text-value-object-test | lines 290-302 -----
  290:       mappingSkipped: bridgeResult.mappingResult?.skipped ?? null,
  291:       mappingsCount: bridgeResult.mappingResult?.mappings.length ?? 0,
  292:       bridgeCreatedCount: bridgeResult.bridgeResult?.created.length ?? 0,
  293:       errors: bridgeResult.errors,
  294:     },
  295:     metadata: {
  296:       endpoint: "/api/activity/debug/free-text-value-object-test",
  297:       p4Step: "P4.10.0-C7",
  298:     },
  299:     startedAt: processingStartedAt.toISOString(),
  300:     finishedAt: new Date().toISOString(),
  301:     durationMs: new Date().getTime() - processingStartedAt.getTime(),
  302:   });

----- match pattern: P4.10.0-C7 | lines 291-303 -----
  291:       mappingsCount: bridgeResult.mappingResult?.mappings.length ?? 0,
  292:       bridgeCreatedCount: bridgeResult.bridgeResult?.created.length ?? 0,
  293:       errors: bridgeResult.errors,
  294:     },
  295:     metadata: {
  296:       endpoint: "/api/activity/debug/free-text-value-object-test",
  297:       p4Step: "P4.10.0-C7",
  298:     },
  299:     startedAt: processingStartedAt.toISOString(),
  300:     finishedAt: new Date().toISOString(),
  301:     durationMs: new Date().getTime() - processingStartedAt.getTime(),
  302:   });
  303: 

----- match pattern: created_and_bridge_processed | lines 303-315 -----
  303: 
  304:   return NextResponse.json({
  305:     ok: bridgeResult.ok,
  306:     status: bridgeResult.ok
  307:       ? bridgeResult.skipped
  308:         ? "created_but_bridge_skipped"
  309:         : "created_and_bridge_processed"
  310:       : "created_but_bridge_failed",
  311:     event: createdEventData,
  312:     valueObjectBridge: {
  313:       ok: bridgeResult.ok,
  314:       skipped: bridgeResult.skipped,
  315:       skipReason: bridgeResult.skipReason,

----- match pattern: valueObjectBridge | lines 306-318 -----
  306:     status: bridgeResult.ok
  307:       ? bridgeResult.skipped
  308:         ? "created_but_bridge_skipped"
  309:         : "created_and_bridge_processed"
  310:       : "created_but_bridge_failed",
  311:     event: createdEventData,
  312:     valueObjectBridge: {
  313:       ok: bridgeResult.ok,
  314:       skipped: bridgeResult.skipped,
  315:       skipReason: bridgeResult.skipReason,
  316:       errors: bridgeResult.errors,
  317:       mapping: bridgeResult.mappingResult
  318:         ? {

----- match pattern: processingRunId | lines 335-347 -----
  335:             created: bridgeResult.bridgeResult.created,
  336:             errors: bridgeResult.bridgeResult.errors,
  337:           }
  338:         : null,
  339:     },
  340:     processingLogs: {
  341:       processingRunId,
  342:       valueObjectBridge: {
  343:         ok: logResult.ok,
  344:         error: logResult.error,
  345:         logId: logResult.log?.id ?? null,
  346:       },
  347:     },

----- match pattern: valueObjectBridge | lines 336-348 -----
  336:             errors: bridgeResult.bridgeResult.errors,
  337:           }
  338:         : null,
  339:     },
  340:     processingLogs: {
  341:       processingRunId,
  342:       valueObjectBridge: {
  343:         ok: logResult.ok,
  344:         error: logResult.error,
  345:         logId: logResult.log?.id ?? null,
  346:       },
  347:     },
  348:   });
```

## Snippets: lib/supabase.ts

```text

----- match pattern: createClient | lines 1-5 -----
    1: import { createClient } from "@supabase/supabase-js";
    2: 
    3: const supabaseUrl = process.env.SUPABASE_URL;
    4: const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    5: 

----- match pattern: SUPABASE | lines 1-7 -----
    1: import { createClient } from "@supabase/supabase-js";
    2: 
    3: const supabaseUrl = process.env.SUPABASE_URL;
    4: const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    5: 
    6: if (!supabaseUrl) {
    7:   throw new Error("Missing SUPABASE_URL");

----- match pattern: service | lines 1-8 -----
    1: import { createClient } from "@supabase/supabase-js";
    2: 
    3: const supabaseUrl = process.env.SUPABASE_URL;
    4: const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    5: 
    6: if (!supabaseUrl) {
    7:   throw new Error("Missing SUPABASE_URL");
    8: }

----- match pattern: SUPABASE | lines 2-10 -----
    2: 
    3: const supabaseUrl = process.env.SUPABASE_URL;
    4: const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    5: 
    6: if (!supabaseUrl) {
    7:   throw new Error("Missing SUPABASE_URL");
    8: }
    9: 
   10: if (!supabaseServiceRoleKey) {

----- match pattern: SUPABASE | lines 3-11 -----
    3: const supabaseUrl = process.env.SUPABASE_URL;
    4: const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    5: 
    6: if (!supabaseUrl) {
    7:   throw new Error("Missing SUPABASE_URL");
    8: }
    9: 
   10: if (!supabaseServiceRoleKey) {
   11:   throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

----- match pattern: service | lines 6-14 -----
    6: if (!supabaseUrl) {
    7:   throw new Error("Missing SUPABASE_URL");
    8: }
    9: 
   10: if (!supabaseServiceRoleKey) {
   11:   throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
   12: }
   13: 
   14: export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

----- match pattern: service | lines 7-14 -----
    7:   throw new Error("Missing SUPABASE_URL");
    8: }
    9: 
   10: if (!supabaseServiceRoleKey) {
   11:   throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
   12: }
   13: 
   14: export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

----- match pattern: createClient | lines 10-14 -----
   10: if (!supabaseServiceRoleKey) {
   11:   throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
   12: }
   13: 
   14: export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
```

## Cross-file focused search summary


### Pattern: category_derivation_runs

```text
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:16: ('category_derivation_runs'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:39: ('category_derivation_runs', 'id'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:40: ('category_derivation_runs', 'activity_event_id'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:41: ('category_derivation_runs', 'processor_version'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:42: ('category_derivation_runs', 'rule_version'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:43: ('category_derivation_runs', 'model_name'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:44: ('category_derivation_runs', 'prompt_version'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:45: ('category_derivation_runs', 'status'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:46: ('category_derivation_runs', 'confidence'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:47: ('category_derivation_runs', 'needs_user_confirmation'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:48: ('category_derivation_runs', 'input_json'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:49: ('category_derivation_runs', 'output_json'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:88: tablename in ('contextual_categories', 'category_derivation_runs', 'activity_category_derivations')
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:89: or indexname like 'idx_category_derivation_runs_%'
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:53: -- 3. category_derivation_runs
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:55: create table if not exists public.category_derivation_runs (
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:76: constraint category_derivation_runs_confidence_range
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:80: comment on table public.category_derivation_runs is 'Versioned semantic interpretation runs for Activity Events. Stores rule/model/prompt versions and input/output JSON.';
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:82: create index if not exists idx_category_derivation_runs_activity_event_id
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:83: on public.category_derivation_runs (activity_event_id);
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:85: create index if not exists idx_category_derivation_runs_status
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:86: on public.category_derivation_runs (status);
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:88: create index if not exists idx_category_derivation_runs_created_at_desc
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:89: on public.category_derivation_runs (created_at desc);
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:91: create index if not exists idx_category_derivation_runs_processor_version
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:92: on public.category_derivation_runs (processor_version);
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:94: create index if not exists idx_category_derivation_runs_model_name
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:95: on public.category_derivation_runs (model_name);
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:97: create index if not exists idx_category_derivation_runs_needs_user_confirmation
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:98: on public.category_derivation_runs (needs_user_confirmation);
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:105: derivation_run_id uuid null references public.category_derivation_runs(id) on delete set null,
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:152: -- category_derivation_runs.output_json is enough for v1 interpretation JSON.
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:163: -- - category_derivation_runs exists
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-implementation-plan-c8-i.md:117: - create one category_derivation_runs row
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-implementation-plan-c8-i.md:138: C8-N: add persistDerivations.ts for category_derivation_runs and activity_category_derivations.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-implementation-plan-c8-i.md:150: - category_derivation_runs row
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:902: 76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2487: 76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2496: 76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2504: 76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2511: 76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2698: 76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3269: 76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:4128: 2. Do category_derivation_runs or similar tables already exist?
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-layer-v1.md:76: Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-live-migration-result-c8-g3.md:30: - category_derivation_runs: exists_ok true
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-live-migration-result-c8-g3.md:37: - category_derivation_runs expected columns exist
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-live-migration-result-c8-g3.md:42: - category_derivation_runs indexes exist
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-live-migration-result-c8-g3.md:57: - versioned category_derivation_runs
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-runtime-regression-c8-h2.md:80: The runtime Category Derivation Layer has not been implemented yet, so category_derivation_runs and activity_category_derivations are not expected to be populated by this debug route yet.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-schema-plan-c8-f.md:87: ## 6. New table: category_derivation_runs
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-schema-plan-c8-f.md:130: - derivation_run_id uuid nullable references category_derivation_runs(id) on delete set null
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-schema-plan-c8-f.md:162: For v1, category_derivation_runs.output_json can store interpretation JSON.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-schema-plan-c8-f.md:210: - category_derivation_runs exists
```

### Pattern: activity_category_derivations

```text
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:17: ('activity_category_derivations')
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:50: ('activity_category_derivations', 'id'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:51: ('activity_category_derivations', 'activity_event_id'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:52: ('activity_category_derivations', 'derivation_run_id'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:53: ('activity_category_derivations', 'category_id'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:54: ('activity_category_derivations', 'candidate_slug'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:55: ('activity_category_derivations', 'candidate_title'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:56: ('activity_category_derivations', 'semantic_layer'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:57: ('activity_category_derivations', 'category_type'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:58: ('activity_category_derivations', 'source'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:59: ('activity_category_derivations', 'confidence'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:60: ('activity_category_derivations', 'is_required'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:61: ('activity_category_derivations', 'is_confirmed'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:62: ('activity_category_derivations', 'needs_user_review'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:63: ('activity_category_derivations', 'is_rejected'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:64: ('activity_category_derivations', 'metadata_json')
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:88: tablename in ('contextual_categories', 'category_derivation_runs', 'activity_category_derivations')
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:90: or indexname like 'idx_activity_category_derivations_%'
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:100: -- 4. activity_category_derivations
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:102: create table if not exists public.activity_category_derivations (
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:120: constraint activity_category_derivations_confidence_range
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:124: comment on table public.activity_category_derivations is 'Category candidates and resolved categories derived from Activity Events.';
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:126: create index if not exists idx_activity_category_derivations_activity_event_id
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:127: on public.activity_category_derivations (activity_event_id);
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:129: create index if not exists idx_activity_category_derivations_derivation_run_id
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:130: on public.activity_category_derivations (derivation_run_id);
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:132: create index if not exists idx_activity_category_derivations_category_id
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:133: on public.activity_category_derivations (category_id);
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:135: create index if not exists idx_activity_category_derivations_candidate_slug
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:136: on public.activity_category_derivations (candidate_slug);
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:138: create index if not exists idx_activity_category_derivations_semantic_layer
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:139: on public.activity_category_derivations (semantic_layer);
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:141: create index if not exists idx_activity_category_derivations_source
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:142: on public.activity_category_derivations (source);
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:144: create index if not exists idx_activity_category_derivations_needs_user_review
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:145: on public.activity_category_derivations (needs_user_review);
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:147: create index if not exists idx_activity_category_derivations_is_rejected
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:148: on public.activity_category_derivations (is_rejected);
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:164: -- - activity_category_derivations exists
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-implementation-plan-c8-i.md:28: -> activity_category_derivations
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-implementation-plan-c8-i.md:119: - create activity_category_derivations rows for all candidates
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-implementation-plan-c8-i.md:138: C8-N: add persistDerivations.ts for category_derivation_runs and activity_category_derivations.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-implementation-plan-c8-i.md:151: - activity_category_derivations rows
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:902: 76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2065: 32:Pipeline: free text / app action -> raw Activity Event -> Category Derivation Run -> rule-based extractor -> optional structured AI classifier -> categoryCandidates[] -> resolver slug to category_id -> activity_category_derivations -> Value Object Bridge -> value_object_category_links -> activity_event_value_object_links -> aggregates / snapshots.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2068: 102:Expected rows: activity_event, category_derivation_run, activity_category_derivations, value_objects, value_object_category_links, activity_event_value_object_links, usage aggregates, daily aggregates, snapshots and processing logs.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2471: 32:Pipeline: free text / app action -> raw Activity Event -> Category Derivation Run -> rule-based extractor -> optional structured AI classifier -> categoryCandidates[] -> resolver slug to category_id -> activity_category_derivations -> Value Object Bridge -> value_object_category_links -> activity_event_value_object_links -> aggregates / snapshots.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2473: 102:Expected rows: activity_event, category_derivation_run, activity_category_derivations, value_objects, value_object_category_links, activity_event_value_object_links, usage aggregates, daily aggregates, snapshots and processing logs.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2486: 32:Pipeline: free text / app action -> raw Activity Event -> Category Derivation Run -> rule-based extractor -> optional structured AI classifier -> categoryCandidates[] -> resolver slug to category_id -> activity_category_derivations -> Value Object Bridge -> value_object_category_links -> activity_event_value_object_links -> aggregates / snapshots.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2487: 76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2488: 102:Expected rows: activity_event, category_derivation_run, activity_category_derivations, value_objects, value_object_category_links, activity_event_value_object_links, usage aggregates, daily aggregates, snapshots and processing logs.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2495: 32:Pipeline: free text / app action -> raw Activity Event -> Category Derivation Run -> rule-based extractor -> optional structured AI classifier -> categoryCandidates[] -> resolver slug to category_id -> activity_category_derivations -> Value Object Bridge -> value_object_category_links -> activity_event_value_object_links -> aggregates / snapshots.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2496: 76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2497: 102:Expected rows: activity_event, category_derivation_run, activity_category_derivations, value_objects, value_object_category_links, activity_event_value_object_links, usage aggregates, daily aggregates, snapshots and processing logs.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2504: 76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2511: 76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2698: 76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3269: 76:Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-layer-v1.md:32: Pipeline: free text / app action -> raw Activity Event -> Category Derivation Run -> rule-based extractor -> optional structured AI classifier -> categoryCandidates[] -> resolver slug to category_id -> activity_category_derivations -> Value Object Bridge -> value_object_category_links -> activity_event_value_object_links -> aggregates / snapshots.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-layer-v1.md:76: Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-layer-v1.md:102: Expected rows: activity_event, category_derivation_run, activity_category_derivations, value_objects, value_object_category_links, activity_event_value_object_links, usage aggregates, daily aggregates, snapshots and processing logs.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-live-migration-result-c8-g3.md:27: - activity_category_derivations: exists_ok true
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-live-migration-result-c8-g3.md:38: - activity_category_derivations expected columns exist
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-live-migration-result-c8-g3.md:43: - activity_category_derivations indexes exist
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-live-migration-result-c8-g3.md:58: - activity_category_derivations
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-runtime-regression-c8-h2.md:80: The runtime Category Derivation Layer has not been implemented yet, so category_derivation_runs and activity_category_derivations are not expected to be populated by this debug route yet.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-schema-plan-c8-f.md:41: -> activity_category_derivations
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-schema-plan-c8-f.md:121: ## 7. New table: activity_category_derivations
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-schema-plan-c8-f.md:211: - activity_category_derivations exists
```

### Pattern: value_object_category_links

```text
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G2_verify_category_derivation_schema.sql:14: ('value_object_category_links'),
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.10.0-C8-G_additive_category_derivation_schema.sql:156: -- Do not redesign value_object_category_links in this migration.
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:7: - create value_object_category_links;
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:92: CREATE TABLE IF NOT EXISTS public.value_object_category_links (
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:103: CONSTRAINT value_object_category_links_category_table_check
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:110: CONSTRAINT value_object_category_links_category_role_check
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:122: CONSTRAINT value_object_category_links_source_check
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:124: CONSTRAINT value_object_category_links_confidence_check
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:126: CONSTRAINT value_object_category_links_metadata_is_object_check
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:128: CONSTRAINT value_object_category_links_unique
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:132: CREATE INDEX IF NOT EXISTS idx_value_object_category_links_value_object_id
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:133: ON public.value_object_category_links(value_object_id);
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:135: CREATE INDEX IF NOT EXISTS idx_value_object_category_links_category
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:136: ON public.value_object_category_links(category_table, category_id);
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:138: CREATE INDEX IF NOT EXISTS idx_value_object_category_links_role
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:139: ON public.value_object_category_links(category_role);
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.0-A7_minimal_v4_2_value_object_foundation.sql:225: 'value_object_category_links',
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.13-A1_controlled_hierarchy_candidate_audit.sql:47: FROM public.value_object_category_links cl
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.13-A1_controlled_hierarchy_candidate_audit.sql:160: (SELECT count(*) FROM category_links) AS value_object_category_links_count,
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.13-A1_controlled_hierarchy_candidate_audit.sql:236: '03_value_object_category_links' AS section,
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.14-A1_value_object_identity_display_readiness_audit.sql:64: FROM public.value_object_category_links cl
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:3: Targeted verification after value_object_category_links runtime integration.
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:80: FROM public.value_object_category_links cl
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:106: FROM public.value_object_category_links cl
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:211: (SELECT count(*) FROM public.value_object_category_links) AS global_value_object_category_links_count,
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.2-A4_category_link_runtime_verification.sql:252: '05_value_object_category_links_for_target_value_object' AS section,
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:111: FROM public.value_object_category_links cl
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:144: FROM public.value_object_category_links cl
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:238: (SELECT count(*) FROM public.value_object_category_links) AS global_category_links_count
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:277: '05_value_object_category_links_for_target_value_object' AS section,
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.4-A1_object_cloud_read_audit.sql:14: value_object_category_links
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.4-A1_object_cloud_read_audit.sql:37: FROM public.value_object_category_links cl
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.4-A1_object_cloud_read_audit.sql:205: (SELECT count(*) FROM public.value_object_category_links) AS value_object_category_links_count,
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.5-A1_create_value_object_cloud_profiles_v1.sql:14: - value_object_category_links
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.5-A1_create_value_object_cloud_profiles_v1.sql:45: FROM public.value_object_category_links cl
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-A3_category_derived_vo_inventory_checkpoint.md:26: - value_object_category_links
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-A3_category_derived_vo_inventory_checkpoint.md:93: - value_object_category_links;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-B2_minimal_schema_v4_2_gap_analysis_checkpoint.md:27: - value_object_category_links
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-B2_minimal_schema_v4_2_gap_analysis_checkpoint.md:74: Confirmed live value_object_category_links model uses:
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C3_free_text_processor_runtime_inventory_checkpoint.md:74: - value_object_category_links
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C4_minimal_free_text_v1_design_decision.md:26: - it already handles value_object_category_links;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C4_minimal_free_text_v1_design_decision.md:120: - value_object_category_links
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C7-G_free_text_runtime_verification_checkpoint.md:102: - but value_object_category_links was not created for Walking to work.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A2_v4_2_gap_conclusion.md:43: - value_object_category_links
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:542: relation_type|exposure_minutes|parent_value_object_id|needs_user_review|entity_protocol|commercial_usage|value_object_category_links|activity_event_value_object_links
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A4_local_code_routes_inventory_conclusion.md:42: | value_object_category_links | 1 |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A4_local_code_routes_inventory_conclusion.md:172: 1. value_object_category_links
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A5_focused_live_schema_check_result.md:24: - value_object_category_links
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A6_minimal_additive_migration_plan.md:42: ## Migration part 2 — create value_object_category_links
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A7_live_migration_result.md:12: - public.value_object_category_links
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A7_live_migration_result.md:46: ## value_object_category_links
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A8_foundation_checkpoint.md:32: - value_object_category_links
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A8_foundation_checkpoint.md:79: 2. decide how to create value_object_category_links from contextual_categories
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A10_runtime_projection_checkpoint.md:88: P4.9.2 — connect value_object_category_links from reliable category/rubricator mapping.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A10_runtime_projection_checkpoint.md:95: - use existing classification metadata to populate value_object_category_links
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:12: - value_object_category_links
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:532: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 7 | - create value_object_category_links; |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:537: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 92 | CREATE TABLE IF NOT EXISTS public.value_object_category_links ( |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:541: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 103 | CONSTRAINT value_object_category_links_category_table_check |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:545: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 110 | CONSTRAINT value_object_category_links_category_role_check |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:547: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 122 | CONSTRAINT value_object_category_links_source_check |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:548: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 124 | CONSTRAINT value_object_category_links_confidence_check |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:549: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 126 | CONSTRAINT value_object_category_links_metadata_is_object_check |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:550: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 128 | CONSTRAINT value_object_category_links_unique |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:552: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 132 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_value_object_id |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:553: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 133 | ON public.value_object_category_links(value_object_id); |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:554: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 135 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_category |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:555: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 136 | ON public.value_object_category_links(category_table, category_id); |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:556: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 138 | CREATE INDEX IF NOT EXISTS idx_value_object_category_links_role |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:557: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 139 | ON public.value_object_category_links(category_role); |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:558: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 225 | 'value_object_category_links', |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:651: value_object_category_links|activity_event_value_object_links|value_object_usage_aggregates|exposure_minutes|parent_value_object_id|entity_protocol_characteristics_json|needs_user_review|category_origin_json|ui_visibility
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:659: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 7 | - create value_object_category_links; |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:686: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 92 | CREATE TABLE IF NOT EXISTS public.value_object_category_links ( |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:687: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 103 | CONSTRAINT value_object_category_links_category_table_check |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:688: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 110 | CONSTRAINT value_object_category_links_category_role_check |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:689: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 122 | CONSTRAINT value_object_category_links_source_check |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:690: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 124 | CONSTRAINT value_object_category_links_confidence_check |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:691: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 126 | CONSTRAINT value_object_category_links_metadata_is_object_check |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:692: | docs/sql/P4.9.0-A7_minimal_v4_2_value_object_foundation.sql | 128 | CONSTRAINT value_object_category_links_unique |
(truncated after 80 matches)
```

### Pattern: valueObjectCategoryLinkId

```text
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C7-G_free_text_runtime_verification_checkpoint.md:123: - explain why valueObjectCategoryLinkId is null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1226: 972:       valueObjectCategoryLinkId: null,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-implementation-plan-c8-i.md:14: - valueObjectCategoryLinkId is still null, which is expected before runtime Category Derivation implementation.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3542: 3553:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:152: valueObjectCategoryLinkId: string | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3564: 3575:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:861: valueObjectCategoryLinkId: string | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3567: 3578:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:881: valueObjectCategoryLinkId: null,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3571: 3582:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:893: valueObjectCategoryLinkId: null,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3574: 3585:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:900: valueObjectCategoryLinkId: null,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3607: 3618:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:972: valueObjectCategoryLinkId: null,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3609: 3620:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:978: valueObjectCategoryLinkId: (data as { id: string }).id,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3610: 3621:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1058: valueObjectCategoryLinkId: null,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3613: 3624:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1222: createdItem.valueObjectCategoryLinkId =
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3614: 3625:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1223: categoryLink.valueObjectCategoryLinkId;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3818: 713:.\lib\activity\valueObjectBridge.ts:152:   valueObjectCategoryLinkId: string | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3860: 756:.\lib\activity\valueObjectBridge.ts:972:       valueObjectCategoryLinkId: null,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3866: 762:.\lib\activity\valueObjectBridge.ts:978:     valueObjectCategoryLinkId: (data as { id: string }).id,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3946: 842:.\lib\activity\valueObjectBridge.ts:1058:       valueObjectCategoryLinkId: null,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-runtime-regression-c8-h2.md:74: valueObjectCategoryLinkId was null.
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:152: valueObjectCategoryLinkId: string | null;
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:861: valueObjectCategoryLinkId: string | null;
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:881: valueObjectCategoryLinkId: null,
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:893: valueObjectCategoryLinkId: null,
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:900: valueObjectCategoryLinkId: null,
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:972: valueObjectCategoryLinkId: null,
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:978: valueObjectCategoryLinkId: (data as { id: string }).id,
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1058: valueObjectCategoryLinkId: null,
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1222: createdItem.valueObjectCategoryLinkId =
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:1223: categoryLink.valueObjectCategoryLinkId;
```

### Pattern: contextualCategoryId

```text
C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:63: l.metadata_json #>> '{mappingMetadata,classification,contextualCategoryId}' AS contextual_category_id_text,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C7-G_free_text_runtime_verification_checkpoint.md:107: - check whether buildControlledMapping or bridge requires contextualCategoryId instead of slug;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:83: | lib/activity/activityRubricatorClassificationLifecycle.ts | 301 | .eq("contextual_category_id", input.contextualCategoryId) |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:89: | lib/activity/activityRubricatorClassificationLifecycle.ts | 555 | contextual_category_id: contextualCategoryId, |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:120: | lib/activity/rubricatorValueObjectMapper.ts | 387 | const contextualCategoryId = getString(row, "contextual_category_id"); |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:121: | lib/activity/rubricatorValueObjectMapper.ts | 394 | readLookupRow(supabase, "contextual_categories", contextualCategoryId), |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:124: | lib/objectAction/queries.ts | 197 | contextualCategoryId: row.contextual_category_id, |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:690: | lib/objectAction/queries.ts | 557 | const contextualCategoryIds = Array.from( |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:563: | lib/activity/activityRubricatorClassificationLifecycle.ts | 301 | .eq("contextual_category_id", input.contextualCategoryId) |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:572: | lib/activity/activityRubricatorClassificationLifecycle.ts | 555 | contextual_category_id: contextualCategoryId, |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:615: | lib/activity/rubricatorValueObjectMapper.ts | 387 | const contextualCategoryId = getString(row, "contextual_category_id"); |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:616: | lib/activity/rubricatorValueObjectMapper.ts | 394 | readLookupRow(supabase, "contextual_categories", contextualCategoryId), |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:619: | lib/objectAction/queries.ts | 197 | contextualCategoryId: row.contextual_category_id, |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:870: | lib/objectAction/queries.ts | 557 | const contextualCategoryIds = Array.from( |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:794: 39:   contextualCategoryId: string | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1142: 387:   const contextualCategoryId = getString(row, "contextual_category_id");
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1149: 394:       readLookupRow(supabase, "contextual_categories", contextualCategoryId),
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1165: 410:     contextualCategoryId,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:273: 269:   contextualCategoryId: string;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:307: 301:     .eq("contextual_category_id", input.contextualCategoryId)
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:324: 499:       contextualCategoryId,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:341: 555:         contextual_category_id: contextualCategoryId,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:375: 591:           contextualCategoryId,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:970: 39:   contextualCategoryId: string | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:987: 410:     contextualCategoryId,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1028: 62:   contextualCategoryId: string | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1130: 379:     contextualCategoryId: asString(classification.contextualCategoryId),
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1183: 918:         category_id: categoryMetadata.contextualCategoryId,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1211: 943:             contextualCategoryId: categoryMetadata.contextualCategoryId,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1413: 62:   contextualCategoryId: Uuid | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1430: 197:     contextualCategoryId: row.contextual_category_id,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1733: 362:   contextualCategoryId?: Uuid | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:4016: 72:     createdContextualCategoryId?: string;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:9074: 184:   createdContextualCategoryId?: string | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:9090: 184:   createdContextualCategoryId?: string | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:9100: 184:   createdContextualCategoryId?: string | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:9278: 619:     aiSuggestedContextualCategoryId:
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:11989: 160:   contextualCategoryId: string;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:12142: 861:         contextualCategoryId: currentCategoryRow.id,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:40: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategoryId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:49: The first implementation should use mapping.metadata.classification.contextualCategoryId inside lib/activity/valueObjectBridge.ts.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:38: - mapping.metadata.classification.contextualCategoryId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:59: - category_id = classification.contextualCategoryId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:24: - mapping.metadata.classification.contextualCategoryId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A5_category_link_runtime_checkpoint.md:14: Confirmed that p491 projection metadata contains contextualCategoryId, contextualCategorySlug, contextualCategoryName and classificationRole.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A5_category_link_runtime_checkpoint.md:35: - validates contextualCategoryId as UUID
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.3-A2_knee_template_runtime_verification_result.md:114: - contextualCategoryId: d6388dbf-94b0-4e7a-8716-ac71c986ae77
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.3-A3_broadened_runtime_verification_checkpoint.md:23: - there were no p491 rows with reliable contextualCategoryId missing p492 links;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-implementation-plan-c8-i.md:130: Do not remove existing contextualCategoryId logic before replacement is proven.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:499: 824:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:121: | lib/activity/rubricatorValueObjectMapper.ts | 394 | readLookupRow(supabase, "contextual_categories", contextualCategoryId), |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:528: 1218:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A1_runtime_writer_inventory.md:616: | lib/activity/rubricatorValueObjectMapper.ts | 394 | readLookupRow(supabase, "contextual_categories", contextualCategoryId), |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:539: 1372:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1149: 394:       readLookupRow(supabase, "contextual_categories", contextualCategoryId),
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:633: 3507:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:394: readLookupRow(supabase, "contextual_categories", contextualCategoryId),
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:774: 343:.\lib\activity\rubricatorValueObjectMapper.ts:394:       readLookupRow(supabase, "contextual_categories", contextualCategoryId),
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:778: 394:      readLookupRow(supabase, "contextual_categories", contextualCategoryId),
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:798: 121:| lib/activity/rubricatorValueObjectMapper.ts | 394 | readLookupRow(supabase, "contextual_categories", contextualCategoryId), |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:835: 616:| lib/activity/rubricatorValueObjectMapper.ts | 394 | readLookupRow(supabase, "contextual_categories", contextualCategoryId), |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:850: 1149:  394:       readLookupRow(supabase, "contextual_categories", contextualCategoryId),
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:910: 440:      readLookupRow(supabase, "contextual_categories", contextualCategoryId),
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2131: 2250:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:40: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategoryId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2233: 1420:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:40: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategoryId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2404: 40:- activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategoryId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3529: 2254:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:49: The first implementation should use mapping.metadata.classification.contextualCategoryId inside lib/activity/valueObjectBridge.ts.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3537: 3548:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:62: contextualCategoryId: string | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3552: 3563:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:379: contextualCategoryId: asString(classification.contextualCategoryId),
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3556: 3567:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:483: contextualCategoryId: string
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3559: 3570:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:491: .eq("id", contextualCategoryId)
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3566: 3577:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:879: if (!isUuid(categoryMetadata.contextualCategoryId)) {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3569: 3580:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:888: categoryMetadata.contextualCategoryId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3579: 3590:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:918: category_id: categoryMetadata.contextualCategoryId,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3595: 3606:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:943: contextualCategoryId: categoryMetadata.contextualCategoryId,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3728: 623:.\lib\activity\valueObjectBridge.ts:62:   contextualCategoryId: string | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:4063: ## Field: contextualCategoryId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:4067: 63:    l.metadata_json #>> '{mappingMetadata,classification,contextualCategoryId}' AS contextual_category_id_text,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:4070: 589:C:\Users\Admin\Documents\projects\gpt-app\docs\sql\P4.9.3-A2_knee_template_runtime_verification.sql:63: l.metadata_json #>> '{mappingMetadata,classification,contextualCategoryId}' AS contextual_category_id_text,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:4071: 786:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:83: | lib/activity/activityRubricatorClassificationLifecycle.ts | 301 | .eq("contextual_category_id", input.contextualCategoryId) |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:4072: 792:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:89: | lib/activity/activityRubricatorClassificationLifecycle.ts | 555 | contextual_category_id: contextualCategoryId, |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:4073: 823:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:120: | lib/activity/rubricatorValueObjectMapper.ts | 387 | const contextualCategoryId = getString(row, "contextual_category_id"); |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:4074: 824:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:121: | lib/activity/rubricatorValueObjectMapper.ts | 394 | readLookupRow(supabase, "contextual_categories", contextualCategoryId), |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:4075: 827:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.0-A3_local_code_routes_inventory.md:124: | lib/objectAction/queries.ts | 197 | contextualCategoryId: row.contextual_category_id, |
(truncated after 80 matches)
```

### Pattern: metadata.classification

```text
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1151: 907:     categoryMetadata.classificationRole === "primary"
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1167: 907:     categoryMetadata.classificationRole === "primary"
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1200: 932:             classificationId: categoryMetadata.classificationId,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:1201: 933:             classificationRole: categoryMetadata.classificationRole,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:40: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategoryId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:41: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategorySlug
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:42: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategoryName
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:43: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.classificationRole
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:49: The first implementation should use mapping.metadata.classification.contextualCategoryId inside lib/activity/valueObjectBridge.ts.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:38: - mapping.metadata.classification.contextualCategoryId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:39: - mapping.metadata.classification.contextualCategorySlug
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:40: - mapping.metadata.classification.contextualCategoryName
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:41: - mapping.metadata.classification.classificationRole
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:24: - mapping.metadata.classification.contextualCategoryId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:25: - mapping.metadata.classification.contextualCategorySlug
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:26: - mapping.metadata.classification.contextualCategoryName
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:27: - mapping.metadata.classification.classificationRole
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:28: - mapping.metadata.classification.classificationId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:29: - mapping.metadata.classification.contextId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:30: - mapping.metadata.classification.contextCode
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:31: - mapping.metadata.classification.objectTypeId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:32: - mapping.metadata.classification.objectTypeCode
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:33: - mapping.metadata.classification.actionTypeId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A3_category_link_code_change_result.md:34: - mapping.metadata.classification.actionTypeCode
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A5_category_link_runtime_checkpoint.md:34: - extracts category metadata from mapping.metadata.classification
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:900: 22:Reason: mapping.metadata.classification is null, valueObjectBridge requires a resolved contextual category id, contextual_categories.slug = walking-to-work does not exist, and free-text fallback does not yet pass resolved category candidates into the bridge.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2131: 2250:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:40: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategoryId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2132: 2251:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:41: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategorySlug
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2133: 2252:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:42: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategoryName
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2233: 1420:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:40: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategoryId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2234: 1421:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:41: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategorySlug
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2235: 1422:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:42: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategoryName
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2236: 1423:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:43: - activity_event_value_object_links.metadata_json.mappingMetadata.classification.classificationRole
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2404: 40:- activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategoryId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2405: 41:- activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategorySlug
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2406: 42:- activity_event_value_object_links.metadata_json.mappingMetadata.classification.contextualCategoryName
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:2407: 43:- activity_event_value_object_links.metadata_json.mappingMetadata.classification.classificationRole
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3529: 2254:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:49: The first implementation should use mapping.metadata.classification.contextualCategoryId inside lib/activity/valueObjectBridge.ts.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3576: 3587:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:907: categoryMetadata.classificationRole === "primary"
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3584: 3595:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:932: classificationId: categoryMetadata.classificationId,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3585: 3596:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:933: classificationRole: categoryMetadata.classificationRole,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:4078: ## Field path: metadata.classification
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:4082: 2254:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A1_category_link_live_source_proof.md:49: The first implementation should use mapping.metadata.classification.contextualCategoryId inside lib/activity/valueObjectBridge.ts.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:4083: 2259:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.2-A2_category_link_runtime_integration_plan.md:38: - mapping.metadata.classification.contextualCategoryId
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-layer-v1.md:22: Reason: mapping.metadata.classification is null, valueObjectBridge requires a resolved contextual category id, contextual_categories.slug = walking-to-work does not exist, and free-text fallback does not yet pass resolved category candidates into the bridge.
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:376: const classification = asRecord(metadata.classification) ?? {};
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:907: categoryMetadata.classificationRole === "primary"
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:932: classificationId: categoryMetadata.classificationId,
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\valueObjectBridge.ts:933: classificationRole: categoryMetadata.classificationRole,
```

### Pattern: classificationSummaryCount

```text
C:\Users\Admin\Documents\projects\gpt-app\docs\activity\P4.7.8-R_cross_route_verification.md:221: - mapping.classificationSummaryCount: 1
C:\Users\Admin\Documents\projects\gpt-app\docs\activity\P4.7.8-R_cross_route_verification.md:315: - classificationSummaryCount: 1
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:3658: 735:               classificationSummaryCount:
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:4544: 811:               classificationSummaryCount:
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6020: 1347:               classificationSummaryCount:
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A6_hot_path_window_extraction.md:1221: 735:               classificationSummaryCount:
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\complete\route.ts:811: classificationSummaryCount:
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug\free-text-value-object-test\route.ts:322: classificationSummaryCount:
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\record\route.ts:1347: classificationSummaryCount:
```

### Pattern: RubricatorValueObjectMappingResult

```text
C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-mapping-decision.md:208: RubricatorValueObjectMappingResult
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C4_minimal_free_text_v1_design_decision.md:107: - RubricatorValueObjectMappingResult
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C5_exact_contract_inspection_checkpoint.md:38: - mappingResult: RubricatorValueObjectMappingResult | null
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C5_exact_contract_inspection_checkpoint.md:44: - RubricatorValueObjectMappingResult
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:813: 58: export type RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1456: 701: ): Promise<RubricatorValueObjectMappingResult> {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1465: 710:   const result: RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1591: 10:   type RubricatorValueObjectMappingResult,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1607: 26:   mappingResult: RubricatorValueObjectMappingResult | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A6_hot_path_window_extraction.md:665: 701: ): Promise<RubricatorValueObjectMappingResult> {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A6_hot_path_window_extraction.md:674: 710:   const result: RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3295: ## Contract: RubricatorValueObjectMappingResult
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3299: 208:RubricatorValueObjectMappingResult
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3302: 1359:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:813: 58: export type RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3303: 1406:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1456: 701: ): Promise<RubricatorValueObjectMappingResult> {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3304: 1407:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1465: 710:   const result: RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3305: 1411:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1591: 10:   type RubricatorValueObjectMappingResult,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3306: 1413:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1607: 26:   mappingResult: RubricatorValueObjectMappingResult | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3307: 1558:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A6_hot_path_window_extraction.md:665: 701: ): Promise<RubricatorValueObjectMappingResult> {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3308: 1559:C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A6_hot_path_window_extraction.md:674: 710:   const result: RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3309: 3311:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-mapping-decision.md:208: RubricatorValueObjectMappingResult
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3310: 3410:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\activityValueObjectLifecycle.ts:10: type RubricatorValueObjectMappingResult,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3311: 3412:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\activityValueObjectLifecycle.ts:26: mappingResult: RubricatorValueObjectMappingResult | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3312: 3494:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:58: export type RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3313: 3541:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:701: ): Promise<RubricatorValueObjectMappingResult> {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3314: 3542:C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:710: const result: RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3317: 107:- RubricatorValueObjectMappingResult
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3320: 38:- mappingResult: RubricatorValueObjectMappingResult | null
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3321: 44:- RubricatorValueObjectMappingResult
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3324: 12:.\lib\activity\activityValueObjectLifecycle.ts:10:   type RubricatorValueObjectMappingResult,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3325: 28:.\lib\activity\activityValueObjectLifecycle.ts:26:   mappingResult: RubricatorValueObjectMappingResult | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3326: 194:.\lib\activity\rubricatorValueObjectMapper.ts:58: export type RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3327: 500:.\lib\activity\rubricatorValueObjectMapper.ts:701: ): Promise<RubricatorValueObjectMappingResult> {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3328: 509:.\lib\activity\rubricatorValueObjectMapper.ts:710:   const result: RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3331: 653:.\lib\activity\rubricatorValueObjectMapper.ts:701: ): Promise<RubricatorValueObjectMappingResult> {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3332: 662:.\lib\activity\rubricatorValueObjectMapper.ts:710:   const result: RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3333: 704:.\lib\activity\activityValueObjectLifecycle.ts:10:   type RubricatorValueObjectMappingResult,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3334: 720:.\lib\activity\activityValueObjectLifecycle.ts:26:   mappingResult: RubricatorValueObjectMappingResult | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3337: 10:  type RubricatorValueObjectMappingResult,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3338: 26:  mappingResult: RubricatorValueObjectMappingResult | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3341: 58:export type RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3342: 701:): Promise<RubricatorValueObjectMappingResult> {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3343: 710:  const result: RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3346: 813:   58: export type RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3347: 1456:  701: ): Promise<RubricatorValueObjectMappingResult> {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3348: 1465:  710:   const result: RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3349: 1591:   10:   type RubricatorValueObjectMappingResult,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3350: 1607:   26:   mappingResult: RubricatorValueObjectMappingResult | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3353: 665:  701: ): Promise<RubricatorValueObjectMappingResult> {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3354: 674:  710:   const result: RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3357: 10:  type RubricatorValueObjectMappingResult,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3358: 26:  mappingResult: RubricatorValueObjectMappingResult | null;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3361: 58:export type RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3362: 747:): Promise<RubricatorValueObjectMappingResult> {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3363: 756:  const result: RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\activityValueObjectLifecycle.ts:10: type RubricatorValueObjectMappingResult,
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\activityValueObjectLifecycle.ts:26: mappingResult: RubricatorValueObjectMappingResult | null;
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:58: export type RubricatorValueObjectMappingResult = {
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:747: ): Promise<RubricatorValueObjectMappingResult> {
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:756: const result: RubricatorValueObjectMappingResult = {
```

### Pattern: ValueObjectBridgeMapping

```text
C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1207: P4.7.2-R — define mapping decision from contextual_category / entity_classification to ValueObjectBridgeMapping[].
C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-mapping-decision.md:23: Therefore, valueObjectBridge.ts remains a low-level bridge helper, but a higher-level mapping helper must convert Object-Action classification into ValueObjectBridgeMapping[].
C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-mapping-decision.md:158: - helper reads rubricator classification and produces ValueObjectBridgeMapping[];
C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-mapping-decision.md:188: ValueObjectBridgeMapping[]
C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-mapping-decision.md:203: - map it to one or more ValueObjectBridgeMapping objects;
C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-mapping-decision.md:248: -> ValueObjectBridgeMapping[]
C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-mapping-decision.md:282: | What should it output? | ValueObjectBridgeMapping[] |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C5_exact_contract_inspection_checkpoint.md:45: - mappings: ValueObjectBridgeMapping[]
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C5_exact_contract_inspection_checkpoint.md:54: - ValueObjectBridgeMapping
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:77: 40: export type ValueObjectBridgeMapping = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:116: 79:   mappings: ValueObjectBridgeMapping[];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:197: 160: ): NonNullable<ValueObjectBridgeMapping["relationType"]> {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:198: 161:   const allowed: NonNullable<ValueObjectBridgeMapping["relationType"]>[] = [
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:210: 173:     allowed.includes(value as NonNullable<ValueObjectBridgeMapping["relationType"]>)
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:212: 175:     return value as NonNullable<ValueObjectBridgeMapping["relationType"]>;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:758: 3: import type { ValueObjectBridgeMapping } from "./valueObjectBridge";
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:820: 65:   mappings: ValueObjectBridgeMapping[];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:835: 80:   relationType: ValueObjectBridgeMapping["relationType"];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:838: 83:   deltaDirection: ValueObjectBridgeMapping["deltaDirection"];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1418: 663: ): ValueObjectBridgeMapping | null {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A6_hot_path_window_extraction.md:433: 40: export type ValueObjectBridgeMapping = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A6_hot_path_window_extraction.md:472: 79:   mappings: ValueObjectBridgeMapping[];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A6_hot_path_window_extraction.md:627: 663: ): ValueObjectBridgeMapping | null {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3366: ## Contract: ValueObjectBridgeMapping
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3370: 1207:P4.7.2-R ÔÇö define mapping decision from contextual_category / entity_classification to ValueObjectBridgeMapping[].
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3373: 23:Therefore, valueObjectBridge.ts remains a low-level bridge helper, but a higher-level mapping helper must convert Object-Action classification into ValueObjectBridgeMapping[].
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3374: 158:- helper reads rubricator classification and produces ValueObjectBridgeMapping[];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3375: 188:ValueObjectBridgeMapping[]
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3376: 203:- map it to one or more ValueObjectBridgeMapping objects;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3377: 248:-> ValueObjectBridgeMapping[]
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3378: 282:| What should it output? | ValueObjectBridgeMapping[] |
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3381: 3284:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-inventory-raw.md:1207: P4.7.2-R ÔÇö define mapping decision from contextual_category / entity_classification to ValueObjectBridgeMapping[].
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3382: 3307:C:\Users\Admin\Documents\projects\gpt-app\docs\p4-7-rubricator-mapping-decision.md:158: - helper reads rubricator classification and produces ValueObjectBridgeMapping[];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3385: 45:- mappings: ValueObjectBridgeMapping[]
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3386: 54:- ValueObjectBridgeMapping
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3389: 139:.\lib\activity\rubricatorValueObjectMapper.ts:3: import type { ValueObjectBridgeMapping } from "./valueObjectBridge";
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3390: 201:.\lib\activity\rubricatorValueObjectMapper.ts:65:   mappings: ValueObjectBridgeMapping[];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3391: 216:.\lib\activity\rubricatorValueObjectMapper.ts:80:   relationType: ValueObjectBridgeMapping["relationType"];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3392: 219:.\lib\activity\rubricatorValueObjectMapper.ts:83:   deltaDirection: ValueObjectBridgeMapping["deltaDirection"];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3393: 462:.\lib\activity\rubricatorValueObjectMapper.ts:663: ): ValueObjectBridgeMapping | null {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3394: 642:.\lib\activity\valueObjectBridge.ts:81: export type ValueObjectBridgeMapping = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3395: 681:.\lib\activity\valueObjectBridge.ts:120:   mappings: ValueObjectBridgeMapping[];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3398: 8:.\lib\activity\rubricatorValueObjectMapper.ts:65:   mappings: ValueObjectBridgeMapping[];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3399: 23:.\lib\activity\rubricatorValueObjectMapper.ts:80:   relationType: ValueObjectBridgeMapping["relationType"];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3400: 26:.\lib\activity\rubricatorValueObjectMapper.ts:83:   deltaDirection: ValueObjectBridgeMapping["deltaDirection"];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3401: 615:.\lib\activity\rubricatorValueObjectMapper.ts:663: ): ValueObjectBridgeMapping | null {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3404: 3:import type { ValueObjectBridgeMapping } from "./valueObjectBridge";
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3405: 65:  mappings: ValueObjectBridgeMapping[];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3406: 80:  relationType: ValueObjectBridgeMapping["relationType"];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3407: 83:  deltaDirection: ValueObjectBridgeMapping["deltaDirection"];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3408: 663:): ValueObjectBridgeMapping | null {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3411: 77:   40: export type ValueObjectBridgeMapping = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3412: 116:   79:   mappings: ValueObjectBridgeMapping[];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3413: 197:  160: ): NonNullable<ValueObjectBridgeMapping["relationType"]> {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3414: 198:  161:   const allowed: NonNullable<ValueObjectBridgeMapping["relationType"]>[] = [
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3415: 210:  173:     allowed.includes(value as NonNullable<ValueObjectBridgeMapping["relationType"]>)
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3416: 212:  175:     return value as NonNullable<ValueObjectBridgeMapping["relationType"]>;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3417: 758:    3: import type { ValueObjectBridgeMapping } from "./valueObjectBridge";
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3418: 820:   65:   mappings: ValueObjectBridgeMapping[];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3419: 835:   80:   relationType: ValueObjectBridgeMapping["relationType"];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3420: 838:   83:   deltaDirection: ValueObjectBridgeMapping["deltaDirection"];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3421: 1418:  663: ): ValueObjectBridgeMapping | null {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3424: 433:   40: export type ValueObjectBridgeMapping = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3425: 472:   79:   mappings: ValueObjectBridgeMapping[];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3426: 627:  663: ): ValueObjectBridgeMapping | null {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3429: 3:import type { ValueObjectBridgeMapping } from "./valueObjectBridge";
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3430: 65:  mappings: ValueObjectBridgeMapping[];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3431: 80:  relationType: ValueObjectBridgeMapping["relationType"];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3432: 83:  deltaDirection: ValueObjectBridgeMapping["deltaDirection"];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3433: 709:): ValueObjectBridgeMapping | null {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3436: 81:export type ValueObjectBridgeMapping = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3437: 120:  mappings: ValueObjectBridgeMapping[];
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3438: 246:): NonNullable<ValueObjectBridgeMapping["relationType"]> {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3439: 247:  const allowed: NonNullable<ValueObjectBridgeMapping["relationType"]>[] = [
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3440: 259:    allowed.includes(value as NonNullable<ValueObjectBridgeMapping["relationType"]>)
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3441: 261:    return value as NonNullable<ValueObjectBridgeMapping["relationType"]>;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3479: 23:Therefore, valueObjectBridge.ts remains a low-level bridge helper, but a higher-level mapping helper must convert Object-Action classification into ValueObjectBridgeMapping[].
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3665: 139:.\lib\activity\rubricatorValueObjectMapper.ts:3: import type { ValueObjectBridgeMapping } from "./valueObjectBridge";
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3747: 642:.\lib\activity\valueObjectBridge.ts:81: export type ValueObjectBridgeMapping = {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:3786: 681:.\lib\activity\valueObjectBridge.ts:120:   mappings: ValueObjectBridgeMapping[];
(truncated after 80 matches)
```

### Pattern: allowControlledTextFallback

```text
C:\Users\Admin\Documents\projects\gpt-app\docs\value-object-state-foundation-p4-7.md:175: "allowControlledTextFallback": true
C:\Users\Admin\Documents\projects\gpt-app\docs\value-object-state-foundation-p4-7.md:200: Real endpoint call was executed with `dryRun: false`, `createMissingControlledValueObject: true`, `allowControlledTextFallback: true`.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-object-state-foundation-p4-7.md:268: This smoke test used `allowControlledTextFallback: true`. `classificationSummary` was empty, so this test did not yet prove the production path through real `entity_classifications`.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-object-state-foundation-p4-7.md:328: "allowControlledTextFallback": false
C:\Users\Admin\Documents\projects\gpt-app\docs\value-object-state-foundation-p4-7.md:376: "allowControlledTextFallback": false
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C5_exact_contract_inspection_checkpoint.md:50: - allowControlledTextFallback?: boolean
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C5_exact_contract_inspection_checkpoint.md:65: - allowControlledTextFallback
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C5_exact_contract_inspection_checkpoint.md:84: - inspect how allowControlledTextFallback is used;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C5b_controlled_fallback_inspection_checkpoint.md:36: - allowControlledTextFallback
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C5b_controlled_fallback_inspection_checkpoint.md:70: - update activityValueObjectLifecycle.ts to pass allowControlledTextFallback: true;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C6-C_controlled_free_text_fallback_implementation_checkpoint.md:40: - enables allowControlledTextFallback: true
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C6-C_controlled_free_text_fallback_implementation_checkpoint.md:64: - allowControlledTextFallback: true
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:810: 55:   allowControlledTextFallback?: boolean;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1462: 707:     allowControlledTextFallback = false,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1514: 759:   if (summaries.length === 0 && !allowControlledTextFallback) {
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1524: 769:     allowTextFallback: allowControlledTextFallback,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1650: 69:         allowControlledTextFallback: false,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6164: 12:   allowControlledTextFallback?: unknown;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6356: 204:   const allowControlledTextFallback = getBoolean(
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6357: 205:     body.allowControlledTextFallback
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6372: 220:       allowControlledTextFallback,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A6_hot_path_window_extraction.md:671: 707:     allowControlledTextFallback = false,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A1_api_route_conventions_inspection.md:899: 12:   allowControlledTextFallback?: unknown;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:1967: 12:   allowControlledTextFallback?: unknown;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:2159: 204:   const allowControlledTextFallback = getBoolean(
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:2160: 205:     body.allowControlledTextFallback
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:2175: 220:       allowControlledTextFallback,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:1226: 268:This smoke test used `allowControlledTextFallback: true`. `classificationSummary` was empty, so this test did not yet prove the production path through real `entity_classifications`.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:4111: ## Fallback flag: allowControlledTextFallback
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:4115: 175:  "allowControlledTextFallback": true
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:4116: 200:Real endpoint call was executed with `dryRun: false`, `createMissingControlledValueObject: true`, `allowControlledTextFallback: true`.
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\activityValueObjectLifecycle.ts:70: allowControlledTextFallback: true,
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:55: allowControlledTextFallback?: boolean;
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:753: allowControlledTextFallback = false,
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:805: if (summaries.length === 0 && !allowControlledTextFallback) {
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:815: allowTextFallback: allowControlledTextFallback,
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug-rubricator-value-object-bridge\route.ts:12: allowControlledTextFallback?: unknown;
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug-rubricator-value-object-bridge\route.ts:204: const allowControlledTextFallback = getBoolean(
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug-rubricator-value-object-bridge\route.ts:205: body.allowControlledTextFallback
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug-rubricator-value-object-bridge\route.ts:220: allowControlledTextFallback,
```

### Pattern: createMissingControlledValueObject

```text
C:\Users\Admin\Documents\projects\gpt-app\docs\value-object-state-foundation-p4-7.md:174: "createMissingControlledValueObject": true,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-object-state-foundation-p4-7.md:184: - requestedCreateMissingControlledValueObject: `true`
C:\Users\Admin\Documents\projects\gpt-app\docs\value-object-state-foundation-p4-7.md:185: - effectiveCreateMissingControlledValueObject: `false`
C:\Users\Admin\Documents\projects\gpt-app\docs\value-object-state-foundation-p4-7.md:200: Real endpoint call was executed with `dryRun: false`, `createMissingControlledValueObject: true`, `allowControlledTextFallback: true`.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-object-state-foundation-p4-7.md:327: "createMissingControlledValueObject": false,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-object-state-foundation-p4-7.md:375: "createMissingControlledValueObject": false,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C5_exact_contract_inspection_checkpoint.md:49: - createMissingControlledValueObject?: boolean
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C5_exact_contract_inspection_checkpoint.md:66: - createMissingControlledValueObject
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C5_exact_contract_inspection_checkpoint.md:85: - inspect how createMissingControlledValueObject is used;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C5b_controlled_fallback_inspection_checkpoint.md:37: - createMissingControlledValueObject
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C5b_controlled_fallback_inspection_checkpoint.md:71: - probably also pass createMissingControlledValueObject: true;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C6-C_controlled_free_text_fallback_implementation_checkpoint.md:39: - enables createMissingControlledValueObject: true
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C6-C_controlled_free_text_fallback_implementation_checkpoint.md:63: - createMissingControlledValueObject: true
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:809: 54:   createMissingControlledValueObject?: boolean;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1461: 706:     createMissingControlledValueObject = false,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1538: 783:     createMissingControlledValueObject
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:1649: 68:         createMissingControlledValueObject: false,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6163: 11:   createMissingControlledValueObject?: unknown;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6353: 201:   const requestedCreateMissingControlledValueObject = getBoolean(
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6354: 202:     body.createMissingControlledValueObject
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6361: 209:   const effectiveCreateMissingControlledValueObject = dryRun
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6363: 211:     : requestedCreateMissingControlledValueObject;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6370: 218:       createMissingControlledValueObject:
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6371: 219:         effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6382: 230:         requestedCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6383: 231:         effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6397: 245:       requestedCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6398: 246:       effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6412: 260:       requestedCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6413: 261:       effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6435: 283:     requestedCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A4_full_key_file_extraction.md:6436: 284:     effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.1-A6_hot_path_window_extraction.md:670: 706:     createMissingControlledValueObject = false,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:5158: 230:         requestedCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:5159: 231:         effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:5175: 245:       requestedCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:5176: 246:       effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:5192: 260:       requestedCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:5193: 261:       effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:5214: 283:     requestedCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:5215: 284:     effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:5226: 283:     requestedCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.10-A1_debug_admin_guard_conventions_inspection.md:5227: 284:     effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A1_api_route_conventions_inspection.md:886: 11:   createMissingControlledValueObject?: unknown;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A1_api_route_conventions_inspection.md:898: 11:   createMissingControlledValueObject?: unknown;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:1966: 11:   createMissingControlledValueObject?: unknown;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:2156: 201:   const requestedCreateMissingControlledValueObject = getBoolean(
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:2157: 202:     body.createMissingControlledValueObject
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:2164: 209:   const effectiveCreateMissingControlledValueObject = dryRun
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:2166: 211:     : requestedCreateMissingControlledValueObject;
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:2173: 218:       createMissingControlledValueObject:
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:2174: 219:         effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:2185: 230:         requestedCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:2186: 231:         effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:2200: 245:       requestedCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:2201: 246:       effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:2215: 260:       requestedCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:2216: 261:       effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:2238: 283:     requestedCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.9.7-A2_focused_api_files_extraction.md:2239: 284:     effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:4116: 200:Real endpoint call was executed with `dryRun: false`, `createMissingControlledValueObject: true`, `allowControlledTextFallback: true`.
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\category-derivation-inventory-c8-e.md:4118: ## Fallback flag: createMissingControlledValueObject
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\activityValueObjectLifecycle.ts:69: createMissingControlledValueObject: true,
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:54: createMissingControlledValueObject?: boolean;
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:752: createMissingControlledValueObject = false,
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:829: createMissingControlledValueObject
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug-rubricator-value-object-bridge\route.ts:11: createMissingControlledValueObject?: unknown;
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug-rubricator-value-object-bridge\route.ts:201: const requestedCreateMissingControlledValueObject = getBoolean(
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug-rubricator-value-object-bridge\route.ts:202: body.createMissingControlledValueObject
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug-rubricator-value-object-bridge\route.ts:209: const effectiveCreateMissingControlledValueObject = dryRun
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug-rubricator-value-object-bridge\route.ts:211: : requestedCreateMissingControlledValueObject;
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug-rubricator-value-object-bridge\route.ts:218: createMissingControlledValueObject:
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug-rubricator-value-object-bridge\route.ts:219: effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug-rubricator-value-object-bridge\route.ts:230: requestedCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug-rubricator-value-object-bridge\route.ts:231: effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug-rubricator-value-object-bridge\route.ts:245: requestedCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug-rubricator-value-object-bridge\route.ts:246: effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug-rubricator-value-object-bridge\route.ts:260: requestedCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug-rubricator-value-object-bridge\route.ts:261: effectiveCreateMissingControlledValueObject,
C:\Users\Admin\Documents\projects\gpt-app\src\app\api\activity\debug-rubricator-value-object-bridge\route.ts:283: requestedCreateMissingControlledValueObject,
(truncated after 80 matches)
```

### Pattern: walking_to_work_duration

```text
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C6-C_controlled_free_text_fallback_implementation_checkpoint.md:29: - added controlled rule walking_to_work_duration
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C6-C_controlled_free_text_fallback_implementation_checkpoint.md:56: - walking_to_work_duration
C:\Users\Admin\Documents\projects\gpt-app\docs\value-objects\P4.10.0-C7-G_free_text_runtime_verification_checkpoint.md:45: - controlledRule: walking_to_work_duration
C:\Users\Admin\Documents\projects\gpt-app\lib\activity\rubricatorValueObjectMapper.ts:174: ruleKey: "walking_to_work_duration",
```

## C8-J preliminary conclusions

- Mapper currently must be inspected for how it constructs mappings and where category/classification metadata is available or missing.
- Bridge currently must be inspected for exact value_object_category_links creation path and whether it accepts only contextualCategoryId.
- Debug free-text route currently remains the safest first integration point because C8-H2 proved it still works after DB migration.
- Category Derivation runtime should be added behind an explicit flag first.
- C8-K should add types only and must not change existing route behavior.
- C8-L should add a pure deterministic rule extractor with no database writes.
- C8-M/C8-N should add resolver and persistence only after the pure extractor contract is stable.

## Next step

Proceed to P4.10.0-C8-K: add Category Derivation types only.

C8-K must create type definitions without changing mapper, bridge or route behavior.
