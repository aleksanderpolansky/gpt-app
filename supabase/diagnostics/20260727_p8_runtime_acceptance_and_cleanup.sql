-- ARCTor.app
-- P8 controlled tree restructure — runtime acceptance with automatic cleanup
-- Date: 2026-07-27
-- Revision: v6 — final acceptance after pgcrypto, timestamp, rollback-ordering and hierarchy-audit hotfixes
--
-- IMPORTANT:
-- 1. Run this file ONCE in Supabase SQL Editor as role postgres.
-- 2. It selects two active personal actors and creates isolated Value Object fixtures.
-- 3. On success it explicitly deletes all fixtures and P8 audit rows.
-- 4. On any unexpected error, the inner PL/pgSQL block is rolled back automatically
--    and the final result contains one failed runtime_exception row.
-- 5. It does not touch activities, facts, parameters, targets, profiles, or real user data.

drop table if exists p8_runtime_results;

create temporary table p8_runtime_results (
  check_order integer not null,
  check_name text not null,
  passed boolean not null,
  details text
) on commit preserve rows;

do $runtime$
declare
  -- Actors are selected automatically from active personal profiles.
  v_owner_user_id uuid;
  v_owner_actor_id uuid;
  v_created_by_actor_id uuid;

  -- A second owner is used only for foreign-owner rejection tests.
  v_foreign_user_id uuid;
  v_foreign_actor_id uuid;

  v_run_token text := replace(gen_random_uuid()::text, '-', '');
  v_prefix text;

  v_root_a uuid := gen_random_uuid();
  v_root_b uuid := gen_random_uuid();
  v_root_c uuid := gen_random_uuid();
  v_foreign_root uuid := gen_random_uuid();

  v_a1 uuid := gen_random_uuid();
  v_a2 uuid := gen_random_uuid();
  v_leaf_a uuid := gen_random_uuid();

  v_b1 uuid := gen_random_uuid();
  v_b2 uuid := gen_random_uuid();
  v_leaf_b uuid := gen_random_uuid();
  v_leaf_b2 uuid := gen_random_uuid();

  v_payload jsonb;
  v_preview jsonb;
  v_stale_preview jsonb;
  v_apply_1 jsonb;
  v_apply_1_replay jsonb;
  v_apply_2 jsonb;
  v_rollback_1 jsonb;
  v_rollback_2 jsonb;
  v_rollback_2_replay jsonb;
  v_insert_apply jsonb;
  v_insert_rollback jsonb;

  v_operation_1 uuid;
  v_operation_2 uuid;
  v_insert_operation uuid;
  v_created_intermediate uuid;

  v_hash text;
  v_request_hash_1 text;
  v_request_hash_2 text;
  v_request_hash_insert text;
  v_rollback_hash_1 text;
  v_rollback_hash_2 text;
  v_rollback_hash_insert text;

  v_key_stale text;
  v_key_1 text;
  v_key_2 text;
  v_key_insert text;
  v_key_rollback_1 text;
  v_key_rollback_2 text;
  v_key_rollback_insert text;

  v_count integer;
  v_failed boolean;
  v_error text;
  v_exception_detail text;
  v_exception_hint text;
  v_exception_context text;
begin
  v_prefix := 'p8rt-' || left(v_run_token, 12);

  begin
    ---------------------------------------------------------------------------
    -- 1. Environment and actor prerequisites
    ---------------------------------------------------------------------------
    select
      profile.owner_user_id,
      profile.actor_id
    into
      v_owner_user_id,
      v_owner_actor_id
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id = profile.actor_id
     and actor.status = 'active'
    where profile.profile_kind = 'personal'
    order by profile.updated_at desc nulls last, profile.actor_id
    limit 1;

    v_created_by_actor_id := v_owner_actor_id;

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
    where profile.profile_kind = 'personal'
      and profile.owner_user_id is distinct from v_owner_user_id
    order by profile.updated_at desc nulls last, profile.actor_id
    limit 1;

    if not exists (
      select 1
      from public.actor_public_profiles profile
      join public.actors actor
        on actor.id = profile.actor_id
       and actor.status = 'active'
      where profile.owner_user_id = v_owner_user_id
        and profile.actor_id = v_owner_actor_id
    ) then
      raise exception 'P8_RUNTIME_PRIMARY_ACTOR_NOT_READY';
    end if;

    if not exists (
      select 1
      from public.actor_public_profiles profile
      join public.actors actor
        on actor.id = profile.actor_id
       and actor.status = 'active'
      where profile.owner_user_id = v_foreign_user_id
        and profile.actor_id = v_foreign_actor_id
    ) then
      raise exception 'P8_RUNTIME_FOREIGN_ACTOR_NOT_READY';
    end if;

    if not exists (
      select 1
      from public.value_object_branch_types
      where branch_type_code = 'internal_capability'
        and status = 'active'
    ) or not exists (
      select 1
      from public.value_object_branch_types
      where branch_type_code = 'resource'
        and status = 'active'
    ) then
      raise exception 'P8_RUNTIME_BRANCH_TYPES_NOT_READY';
    end if;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (1, 'actor_and_branch_prerequisites', true,
       'Primary actor, foreign actor and required branch types are active.');

    ---------------------------------------------------------------------------
    -- 2. Create isolated fixture roots
    ---------------------------------------------------------------------------
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
      metadata_json,
      created_at,
      updated_at
    )
    values
      (
        v_root_a,
        v_owner_actor_id,
        v_created_by_actor_id,
        v_owner_actor_id,
        v_owner_user_id,
        v_owner_user_id,
        null,
        'private',
        'other',
        'other',
        'structural',
        'internal_capability',
        v_root_a,
        null,
        null,
        'P8 runtime root A ' || v_run_token,
        'Temporary P8 runtime fixture.',
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
        jsonb_build_object('p8_runtime_token', v_run_token),
        clock_timestamp(),
        clock_timestamp()
      ),
      (
        v_root_b,
        v_owner_actor_id,
        v_created_by_actor_id,
        v_owner_actor_id,
        v_owner_user_id,
        v_owner_user_id,
        null,
        'private',
        'other',
        'other',
        'structural',
        'internal_capability',
        v_root_b,
        null,
        null,
        'P8 runtime root B ' || v_run_token,
        'Temporary P8 runtime fixture.',
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
        jsonb_build_object('p8_runtime_token', v_run_token),
        clock_timestamp(),
        clock_timestamp()
      ),
      (
        v_root_c,
        v_owner_actor_id,
        v_created_by_actor_id,
        v_owner_actor_id,
        v_owner_user_id,
        v_owner_user_id,
        null,
        'private',
        'other',
        'other',
        'structural',
        'resource',
        v_root_c,
        null,
        null,
        'P8 runtime resource root ' || v_run_token,
        'Temporary P8 runtime fixture.',
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
        jsonb_build_object('p8_runtime_token', v_run_token),
        clock_timestamp(),
        clock_timestamp()
      ),
      (
        v_foreign_root,
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
        'internal_capability',
        v_foreign_root,
        null,
        null,
        'P8 runtime foreign root ' || v_run_token,
        'Temporary P8 runtime fixture.',
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
        jsonb_build_object('p8_runtime_token', v_run_token),
        clock_timestamp(),
        clock_timestamp()
      );

    ---------------------------------------------------------------------------
    -- 3. Create deep branch and destination branch
    ---------------------------------------------------------------------------
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
      metadata_json,
      created_at,
      updated_at
    )
    values
      (
        v_a1,
        v_owner_actor_id,
        v_created_by_actor_id,
        v_owner_actor_id,
        v_owner_user_id,
        v_owner_user_id,
        null,
        'private',
        'other',
        'other',
        'structural',
        'internal_capability',
        v_root_a,
        v_root_a,
        null,
        'P8 runtime A1 ' || v_run_token,
        'Runtime A1',
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
        jsonb_build_object('p8_runtime_token', v_run_token),
        clock_timestamp(),
        clock_timestamp()
      ),
      (
        v_b1,
        v_owner_actor_id,
        v_created_by_actor_id,
        v_owner_actor_id,
        v_owner_user_id,
        v_owner_user_id,
        null,
        'private',
        'other',
        'other',
        'structural',
        'internal_capability',
        v_root_b,
        v_root_b,
        null,
        'P8 runtime B1 ' || v_run_token,
        'Runtime B1',
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
        jsonb_build_object('p8_runtime_token', v_run_token),
        clock_timestamp(),
        clock_timestamp()
      );

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
      metadata_json,
      created_at,
      updated_at
    )
    values
      (
        v_a2,
        v_owner_actor_id,
        v_created_by_actor_id,
        v_owner_actor_id,
        v_owner_user_id,
        v_owner_user_id,
        null,
        'private',
        'other',
        'other',
        'structural',
        'internal_capability',
        v_root_a,
        v_a1,
        null,
        'P8 runtime A2 ' || v_run_token,
        'Runtime A2',
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
        jsonb_build_object('p8_runtime_token', v_run_token),
        clock_timestamp(),
        clock_timestamp()
      ),
      (
        v_b2,
        v_owner_actor_id,
        v_created_by_actor_id,
        v_owner_actor_id,
        v_owner_user_id,
        v_owner_user_id,
        null,
        'private',
        'other',
        'other',
        'structural',
        'internal_capability',
        v_root_b,
        v_b1,
        null,
        'P8 runtime B2 ' || v_run_token,
        'Runtime B2',
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
        jsonb_build_object('p8_runtime_token', v_run_token),
        clock_timestamp(),
        clock_timestamp()
      );

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
      metadata_json,
      created_at,
      updated_at
    )
    values
      (
        v_leaf_a,
        v_owner_actor_id,
        v_created_by_actor_id,
        v_owner_actor_id,
        v_owner_user_id,
        v_owner_user_id,
        null,
        'private',
        'activity_pattern',
        'activity_pattern',
        'activity_leaf',
        'internal_capability',
        v_root_a,
        v_a2,
        null,
        'P8 runtime leaf A ' || v_run_token,
        'Runtime leaf A',
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
        jsonb_build_object('p8_runtime_token', v_run_token),
        clock_timestamp(),
        clock_timestamp()
      ),
      (
        v_leaf_b,
        v_owner_actor_id,
        v_created_by_actor_id,
        v_owner_actor_id,
        v_owner_user_id,
        v_owner_user_id,
        null,
        'private',
        'activity_pattern',
        'activity_pattern',
        'activity_leaf',
        'internal_capability',
        v_root_b,
        v_b1,
        null,
        'P8 runtime leaf B ' || v_run_token,
        'Runtime leaf B',
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
        jsonb_build_object('p8_runtime_token', v_run_token),
        clock_timestamp(),
        clock_timestamp()
      ),
      (
        v_leaf_b2,
        v_owner_actor_id,
        v_created_by_actor_id,
        v_owner_actor_id,
        v_owner_user_id,
        v_owner_user_id,
        null,
        'private',
        'activity_pattern',
        'activity_pattern',
        'activity_leaf',
        'internal_capability',
        v_root_b,
        v_b2,
        null,
        'P8 runtime leaf B2 ' || v_run_token,
        'Runtime leaf B2',
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
        jsonb_build_object('p8_runtime_token', v_run_token),
        clock_timestamp(),
        clock_timestamp()
      );

    select count(*)
    into v_count
    from public.value_objects
    where metadata_json ->> 'p8_runtime_token' = v_run_token;

    if v_count <> 11 then
      raise exception 'P8_RUNTIME_FIXTURE_COUNT_INVALID: %', v_count;
    end if;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (2, 'deep_and_parallel_fixture_tree_created', true,
       '11 isolated fixture rows: deep subtree, parallel branch, cross-branch root and foreign root.');

    ---------------------------------------------------------------------------
    -- 4. Existing direct update path must remain blocked
    ---------------------------------------------------------------------------
    v_failed := false;
    v_error := null;

    begin
      update public.value_objects
      set
        parent_value_object_id = v_b1,
        root_value_object_id = v_root_b,
        updated_at = updated_at + interval '1 second'
      where id = v_a1;
    exception when others then
      v_error := sqlerrm;
      v_failed := (sqlerrm = 'VALUE_OBJECT_TREE_V2_SUBTREE_MOVE_REQUIRES_CONTROLLED_FLOW');
    end;

    if not v_failed then
      raise exception 'P8_RUNTIME_DIRECT_MOVE_GUARD_FAILED: %', coalesce(v_error, 'no exception');
    end if;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (3, 'uncontrolled_subtree_move_rejected', true, v_error);

    ---------------------------------------------------------------------------
    -- 5. Cycle must be rejected
    ---------------------------------------------------------------------------
    v_failed := false;
    v_error := null;

    begin
      perform public.preview_value_object_tree_restructure_v1(
        v_owner_user_id,
        v_owner_actor_id,
        v_a1,
        'reparent',
        jsonb_build_object('newParentValueObjectId', v_a2::text)
      );
    exception when others then
      v_error := sqlerrm;
      v_failed := (sqlerrm = 'P8_CYCLE_FORBIDDEN');
    end;

    if not v_failed then
      raise exception 'P8_RUNTIME_CYCLE_GUARD_FAILED: %', coalesce(v_error, 'no exception');
    end if;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (4, 'cycle_rejected', true, v_error);

    ---------------------------------------------------------------------------
    -- 6. Leaf destination must be rejected
    ---------------------------------------------------------------------------
    v_failed := false;
    v_error := null;

    begin
      perform public.preview_value_object_tree_restructure_v1(
        v_owner_user_id,
        v_owner_actor_id,
        v_a1,
        'reparent',
        jsonb_build_object('newParentValueObjectId', v_leaf_b::text)
      );
    exception when others then
      v_error := sqlerrm;
      v_failed := (sqlerrm = 'P8_DESTINATION_PARENT_MUST_BE_STRUCTURAL');
    end;

    if not v_failed then
      raise exception 'P8_RUNTIME_LEAF_PARENT_GUARD_FAILED: %', coalesce(v_error, 'no exception');
    end if;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (5, 'leaf_destination_rejected', true, v_error);

    ---------------------------------------------------------------------------
    -- 7. Cross-branch destination must be rejected
    ---------------------------------------------------------------------------
    v_failed := false;
    v_error := null;

    begin
      perform public.preview_value_object_tree_restructure_v1(
        v_owner_user_id,
        v_owner_actor_id,
        v_a1,
        'reparent',
        jsonb_build_object('newParentValueObjectId', v_root_c::text)
      );
    exception when others then
      v_error := sqlerrm;
      v_failed := (sqlerrm = 'P8_CROSS_BRANCH_MOVE_FORBIDDEN');
    end;

    if not v_failed then
      raise exception 'P8_RUNTIME_CROSS_BRANCH_GUARD_FAILED: %', coalesce(v_error, 'no exception');
    end if;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (6, 'cross_branch_move_rejected', true, v_error);

    ---------------------------------------------------------------------------
    -- 8. Foreign destination must be rejected
    ---------------------------------------------------------------------------
    v_failed := false;
    v_error := null;

    begin
      perform public.preview_value_object_tree_restructure_v1(
        v_owner_user_id,
        v_owner_actor_id,
        v_a1,
        'reparent',
        jsonb_build_object('newParentValueObjectId', v_foreign_root::text)
      );
    exception when others then
      v_error := sqlerrm;
      v_failed := (sqlerrm = 'P8_DESTINATION_PARENT_OWNER_MISMATCH');
    end;

    if not v_failed then
      raise exception 'P8_RUNTIME_FOREIGN_OWNER_GUARD_FAILED: %', coalesce(v_error, 'no exception');
    end if;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (7, 'foreign_destination_rejected', true, v_error);

    ---------------------------------------------------------------------------
    -- 9. Stale preview must be rejected before an operation row is created
    ---------------------------------------------------------------------------
    v_payload := jsonb_build_object('newParentValueObjectId', v_b1::text);

    v_stale_preview := public.preview_value_object_tree_restructure_v1(
      v_owner_user_id,
      v_owner_actor_id,
      v_a1,
      'reparent',
      v_payload
    );

    update public.value_objects
    set
      description = 'Runtime A1 changed after preview',
      updated_at = updated_at + interval '1 second'
    where id = v_a1;

    v_key_stale := v_prefix || '-stale-preview';
    v_hash := upper(
      encode(
        extensions.digest(convert_to(v_key_stale || v_payload::text, 'UTF8'), 'sha256'),
        'hex'
      )
    );

    v_failed := false;
    v_error := null;

    begin
      perform public.apply_value_object_tree_restructure_v1(
        v_owner_user_id,
        v_owner_actor_id,
        v_created_by_actor_id,
        v_a1,
        'reparent',
        v_payload,
        v_stale_preview ->> 'previewHash',
        v_key_stale,
        v_hash
      );
    exception when others then
      v_error := sqlerrm;
      v_failed := (sqlerrm = 'P8_PREVIEW_STALE_RELOAD_REQUIRED');
    end;

    if not v_failed then
      raise exception 'P8_RUNTIME_STALE_PREVIEW_GUARD_FAILED: %', coalesce(v_error, 'no exception');
    end if;

    if exists (
      select 1
      from public.value_object_tree_operations
      where owner_user_id = v_owner_user_id
        and owner_actor_id = v_owner_actor_id
        and idempotency_key = v_key_stale
    ) then
      raise exception 'P8_RUNTIME_STALE_PREVIEW_CREATED_OPERATION';
    end if;

    update public.value_objects
    set
      description = 'Runtime A1',
      updated_at = updated_at + interval '1 second'
    where id = v_a1;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (8, 'stale_preview_rejected_without_audit_row', true, v_error);

    ---------------------------------------------------------------------------
    -- 10. Fresh preview must show paths and the whole deep subtree
    ---------------------------------------------------------------------------
    v_preview := public.preview_value_object_tree_restructure_v1(
      v_owner_user_id,
      v_owner_actor_id,
      v_a1,
      'reparent',
      v_payload
    );

    if coalesce((v_preview ->> 'allowed')::boolean, false) is not true
       or jsonb_array_length(v_preview -> 'affectedNodes') <> 3
       or jsonb_array_length(v_preview -> 'oldPath') <> 2
       or jsonb_array_length(v_preview -> 'newPath') <> 3 then
      raise exception 'P8_RUNTIME_REPARENT_PREVIEW_SHAPE_INVALID: %', v_preview::text;
    end if;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (9, 'reparent_preview_paths_and_subtree', true,
       'oldPath=2, newPath=3, affectedNodes=3.');

    ---------------------------------------------------------------------------
    -- 11. Apply reparent atomically across the complete subtree
    ---------------------------------------------------------------------------
    v_key_1 := v_prefix || '-reparent-1';
    v_request_hash_1 := upper(
      encode(
        extensions.digest(convert_to(v_key_1 || v_payload::text, 'UTF8'), 'sha256'),
        'hex'
      )
    );

    v_apply_1 := public.apply_value_object_tree_restructure_v1(
      v_owner_user_id,
      v_owner_actor_id,
      v_created_by_actor_id,
      v_a1,
      'reparent',
      v_payload,
      v_preview ->> 'previewHash',
      v_key_1,
      v_request_hash_1
    );

    v_operation_1 := (v_apply_1 ->> 'operationId')::uuid;

    if not exists (
      select 1
      from public.value_objects
      where id = v_a1
        and parent_value_object_id = v_b1
        and root_value_object_id = v_root_b
    ) or not exists (
      select 1
      from public.value_objects
      where id = v_a2
        and parent_value_object_id = v_a1
        and root_value_object_id = v_root_b
    ) or not exists (
      select 1
      from public.value_objects
      where id = v_leaf_a
        and parent_value_object_id = v_a2
        and root_value_object_id = v_root_b
    ) then
      raise exception 'P8_RUNTIME_REPARENT_TREE_STATE_INVALID';
    end if;

    select count(*)
    into v_count
    from public.value_object_tree_operation_items
    where operation_id = v_operation_1;

    if v_count <> 3 then
      raise exception 'P8_RUNTIME_REPARENT_AUDIT_ITEM_COUNT_INVALID: %', v_count;
    end if;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (10, 'atomic_deep_subtree_reparent_applied', true,
       'Target and two descendants moved to the new root; 3 audit items.');

    ---------------------------------------------------------------------------
    -- 12. Apply idempotency replay
    ---------------------------------------------------------------------------
    v_apply_1_replay := public.apply_value_object_tree_restructure_v1(
      v_owner_user_id,
      v_owner_actor_id,
      v_created_by_actor_id,
      v_a1,
      'reparent',
      v_payload,
      v_preview ->> 'previewHash',
      v_key_1,
      v_request_hash_1
    );

    if coalesce((v_apply_1_replay ->> 'idempotentReplay')::boolean, false) is not true
       or (v_apply_1_replay ->> 'operationId')::uuid <> v_operation_1 then
      raise exception 'P8_RUNTIME_APPLY_IDEMPOTENCY_REPLAY_INVALID: %', v_apply_1_replay::text;
    end if;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (11, 'apply_idempotency_replay', true,
       'Same operationId returned with idempotentReplay=true.');

    ---------------------------------------------------------------------------
    -- 13. Apply a newer overlapping operation
    ---------------------------------------------------------------------------
    -- The runtime suite runs inside one SQL transaction. P8 now uses
    -- clock_timestamp() for audit-row creation; this short delay makes the
    -- newer-operation ordering assertion deterministic in the test itself.
    perform pg_sleep(0.005);

    v_payload := jsonb_build_object('newParentValueObjectId', v_root_a::text);

    v_preview := public.preview_value_object_tree_restructure_v1(
      v_owner_user_id,
      v_owner_actor_id,
      v_a1,
      'reparent',
      v_payload
    );

    v_key_2 := v_prefix || '-reparent-2';
    v_request_hash_2 := upper(
      encode(
        extensions.digest(convert_to(v_key_2 || v_payload::text, 'UTF8'), 'sha256'),
        'hex'
      )
    );

    v_apply_2 := public.apply_value_object_tree_restructure_v1(
      v_owner_user_id,
      v_owner_actor_id,
      v_created_by_actor_id,
      v_a1,
      'reparent',
      v_payload,
      v_preview ->> 'previewHash',
      v_key_2,
      v_request_hash_2
    );

    v_operation_2 := (v_apply_2 ->> 'operationId')::uuid;

    if not exists (
      select 1
      from public.value_objects
      where id = v_a1
        and parent_value_object_id = v_root_a
        and root_value_object_id = v_root_a
    ) or not exists (
      select 1
      from public.value_objects
      where id in (v_a2, v_leaf_a)
        and root_value_object_id = v_root_a
      group by root_value_object_id
      having count(*) = 2
    ) then
      raise exception 'P8_RUNTIME_NEWER_REPARENT_TREE_STATE_INVALID';
    end if;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (12, 'newer_overlapping_operation_applied', true,
       'Second controlled operation moved the same subtree back under root A.');

    ---------------------------------------------------------------------------
    -- 14. Older rollback must be blocked by newer applied operation
    ---------------------------------------------------------------------------
    v_key_rollback_1 := v_prefix || '-rollback-1';
    v_rollback_hash_1 := upper(
      encode(
        extensions.digest(convert_to(v_key_rollback_1 || v_operation_1::text, 'UTF8'), 'sha256'),
        'hex'
      )
    );

    v_failed := false;
    v_error := null;

    begin
      perform public.rollback_value_object_tree_restructure_v1(
        v_owner_user_id,
        v_owner_actor_id,
        v_created_by_actor_id,
        v_operation_1,
        v_key_rollback_1,
        v_rollback_hash_1
      );
    exception when others then
      v_error := sqlerrm;
      v_failed := (sqlerrm = 'P8_ROLLBACK_BLOCKED_BY_NEWER_TREE_OPERATION');
    end;

    if not v_failed then
      raise exception 'P8_RUNTIME_NEWER_OPERATION_ROLLBACK_GUARD_FAILED: %',
        coalesce(v_error, 'no exception');
    end if;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (13, 'older_rollback_blocked_by_newer_operation', true, v_error);

    ---------------------------------------------------------------------------
    -- 15. Roll back the newer operation, then replay that rollback
    ---------------------------------------------------------------------------
    v_key_rollback_2 := v_prefix || '-rollback-2';
    v_rollback_hash_2 := upper(
      encode(
        extensions.digest(convert_to(v_key_rollback_2 || v_operation_2::text, 'UTF8'), 'sha256'),
        'hex'
      )
    );

    v_rollback_2 := public.rollback_value_object_tree_restructure_v1(
      v_owner_user_id,
      v_owner_actor_id,
      v_created_by_actor_id,
      v_operation_2,
      v_key_rollback_2,
      v_rollback_hash_2
    );

    if not exists (
      select 1
      from public.value_objects
      where id = v_a1
        and parent_value_object_id = v_b1
        and root_value_object_id = v_root_b
    ) or not exists (
      select 1
      from public.value_objects
      where id in (v_a2, v_leaf_a)
        and root_value_object_id = v_root_b
      group by root_value_object_id
      having count(*) = 2
    ) then
      raise exception 'P8_RUNTIME_ROLLBACK_2_TREE_STATE_INVALID';
    end if;

    v_rollback_2_replay := public.rollback_value_object_tree_restructure_v1(
      v_owner_user_id,
      v_owner_actor_id,
      v_created_by_actor_id,
      v_operation_2,
      v_key_rollback_2,
      v_rollback_hash_2
    );

    if coalesce((v_rollback_2_replay ->> 'idempotentReplay')::boolean, false) is not true
       or (v_rollback_2_replay ->> 'rollbackOperationId')::uuid
          <> (v_rollback_2 ->> 'rollbackOperationId')::uuid then
      raise exception 'P8_RUNTIME_ROLLBACK_IDEMPOTENCY_INVALID: %',
        v_rollback_2_replay::text;
    end if;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (14, 'newer_operation_rollback_and_replay', true,
       'Tree restored to operation 1 state; rollback replay is idempotent.');

    ---------------------------------------------------------------------------
    -- 16. Roll back the original reparent
    ---------------------------------------------------------------------------
    v_rollback_1 := public.rollback_value_object_tree_restructure_v1(
      v_owner_user_id,
      v_owner_actor_id,
      v_created_by_actor_id,
      v_operation_1,
      v_key_rollback_1,
      v_rollback_hash_1
    );

    if not exists (
      select 1
      from public.value_objects
      where id = v_a1
        and parent_value_object_id = v_root_a
        and root_value_object_id = v_root_a
    ) or not exists (
      select 1
      from public.value_objects
      where id = v_a2
        and parent_value_object_id = v_a1
        and root_value_object_id = v_root_a
    ) or not exists (
      select 1
      from public.value_objects
      where id = v_leaf_a
        and parent_value_object_id = v_a2
        and root_value_object_id = v_root_a
    ) then
      raise exception 'P8_RUNTIME_ROLLBACK_1_TREE_STATE_INVALID';
    end if;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (15, 'original_reparent_rollback_restored_tree', true,
       'Original deep path and root context restored.');

    ---------------------------------------------------------------------------
    -- 17. Insert intermediate around two direct children, including a subtree
    ---------------------------------------------------------------------------
    v_payload := jsonb_build_object(
      'childValueObjectIds', jsonb_build_array(v_leaf_b::text, v_b2::text),
      'title', 'P8 runtime inserted intermediate ' || v_run_token,
      'description', 'Temporary insert-intermediate runtime fixture.',
      'objectKind', 'other'
    );

    v_preview := public.preview_value_object_tree_restructure_v1(
      v_owner_user_id,
      v_owner_actor_id,
      v_b1,
      'insert_intermediate',
      v_payload
    );

    if jsonb_array_length(v_preview -> 'selectedChildren') <> 2
       or jsonb_array_length(v_preview -> 'affectedNodes') <> 3 then
      raise exception 'P8_RUNTIME_INSERT_PREVIEW_SHAPE_INVALID: %', v_preview::text;
    end if;

    v_key_insert := v_prefix || '-insert-intermediate';
    v_request_hash_insert := upper(
      encode(
        extensions.digest(convert_to(v_key_insert || v_payload::text, 'UTF8'), 'sha256'),
        'hex'
      )
    );

    v_insert_apply := public.apply_value_object_tree_restructure_v1(
      v_owner_user_id,
      v_owner_actor_id,
      v_created_by_actor_id,
      v_b1,
      'insert_intermediate',
      v_payload,
      v_preview ->> 'previewHash',
      v_key_insert,
      v_request_hash_insert
    );

    v_insert_operation := (v_insert_apply ->> 'operationId')::uuid;
    v_created_intermediate := (v_insert_apply ->> 'createdValueObjectId')::uuid;

    if not exists (
      select 1
      from public.value_objects
      where id = v_created_intermediate
        and parent_value_object_id = v_b1
        and root_value_object_id = v_root_b
        and node_role_code = 'structural'
        and object_kind = 'other'
    ) or not exists (
      select 1
      from public.value_objects
      where id in (v_leaf_b, v_b2)
        and parent_value_object_id = v_created_intermediate
      group by parent_value_object_id
      having count(*) = 2
    ) or not exists (
      select 1
      from public.value_objects
      where id = v_leaf_b2
        and parent_value_object_id = v_b2
        and root_value_object_id = v_root_b
    ) then
      raise exception 'P8_RUNTIME_INSERT_INTERMEDIATE_TREE_STATE_INVALID';
    end if;

    select count(*)
    into v_count
    from public.value_object_tree_operation_items
    where operation_id = v_insert_operation;

    if v_count <> 4 then
      raise exception 'P8_RUNTIME_INSERT_AUDIT_ITEM_COUNT_INVALID: %', v_count;
    end if;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (16, 'insert_intermediate_applied_atomically', true,
       'New intermediate + 2 selected children + 1 descendant; 4 audit items.');

    ---------------------------------------------------------------------------
    -- 18. Roll back insert-intermediate and delete the P8-created object
    ---------------------------------------------------------------------------
    v_key_rollback_insert := v_prefix || '-rollback-insert';
    v_rollback_hash_insert := upper(
      encode(
        extensions.digest(
          convert_to(v_key_rollback_insert || v_insert_operation::text, 'UTF8'),
          'sha256'
        ),
        'hex'
      )
    );

    v_insert_rollback := public.rollback_value_object_tree_restructure_v1(
      v_owner_user_id,
      v_owner_actor_id,
      v_created_by_actor_id,
      v_insert_operation,
      v_key_rollback_insert,
      v_rollback_hash_insert
    );

    if exists (
      select 1
      from public.value_objects
      where id = v_created_intermediate
    ) or not exists (
      select 1
      from public.value_objects
      where id in (v_leaf_b, v_b2)
        and parent_value_object_id = v_b1
      group by parent_value_object_id
      having count(*) = 2
    ) or not exists (
      select 1
      from public.value_objects
      where id = v_leaf_b2
        and parent_value_object_id = v_b2
        and root_value_object_id = v_root_b
    ) then
      raise exception 'P8_RUNTIME_INSERT_ROLLBACK_TREE_STATE_INVALID';
    end if;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (17, 'insert_intermediate_rollback_restored_children', true,
       'Created intermediate deleted; selected children restored to B1.');

    ---------------------------------------------------------------------------
    -- 19. Explicit cleanup of audit data and all fixture objects
    ---------------------------------------------------------------------------
    delete from public.value_object_tree_operations
    where owner_user_id in (v_owner_user_id, v_foreign_user_id)
      and idempotency_key like v_prefix || '%'
      and operation_type = 'rollback';

    delete from public.value_object_tree_operations
    where owner_user_id in (v_owner_user_id, v_foreign_user_id)
      and idempotency_key like v_prefix || '%';

    delete from public.value_objects where id in (v_leaf_a, v_leaf_b, v_leaf_b2);
    delete from public.value_objects where id in (v_a2, v_b2);
    delete from public.value_objects where id in (v_a1, v_b1);
    delete from public.value_objects where id in (v_root_a, v_root_b, v_root_c, v_foreign_root);

    if exists (
      select 1
      from public.value_object_tree_operations
      where idempotency_key like v_prefix || '%'
    ) or exists (
      select 1
      from public.value_objects
      where metadata_json ->> 'p8_runtime_token' = v_run_token
    ) then
      raise exception 'P8_RUNTIME_CLEANUP_FAILED';
    end if;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (18, 'runtime_fixture_cleanup_zero', true,
       'All temporary Value Objects, operations and operation items removed.');

  exception when others then
    -- PostgreSQL rolls back every change made in the inner block before
    -- entering this handler. Therefore an unexpected failure cannot leave
    -- partial runtime fixtures or audit rows behind.
    get stacked diagnostics
      v_exception_detail = PG_EXCEPTION_DETAIL,
      v_exception_hint = PG_EXCEPTION_HINT,
      v_exception_context = PG_EXCEPTION_CONTEXT;

    insert into p8_runtime_results
      (check_order, check_name, passed, details)
    values
      (
        999,
        'runtime_exception',
        false,
        concat_ws(
          E'\n',
          sqlstate || ': ' || sqlerrm,
          case
            when nullif(v_exception_detail, '') is null then null
            else 'DETAIL: ' || v_exception_detail
          end,
          case
            when nullif(v_exception_hint, '') is null then null
            else 'HINT: ' || v_exception_hint
          end,
          case
            when nullif(v_exception_context, '') is null then null
            else 'CONTEXT: ' || v_exception_context
          end
        )
      );
  end;
end;
$runtime$;

select
  check_order,
  check_name,
  passed,
  details
from p8_runtime_results
order by check_order;
