-- ARCTor
-- Fix PARAMETERIZED system typical activity authoring SQL operator precedence.
-- Root cause:
--   item ->> 'parameterDefinitionId'
--   || '|'
--   || item ->> 'intermediateValueObjectId'
-- may be parsed so that ->> is applied to TEXT.
-- Correct form explicitly parenthesizes both JSON extractions.
--
-- This changes only the stored function definition. No activity/template data
-- is inserted, updated, or deleted.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $repair$
declare
  v_oid oid;
  v_def text;
  v_old text :=
$item_old$item ->> 'parameterDefinitionId'
        || '|'
        || item ->> 'intermediateValueObjectId'$item_old$;
  v_new text :=
$item_new$(item ->> 'parameterDefinitionId')
        || '|'
        || (item ->> 'intermediateValueObjectId')$item_new$;
begin
  v_oid :=
    to_regprocedure(
      'public.save_curator_parameterized_system_typical_activity_v1(uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,jsonb,jsonb)'
    );

  if v_oid is null then
    raise exception using
      errcode = '42883',
      message = 'ARCTOR_PAT_FIX_TARGET_RPC_MISSING';
  end if;

  v_def := pg_get_functiondef(v_oid);

  if position(v_new in v_def) > 0 then
    -- Already fixed: idempotent no-op.
    return;
  end if;

  if position(v_old in v_def) = 0 then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_PAT_FIX_EXPECTED_BUG_FRAGMENT_NOT_FOUND';
  end if;

  if (
    length(v_def) - length(replace(v_def, v_old, ''))
  ) <> length(v_old) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_PAT_FIX_BUG_FRAGMENT_COUNT_NOT_ONE';
  end if;

  v_def := replace(v_def, v_old, v_new);

  execute v_def;
end
$repair$;

notify pgrst, 'reload schema';

commit;

-- Visible postcheck.
select jsonb_pretty(
  jsonb_build_object(
    'contract',
      'ARCTOR_PARAMETERIZED_TEMPLATE_JSON_OPERATOR_FIX_V1',
    'rpcPresent',
      to_regprocedure(
        'public.save_curator_parameterized_system_typical_activity_v1(uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,jsonb,jsonb)'
      ) is not null,
    'serviceRoleExecute',
      has_function_privilege(
        'service_role',
        to_regprocedure(
          'public.save_curator_parameterized_system_typical_activity_v1(uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,jsonb,jsonb)'
        ),
        'EXECUTE'
      ),
    'fixedExpressionPresent',
      position(
        $fixed$(item ->> 'parameterDefinitionId')
        || '|'
        || (item ->> 'intermediateValueObjectId')$fixed$
        in pg_get_functiondef(
          to_regprocedure(
            'public.save_curator_parameterized_system_typical_activity_v1(uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,jsonb,jsonb)'
          )
        )
      ) > 0
  )
) as arctor_parameterized_template_json_operator_fix_postcheck;
