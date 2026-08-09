/*
ARCTor.app Ã¢â‚¬â€ Goal World Constructor
P3 Relation Architecture v1 Ã¢â‚¬â€ Relation Data Contract

REUSES:
- value_object_relation_types
- value_object_relations
- value_object_relation_operations
- P10 manual relation API/UI

ADDS:
- closed relation families and canonical orientation contract
- ontology facet/node-role guards
- AI candidate validator
- canonical-write AI guard
- world-evaluation global-edge guard
- relation_evidence ledger

DOES NOT:
- create Goal World tables
- create relation weights
- perform causal promotion
- activate future analytical relation types
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '180s';

do $preflight$
begin
  if to_regclass('public.value_objects') is null
     or to_regclass('public.value_object_relation_types') is null
     or to_regclass('public.value_object_relations') is null
     or to_regclass('public.value_object_relation_operations') is null
     or to_regclass('public.value_object_facet_registry') is null
     or to_regclass('public.value_object_kind_registry') is null
     or to_regclass('public.actor_public_profiles') is null then
    raise exception using
      errcode='42P01',
      message='P3_REQUIRED_TABLES_MISSING';
  end if;

  if to_regclass('public.relation_evidence') is not null
     or to_regprocedure(
       'public.validate_value_object_relation_candidate_v1(uuid,uuid,uuid,uuid,text)'
     ) is not null
     or to_regprocedure(
       'public.add_value_object_relation_evidence_v1(uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,text)'
     ) is not null then
    raise exception using
      errcode='23514',
      message='P3_ALREADY_INSTALLED_OR_PARTIALLY_APPLIED';
  end if;

  if (select count(*) from public.value_objects) <> 15
     or (select count(*) from public.value_object_definition_versions) <> 15
     or (select count(*) from public.value_object_relation_types) <> 12
     or (select count(*) from public.value_object_relations) <> 1 then
    raise exception using
      errcode='23514',
      message='P3_BASELINE_CHANGED';
  end if;

  if not exists (
    select 1
    from public.value_object_relations relation
    where relation.id='9fd76c94-e642-4f14-b868-c259114834ce'::uuid
      and relation.relation_type_code='supports'
      and relation.status='active'
      and relation.source_value_object_id=
        '17de1928-0732-4649-a7d4-46212b24d532'::uuid
      and relation.target_value_object_id=
        '43b86bc3-aab6-49f1-afff-b11a52e01f66'::uuid
  ) then
    raise exception using
      errcode='23514',
      message='P3_EXISTING_P10_RELATION_BASELINE_CHANGED';
  end if;

  if to_regprocedure(
    'public.create_or_reactivate_value_object_relation_v1(uuid,uuid,uuid,uuid,uuid,text,text,text)'
  ) is null
     or to_regprocedure(
       'public.set_value_object_relation_status_v1(uuid,uuid,uuid,uuid,uuid,text,text)'
     ) is null then
    raise exception using
      errcode='42883',
      message='P3_P10_RUNTIME_MISSING';
  end if;
end;
$preflight$;

-- ============================================================
-- Relation type contract
-- ============================================================

alter table public.value_object_relation_types
  add column relation_family_code text,
  add column canonical_relation_type_code text,
  add column canonical_orientation_code text,
  add column allowed_source_facet_codes text[],
  add column allowed_target_facet_codes text[],
  add column allowed_source_node_roles text[],
  add column allowed_target_node_roles text[],
  add column canonical_write_policy_code text,
  add column ai_write_policy_code text,
  add column evidence_policy_code text,
  add column world_evaluation_policy_code text;

update public.value_object_relation_types
set
  relation_family_code =
    case relation_type_code
      when 'related_to' then 'structural_crosslink'
      when 'same_subject_as' then 'structural_crosslink'
      when 'supports' then 'structural_crosslink'
      when 'depends_on' then 'structural_crosslink'
      when 'conflicts_with' then 'structural_crosslink'
      when 'prerequisite_for' then 'structural_crosslink'
      else 'analytics'
    end,

  canonical_relation_type_code =
    case relation_type_code
      when 'prerequisite_for' then 'depends_on'
      when 'influenced_by' then 'influences'
      else relation_type_code
    end,

  canonical_orientation_code =
    case
      when relation_type_code in (
        'related_to',
        'same_subject_as',
        'conflicts_with',
        'associated_with'
      ) then 'symmetric'
      when relation_type_code in (
        'prerequisite_for',
        'influenced_by'
      ) then 'reverse'
      else 'same'
    end,

  allowed_source_facet_codes = array[
    'DOMAIN','ENTITY','PROCESS','STATE','RELATIONSHIP',
    'ROLE','KNOWLEDGE','BEHAVIOR','CONTEXT'
  ]::text[],

  allowed_target_facet_codes = array[
    'DOMAIN','ENTITY','PROCESS','STATE','RELATIONSHIP',
    'ROLE','KNOWLEDGE','BEHAVIOR','CONTEXT'
  ]::text[],

  allowed_source_node_roles =
    array['root','intermediate','leaf']::text[],

  allowed_target_node_roles =
    array['root','intermediate','leaf']::text[],

  canonical_write_policy_code =
    case
      when status='active'
       and relation_type_code in (
         'related_to',
         'same_subject_as',
         'supports',
         'depends_on',
         'conflicts_with',
         'influences'
       )
        then 'enabled'
      when relation_type_code in (
        'prerequisite_for',
        'influenced_by'
      )
        then 'reverse_alias'
      when status='future'
        then 'future'
      else 'disabled'
    end,

  ai_write_policy_code='proposal_only',

  evidence_policy_code =
    case
      when status='future' then 'required'
      else 'optional'
    end,

  world_evaluation_policy_code='contextual_only',

  contract_version=greatest(contract_version,2),
  updated_at=clock_timestamp();

alter table public.value_object_relation_types
  alter column relation_family_code set not null,
  alter column canonical_relation_type_code set not null,
  alter column canonical_orientation_code set not null,
  alter column allowed_source_facet_codes set not null,
  alter column allowed_target_facet_codes set not null,
  alter column allowed_source_node_roles set not null,
  alter column allowed_target_node_roles set not null,
  alter column canonical_write_policy_code set not null,
  alter column ai_write_policy_code set not null,
  alter column evidence_policy_code set not null,
  alter column world_evaluation_policy_code set not null;

-- The relation registry is a closed migration-owned dictionary.
-- Runtime service code may read it, but cannot invent/update/delete types.
revoke insert,update,delete,truncate,references,trigger
  on table public.value_object_relation_types
  from service_role;

grant select
  on table public.value_object_relation_types
  to service_role;

alter table public.value_object_relation_types
  add constraint value_object_relation_types_family_p3_check
    check (
      relation_family_code in (
        'structural_crosslink',
        'motivation',
        'goal',
        'resource',
        'temporal',
        'analytics'
      )
    ),

  add constraint value_object_relation_types_orientation_p3_check
    check (
      canonical_orientation_code in ('same','reverse','symmetric')
    ),

  add constraint value_object_relation_types_write_policy_p3_check
    check (
      canonical_write_policy_code in (
        'enabled',
        'reverse_alias',
        'disabled',
        'future'
      )
    ),

  add constraint value_object_relation_types_ai_policy_p3_check
    check (
      ai_write_policy_code in ('proposal_only','disabled')
    ),

  add constraint value_object_relation_types_evidence_policy_p3_check
    check (
      evidence_policy_code in ('optional','required')
    ),

  add constraint value_object_relation_types_world_eval_p3_check
    check (
      world_evaluation_policy_code='contextual_only'
    ),

  add constraint value_object_relation_types_source_facets_p3_check
    check (
      cardinality(allowed_source_facet_codes)>0
      and allowed_source_facet_codes <@ array[
        'DOMAIN','ENTITY','PROCESS','STATE','RELATIONSHIP',
        'ROLE','KNOWLEDGE','BEHAVIOR','CONTEXT'
      ]::text[]
    ),

  add constraint value_object_relation_types_target_facets_p3_check
    check (
      cardinality(allowed_target_facet_codes)>0
      and allowed_target_facet_codes <@ array[
        'DOMAIN','ENTITY','PROCESS','STATE','RELATIONSHIP',
        'ROLE','KNOWLEDGE','BEHAVIOR','CONTEXT'
      ]::text[]
    ),

  add constraint value_object_relation_types_source_roles_p3_check
    check (
      cardinality(allowed_source_node_roles)>0
      and allowed_source_node_roles <@
        array['root','intermediate','leaf']::text[]
    ),

  add constraint value_object_relation_types_target_roles_p3_check
    check (
      cardinality(allowed_target_node_roles)>0
      and allowed_target_node_roles <@
        array['root','intermediate','leaf']::text[]
    ),

  add constraint value_object_relation_types_canonical_type_p3_fkey
    foreign key (canonical_relation_type_code)
    references public.value_object_relation_types(relation_type_code)
    on update restrict
    on delete restrict;

-- ============================================================
-- Relation evidence
-- ============================================================

create table public.relation_evidence (
  id uuid primary key default gen_random_uuid(),

  relation_id uuid not null
    references public.value_object_relations(id)
    on delete restrict,

  owner_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  evidence_direction_code text not null,
  evidence_kind_code text not null,
  source_type_code text not null,

  source_reference text,
  evidence_text text,

  metadata_json jsonb not null default '{}'::jsonb,

  created_by_actor_id uuid not null
    references public.actors(id)
    on delete restrict,

  idempotency_key text not null,
  request_hash text not null,

  created_at timestamptz not null default clock_timestamp(),

  constraint relation_evidence_direction_p3_check
    check (
      evidence_direction_code in ('supports','contradicts')
    ),

  constraint relation_evidence_kind_p3_check
    check (
      evidence_kind_code in (
        'user_statement',
        'activity_fact',
        'measure',
        'external_source',
        'expert_model',
        'system_rule',
        'correction'
      )
    ),

  constraint relation_evidence_source_type_p3_check
    check (
      source_type_code in (
        'user',
        'activity',
        'fact',
        'measure',
        'external',
        'expert_model',
        'system_rule'
      )
    ),

  constraint relation_evidence_payload_p3_check
    check (
      nullif(btrim(source_reference),'') is not null
      or nullif(btrim(evidence_text),'') is not null
    ),

  constraint relation_evidence_metadata_p3_check
    check (jsonb_typeof(metadata_json)='object'),

  constraint relation_evidence_no_inference_numbers_p3_check
    check (
      not (
        metadata_json ?| array[
          'weight',
          'relation_weight',
          'confidence',
          'probability',
          'causal_score',
          'causalScore'
        ]
      )
    ),

  constraint relation_evidence_idempotency_key_p3_check
    check (char_length(idempotency_key) between 8 and 200),

  constraint relation_evidence_request_hash_p3_check
    check (request_hash ~ '^[A-F0-9]{64}$'),

  constraint relation_evidence_idempotency_p3_unique
    unique (owner_user_id,owner_actor_id,idempotency_key)
);

create index relation_evidence_relation_p3_idx
  on public.relation_evidence(
    owner_user_id,
    owner_actor_id,
    relation_id,
    created_at desc
  );

alter table public.relation_evidence enable row level security;

revoke all on table public.relation_evidence
  from public,anon,authenticated,service_role;

grant select
  on table public.relation_evidence
  to service_role;

create policy relation_evidence_no_direct_p3
on public.relation_evidence
for all
to anon,authenticated
using (false)
with check (false);

-- ============================================================
-- Candidate validation
-- ============================================================

create or replace function public.validate_value_object_relation_candidate_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_source_value_object_id uuid,
  p_target_value_object_id uuid,
  p_relation_type_code text
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $function$
declare
  v_requested public.value_object_relation_types%rowtype;
  v_canonical public.value_object_relation_types%rowtype;

  v_source record;
  v_target record;

  v_source_id uuid := p_source_value_object_id;
  v_target_id uuid := p_target_value_object_id;
  v_swap uuid;

  v_reason text := null;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_source_value_object_id is null
     or p_target_value_object_id is null
     or nullif(btrim(p_relation_type_code),'') is null then
    raise exception using
      errcode='22023',
      message='P3_RELATION_VALIDATION_ARGUMENT_REQUIRED';
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
      message='P3_ACTOR_NOT_OWNED_BY_USER';
  end if;

  select relation_type.*
  into v_requested
  from public.value_object_relation_types relation_type
  where relation_type.relation_type_code=btrim(p_relation_type_code);

  if not found then
    return jsonb_build_object(
      'ok',true,
      'contractVersion','P3_RELATION_DATA_CONTRACT_V1',
      'allowed',false,
      'reasonCode','P3_UNKNOWN_RELATION_TYPE',
      'requestedRelationTypeCode',btrim(p_relation_type_code),
      'canonicalRelationTypeCode',null,
      'canonicalSourceValueObjectId',null,
      'canonicalTargetValueObjectId',null,
      'canonicalOrientationCode',null,
      'relationFamilyCode',null,
      'aiWritePolicyCode',null,
      'evidencePolicyCode',null,
      'worldEvaluationPolicyCode',null
    );
  end if;

  if v_requested.canonical_write_policy_code in ('future','disabled')
     or v_requested.status not in ('active','inactive') then
    v_reason :=
      case
        when v_requested.canonical_write_policy_code='future'
          or v_requested.status='future'
          then 'P3_RELATION_TYPE_FUTURE'
        else 'P3_RELATION_TYPE_DISABLED'
      end;
  end if;

  select relation_type.*
  into v_canonical
  from public.value_object_relation_types relation_type
  where relation_type.relation_type_code=
    v_requested.canonical_relation_type_code;

  if not found
     or v_canonical.status <> 'active'
     or v_canonical.canonical_write_policy_code <> 'enabled' then
    v_reason := coalesce(
      v_reason,
      'P3_CANONICAL_RELATION_TYPE_NOT_WRITABLE'
    );
  end if;

  if v_requested.canonical_orientation_code='reverse' then
    v_swap := v_source_id;
    v_source_id := v_target_id;
    v_target_id := v_swap;
  elsif v_requested.canonical_orientation_code='symmetric'
     and v_source_id::text > v_target_id::text then
    v_swap := v_source_id;
    v_source_id := v_target_id;
    v_target_id := v_swap;
  end if;

  select
    value_object.id,
    value_object.owner_user_id,
    value_object.owner_actor_id,
    value_object.scope_code,
    value_object.facet_code,
    value_object.object_kind_code,
    value_object.ontology_node_role_code,
    value_object.status
  into v_source
  from public.value_objects value_object
  where value_object.id=v_source_id;

  if not found then
    raise exception using
      errcode='P0002',
      message='P3_SOURCE_VALUE_OBJECT_NOT_FOUND';
  end if;

  select
    value_object.id,
    value_object.owner_user_id,
    value_object.owner_actor_id,
    value_object.scope_code,
    value_object.facet_code,
    value_object.object_kind_code,
    value_object.ontology_node_role_code,
    value_object.status
  into v_target
  from public.value_objects value_object
  where value_object.id=v_target_id;

  if not found then
    raise exception using
      errcode='P0002',
      message='P3_TARGET_VALUE_OBJECT_NOT_FOUND';
  end if;

  if v_source.scope_code <> 'actor'
     or v_target.scope_code <> 'actor'
     or v_source.owner_user_id is distinct from p_owner_user_id
     or v_target.owner_user_id is distinct from p_owner_user_id
     or v_source.owner_actor_id is distinct from p_owner_actor_id
     or v_target.owner_actor_id is distinct from p_owner_actor_id then
    raise exception using
      errcode='42501',
      message='P3_RELATION_ACCESS_DENIED';
  end if;

  if v_source.facet_code is null
     or v_target.facet_code is null
     or v_source.object_kind_code is null
     or v_target.object_kind_code is null
     or v_source.ontology_node_role_code
          not in ('root','intermediate','leaf')
     or v_target.ontology_node_role_code
          not in ('root','intermediate','leaf') then
    v_reason := coalesce(
      v_reason,
      'P3_RELATION_REQUIRES_ONTOLOGY_VALUE_OBJECTS'
    );
  end if;

  if v_source.status='retired'
     or v_target.status='retired' then
    v_reason := coalesce(
      v_reason,
      'P3_RETIRED_VALUE_OBJECT_FORBIDDEN'
    );
  end if;

  if v_source_id=v_target_id
     and not v_canonical.allow_self_link then
    v_reason := coalesce(
      v_reason,
      'P3_SELF_LINK_FORBIDDEN'
    );
  end if;

  if v_source.facet_code is not null
     and not (
       v_source.facet_code =
         any(v_canonical.allowed_source_facet_codes)
     ) then
    v_reason := coalesce(
      v_reason,
      'P3_SOURCE_FACET_FORBIDDEN'
    );
  end if;

  if v_target.facet_code is not null
     and not (
       v_target.facet_code =
         any(v_canonical.allowed_target_facet_codes)
     ) then
    v_reason := coalesce(
      v_reason,
      'P3_TARGET_FACET_FORBIDDEN'
    );
  end if;

  if v_source.ontology_node_role_code is not null
     and not (
       v_source.ontology_node_role_code =
         any(v_canonical.allowed_source_node_roles)
     ) then
    v_reason := coalesce(
      v_reason,
      'P3_SOURCE_NODE_ROLE_FORBIDDEN'
    );
  end if;

  if v_target.ontology_node_role_code is not null
     and not (
       v_target.ontology_node_role_code =
         any(v_canonical.allowed_target_node_roles)
     ) then
    v_reason := coalesce(
      v_reason,
      'P3_TARGET_NODE_ROLE_FORBIDDEN'
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'contractVersion','P3_RELATION_DATA_CONTRACT_V1',
    'allowed',v_reason is null,
    'reasonCode',v_reason,
    'requestedRelationTypeCode',v_requested.relation_type_code,
    'canonicalRelationTypeCode',v_canonical.relation_type_code,
    'canonicalSourceValueObjectId',v_source_id,
    'canonicalTargetValueObjectId',v_target_id,
    'canonicalOrientationCode',
      v_requested.canonical_orientation_code,
    'relationFamilyCode',v_requested.relation_family_code,
    'aiWritePolicyCode',v_requested.ai_write_policy_code,
    'evidencePolicyCode',v_requested.evidence_policy_code,
    'worldEvaluationPolicyCode',
      v_requested.world_evaluation_policy_code
  );
end;
$function$;

-- ============================================================
-- Enhanced P10 trigger: P3 ontology guards
-- ============================================================

create or replace function public.enforce_value_object_relation_p10()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $function$
declare
  v_relation_type public.value_object_relation_types%rowtype;
  v_source record;
  v_target record;
  v_swap uuid;
begin
  select relation_type.*
  into v_relation_type
  from public.value_object_relation_types relation_type
  where relation_type.relation_type_code=new.relation_type_code;

  if not found then
    raise exception using
      errcode='23503',
      message='P3_RELATION_TYPE_NOT_FOUND';
  end if;

  if new.status='active'
     and (
       v_relation_type.status <> 'active'
       or v_relation_type.canonical_write_policy_code <> 'enabled'
       or v_relation_type.from_scope_code not in ('ordinary','both')
       or v_relation_type.to_scope_code not in ('ordinary','both')
     ) then
    raise exception using
      errcode='23514',
      message='P3_RELATION_TYPE_NOT_CANONICAL_WRITABLE';
  end if;

  if new.provenance_code='ai_suggested' then
    raise exception using
      errcode='23514',
      message='P3_AI_DIRECT_CANONICAL_WRITE_FORBIDDEN';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(coalesce(new.metadata_json,'{}'::jsonb))
      as metadata_key(key_name)
    where lower(metadata_key.key_name) in (
      'polarity',
      'weight',
      'worldweight',
      'world_weight',
      'worldrole',
      'world_role',
      'approachavoidmaintain',
      'approach_avoid_maintain',
      'worldscore',
      'world_score',
      'worldevaluation',
      'world_evaluation'
    )
  ) then
    raise exception using
      errcode='23514',
      message='P3_WORLD_EVALUATION_NOT_GLOBAL_RELATION_DATA';
  end if;

  if new.source_value_object_id=new.target_value_object_id
     and not v_relation_type.allow_self_link then
    raise exception using
      errcode='23514',
      message='P3_SELF_LINK_FORBIDDEN';
  end if;

  select
    value_object.id,
    value_object.owner_user_id,
    value_object.owner_actor_id,
    value_object.scope_code,
    value_object.facet_code,
    value_object.object_kind_code,
    value_object.ontology_node_role_code,
    value_object.status
  into v_source
  from public.value_objects value_object
  where value_object.id=new.source_value_object_id;

  if not found then
    raise exception using
      errcode='23503',
      message='P3_SOURCE_VALUE_OBJECT_NOT_FOUND';
  end if;

  select
    value_object.id,
    value_object.owner_user_id,
    value_object.owner_actor_id,
    value_object.scope_code,
    value_object.facet_code,
    value_object.object_kind_code,
    value_object.ontology_node_role_code,
    value_object.status
  into v_target
  from public.value_objects value_object
  where value_object.id=new.target_value_object_id;

  if not found then
    raise exception using
      errcode='23503',
      message='P3_TARGET_VALUE_OBJECT_NOT_FOUND';
  end if;

  if v_source.scope_code <> 'actor'
     or v_target.scope_code <> 'actor'
     or v_source.owner_user_id is distinct from new.owner_user_id
     or v_target.owner_user_id is distinct from new.owner_user_id
     or v_source.owner_actor_id is distinct from new.owner_actor_id
     or v_target.owner_actor_id is distinct from new.owner_actor_id then
    raise exception using
      errcode='42501',
      message='P3_RELATION_OWNER_MISMATCH';
  end if;

  if v_source.facet_code is null
     or v_target.facet_code is null
     or v_source.object_kind_code is null
     or v_target.object_kind_code is null
     or v_source.ontology_node_role_code
          not in ('root','intermediate','leaf')
     or v_target.ontology_node_role_code
          not in ('root','intermediate','leaf') then
    raise exception using
      errcode='23514',
      message='P3_RELATION_REQUIRES_ONTOLOGY_VALUE_OBJECTS';
  end if;

  if v_source.status='retired'
     or v_target.status='retired' then
    raise exception using
      errcode='23514',
      message='P3_RETIRED_VALUE_OBJECT_FORBIDDEN';
  end if;

  if not (
    v_source.facet_code =
      any(v_relation_type.allowed_source_facet_codes)
  ) then
    raise exception using
      errcode='23514',
      message='P3_SOURCE_FACET_FORBIDDEN';
  end if;

  if not (
    v_target.facet_code =
      any(v_relation_type.allowed_target_facet_codes)
  ) then
    raise exception using
      errcode='23514',
      message='P3_TARGET_FACET_FORBIDDEN';
  end if;

  if not (
    v_source.ontology_node_role_code =
      any(v_relation_type.allowed_source_node_roles)
  ) then
    raise exception using
      errcode='23514',
      message='P3_SOURCE_NODE_ROLE_FORBIDDEN';
  end if;

  if not (
    v_target.ontology_node_role_code =
      any(v_relation_type.allowed_target_node_roles)
  ) then
    raise exception using
      errcode='23514',
      message='P3_TARGET_NODE_ROLE_FORBIDDEN';
  end if;

  if new.created_by_actor_id is distinct from new.owner_actor_id
     or new.updated_by_actor_id is distinct from new.owner_actor_id then
    raise exception using
      errcode='42501',
      message='P3_RELATION_ACTOR_MISMATCH';
  end if;

  if v_relation_type.directionality_code='symmetric'
     and new.source_value_object_id::text >
       new.target_value_object_id::text then
    v_swap := new.source_value_object_id;
    new.source_value_object_id := new.target_value_object_id;
    new.target_value_object_id := v_swap;
  end if;

  if tg_op='UPDATE' then
    if new.owner_user_id is distinct from old.owner_user_id
       or new.owner_actor_id is distinct from old.owner_actor_id
       or new.source_value_object_id
            is distinct from old.source_value_object_id
       or new.target_value_object_id
            is distinct from old.target_value_object_id
       or new.relation_type_code
            is distinct from old.relation_type_code
       or new.provenance_code
            is distinct from old.provenance_code
       or new.created_by_actor_id
            is distinct from old.created_by_actor_id
       or new.created_at
            is distinct from old.created_at then
      raise exception using
        errcode='23514',
        message='P3_RELATION_IDENTITY_IMMUTABLE';
    end if;

    if old.status='active' and new.status='inactive' then
      new.deactivated_at := clock_timestamp();
    elsif old.status='inactive' and new.status='active' then
      new.deactivated_at := null;
      new.reactivated_at := clock_timestamp();
    elsif new.status='active' then
      new.deactivated_at := null;
    end if;

    new.updated_at := clock_timestamp();
  else
    if new.status='inactive' and new.deactivated_at is null then
      new.deactivated_at := clock_timestamp();
    elsif new.status='active' then
      new.deactivated_at := null;
    end if;
  end if;

  return new;
end;
$function$;

-- ============================================================
-- Evidence write boundary
-- ============================================================

create or replace function public.add_value_object_relation_evidence_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_created_by_actor_id uuid,
  p_relation_id uuid,
  p_evidence_direction_code text,
  p_evidence_kind_code text,
  p_source_type_code text,
  p_source_reference text,
  p_evidence_text text,
  p_metadata_json jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions,pg_temp
as $function$
declare
  v_relation public.value_object_relations%rowtype;
  v_existing public.relation_evidence%rowtype;
  v_inserted public.relation_evidence%rowtype;

  v_payload jsonb;
  v_hash text;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_created_by_actor_id is null
     or p_relation_id is null
     or nullif(btrim(p_evidence_direction_code),'') is null
     or nullif(btrim(p_evidence_kind_code),'') is null
     or nullif(btrim(p_source_type_code),'') is null
     or nullif(btrim(p_idempotency_key),'') is null then
    raise exception using
      errcode='22023',
      message='P3_EVIDENCE_ARGUMENT_REQUIRED';
  end if;

  if p_created_by_actor_id is distinct from p_owner_actor_id then
    raise exception using
      errcode='42501',
      message='P3_EVIDENCE_ACTOR_MISMATCH';
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
      message='P3_ACTOR_NOT_OWNED_BY_USER';
  end if;

  if p_evidence_direction_code not in ('supports','contradicts')
     or p_evidence_kind_code not in (
       'user_statement',
       'activity_fact',
       'measure',
       'external_source',
       'expert_model',
       'system_rule',
       'correction'
     )
     or p_source_type_code not in (
       'user',
       'activity',
       'fact',
       'measure',
       'external',
       'expert_model',
       'system_rule'
     ) then
    raise exception using
      errcode='22023',
      message='P3_EVIDENCE_CODE_INVALID';
  end if;

  if nullif(btrim(p_source_reference),'') is null
     and nullif(btrim(p_evidence_text),'') is null then
    raise exception using
      errcode='22023',
      message='P3_EVIDENCE_SOURCE_REQUIRED';
  end if;

  if coalesce(p_metadata_json,'{}'::jsonb) ?| array[
       'weight',
       'relation_weight',
       'confidence',
       'probability',
       'causal_score',
       'causalScore'
     ] then
    raise exception using
      errcode='23514',
      message='P3_EVIDENCE_INFERENCE_NUMBER_FORBIDDEN';
  end if;

  if char_length(p_idempotency_key) not between 8 and 200 then
    raise exception using
      errcode='22023',
      message='P3_EVIDENCE_IDEMPOTENCY_KEY_INVALID';
  end if;

  select relation.*
  into v_relation
  from public.value_object_relations relation
  where relation.id=p_relation_id
    and relation.owner_user_id=p_owner_user_id
    and relation.owner_actor_id=p_owner_actor_id;

  if not found then
    raise exception using
      errcode='42501',
      message='P3_RELATION_NOT_FOUND_OR_ACCESS_DENIED';
  end if;

  v_payload := jsonb_build_object(
    'relationId',p_relation_id,
    'evidenceDirectionCode',p_evidence_direction_code,
    'evidenceKindCode',p_evidence_kind_code,
    'sourceTypeCode',p_source_type_code,
    'sourceReference',nullif(btrim(p_source_reference),''),
    'evidenceText',nullif(btrim(p_evidence_text),''),
    'metadataJson',coalesce(p_metadata_json,'{}'::jsonb)
  );

  v_hash := upper(
    encode(
      digest(convert_to(v_payload::text,'UTF8'),'sha256'),
      'hex'
    )
  );

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_owner_user_id::text || '|' ||
      p_owner_actor_id::text || '|' ||
      p_idempotency_key,
      0
    )
  );

  select evidence.*
  into v_existing
  from public.relation_evidence evidence
  where evidence.owner_user_id=p_owner_user_id
    and evidence.owner_actor_id=p_owner_actor_id
    and evidence.idempotency_key=p_idempotency_key;

  if found then
    if v_existing.request_hash <> v_hash then
      raise exception using
        errcode='23505',
        message='P3_EVIDENCE_IDEMPOTENCY_CONFLICT';
    end if;

    return jsonb_build_object(
      'ok',true,
      'contractVersion','P3_RELATION_DATA_CONTRACT_V1',
      'idempotentReplay',true,
      'evidence',jsonb_build_object(
        'id',v_existing.id,
        'relationId',v_existing.relation_id,
        'ownerUserId',v_existing.owner_user_id,
        'ownerActorId',v_existing.owner_actor_id,
        'evidenceDirectionCode',
          v_existing.evidence_direction_code,
        'evidenceKindCode',v_existing.evidence_kind_code,
        'sourceTypeCode',v_existing.source_type_code,
        'sourceReference',v_existing.source_reference,
        'evidenceText',v_existing.evidence_text,
        'createdByActorId',v_existing.created_by_actor_id,
        'createdAt',v_existing.created_at
      )
    );
  end if;

  insert into public.relation_evidence (
    relation_id,
    owner_user_id,
    owner_actor_id,
    evidence_direction_code,
    evidence_kind_code,
    source_type_code,
    source_reference,
    evidence_text,
    metadata_json,
    created_by_actor_id,
    idempotency_key,
    request_hash
  )
  values (
    p_relation_id,
    p_owner_user_id,
    p_owner_actor_id,
    p_evidence_direction_code,
    p_evidence_kind_code,
    p_source_type_code,
    nullif(btrim(p_source_reference),''),
    nullif(btrim(p_evidence_text),''),
    coalesce(p_metadata_json,'{}'::jsonb),
    p_created_by_actor_id,
    p_idempotency_key,
    v_hash
  )
  returning * into v_inserted;

  return jsonb_build_object(
    'ok',true,
    'contractVersion','P3_RELATION_DATA_CONTRACT_V1',
    'idempotentReplay',false,
    'evidence',jsonb_build_object(
      'id',v_inserted.id,
      'relationId',v_inserted.relation_id,
      'ownerUserId',v_inserted.owner_user_id,
      'ownerActorId',v_inserted.owner_actor_id,
      'evidenceDirectionCode',
        v_inserted.evidence_direction_code,
      'evidenceKindCode',v_inserted.evidence_kind_code,
      'sourceTypeCode',v_inserted.source_type_code,
      'sourceReference',v_inserted.source_reference,
      'evidenceText',v_inserted.evidence_text,
      'createdByActorId',v_inserted.created_by_actor_id,
      'createdAt',v_inserted.created_at
    )
  );
end;
$function$;

revoke all on function public.validate_value_object_relation_candidate_v1(
  uuid,uuid,uuid,uuid,text
) from public,anon,authenticated;

revoke all on function public.add_value_object_relation_evidence_v1(
  uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,text
) from public,anon,authenticated;

grant execute on function public.validate_value_object_relation_candidate_v1(
  uuid,uuid,uuid,uuid,text
) to service_role;

grant execute on function public.add_value_object_relation_evidence_v1(
  uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,text
) to service_role;

comment on table public.relation_evidence is
  'P3 immutable evidence/counterevidence ledger for Value Object semantic relations. No relation weights or causal scores are stored here.';

comment on function public.validate_value_object_relation_candidate_v1(
  uuid,uuid,uuid,uuid,text
) is
  'P3 read-only candidate guard: closed relation registry, reverse/symmetric canonicalization, actor ownership, facet and ontology node-role validation.';

comment on function public.add_value_object_relation_evidence_v1(
  uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,text
) is
  'P3 idempotent owner-scoped relation evidence write boundary. Evidence does not change Value Object definition versions.';

comment on column public.value_object_relation_types.world_evaluation_policy_code is
  'P3 global relation contract. World-specific polarity/weight/orientation belongs to future Goal World projection, never to the shared edge.';

commit;
