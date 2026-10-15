-- ARCTOR_ADMIN_ADM2A_EVENT_HISTORY_HARDENING_V1
-- Only the ADM-2A event-history table is affected. No source tables modified.
-- Run ONCE after ADM-2A APPLY and before pilot seed. Safe to re-run if necessary.
BEGIN;

DO $precheck$
BEGIN
  IF to_regclass('public.arctor_admin_case_events_adm2_v1') IS NULL
     OR to_regclass('public.arctor_admin_roles_adm2_v1') IS NULL
     OR (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1) <> 8
  THEN
    RAISE EXCEPTION 'ADM2A_AUDIT_FIX_STOP_SCHEMA_NOT_READY';
  END IF;
END $precheck$;

-- GRANT SELECT,INSERT does not erase permissions assigned by default grants.
REVOKE UPDATE, DELETE, TRUNCATE
 ON TABLE public.arctor_admin_case_events_adm2_v1
 FROM PUBLIC, anon, authenticated, service_role;

-- Defence in depth: reject attempts to rewrite or erase events, even if an
-- overly privileged account later gains UPDATE / DELETE / TRUNCATE rights.
CREATE OR REPLACE FUNCTION public.arctor_admin_reject_event_history_mutation_adm2_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $fn$
BEGIN
  RAISE EXCEPTION 'ADM2A_EVENT_HISTORY_APPEND_ONLY: operation % denied', TG_OP
    USING ERRCODE = '42501';
  RETURN NULL;
END;
$fn$;

REVOKE ALL ON FUNCTION public.arctor_admin_reject_event_history_mutation_adm2_v1()
 FROM PUBLIC, anon, authenticated;

DO $triggers$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.arctor_admin_case_events_adm2_v1'::regclass
      AND tgname = 'arctor_admin_events_no_mutation_adm2_v1'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER arctor_admin_events_no_mutation_adm2_v1
      BEFORE UPDATE OR DELETE ON public.arctor_admin_case_events_adm2_v1
      FOR EACH ROW
      EXECUTE FUNCTION public.arctor_admin_reject_event_history_mutation_adm2_v1();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.arctor_admin_case_events_adm2_v1'::regclass
      AND tgname = 'arctor_admin_events_no_truncate_adm2_v1'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER arctor_admin_events_no_truncate_adm2_v1
      BEFORE TRUNCATE ON public.arctor_admin_case_events_adm2_v1
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.arctor_admin_reject_event_history_mutation_adm2_v1();
  END IF;
END $triggers$;

ALTER TABLE public.arctor_admin_case_events_adm2_v1
  ENABLE ALWAYS TRIGGER arctor_admin_events_no_mutation_adm2_v1;
ALTER TABLE public.arctor_admin_case_events_adm2_v1
  ENABLE ALWAYS TRIGGER arctor_admin_events_no_truncate_adm2_v1;

DO $postguard$
DECLARE
  n int;
BEGIN
  IF has_table_privilege('service_role','public.arctor_admin_case_events_adm2_v1','UPDATE')
    OR has_table_privilege('service_role','public.arctor_admin_case_events_adm2_v1','DELETE')
    OR has_table_privilege('service_role','public.arctor_admin_case_events_adm2_v1','TRUNCATE')
  THEN
    RAISE EXCEPTION 'ADM2A_AUDIT_FIX_STOP_SERVICE_ROLE_STILL_HAS_MUTATION_GRANTS';
  END IF;
  IF NOT (
    has_table_privilege('service_role','public.arctor_admin_case_events_adm2_v1','SELECT')
    AND has_table_privilege('service_role','public.arctor_admin_case_events_adm2_v1','INSERT')
  ) THEN
    RAISE EXCEPTION 'ADM2A_AUDIT_FIX_STOP_SERVICE_ROLE_APPEND_GRANTS_MISSING';
  END IF;
  SELECT count(*) INTO n FROM pg_catalog.pg_trigger
   WHERE tgrelid='public.arctor_admin_case_events_adm2_v1'::regclass
     AND tgname IN ('arctor_admin_events_no_mutation_adm2_v1',
                    'arctor_admin_events_no_truncate_adm2_v1')
     AND tgenabled='A' AND NOT tgisinternal;
  IF n <> 2 THEN
    RAISE EXCEPTION 'ADM2A_AUDIT_FIX_STOP_PROTECTIVE_TRIGGERS_NOT_ENABLED';
  END IF;
END $postguard$;

COMMIT;
