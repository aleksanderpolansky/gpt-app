/*
ARCTor.app — Goal World Constructor
P4A Activity / Measure / Fact + AI Instruction Data Contract v1

REUSE:
- activity_events
- activity_event_measures
- activity_object_facts
- activity_value_object_links
- value_object_parameter_definitions
- value_object_parameter_assignments
- fact_capture_precision_policies/preferences
- activity_semantic_enrichment_runs_cux4
- ai_usage_events

ALTER:
- ontology-leaf guards
- explicit semantic-match quality axis
- measure precision-policy link

CREATE:
- activity_measure_provenance
- ai_processing_instruction_sets + revisions
- actor_ai_processing_preferences + revisions
- activity_ai_processing_provenance
- deterministic activity time-accounting RPC

NO AI MODEL CALLS.
NO WEB SCRAPING.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '180s';

do $preflight$
begin
  if to_regclass('public.activity_events') is null
     or to_regclass('public.activity_event_measures') is null
     or to_regclass('public.activity_object_facts') is null
     or to_regclass('public.activity_value_object_links') is null
     or to_regclass('public.value_object_parameter_definitions') is null
     or to_regclass('public.value_object_parameter_assignments') is null
     or to_regclass('public.fact_capture_precision_policies') is null
     or to_regclass('public.fact_capture_precision_preferences') is null
     or to_regclass('public.activity_semantic_enrichment_runs_cux4') is null
     or to_regclass('public.ai_usage_events') is null then
    raise exception using
      errcode='42P01',
      message='P4A_REQUIRED_TABLES_MISSING';
  end if;

  if to_regclass('public.activity_measure_provenance') is not null
     or to_regclass('public.ai_processing_instruction_sets') is not null
     or to_regclass('public.actor_ai_processing_preferences') is not null
     or to_regclass('public.activity_ai_processing_provenance') is not null
     or to_regprocedure(
       'public.get_activity_time_accounting_v1(uuid,uuid,timestamp with time zone,timestamp with time zone)'
     ) is not null then
    raise exception using
      errcode='23514',
      message='P4A_ALREADY_INSTALLED_OR_PARTIALLY_APPLIED';
  end if;

  if (select count(*) from public.value_objects) <> 15
     or (select count(*) from public.value_object_definition_versions) <> 15
     or (select count(*) from public.activity_events) <> 37
     or (select count(*) from public.activity_event_measures) <> 4
     or (select count(*) from public.activity_object_facts) <> 4
     or (select count(*) from public.activity_value_object_links) <> 16
     or (select count(*) from public.value_object_parameter_definitions) <> 24
     or (select count(*) from public.value_object_parameter_assignments) <> 0
     or (select count(*) from public.fact_capture_precision_policies) <> 4
     or (select count(*) from public.fact_capture_precision_preferences) <> 0
     or (select count(*) from public.activity_semantic_enrichment_runs_cux4) <> 19 then
    raise exception using
      errcode='23514',
      message='P4A_BASELINE_CHANGED';
  end if;

  if exists (
    select 1
    from public.activity_object_facts fact
    join public.value_objects value_object
      on value_object.id=fact.value_object_id
    where fact.value_object_id is not null
      and value_object.ontology_node_role_code is distinct from 'leaf'
  ) then
    raise exception using
      errcode='23514',
      message='P4A_EXISTING_FACT_TARGET_NOT_ONTOLOGY_LEAF';
  end if;
end;
$preflight$;

-- ============================================================
-- Separate quality axes
-- ============================================================

alter table public.activity_event_measures
  add column parameter_definition_id uuid
    references public.value_object_parameter_definitions(id)
    on delete restrict,
  add column precision_policy_code text
    references public.fact_capture_precision_policies(precision_policy_code)
    on delete restrict;

alter table public.activity_object_facts
  add column semantic_match_confidence numeric,
  add column semantic_match_method_code text,
  add column parameter_definition_id uuid
    references public.value_object_parameter_definitions(id)
    on delete restrict,
  add column parameter_assignment_id uuid
    references public.value_object_parameter_assignments(id)
    on delete set null;

alter table public.activity_object_facts
  add constraint activity_object_facts_semantic_match_confidence_p4a_check
    check (
      semantic_match_confidence is null
      or (
        semantic_match_confidence >= 0
        and semantic_match_confidence <= 1
      )
    ),
  add constraint activity_object_facts_semantic_match_method_p4a_check
    check (
      semantic_match_method_code is null
      or semantic_match_method_code in (
        'manual',
        'exact_alias',
        'exact_primary_name',
        'rule_based',
        'ai_candidate',
        'user_confirmed',
        'import'
      )
    );

alter table public.activity_value_object_links
  add column semantic_match_confidence numeric,
  add column semantic_match_method_code text;

alter table public.activity_value_object_links
  add constraint activity_value_object_links_semantic_match_confidence_p4a_check
    check (
      semantic_match_confidence is null
      or (
        semantic_match_confidence >= 0
        and semantic_match_confidence <= 1
      )
    ),
  add constraint activity_value_object_links_semantic_match_method_p4a_check
    check (
      semantic_match_method_code is null
      or semantic_match_method_code in (
        'manual',
        'exact_alias',
        'exact_primary_name',
        'rule_based',
        'ai_candidate',
        'user_confirmed',
        'import'
      )
    );

-- Existing links are intentionally not backfilled here.
-- The strengthened trigger below may enforce ontology-leaf rules on future
-- semantic-exposure writes, so P4A does not touch the 16 legacy/current rows.

-- ============================================================
-- Measure provenance
-- ============================================================

create table public.activity_measure_provenance (
  measure_id uuid primary key
    references public.activity_event_measures(id)
    on delete cascade,

  owner_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  value_origin_code text not null,
  source_reliability_code text not null,

  source_reference_type_code text,
  source_reference text,

  source_snapshot_json jsonb not null default '{}'::jsonb,
  identified_entity_json jsonb not null default '{}'::jsonb,

  assumption_text text,

  semantic_enrichment_run_id uuid
    references public.activity_semantic_enrichment_runs_cux4(id)
    on delete set null,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint activity_measure_provenance_origin_p4a_check
    check (
      value_origin_code in (
        'user_explicit',
        'user_edit',
        'device_measurement',
        'document_extract',
        'identified_reference',
        'deterministic_calculation',
        'ai_estimate',
        'typical_reference',
        'system_default'
      )
    ),

  constraint activity_measure_provenance_reliability_p4a_check
    check (
      source_reliability_code in (
        'authoritative',
        'identified_catalog',
        'device_reported',
        'user_reported',
        'deterministic',
        'inferred',
        'generic_reference'
      )
    ),

  constraint activity_measure_provenance_snapshot_shape_p4a_check
    check (
      jsonb_typeof(source_snapshot_json)='object'
      and jsonb_typeof(identified_entity_json)='object'
    ),

  constraint activity_measure_provenance_typical_notice_p4a_check
    check (
      value_origin_code <> 'typical_reference'
      or nullif(btrim(assumption_text),'') is not null
    ),

  constraint activity_measure_provenance_ai_notice_p4a_check
    check (
      value_origin_code <> 'ai_estimate'
      or nullif(btrim(assumption_text),'') is not null
    ),

  constraint activity_measure_provenance_origin_reliability_p4a_check
    check (
      (value_origin_code not in ('user_explicit','user_edit')
        or source_reliability_code='user_reported')
      and
      (value_origin_code <> 'device_measurement'
        or source_reliability_code='device_reported')
      and
      (value_origin_code <> 'deterministic_calculation'
        or source_reliability_code='deterministic')
      and
      (value_origin_code <> 'ai_estimate'
        or source_reliability_code='inferred')
      and
      (value_origin_code <> 'typical_reference'
        or source_reliability_code='generic_reference')
      and
      (value_origin_code <> 'identified_reference'
        or source_reliability_code in ('authoritative','identified_catalog'))
    )
);

create index activity_measure_provenance_actor_p4a_idx
  on public.activity_measure_provenance(
    owner_user_id,
    owner_actor_id,
    created_at desc
  );

alter table public.activity_measure_provenance enable row level security;

revoke all on table public.activity_measure_provenance
  from public,anon,authenticated,service_role;

grant select,insert,update
  on table public.activity_measure_provenance
  to service_role;

create policy activity_measure_provenance_no_browser_p4a
on public.activity_measure_provenance
for all
to anon,authenticated
using (false)
with check (false);

create or replace function public.enforce_activity_measure_provenance_p4a()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_measure public.activity_event_measures%rowtype;
begin
  select *
  into v_measure
  from public.activity_event_measures
  where id=new.measure_id;

  if not found then
    raise exception using
      errcode='23503',
      message='P4A_MEASURE_PROVENANCE_MEASURE_NOT_FOUND';
  end if;

  if new.owner_user_id is distinct from v_measure.user_id
     or new.owner_actor_id is distinct from v_measure.acting_as_actor_id then
    raise exception using
      errcode='42501',
      message='P4A_MEASURE_PROVENANCE_OWNER_MISMATCH';
  end if;

  new.updated_at := clock_timestamp();

  return new;
end;
$function$;

create trigger trg_activity_measure_provenance_p4a
before insert or update
on public.activity_measure_provenance
for each row
execute function public.enforce_activity_measure_provenance_p4a();

-- ============================================================
-- Ontology leaf guards
-- ============================================================

create or replace function public.enforce_value_object_parameter_assignment_v3()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_value_object public.value_objects%rowtype;
  v_definition public.value_object_parameter_definitions%rowtype;
begin
  select *
  into v_value_object
  from public.value_objects
  where id=new.value_object_id;

  if not found then
    raise exception using
      errcode='23503',
      message='P4A_PARAMETER_ASSIGNMENT_VALUE_OBJECT_NOT_FOUND';
  end if;

  if v_value_object.ontology_node_role_code is distinct from 'leaf' then
    raise exception using
      errcode='23514',
      message='P4A_PARAMETER_ASSIGNMENT_REQUIRES_ONTOLOGY_LEAF';
  end if;

  if v_value_object.owner_user_id is distinct from new.owner_user_id
     or v_value_object.owner_actor_id is distinct from new.owner_actor_id then
    raise exception using
      errcode='42501',
      message='P4A_PARAMETER_ASSIGNMENT_VALUE_OBJECT_OWNER_MISMATCH';
  end if;

  select *
  into v_definition
  from public.value_object_parameter_definitions
  where id=new.parameter_definition_id;

  if not found then
    raise exception using
      errcode='23503',
      message='P4A_PARAMETER_ASSIGNMENT_DEFINITION_NOT_FOUND';
  end if;

  if v_definition.status <> 'active' then
    raise exception using
      errcode='23514',
      message='P4A_PARAMETER_ASSIGNMENT_DEFINITION_NOT_ACTIVE';
  end if;

  if v_definition.scope_code='actor'
     and (
       v_definition.owner_user_id is distinct from new.owner_user_id
       or v_definition.owner_actor_id is distinct from new.owner_actor_id
     ) then
    raise exception using
      errcode='42501',
      message='P4A_PARAMETER_ASSIGNMENT_DEFINITION_OWNER_MISMATCH';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id=profile.actor_id
     and actor.status='active'
    where profile.owner_user_id=new.owner_user_id
      and profile.actor_id=new.owner_actor_id
  ) then
    raise exception using
      errcode='42501',
      message='P4A_PARAMETER_ASSIGNMENT_ACTOR_NOT_OWNED_BY_USER';
  end if;

  if new.created_by_actor_id is not null
     and not exists (
       select 1
       from public.actor_public_profiles profile
       where profile.owner_user_id=new.owner_user_id
         and profile.actor_id=new.created_by_actor_id
     ) then
    raise exception using
      errcode='42501',
      message='P4A_PARAMETER_ASSIGNMENT_CREATOR_NOT_OWNED_BY_USER';
  end if;

  return new;
end;
$function$;

create or replace function public.enforce_activity_fact_actor_alignment_v2()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_measure public.activity_event_measures%rowtype;
  v_value_object public.value_objects%rowtype;
begin
  select *
  into v_measure
  from public.activity_event_measures measure
  where measure.id=new.measure_id;

  if not found then
    raise exception using
      errcode='23503',
      message='P4A_FACT_MEASURE_NOT_FOUND';
  end if;

  if new.activity_event_id is distinct from v_measure.activity_event_id
     or new.user_id is distinct from v_measure.user_id
     or new.performed_by_actor_id is distinct from v_measure.performed_by_actor_id
     or new.acting_as_actor_id is distinct from v_measure.acting_as_actor_id
     or new.acting_for_actor_id is distinct from v_measure.acting_for_actor_id then
    raise exception using
      errcode='42501',
      message='P4A_FACT_MEASURE_ACTOR_MISMATCH';
  end if;

  if new.value_object_id is not null then
    select *
    into v_value_object
    from public.value_objects
    where id=new.value_object_id;

    if not found
       or v_value_object.owner_user_id is distinct from new.user_id
       or v_value_object.owner_actor_id is distinct from new.acting_as_actor_id then
      raise exception using
        errcode='42501',
        message='P4A_FACT_VALUE_OBJECT_ACTOR_MISMATCH';
    end if;

    if v_value_object.ontology_node_role_code is distinct from 'leaf' then
      raise exception using
        errcode='23514',
        message='P4A_FACT_REQUIRES_ONTOLOGY_LEAF';
    end if;
  end if;

  if new.parameter_assignment_id is not null
     and not exists (
       select 1
       from public.value_object_parameter_assignments assignment
       where assignment.id=new.parameter_assignment_id
         and assignment.value_object_id=new.value_object_id
         and assignment.owner_user_id=new.user_id
         and assignment.owner_actor_id=new.acting_as_actor_id
     ) then
    raise exception using
      errcode='23514',
      message='P4A_FACT_PARAMETER_ASSIGNMENT_TARGET_MISMATCH';
  end if;

  return new;
end;
$function$;

create or replace function public.enforce_activity_value_object_link_pp1a()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_activity public.activity_events%rowtype;
  v_value_object public.value_objects%rowtype;
begin
  if new.status='active' then
    new.deactivated_at := null;
  elsif new.deactivated_at is null then
    new.deactivated_at := clock_timestamp();
  end if;

  select *
  into v_activity
  from public.activity_events
  where id=new.activity_event_id;

  if not found then
    raise exception using
      errcode='23503',
      message='P4A_ACTIVITY_LINK_ACTIVITY_NOT_FOUND';
  end if;

  select *
  into v_value_object
  from public.value_objects
  where id=new.value_object_id;

  if not found then
    raise exception using
      errcode='23503',
      message='P4A_ACTIVITY_LINK_VALUE_OBJECT_NOT_FOUND';
  end if;

  if new.app_user_id is null then
    new.app_user_id := v_activity.user_id;
  end if;

  if new.actor_id is null then
    new.actor_id := v_activity.acting_as_actor_id;
  end if;

  if new.created_by_actor_id is null then
    new.created_by_actor_id := v_activity.acting_as_actor_id;
  end if;

  if new.app_user_id is distinct from v_activity.user_id
     or new.actor_id is distinct from v_activity.acting_as_actor_id
     or v_value_object.owner_user_id is distinct from v_activity.user_id
     or v_value_object.owner_actor_id is distinct from v_activity.acting_as_actor_id then
    raise exception using
      errcode='42501',
      message='P4A_ACTIVITY_LINK_OWNER_MISMATCH';
  end if;

  if new.link_type='planned_target' then
    if v_activity.activity_role_code <> 'planned' then
      raise exception using
        errcode='23514',
        message='P4A_PLANNED_TARGET_REQUIRES_PLANNED_ACTIVITY';
    end if;

    -- Planned activity may target root, intermediate or leaf.
    if v_value_object.ontology_node_role_code not in (
      'root','intermediate','leaf'
    ) then
      raise exception using
        errcode='23514',
        message='P4A_PLANNED_TARGET_REQUIRES_ONTOLOGY_VALUE_OBJECT';
    end if;
  elsif new.link_type='semantic_exposure' then
    if v_value_object.ontology_node_role_code is distinct from 'leaf' then
      raise exception using
        errcode='23514',
        message='P4A_SEMANTIC_EXPOSURE_REQUIRES_ONTOLOGY_LEAF';
    end if;
  end if;

  return new;
end;
$function$;

-- ============================================================
-- General AI instruction governance
-- ============================================================

create table public.ai_processing_instruction_sets (
  id uuid primary key default gen_random_uuid(),
  instruction_code text not null,
  locale_code text not null default 'global',
  purpose_text text,
  current_revision integer not null default 1,
  current_instruction_text text not null,
  status text not null default 'active',
  updated_by_app_user_id uuid
    references public.app_users(id)
    on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint ai_processing_instruction_sets_code_p4a_check
    check (instruction_code ~ '^[a-z][a-z0-9_]{2,79}$'),

  constraint ai_processing_instruction_sets_locale_p4a_check
    check (
      locale_code in (
        'global','en','pl','ru','uk','de','es','cs'
      )
    ),

  constraint ai_processing_instruction_sets_revision_p4a_check
    check (current_revision > 0),

  constraint ai_processing_instruction_sets_text_p4a_check
    check (
      char_length(btrim(current_instruction_text))
        between 1 and 40000
    ),

  constraint ai_processing_instruction_sets_status_p4a_check
    check (status in ('active','inactive')),

  constraint ai_processing_instruction_sets_key_p4a_unique
    unique (instruction_code,locale_code)
);

create table public.ai_processing_instruction_revisions (
  id uuid primary key default gen_random_uuid(),

  instruction_set_id uuid not null
    references public.ai_processing_instruction_sets(id)
    on delete restrict,

  instruction_code text not null,
  locale_code text not null,
  revision integer not null,
  instruction_text text not null,
  change_note text,
  changed_by_app_user_id uuid
    references public.app_users(id)
    on delete set null,
  created_at timestamptz not null default clock_timestamp(),

  constraint ai_processing_instruction_revisions_revision_p4a_check
    check (revision > 0),

  constraint ai_processing_instruction_revisions_key_p4a_unique
    unique (instruction_set_id,revision)
);

create table public.actor_ai_processing_preferences (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  locale_code text not null default 'global',
  current_revision integer not null default 1,
  custom_instruction_text text,
  status text not null default 'active',
  updated_by_actor_id uuid not null
    references public.actors(id)
    on delete restrict,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint actor_ai_processing_preferences_locale_p4a_check
    check (
      locale_code in (
        'global','en','pl','ru','uk','de','es','cs'
      )
    ),

  constraint actor_ai_processing_preferences_revision_p4a_check
    check (current_revision > 0),

  constraint actor_ai_processing_preferences_text_p4a_check
    check (
      custom_instruction_text is null
      or char_length(btrim(custom_instruction_text))
        between 1 and 20000
    ),

  constraint actor_ai_processing_preferences_status_p4a_check
    check (status in ('active','inactive')),

  constraint actor_ai_processing_preferences_key_p4a_unique
    unique (owner_user_id,owner_actor_id,locale_code)
);

create table public.actor_ai_processing_preference_revisions (
  id uuid primary key default gen_random_uuid(),

  preference_id uuid not null
    references public.actor_ai_processing_preferences(id)
    on delete restrict,

  owner_user_id uuid not null,
  owner_actor_id uuid not null,
  locale_code text not null,
  revision integer not null,
  instruction_text text,
  action_code text not null,
  changed_by_actor_id uuid not null
    references public.actors(id)
    on delete restrict,
  created_at timestamptz not null default clock_timestamp(),

  constraint actor_ai_processing_preference_revisions_revision_p4a_check
    check (revision > 0),

  constraint actor_ai_processing_preference_revisions_action_p4a_check
    check (action_code in ('save_custom','restore_default')),

  constraint actor_ai_processing_preference_revisions_key_p4a_unique
    unique (preference_id,revision)
);

alter table public.ai_processing_instruction_sets enable row level security;
alter table public.ai_processing_instruction_revisions enable row level security;
alter table public.actor_ai_processing_preferences enable row level security;
alter table public.actor_ai_processing_preference_revisions enable row level security;

revoke all on table
  public.ai_processing_instruction_sets,
  public.ai_processing_instruction_revisions,
  public.actor_ai_processing_preferences,
  public.actor_ai_processing_preference_revisions
from public,anon,authenticated,service_role;

grant select,insert,update on table
  public.ai_processing_instruction_sets,
  public.actor_ai_processing_preferences
to service_role;

-- Revision ledgers are written only by SECURITY DEFINER append triggers.
grant select on table
  public.ai_processing_instruction_revisions,
  public.actor_ai_processing_preference_revisions
to service_role;

-- ============================================================
-- Immutable instruction revision ledgers
-- ============================================================

create or replace function public.prepare_ai_processing_instruction_set_p4a()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
begin
  if tg_op='INSERT' then
    new.current_revision := 1;
  else
    if new.instruction_code is distinct from old.instruction_code
       or new.locale_code is distinct from old.locale_code
       or new.created_at is distinct from old.created_at then
      raise exception using
        errcode='23514',
        message='P4A_AI_INSTRUCTION_IDENTITY_IMMUTABLE';
    end if;

    if new.current_instruction_text is distinct from old.current_instruction_text then
      new.current_revision := old.current_revision + 1;
    else
      new.current_revision := old.current_revision;
    end if;
  end if;

  new.updated_at := clock_timestamp();

  return new;
end;
$function$;

create or replace function public.append_ai_processing_instruction_revision_p4a()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
begin
  if tg_op='INSERT'
     or new.current_instruction_text is distinct from old.current_instruction_text then
    insert into public.ai_processing_instruction_revisions (
      instruction_set_id,
      instruction_code,
      locale_code,
      revision,
      instruction_text,
      changed_by_app_user_id
    )
    values (
      new.id,
      new.instruction_code,
      new.locale_code,
      new.current_revision,
      new.current_instruction_text,
      new.updated_by_app_user_id
    );
  end if;

  return new;
end;
$function$;

create trigger trg_ai_processing_instruction_set_prepare_p4a
before insert or update
on public.ai_processing_instruction_sets
for each row
execute function public.prepare_ai_processing_instruction_set_p4a();

create trigger trg_ai_processing_instruction_revision_append_p4a
after insert or update of current_instruction_text
on public.ai_processing_instruction_sets
for each row
execute function public.append_ai_processing_instruction_revision_p4a();

create or replace function public.prepare_actor_ai_processing_preference_p4a()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
begin
  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id=profile.actor_id
     and actor.status='active'
    where profile.owner_user_id=new.owner_user_id
      and profile.actor_id=new.owner_actor_id
  ) then
    raise exception using
      errcode='42501',
      message='P4A_AI_PREFERENCE_ACTOR_NOT_OWNED_BY_USER';
  end if;

  if new.updated_by_actor_id is distinct from new.owner_actor_id then
    raise exception using
      errcode='42501',
      message='P4A_AI_PREFERENCE_UPDATED_BY_ACTOR_MISMATCH';
  end if;

  if tg_op='INSERT' then
    new.current_revision := 1;
  else
    if new.owner_user_id is distinct from old.owner_user_id
       or new.owner_actor_id is distinct from old.owner_actor_id
       or new.locale_code is distinct from old.locale_code
       or new.created_at is distinct from old.created_at then
      raise exception using
        errcode='23514',
        message='P4A_AI_PREFERENCE_IDENTITY_IMMUTABLE';
    end if;

    if new.custom_instruction_text is distinct from old.custom_instruction_text then
      new.current_revision := old.current_revision + 1;
    else
      new.current_revision := old.current_revision;
    end if;
  end if;

  new.updated_at := clock_timestamp();

  return new;
end;
$function$;

create or replace function public.append_actor_ai_processing_preference_revision_p4a()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
begin
  if tg_op='INSERT'
     or new.custom_instruction_text is distinct from old.custom_instruction_text then
    insert into public.actor_ai_processing_preference_revisions (
      preference_id,
      owner_user_id,
      owner_actor_id,
      locale_code,
      revision,
      instruction_text,
      action_code,
      changed_by_actor_id
    )
    values (
      new.id,
      new.owner_user_id,
      new.owner_actor_id,
      new.locale_code,
      new.current_revision,
      new.custom_instruction_text,
      case
        when new.custom_instruction_text is null then 'restore_default'
        else 'save_custom'
      end,
      new.updated_by_actor_id
    );
  end if;

  return new;
end;
$function$;

create trigger trg_actor_ai_processing_preference_prepare_p4a
before insert or update
on public.actor_ai_processing_preferences
for each row
execute function public.prepare_actor_ai_processing_preference_p4a();

create trigger trg_actor_ai_processing_preference_revision_append_p4a
after insert or update of custom_instruction_text
on public.actor_ai_processing_preferences
for each row
execute function public.append_actor_ai_processing_preference_revision_p4a();

create or replace function public.forbid_p4a_history_mutation()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
begin
  raise exception using
    errcode='23514',
    message='P4A_IMMUTABLE_HISTORY_ROW';
end;
$function$;

create trigger trg_ai_processing_instruction_revisions_immutable_p4a
before update or delete
on public.ai_processing_instruction_revisions
for each row
execute function public.forbid_p4a_history_mutation();

create trigger trg_actor_ai_processing_preference_revisions_immutable_p4a
before update or delete
on public.actor_ai_processing_preference_revisions
for each row
execute function public.forbid_p4a_history_mutation();

-- ============================================================
-- AI processing provenance snapshot
-- ============================================================

create table public.activity_ai_processing_provenance (
  semantic_enrichment_run_id uuid primary key
    references public.activity_semantic_enrichment_runs_cux4(id)
    on delete cascade,

  owner_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  ai_usage_event_id uuid
    references public.ai_usage_events(id)
    on delete set null,

  provider text,
  model_name text,

  system_instruction_snapshot_json jsonb not null default '[]'::jsonb,
  actor_instruction_snapshot_json jsonb not null default '{}'::jsonb,
  external_source_snapshot_json jsonb not null default '[]'::jsonb,
  inference_assumptions_json jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default clock_timestamp(),

  constraint activity_ai_processing_provenance_shapes_p4a_check
    check (
      jsonb_typeof(system_instruction_snapshot_json)='array'
      and jsonb_typeof(actor_instruction_snapshot_json)='object'
      and jsonb_typeof(external_source_snapshot_json)='array'
      and jsonb_typeof(inference_assumptions_json)='array'
    )
);

alter table public.activity_ai_processing_provenance
  enable row level security;

revoke all on table public.activity_ai_processing_provenance
from public,anon,authenticated,service_role;

grant select,insert
on table public.activity_ai_processing_provenance
to service_role;

-- ============================================================
-- Processing provenance owner/snapshot guard
-- ============================================================

create or replace function public.enforce_activity_ai_processing_provenance_p4a()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_run public.activity_semantic_enrichment_runs_cux4%rowtype;
begin
  select *
  into v_run
  from public.activity_semantic_enrichment_runs_cux4
  where id=new.semantic_enrichment_run_id;

  if not found then
    raise exception using
      errcode='23503',
      message='P4A_AI_PROCESSING_RUN_NOT_FOUND';
  end if;

  if new.owner_user_id is distinct from v_run.owner_user_id
     or new.owner_actor_id is distinct from v_run.owner_actor_id then
    raise exception using
      errcode='42501',
      message='P4A_AI_PROCESSING_PROVENANCE_OWNER_MISMATCH';
  end if;

  if new.ai_usage_event_id is not null
     and not exists (
       select 1
       from public.ai_usage_events usage
       where usage.id=new.ai_usage_event_id
         and usage.app_user_id=new.owner_user_id
     ) then
    raise exception using
      errcode='42501',
      message='P4A_AI_USAGE_EVENT_OWNER_MISMATCH';
  end if;

  return new;
end;
$function$;

create trigger trg_activity_ai_processing_provenance_p4a
before insert
on public.activity_ai_processing_provenance
for each row
execute function public.enforce_activity_ai_processing_provenance_p4a();

create trigger trg_activity_ai_processing_provenance_immutable_p4a
before update or delete
on public.activity_ai_processing_provenance
for each row
execute function public.forbid_p4a_history_mutation();

-- ============================================================
-- Deterministic time accounting
-- ============================================================

create or replace function public.get_activity_time_accounting_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $function$
declare
  v_result jsonb;
begin
  if p_from is not null
     and p_to is not null
     and p_to <= p_from then
    raise exception using
      errcode='22023',
      message='P4A_TIME_RANGE_INVALID';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id=profile.actor_id
     and actor.status='active'
    where profile.owner_user_id=p_owner_user_id
      and profile.actor_id=p_owner_actor_id
  ) then
    raise exception using
      errcode='42501',
      message='P4A_TIME_ACCOUNTING_ACTOR_NOT_OWNED_BY_USER';
  end if;

  with source_events as (
    select
      event.id,
      event.started_at,
      event.ended_at,
      event.duration_minutes::numeric as stored_activity_minutes,
      (
        event.started_at is not null
        and event.ended_at is not null
        and event.ended_at > event.started_at
      ) as has_exact_interval
    from public.activity_events event
    where event.user_id=p_owner_user_id
      and event.acting_as_actor_id=p_owner_actor_id
      and event.activity_role_code='actual'
      and event.status <> 'cancelled'
  ),
  selected_events as (
    select *
    from source_events event
    where (
      event.has_exact_interval
      and (p_to is null or event.started_at < p_to)
      and (p_from is null or event.ended_at > p_from)
    )
    or (
      not event.has_exact_interval
      and p_from is null
      and p_to is null
    )
  ),
  clipped as (
    select
      event.id,
      event.has_exact_interval,
      event.stored_activity_minutes,
      case
        when event.has_exact_interval
        then greatest(
          event.started_at,
          coalesce(p_from,event.started_at)
        )
      end as s,
      case
        when event.has_exact_interval
        then least(
          event.ended_at,
          coalesce(p_to,event.ended_at)
        )
      end as e,
      case
        when event.has_exact_interval
        then extract(
          epoch from (event.ended_at-event.started_at)
        )/60.0
      end as full_interval_minutes
    from selected_events event
  ),
  normalized as (
    select
      id,
      has_exact_interval,
      s,
      e,
      case
        when has_exact_interval then
          case
            when full_interval_minutes > 0 then
              coalesce(
                stored_activity_minutes,
                full_interval_minutes
              )
              * (
                extract(epoch from (e-s))/60.0
              )
              / full_interval_minutes
            else 0
          end
        else coalesce(stored_activity_minutes,0)
      end as selected_activity_minutes
    from clipped
    where not has_exact_interval
       or (s is not null and e is not null and e>s)
  ),
  valid_intervals as (
    select s,e
    from normalized
    where has_exact_interval
  ),
  points as (
    select s as ts,1::integer as delta
    from valid_intervals
    union all
    select e as ts,-1::integer as delta
    from valid_intervals
  ),
  point_totals as (
    select ts,sum(delta)::integer as delta
    from points
    group by ts
  ),
  sweep as (
    select
      ts,
      lead(ts) over (order by ts) as next_ts,
      sum(delta) over (
        order by ts
        rows between unbounded preceding and current row
      )::integer as concurrent
    from point_totals
  ),
  wall as (
    select
      coalesce(
        sum(
          extract(epoch from (next_ts-ts))/60.0
        ) filter (
          where concurrent>0
            and next_ts is not null
        ),
        0
      ) as wall_clock_minutes,
      coalesce(max(concurrent),0)::integer
        as max_concurrent_activities
    from sweep
  ),
  totals as (
    select
      count(*)::integer as event_count,
      coalesce(sum(selected_activity_minutes),0)
        as activity_minutes,
      coalesce(
        sum(selected_activity_minutes) filter (
          where not has_exact_interval
        ),
        0
      ) as unplaced_activity_minutes
    from normalized
  )
  select jsonb_build_object(
    'ok',true,
    'contractVersion','P4A_ACTIVITY_MEASURE_FACT_AI_V1',
    'eventCount',totals.event_count,
    'activityMinutes',round(totals.activity_minutes,2),
    'wallClockMinutes',
      round(wall.wall_clock_minutes,2),
    'overlapActivityMinutes',
      round(
        greatest(
          totals.activity_minutes
            - totals.unplaced_activity_minutes
            - wall.wall_clock_minutes,
          0
        ),
        2
      ),
    'unplacedActivityMinutes',
      round(totals.unplaced_activity_minutes,2),
    'maxConcurrentActivities',
      wall.max_concurrent_activities
  )
  into v_result
  from totals
  cross join wall;

  return v_result;
end;
$function$;

revoke all on function public.get_activity_time_accounting_v1(
  uuid,uuid,timestamptz,timestamptz
) from public,anon,authenticated;

grant execute on function public.get_activity_time_accounting_v1(
  uuid,uuid,timestamptz,timestamptz
) to service_role;

comment on table public.activity_measure_provenance is
  'P4A provenance for one neutral activity measure: explicit/device/reference/derived/AI/typical origin, source reliability, snapshots, identified entity and disclosed assumptions.';

comment on table public.activity_ai_processing_provenance is
  'P4A reproducibility snapshot for an activity semantic-enrichment run: exact instruction bundle, actor preference, source evidence, model and assumptions.';

comment on function public.get_activity_time_accounting_v1(
  uuid,uuid,timestamptz,timestamptz
) is
  'P4A deterministic event-count/activity-minutes/wall-clock/overlap/unplaced/max-concurrency accounting. Bounded ranges include only placeable exact intervals; unplaced duration-only events are reported only for unbounded all-time queries. No AI calls.';

commit;
