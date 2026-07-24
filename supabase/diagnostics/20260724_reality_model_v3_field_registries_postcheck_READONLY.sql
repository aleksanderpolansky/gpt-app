-- ARCTor.app Reality Model v3 / P5 field registries postcheck
-- SELECT-only. Every row should return ok = true after migration apply.

with checks as (
  select '01_value_objects_exists'::text as check_code,
         to_regclass('public.value_objects') is not null as ok
  union all
  select '02_value_objects_v3_columns',
         not exists (
           select 1
           from (values
             ('valid_from'),
             ('valid_to'),
             ('privacy_level'),
             ('sensitivity_level'),
             ('identity_attributes_json'),
             ('metadata_json')
           ) required(column_name)
           left join information_schema.columns columns
             on columns.table_schema = 'public'
            and columns.table_name = 'value_objects'
            and columns.column_name = required.column_name
           where columns.column_name is null
         )
  union all
  select '03_attribute_registry_exists',
         to_regclass('public.value_object_attribute_registry') is not null
  union all
  select '04_criterion_types_exists',
         to_regclass('public.value_object_criterion_types') is not null
  union all
  select '05_criterion_comparators_exists',
         to_regclass('public.value_object_criterion_comparators') is not null
  union all
  select '06_relation_types_exists',
         to_regclass('public.value_object_relation_types') is not null
  union all
  select '07_target_kinds_exists',
         to_regclass('public.value_object_target_kinds') is not null
  union all
  select '08_normalization_policies_exists',
         to_regclass('public.value_object_normalization_policies') is not null
  union all
  select '09_profile_attributes_exists',
         to_regclass('public.value_object_profile_attributes') is not null
  union all
  select '10_outcome_criteria_exists',
         to_regclass('public.value_object_outcome_criteria') is not null
  union all
  select '11_criterion_type_seed_count',
         (select count(*) >= 2 from public.value_object_criterion_types)
  union all
  select '12_comparator_seed_count',
         (select count(*) >= 8 from public.value_object_criterion_comparators)
  union all
  select '13_relation_type_seed_count',
         (select count(*) >= 9 from public.value_object_relation_types)
  union all
  select '14_target_kind_seed_count',
         (select count(*) >= 8 from public.value_object_target_kinds)
  union all
  select '15_normalization_policy_seed_count',
         (select count(*) >= 4 from public.value_object_normalization_policies)
  union all
  select '16_child_owner_function_exists',
         to_regprocedure('public.enforce_value_object_child_owner_alignment_v3()') is not null
  union all
  select '17_attribute_contract_function_exists',
         to_regprocedure('public.enforce_value_object_profile_attribute_contract_v3()') is not null
  union all
  select '18_updated_at_function_exists',
         to_regprocedure('public.set_reality_model_v3_updated_at()') is not null
  union all
  select '19_profile_attribute_contract_trigger',
         exists (
           select 1 from pg_trigger
           where tgname = 'value_object_profile_attributes_contract_v3_trg'
             and tgrelid = 'public.value_object_profile_attributes'::regclass
             and not tgisinternal
         )
  union all
  select '20_profile_attribute_owner_trigger',
         exists (
           select 1 from pg_trigger
           where tgname = 'value_object_profile_attributes_owner_v3_trg'
             and tgrelid = 'public.value_object_profile_attributes'::regclass
             and not tgisinternal
         )
  union all
  select '21_outcome_criteria_owner_trigger',
         exists (
           select 1 from pg_trigger
           where tgname = 'value_object_outcome_criteria_owner_v3_trg'
             and tgrelid = 'public.value_object_outcome_criteria'::regclass
             and not tgisinternal
         )
  union all
  select '22_all_p5_tables_rls_enabled',
         not exists (
           select 1
           from (values
             ('value_object_attribute_registry'),
             ('value_object_criterion_types'),
             ('value_object_criterion_comparators'),
             ('value_object_relation_types'),
             ('value_object_target_kinds'),
             ('value_object_normalization_policies'),
             ('value_object_profile_attributes'),
             ('value_object_outcome_criteria')
           ) required(table_name)
           left join pg_tables tables
             on tables.schemaname = 'public'
            and tables.tablename = required.table_name
           where tables.tablename is null or tables.rowsecurity is distinct from true
         )
  union all
  select '23_registry_select_policies_present',
         (select count(*) = 6
          from pg_policies
          where schemaname = 'public'
            and policyname in (
              'value_object_attribute_registry_read_all_v3',
              'value_object_criterion_types_read_all_v3',
              'value_object_criterion_comparators_read_all_v3',
              'value_object_relation_types_read_all_v3',
              'value_object_target_kinds_read_all_v3',
              'value_object_normalization_policies_read_all_v3'
            ))
  union all
  select '24_child_no_direct_client_policies_present',
         (select count(*) = 2
          from pg_policies
          where schemaname = 'public'
            and policyname in (
              'value_object_profile_attributes_no_direct_client_v3',
              'value_object_outcome_criteria_no_direct_client_v3'
            ))
  union all
  select '25_boolean_criterion_shape_constraint_present',
         exists (
           select 1
           from pg_constraint
           where conrelid = 'public.value_object_outcome_criteria'::regclass
             and conname = 'value_object_outcome_criteria_shape_v3_check'
         )
  union all
  select '26_value_object_v3_constraints_present',
         (
           select count(*) >= 5
           from pg_constraint
           where conrelid = 'public.value_objects'::regclass
             and conname in (
               'value_objects_valid_interval_v3_check',
               'value_objects_privacy_level_v3_check',
               'value_objects_sensitivity_level_v3_check',
               'value_objects_identity_attributes_json_v3_check',
               'value_objects_metadata_json_v3_check'
             )
         )
  union all
  select '27_no_direct_child_table_grants',
         not has_table_privilege('anon', 'public.value_object_profile_attributes', 'INSERT')
         and not has_table_privilege('anon', 'public.value_object_outcome_criteria', 'INSERT')
         and not has_table_privilege('authenticated', 'public.value_object_profile_attributes', 'INSERT')
         and not has_table_privilege('authenticated', 'public.value_object_outcome_criteria', 'INSERT')
  union all
  select '28_updated_at_triggers_present',
         (
           select count(*) = 8
           from pg_trigger
           where tgname in (
             'value_object_attribute_registry_updated_at_v3_trg',
             'value_object_criterion_types_updated_at_v3_trg',
             'value_object_criterion_comparators_updated_at_v3_trg',
             'value_object_relation_types_updated_at_v3_trg',
             'value_object_target_kinds_updated_at_v3_trg',
             'value_object_normalization_policies_updated_at_v3_trg',
             'value_object_profile_attributes_updated_at_v3_trg',
             'value_object_outcome_criteria_updated_at_v3_trg'
           )
             and not tgisinternal
         )
)
select check_code, ok
from checks
order by check_code;

select
  relation_type_code,
  directionality_code,
  from_scope_code,
  to_scope_code,
  status
from public.value_object_relation_types
order by display_order;

select
  target_kind_code,
  numeric_shape_code,
  period_policy_code,
  default_normalization_policy_code,
  status
from public.value_object_target_kinds
order by display_order;

select
  normalization_policy_code,
  requires_period,
  formula_version,
  status
from public.value_object_normalization_policies
order by display_order;
