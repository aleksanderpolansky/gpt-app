begin;

create or replace function public.materialize_published_formula_rule_calculation_model_f1_v1(
  p_rule_version_id uuid,
  p_title text default null,
  p_description text default null,
  p_category_code text default 'general'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule_version public.activity_fact_calculation_rule_versions_v1%rowtype;
  v_rule_series public.activity_fact_calculation_rule_series_v1%rowtype;
  v_target_param public.value_object_parameter_definitions%rowtype;
  v_model_series_id uuid;
  v_model_version_id uuid;
  v_supersedes_model_version_id uuid;
  v_model_code text;
  v_visibility text;
  v_inputs jsonb := '[]'::jsonb;
  v_input jsonb;
  v_param public.value_object_parameter_definitions%rowtype;
  v_value_type text;
  v_output_value_type text;
  v_evidence jsonb;
  v_applicability jsonb;
  v_existing_source_rule_version_id text;
begin
  select *
  into v_rule_version
  from public.activity_fact_calculation_rule_versions_v1
  where id = p_rule_version_id
  for update;

  if not found then
    raise exception 'CALCULATION_MODEL_BRIDGE_RULE_VERSION_NOT_FOUND';
  end if;

  if v_rule_version.status_code <> 'published' then
    raise exception 'CALCULATION_MODEL_BRIDGE_RULE_VERSION_NOT_PUBLISHED';
  end if;

  if v_rule_version.expression_language_code <> 'arctor_formula_v1' then
    raise exception 'CALCULATION_MODEL_BRIDGE_EXPRESSION_LANGUAGE_INVALID';
  end if;

  if v_rule_version.calculation_model_version_id is not null then
    return jsonb_build_object(
      'contract', 'ARCTOR_FORMULA_RULE_TO_CALCULATION_MODEL_BRIDGE_V1',
      'duplicate', true,
      'ruleVersionId', v_rule_version.id,
      'calculationModelVersionId', v_rule_version.calculation_model_version_id
    );
  end if;

  select *
  into v_rule_series
  from public.activity_fact_calculation_rule_series_v1
  where id = v_rule_version.rule_series_id;

  if not found then
    raise exception 'CALCULATION_MODEL_BRIDGE_RULE_SERIES_NOT_FOUND';
  end if;

  select *
  into v_target_param
  from public.value_object_parameter_definitions
  where id = v_rule_series.target_parameter_definition_id
    and status = 'active';

  if not found then
    raise exception 'CALCULATION_MODEL_BRIDGE_TARGET_PARAMETER_NOT_ACTIVE';
  end if;

  for v_input in
    select value
    from jsonb_array_elements(v_rule_version.input_contract_json)
  loop
    if nullif(btrim(v_input ->> 'parameterDefinitionId'), '') is null then
      raise exception 'CALCULATION_MODEL_BRIDGE_INPUT_PARAMETER_REQUIRED_V1';
    end if;

    select *
    into v_param
    from public.value_object_parameter_definitions
    where id = (v_input ->> 'parameterDefinitionId')::uuid
      and status = 'active';

    if not found then
      raise exception 'CALCULATION_MODEL_BRIDGE_INPUT_PARAMETER_NOT_ACTIVE';
    end if;

    v_value_type :=
      case v_param.value_type_code
        when 'numeric' then 'number'
        when 'number' then 'number'
        when 'integer' then 'integer'
        when 'boolean' then 'boolean'
        when 'text' then 'text'
        else null
      end;

    if v_value_type is null then
      raise exception 'CALCULATION_MODEL_BRIDGE_INPUT_VALUE_TYPE_UNSUPPORTED:%',
        v_param.value_type_code;
    end if;

    v_inputs :=
      v_inputs ||
      jsonb_build_array(
        jsonb_build_object(
          'key', v_input ->> 'key',
          'title', null,
          'description',
            concat(
              'Source selector kind: ',
              coalesce(v_input ->> 'kind', 'unknown')
            ),
          'valueType', v_value_type,
          'unitCode', nullif(v_param.canonical_unit_code, ''),
          'required', coalesce((v_input ->> 'required')::boolean, false)
        )
      );
  end loop;

  v_output_value_type :=
    case v_target_param.value_type_code
      when 'numeric' then 'number'
      when 'number' then 'number'
      when 'integer' then 'integer'
      when 'boolean' then 'boolean'
      when 'text' then 'text'
      else null
    end;

  if v_output_value_type is null then
    raise exception 'CALCULATION_MODEL_BRIDGE_OUTPUT_VALUE_TYPE_UNSUPPORTED:%',
      v_target_param.value_type_code;
  end if;

  v_model_code := 'rule.' || v_rule_series.id::text;

  v_visibility :=
    case v_rule_series.scope_code
      when 'system' then 'public'
      when 'organization' then 'shared'
      else 'private'
    end;

  insert into public.calculation_model_series_v1(
    model_code,
    scope_code,
    owner_user_id,
    owner_actor_id,
    organization_id,
    title,
    description,
    category_code,
    visibility_code,
    status_code,
    metadata_json
  )
  values(
    v_model_code,
    v_rule_series.scope_code,
    v_rule_series.owner_user_id,
    v_rule_series.owner_actor_id,
    v_rule_series.organization_id,
    coalesce(
      nullif(btrim(p_title), ''),
      nullif(v_rule_series.metadata_json ->> 'calculationModelTitle', ''),
      v_rule_series.rule_code
    ),
    coalesce(
      nullif(btrim(p_description), ''),
      nullif(v_rule_series.metadata_json ->> 'calculationModelDescription', '')
    ),
    coalesce(nullif(btrim(p_category_code), ''), 'general'),
    v_visibility,
    'active',
    jsonb_build_object(
      'bridgeContract', 'ARCTOR_FORMULA_RULE_TO_CALCULATION_MODEL_BRIDGE_V1',
      'sourceRuleSeriesId', v_rule_series.id,
      'sourceRuleCode', v_rule_series.rule_code
    )
  )
  on conflict (model_code) do nothing;

  select id
  into v_model_series_id
  from public.calculation_model_series_v1
  where model_code = v_model_code;

  if v_model_series_id is null then
    raise exception 'CALCULATION_MODEL_BRIDGE_MODEL_SERIES_NOT_RESOLVED';
  end if;

  if v_rule_version.supersedes_rule_version_id is not null then
    select calculation_model_version_id
    into v_supersedes_model_version_id
    from public.activity_fact_calculation_rule_versions_v1
    where id = v_rule_version.supersedes_rule_version_id;
  end if;

  v_evidence :=
    jsonb_build_object(
      'source', 'formula_rule_governance',
      'testEvidence', v_rule_version.metadata_json -> 'testEvidence',
      'publishAudit', v_rule_version.metadata_json -> 'publishAudit',
      'formulaFingerprint',
        coalesce(
          v_rule_version.metadata_json #>> '{publishAudit,formulaFingerprint}',
          v_rule_version.metadata_json #>> '{testEvidence,formulaFingerprint}'
        )
    );

  v_applicability :=
    jsonb_build_object(
      'sourceRuleSeriesId', v_rule_series.id,
      'sourceRuleVersionId', v_rule_version.id,
      'activityTemplateId', v_rule_series.activity_template_id,
      'impactProfileId', v_rule_series.impact_profile_id,
      'sourceValueObjectId', v_rule_series.source_value_object_id,
      'sourceParameterDefinitionId', v_rule_series.source_parameter_definition_id,
      'targetValueObjectId', v_rule_series.target_value_object_id,
      'targetParameterDefinitionId', v_rule_series.target_parameter_definition_id,
      'condition', v_rule_version.condition_contract_json,
      'triggers', v_rule_version.trigger_contract_json,
      'resultFactRole', v_rule_version.result_fact_role_code,
      'missingInputPolicy', v_rule_version.missing_input_policy_code
    );

  insert into public.calculation_model_versions_v1(
    model_series_id,
    version_no,
    expression_language_code,
    input_contract_json,
    expression_contract_json,
    output_contract_json,
    applicability_contract_json,
    evidence_contract_json,
    status_code,
    supersedes_model_version_id,
    published_at,
    valid_from,
    metadata_json
  )
  values(
    v_model_series_id,
    v_rule_version.version_no,
    'arctor_formula_v1',
    v_inputs,
    v_rule_version.expression_contract_json,
    jsonb_build_object(
      'valueType', v_output_value_type,
      'unitCode', nullif(v_target_param.canonical_unit_code, ''),
      'title', null,
      'description', null
    ),
    v_applicability,
    v_evidence,
    'published',
    v_supersedes_model_version_id,
    v_rule_version.published_at,
    v_rule_version.valid_from,
    jsonb_build_object(
      'bridgeContract', 'ARCTOR_FORMULA_RULE_TO_CALCULATION_MODEL_BRIDGE_V1',
      'sourceRuleSeriesId', v_rule_series.id,
      'sourceRuleVersionId', v_rule_version.id,
      'sourceRuleCode', v_rule_series.rule_code
    )
  )
  on conflict (model_series_id, version_no) do nothing;

  select id, metadata_json ->> 'sourceRuleVersionId'
  into v_model_version_id, v_existing_source_rule_version_id
  from public.calculation_model_versions_v1
  where model_series_id = v_model_series_id
    and version_no = v_rule_version.version_no;

  if v_model_version_id is null then
    raise exception 'CALCULATION_MODEL_BRIDGE_MODEL_VERSION_NOT_RESOLVED';
  end if;

  if v_existing_source_rule_version_id is distinct from v_rule_version.id::text then
    raise exception 'CALCULATION_MODEL_BRIDGE_MODEL_VERSION_SOURCE_CONFLICT';
  end if;

  update public.activity_fact_calculation_rule_versions_v1
  set calculation_model_version_id = v_model_version_id
  where id = v_rule_version.id
    and calculation_model_version_id is null;

  return jsonb_build_object(
    'contract', 'ARCTOR_FORMULA_RULE_TO_CALCULATION_MODEL_BRIDGE_V1',
    'duplicate', false,
    'ruleSeriesId', v_rule_series.id,
    'ruleVersionId', v_rule_version.id,
    'calculationModelSeriesId', v_model_series_id,
    'calculationModelVersionId', v_model_version_id,
    'modelCode', v_model_code,
    'modelVersionNo', v_rule_version.version_no
  );
end;
$$;

revoke all on function
  public.materialize_published_formula_rule_calculation_model_f1_v1(
    uuid, text, text, text
  )
from public, anon, authenticated;

grant execute on function
  public.materialize_published_formula_rule_calculation_model_f1_v1(
    uuid, text, text, text
  )
to service_role;

commit;

notify pgrst, 'reload schema';

select jsonb_pretty(
  jsonb_build_object(
    'contract', 'ARCTOR_FORMULA_RULE_TO_CALCULATION_MODEL_BRIDGE_V1',
    'rpcPresent',
      to_regprocedure(
        'public.materialize_published_formula_rule_calculation_model_f1_v1(uuid,text,text,text)'
      ) is not null,
    'catalogSeriesPresent',
      to_regclass('public.calculation_model_series_v1') is not null,
    'catalogVersionsPresent',
      to_regclass('public.calculation_model_versions_v1') is not null,
    'ruleLinkColumnPresent',
      exists(
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'activity_fact_calculation_rule_versions_v1'
          and column_name = 'calculation_model_version_id'
      )
  )
) as arctor_f1_formula_catalog_bridge_postcheck;