-- ARCTOR_RUNTIME_TEMPLATE_BRIDGE_FACT_DEDUP_V2 / EMERGENCY SCHEMA ROLLBACK
-- DO NOT RUN during normal release or testing.
-- Runtime activity rows already matched before a rollback are intentionally preserved.
begin;

drop view if exists public.activity_object_analytics_inputs_v1;

drop function if exists public.apply_activity_template_match_v2(
  uuid,uuid,uuid,uuid,numeric,text,text,text,integer,boolean,numeric,numeric,numeric
);

commit;
