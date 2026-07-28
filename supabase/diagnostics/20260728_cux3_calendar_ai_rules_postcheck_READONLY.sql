-- CUX3 postcheck. Select-only, no writes.
with checks(check_no, check_code, passed, detail) as (
  values
    (1, '01_preferences_table', to_regclass('public.calendar_ai_rule_preferences') is not null, '{}'::jsonb),
    (2, '02_revisions_table', to_regclass('public.calendar_ai_rule_revisions') is not null, '{}'::jsonb),
    (3, '03_owner_user_column', exists(select 1 from information_schema.columns where table_schema='public' and table_name='calendar_ai_rule_preferences' and column_name='owner_user_id' and is_nullable='NO'), '{}'::jsonb),
    (4, '04_locale_column', exists(select 1 from information_schema.columns where table_schema='public' and table_name='calendar_ai_rule_preferences' and column_name='locale' and is_nullable='NO'), '{}'::jsonb),
    (5, '05_custom_text_nullable', exists(select 1 from information_schema.columns where table_schema='public' and table_name='calendar_ai_rule_preferences' and column_name='custom_rule_text' and is_nullable='YES'), '{}'::jsonb),
    (6, '06_rule_version_column', exists(select 1 from information_schema.columns where table_schema='public' and table_name='calendar_ai_rule_preferences' and column_name='rule_version' and is_nullable='NO'), '{}'::jsonb),
    (7, '07_actor_column', exists(select 1 from information_schema.columns where table_schema='public' and table_name='calendar_ai_rule_preferences' and column_name='updated_by_actor_id' and is_nullable='NO'), '{}'::jsonb),
    (8, '08_owner_locale_unique', exists(select 1 from pg_constraint where conrelid='public.calendar_ai_rule_preferences'::regclass and conname='calendar_ai_rule_preferences_owner_locale_key' and contype='u'), '{}'::jsonb),
    (9, '09_locale_check', exists(select 1 from pg_constraint where conrelid='public.calendar_ai_rule_preferences'::regclass and conname='calendar_ai_rule_preferences_locale_check'), '{}'::jsonb),
    (10, '10_text_check', exists(select 1 from pg_constraint where conrelid='public.calendar_ai_rule_preferences'::regclass and conname='calendar_ai_rule_preferences_text_check'), '{}'::jsonb),
    (11, '11_prepare_function', to_regprocedure('public.cux3_prepare_calendar_ai_rule_preference()') is not null, '{}'::jsonb),
    (12, '12_revision_function', to_regprocedure('public.cux3_append_calendar_ai_rule_revision()') is not null, '{}'::jsonb),
    (13, '13_prepare_trigger', exists(select 1 from information_schema.triggers where event_object_schema='public' and event_object_table='calendar_ai_rule_preferences' and trigger_name='calendar_ai_rule_preferences_prepare_trg'), '{}'::jsonb),
    (14, '14_revision_trigger', exists(select 1 from information_schema.triggers where event_object_schema='public' and event_object_table='calendar_ai_rule_preferences' and trigger_name='calendar_ai_rule_preferences_revision_trg'), '{}'::jsonb),
    (15, '15_preferences_rls', (select relrowsecurity from pg_class where oid='public.calendar_ai_rule_preferences'::regclass), '{}'::jsonb),
    (16, '16_revisions_rls', (select relrowsecurity from pg_class where oid='public.calendar_ai_rule_revisions'::regclass), '{}'::jsonb),
    (17, '17_preferences_index', to_regclass('public.calendar_ai_rule_preferences_owner_idx') is not null, '{}'::jsonb),
    (18, '18_revisions_index', to_regclass('public.calendar_ai_rule_revisions_owner_idx') is not null, '{}'::jsonb),
    (19, '19_revision_action_check', exists(select 1 from pg_constraint where conrelid='public.calendar_ai_rule_revisions'::regclass and conname='calendar_ai_rule_revisions_action_check'), '{}'::jsonb),
    (20, '20_revision_unique', exists(select 1 from pg_constraint where conrelid='public.calendar_ai_rule_revisions'::regclass and conname='calendar_ai_rule_revisions_version_key' and contype='u'), '{}'::jsonb)
)
select * from checks order by check_no;
