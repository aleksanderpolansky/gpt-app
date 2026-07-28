-- CUX3 preflight. Select-only, no writes.
with checks(check_no, check_code, passed, detail) as (
  values
    (1, '01_app_users_exists', to_regclass('public.app_users') is not null, jsonb_build_object('relation', to_regclass('public.app_users'))),
    (2, '02_actors_exists', to_regclass('public.actors') is not null, jsonb_build_object('relation', to_regclass('public.actors'))),
    (3, '03_actor_public_profiles_exists', to_regclass('public.actor_public_profiles') is not null, jsonb_build_object('relation', to_regclass('public.actor_public_profiles'))),
    (4, '04_pgcrypto_available', exists(select 1 from pg_extension where extname='pgcrypto'), '{}'::jsonb),
    (5, '05_preferences_not_partial_collision', not exists(
      select 1 from information_schema.tables
      where table_schema='public' and table_name='calendar_ai_rule_preferences'
    ) or to_regclass('public.calendar_ai_rule_preferences') is not null, '{}'::jsonb),
    (6, '06_revisions_not_partial_collision', not exists(
      select 1 from information_schema.tables
      where table_schema='public' and table_name='calendar_ai_rule_revisions'
    ) or to_regclass('public.calendar_ai_rule_revisions') is not null, '{}'::jsonb),
    (7, '07_owned_active_actor_available', exists(
      select 1
      from public.actor_public_profiles profile
      join public.actors actor on actor.id=profile.actor_id and actor.status='active'
      join public.app_users app_user on app_user.id=profile.owner_user_id
    ), '{}'::jsonb)
)
select * from checks order by check_no;
