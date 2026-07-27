-- ARCTor.app
-- P10A Ordinary Semantic Relations — live schema audit
--
-- Run in Supabase SQL Editor as role postgres.
--
-- SAFETY:
-- - no persistent application-table writes;
-- - no schema changes;
-- - no public table changes;
-- - creates only a session-local TEMP table for one combined result set.
--
-- The temporary table disappears automatically when the SQL session ends.

create temporary table if not exists pg_temp.arctor_p10_relation_audit (
  section text not null,
  item text not null,
  details jsonb not null
) on commit preserve rows;

truncate table pg_temp.arctor_p10_relation_audit;

-- 01. Relation registry rows
insert into pg_temp.arctor_p10_relation_audit(section, item, details)
select
  '01_relation_registry',
  lpad(relation_type.display_order::text, 4, '0') || '_' ||
    relation_type.relation_type_code,
  jsonb_build_object(
    'relationTypeCode', relation_type.relation_type_code,
    'directionalityCode', relation_type.directionality_code,
    'fromScopeCode', relation_type.from_scope_code,
    'toScopeCode', relation_type.to_scope_code,
    'titleKey', relation_type.title_key,
    'descriptionKey', relation_type.description_key,
    'displayOrder', relation_type.display_order,
    'status', relation_type.status,
    'createdAt', relation_type.created_at,
    'updatedAt', relation_type.updated_at
  )
from public.value_object_relation_types relation_type;

-- 02. Registry schema contract
insert into pg_temp.arctor_p10_relation_audit(section, item, details)
select
  '02_registry_contract',
  'required_and_missing_fields',
  jsonb_build_object(
    'registryExists',
      to_regclass('public.value_object_relation_types') is not null,
    'hasRelationTypeCode',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relation_types'
          and column_name = 'relation_type_code'
      ),
    'hasDirectionalityCode',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relation_types'
          and column_name = 'directionality_code'
      ),
    'hasFromScopeCode',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relation_types'
          and column_name = 'from_scope_code'
      ),
    'hasToScopeCode',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relation_types'
          and column_name = 'to_scope_code'
      ),
    'hasStatus',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relation_types'
          and column_name = 'status'
      ),
    'hasInverseRelationTypeCode',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relation_types'
          and column_name in (
            'inverse_relation_type_code',
            'inverse_type_code'
          )
      ),
    'hasInverseTitleKey',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relation_types'
          and column_name in (
            'inverse_title_key',
            'reverse_title_key'
          )
      ),
    'hasAllowSelfLink',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relation_types'
          and column_name in (
            'allow_self_link',
            'allows_self_link'
          )
      ),
    'hasContractVersion',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relation_types'
          and column_name in (
            'contract_version',
            'version',
            'schema_version'
          )
      )
  );

-- 03. Registry semantic warnings
insert into pg_temp.arctor_p10_relation_audit(section, item, details)
select
  '03_registry_semantic_warning',
  'active_vocabulary',
  jsonb_build_object(
    'activeCodes',
      coalesce(
        (
          select jsonb_agg(
            relation_type.relation_type_code
            order by relation_type.display_order
          )
          from public.value_object_relation_types relation_type
          where relation_type.status = 'active'
        ),
        '[]'::jsonb
      ),
    'futureCodes',
      coalesce(
        (
          select jsonb_agg(
            relation_type.relation_type_code
            order by relation_type.display_order
          )
          from public.value_object_relation_types relation_type
          where relation_type.status = 'future'
        ),
        '[]'::jsonb
      ),
    'activeStructuralPartOfExists',
      exists (
        select 1
        from public.value_object_relation_types relation_type
        where relation_type.relation_type_code in (
          'part_of',
          'has_part'
        )
          and relation_type.status = 'active'
      ),
    'dependsOnAndPrerequisiteForBothActive',
      (
        select count(*) = 2
        from public.value_object_relation_types relation_type
        where relation_type.relation_type_code in (
          'depends_on',
          'prerequisite_for'
        )
          and relation_type.status = 'active'
      ),
    'influencesCodeExists',
      exists (
        select 1
        from public.value_object_relation_types relation_type
        where relation_type.relation_type_code = 'influences'
      ),
    'influencedByCodeExists',
      exists (
        select 1
        from public.value_object_relation_types relation_type
        where relation_type.relation_type_code = 'influenced_by'
      ),
    'relatedToCodeExists',
      exists (
        select 1
        from public.value_object_relation_types relation_type
        where relation_type.relation_type_code = 'related_to'
      ),
    'sameSubjectAsCodeExists',
      exists (
        select 1
        from public.value_object_relation_types relation_type
        where relation_type.relation_type_code = 'same_subject_as'
      )
  );

-- 04. Candidate relation/edge tables, exact counts through dynamic SQL
do $audit$
declare
  v_table_name text;
  v_table_regclass regclass;
  v_row_count bigint;
begin
  foreach v_table_name in array array[
    'value_object_relations',
    'value_object_similarity_edges',
    'value_object_relevance_edges',
    'state_relevance_rules',
    'semantic_signatures'
  ]
  loop
    v_table_regclass :=
      to_regclass(format('public.%I', v_table_name));

    if v_table_regclass is null then
      insert into pg_temp.arctor_p10_relation_audit(
        section,
        item,
        details
      )
      values (
        '04_candidate_tables',
        v_table_name,
        jsonb_build_object(
          'exists', false,
          'rowCount', null
        )
      );
    else
      execute format(
        'select count(*) from public.%I',
        v_table_name
      )
      into v_row_count;

      insert into pg_temp.arctor_p10_relation_audit(
        section,
        item,
        details
      )
      values (
        '04_candidate_tables',
        v_table_name,
        jsonb_build_object(
          'exists', true,
          'rowCount', v_row_count
        )
      );
    end if;
  end loop;
end
$audit$;

-- 05. value_object_relations columns, if table exists
insert into pg_temp.arctor_p10_relation_audit(section, item, details)
select
  '05_relation_table_column',
  lpad(column_row.ordinal_position::text, 4, '0') || '_' ||
    column_row.column_name,
  jsonb_build_object(
    'columnName', column_row.column_name,
    'dataType', column_row.data_type,
    'udtName', column_row.udt_name,
    'nullable', column_row.is_nullable,
    'default', column_row.column_default
  )
from information_schema.columns column_row
where column_row.table_schema = 'public'
  and column_row.table_name = 'value_object_relations';

-- 06. value_object_relations constraints
insert into pg_temp.arctor_p10_relation_audit(section, item, details)
select
  '06_relation_table_constraint',
  constraint_row.conname,
  jsonb_build_object(
    'constraintType',
      case constraint_row.contype
        when 'p' then 'primary_key'
        when 'f' then 'foreign_key'
        when 'u' then 'unique'
        when 'c' then 'check'
        when 'x' then 'exclusion'
        else constraint_row.contype::text
      end,
    'definition',
      pg_get_constraintdef(constraint_row.oid, true)
  )
from pg_catalog.pg_constraint constraint_row
where constraint_row.conrelid =
  to_regclass('public.value_object_relations');

-- 07. value_object_relations indexes
insert into pg_temp.arctor_p10_relation_audit(section, item, details)
select
  '07_relation_table_index',
  index_row.indexname,
  jsonb_build_object(
    'definition', index_row.indexdef
  )
from pg_catalog.pg_indexes index_row
where index_row.schemaname = 'public'
  and index_row.tablename = 'value_object_relations';

-- 08. triggers
insert into pg_temp.arctor_p10_relation_audit(section, item, details)
select
  '08_relation_table_trigger',
  trigger_row.trigger_name,
  jsonb_build_object(
    'eventManipulation', trigger_row.event_manipulation,
    'actionTiming', trigger_row.action_timing,
    'actionStatement', trigger_row.action_statement
  )
from information_schema.triggers trigger_row
where trigger_row.event_object_schema = 'public'
  and trigger_row.event_object_table = 'value_object_relations';

-- 09. RLS and policies
insert into pg_temp.arctor_p10_relation_audit(section, item, details)
select
  '09_relation_table_rls',
  'table_flags',
  jsonb_build_object(
    'rlsEnabled', class_row.relrowsecurity,
    'rlsForced', class_row.relforcerowsecurity
  )
from pg_catalog.pg_class class_row
join pg_catalog.pg_namespace namespace_row
  on namespace_row.oid = class_row.relnamespace
where namespace_row.nspname = 'public'
  and class_row.relname = 'value_object_relations';

insert into pg_temp.arctor_p10_relation_audit(section, item, details)
select
  '09_relation_table_policy',
  policy_row.policyname,
  jsonb_build_object(
    'permissive', policy_row.permissive,
    'roles', policy_row.roles,
    'command', policy_row.cmd,
    'usingExpression', policy_row.qual,
    'checkExpression', policy_row.with_check
  )
from pg_catalog.pg_policies policy_row
where policy_row.schemaname = 'public'
  and policy_row.tablename = 'value_object_relations';

-- 10. Grants
insert into pg_temp.arctor_p10_relation_audit(section, item, details)
select
  '10_relation_table_grant',
  grant_row.grantee || '_' || grant_row.privilege_type,
  jsonb_build_object(
    'grantee', grant_row.grantee,
    'privilege', grant_row.privilege_type,
    'grantable', grant_row.is_grantable
  )
from information_schema.role_table_grants grant_row
where grant_row.table_schema = 'public'
  and grant_row.table_name = 'value_object_relations';

-- 11. Existing public functions/RPC related to VO relations
insert into pg_temp.arctor_p10_relation_audit(section, item, details)
select
  '11_relation_function',
  function_row.proname || '(' ||
    pg_get_function_identity_arguments(function_row.oid) || ')',
  jsonb_build_object(
    'functionName', function_row.proname,
    'arguments',
      pg_get_function_identity_arguments(function_row.oid),
    'returns',
      pg_get_function_result(function_row.oid),
    'securityDefiner', function_row.prosecdef,
    'language', language_row.lanname
  )
from pg_catalog.pg_proc function_row
join pg_catalog.pg_namespace namespace_row
  on namespace_row.oid = function_row.pronamespace
join pg_catalog.pg_language language_row
  on language_row.oid = function_row.prolang
where namespace_row.nspname = 'public'
  and (
    function_row.proname ilike '%value_object%relation%'
    or function_row.proname ilike '%semantic%relation%'
  );

-- 12. Current VO runtime prerequisites
insert into pg_temp.arctor_p10_relation_audit(section, item, details)
select
  '12_value_object_runtime',
  'summary',
  jsonb_build_object(
    'valueObjectCount', count(*),
    'ownerPairCount',
      count(
        distinct (
          value_object.owner_user_id,
          value_object.owner_actor_id
        )
      ),
    'rootCount',
      count(*) filter (
        where value_object.parent_value_object_id is null
          and value_object.root_value_object_id = value_object.id
      ),
    'intermediateCount',
      count(*) filter (
        where value_object.node_role_code = 'structural'
          and value_object.parent_value_object_id is not null
      ),
    'activityLeafCount',
      count(*) filter (
        where value_object.node_role_code = 'activity_leaf'
      ),
    'draftCount',
      count(*) filter (where value_object.status = 'draft'),
    'activeCount',
      count(*) filter (where value_object.status = 'active')
  )
from public.value_objects value_object;

insert into pg_temp.arctor_p10_relation_audit(section, item, details)
select
  '13_value_object_branch',
  coalesce(value_object.branch_type_code, '<null>'),
  jsonb_build_object(
    'valueObjectCount', count(*),
    'ownerPairCount',
      count(
        distinct (
          value_object.owner_user_id,
          value_object.owner_actor_id
        )
      )
  )
from public.value_objects value_object
group by value_object.branch_type_code;

-- 14. Expected row-contract presence, works even when table is absent
insert into pg_temp.arctor_p10_relation_audit(section, item, details)
select
  '14_relation_row_contract',
  'column_presence',
  jsonb_build_object(
    'tableExists',
      to_regclass('public.value_object_relations') is not null,
    'hasId',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relations'
          and column_name = 'id'
      ),
    'hasOwnerUserId',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relations'
          and column_name = 'owner_user_id'
      ),
    'hasOwnerActorId',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relations'
          and column_name = 'owner_actor_id'
      ),
    'hasSourceValueObjectId',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relations'
          and column_name in (
            'source_value_object_id',
            'from_value_object_id'
          )
      ),
    'hasTargetValueObjectId',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relations'
          and column_name in (
            'target_value_object_id',
            'to_value_object_id'
          )
      ),
    'hasRelationTypeCode',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relations'
          and column_name in (
            'relation_type_code',
            'relation_code',
            'relation_type'
          )
      ),
    'hasCreatedByActorId',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relations'
          and column_name = 'created_by_actor_id'
      ),
    'hasProvenance',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relations'
          and column_name in (
            'source_type',
            'provenance_code',
            'provenance_json'
          )
      ),
    'hasStatus',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relations'
          and column_name = 'status'
      ),
    'hasDeactivatedAt',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relations'
          and column_name in (
            'deactivated_at',
            'inactive_at',
            'archived_at'
          )
      )
  );

select
  audit_row.section,
  audit_row.item,
  audit_row.details
from pg_temp.arctor_p10_relation_audit audit_row
order by audit_row.section, audit_row.item;
