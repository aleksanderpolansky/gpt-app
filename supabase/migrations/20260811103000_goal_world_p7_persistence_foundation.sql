/*
ARCTor.app — Goal World Constructor
P7 Goal World Persistence Foundation v1

Creates private persistence for:
- stable Goal World identity;
- exact goal statements;
- normalized Goal Definition revisions;
- immutable Goal World revisions;
- one actor-declared terminal objective + deep subgoals;
- world-specific Value Object memberships;
- desired target criteria;
- proposal-only alternative/hidden-goal hypotheses.

NO runtime write RPC is exposed by this migration.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
begin
  if to_regclass('public.actors') is null
     or to_regclass('public.value_objects') is null then
    raise exception using
      errcode = '42P01',
      message = 'P7_REQUIRED_REALITY_FOUNDATION_MISSING';
  end if;

  if to_regclass('public.goal_worlds') is not null
     or to_regclass('public.goal_world_goal_statements') is not null
     or to_regclass('public.goal_world_goal_definitions') is not null
     or to_regclass('public.goal_world_revisions') is not null
     or to_regclass('public.goal_world_objectives') is not null
     or to_regclass('public.goal_world_object_memberships') is not null
     or to_regclass('public.goal_world_target_criteria') is not null
     or to_regclass('public.goal_world_goal_hypotheses') is not null then
    raise exception using
      errcode = '23514',
      message = 'P7_GOAL_WORLD_PERSISTENCE_ALREADY_OR_PARTIALLY_INSTALLED';
  end if;
end;
$preflight$;


create table public.goal_worlds (
  id uuid primary key default gen_random_uuid(),

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  lifecycle_status_code text not null
    default 'draft',

  current_revision_id uuid null,
  current_revision_number integer not null
    default 0,

  created_at timestamptz not null
    default clock_timestamp(),
  updated_at timestamptz not null
    default clock_timestamp(),

  constraint goal_worlds_lifecycle_p7_check
    check (
      lifecycle_status_code in (
        'draft',
        'definition_ready',
        'compiled',
        'ready_for_activity_intake',
        'active',
        'paused',
        'completed',
        'abandoned'
      )
    ),

  constraint goal_worlds_current_revision_shape_p7_check
    check (
      (
        current_revision_id is null
        and current_revision_number = 0
      )
      or
      (
        current_revision_id is not null
        and current_revision_number > 0
      )
    )
);


create table public.goal_world_goal_statements (
  id uuid primary key default gen_random_uuid(),

  goal_world_id uuid not null
    references public.goal_worlds(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  exact_text text not null,

  recorded_at timestamptz not null
    default clock_timestamp(),

  constraint goal_world_goal_statements_text_p7_check
    check (char_length(btrim(exact_text)) > 0)
);


create table public.goal_world_goal_definitions (
  id uuid primary key default gen_random_uuid(),

  goal_world_id uuid not null
    references public.goal_worlds(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  source_goal_statement_id uuid not null
    references public.goal_world_goal_statements(id)
    on delete restrict,

  schema_version integer not null
    default 1,

  definition_json jsonb not null,

  completeness_percent integer not null,

  methodology_trace_json jsonb null,

  created_at timestamptz not null
    default clock_timestamp(),

  constraint goal_world_goal_definitions_schema_version_p7_check
    check (schema_version > 0),

  constraint goal_world_goal_definitions_definition_object_p7_check
    check (jsonb_typeof(definition_json) = 'object'),

  constraint goal_world_goal_definitions_completeness_p7_check
    check (
      completeness_percent between 0 and 100
    ),

  constraint goal_world_goal_definitions_methodology_trace_p7_check
    check (
      methodology_trace_json is null
      or jsonb_typeof(methodology_trace_json) = 'object'
    )
);


create table public.goal_world_revisions (
  id uuid primary key default gen_random_uuid(),

  goal_world_id uuid not null
    references public.goal_worlds(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  revision_number integer not null,

  previous_revision_id uuid null
    references public.goal_world_revisions(id)
    on delete restrict,

  source_goal_statement_id uuid not null
    references public.goal_world_goal_statements(id)
    on delete restrict,

  goal_definition_revision_id uuid not null
    references public.goal_world_goal_definitions(id)
    on delete restrict,

  revision_reason_code text not null,

  created_at timestamptz not null
    default clock_timestamp(),

  constraint goal_world_revisions_number_p7_check
    check (revision_number > 0),

  constraint goal_world_revisions_reason_p7_check
    check (
      revision_reason_code in (
        'initial_definition',
        'user_refinement',
        'new_reality_evidence',
        'changed_resources',
        'changed_constraints',
        'feasibility_correction',
        'changed_life_context',
        'other'
      )
    ),

  constraint goal_world_revisions_first_previous_p7_check
    check (
      (
        revision_number = 1
        and previous_revision_id is null
        and revision_reason_code = 'initial_definition'
      )
      or
      (
        revision_number > 1
        and previous_revision_id is not null
        and revision_reason_code <> 'initial_definition'
      )
    ),

  constraint goal_world_revisions_world_number_p7_unique
    unique (goal_world_id, revision_number)
);


alter table public.goal_worlds
  add constraint goal_worlds_current_revision_p7_fkey
  foreign key (current_revision_id)
  references public.goal_world_revisions(id)
  on delete restrict;


create table public.goal_world_objectives (
  id uuid primary key default gen_random_uuid(),

  goal_world_revision_id uuid not null
    references public.goal_world_revisions(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  objective_role_code text not null,

  parent_objective_id uuid null
    references public.goal_world_objectives(id)
    on delete restrict,

  primary_target_value_object_id uuid null
    references public.value_objects(id)
    on delete restrict,

  label text not null,

  origin_code text not null,

  created_at timestamptz not null
    default clock_timestamp(),

  constraint goal_world_objectives_role_p7_check
    check (
      objective_role_code in (
        'terminal',
        'intermediate',
        'supporting'
      )
    ),

  constraint goal_world_objectives_parent_shape_p7_check
    check (
      (
        objective_role_code = 'terminal'
        and parent_objective_id is null
      )
      or
      (
        objective_role_code <> 'terminal'
        and parent_objective_id is not null
      )
    ),

  constraint goal_world_objectives_origin_p7_check
    check (
      (
        objective_role_code = 'terminal'
        and origin_code = 'actor_declared_terminal'
      )
      or
      (
        objective_role_code <> 'terminal'
        and origin_code in (
          'compiler_derived',
          'user_added'
        )
      )
    ),

  constraint goal_world_objectives_not_self_parent_p7_check
    check (
      parent_objective_id is null
      or parent_objective_id <> id
    ),

  constraint goal_world_objectives_label_p7_check
    check (char_length(btrim(label)) > 0)
);


create unique index goal_world_objectives_one_terminal_p7_uidx
  on public.goal_world_objectives(
    goal_world_revision_id
  )
  where objective_role_code = 'terminal';


create index goal_world_objectives_parent_p7_idx
  on public.goal_world_objectives(
    parent_objective_id
  )
  where parent_objective_id is not null;


create table public.goal_world_object_memberships (
  id uuid primary key default gen_random_uuid(),

  goal_world_revision_id uuid not null
    references public.goal_world_revisions(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  value_object_id uuid not null
    references public.value_objects(id)
    on delete restrict,

  role_codes text[] not null,

  orientation_code text not null
    default 'neutral',

  objective_ids uuid[] not null
    default '{}'::uuid[],

  note text null,

  created_at timestamptz not null
    default clock_timestamp(),

  constraint goal_world_object_memberships_roles_p7_check
    check (
      cardinality(role_codes) > 0
      and role_codes <@ array[
        'target',
        'prerequisite',
        'constraint',
        'resource',
        'support',
        'indicator',
        'context',
        'risk'
      ]::text[]
    ),

  constraint goal_world_object_memberships_orientation_p7_check
    check (
      orientation_code in (
        'approach',
        'avoid',
        'maintain',
        'neutral'
      )
    ),

  constraint goal_world_object_memberships_revision_vo_p7_unique
    unique (
      goal_world_revision_id,
      value_object_id
    )
);


create index goal_world_object_memberships_vo_p7_idx
  on public.goal_world_object_memberships(
    owner_actor_id,
    value_object_id,
    goal_world_revision_id
  );


create table public.goal_world_target_criteria (
  id uuid primary key default gen_random_uuid(),

  goal_world_revision_id uuid not null
    references public.goal_world_revisions(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  objective_id uuid not null
    references public.goal_world_objectives(id)
    on delete restrict,

  value_object_id uuid not null
    references public.value_objects(id)
    on delete restrict,

  parameter_code text null,

  comparator_code text not null,

  target_value_json jsonb null,
  target_value_upper_json jsonb null,

  unit_code text null,

  definition_text text not null
    default '',

  rule_ref_json jsonb null,

  created_at timestamptz not null
    default clock_timestamp(),

  constraint goal_world_target_criteria_comparator_p7_check
    check (
      comparator_code in (
        'eq',
        'gte',
        'lte',
        'range',
        'contains',
        'state_is',
        'custom_rule'
      )
    ),

  constraint goal_world_target_criteria_range_p7_check
    check (
      comparator_code <> 'range'
      or target_value_upper_json is not null
    ),

  constraint goal_world_target_criteria_rule_ref_p7_check
    check (
      rule_ref_json is null
      or jsonb_typeof(rule_ref_json) = 'object'
    )
);


create index goal_world_target_criteria_vo_p7_idx
  on public.goal_world_target_criteria(
    owner_actor_id,
    value_object_id,
    goal_world_revision_id
  );


create table public.goal_world_goal_hypotheses (
  id uuid primary key default gen_random_uuid(),

  goal_world_revision_id uuid not null
    references public.goal_world_revisions(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  summary text not null,

  status_code text not null
    default 'proposal_only',

  evidence_refs_json jsonb not null
    default '[]'::jsonb,

  proposed_at timestamptz not null
    default clock_timestamp(),

  constraint goal_world_goal_hypotheses_summary_p7_check
    check (char_length(btrim(summary)) > 0),

  constraint goal_world_goal_hypotheses_status_p7_check
    check (status_code = 'proposal_only'),

  constraint goal_world_goal_hypotheses_evidence_array_p7_check
    check (
      jsonb_typeof(evidence_refs_json) = 'array'
    )
);


/*
Owner alignment and revision-integrity guards.
*/

create or replace function public.enforce_goal_world_definition_integrity_p7()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_world_actor uuid;
  v_statement_world uuid;
  v_statement_actor uuid;
  v_statement_text text;
begin
  select owner_actor_id
  into v_world_actor
  from public.goal_worlds
  where id = new.goal_world_id;

  if v_world_actor is null
     or v_world_actor <> new.owner_actor_id then
    raise exception using
      errcode = '23514',
      message = 'P7_GOAL_DEFINITION_WORLD_OWNER_MISMATCH';
  end if;

  select
    goal_world_id,
    owner_actor_id,
    exact_text
  into
    v_statement_world,
    v_statement_actor,
    v_statement_text
  from public.goal_world_goal_statements
  where id = new.source_goal_statement_id;

  if v_statement_world is distinct from new.goal_world_id
     or v_statement_actor is distinct from new.owner_actor_id then
    raise exception using
      errcode = '23514',
      message = 'P7_GOAL_DEFINITION_STATEMENT_MISMATCH';
  end if;

  if coalesce(new.definition_json ->> 'sourceGoalText','')
     <> v_statement_text then
    raise exception using
      errcode = '23514',
      message = 'P7_GOAL_DEFINITION_SOURCE_TEXT_MISMATCH';
  end if;

  return new;
end;
$function$;


create trigger goal_world_goal_definitions_integrity_p7_trg
before insert on public.goal_world_goal_definitions
for each row
execute function public.enforce_goal_world_definition_integrity_p7();


create or replace function public.enforce_goal_world_revision_integrity_p7()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_world_actor uuid;
  v_statement_world uuid;
  v_statement_actor uuid;
  v_definition_world uuid;
  v_definition_actor uuid;
  v_definition_statement uuid;
  v_previous_world uuid;
  v_previous_actor uuid;
  v_previous_number integer;
begin
  select owner_actor_id
  into v_world_actor
  from public.goal_worlds
  where id = new.goal_world_id;

  if v_world_actor is null
     or v_world_actor <> new.owner_actor_id then
    raise exception using
      errcode = '23514',
      message = 'P7_GOAL_REVISION_WORLD_OWNER_MISMATCH';
  end if;

  select goal_world_id, owner_actor_id
  into v_statement_world, v_statement_actor
  from public.goal_world_goal_statements
  where id = new.source_goal_statement_id;

  if v_statement_world is distinct from new.goal_world_id
     or v_statement_actor is distinct from new.owner_actor_id then
    raise exception using
      errcode = '23514',
      message = 'P7_GOAL_REVISION_STATEMENT_MISMATCH';
  end if;

  select
    goal_world_id,
    owner_actor_id,
    source_goal_statement_id
  into
    v_definition_world,
    v_definition_actor,
    v_definition_statement
  from public.goal_world_goal_definitions
  where id = new.goal_definition_revision_id;

  if v_definition_world is distinct from new.goal_world_id
     or v_definition_actor is distinct from new.owner_actor_id
     or v_definition_statement is distinct from new.source_goal_statement_id then
    raise exception using
      errcode = '23514',
      message = 'P7_GOAL_REVISION_DEFINITION_MISMATCH';
  end if;

  if new.revision_number > 1 then
    select
      goal_world_id,
      owner_actor_id,
      revision_number
    into
      v_previous_world,
      v_previous_actor,
      v_previous_number
    from public.goal_world_revisions
    where id = new.previous_revision_id;

    if v_previous_world is distinct from new.goal_world_id
       or v_previous_actor is distinct from new.owner_actor_id
       or v_previous_number is distinct from new.revision_number - 1 then
      raise exception using
        errcode = '23514',
        message = 'P7_GOAL_REVISION_PREVIOUS_MISMATCH';
    end if;
  end if;

  return new;
end;
$function$;


create trigger goal_world_revisions_integrity_p7_trg
before insert on public.goal_world_revisions
for each row
execute function public.enforce_goal_world_revision_integrity_p7();


create or replace function public.enforce_goal_world_objective_integrity_p7()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_revision_actor uuid;
  v_parent_revision uuid;
  v_parent_actor uuid;
begin
  select owner_actor_id
  into v_revision_actor
  from public.goal_world_revisions
  where id = new.goal_world_revision_id;

  if v_revision_actor is null
     or v_revision_actor <> new.owner_actor_id then
    raise exception using
      errcode = '23514',
      message = 'P7_OBJECTIVE_REVISION_OWNER_MISMATCH';
  end if;

  if new.parent_objective_id is not null then
    select
      goal_world_revision_id,
      owner_actor_id
    into
      v_parent_revision,
      v_parent_actor
    from public.goal_world_objectives
    where id = new.parent_objective_id;

    if v_parent_revision is distinct from new.goal_world_revision_id
       or v_parent_actor is distinct from new.owner_actor_id then
      raise exception using
        errcode = '23514',
        message = 'P7_OBJECTIVE_PARENT_REVISION_MISMATCH';
    end if;
  end if;

  return new;
end;
$function$;


create trigger goal_world_objectives_integrity_p7_trg
before insert on public.goal_world_objectives
for each row
execute function public.enforce_goal_world_objective_integrity_p7();


create or replace function public.enforce_goal_world_membership_integrity_p7()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_revision_actor uuid;
  v_objective_id uuid;
begin
  select owner_actor_id
  into v_revision_actor
  from public.goal_world_revisions
  where id = new.goal_world_revision_id;

  if v_revision_actor is null
     or v_revision_actor <> new.owner_actor_id then
    raise exception using
      errcode = '23514',
      message = 'P7_MEMBERSHIP_REVISION_OWNER_MISMATCH';
  end if;

  foreach v_objective_id in array new.objective_ids
  loop
    if not exists (
      select 1
      from public.goal_world_objectives objective
      where objective.id = v_objective_id
        and objective.goal_world_revision_id = new.goal_world_revision_id
        and objective.owner_actor_id = new.owner_actor_id
    ) then
      raise exception using
        errcode = '23514',
        message = 'P7_MEMBERSHIP_OBJECTIVE_MISMATCH';
    end if;
  end loop;

  return new;
end;
$function$;


create trigger goal_world_object_memberships_integrity_p7_trg
before insert on public.goal_world_object_memberships
for each row
execute function public.enforce_goal_world_membership_integrity_p7();


create or replace function public.enforce_goal_world_target_criterion_integrity_p7()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_revision_actor uuid;
begin
  select owner_actor_id
  into v_revision_actor
  from public.goal_world_revisions
  where id = new.goal_world_revision_id;

  if v_revision_actor is null
     or v_revision_actor <> new.owner_actor_id then
    raise exception using
      errcode = '23514',
      message = 'P7_TARGET_CRITERION_REVISION_OWNER_MISMATCH';
  end if;

  if not exists (
    select 1
    from public.goal_world_objectives objective
    where objective.id = new.objective_id
      and objective.goal_world_revision_id = new.goal_world_revision_id
      and objective.owner_actor_id = new.owner_actor_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'P7_TARGET_CRITERION_OBJECTIVE_MISMATCH';
  end if;

  return new;
end;
$function$;


create trigger goal_world_target_criteria_integrity_p7_trg
before insert on public.goal_world_target_criteria
for each row
execute function public.enforce_goal_world_target_criterion_integrity_p7();


create or replace function public.enforce_goal_world_hypothesis_integrity_p7()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_revision_actor uuid;
begin
  select owner_actor_id
  into v_revision_actor
  from public.goal_world_revisions
  where id = new.goal_world_revision_id;

  if v_revision_actor is null
     or v_revision_actor <> new.owner_actor_id then
    raise exception using
      errcode = '23514',
      message = 'P7_HYPOTHESIS_REVISION_OWNER_MISMATCH';
  end if;

  return new;
end;
$function$;


create trigger goal_world_goal_hypotheses_integrity_p7_trg
before insert on public.goal_world_goal_hypotheses
for each row
execute function public.enforce_goal_world_hypothesis_integrity_p7();


create or replace function public.enforce_goal_world_current_revision_p7()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_revision_world uuid;
  v_revision_actor uuid;
  v_revision_number integer;
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.owner_actor_id is distinct from old.owner_actor_id
       or new.created_at is distinct from old.created_at then
      raise exception using
        errcode = '42501',
        message = 'P7_GOAL_WORLD_STABLE_IDENTITY_IMMUTABLE';
    end if;

    if new.current_revision_number < old.current_revision_number then
      raise exception using
        errcode = '23514',
        message = 'P7_GOAL_WORLD_REVISION_POINTER_CANNOT_MOVE_BACKWARD';
    end if;
  end if;

  if new.current_revision_id is not null then
    select
      goal_world_id,
      owner_actor_id,
      revision_number
    into
      v_revision_world,
      v_revision_actor,
      v_revision_number
    from public.goal_world_revisions
    where id = new.current_revision_id;

    if v_revision_world is distinct from new.id
       or v_revision_actor is distinct from new.owner_actor_id
       or v_revision_number is distinct from new.current_revision_number then
      raise exception using
        errcode = '23514',
        message = 'P7_GOAL_WORLD_CURRENT_REVISION_MISMATCH';
    end if;
  end if;

  new.updated_at := clock_timestamp();
  return new;
end;
$function$;


create trigger goal_worlds_current_revision_p7_trg
before insert or update on public.goal_worlds
for each row
execute function public.enforce_goal_world_current_revision_p7();


create or replace function public.enforce_exactly_one_terminal_objective_p7()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_count integer;
begin
  select count(*)
  into v_count
  from public.goal_world_objectives objective
  where objective.goal_world_revision_id = new.id
    and objective.objective_role_code = 'terminal'
    and objective.origin_code = 'actor_declared_terminal';

  if v_count <> 1 then
    raise exception using
      errcode = '23514',
      message = 'P7_EXACTLY_ONE_ACTOR_DECLARED_TERMINAL_OBJECTIVE_REQUIRED';
  end if;

  return null;
end;
$function$;


create constraint trigger goal_world_revision_terminal_guard_p7_trg
after insert on public.goal_world_revisions
deferrable initially deferred
for each row
execute function public.enforce_exactly_one_terminal_objective_p7();


/*
Immutable revision/history rows.
*/

create or replace function public.prevent_goal_world_revision_history_mutation_p7()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  raise exception using
    errcode = '42501',
    message = 'P7_GOAL_WORLD_REVISION_HISTORY_IMMUTABLE';
end;
$function$;


create trigger goal_world_goal_statements_immutable_p7_trg
before update or delete on public.goal_world_goal_statements
for each row
execute function public.prevent_goal_world_revision_history_mutation_p7();

create trigger goal_world_goal_definitions_immutable_p7_trg
before update or delete on public.goal_world_goal_definitions
for each row
execute function public.prevent_goal_world_revision_history_mutation_p7();

create trigger goal_world_revisions_immutable_p7_trg
before update or delete on public.goal_world_revisions
for each row
execute function public.prevent_goal_world_revision_history_mutation_p7();

create trigger goal_world_objectives_immutable_p7_trg
before update or delete on public.goal_world_objectives
for each row
execute function public.prevent_goal_world_revision_history_mutation_p7();

create trigger goal_world_object_memberships_immutable_p7_trg
before update or delete on public.goal_world_object_memberships
for each row
execute function public.prevent_goal_world_revision_history_mutation_p7();

create trigger goal_world_target_criteria_immutable_p7_trg
before update or delete on public.goal_world_target_criteria
for each row
execute function public.prevent_goal_world_revision_history_mutation_p7();

create trigger goal_world_goal_hypotheses_immutable_p7_trg
before update or delete on public.goal_world_goal_hypotheses
for each row
execute function public.prevent_goal_world_revision_history_mutation_p7();


create or replace function public.prevent_goal_world_delete_p7()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  raise exception using
    errcode = '42501',
    message = 'P7_GOAL_WORLD_DELETE_FORBIDDEN';
end;
$function$;


create trigger goal_worlds_no_delete_p7_trg
before delete on public.goal_worlds
for each row
execute function public.prevent_goal_world_delete_p7();


/*
Private table boundary.
No direct runtime writes are exposed in P7 persistence foundation.
*/

alter table public.goal_worlds enable row level security;
alter table public.goal_world_goal_statements enable row level security;
alter table public.goal_world_goal_definitions enable row level security;
alter table public.goal_world_revisions enable row level security;
alter table public.goal_world_objectives enable row level security;
alter table public.goal_world_object_memberships enable row level security;
alter table public.goal_world_target_criteria enable row level security;
alter table public.goal_world_goal_hypotheses enable row level security;


revoke all on table
  public.goal_worlds,
  public.goal_world_goal_statements,
  public.goal_world_goal_definitions,
  public.goal_world_revisions,
  public.goal_world_objectives,
  public.goal_world_object_memberships,
  public.goal_world_target_criteria,
  public.goal_world_goal_hypotheses
from public, anon, authenticated, service_role;


grant select on table
  public.goal_worlds,
  public.goal_world_goal_statements,
  public.goal_world_goal_definitions,
  public.goal_world_revisions,
  public.goal_world_objectives,
  public.goal_world_object_memberships,
  public.goal_world_target_criteria,
  public.goal_world_goal_hypotheses
to service_role;


comment on table public.goal_worlds is
  'P7 stable Goal World identity. Current revision pointer may advance; historical revisions remain immutable.';

comment on table public.goal_world_revisions is
  'P7 immutable intention/world-definition revisions. Reality observations do not create revisions by themselves.';

comment on table public.goal_world_objectives is
  'P7 one actor-declared terminal objective plus arbitrarily deep intermediate/supporting objectives per revision.';

comment on table public.goal_world_target_criteria is
  'P7 desired world-specific target conditions referencing shared Reality Graph Value Objects. Does not store current Reality state.';

comment on table public.goal_world_goal_hypotheses is
  'P7 proposal-only alternative/hidden-goal interpretations. Cannot replace the actor-declared terminal objective.';


/*
Atomic postcondition gate.
*/

do $postgate$
declare
  v_ok boolean;
begin
  with checks(passed) as (
    select (
      select count(*)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('r','p')
        and c.relname in (
          'goal_worlds',
          'goal_world_goal_statements',
          'goal_world_goal_definitions',
          'goal_world_revisions',
          'goal_world_objectives',
          'goal_world_object_memberships',
          'goal_world_target_criteria',
          'goal_world_goal_hypotheses'
        )
    ) = 8

    union all

    select (
      select count(*)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (
          'goal_worlds',
          'goal_world_goal_statements',
          'goal_world_goal_definitions',
          'goal_world_revisions',
          'goal_world_objectives',
          'goal_world_object_memberships',
          'goal_world_target_criteria',
          'goal_world_goal_hypotheses'
        )
        and c.relrowsecurity
    ) = 8

    union all

    select exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'goal_world_objectives'
        and indexname = 'goal_world_objectives_one_terminal_p7_uidx'
    )

    union all

    select (
      select count(distinct trigger_name)
      from information_schema.triggers
      where event_object_schema = 'public'
        and trigger_name like '%immutable_p7_trg'
    ) = 7

    union all

    select
      has_table_privilege(
        'service_role',
        'public.goal_worlds',
        'SELECT'
      )
      and not has_table_privilege(
        'service_role',
        'public.goal_worlds',
        'INSERT'
      )
      and not has_table_privilege(
        'service_role',
        'public.goal_world_revisions',
        'INSERT'
      )

    union all

    select not exists (
      select 1
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name like 'goal_world%'
        and grantee in (
          'anon',
          'authenticated'
        )
    )
  )
  select bool_and(passed)
  into v_ok
  from checks;

  if v_ok is distinct from true then
    raise exception using
      errcode = '23514',
      message = 'P7_PERSISTENCE_ATOMIC_POSTCONDITION_FAILED';
  end if;
end;
$postgate$;

commit;
