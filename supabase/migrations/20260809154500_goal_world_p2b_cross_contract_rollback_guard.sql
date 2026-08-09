/*
ARCTor.app — Goal World Constructor
P2B hotfix: block legacy P8 rollback of P2B semantic operations
9 Aug 2026

WHY
The P2B ledger trigger originally protected rows whose NEW.contract_version
was already P2B_SEMANTIC_TREE_V1. A legacy P8 rollback creates its own rollback
row with the default P8_TREE_V1 contract, so it could target an applied P2B
operation without entering the P2B controlled-flow context.

FIX
If a rollback row references a P2B operation, the rollback itself must also be
P2B_SEMANTIC_TREE_V1 and must run inside arctor.p2b_tree_contract context.

This hotfix is intentionally separate from the already-applied P2B migration.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
begin
  if to_regclass('public.value_object_tree_operations') is null then
    raise exception using
      errcode='42P01',
      message='P2B_HOTFIX_OPERATION_TABLE_MISSING';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='value_object_tree_operations'
      and column_name='contract_version'
  ) then
    raise exception using
      errcode='42703',
      message='P2B_HOTFIX_CONTRACT_VERSION_MISSING';
  end if;

  if to_regprocedure(
    'public.preview_value_object_tree_restructure_v2(uuid,uuid,uuid,text,jsonb)'
  ) is null
     or to_regprocedure(
       'public.apply_value_object_tree_restructure_v2(uuid,uuid,uuid,uuid,text,jsonb,text,text,text)'
     ) is null
     or to_regprocedure(
       'public.rollback_value_object_tree_restructure_v2(uuid,uuid,uuid,uuid,text,text)'
     ) is null then
    raise exception using
      errcode='42883',
      message='P2B_HOTFIX_P2B_SCHEMA_NOT_INSTALLED';
  end if;

  if (select count(*) from public.value_object_tree_operations) <> 0
     or (select count(*) from public.value_object_tree_operation_items) <> 0 then
    raise exception using
      errcode='23514',
      message='P2B_HOTFIX_REQUIRES_EMPTY_OPERATION_LEDGER';
  end if;
end;
$preflight$;

create or replace function public.enforce_value_object_tree_operation_p2b_contract_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_rollback_target_contract text;
begin
  /*
  Once an operation is P2B, its contract identity cannot be rewritten.
  */
  if tg_op='UPDATE'
     and old.contract_version='P2B_SEMANTIC_TREE_V1'
     and new.contract_version is distinct from old.contract_version then
    raise exception using
      errcode='23514',
      message='P2B_OPERATION_CONTRACT_IMMUTABLE';
  end if;

  /*
  Cross-contract rollback guard.

  A legacy P8 rollback row has contract_version=P8_TREE_V1 by default.
  If it points at an original P2B operation, reject it before the legacy P8
  function can mutate the tree.
  */
  if new.operation_type='rollback'
     and new.rollback_of_operation_id is not null then

    select original.contract_version
    into v_rollback_target_contract
    from public.value_object_tree_operations original
    where original.id=new.rollback_of_operation_id;

    if v_rollback_target_contract='P2B_SEMANTIC_TREE_V1'
       and (
         new.contract_version is distinct from 'P2B_SEMANTIC_TREE_V1'
         or current_setting('arctor.p2b_tree_contract',true)
              is distinct from 'P2B_SEMANTIC_TREE_V1'
       ) then
      raise exception using
        errcode='42501',
        message='P2B_LEGACY_ROLLBACK_OF_SEMANTIC_OPERATION_FORBIDDEN';
    end if;
  end if;

  /*
  All P2B operation rows still require the P2B controlled-flow context.
  */
  if new.contract_version='P2B_SEMANTIC_TREE_V1'
     and current_setting('arctor.p2b_tree_contract',true)
           is distinct from 'P2B_SEMANTIC_TREE_V1' then
    raise exception using
      errcode='42501',
      message='P2B_OPERATION_REQUIRES_P2B_CONTROLLED_FLOW';
  end if;

  return new;
end;
$function$;

comment on function public.enforce_value_object_tree_operation_p2b_contract_v1()
is
  'P2B shared-ledger guard. P2B rows require P2B context; legacy P8 rollback cannot target a P2B semantic operation.';

/*
Focused transactional self-test of the ledger guard.
No test row survives the transaction.
*/
do $selftest$
declare
  v_owner_user_id uuid;
  v_owner_actor_id uuid;
  v_target_id uuid;
  v_original_operation_id uuid;
  v_guard_blocked boolean := false;
begin
  select
    value_object.owner_user_id,
    value_object.owner_actor_id,
    value_object.id
  into
    v_owner_user_id,
    v_owner_actor_id,
    v_target_id
  from public.value_objects value_object
  join public.actor_public_profiles profile
    on profile.owner_user_id=value_object.owner_user_id
   and profile.actor_id=value_object.owner_actor_id
  join public.actors actor
    on actor.id=value_object.owner_actor_id
   and actor.status='active'
  where value_object.canonical_key is not null
    and value_object.ontology_node_role_code in ('root','intermediate','leaf')
  order by value_object.id
  limit 1;

  if v_target_id is null then
    raise exception using
      errcode='P0002',
      message='P2B_HOTFIX_SELFTEST_TARGET_NOT_FOUND';
  end if;

  perform set_config(
    'arctor.p2b_tree_contract',
    'P2B_SEMANTIC_TREE_V1',
    true
  );

  insert into public.value_object_tree_operations (
    owner_user_id,
    owner_actor_id,
    created_by_actor_id,
    operation_type,
    contract_version,
    status,
    target_value_object_id,
    target_value_object_id_snapshot,
    idempotency_key,
    request_hash,
    preview_hash,
    request_payload,
    before_snapshot
  )
  values (
    v_owner_user_id,
    v_owner_actor_id,
    v_owner_actor_id,
    'reparent',
    'P2B_SEMANTIC_TREE_V1',
    'applied',
    v_target_id,
    v_target_id,
    'p2b-hotfix-selftest-original',
    repeat('A',64),
    repeat('B',64),
    '{}'::jsonb,
    '{}'::jsonb
  )
  returning id into v_original_operation_id;

  perform set_config(
    'arctor.p2b_tree_contract',
    '',
    true
  );

  begin
    insert into public.value_object_tree_operations (
      owner_user_id,
      owner_actor_id,
      created_by_actor_id,
      operation_type,
      contract_version,
      status,
      target_value_object_id,
      target_value_object_id_snapshot,
      rollback_of_operation_id,
      idempotency_key,
      request_hash,
      preview_hash,
      request_payload,
      before_snapshot
    )
    values (
      v_owner_user_id,
      v_owner_actor_id,
      v_owner_actor_id,
      'rollback',
      'P8_TREE_V1',
      'applying',
      v_target_id,
      v_target_id,
      v_original_operation_id,
      'p2b-hotfix-selftest-legacy-rollback',
      repeat('C',64),
      repeat('D',64),
      '{}'::jsonb,
      '{}'::jsonb
    );

  exception
    when sqlstate '42501' then
      if sqlerrm='P2B_LEGACY_ROLLBACK_OF_SEMANTIC_OPERATION_FORBIDDEN' then
        v_guard_blocked := true;
      else
        raise;
      end if;
  end;

  if not v_guard_blocked then
    raise exception using
      errcode='23514',
      message='P2B_HOTFIX_SELFTEST_GUARD_DID_NOT_BLOCK_LEGACY_ROLLBACK';
  end if;

  /*
  Remove the temporary original P2B operation before commit.
  DELETE is not blocked by the INSERT/UPDATE trigger.
  */
  delete from public.value_object_tree_operations
  where id=v_original_operation_id;

  if (select count(*) from public.value_object_tree_operations) <> 0
     or (select count(*) from public.value_object_tree_operation_items) <> 0 then
    raise exception using
      errcode='23514',
      message='P2B_HOTFIX_SELFTEST_LEDGER_NOT_CLEAN';
  end if;
end;
$selftest$;

commit;

/*
Visible postcheck result for Supabase SQL Editor.
Expected: all TRUE and operation counts 0.
*/
select
  to_regprocedure(
    'public.enforce_value_object_tree_operation_p2b_contract_v1()'
  ) is not null as guard_function_exists,

  position(
    'P2B_LEGACY_ROLLBACK_OF_SEMANTIC_OPERATION_FORBIDDEN'
    in pg_get_functiondef(
      'public.enforce_value_object_tree_operation_p2b_contract_v1()'::regprocedure
    )
  ) > 0 as cross_contract_guard_present,

  exists (
    select 1
    from pg_trigger
    where tgrelid='public.value_object_tree_operations'::regclass
      and tgname='value_object_tree_operations_p2b_contract_trg'
      and not tgisinternal
  ) as guard_trigger_present,

  (select count(*) from public.value_object_tree_operations)=0
    as operation_ledger_clean,

  (select count(*) from public.value_object_tree_operation_items)=0
    as operation_items_clean;
