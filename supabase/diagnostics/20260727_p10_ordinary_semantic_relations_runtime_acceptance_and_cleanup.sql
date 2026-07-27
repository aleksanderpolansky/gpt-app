-- ARCTor.app
-- P10 ordinary semantic relations runtime acceptance + cleanup
--
-- This script creates isolated fixture Value Objects and relations, verifies
-- the controlled write contract, then removes every fixture row.
-- Unexpected errors roll back the whole transaction automatically.

begin;

create temporary table pg_temp.p10_runtime_results (
  sort_order integer primary key,
  test_name text not null,
  passed boolean not null,
  details jsonb not null default '{}'::jsonb
) on commit drop;

do $runtime$
declare
  v_owner_user_id uuid;
  v_owner_actor_id uuid;
  v_foreign_user_id uuid;
  v_foreign_actor_id uuid;

  v_a_id uuid := gen_random_uuid();
  v_b_id uuid := gen_random_uuid();
  v_c_id uuid := gen_random_uuid();
  v_foreign_id uuid := gen_random_uuid();

  v_support_relation_id uuid;
  v_symmetric_relation_id uuid;
  v_response jsonb;
  v_repeat_response jsonb;
  v_before_tree jsonb;
  v_after_tree jsonb;
  v_rejected boolean;
  v_message text;
  v_count bigint;
begin
  select
    value_object.owner_user_id,
    value_object.owner_actor_id
  into
    v_owner_user_id,
    v_owner_actor_id
  from public.value_objects value_object
  where value_object.owner_user_id is not null
    and value_object.owner_actor_id is not null
  order by value_object.created_at
  limit 1;

  select
    profile.owner_user_id,
    profile.actor_id
  into
    v_foreign_user_id,
    v_foreign_actor_id
  from public.actor_public_profiles profile
  join public.actors actor
    on actor.id = profile.actor_id
   and actor.status = 'active'
  join public.app_users app_user
    on app_user.id = profile.owner_user_id
   and coalesce(app_user.access_status, 'active') <> 'blocked'
  where profile.owner_user_id is distinct from v_owner_user_id
     or profile.actor_id is distinct from v_owner_actor_id
  order by profile.created_at
  limit 1;

  insert into pg_temp.p10_runtime_results
  values (
    1,
    '01_actor_prerequisites',
    v_owner_user_id is not null
      and v_owner_actor_id is not null
      and v_foreign_user_id is not null
      and v_foreign_actor_id is not null,
    jsonb_build_object(
      'ownerUserId', v_owner_user_id,
      'ownerActorId', v_owner_actor_id,
      'foreignUserId', v_foreign_user_id,
      'foreignActorId', v_foreign_actor_id
    )
  );

  if v_owner_user_id is null
     or v_owner_actor_id is null
     or v_foreign_user_id is null
     or v_foreign_actor_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'P10_RUNTIME_ACTOR_PREREQUISITES_MISSING';
  end if;

  insert into public.value_objects (
    id,
    owner_actor_id,
    created_by_actor_id,
    actor_id,
    app_user_id,
    owner_user_id,
    organization_id,
    usage_scope,
    value_type,
    object_kind,
    node_role_code,
    branch_type_code,
    root_value_object_id,
    parent_value_object_id,
    instance_of_value_object_id,
    title,
    description,
    unit_type,
    default_price,
    default_currency,
    default_duration_minutes,
    is_marketplace_sellable,
    is_free_possible,
    commercial_usage,
    visibility,
    privacy_level,
    sensitivity_level,
    source,
    status,
    identity_attributes_json,
    metadata_json
  )
  values
  (
    v_a_id,
    v_owner_actor_id,
    v_owner_actor_id,
    v_owner_actor_id,
    v_owner_user_id,
    v_owner_user_id,
    null,
    'private',
    'other',
    'other',
    'structural',
    'external_capital',
    null,
    null,
    null,
    'P10 Runtime A',
    'P10 semantic relation fixture A',
    null,
    null,
    null,
    null,
    false,
    false,
    'none',
    'private',
    'private',
    'standard',
    'manual',
    'draft',
    '{}'::jsonb,
    jsonb_build_object('fixture', 'p10_runtime')
  ),
  (
    v_b_id,
    v_owner_actor_id,
    v_owner_actor_id,
    v_owner_actor_id,
    v_owner_user_id,
    v_owner_user_id,
    null,
    'private',
    'other',
    'other',
    'structural',
    'resource',
    null,
    null,
    null,
    'P10 Runtime B',
    'P10 semantic relation fixture B',
    null,
    null,
    null,
    null,
    false,
    false,
    'none',
    'private',
    'private',
    'standard',
    'manual',
    'draft',
    '{}'::jsonb,
    jsonb_build_object('fixture', 'p10_runtime')
  ),
  (
    v_c_id,
    v_owner_actor_id,
    v_owner_actor_id,
    v_owner_actor_id,
    v_owner_user_id,
    v_owner_user_id,
    null,
    'private',
    'other',
    'other',
    'structural',
    'internal_capability',
    null,
    null,
    null,
    'P10 Runtime C',
    'P10 semantic relation fixture C',
    null,
    null,
    null,
    null,
    false,
    false,
    'none',
    'private',
    'private',
    'standard',
    'manual',
    'draft',
    '{}'::jsonb,
    jsonb_build_object('fixture', 'p10_runtime')
  ),
  (
    v_foreign_id,
    v_foreign_actor_id,
    v_foreign_actor_id,
    v_foreign_actor_id,
    v_foreign_user_id,
    v_foreign_user_id,
    null,
    'private',
    'other',
    'other',
    'structural',
    'resource',
    null,
    null,
    null,
    'P10 Runtime Foreign',
    'P10 foreign actor fixture',
    null,
    null,
    null,
    null,
    false,
    false,
    'none',
    'private',
    'private',
    'standard',
    'manual',
    'draft',
    '{}'::jsonb,
    jsonb_build_object('fixture', 'p10_runtime_foreign')
  );

  insert into pg_temp.p10_runtime_results
  select
    2,
    '02_fixture_objects_created',
    count(*) = 4,
    jsonb_build_object('fixtureCount', count(*))
  from public.value_objects
  where id in (v_a_id, v_b_id, v_c_id, v_foreign_id);

  select jsonb_agg(
    jsonb_build_object(
      'id', value_object.id,
      'parentValueObjectId', value_object.parent_value_object_id,
      'rootValueObjectId', value_object.root_value_object_id,
      'branchTypeCode', value_object.branch_type_code,
      'nodeRoleCode', value_object.node_role_code,
      'objectKind', value_object.object_kind
    ) order by value_object.id
  )
  into v_before_tree
  from public.value_objects value_object
  where value_object.id in (v_a_id, v_b_id, v_c_id);

  v_response := public.create_or_reactivate_value_object_relation_v1(
    v_owner_user_id,
    v_owner_actor_id,
    v_owner_actor_id,
    v_a_id,
    v_b_id,
    'supports',
    'manual',
    'p10-runtime-create-supports-0001'
  );

  v_support_relation_id := (v_response #>> '{relation,id}')::uuid;

  insert into pg_temp.p10_runtime_results
  values (
    3,
    '03_directed_cross_branch_create',
    v_response ->> 'disposition' = 'created'
      and v_support_relation_id is not null
      and exists (
        select 1
        from public.value_object_relations relation
        where relation.id = v_support_relation_id
          and relation.source_value_object_id = v_a_id
          and relation.target_value_object_id = v_b_id
          and relation.relation_type_code = 'supports'
          and relation.status = 'active'
      ),
    v_response
  );

  v_repeat_response := public.create_or_reactivate_value_object_relation_v1(
    v_owner_user_id,
    v_owner_actor_id,
    v_owner_actor_id,
    v_a_id,
    v_b_id,
    'supports',
    'manual',
    'p10-runtime-create-supports-0001'
  );

  insert into pg_temp.p10_runtime_results
  values (
    4,
    '04_create_idempotency_replay',
    v_repeat_response = v_response
      and (
        select count(*)
        from public.value_object_relations relation
        where relation.id = v_support_relation_id
      ) = 1,
    jsonb_build_object(
      'first', v_response,
      'repeat', v_repeat_response
    )
  );

  v_rejected := false;
  v_message := null;
  begin
    perform public.create_or_reactivate_value_object_relation_v1(
      v_owner_user_id,
      v_owner_actor_id,
      v_owner_actor_id,
      v_a_id,
      v_c_id,
      'supports',
      'manual',
      'p10-runtime-create-supports-0001'
    );
  exception when others then
    v_rejected := sqlerrm = 'P10_IDEMPOTENCY_CONFLICT';
    v_message := sqlerrm;
  end;

  insert into pg_temp.p10_runtime_results
  values (
    5,
    '05_idempotency_conflict_rejected',
    v_rejected,
    jsonb_build_object('message', v_message)
  );

  v_response := public.create_or_reactivate_value_object_relation_v1(
    v_owner_user_id,
    v_owner_actor_id,
    v_owner_actor_id,
    v_a_id,
    v_c_id,
    'related_to',
    'manual',
    'p10-runtime-create-symmetric-0001'
  );

  v_symmetric_relation_id := (v_response #>> '{relation,id}')::uuid;

  v_repeat_response := public.create_or_reactivate_value_object_relation_v1(
    v_owner_user_id,
    v_owner_actor_id,
    v_owner_actor_id,
    v_c_id,
    v_a_id,
    'related_to',
    'manual',
    'p10-runtime-create-symmetric-reverse-0001'
  );

  insert into pg_temp.p10_runtime_results
  values (
    6,
    '06_symmetric_reverse_is_same_relation',
    (v_repeat_response #>> '{relation,id}')::uuid = v_symmetric_relation_id
      and v_repeat_response ->> 'disposition' = 'already_active'
      and (
        select count(*)
        from public.value_object_relations relation
        where relation.relation_type_code = 'related_to'
          and relation.source_value_object_id in (v_a_id, v_c_id)
          and relation.target_value_object_id in (v_a_id, v_c_id)
      ) = 1,
    jsonb_build_object(
      'first', v_response,
      'reverse', v_repeat_response
    )
  );

  v_rejected := false;
  v_message := null;
  begin
    perform public.create_or_reactivate_value_object_relation_v1(
      v_owner_user_id,
      v_owner_actor_id,
      v_owner_actor_id,
      v_a_id,
      v_a_id,
      'related_to',
      'manual',
      'p10-runtime-self-link-reject-0001'
    );
  exception when others then
    v_rejected := sqlerrm = 'P10_SELF_LINK_FORBIDDEN';
    v_message := sqlerrm;
  end;

  insert into pg_temp.p10_runtime_results
  values (
    7,
    '07_self_link_rejected',
    v_rejected,
    jsonb_build_object('message', v_message)
  );

  v_rejected := false;
  v_message := null;
  begin
    perform public.create_or_reactivate_value_object_relation_v1(
      v_owner_user_id,
      v_owner_actor_id,
      v_owner_actor_id,
      v_a_id,
      v_foreign_id,
      'supports',
      'manual',
      'p10-runtime-cross-actor-reject-0001'
    );
  exception when others then
    v_rejected := sqlerrm = 'P10_RELATION_OWNER_MISMATCH';
    v_message := sqlerrm;
  end;

  insert into pg_temp.p10_runtime_results
  values (
    8,
    '08_cross_actor_rejected',
    v_rejected,
    jsonb_build_object('message', v_message)
  );

  v_rejected := false;
  v_message := null;
  begin
    perform public.create_or_reactivate_value_object_relation_v1(
      v_owner_user_id,
      v_owner_actor_id,
      v_owner_actor_id,
      v_a_id,
      v_b_id,
      'associated_with',
      'manual',
      'p10-runtime-inactive-type-reject-0001'
    );
  exception when others then
    v_rejected := sqlerrm = 'P10_RELATION_TYPE_NOT_ACTIVE_ORDINARY';
    v_message := sqlerrm;
  end;

  insert into pg_temp.p10_runtime_results
  values (
    9,
    '09_inactive_relation_type_rejected',
    v_rejected,
    jsonb_build_object('message', v_message)
  );

  v_response := public.set_value_object_relation_status_v1(
    v_owner_user_id,
    v_owner_actor_id,
    v_owner_actor_id,
    v_a_id,
    v_support_relation_id,
    'inactive',
    'p10-runtime-deactivate-supports-0001'
  );

  insert into pg_temp.p10_runtime_results
  values (
    10,
    '10_deactivate_without_delete',
    v_response ->> 'disposition' = 'deactivated'
      and exists (
        select 1
        from public.value_object_relations relation
        where relation.id = v_support_relation_id
          and relation.status = 'inactive'
          and relation.deactivated_at is not null
      ),
    v_response
  );

  v_repeat_response := public.set_value_object_relation_status_v1(
    v_owner_user_id,
    v_owner_actor_id,
    v_owner_actor_id,
    v_a_id,
    v_support_relation_id,
    'inactive',
    'p10-runtime-deactivate-supports-0001'
  );

  insert into pg_temp.p10_runtime_results
  values (
    11,
    '11_deactivate_idempotency_replay',
    v_repeat_response = v_response,
    jsonb_build_object(
      'first', v_response,
      'repeat', v_repeat_response
    )
  );

  v_response := public.set_value_object_relation_status_v1(
    v_owner_user_id,
    v_owner_actor_id,
    v_owner_actor_id,
    v_b_id,
    v_support_relation_id,
    'active',
    'p10-runtime-reactivate-supports-0001'
  );

  insert into pg_temp.p10_runtime_results
  values (
    12,
    '12_reactivate_same_lifecycle_row',
    v_response ->> 'disposition' = 'reactivated'
      and (v_response #>> '{relation,id}')::uuid = v_support_relation_id
      and exists (
        select 1
        from public.value_object_relations relation
        where relation.id = v_support_relation_id
          and relation.status = 'active'
          and relation.deactivated_at is null
          and relation.reactivated_at is not null
      ),
    v_response
  );

  v_rejected := false;
  v_message := null;
  begin
    perform public.set_value_object_relation_status_v1(
      v_owner_user_id,
      v_owner_actor_id,
      v_owner_actor_id,
      v_c_id,
      v_support_relation_id,
      'inactive',
      'p10-runtime-context-mismatch-reject-0001'
    );
  exception when others then
    v_rejected := sqlerrm = 'P10_RELATION_NOT_FOUND_OR_CONTEXT_MISMATCH';
    v_message := sqlerrm;
  end;

  insert into pg_temp.p10_runtime_results
  values (
    13,
    '13_unrelated_context_cannot_change_relation',
    v_rejected,
    jsonb_build_object('message', v_message)
  );

  v_rejected := false;
  v_message := null;
  begin
    insert into public.value_object_relations (
      owner_user_id,
      owner_actor_id,
      source_value_object_id,
      target_value_object_id,
      relation_type_code,
      status,
      provenance_code,
      created_by_actor_id,
      updated_by_actor_id
    )
    values (
      v_owner_user_id,
      v_owner_actor_id,
      v_c_id,
      v_a_id,
      'related_to',
      'active',
      'manual',
      v_owner_actor_id,
      v_owner_actor_id
    );
  exception when unique_violation then
    v_rejected := true;
    v_message := sqlerrm;
  end;

  insert into pg_temp.p10_runtime_results
  values (
    14,
    '14_direct_reverse_symmetric_duplicate_rejected',
    v_rejected,
    jsonb_build_object('message', v_message)
  );

  select jsonb_agg(
    jsonb_build_object(
      'id', value_object.id,
      'parentValueObjectId', value_object.parent_value_object_id,
      'rootValueObjectId', value_object.root_value_object_id,
      'branchTypeCode', value_object.branch_type_code,
      'nodeRoleCode', value_object.node_role_code,
      'objectKind', value_object.object_kind
    ) order by value_object.id
  )
  into v_after_tree
  from public.value_objects value_object
  where value_object.id in (v_a_id, v_b_id, v_c_id);

  insert into pg_temp.p10_runtime_results
  values (
    15,
    '15_relation_writes_do_not_change_tree',
    v_after_tree = v_before_tree,
    jsonb_build_object(
      'before', v_before_tree,
      'after', v_after_tree
    )
  );

  select count(*)
  into v_count
  from public.value_object_relation_operations operation
  where operation.owner_user_id = v_owner_user_id
    and operation.owner_actor_id = v_owner_actor_id
    and operation.idempotency_key like 'p10-runtime-%';

  insert into pg_temp.p10_runtime_results
  values (
    16,
    '16_operation_log_count',
    v_count = 5,
    jsonb_build_object('operationCount', v_count)
  );

  delete from public.value_object_relation_operations operation
  where operation.owner_user_id = v_owner_user_id
    and operation.owner_actor_id = v_owner_actor_id
    and operation.idempotency_key like 'p10-runtime-%';

  delete from public.value_object_relations relation
  where relation.source_value_object_id in (v_a_id, v_b_id, v_c_id, v_foreign_id)
     or relation.target_value_object_id in (v_a_id, v_b_id, v_c_id, v_foreign_id);

  delete from public.value_objects value_object
  where value_object.id in (v_a_id, v_b_id, v_c_id, v_foreign_id);

  insert into pg_temp.p10_runtime_results
  select
    17,
    '17_cleanup_zero_relation_rows',
    count(*) = 0,
    jsonb_build_object('remainingRows', count(*))
  from public.value_object_relations relation
  where relation.source_value_object_id in (v_a_id, v_b_id, v_c_id, v_foreign_id)
     or relation.target_value_object_id in (v_a_id, v_b_id, v_c_id, v_foreign_id);

  insert into pg_temp.p10_runtime_results
  select
    18,
    '18_cleanup_zero_fixture_objects',
    count(*) = 0,
    jsonb_build_object('remainingRows', count(*))
  from public.value_objects value_object
  where value_object.id in (v_a_id, v_b_id, v_c_id, v_foreign_id);
end;
$runtime$;

select
  sort_order,
  test_name,
  passed,
  details
from pg_temp.p10_runtime_results
order by sort_order;

select
  count(*) filter (
    where idempotency_key like 'p10-runtime-%'
  ) as runtime_operation_rows,
  (
    select count(*)
    from public.value_objects
    where metadata_json ->> 'fixture' in (
      'p10_runtime',
      'p10_runtime_foreign'
    )
  ) as runtime_value_object_rows
from public.value_object_relation_operations;

commit;
