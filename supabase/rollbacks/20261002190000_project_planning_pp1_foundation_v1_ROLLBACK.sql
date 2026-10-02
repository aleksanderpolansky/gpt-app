/*
ARCTor.app — Project Planning PP1 Foundation V1 rollback

Use only when PP1 dependent layers have not been installed.
This rollback removes PP1 planning-layer tables/functions only.
It does not modify value_objects, activity_events, facts, calendar or formulas.
*/

begin;

drop table if exists public.activity_event_relations cascade;
drop table if exists public.project_activity_links cascade;
drop table if exists public.project_composition_relations cascade;
drop table if exists public.project_contexts cascade;

drop function if exists public.enforce_activity_event_relation_v1();
drop function if exists public.enforce_project_activity_link_v1();
drop function if exists public.enforce_project_composition_relation_v1();
drop function if exists public.enforce_project_context_v1();
drop function if exists public.touch_project_planning_pp1_updated_at_v1();

commit;
