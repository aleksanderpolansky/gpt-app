-- MANUAL ROLLBACK ONLY: ARCTOR_ACTIVITY_TEMPLATE_IMPACT_PROFILE_AUTHORING_V1
-- Does NOT delete activity_templates created by users; it only removes this additive profile layer.
begin;

drop trigger if exists trg_activity_events_impact_profile_v1 on public.activity_events;
drop view if exists public.activity_event_virtual_parameter_contributions_v1;
drop view if exists public.activity_event_profile_object_contributions_v1;
drop function if exists public.set_activity_event_impact_profile_v1();
drop function if exists public.save_activity_template_impact_profile_v1(uuid,uuid,uuid,text,text,text,integer,text,jsonb,jsonb);
drop function if exists public.arctor_jsonb_first_numeric_v1(jsonb,text[]);

alter table public.activity_events drop column if exists impact_profile_id;

drop table if exists public.activity_template_parameter_routes_v1;
drop table if exists public.activity_template_profile_object_links_v1;
drop table if exists public.activity_template_profile_parameters_v1;
drop table if exists public.activity_template_impact_profiles_v1;

commit;
