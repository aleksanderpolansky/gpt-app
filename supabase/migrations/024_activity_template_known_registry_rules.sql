-- P4.7.9-R-A12b
-- Create known-template registry rules table.
--
-- Purpose:
--   Extract transitional known-template registry metadata from
--   activity_templates.default_metadata_json into a dedicated registry table.
--
-- Important:
--   This migration only creates the table, constraints, indexes, and RLS protection.
--   It does NOT seed data.
--   It does NOT switch runtime resolver behavior.
--   Runtime must continue to use default_metadata_json until table seed/audit
--   is proven in later A12 steps.

create table if not exists public.activity_template_known_registry_rules (
  id uuid primary key default gen_random_uuid(),

  activity_template_id uuid not null
    references public.activity_templates(id)
    on delete cascade,

  template_slug text not null,

  enabled boolean not null default true,

  rule_key text not null,

  source_type text not null default 'system_seed',

  classification_role text not null default 'primary',

  confidence numeric(5, 4) not null default 1.0000,

  registry_version text not null,

  priority integer not null default 100,

  object_type_code text not null,
  action_type_code text not null,
  context_code text not null,
  contextual_category_slug text not null,

  value_object_title text not null,
  value_object_type text not null,
  relation_type text not null,
  metric_key text not null,
  metric_unit text not null,
  delta_direction text not null,
  aggregate_type text not null,

  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint activity_template_known_registry_rules_rule_key_unique
    unique (rule_key),

  constraint activity_template_known_registry_rules_template_role_unique
    unique (activity_template_id, classification_role),

  constraint activity_template_known_registry_rules_confidence_range
    check (confidence >= 0 and confidence <= 1),

  constraint activity_template_known_registry_rules_priority_positive
    check (priority > 0),

  constraint activity_template_known_registry_rules_template_slug_not_blank
    check (length(btrim(template_slug)) > 0),

  constraint activity_template_known_registry_rules_rule_key_not_blank
    check (length(btrim(rule_key)) > 0),

  constraint activity_template_known_registry_rules_source_type_not_blank
    check (length(btrim(source_type)) > 0),

  constraint activity_template_known_registry_rules_classification_role_not_blank
    check (length(btrim(classification_role)) > 0),

  constraint activity_template_known_registry_rules_registry_version_not_blank
    check (length(btrim(registry_version)) > 0),

  constraint activity_template_known_registry_rules_object_type_not_blank
    check (length(btrim(object_type_code)) > 0),

  constraint activity_template_known_registry_rules_action_type_not_blank
    check (length(btrim(action_type_code)) > 0),

  constraint activity_template_known_registry_rules_context_code_not_blank
    check (length(btrim(context_code)) > 0),

  constraint activity_template_known_registry_rules_contextual_category_not_blank
    check (length(btrim(contextual_category_slug)) > 0),

  constraint activity_template_known_registry_rules_value_object_title_not_blank
    check (length(btrim(value_object_title)) > 0),

  constraint activity_template_known_registry_rules_value_object_type_not_blank
    check (length(btrim(value_object_type)) > 0),

  constraint activity_template_known_registry_rules_relation_type_not_blank
    check (length(btrim(relation_type)) > 0),

  constraint activity_template_known_registry_rules_metric_key_not_blank
    check (length(btrim(metric_key)) > 0),

  constraint activity_template_known_registry_rules_metric_unit_not_blank
    check (length(btrim(metric_unit)) > 0),

  constraint activity_template_known_registry_rules_delta_direction_not_blank
    check (length(btrim(delta_direction)) > 0),

  constraint activity_template_known_registry_rules_aggregate_type_not_blank
    check (length(btrim(aggregate_type)) > 0)
);

alter table public.activity_template_known_registry_rules
  enable row level security;

create index if not exists activity_template_known_registry_rules_template_id_idx
  on public.activity_template_known_registry_rules(activity_template_id);

create index if not exists activity_template_known_registry_rules_template_slug_idx
  on public.activity_template_known_registry_rules(template_slug);

create index if not exists activity_template_known_registry_rules_enabled_template_slug_idx
  on public.activity_template_known_registry_rules(template_slug)
  where enabled = true;

create index if not exists activity_template_known_registry_rules_object_action_context_idx
  on public.activity_template_known_registry_rules(
    object_type_code,
    action_type_code,
    context_code
  );

comment on table public.activity_template_known_registry_rules is
  'P4.7.9-R-A12 known-template registry rules table. Created before runtime resolver switch. Seed/audit happens in later A12 steps. RLS is enabled; no public policies are created in A12b.';

comment on column public.activity_template_known_registry_rules.metadata_json is
  'Auxiliary audit/source metadata. Runtime resolver must not depend on this column until explicit table-reader phase.';
