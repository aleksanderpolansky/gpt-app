-- ARCTor.app CUX3 runtime acceptance V2.
-- Recovery for SQL editors that do not preserve temporary tables
-- across statements/connections.
--
-- This script creates one temporary diagnostic helper function in public,
-- executes all fixture writes and cleanup inside a single function call,
-- and returns the result table.
--
-- The fixture preference is created only for an owner/locale pair that
-- does not already exist. The preference and its revision history are
-- deleted before the function returns.
--
-- After successful 11/11 acceptance, run the separate helper cleanup:
-- drop function if exists public.cux3_runtime_acceptance_v2();

create or replace function public.cux3_runtime_acceptance_v2()
returns table (
  check_no integer,
  check_code text,
  passed boolean,
  detail jsonb
)
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  v_owner_user_id uuid;
  v_actor_id uuid;
  v_other_actor_id uuid;
  v_locale text;
  v_preference_id uuid;
  v_version_1 integer;
  v_version_2 integer;
  v_version_3 integer;
  v_history_count integer;
  v_residual_before integer;
  v_residual_after integer;
  v_rejected boolean := false;
  v_message text := '';
begin
  select count(*)
  into v_residual_before
  from public.calendar_ai_rule_preferences preference
  where preference.metadata_json @> '{"runtimeAcceptance":true}'::jsonb;

  if v_residual_before > 0 then
    return query
    select *
    from (
      values
        (
          1,
          '01_owned_actor_and_clean_fixture_slot',
          false,
          jsonb_build_object(
            'reason',
            'previous runtimeAcceptance fixture residue exists',
            'residualCount',
            v_residual_before
          )
        ),
        (2, '02_custom_rule_insert', false, jsonb_build_object('blockedBy', 1)),
        (3, '03_initial_version', false, jsonb_build_object('blockedBy', 1)),
        (4, '04_initial_revision_written', false, jsonb_build_object('blockedBy', 1)),
        (5, '05_update_increments_version', false, jsonb_build_object('blockedBy', 1)),
        (6, '06_updated_revision_written', false, jsonb_build_object('blockedBy', 1)),
        (7, '07_restore_default', false, jsonb_build_object('blockedBy', 1)),
        (8, '08_restore_increments_version', false, jsonb_build_object('blockedBy', 1)),
        (9, '09_restore_revision_written', false, jsonb_build_object('blockedBy', 1)),
        (10, '10_cross_owner_actor_rejected', false, jsonb_build_object('blockedBy', 1)),
        (11, '11_fixture_cleanup', false, jsonb_build_object('blockedBy', 1))
    ) result(check_no, check_code, passed, detail);

    return;
  end if;

  select
    profile.owner_user_id,
    profile.actor_id,
    locale_candidate.locale
  into
    v_owner_user_id,
    v_actor_id,
    v_locale
  from public.actor_public_profiles profile
  join public.actors actor
    on actor.id = profile.actor_id
   and actor.status = 'active'
  cross join lateral (
    select candidate.locale
    from unnest(array['cs', 'uk', 'es', 'de', 'pl', 'ru', 'en']::text[])
      with ordinality as candidate(locale, priority)
    where not exists (
      select 1
      from public.calendar_ai_rule_preferences existing
      where existing.owner_user_id = profile.owner_user_id
        and existing.locale = candidate.locale
    )
    order by candidate.priority
    limit 1
  ) locale_candidate
  order by profile.created_at, profile.actor_id
  limit 1;

  check_no := 1;
  check_code := '01_owned_actor_and_clean_fixture_slot';
  passed :=
    v_owner_user_id is not null
    and v_actor_id is not null
    and v_locale is not null
    and v_residual_before = 0;
  detail := jsonb_build_object(
    'ownerUserId',
    v_owner_user_id,
    'actorId',
    v_actor_id,
    'locale',
    v_locale,
    'residualBefore',
    v_residual_before
  );
  return next;

  if not passed then
    return query
    select *
    from (
      values
        (2, '02_custom_rule_insert', false, jsonb_build_object('blockedBy', 1)),
        (3, '03_initial_version', false, jsonb_build_object('blockedBy', 1)),
        (4, '04_initial_revision_written', false, jsonb_build_object('blockedBy', 1)),
        (5, '05_update_increments_version', false, jsonb_build_object('blockedBy', 1)),
        (6, '06_updated_revision_written', false, jsonb_build_object('blockedBy', 1)),
        (7, '07_restore_default', false, jsonb_build_object('blockedBy', 1)),
        (8, '08_restore_increments_version', false, jsonb_build_object('blockedBy', 1)),
        (9, '09_restore_revision_written', false, jsonb_build_object('blockedBy', 1)),
        (10, '10_cross_owner_actor_rejected', false, jsonb_build_object('blockedBy', 1)),
        (11, '11_fixture_cleanup', true, jsonb_build_object('nothingCreated', true))
    ) result(check_no, check_code, passed, detail);

    return;
  end if;

  insert into public.calendar_ai_rule_preferences (
    owner_user_id,
    locale,
    custom_rule_text,
    updated_by_actor_id,
    metadata_json
  )
  values (
    v_owner_user_id,
    v_locale,
    'WHEN "cux3 fixture" => TITLE "Fixture"; NEXT Sunday 09:00-12:00',
    v_actor_id,
    jsonb_build_object(
      'runtimeAcceptance',
      true,
      'runtimeAcceptanceVersion',
      2
    )
  )
  returning id, rule_version
  into v_preference_id, v_version_1;

  check_no := 2;
  check_code := '02_custom_rule_insert';
  passed := v_preference_id is not null;
  detail := jsonb_build_object(
    'preferenceId',
    v_preference_id,
    'locale',
    v_locale
  );
  return next;

  check_no := 3;
  check_code := '03_initial_version';
  passed := v_version_1 = 1;
  detail := jsonb_build_object('version', v_version_1);
  return next;

  select count(*)
  into v_history_count
  from public.calendar_ai_rule_revisions revision
  where revision.preference_id = v_preference_id
    and revision.rule_version = v_version_1
    and revision.action_code = 'save_custom';

  check_no := 4;
  check_code := '04_initial_revision_written';
  passed := v_history_count = 1;
  detail := jsonb_build_object('count', v_history_count);
  return next;

  update public.calendar_ai_rule_preferences preference
  set
    custom_rule_text =
      'WHEN "cux3 fixture" => TITLE "Fixture v2"; NEXT Sunday 10:00-12:00',
    updated_by_actor_id = v_actor_id
  where preference.id = v_preference_id
  returning preference.rule_version
  into v_version_2;

  check_no := 5;
  check_code := '05_update_increments_version';
  passed := v_version_2 = v_version_1 + 1;
  detail := jsonb_build_object(
    'before',
    v_version_1,
    'after',
    v_version_2
  );
  return next;

  select count(*)
  into v_history_count
  from public.calendar_ai_rule_revisions revision
  where revision.preference_id = v_preference_id
    and revision.rule_version = v_version_2
    and revision.action_code = 'save_custom';

  check_no := 6;
  check_code := '06_updated_revision_written';
  passed := v_history_count = 1;
  detail := jsonb_build_object('count', v_history_count);
  return next;

  update public.calendar_ai_rule_preferences preference
  set
    custom_rule_text = null,
    updated_by_actor_id = v_actor_id
  where preference.id = v_preference_id
  returning preference.rule_version
  into v_version_3;

  check_no := 7;
  check_code := '07_restore_default';
  passed := exists (
    select 1
    from public.calendar_ai_rule_preferences preference
    where preference.id = v_preference_id
      and preference.custom_rule_text is null
  );
  detail := '{}'::jsonb;
  return next;

  check_no := 8;
  check_code := '08_restore_increments_version';
  passed := v_version_3 = v_version_2 + 1;
  detail := jsonb_build_object(
    'before',
    v_version_2,
    'after',
    v_version_3
  );
  return next;

  select count(*)
  into v_history_count
  from public.calendar_ai_rule_revisions revision
  where revision.preference_id = v_preference_id
    and revision.rule_version = v_version_3
    and revision.action_code = 'restore_default'
    and revision.rule_text is null;

  check_no := 9;
  check_code := '09_restore_revision_written';
  passed := v_history_count = 1;
  detail := jsonb_build_object('count', v_history_count);
  return next;

  select profile.actor_id
  into v_other_actor_id
  from public.actor_public_profiles profile
  join public.actors actor
    on actor.id = profile.actor_id
   and actor.status = 'active'
  where profile.owner_user_id <> v_owner_user_id
  order by profile.created_at, profile.actor_id
  limit 1;

  if v_other_actor_id is null then
    check_no := 10;
    check_code := '10_cross_owner_actor_rejected';
    passed := true;
    detail := jsonb_build_object(
      'skipped',
      true,
      'reason',
      'no second-owner active actor fixture'
    );
    return next;
  else
    begin
      update public.calendar_ai_rule_preferences preference
      set updated_by_actor_id = v_other_actor_id
      where preference.id = v_preference_id;
    exception
      when others then
        v_rejected := true;
        v_message := sqlerrm;
    end;

    check_no := 10;
    check_code := '10_cross_owner_actor_rejected';
    passed :=
      v_rejected
      and v_message like '%CUX3_RULE_ACTOR_NOT_OWNED_BY_USER%';
    detail := jsonb_build_object(
      'otherActorId',
      v_other_actor_id,
      'message',
      v_message
    );
    return next;
  end if;

  delete from public.calendar_ai_rule_preferences preference
  where preference.id = v_preference_id;

  select count(*)
  into v_residual_after
  from public.calendar_ai_rule_preferences preference
  where preference.id = v_preference_id
     or preference.metadata_json @> '{"runtimeAcceptance":true}'::jsonb;

  check_no := 11;
  check_code := '11_fixture_cleanup';
  passed := v_residual_after = 0;
  detail := jsonb_build_object(
    'preferenceResidualCount',
    v_residual_after,
    'revisionResidualCount',
    (
      select count(*)
      from public.calendar_ai_rule_revisions revision
      where revision.preference_id = v_preference_id
    )
  );
  return next;
end;
$function$;

select *
from public.cux3_runtime_acceptance_v2()
order by check_no;
