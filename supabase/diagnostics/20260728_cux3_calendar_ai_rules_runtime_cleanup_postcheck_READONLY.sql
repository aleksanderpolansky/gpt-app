-- ARCTor.app CUX3 runtime cleanup postcheck.
-- Read-only.
--
-- Verifies:
-- 1. the temporary diagnostic helper function was removed;
-- 2. no runtimeAcceptance preference fixture remains;
-- 3. no orphan revision rows remain.

select *
from (
  values
    (
      1,
      '01_runtime_helper_removed',
      to_regprocedure('public.cux3_runtime_acceptance_v2()') is null,
      jsonb_build_object(
        'function',
        'public.cux3_runtime_acceptance_v2()'
      )
    ),
    (
      2,
      '02_runtime_preference_residuals_zero',
      (
        select count(*)
        from public.calendar_ai_rule_preferences preference
        where preference.metadata_json @> '{"runtimeAcceptance":true}'::jsonb
      ) = 0,
      jsonb_build_object(
        'residualCount',
        (
          select count(*)
          from public.calendar_ai_rule_preferences preference
          where preference.metadata_json @> '{"runtimeAcceptance":true}'::jsonb
        )
      )
    ),
    (
      3,
      '03_orphan_revisions_zero',
      (
        select count(*)
        from public.calendar_ai_rule_revisions revision
        left join public.calendar_ai_rule_preferences preference
          on preference.id = revision.preference_id
        where preference.id is null
      ) = 0,
      jsonb_build_object(
        'residualCount',
        (
          select count(*)
          from public.calendar_ai_rule_revisions revision
          left join public.calendar_ai_rule_preferences preference
            on preference.id = revision.preference_id
          where preference.id is null
        )
      )
    )
) checks(check_no, check_code, passed, detail)
order by check_no;
