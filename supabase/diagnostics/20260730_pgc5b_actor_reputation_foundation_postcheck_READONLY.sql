with checks as (
  select
    '01_accounts_table_exists'::text as check_code,
    to_regclass('public.actor_reputation_accounts') is not null as passed

  union all

  select
    '02_ledger_table_exists',
    to_regclass('public.actor_reputation_ledger') is not null

  union all

  select
    '03_accounts_columns_exact',
    (
      select count(*) = 6
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'actor_reputation_accounts'
        and column_name in (
          'actor_id',
          'owner_user_id',
          'balance',
          'status',
          'created_at',
          'updated_at'
        )
    )

  union all

  select
    '04_ledger_financial_precision',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'actor_reputation_ledger'
        and column_name = 'points_amount'
        and data_type = 'numeric'
        and numeric_precision = 18
        and numeric_scale = 2
    )
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'actor_reputation_ledger'
        and column_name = 'reputation_amount'
        and data_type = 'bigint'
    )
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'actor_reputation_accounts'
        and column_name = 'balance'
        and data_type = 'bigint'
    )

  union all

  select
    '05_formula_constraint_present',
    exists (
      select 1
      from pg_catalog.pg_constraint constraint_row
      join pg_catalog.pg_class table_row
        on table_row.oid = constraint_row.conrelid
      join pg_catalog.pg_namespace namespace_row
        on namespace_row.oid = table_row.relnamespace
      where namespace_row.nspname = 'public'
        and table_row.relname = 'actor_reputation_ledger'
        and constraint_row.conname =
          'actor_reputation_ledger_formula_check'
        and pg_get_constraintdef(constraint_row.oid)
          ilike '%round((points_amount * (100)%'
    )

  union all

  select
    '06_certificate_order_unique',
    to_regclass(
      'public.actor_reputation_ledger_certificate_order_uidx'
    ) is not null

  union all

  select
    '07_points_transaction_unique',
    to_regclass(
      'public.actor_reputation_ledger_points_transaction_uidx'
    ) is not null

  union all

  select
    '08_rls_enabled',
    coalesce(
      (
        select bool_and(table_row.relrowsecurity)
        from pg_catalog.pg_class table_row
        join pg_catalog.pg_namespace namespace_row
          on namespace_row.oid = table_row.relnamespace
        where namespace_row.nspname = 'public'
          and table_row.relname in (
            'actor_reputation_accounts',
            'actor_reputation_ledger'
          )
      ),
      false
    )

  union all

  select
    '09_only_service_role_select_policies',
    (
      select count(*) = 2
      from pg_catalog.pg_policies policy_row
      where policy_row.schemaname = 'public'
        and policy_row.tablename in (
          'actor_reputation_accounts',
          'actor_reputation_ledger'
        )
        and policy_row.cmd = 'SELECT'
        and policy_row.roles = array['service_role']::name[]
    )

  union all

  select
    '10_no_anon_authenticated_table_privileges',
    not has_table_privilege(
      'anon',
      'public.actor_reputation_accounts',
      'SELECT'
    )
    and not has_table_privilege(
      'anon',
      'public.actor_reputation_accounts',
      'INSERT'
    )
    and not has_table_privilege(
      'anon',
      'public.actor_reputation_accounts',
      'UPDATE'
    )
    and not has_table_privilege(
      'anon',
      'public.actor_reputation_accounts',
      'DELETE'
    )
    and not has_table_privilege(
      'authenticated',
      'public.actor_reputation_accounts',
      'SELECT'
    )
    and not has_table_privilege(
      'authenticated',
      'public.actor_reputation_accounts',
      'INSERT'
    )
    and not has_table_privilege(
      'authenticated',
      'public.actor_reputation_accounts',
      'UPDATE'
    )
    and not has_table_privilege(
      'authenticated',
      'public.actor_reputation_accounts',
      'DELETE'
    )
    and not has_table_privilege(
      'anon',
      'public.actor_reputation_ledger',
      'SELECT'
    )
    and not has_table_privilege(
      'anon',
      'public.actor_reputation_ledger',
      'INSERT'
    )
    and not has_table_privilege(
      'anon',
      'public.actor_reputation_ledger',
      'UPDATE'
    )
    and not has_table_privilege(
      'anon',
      'public.actor_reputation_ledger',
      'DELETE'
    )
    and not has_table_privilege(
      'authenticated',
      'public.actor_reputation_ledger',
      'SELECT'
    )
    and not has_table_privilege(
      'authenticated',
      'public.actor_reputation_ledger',
      'INSERT'
    )
    and not has_table_privilege(
      'authenticated',
      'public.actor_reputation_ledger',
      'UPDATE'
    )
    and not has_table_privilege(
      'authenticated',
      'public.actor_reputation_ledger',
      'DELETE'
    )

  union all

  select
    '11_service_role_read_only_tables',
    has_table_privilege(
      'service_role',
      'public.actor_reputation_accounts',
      'SELECT'
    )
    and not has_table_privilege(
      'service_role',
      'public.actor_reputation_accounts',
      'INSERT'
    )
    and not has_table_privilege(
      'service_role',
      'public.actor_reputation_accounts',
      'UPDATE'
    )
    and not has_table_privilege(
      'service_role',
      'public.actor_reputation_accounts',
      'DELETE'
    )
    and has_table_privilege(
      'service_role',
      'public.actor_reputation_ledger',
      'SELECT'
    )
    and not has_table_privilege(
      'service_role',
      'public.actor_reputation_ledger',
      'INSERT'
    )
    and not has_table_privilege(
      'service_role',
      'public.actor_reputation_ledger',
      'UPDATE'
    )
    and not has_table_privilege(
      'service_role',
      'public.actor_reputation_ledger',
      'DELETE'
    )

  union all

  select
    '12_contract_triggers_present',
    (
      select count(distinct trigger_row.trigger_name) = 3
      from information_schema.triggers trigger_row
      where trigger_row.event_object_schema = 'public'
        and trigger_row.event_object_table in (
          'actor_reputation_accounts',
          'actor_reputation_ledger'
        )
        and trigger_row.trigger_name in (
          'actor_reputation_accounts_contract_trg',
          'actor_reputation_ledger_insert_contract_trg',
          'actor_reputation_ledger_immutable_trg'
        )
    )

  union all

  select
    '13_functions_present',
    (
      select count(*) = 6
      from pg_catalog.pg_proc function_row
      join pg_catalog.pg_namespace namespace_row
        on namespace_row.oid = function_row.pronamespace
      where namespace_row.nspname = 'public'
        and function_row.proname in (
          'enforce_actor_reputation_account_v1',
          'enforce_actor_reputation_ledger_insert_v1',
          'prevent_actor_reputation_ledger_mutation_v1',
          'award_gift_certificate_order_reputation_v1',
          'get_reputation_summary_v1',
          'get_reputation_history_v1'
        )
    )

  union all

  select
    '14_award_function_security_definer',
    exists (
      select 1
      from pg_catalog.pg_proc function_row
      join pg_catalog.pg_namespace namespace_row
        on namespace_row.oid = function_row.pronamespace
      where namespace_row.nspname = 'public'
        and function_row.proname =
          'award_gift_certificate_order_reputation_v1'
        and pg_get_function_identity_arguments(function_row.oid) =
          'p_activity_event_id uuid, p_buyer_user_id uuid, p_points_transaction_id uuid'
        and function_row.prosecdef
    )

  union all

  select
    '15_service_role_function_access',
    has_function_privilege(
      'service_role',
      'public.award_gift_certificate_order_reputation_v1(uuid,uuid,uuid)',
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'public.get_reputation_summary_v1(uuid)',
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'public.get_reputation_history_v1(uuid,integer,integer)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.award_gift_certificate_order_reputation_v1(uuid,uuid,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.award_gift_certificate_order_reputation_v1(uuid,uuid,uuid)',
      'EXECUTE'
    )

  union all

  select
    '16_initial_accounts_empty',
    (
      select count(*) = 0
      from public.actor_reputation_accounts
    )

  union all

  select
    '17_initial_ledger_empty',
    (
      select count(*) = 0
      from public.actor_reputation_ledger
    )

  union all

  select
    '18_existing_certificate_drafts_unchanged',
    (
      select count(*) = 2
      from public.activity_gift_certificate_terms
      where lifecycle_status = 'draft'
        and recipient_user_id is null
        and recipient_actor_id is null
        and public_code is null
        and qr_token_hash is null
        and ordered_at is null
    )
)
select
  check_code,
  passed
from checks
order by check_code;
