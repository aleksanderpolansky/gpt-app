-- ARCTor Commercial STEP2 / P1 : admin switch with atomic DB write gate
-- APPLY in Supabase SQL Editor BEFORE deploying P1 source. Safe initial state: OFF.
BEGIN;

CREATE TABLE IF NOT EXISTS public.commercial_auto_fact_settings_v1 (
  setting_key text PRIMARY KEY DEFAULT 'global' CHECK (setting_key = 'global'),
  enabled boolean NOT NULL DEFAULT false,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_app_user_id uuid REFERENCES public.app_users(id)
);
CREATE TABLE IF NOT EXISTS public.commercial_auto_fact_settings_audit_v1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL CHECK (setting_key = 'global'),
  previous_enabled boolean NOT NULL,
  new_enabled boolean NOT NULL,
  previous_revision bigint NOT NULL,
  new_revision bigint NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  changed_by_app_user_id uuid NOT NULL REFERENCES public.app_users(id)
);
CREATE INDEX IF NOT EXISTS commercial_auto_fact_settings_audit_changed_idx
  ON public.commercial_auto_fact_settings_audit_v1 (changed_at DESC);

ALTER TABLE public.commercial_auto_fact_settings_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_auto_fact_settings_audit_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commercial_auto_fact_settings_v1 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.commercial_auto_fact_settings_audit_v1 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.commercial_auto_fact_settings_v1 TO service_role;
GRANT SELECT ON public.commercial_auto_fact_settings_audit_v1 TO service_role;

-- Never reset a switch that has already been changed by the administrator.
INSERT INTO public.commercial_auto_fact_settings_v1(setting_key,enabled,revision)
VALUES ('global',false,0) ON CONFLICT (setting_key) DO NOTHING;

-- Shared transaction lock serializes toggle writes with commercial auto-fact writes.
-- After an OFF update commits, no commercial auto-fact operation can still commit.
CREATE OR REPLACE FUNCTION public.arctor_set_commercial_auto_facts_enabled_p1_v1(
  p_enabled boolean,
  p_expected_revision bigint,
  p_changed_by_app_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $body$
DECLARE
  v_setting public.commercial_auto_fact_settings_v1%rowtype;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN
    RAISE EXCEPTION 'ARCTOR_COMMERCIAL_SWITCH_SERVICE_ROLE_REQUIRED';
  END IF;
  IF p_enabled IS NULL OR p_expected_revision IS NULL OR p_changed_by_app_user_id IS NULL THEN
    RAISE EXCEPTION 'ARCTOR_COMMERCIAL_SWITCH_INVALID_ARGUMENTS';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE app_user_id=p_changed_by_app_user_id
      AND role IN ('owner','admin') AND status='active'
  ) THEN
    RAISE EXCEPTION 'ARCTOR_COMMERCIAL_SWITCH_ACTIVE_ADMIN_REQUIRED';
  END IF;
  PERFORM pg_advisory_xact_lock(811177,20261011);
  SELECT * INTO v_setting FROM public.commercial_auto_fact_settings_v1
    WHERE setting_key='global' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ARCTOR_COMMERCIAL_SWITCH_ROW_MISSING'; END IF;
  IF v_setting.revision <> p_expected_revision THEN
    RAISE EXCEPTION 'ARCTOR_COMMERCIAL_SWITCH_STALE_REVISION';
  END IF;
  IF v_setting.enabled IS DISTINCT FROM p_enabled THEN
    UPDATE public.commercial_auto_fact_settings_v1
      SET enabled=p_enabled,
          revision=v_setting.revision+1,
          updated_at=clock_timestamp(),
          updated_by_app_user_id=p_changed_by_app_user_id
      WHERE setting_key='global';
    INSERT INTO public.commercial_auto_fact_settings_audit_v1(
      setting_key,previous_enabled,new_enabled,previous_revision,new_revision,
      changed_by_app_user_id
    ) VALUES (
      'global',v_setting.enabled,p_enabled,v_setting.revision,v_setting.revision+1,
      p_changed_by_app_user_id
    );
  END IF;
  RETURN (
    SELECT jsonb_build_object('ok',true,'enabled',enabled,'revision',revision,
      'updatedAt',updated_at)
    FROM public.commercial_auto_fact_settings_v1 WHERE setting_key='global'
  );
END
$body$;

CREATE OR REPLACE FUNCTION public.arctor_write_commercial_auto_facts_guarded_p1_v1(
  p_activity_event_id uuid,
  p_facts jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $body$
DECLARE
  v_enabled boolean;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN
    RAISE EXCEPTION 'ARCTOR_COMMERCIAL_AUTO_FACT_SERVICE_ROLE_REQUIRED';
  END IF;
  PERFORM pg_advisory_xact_lock(811177,20261011);
  SELECT enabled INTO v_enabled FROM public.commercial_auto_fact_settings_v1
    WHERE setting_key='global';
  IF v_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ARCTOR_COMMERCIAL_AUTO_FACTS_DISABLED';
  END IF;
  RETURN public.arctor_write_commercial_auto_facts_v1(p_activity_event_id,p_facts);
END
$body$;

REVOKE ALL ON FUNCTION public.arctor_set_commercial_auto_facts_enabled_p1_v1(boolean,bigint,uuid)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.arctor_write_commercial_auto_facts_guarded_p1_v1(uuid,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.arctor_set_commercial_auto_facts_enabled_p1_v1(boolean,bigint,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.arctor_write_commercial_auto_facts_guarded_p1_v1(uuid,jsonb) TO service_role;

-- The pilot's old, unguarded RPC must not be callable by the web service role.
-- The new SECURITY DEFINER wrapper can call it with the function owner's rights.
REVOKE EXECUTE ON FUNCTION public.arctor_write_commercial_auto_facts_v1(uuid,jsonb)
  FROM service_role;

-- Mandatory pre-commit assertions: no inadvertent ON, both gates available,
-- and old RPC no longer directly executable by the web service role.
DO $verify$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.commercial_auto_fact_settings_v1
     WHERE setting_key='global' AND enabled=false AND revision=0) THEN
    RAISE EXCEPTION 'ARCTOR_P1_UNEXPECTED_EXISTING_SWITCH_STATE';
  END IF;
  IF to_regprocedure('public.arctor_set_commercial_auto_facts_enabled_p1_v1(boolean,bigint,uuid)') IS NULL
     OR to_regprocedure('public.arctor_write_commercial_auto_facts_guarded_p1_v1(uuid,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'ARCTOR_P1_FUNCTION_NOT_CREATED';
  END IF;
  IF has_function_privilege('service_role',
      'public.arctor_write_commercial_auto_facts_v1(uuid,jsonb)'::regprocedure,'EXECUTE') THEN
    RAISE EXCEPTION 'ARCTOR_P1_UNGUARDED_RPC_STILL_EXECUTABLE';
  END IF;
END
$verify$;

COMMIT;

SELECT jsonb_pretty(jsonb_build_object(
  'contract','ARCTOR_COMMERCIAL_P1_ADMIN_SWITCH_V1',
  'setting',(SELECT jsonb_build_object('enabled',enabled,'revision',revision)
    FROM public.commercial_auto_fact_settings_v1 WHERE setting_key='global'),
  'toggleRpcPresent',to_regprocedure('public.arctor_set_commercial_auto_facts_enabled_p1_v1(boolean,bigint,uuid)') IS NOT NULL,
  'guardedWriterPresent',to_regprocedure('public.arctor_write_commercial_auto_facts_guarded_p1_v1(uuid,jsonb)') IS NOT NULL,
  'unguardedWriterServiceRoleExecutable',has_function_privilege('service_role',
     'public.arctor_write_commercial_auto_facts_v1(uuid,jsonb)'::regprocedure,'EXECUTE')
)) AS arctor_p1_sql_receipt;
