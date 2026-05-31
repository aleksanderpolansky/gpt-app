-- C33-T.3 — State write schema preflight packet
-- Project: gpt-app / AI-NAVIGATOR
-- Date: 2026-05-31
--
-- PURPOSE
--   SELECT-only metadata preflight for future State persistence planning.
--
-- IMPORTANT
--   This file is a packet only. The C33-T.3 PowerShell script does not run it.
--   Manual execution, if needed, requires a separate explicit phrase:
--   run C33-T.3 SELECT-ONLY PREFLIGHT
--
-- SAFETY
--   Metadata inspection only.
--   No application data row selection.
--   No schema mutation.
--   No write operations.
--   No State Fact writes.
--   No State Delta writes.
--   No State Snapshot writes.
--   No Semantic Capital writes.
--   No Value Object writes.

with expected_state_tables(table_name, required_for_mvp, purpose) as (
  values
    ('state_facts', true, 'confirmed or explicitly accepted state evidence'),
    ('state_deltas', true, 'confirmed changes to state dimensions'),
    ('state_snapshots', true, 'derived current or interval aggregate state views'),
    ('state_evidence_links', false, 'links persisted state records to source evidence'),
    ('state_governance_events', false, 'append-only state governance and audit events')
),
table_status as (
  select
    e.table_name,
    e.required_for_mvp,
    e.purpose,
    case when t.table_name is null then false else true end as table_exists,
    coalesce(t.table_schema, 'public') as expected_schema
  from expected_state_tables e
  left join information_schema.tables t
    on t.table_schema = 'public'
   and t.table_name = e.table_name
)
select
  'C33_T3_STATE_TABLE_STATUS' as section,
  table_name,
  required_for_mvp,
  table_exists,
  expected_schema,
  purpose
from table_status
order by required_for_mvp desc, table_name;

with expected_state_columns(table_name, column_name, required_for_mvp, purpose) as (
  values
    ('state_facts', 'id', true, 'primary identifier'),
    ('state_facts', 'user_id', true, 'private user owner'),
    ('state_facts', 'source_activity_event_id', false, 'optional Activity Event provenance'),
    ('state_facts', 'source_stable_bundle_id', false, 'optional Stable Semantic Bundle provenance'),
    ('state_facts', 'source_state_hook_id', false, 'optional State hook provenance'),
    ('state_facts', 'source_value_object_id', false, 'optional Value Object provenance'),
    ('state_facts', 'state_domain', true, 'state domain'),
    ('state_facts', 'state_key', true, 'state key'),
    ('state_facts', 'state_label', false, 'human label'),
    ('state_facts', 'evidence_level', true, 'evidence level'),
    ('state_facts', 'confidence_level', false, 'interpretation confidence'),
    ('state_facts', 'safety_class', true, 'safety class'),
    ('state_facts', 'confirmed_by_user', true, 'user confirmation flag'),
    ('state_facts', 'is_sensitive', true, 'sensitivity flag'),
    ('state_facts', 'privacy_level', true, 'privacy level'),
    ('state_facts', 'occurred_at', false, 'state occurrence time'),
    ('state_facts', 'created_at', true, 'record creation time'),
    ('state_facts', 'provenance_json', false, 'provenance payload'),
    ('state_facts', 'metadata_json', false, 'metadata payload'),

    ('state_deltas', 'id', true, 'primary identifier'),
    ('state_deltas', 'user_id', true, 'private user owner'),
    ('state_deltas', 'source_state_fact_id', false, 'source State Fact'),
    ('state_deltas', 'source_activity_event_id', false, 'optional Activity Event provenance'),
    ('state_deltas', 'source_stable_bundle_id', false, 'optional Stable Semantic Bundle provenance'),
    ('state_deltas', 'source_state_hook_id', false, 'optional State hook provenance'),
    ('state_deltas', 'state_domain', true, 'state domain'),
    ('state_deltas', 'state_key', true, 'state key'),
    ('state_deltas', 'delta_kind', true, 'delta kind'),
    ('state_deltas', 'delta_direction', true, 'delta direction'),
    ('state_deltas', 'delta_magnitude_numeric', false, 'numeric delta magnitude'),
    ('state_deltas', 'evidence_level', true, 'evidence level'),
    ('state_deltas', 'safety_class', true, 'safety class'),
    ('state_deltas', 'confirmed_by_user', true, 'user confirmation flag'),
    ('state_deltas', 'applied_to_snapshot', true, 'snapshot application flag'),
    ('state_deltas', 'target_snapshot_id', false, 'target snapshot'),
    ('state_deltas', 'occurred_at', false, 'delta occurrence time'),
    ('state_deltas', 'created_at', true, 'record creation time'),
    ('state_deltas', 'rollback_of_state_delta_id', false, 'rollback source delta'),
    ('state_deltas', 'rollback_group_id', false, 'rollback group'),
    ('state_deltas', 'provenance_json', false, 'provenance payload'),
    ('state_deltas', 'metadata_json', false, 'metadata payload'),

    ('state_snapshots', 'id', true, 'primary identifier'),
    ('state_snapshots', 'user_id', true, 'private user owner'),
    ('state_snapshots', 'snapshot_scope', true, 'snapshot scope'),
    ('state_snapshots', 'state_domain', true, 'state domain'),
    ('state_snapshots', 'state_key', true, 'state key'),
    ('state_snapshots', 'current_value_kind', true, 'current value kind'),
    ('state_snapshots', 'current_value_numeric', false, 'numeric current value'),
    ('state_snapshots', 'current_value_text', false, 'text current value'),
    ('state_snapshots', 'current_value_json', false, 'json current value'),
    ('state_snapshots', 'aggregation_window_start', false, 'aggregation window start'),
    ('state_snapshots', 'aggregation_window_end', false, 'aggregation window end'),
    ('state_snapshots', 'source_fact_count', true, 'source fact count'),
    ('state_snapshots', 'source_delta_count', true, 'source delta count'),
    ('state_snapshots', 'confidence_level', false, 'confidence level'),
    ('state_snapshots', 'safety_class', true, 'safety class'),
    ('state_snapshots', 'calculation_rule_version', true, 'calculation rule version'),
    ('state_snapshots', 'is_current', true, 'current snapshot flag'),
    ('state_snapshots', 'created_at', true, 'record creation time'),
    ('state_snapshots', 'updated_at', false, 'record modification time'),
    ('state_snapshots', 'recomputed_at', false, 'last recompute time'),
    ('state_snapshots', 'provenance_json', false, 'provenance payload'),
    ('state_snapshots', 'metadata_json', false, 'metadata payload'),

    ('state_evidence_links', 'id', true, 'primary identifier'),
    ('state_evidence_links', 'user_id', true, 'private user owner'),
    ('state_evidence_links', 'target_type', true, 'target type'),
    ('state_evidence_links', 'target_id', true, 'target identifier'),
    ('state_evidence_links', 'source_type', true, 'source type'),
    ('state_evidence_links', 'source_id', false, 'source identifier'),
    ('state_evidence_links', 'source_route', false, 'source route'),
    ('state_evidence_links', 'source_route_mode', false, 'source route mode'),
    ('state_evidence_links', 'evidence_level', true, 'evidence level'),
    ('state_evidence_links', 'created_at', true, 'record creation time'),
    ('state_evidence_links', 'metadata_json', false, 'metadata payload'),

    ('state_governance_events', 'id', true, 'primary identifier'),
    ('state_governance_events', 'user_id', true, 'private user owner'),
    ('state_governance_events', 'action', true, 'governance action'),
    ('state_governance_events', 'target_type', false, 'target type'),
    ('state_governance_events', 'target_id', false, 'target identifier'),
    ('state_governance_events', 'source_state_hook_id', false, 'source hook'),
    ('state_governance_events', 'source_activity_event_id', false, 'source activity'),
    ('state_governance_events', 'state_domain', true, 'state domain'),
    ('state_governance_events', 'state_key', false, 'state key'),
    ('state_governance_events', 'safety_class', true, 'safety class'),
    ('state_governance_events', 'evidence_level', false, 'evidence level'),
    ('state_governance_events', 'client_request_id', true, 'idempotency key'),
    ('state_governance_events', 'result_status', true, 'result status'),
    ('state_governance_events', 'side_effects_json', true, 'side-effect summary'),
    ('state_governance_events', 'provenance_json', false, 'provenance payload'),
    ('state_governance_events', 'created_at', true, 'record creation time'),
    ('state_governance_events', 'metadata_json', false, 'metadata payload')
),
column_status as (
  select
    e.table_name,
    e.column_name,
    e.required_for_mvp,
    e.purpose,
    case when c.column_name is null then false else true end as column_exists,
    c.data_type,
    c.is_nullable
  from expected_state_columns e
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = e.table_name
   and c.column_name = e.column_name
)
select
  'C33_T3_STATE_COLUMN_STATUS' as section,
  table_name,
  column_name,
  required_for_mvp,
  column_exists,
  data_type,
  is_nullable,
  purpose
from column_status
order by table_name, required_for_mvp desc, column_name;

with expected_source_tables(table_name, purpose) as (
  values
    ('activity_events', 'source of truth for activity occurrence'),
    ('stable_semantic_bundles', 'semantic evidence bundle'),
    ('stable_semantic_bundle_members', 'semantic evidence bundle members')
),
source_table_status as (
  select
    e.table_name,
    e.purpose,
    case when t.table_name is null then false else true end as table_exists,
    coalesce(t.table_schema, 'public') as expected_schema
  from expected_source_tables e
  left join information_schema.tables t
    on t.table_schema = 'public'
   and t.table_name = e.table_name
)
select
  'C33_T3_SOURCE_TABLE_STATUS' as section,
  table_name,
  table_exists,
  expected_schema,
  purpose
from source_table_status
order by table_name;

with expected_source_columns(table_name, column_name, purpose) as (
  values
    ('activity_events', 'id', 'activity identifier'),
    ('activity_events', 'user_id', 'activity owner'),
    ('activity_events', 'created_at', 'activity created time'),
    ('stable_semantic_bundles', 'id', 'bundle identifier'),
    ('stable_semantic_bundles', 'user_id', 'bundle owner'),
    ('stable_semantic_bundles', 'activity_event_id', 'optional activity reference'),
    ('stable_semantic_bundles', 'created_at', 'bundle created time'),
    ('stable_semantic_bundle_members', 'id', 'member identifier'),
    ('stable_semantic_bundle_members', 'stable_bundle_id', 'bundle parent'),
    ('stable_semantic_bundle_members', 'created_at', 'member created time')
),
source_column_status as (
  select
    e.table_name,
    e.column_name,
    e.purpose,
    case when c.column_name is null then false else true end as column_exists,
    c.data_type,
    c.is_nullable
  from expected_source_columns e
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = e.table_name
   and c.column_name = e.column_name
)
select
  'C33_T3_SOURCE_COLUMN_STATUS' as section,
  table_name,
  column_name,
  column_exists,
  data_type,
  is_nullable,
  purpose
from source_column_status
order by table_name, column_name;

with expected_state_tables(table_name, required_for_mvp) as (
  values
    ('state_facts', true),
    ('state_deltas', true),
    ('state_snapshots', true),
    ('state_evidence_links', false),
    ('state_governance_events', false)
),
table_status as (
  select
    e.table_name,
    e.required_for_mvp,
    case when t.table_name is null then false else true end as table_exists
  from expected_state_tables e
  left join information_schema.tables t
    on t.table_schema = 'public'
   and t.table_name = e.table_name
)
select
  'C33_T3_PREFLIGHT_SUMMARY' as section,
  count(*) filter (where required_for_mvp = true) as required_state_table_count,
  count(*) filter (where required_for_mvp = true and table_exists = true) as required_state_table_present_count,
  count(*) filter (where required_for_mvp = true and table_exists = false) as required_state_table_missing_count,
  count(*) filter (where required_for_mvp = false and table_exists = true) as optional_state_table_present_count,
  count(*) filter (where required_for_mvp = false and table_exists = false) as optional_state_table_missing_count
from table_status;

