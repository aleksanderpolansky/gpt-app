// GPT-APP / AI-NAVIGATOR
// Project Knowledge fixture data. Generated from PKG-1 inventory sources on 2026-06-28.
// Read-only fixture: no DB writes, no SQL execution, no OpenAI calls.

import type { DatabaseSqlRef } from "@/types/project-knowledge";

export const projectKnowledgeDatabaseSqlRefs = [
  {
    "id": "database-sql-001-supabase-diagnostics-20260529-c8-i-u-schema-drift-diagnostic-readonly-sql",
    "file": "supabase/diagnostics/20260529_c8_i_u_schema_drift_diagnostic_readonly.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-002-supabase-diagnostics-20260529-c8-i-v2-schema-drift-consolidated-readonly-sql",
    "file": "supabase/diagnostics/20260529_c8_i_v2_schema_drift_consolidated_readonly.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-003-supabase-migrations-001-object-action-backbone-sql",
    "file": "supabase/migrations/001_object_action_backbone.sql",
    "fileType": ".sql",
    "createTableCount": 12,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 1,
    "tablesMentioned": [
      "action_type_translations",
      "action_types",
      "concept_aliases",
      "context_translations",
      "contexts",
      "contextual_categories",
      "contextual_category_translations",
      "entity_classifications",
      "object_action_affordances",
      "object_classes",
      "object_type_translations",
      "object_types"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-004-supabase-migrations-002-seed-object-action-rubricator-sql",
    "file": "supabase/migrations/002_seed_object_action_rubricator.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "action_types",
      "context_translations",
      "contexts",
      "contextual_categories",
      "contextual_category_translations",
      "object_action_affordances",
      "object_classes",
      "object_types"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-005-supabase-migrations-003-backfill-organization-directory-classifications-sql",
    "file": "supabase/migrations/003_backfill_organization_directory_classifications.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "entity_classifications"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-006-supabase-migrations-004-enable-object-action-rls-sql",
    "file": "supabase/migrations/004_enable_object_action_rls.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-007-supabase-migrations-005-create-object-action-read-views-and-rpc-sql",
    "file": "supabase/migrations/005_create_object_action_read_views_and_rpc.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 4,
    "functionCount": 2,
    "tablesMentioned": [],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-008-supabase-migrations-006-seed-core-object-action-examples-sql",
    "file": "supabase/migrations/006_seed_core_object_action_examples.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-009-supabase-migrations-007-create-object-action-suggestion-requests-sql",
    "file": "supabase/migrations/007_create_object_action_suggestion_requests.sql",
    "fileType": ".sql",
    "createTableCount": 1,
    "alterTableCount": 1,
    "createPolicyCount": 1,
    "grantCount": 1,
    "functionCount": 0,
    "tablesMentioned": [
      "object_action_suggestion_requests"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-010-supabase-migrations-008-create-platform-admins-sql",
    "file": "supabase/migrations/008_create_platform_admins.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-011-supabase-migrations-009-update-object-action-suggestion-admin-decision-constrain",
    "file": "supabase/migrations/009_update_object_action_suggestion_admin_decision_constraint.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 3,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "object_action_suggestion_requests"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-012-supabase-migrations-010-create-object-action-suggestion-events-sql",
    "file": "supabase/migrations/010_create_object_action_suggestion_events.sql",
    "fileType": ".sql",
    "createTableCount": 1,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "object_action_suggestion_events"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-013-supabase-migrations-011-update-object-action-suggestion-request-source-constrain",
    "file": "supabase/migrations/011_update_object_action_suggestion_request_source_constraint.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 2,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "object_action_suggestion_requests"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-014-supabase-migrations-012-activity-recording-backbone-sql",
    "file": "supabase/migrations/012_activity_recording_backbone.sql",
    "fileType": ".sql",
    "createTableCount": 8,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 1,
    "tablesMentioned": [
      "activity_code_templates",
      "activity_events",
      "activity_types",
      "current_snapshots",
      "daily_aggregates",
      "event_links",
      "impact_events",
      "impact_rules"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-015-supabase-migrations-013-activity-templates-v2-sql",
    "file": "supabase/migrations/013_activity_templates_v2.sql",
    "fileType": ".sql",
    "createTableCount": 3,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 1,
    "tablesMentioned": [
      "activity_template_links",
      "activity_templates",
      "user_activity_shortcuts"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-016-supabase-migrations-014-activity-events-v2-template-link-sql",
    "file": "supabase/migrations/014_activity_events_v2_template_link.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 5,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "activity_events"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-017-supabase-migrations-015-activity-impact-rules-v2-template-link-sql",
    "file": "supabase/migrations/015_activity_impact_rules_v2_template_link.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 1,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "impact_rules"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-018-supabase-migrations-016-activity-atomic-aggregate-updates-sql",
    "file": "supabase/migrations/016_activity_atomic_aggregate_updates.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 2,
    "functionCount": 2,
    "tablesMentioned": [
      "current_snapshots",
      "daily_aggregates"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-019-supabase-migrations-017-activity-corrections-sql",
    "file": "supabase/migrations/017_activity_corrections.sql",
    "fileType": ".sql",
    "createTableCount": 1,
    "alterTableCount": 3,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "activity_corrections"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-020-supabase-migrations-018-activity-corrections-status-rollback-sql",
    "file": "supabase/migrations/018_activity_corrections_status_rollback.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 2,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "activity_corrections"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-021-supabase-migrations-019-activity-security-foundation-sql",
    "file": "supabase/migrations/019_activity_security_foundation.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 12,
    "createPolicyCount": 12,
    "grantCount": 4,
    "functionCount": 0,
    "tablesMentioned": [
      "activity_code_templates",
      "activity_corrections",
      "activity_events",
      "activity_template_links",
      "activity_templates",
      "activity_types",
      "current_snapshots",
      "daily_aggregates",
      "event_links",
      "impact_events",
      "impact_rules",
      "user_activity_shortcuts"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-022-supabase-migrations-020-activity-raw-signals-sql",
    "file": "supabase/migrations/020_activity_raw_signals.sql",
    "fileType": ".sql",
    "createTableCount": 1,
    "alterTableCount": 1,
    "createPolicyCount": 1,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "raw_activity_signals"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-023-supabase-migrations-021-activity-processing-logs-sql",
    "file": "supabase/migrations/021_activity_processing_logs.sql",
    "fileType": ".sql",
    "createTableCount": 1,
    "alterTableCount": 1,
    "createPolicyCount": 1,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "activity_processing_logs"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-024-supabase-migrations-022-activity-processing-logs-complete-event-stage-sql",
    "file": "supabase/migrations/022_activity_processing_logs_complete_event_stage.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 2,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "activity_processing_logs"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-025-supabase-migrations-023-value-object-state-foundation-p4-7-sql",
    "file": "supabase/migrations/023_value_object_state_foundation_p4_7.sql",
    "fileType": ".sql",
    "createTableCount": 5,
    "alterTableCount": 5,
    "createPolicyCount": 5,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "activity_event_value_object_instance_links",
      "value_object_daily_aggregates",
      "value_object_instances",
      "value_object_state_deltas",
      "value_object_state_snapshots"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-026-supabase-migrations-024-activity-template-known-registry-rules-sql",
    "file": "supabase/migrations/024_activity_template_known_registry_rules.sql",
    "fileType": ".sql",
    "createTableCount": 1,
    "alterTableCount": 1,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "activity_template_known_registry_rules"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-027-supabase-migrations-025-p4-8-0-add-commercial-usage-and-purchase-currency-sql",
    "file": "supabase/migrations/025_p4_8_0_add_commercial_usage_and_purchase_currency.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 6,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "purchase_confirmations",
      "value_objects"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-028-supabase-migrations-026-p4-8-0-drop-obsolete-purchase-confirmations-currency-sql",
    "file": "supabase/migrations/026_p4_8_0_drop_obsolete_purchase_confirmations_currency.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 2,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "purchase_confirmations"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-029-supabase-migrations-20260524000000-c8-i-d4-l-e-value-object-state-fact-audit-eve",
    "file": "supabase/migrations/20260524000000_c8_i_d4_l_e_value_object_state_fact_audit_events.sql",
    "fileType": ".sql",
    "createTableCount": 1,
    "alterTableCount": 1,
    "createPolicyCount": 1,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "value_object_state_fact_audit_events"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-030-supabase-migrations-20260524-p4-10-0-c8-i-d2-state-similarity-relevance-nba-addi",
    "file": "supabase/migrations/20260524_p4_10_0_c8_i_d2_state_similarity_relevance_nba_additive.sql",
    "fileType": ".sql",
    "createTableCount": 6,
    "alterTableCount": 6,
    "createPolicyCount": 6,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "recommendation_feedback",
      "state_dimensions",
      "state_relevance_rules",
      "value_object_relevance_edges",
      "value_object_similarity_edges",
      "value_object_state_facts"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-031-supabase-migrations-20260524-p4-10-0-c8-i-d3-state-dimensions-initial-seed-sql",
    "file": "supabase/migrations/20260524_p4_10_0_c8_i_d3_state_dimensions_initial_seed.sql",
    "fileType": ".sql",
    "createTableCount": 1,
    "alterTableCount": 4,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "activity_events",
      "impact_events",
      "impact_rules",
      "recommendation_feedback",
      "state_dimensions",
      "value_object_state_facts",
      "value_objects"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-032-supabase-migrations-20260525001000-c8-i-d4-l-l-g-atomic-rollback-rpc-sql",
    "file": "supabase/migrations/20260525001000_c8_i_d4_l_l_g_atomic_rollback_rpc.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 1,
    "functionCount": 1,
    "tablesMentioned": [
      "value_object_state_fact_audit_events"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-033-supabase-migrations-20260525133000-c8-i-d4-l-l-n-b-fix-state-fact-correction-sta",
    "file": "supabase/migrations/20260525133000_c8_i_d4_l_l_n_b_fix_state_fact_correction_status_rolled_back.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 2,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "value_object_state_facts"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-034-supabase-migrations-20260528204503-c8-i-state-context-layer-draft-sql",
    "file": "supabase/migrations/20260528204503_c8_i_state_context_layer_draft.sql",
    "fileType": ".sql",
    "createTableCount": 12,
    "alterTableCount": 11,
    "createPolicyCount": 29,
    "grantCount": 37,
    "functionCount": 0,
    "tablesMentioned": [
      "activity_state_deltas",
      "resolver_candidate_links",
      "resolver_feedback",
      "resolver_runs",
      "semantic_signatures",
      "state_dimensions",
      "state_relevance_rules",
      "value_object_relevance_edges",
      "value_object_similarity_edges",
      "value_object_state_facts",
      "value_object_state_snapshots"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-035-supabase-migrations-20260531-c33j4-stable-semantic-bundle-schema-sql",
    "file": "supabase/migrations/20260531_c33j4_stable_semantic_bundle_schema.sql",
    "fileType": ".sql",
    "createTableCount": 6,
    "alterTableCount": 5,
    "createPolicyCount": 5,
    "grantCount": 9,
    "functionCount": 0,
    "tablesMentioned": [
      "stable_semantic_bundle_blocked_audit_items",
      "stable_semantic_bundle_members",
      "stable_semantic_bundle_resolver_snapshots",
      "stable_semantic_bundle_source_snapshots",
      "stable_semantic_bundles"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-036-supabase-migrations-20260609-service-log-activity-processing-service-log-sql",
    "file": "supabase/migrations/20260609_service_log_activity_processing_service_log.sql",
    "fileType": ".sql",
    "createTableCount": 2,
    "alterTableCount": 1,
    "createPolicyCount": 2,
    "grantCount": 2,
    "functionCount": 1,
    "tablesMentioned": [
      "activity_processing_service_log"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-037-supabase-migrations-20260611203935-ai-navigator-manual-activity-template-sql",
    "file": "supabase/migrations/20260611203935_ai_navigator_manual_activity_template.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "activity_templates"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-038-supabase-migrations-20260612-183044-avo-value-objects-author-first-usage-scope-s",
    "file": "supabase/migrations/20260612_183044_avo_value_objects_author_first_usage_scope.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 3,
    "createPolicyCount": 0,
    "grantCount": 1,
    "functionCount": 0,
    "tablesMentioned": [
      "value_objects"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-039-supabase-migrations-20260615135403-activity-facts-persistence-layer-sql",
    "file": "supabase/migrations/20260615135403_activity_facts_persistence_layer.sql",
    "fileType": ".sql",
    "createTableCount": 4,
    "alterTableCount": 4,
    "createPolicyCount": 4,
    "grantCount": 4,
    "functionCount": 0,
    "tablesMentioned": [
      "activity_event_measures",
      "activity_fact_recalculation_queue",
      "activity_fact_review_items",
      "activity_object_facts"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-040-supabase-migrations-20260620113848-value-object-target-standards-sql",
    "file": "supabase/migrations/20260620113848_value_object_target_standards.sql",
    "fileType": ".sql",
    "createTableCount": 1,
    "alterTableCount": 1,
    "createPolicyCount": 1,
    "grantCount": 1,
    "functionCount": 0,
    "tablesMentioned": [
      "value_object_target_standards"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-041-supabase-migrations-20260622081655-ai-eur-billing-foundation-sql",
    "file": "supabase/migrations/20260622081655_ai_eur_billing_foundation.sql",
    "fileType": ".sql",
    "createTableCount": 5,
    "alterTableCount": 5,
    "createPolicyCount": 5,
    "grantCount": 6,
    "functionCount": 0,
    "tablesMentioned": [
      "ai_credit_ledger",
      "ai_credit_wallets",
      "ai_model_price_snapshots",
      "ai_model_tiers",
      "ai_usage_events"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-042-supabase-migrations-20260622104912-grant-ai-credit-eur-rpc-variable-conflict-fix",
    "file": "supabase/migrations/20260622104912_grant_ai_credit_eur_rpc_variable_conflict_fix_r2.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 1,
    "functionCount": 1,
    "tablesMentioned": [
      "ai_credit_ledger",
      "ai_credit_wallets"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-043-supabase-migrations-20260622152434-seed-ai-model-price-snapshots-openai-actual-s",
    "file": "supabase/migrations/20260622152434_seed_ai_model_price_snapshots_openai_actual_schema.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "ai_model_price_snapshots"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-044-supabase-migrations-20260623115000-app-user-presence-sessions-sql",
    "file": "supabase/migrations/20260623115000_app_user_presence_sessions.sql",
    "fileType": ".sql",
    "createTableCount": 1,
    "alterTableCount": 2,
    "createPolicyCount": 1,
    "grantCount": 1,
    "functionCount": 1,
    "tablesMentioned": [
      "app_user_sessions",
      "app_users"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-045-supabase-patches-20260529-c8-i-x-sandbox-only-cleanup-rebuild-no-execution-sql",
    "file": "supabase/patches/20260529_c8_i_x_sandbox_only_cleanup_rebuild_no_execution.sql",
    "fileType": ".sql",
    "createTableCount": 12,
    "alterTableCount": 11,
    "createPolicyCount": 29,
    "grantCount": 50,
    "functionCount": 0,
    "tablesMentioned": [
      "activity_state_deltas",
      "resolver_candidate_links",
      "resolver_feedback",
      "resolver_runs",
      "semantic_signatures",
      "state_dimensions",
      "state_relevance_rules",
      "value_object_relevance_edges",
      "value_object_similarity_edges",
      "value_object_state_facts",
      "value_object_state_snapshots"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-046-supabase-patches-20260530-c32-value-objects-scope-preflight-instructions-md",
    "file": "supabase/patches/20260530_c32_value_objects_scope_PREFLIGHT_INSTRUCTIONS.md",
    "fileType": ".md",
    "createTableCount": 0,
    "alterTableCount": 1,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [
      "value_objects"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-047-supabase-patches-20260530-c32-value-objects-scope-preflight-select-only-sql",
    "file": "supabase/patches/20260530_c32_value_objects_scope_PREFLIGHT_SELECT_ONLY.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-048-supabase-patches-20260530-c32-value-objects-scope-and-activity-vo-links-no-execu",
    "file": "supabase/patches/20260530_c32_value_objects_scope_and_activity_vo_links_NO_EXECUTION.sql",
    "fileType": ".sql",
    "createTableCount": 1,
    "alterTableCount": 7,
    "createPolicyCount": 2,
    "grantCount": 2,
    "functionCount": 0,
    "tablesMentioned": [
      "activity_value_object_links",
      "value_objects"
    ],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-049-supabase-patches-20260530-c32-value-objects-scope-and-activity-vo-links-postchec",
    "file": "supabase/patches/20260530_c32_value_objects_scope_and_activity_vo_links_POSTCHECK_NO_EXECUTION.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-050-supabase-patches-20260530-c32-value-objects-scope-and-links-execution-gate-revie",
    "file": "supabase/patches/20260530_c32_value_objects_scope_and_links_EXECUTION_GATE_REVIEW_ONLY.md",
    "fileType": ".md",
    "createTableCount": 0,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  },
  {
    "id": "database-sql-051-supabase-patches-20260612-183044-avo-value-objects-author-first-usage-scope-post",
    "file": "supabase/patches/20260612_183044_avo_value_objects_author_first_usage_scope_POSTCHECK_SELECT_ONLY.sql",
    "fileType": ".sql",
    "createTableCount": 0,
    "alterTableCount": 0,
    "createPolicyCount": 0,
    "grantCount": 0,
    "functionCount": 0,
    "tablesMentioned": [],
    "notes": "",
    "sourceRefs": [
      {
        "sourceId": "pkg1-current-source-inventory-20260628",
        "sourceFile": "GPT_APP_PROJECT_KNOWLEDGE_PKG1_database_sql_map_20260628.csv",
        "sourceBatch": "PKG-1 Current Source Inventory",
        "sourceDate": "2026-06-28",
        "trustLevel": "generated-inventory"
      }
    ]
  }
] satisfies readonly DatabaseSqlRef[];
