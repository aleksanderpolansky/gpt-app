# ARCTor.app — AI-A0 Storage Audit — REUSE / ALTER / CREATE v1

Дата: 2026-08-12
Baseline code: `07e5b82d8e9c9ee22c995bfb64297e685fefe918`
Live DB audit: `ARCTOR_AI_A0_LIVE_DB_READONLY_VERIFY_V1`

## REUSE

Без создания параллельных сущностей переиспользуются:

- `ai_processing_instruction_sets`
- `ai_processing_instruction_revisions`
- `actor_ai_processing_preferences`
- `actor_ai_processing_preference_revisions`
- `value_objects`
- `concept_aliases`
- `value_object_parameter_definitions`
- `value_object_parameter_assignments`
- `value_object_relation_types`
- `value_object_relations`
- `relation_evidence`
- `ai_usage_events`
- `ai_pilot_budget_reservations_gsr1`
- `activity_semantic_enrichment_runs_cux4`
- `activity_ai_processing_provenance` как специализированный legacy/current activity-enrichment provenance
- `raw_activity_signals`
- `activity_processing_logs`
- `activity_processing_service_log`
- `activity_corrections`
- `activity_fact_review_items`
- `resolver_feedback`
- `recommendation_feedback`
- Supabase Object Storage.

## ALTER

### `ai_usage_events`

Добавляется nullable `analysis_execution_id` -> `ai_analysis_executions(id)`.
Существующие строки не переписываются.

### Runtime Global Reality

Два provider stage должны:
- работать в одном `ai_analysis_execution`;
- создавать отдельный manifest на каждый stage;
- сохранять candidate snapshot без копирования raw input;
- сохранять hashes/versions/provider controls;
- сохранять validator result;
- по-прежнему сохранять `store=false`, Nano, 0 automatic retries, max 2 provider calls и существующий hard cost cap.

### Existing corrections/reviews

Позже они становятся источниками для общего Data Capital layer. Их текущие предметные функции не заменяются.

## CREATE — текущая последовательность

### AI-A1 — сейчас

- `ai_analysis_executions`
- `ai_context_manifests`
- общий server recorder/context-manifest helper.

### AI-A2 — после A1

- `value_object_recognition_profiles`
- versioned recognition/disambiguation data;
- assembled profile/candidate read path;
- NO_MATCH / PROPOSAL_NEEDED contract.

### AI-A3 — после A2

- `ai_feedback_events`
- `ai_feedback_corrections`
- `ai_feedback_preferences`
- `ai_capability_requests`
- `ai_feedback_outcomes`.

### AI-A4 — после A3

- purpose registry;
- actor/user data-use grants / permission lineage;
- retention/restriction metadata.

### Позже

- `ai_feedback_clusters`
- `ai_optimizer_proposals`
- dataset manifests/members
- optional search extensions/indexes based on measured need.

## Live facts AI-A0

- global Value Objects: 150
- roots: 12
- intermediate: 35
- leaves: 103
- approved/published aliases: 89
- leaves with active alias: 23
- active global system parameter assignments: 52
- installed extensions observed: `pgcrypto`, `uuid-ossp`
- `vector` and `pg_trgm` were not observed; they are not prerequisites for AI-A1.

## Non-negotiable boundary

Никакой новый слой не должен превращаться в вторую копию уже существующего source of truth.

- aliases остаются aliases;
- parameter registry остаётся parameter registry;
- activity correction остаётся предметной correction;
- Context Manifest фиксирует execution context, а не становится новой activity/event table;
- Data Capital связывает существующие evidence sources, а не переписывает их историю.
