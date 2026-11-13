-- ARCTor X04-020 / APPEND-ONLY SOURCE RECOVERY (derived 2026-11-13)
-- Source: X04_020_INSTALLED_CLOCK_DEFINITIONS_READONLY (24 records).
-- DO NOT paste this migration into the existing Production SQL Editor.
-- Only integrate into source after review; test replay on isolated Supabase/PostgreSQL first.
-- Existing function bodies are checked and NEVER overwritten when non-identical.
-- Same named triggers are never recreated; post-asserted for definition & enabled state.
-- No schema reset, DROP, TRUNCATE, DELETE, UPDATE or destructive Git operations.
-- Intentionally no cache enable, no Gate B/SEC-06 status changes.

BEGIN;
SET LOCAL search_path = pg_catalog;

-- Replica-safe contract from TABLE_META; original constraint names not exported.
-- Supabase database roles (anon/authenticated/service_role) must pre-exist.
CREATE TABLE IF NOT EXISTS public.arctor_model_versions_x04_v1 (
    version_key text NOT NULL,
    scope_code text NOT NULL,
    domain_code text NOT NULL,
    owner_user_id uuid,
    owner_actor_id uuid,
    revision bigint NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
    last_catalog_top_xid_x04_017 xid8,
    last_actor_catalog_top_xid_x04_018 xid8,
    last_relation_review_top_xid_x04_019 xid8,
    last_rule_approval_top_xid_x04_019 xid8,
    CONSTRAINT arctor_model_versions_x04_v1_pkey PRIMARY KEY (version_key),
    CONSTRAINT x04_020_owner_scope_check CHECK (
      (scope_code='system' AND owner_user_id IS NULL AND owner_actor_id IS NULL)
      OR (scope_code='actor' AND owner_user_id IS NOT NULL AND owner_actor_id IS NOT NULL)
    ),
    CONSTRAINT x04_020_domain_code_check CHECK (domain_code IN ('catalog','relation_review','rule_approval')),
    CONSTRAINT x04_020_revision_check CHECK (revision >= 0),
    CONSTRAINT x04_020_scope_code_check CHECK (scope_code IN ('system','actor'))
);

-- Fail-closed existing-schema parity before any function or grant changes.
DO $x04_020_table_guard$
DECLARE actual jsonb; expected jsonb;
BEGIN
  IF (SELECT c.relowner <> 'postgres'::regrole OR c.relkind <> 'r'
      FROM pg_catalog.pg_class c WHERE c.oid='public.arctor_model_versions_x04_v1'::regclass) THEN
    RAISE EXCEPTION 'X04_020_STOP_TABLE_OWNER_OR_KIND';
  END IF;
  SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(
      a.attname, pg_catalog.format_type(a.atttypid,a.atttypmod), a.attnotnull,
      pg_catalog.pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attnum)
    INTO actual
  FROM pg_catalog.pg_attribute a
  LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
  WHERE a.attrelid='public.arctor_model_versions_x04_v1'::regclass
    AND a.attnum>0 AND NOT a.attisdropped;
  expected := '[["version_key","text",true,null],["scope_code","text",true,null],
     ["domain_code","text",true,null],["owner_user_id","uuid",false,null],
     ["owner_actor_id","uuid",false,null],["revision","bigint",true,null],
     ["updated_at","timestamp with time zone",true,"clock_timestamp()"],
     ["last_catalog_top_xid_x04_017","xid8",false,null],
     ["last_actor_catalog_top_xid_x04_018","xid8",false,null],
     ["last_relation_review_top_xid_x04_019","xid8",false,null],
     ["last_rule_approval_top_xid_x04_019","xid8",false,null]]'::jsonb;
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'X04_020_STOP_VERSION_TABLE_COLUMNS_MISMATCH';
  END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_constraint
      WHERE conrelid='public.arctor_model_versions_x04_v1'::regclass) <> 5 THEN
    RAISE EXCEPTION 'X04_020_STOP_VERSION_TABLE_CONSTRAINT_COUNT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conrelid='public.arctor_model_versions_x04_v1'::regclass
       AND contype='p' AND conname='arctor_model_versions_x04_v1_pkey') THEN
     RAISE EXCEPTION 'X04_020_STOP_VERSION_TABLE_PK';
  END IF;
END;
$x04_020_table_guard$;

ALTER TABLE public.arctor_model_versions_x04_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.arctor_model_versions_x04_v1 FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.arctor_model_versions_x04_v1 TO service_role;

-- Only an empty newly-created DB needs a zero-revision bootstrap.
-- Existing deployed revisions remain unchanged (ON CONFLICT DO NOTHING).
INSERT INTO public.arctor_model_versions_x04_v1
    (version_key, scope_code, domain_code, owner_user_id, owner_actor_id, revision)
VALUES ('system:catalog','system','catalog',NULL,NULL,0),
       ('system:relation_review','system','relation_review',NULL,NULL,0),
       ('system:rule_approval','system','rule_approval',NULL,NULL,0)
ON CONFLICT (version_key) DO NOTHING;

-- Functions reconstructed from the PostgreSQL export. Existing bodies MUST match.

-- 01 public.arctor_model_actor_alias_clock_x04_018_v1(); exported_pg_md5=adc58ff4f17b77b54b9f033cac9d76ef; normalized_prosrc_md5=c0d250c42b3dbbe08bf8515c8511cbb7
DO $x04_020_install_fn$
DECLARE v_oid oid;
BEGIN
  v_oid := pg_catalog.to_regprocedure('public.arctor_model_actor_alias_clock_x04_018_v1()')::oid;
  IF v_oid IS NULL THEN
    EXECUTE $x04_020_ddl_01$
CREATE OR REPLACE FUNCTION public.arctor_model_actor_alias_clock_x04_018_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_old_scope text;
  v_new_scope text;
  v_old_uid uuid;
  v_old_aid uuid;
  v_new_uid uuid;
  v_new_aid uuid;
BEGIN
  -- X04_018_ACTOR_ALIAS_CLOCK_V1
  IF NOT (
    (TG_TABLE_SCHEMA='public' AND TG_TABLE_NAME='concept_aliases')
    OR (TG_TABLE_SCHEMA LIKE 'pg_temp_%' AND TG_TABLE_NAME='x04_test_aliases')
  ) THEN
    RAISE EXCEPTION 'X04_018_STOP_ALIAS_UNEXPECTED_TRIGGER_TABLE:%:%',TG_TABLE_SCHEMA,TG_TABLE_NAME;
  END IF;
  IF TG_OP='UPDATE' AND
     (pg_catalog.to_jsonb(OLD)-'created_at'-'updated_at') IS NOT DISTINCT FROM
     (pg_catalog.to_jsonb(NEW)-'created_at'-'updated_at') THEN
    RETURN NEW;
  END IF;
  IF TG_OP <> 'INSERT' AND OLD.concept_type='value_object' THEN
    SELECT v.scope_code,v.owner_user_id,v.owner_actor_id
      INTO v_old_scope,v_old_uid,v_old_aid
    FROM public.value_objects v WHERE v.id=OLD.concept_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'X04_018_STOP_ALIAS_OLD_VALUE_OBJECT_MISSING';
    END IF;
    IF (v_old_uid IS NULL) <> (v_old_aid IS NULL)
       OR (v_old_uid IS NULL AND v_old_scope IN ('actor','private'))
       OR (v_old_uid IS NOT NULL AND v_old_scope IN ('global','system'))
       OR (v_old_scope IS NOT NULL AND v_old_scope NOT IN ('actor','private','global','system')) THEN
      RAISE EXCEPTION 'X04_018_STOP_ALIAS_OLD_OWNER_INVALID';
    END IF;
    IF v_old_uid IS NOT NULL THEN
      PERFORM public.arctor_model_bump_x04_v1('catalog',v_old_uid,v_old_aid);
    END IF;
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.concept_type='value_object' THEN
    SELECT v.scope_code,v.owner_user_id,v.owner_actor_id
      INTO v_new_scope,v_new_uid,v_new_aid
    FROM public.value_objects v WHERE v.id=NEW.concept_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'X04_018_STOP_ALIAS_NEW_VALUE_OBJECT_MISSING';
    END IF;
    IF (v_new_uid IS NULL) <> (v_new_aid IS NULL)
       OR (v_new_uid IS NULL AND v_new_scope IN ('actor','private'))
       OR (v_new_uid IS NOT NULL AND v_new_scope IN ('global','system'))
       OR (v_new_scope IS NOT NULL AND v_new_scope NOT IN ('actor','private','global','system')) THEN
      RAISE EXCEPTION 'X04_018_STOP_ALIAS_NEW_OWNER_INVALID';
    END IF;
    IF v_new_uid IS NOT NULL THEN
      PERFORM public.arctor_model_bump_x04_v1('catalog',v_new_uid,v_new_aid);
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;
$x04_020_ddl_01$;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid=v_oid AND p.prokind='f' AND p.prosecdef
        AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
        AND p.proconfig @> ARRAY['search_path=pg_catalog']::text[]
        AND pg_catalog.md5(pg_catalog.replace(pg_catalog.replace(p.prosrc,E'\r\n',E'\n'),E'\r',E'\n'))='c0d250c42b3dbbe08bf8515c8511cbb7'
    ) THEN
      RAISE EXCEPTION 'X04_020_STOP_FUNCTION_DRIFT:arctor_model_actor_alias_clock_x04_018_v1';
    END IF;
  END IF;
END;
$x04_020_install_fn$;
REVOKE ALL ON FUNCTION public.arctor_model_actor_alias_clock_x04_018_v1() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arctor_model_actor_alias_clock_x04_018_v1() TO anon, authenticated, service_role;

-- 02 public.arctor_model_alias_clock_x04_017_v1(); exported_pg_md5=5f9d1bed0a0a92df2d67825f3d5ce17b; normalized_prosrc_md5=2e5b0e16cf5947a5d79eed295d56462e
DO $x04_020_install_fn$
DECLARE v_oid oid;
BEGIN
  v_oid := pg_catalog.to_regprocedure('public.arctor_model_alias_clock_x04_017_v1()')::oid;
  IF v_oid IS NULL THEN
    EXECUTE $x04_020_ddl_02$
CREATE OR REPLACE FUNCTION public.arctor_model_alias_clock_x04_017_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  old_is_system boolean := false;
  new_is_system boolean := false;
BEGIN
  -- X04_017_SYSTEM_ALIAS_CLOCK_V1
  IF NOT (
    (TG_TABLE_SCHEMA='public' AND TG_TABLE_NAME='concept_aliases')
    OR (TG_TABLE_SCHEMA LIKE 'pg_temp_%' AND TG_TABLE_NAME='x04_test_aliases')
  ) THEN
    RAISE EXCEPTION 'X04_017_ALIAS_UNEXPECTED_TRIGGER_TABLE:%:%',TG_TABLE_SCHEMA,TG_TABLE_NAME;
  END IF;
  IF TG_OP='UPDATE' AND
     (to_jsonb(OLD)-'created_at'-'updated_at') IS NOT DISTINCT FROM
     (to_jsonb(NEW)-'created_at'-'updated_at') THEN
    RETURN NEW;
  END IF;
  IF TG_OP <> 'INSERT' THEN
    IF OLD.concept_type='value_object' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.value_objects v
        WHERE v.id=OLD.concept_id AND v.scope_code='global'
          AND v.origin_type_code='system_model'
          AND v.owner_user_id IS NULL AND v.owner_actor_id IS NULL
      ) INTO old_is_system;
    END IF;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    IF NEW.concept_type='value_object' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.value_objects v
        WHERE v.id=NEW.concept_id AND v.scope_code='global'
          AND v.origin_type_code='system_model'
          AND v.owner_user_id IS NULL AND v.owner_actor_id IS NULL
      ) INTO new_is_system;
    END IF;
  END IF;
  IF old_is_system OR new_is_system THEN
    PERFORM public.arctor_model_bump_x04_v1('catalog',NULL,NULL);
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;
$x04_020_ddl_02$;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid=v_oid AND p.prokind='f' AND p.prosecdef
        AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
        AND p.proconfig @> ARRAY['search_path=pg_catalog']::text[]
        AND pg_catalog.md5(pg_catalog.replace(pg_catalog.replace(p.prosrc,E'\r\n',E'\n'),E'\r',E'\n'))='2e5b0e16cf5947a5d79eed295d56462e'
    ) THEN
      RAISE EXCEPTION 'X04_020_STOP_FUNCTION_DRIFT:arctor_model_alias_clock_x04_017_v1';
    END IF;
  END IF;
END;
$x04_020_install_fn$;
REVOKE ALL ON FUNCTION public.arctor_model_alias_clock_x04_017_v1() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arctor_model_alias_clock_x04_017_v1() TO anon, authenticated, service_role;

-- 03 public.arctor_model_bump_row_x04_v1(p_domain text, p_row jsonb); exported_pg_md5=38d19f4de6dd5b74f6f5b7f122d9049b; normalized_prosrc_md5=4447ed7805880d5a2f35c34c66aa0b0a
DO $x04_020_install_fn$
DECLARE v_oid oid;
BEGIN
  v_oid := pg_catalog.to_regprocedure('public.arctor_model_bump_row_x04_v1(text,jsonb)')::oid;
  IF v_oid IS NULL THEN
    EXECUTE $x04_020_ddl_03$
CREATE OR REPLACE FUNCTION public.arctor_model_bump_row_x04_v1(p_domain text, p_row jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE uid uuid; aid uuid; declared_scope text;
BEGIN
  uid := nullif(p_row->>'owner_user_id','')::uuid;
  aid := nullif(p_row->>'owner_actor_id','')::uuid;
  declared_scope := nullif(p_row->>'scope_code','');
  IF (uid IS NULL) <> (aid IS NULL) THEN
    RAISE EXCEPTION 'X04_INCOMPLETE_PERSISTED_OWNER: stop mutation rather than mis-bump global clock';
  END IF;
  IF uid IS NULL AND declared_scope IN ('actor','private') THEN
    RAISE EXCEPTION 'X04_ACTOR_SCOPE_MISSING_OWNER';
  END IF;
  IF uid IS NOT NULL AND declared_scope IN ('global','system') THEN
    RAISE EXCEPTION 'X04_GLOBAL_SCOPE_WITH_ACTOR_OWNER';
  END IF;
  IF declared_scope IS NOT NULL AND declared_scope NOT IN ('global','system','actor','private') THEN
    RAISE EXCEPTION 'X04_UNKNOWN_SCOPE_CODE:%',declared_scope;
  END IF;
  PERFORM public.arctor_model_bump_x04_v1(p_domain,uid,aid);
END;
$function$;
$x04_020_ddl_03$;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid=v_oid AND p.prokind='f' AND p.prosecdef
        AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
        AND p.proconfig @> ARRAY['search_path=pg_catalog']::text[]
        AND pg_catalog.md5(pg_catalog.replace(pg_catalog.replace(p.prosrc,E'\r\n',E'\n'),E'\r',E'\n'))='4447ed7805880d5a2f35c34c66aa0b0a'
    ) THEN
      RAISE EXCEPTION 'X04_020_STOP_FUNCTION_DRIFT:arctor_model_bump_row_x04_v1';
    END IF;
  END IF;
END;
$x04_020_install_fn$;
REVOKE ALL ON FUNCTION public.arctor_model_bump_row_x04_v1(text,jsonb) FROM PUBLIC, anon, authenticated, service_role;

-- 04 public.arctor_model_bump_x04_v1(p_domain text, p_owner_user_id uuid, p_owner_actor_id uuid); exported_pg_md5=cfd7e2ddcf1d33a6ad06c0d25eb27e4b; normalized_prosrc_md5=4685b69d6579943341f76c0e37c44461
DO $x04_020_install_fn$
DECLARE v_oid oid;
BEGIN
  v_oid := pg_catalog.to_regprocedure('public.arctor_model_bump_x04_v1(text,uuid,uuid)')::oid;
  IF v_oid IS NULL THEN
    EXECUTE $x04_020_ddl_04$
CREATE OR REPLACE FUNCTION public.arctor_model_bump_x04_v1(p_domain text, p_owner_user_id uuid, p_owner_actor_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  k text;
  s text;
  result_revision bigint;
  top_xid pg_catalog.xid8;
BEGIN
  -- X04_017_SYSTEM_CATALOG_ONCE_V1
  IF p_domain NOT IN ('catalog','relation_review','rule_approval') THEN
    RAISE EXCEPTION 'X04_INVALID_VERSION_DOMAIN' USING ERRCODE='22023';
  END IF;
  IF (p_owner_user_id IS NULL) <> (p_owner_actor_id IS NULL) THEN
    RAISE EXCEPTION 'X04_PARTIAL_ACTOR_IDENTITY' USING ERRCODE='22023';
  END IF;
  IF p_owner_user_id IS NULL THEN
    s := 'system'; k := 'system:' || p_domain;
  ELSE
    s := 'actor';
    k := 'actor:' || p_owner_user_id::text || ':' || p_owner_actor_id::text || ':' || p_domain;
  END IF;

  IF s='system' AND p_domain='catalog' THEN
    -- pg_current_xact_id() yields the TOP-LEVEL xid even in subtransactions.
    -- This value is PostgreSQL-owned and cannot be forged with SET LOCAL GUCs.
    top_xid := pg_catalog.pg_current_xact_id();
    INSERT INTO public.arctor_model_versions_x04_v1
      (version_key,scope_code,domain_code,owner_user_id,owner_actor_id,
       revision,last_catalog_top_xid_x04_017)
    VALUES (k,s,p_domain,NULL,NULL,1,top_xid)
    ON CONFLICT (version_key) DO UPDATE
    SET revision=public.arctor_model_versions_x04_v1.revision+1,
        last_catalog_top_xid_x04_017=EXCLUDED.last_catalog_top_xid_x04_017,
        updated_at=pg_catalog.clock_timestamp()
    WHERE public.arctor_model_versions_x04_v1.last_catalog_top_xid_x04_017
      IS DISTINCT FROM EXCLUDED.last_catalog_top_xid_x04_017
    RETURNING revision INTO result_revision;

    -- A conflict with the same xid locked the row but intentionally performed
    -- no UPDATE; return the existing revision without changing updated_at.
    IF result_revision IS NULL THEN
      SELECT revision INTO result_revision
      FROM public.arctor_model_versions_x04_v1 WHERE version_key=k;
      IF result_revision IS NULL THEN
        RAISE EXCEPTION 'X04_017_CATALOG_VERSION_MISSING_AFTER_DEDUP';
      END IF;
    END IF;
    RETURN result_revision;
  END IF;

  -- X04_018_ACTOR_CATALOG_ONCE_V1
  IF s='actor' AND p_domain='catalog' THEN
    -- Dedupe only this actor's own catalog in one top-level transaction.
    top_xid := pg_catalog.pg_current_xact_id();
    INSERT INTO public.arctor_model_versions_x04_v1
      (version_key,scope_code,domain_code,owner_user_id,owner_actor_id,
       revision,last_actor_catalog_top_xid_x04_018)
    VALUES (k,s,p_domain,p_owner_user_id,p_owner_actor_id,1,top_xid)
    ON CONFLICT (version_key) DO UPDATE
    SET revision=public.arctor_model_versions_x04_v1.revision+1,
        last_actor_catalog_top_xid_x04_018=EXCLUDED.last_actor_catalog_top_xid_x04_018,
        updated_at=pg_catalog.clock_timestamp()
    WHERE public.arctor_model_versions_x04_v1.last_actor_catalog_top_xid_x04_018
      IS DISTINCT FROM EXCLUDED.last_actor_catalog_top_xid_x04_018
    RETURNING revision INTO result_revision;

    IF result_revision IS NULL THEN
      SELECT revision INTO result_revision
      FROM public.arctor_model_versions_x04_v1 WHERE version_key=k;
      IF result_revision IS NULL THEN
        RAISE EXCEPTION 'X04_018_ACTOR_CATALOG_VERSION_MISSING_AFTER_DEDUP';
      END IF;
    END IF;
    RETURN result_revision;
  END IF;

  -- X04_019_RELATION_AND_RULE_TX_ONCE_V1
  IF p_domain='relation_review' THEN
    top_xid := pg_catalog.pg_current_xact_id();
    INSERT INTO public.arctor_model_versions_x04_v1
      (version_key,scope_code,domain_code,owner_user_id,owner_actor_id,
       revision,last_relation_review_top_xid_x04_019)
    VALUES (k,s,p_domain,p_owner_user_id,p_owner_actor_id,1,top_xid)
    ON CONFLICT (version_key) DO UPDATE
    SET revision=public.arctor_model_versions_x04_v1.revision+1,
        last_relation_review_top_xid_x04_019=EXCLUDED.last_relation_review_top_xid_x04_019,
        updated_at=pg_catalog.clock_timestamp()
    WHERE public.arctor_model_versions_x04_v1.last_relation_review_top_xid_x04_019
      IS DISTINCT FROM EXCLUDED.last_relation_review_top_xid_x04_019
    RETURNING revision INTO result_revision;
    IF result_revision IS NULL THEN
      SELECT revision INTO result_revision FROM public.arctor_model_versions_x04_v1
      WHERE version_key=k;
      IF result_revision IS NULL THEN
        RAISE EXCEPTION 'X04_019_RELATION_VERSION_ROW_MISSING_AFTER_DEDUP';
      END IF;
    END IF;
    RETURN result_revision;
  END IF;

  IF p_domain='rule_approval' THEN
    top_xid := pg_catalog.pg_current_xact_id();
    INSERT INTO public.arctor_model_versions_x04_v1
      (version_key,scope_code,domain_code,owner_user_id,owner_actor_id,
       revision,last_rule_approval_top_xid_x04_019)
    VALUES (k,s,p_domain,p_owner_user_id,p_owner_actor_id,1,top_xid)
    ON CONFLICT (version_key) DO UPDATE
    SET revision=public.arctor_model_versions_x04_v1.revision+1,
        last_rule_approval_top_xid_x04_019=EXCLUDED.last_rule_approval_top_xid_x04_019,
        updated_at=pg_catalog.clock_timestamp()
    WHERE public.arctor_model_versions_x04_v1.last_rule_approval_top_xid_x04_019
      IS DISTINCT FROM EXCLUDED.last_rule_approval_top_xid_x04_019
    RETURNING revision INTO result_revision;
    IF result_revision IS NULL THEN
      SELECT revision INTO result_revision FROM public.arctor_model_versions_x04_v1
      WHERE version_key=k;
      IF result_revision IS NULL THEN
        RAISE EXCEPTION 'X04_019_RULE_VERSION_ROW_MISSING_AFTER_DEDUP';
      END IF;
    END IF;
    RETURN result_revision;
  END IF;

  -- All other domains preserve X04-017 legacy atomic per-call behavior.
  INSERT INTO public.arctor_model_versions_x04_v1
    (version_key,scope_code,domain_code,owner_user_id,owner_actor_id,revision)
  VALUES (k,s,p_domain,p_owner_user_id,p_owner_actor_id,1)
  ON CONFLICT (version_key) DO UPDATE
  SET revision=public.arctor_model_versions_x04_v1.revision+1,
      updated_at=pg_catalog.clock_timestamp()
  RETURNING revision INTO result_revision;
  RETURN result_revision;
END;
$function$;
$x04_020_ddl_04$;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid=v_oid AND p.prokind='f' AND p.prosecdef
        AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
        AND p.proconfig @> ARRAY['search_path=pg_catalog']::text[]
        AND pg_catalog.md5(pg_catalog.replace(pg_catalog.replace(p.prosrc,E'\r\n',E'\n'),E'\r',E'\n'))='4685b69d6579943341f76c0e37c44461'
    ) THEN
      RAISE EXCEPTION 'X04_020_STOP_FUNCTION_DRIFT:arctor_model_bump_x04_v1';
    END IF;
  END IF;
END;
$x04_020_install_fn$;
REVOKE ALL ON FUNCTION public.arctor_model_bump_x04_v1(text,uuid,uuid) FROM PUBLIC, anon, authenticated, service_role;

-- 05 public.arctor_model_clock_change_x04_v1(); exported_pg_md5=23992f9419c9d0bbfeaa1cd98510aca7; normalized_prosrc_md5=8dfaf47fb45ebae6e791a0400c5f9a7c
DO $x04_020_install_fn$
DECLARE v_oid oid;
BEGIN
  v_oid := pg_catalog.to_regprocedure('public.arctor_model_clock_change_x04_v1()')::oid;
  IF v_oid IS NULL THEN
    EXECUTE $x04_020_ddl_05$
CREATE OR REPLACE FUNCTION public.arctor_model_clock_change_x04_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE old_row jsonb; new_row jsonb; domain text; old_uid text; old_aid text; new_uid text; new_aid text;
BEGIN
  IF TG_TABLE_SCHEMA <> 'public' AND NOT (
    TG_TABLE_SCHEMA LIKE 'pg_temp_%' AND TG_TABLE_NAME IN (
      'x04_test_vo','x04_test_system_relations','x04_test_actor_relations'
    )
  ) THEN
    RAISE EXCEPTION 'X04_UNEXPECTED_TRIGGER_SCHEMA';
  END IF;
  IF TG_TABLE_NAME IN ('value_objects','x04_test_vo') THEN
    domain := 'catalog';
  ELSIF TG_TABLE_NAME IN (
    'value_object_relations','system_value_object_relations','relation_evidence',
    'x04_test_system_relations','x04_test_actor_relations'
  ) THEN
    domain := 'relation_review';
  ELSE
    RAISE EXCEPTION 'X04_UNEXPECTED_TRIGGER_TABLE:%',TG_TABLE_NAME;
  END IF;

  IF TG_OP <> 'INSERT' THEN
    old_row := to_jsonb(OLD);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    new_row := to_jsonb(NEW);
  END IF;
  IF TG_OP='UPDATE' AND
    (old_row - 'updated_at' - 'created_at') IS NOT DISTINCT FROM
    (new_row - 'updated_at' - 'created_at') THEN
    RETURN NEW;
  END IF;

  IF TG_OP='INSERT' THEN
    PERFORM public.arctor_model_bump_row_x04_v1(domain,new_row);
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    PERFORM public.arctor_model_bump_row_x04_v1(domain,old_row);
    RETURN OLD;
  ELSE
    old_uid := old_row->>'owner_user_id'; old_aid := old_row->>'owner_actor_id';
    new_uid := new_row->>'owner_user_id'; new_aid := new_row->>'owner_actor_id';
    PERFORM public.arctor_model_bump_row_x04_v1(domain,new_row);
    IF old_uid IS DISTINCT FROM new_uid OR old_aid IS DISTINCT FROM new_aid THEN
      PERFORM public.arctor_model_bump_row_x04_v1(domain,old_row);
    END IF;
    RETURN NEW;
  END IF;
END;
$function$;
$x04_020_ddl_05$;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid=v_oid AND p.prokind='f' AND p.prosecdef
        AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
        AND p.proconfig @> ARRAY['search_path=pg_catalog']::text[]
        AND pg_catalog.md5(pg_catalog.replace(pg_catalog.replace(p.prosrc,E'\r\n',E'\n'),E'\r',E'\n'))='8dfaf47fb45ebae6e791a0400c5f9a7c'
    ) THEN
      RAISE EXCEPTION 'X04_020_STOP_FUNCTION_DRIFT:arctor_model_clock_change_x04_v1';
    END IF;
  END IF;
END;
$x04_020_install_fn$;
REVOKE ALL ON FUNCTION public.arctor_model_clock_change_x04_v1() FROM PUBLIC, anon, authenticated, service_role;

-- 06 public.arctor_model_effect_rule_clock_x04_019_v1(); exported_pg_md5=0bc26090477f7cbb9424521fb19929b4; normalized_prosrc_md5=7ac78bfc05aa669cdae6c9aa79277215
DO $x04_020_install_fn$
DECLARE v_oid oid;
BEGIN
  v_oid := pg_catalog.to_regprocedure('public.arctor_model_effect_rule_clock_x04_019_v1()')::oid;
  IF v_oid IS NULL THEN
    EXECUTE $x04_020_ddl_06$
CREATE OR REPLACE FUNCTION public.arctor_model_effect_rule_clock_x04_019_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE o jsonb; n jsonb; v record; k text; seen text[] := ARRAY[]::text[];
  old_live boolean := false; new_live boolean := false;
BEGIN
 IF TG_TABLE_SCHEMA <> 'public' OR TG_TABLE_NAME <> 'value_object_analytics_effect_rules_v1' THEN
   RAISE EXCEPTION 'X04_019_EFFECT_UNEXPECTED_TABLE'; END IF;
 IF TG_OP <> 'INSERT' THEN o:=to_jsonb(OLD); old_live:=OLD.status IN ('active','approved','published'); END IF;
 IF TG_OP <> 'DELETE' THEN n:=to_jsonb(NEW); new_live:=NEW.status IN ('active','approved','published'); END IF;
 IF NOT (old_live OR new_live) THEN
   IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
 END IF;
 IF TG_OP='UPDATE' AND
    (o-'created_at'-'updated_at') IS NOT DISTINCT FROM (n-'created_at'-'updated_at') THEN
   RETURN NEW;
 END IF;
 FOR v IN SELECT DISTINCT uid,aid FROM (
   SELECT (o->>'owner_user_id')::uuid uid,(o->>'owner_actor_id')::uuid aid WHERE old_live
   UNION ALL
   SELECT (n->>'owner_user_id')::uuid uid,(n->>'owner_actor_id')::uuid aid WHERE new_live
 ) t LOOP
   IF v.uid IS NULL OR v.aid IS NULL THEN RAISE EXCEPTION 'X04_019_EFFECT_OWNER_MISSING'; END IF;
   k:=v.uid::text||':'||v.aid::text;
   IF NOT k=ANY(seen) THEN
     PERFORM public.arctor_model_bump_x04_v1('rule_approval',v.uid,v.aid);
     seen:=array_append(seen,k);
   END IF;
 END LOOP;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;
$x04_020_ddl_06$;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid=v_oid AND p.prokind='f' AND p.prosecdef
        AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
        AND p.proconfig @> ARRAY['search_path=pg_catalog']::text[]
        AND pg_catalog.md5(pg_catalog.replace(pg_catalog.replace(p.prosrc,E'\r\n',E'\n'),E'\r',E'\n'))='7ac78bfc05aa669cdae6c9aa79277215'
    ) THEN
      RAISE EXCEPTION 'X04_020_STOP_FUNCTION_DRIFT:arctor_model_effect_rule_clock_x04_019_v1';
    END IF;
  END IF;
END;
$x04_020_install_fn$;
REVOKE ALL ON FUNCTION public.arctor_model_effect_rule_clock_x04_019_v1() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arctor_model_effect_rule_clock_x04_019_v1() TO service_role;

-- 07 public.arctor_model_formula_series_clock_x04_019_v1(); exported_pg_md5=628d059177a3e147cecd4455089fc3fc; normalized_prosrc_md5=86d91c2de882fe5c1c8446e0515fff91
DO $x04_020_install_fn$
DECLARE v_oid oid;
BEGIN
  v_oid := pg_catalog.to_regprocedure('public.arctor_model_formula_series_clock_x04_019_v1()')::oid;
  IF v_oid IS NULL THEN
    EXECUTE $x04_020_ddl_07$
CREATE OR REPLACE FUNCTION public.arctor_model_formula_series_clock_x04_019_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE o jsonb; n jsonb; v_live boolean; v_old_uid uuid; v_old_aid uuid; v_new_uid uuid; v_new_aid uuid;
  v_old_scope text; v_new_scope text;
BEGIN
 IF TG_TABLE_SCHEMA <> 'public' OR TG_TABLE_NAME <> 'activity_fact_calculation_rule_series_v1' THEN
   RAISE EXCEPTION 'X04_019_FORMULA_SERIES_UNEXPECTED_TABLE'; END IF;
 IF TG_OP <> 'INSERT' THEN
   o:=to_jsonb(OLD); v_old_uid:=OLD.owner_user_id; v_old_aid:=OLD.owner_actor_id; v_old_scope:=OLD.scope_code;
 END IF;
 IF TG_OP <> 'DELETE' THEN
   n:=to_jsonb(NEW); v_new_uid:=NEW.owner_user_id; v_new_aid:=NEW.owner_actor_id; v_new_scope:=NEW.scope_code;
 END IF;
 IF TG_OP='UPDATE' AND
    (o-'created_at'-'updated_at') IS NOT DISTINCT FROM (n-'created_at'-'updated_at') THEN
   RETURN NEW;
 END IF;
 SELECT EXISTS (SELECT 1 FROM public.activity_fact_calculation_rule_versions_v1
   WHERE rule_series_id=COALESCE((n->>'id')::uuid,(o->>'id')::uuid)
   AND status_code='published') INTO v_live;
 IF v_live THEN
   IF TG_OP <> 'INSERT' THEN
     IF v_old_scope='system' AND v_old_uid IS NULL AND v_old_aid IS NULL THEN
       PERFORM public.arctor_model_bump_x04_v1('rule_approval',NULL,NULL);
     ELSIF v_old_scope IN ('user','actor','personal') AND v_old_uid IS NOT NULL AND v_old_aid IS NOT NULL THEN
       PERFORM public.arctor_model_bump_x04_v1('rule_approval',v_old_uid,v_old_aid);
     ELSE RAISE EXCEPTION 'X04_019_FORMULA_SERIES_OLD_SCOPE_INVALID'; END IF;
   END IF;
   IF TG_OP <> 'DELETE' THEN
     IF v_new_scope='system' AND v_new_uid IS NULL AND v_new_aid IS NULL THEN
       PERFORM public.arctor_model_bump_x04_v1('rule_approval',NULL,NULL);
     ELSIF v_new_scope IN ('user','actor','personal') AND v_new_uid IS NOT NULL AND v_new_aid IS NOT NULL THEN
       PERFORM public.arctor_model_bump_x04_v1('rule_approval',v_new_uid,v_new_aid);
     ELSE RAISE EXCEPTION 'X04_019_FORMULA_SERIES_NEW_SCOPE_INVALID'; END IF;
   END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;
$x04_020_ddl_07$;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid=v_oid AND p.prokind='f' AND p.prosecdef
        AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
        AND p.proconfig @> ARRAY['search_path=pg_catalog']::text[]
        AND pg_catalog.md5(pg_catalog.replace(pg_catalog.replace(p.prosrc,E'\r\n',E'\n'),E'\r',E'\n'))='86d91c2de882fe5c1c8446e0515fff91'
    ) THEN
      RAISE EXCEPTION 'X04_020_STOP_FUNCTION_DRIFT:arctor_model_formula_series_clock_x04_019_v1';
    END IF;
  END IF;
END;
$x04_020_install_fn$;
REVOKE ALL ON FUNCTION public.arctor_model_formula_series_clock_x04_019_v1() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arctor_model_formula_series_clock_x04_019_v1() TO service_role;

-- 08 public.arctor_model_formula_version_clock_x04_019_v1(); exported_pg_md5=7bf37170767c4b34cfd53074adef6cc1; normalized_prosrc_md5=874204cc9c76bbd68ffff3c6553d7d21
DO $x04_020_install_fn$
DECLARE v_oid oid;
BEGIN
  v_oid := pg_catalog.to_regprocedure('public.arctor_model_formula_version_clock_x04_019_v1()')::oid;
  IF v_oid IS NULL THEN
    EXECUTE $x04_020_ddl_08$
CREATE OR REPLACE FUNCTION public.arctor_model_formula_version_clock_x04_019_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE o jsonb; n jsonb; old_live boolean:=false; new_live boolean:=false; v_sid uuid;
BEGIN
 IF TG_TABLE_SCHEMA <> 'public' OR TG_TABLE_NAME <> 'activity_fact_calculation_rule_versions_v1' THEN
   RAISE EXCEPTION 'X04_019_FORMULA_VERSION_UNEXPECTED_TABLE'; END IF;
 IF TG_OP <> 'INSERT' THEN o:=to_jsonb(OLD); old_live:=OLD.status_code='published'; END IF;
 IF TG_OP <> 'DELETE' THEN n:=to_jsonb(NEW); new_live:=NEW.status_code='published'; END IF;
 IF (old_live OR new_live) AND (TG_OP<>'UPDATE' OR
     (o-'created_at'-'updated_at'-'calculation_model_version_id')
       IS DISTINCT FROM
     (n-'created_at'-'updated_at'-'calculation_model_version_id')) THEN
   FOR v_sid IN SELECT DISTINCT sid FROM (
     SELECT (o->>'rule_series_id')::uuid sid WHERE old_live
     UNION ALL
     SELECT (n->>'rule_series_id')::uuid sid WHERE new_live
   ) s WHERE s.sid IS NOT NULL LOOP
      PERFORM public.arctor_model_x04_019_bump_formula_series_v1(v_sid);
   END LOOP;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;
$x04_020_ddl_08$;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid=v_oid AND p.prokind='f' AND p.prosecdef
        AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
        AND p.proconfig @> ARRAY['search_path=pg_catalog']::text[]
        AND pg_catalog.md5(pg_catalog.replace(pg_catalog.replace(p.prosrc,E'\r\n',E'\n'),E'\r',E'\n'))='874204cc9c76bbd68ffff3c6553d7d21'
    ) THEN
      RAISE EXCEPTION 'X04_020_STOP_FUNCTION_DRIFT:arctor_model_formula_version_clock_x04_019_v1';
    END IF;
  END IF;
END;
$x04_020_install_fn$;
REVOKE ALL ON FUNCTION public.arctor_model_formula_version_clock_x04_019_v1() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arctor_model_formula_version_clock_x04_019_v1() TO service_role;

-- 09 public.arctor_model_relation_type_clock_x04_019_v1(); exported_pg_md5=eaeded8a415fe98dfad49dc591207fcd; normalized_prosrc_md5=fa03d5a7862170b0ea30af045ee30a63
DO $x04_020_install_fn$
DECLARE v_oid oid;
BEGIN
  v_oid := pg_catalog.to_regprocedure('public.arctor_model_relation_type_clock_x04_019_v1()')::oid;
  IF v_oid IS NULL THEN
    EXECUTE $x04_020_ddl_09$
CREATE OR REPLACE FUNCTION public.arctor_model_relation_type_clock_x04_019_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE o jsonb; n jsonb; old_live boolean := false; new_live boolean := false;
BEGIN
 IF TG_TABLE_SCHEMA <> 'public' OR TG_TABLE_NAME <> 'value_object_relation_types' THEN
   RAISE EXCEPTION 'X04_019_RELATION_TYPE_UNEXPECTED_TABLE'; END IF;
 IF TG_OP <> 'INSERT' THEN
   o:=to_jsonb(OLD);
   old_live:=OLD.status='active' OR OLD.canonical_write_policy_code='enabled';
 END IF;
 IF TG_OP <> 'DELETE' THEN
   n:=to_jsonb(NEW);
   new_live:=NEW.status='active' OR NEW.canonical_write_policy_code='enabled';
 END IF;
 IF (old_live OR new_live) AND (TG_OP<>'UPDATE' OR
   (o-'created_at'-'updated_at') IS DISTINCT FROM (n-'created_at'-'updated_at')) THEN
   PERFORM public.arctor_model_bump_x04_v1('relation_review',NULL,NULL);
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;
$x04_020_ddl_09$;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid=v_oid AND p.prokind='f' AND p.prosecdef
        AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
        AND p.proconfig @> ARRAY['search_path=pg_catalog']::text[]
        AND pg_catalog.md5(pg_catalog.replace(pg_catalog.replace(p.prosrc,E'\r\n',E'\n'),E'\r',E'\n'))='fa03d5a7862170b0ea30af045ee30a63'
    ) THEN
      RAISE EXCEPTION 'X04_020_STOP_FUNCTION_DRIFT:arctor_model_relation_type_clock_x04_019_v1';
    END IF;
  END IF;
END;
$x04_020_install_fn$;
REVOKE ALL ON FUNCTION public.arctor_model_relation_type_clock_x04_019_v1() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arctor_model_relation_type_clock_x04_019_v1() TO service_role;

-- 10 public.arctor_model_versions_read_x04_v1(p_owner_user_id uuid, p_owner_actor_id uuid); exported_pg_md5=180a00abb45539ed31ced3aa966dff4d; normalized_prosrc_md5=f78698aedca6a02f0f0394b9e22d4d40
DO $x04_020_install_fn$
DECLARE v_oid oid;
BEGIN
  v_oid := pg_catalog.to_regprocedure('public.arctor_model_versions_read_x04_v1(uuid,uuid)')::oid;
  IF v_oid IS NULL THEN
    EXECUTE $x04_020_ddl_10$
CREATE OR REPLACE FUNCTION public.arctor_model_versions_read_x04_v1(p_owner_user_id uuid DEFAULT NULL::uuid, p_owner_actor_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(scope_code text, domain_code text, revision bigint, cache_ready boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF (p_owner_user_id IS NULL) <> (p_owner_actor_id IS NULL) THEN
    RAISE EXCEPTION 'X04_INVALID_ACTOR_QUERY' USING ERRCODE='22023';
  END IF;
  RETURN QUERY
    WITH requested(scope_value,domain_value,uid,aid,key_value) AS (
      VALUES
      ('system'::text,'catalog'::text,NULL::uuid,NULL::uuid,'system:catalog'::text),
      ('system'::text,'relation_review'::text,NULL::uuid,NULL::uuid,'system:relation_review'::text),
      ('system'::text,'rule_approval'::text,NULL::uuid,NULL::uuid,'system:rule_approval'::text),
      ('actor'::text,'catalog'::text,p_owner_user_id,p_owner_actor_id,
        CASE WHEN p_owner_user_id IS NULL THEN NULL ELSE
        'actor:'||p_owner_user_id::text||':'||p_owner_actor_id::text||':catalog' END),
      ('actor'::text,'relation_review'::text,p_owner_user_id,p_owner_actor_id,
        CASE WHEN p_owner_user_id IS NULL THEN NULL ELSE
        'actor:'||p_owner_user_id::text||':'||p_owner_actor_id::text||':relation_review' END)
    )
    SELECT r.scope_value,r.domain_value,coalesce(c.revision,0)::bigint,false::boolean
    FROM requested r
    LEFT JOIN public.arctor_model_versions_x04_v1 c ON c.version_key=r.key_value
    WHERE r.scope_value='system' OR p_owner_user_id IS NOT NULL;
END;
$function$;
$x04_020_ddl_10$;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid=v_oid AND p.prokind='f' AND p.prosecdef
        AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
        AND p.proconfig @> ARRAY['search_path=pg_catalog']::text[]
        AND pg_catalog.md5(pg_catalog.replace(pg_catalog.replace(p.prosrc,E'\r\n',E'\n'),E'\r',E'\n'))='f78698aedca6a02f0f0394b9e22d4d40'
    ) THEN
      RAISE EXCEPTION 'X04_020_STOP_FUNCTION_DRIFT:arctor_model_versions_read_x04_v1';
    END IF;
  END IF;
END;
$x04_020_install_fn$;
REVOKE ALL ON FUNCTION public.arctor_model_versions_read_x04_v1(uuid,uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arctor_model_versions_read_x04_v1(uuid,uuid) TO service_role;

-- 11 public.arctor_model_x04_019_bump_formula_series_v1(p_series_id uuid); exported_pg_md5=aff8dffb56c7f287e73fd75a008e24ac; normalized_prosrc_md5=e08c5e6bc0a204e318dac504dadf9c13
DO $x04_020_install_fn$
DECLARE v_oid oid;
BEGIN
  v_oid := pg_catalog.to_regprocedure('public.arctor_model_x04_019_bump_formula_series_v1(uuid)')::oid;
  IF v_oid IS NULL THEN
    EXECUTE $x04_020_ddl_11$
CREATE OR REPLACE FUNCTION public.arctor_model_x04_019_bump_formula_series_v1(p_series_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE v record;
BEGIN
 SELECT scope_code,owner_user_id,owner_actor_id INTO v
 FROM public.activity_fact_calculation_rule_series_v1 WHERE id=p_series_id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'X04_019_FORMULA_SERIES_MISSING'; END IF;
 IF v.scope_code='system' AND v.owner_user_id IS NULL AND v.owner_actor_id IS NULL THEN
   PERFORM public.arctor_model_bump_x04_v1('rule_approval',NULL,NULL);
 ELSIF v.scope_code IN ('user','actor','personal') AND v.owner_user_id IS NOT NULL AND v.owner_actor_id IS NOT NULL THEN
   PERFORM public.arctor_model_bump_x04_v1('rule_approval',v.owner_user_id,v.owner_actor_id);
 ELSE RAISE EXCEPTION 'X04_019_FORMULA_SERIES_SCOPE_UNSUPPORTED'; END IF;
END;
$function$;
$x04_020_ddl_11$;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid=v_oid AND p.prokind='f' AND p.prosecdef
        AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
        AND p.proconfig @> ARRAY['search_path=pg_catalog']::text[]
        AND pg_catalog.md5(pg_catalog.replace(pg_catalog.replace(p.prosrc,E'\r\n',E'\n'),E'\r',E'\n'))='e08c5e6bc0a204e318dac504dadf9c13'
    ) THEN
      RAISE EXCEPTION 'X04_020_STOP_FUNCTION_DRIFT:arctor_model_x04_019_bump_formula_series_v1';
    END IF;
  END IF;
END;
$x04_020_install_fn$;
REVOKE ALL ON FUNCTION public.arctor_model_x04_019_bump_formula_series_v1(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arctor_model_x04_019_bump_formula_series_v1(uuid) TO service_role;

-- 12 public.arctor_model_zone_review_clock_x04_019_v1(); exported_pg_md5=75107e4f086001faad97e7c23b242601; normalized_prosrc_md5=335ed0b5c7bab9e85023562e99f975ce
DO $x04_020_install_fn$
DECLARE v_oid oid;
BEGIN
  v_oid := pg_catalog.to_regprocedure('public.arctor_model_zone_review_clock_x04_019_v1()')::oid;
  IF v_oid IS NULL THEN
    EXECUTE $x04_020_ddl_12$
CREATE OR REPLACE FUNCTION public.arctor_model_zone_review_clock_x04_019_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE o jsonb; n jsonb; v record; v_id uuid; v_key text; v_marked text[] := ARRAY[]::text[];
BEGIN
 IF TG_TABLE_SCHEMA <> 'public' OR TG_TABLE_NAME <> 'value_object_relation_zone_reviews' THEN
   RAISE EXCEPTION 'X04_019_ZONE_UNEXPECTED_TRIGGER_LOCATION';
 END IF;
 IF TG_OP <> 'INSERT' THEN o := to_jsonb(OLD); END IF;
 IF TG_OP <> 'DELETE' THEN n := to_jsonb(NEW); END IF;
 IF TG_OP='UPDATE' AND
    (o-'created_at'-'updated_at') IS NOT DISTINCT FROM (n-'created_at'-'updated_at')
 THEN RETURN NEW; END IF;
 FOR v_id IN SELECT DISTINCT x.value_object_id FROM (
    SELECT NULLIF(o->>'value_object_id','')::uuid AS value_object_id
    UNION ALL
    SELECT NULLIF(n->>'value_object_id','')::uuid
 ) AS x WHERE x.value_object_id IS NOT NULL
 LOOP
   SELECT scope_code,origin_type_code,owner_user_id,owner_actor_id
   INTO v FROM public.value_objects WHERE id=v_id FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'X04_019_ZONE_ON_NOT_FOUND_FAIL_CLOSED'; END IF;
   IF v.scope_code='global' AND v.origin_type_code='system_model'
     AND v.owner_user_id IS NULL AND v.owner_actor_id IS NULL THEN
      v_key := 'system';
   ELSIF v.scope_code='actor' AND v.owner_user_id IS NOT NULL AND v.owner_actor_id IS NOT NULL THEN
      v_key := 'actor:'||v.owner_user_id::text||':'||v.owner_actor_id::text;
   ELSE RAISE EXCEPTION 'X04_019_ZONE_OWNER_SCOPE_UNSUPPORTED'; END IF;
   IF NOT v_key=ANY(v_marked) THEN
      PERFORM public.arctor_model_bump_x04_v1('relation_review',v.owner_user_id,v.owner_actor_id);
      v_marked := array_append(v_marked,v_key);
   END IF;
 END LOOP;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;
$x04_020_ddl_12$;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid=v_oid AND p.prokind='f' AND p.prosecdef
        AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
        AND p.proconfig @> ARRAY['search_path=pg_catalog']::text[]
        AND pg_catalog.md5(pg_catalog.replace(pg_catalog.replace(p.prosrc,E'\r\n',E'\n'),E'\r',E'\n'))='335ed0b5c7bab9e85023562e99f975ce'
    ) THEN
      RAISE EXCEPTION 'X04_020_STOP_FUNCTION_DRIFT:arctor_model_zone_review_clock_x04_019_v1';
    END IF;
  END IF;
END;
$x04_020_install_fn$;
REVOKE ALL ON FUNCTION public.arctor_model_zone_review_clock_x04_019_v1() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arctor_model_zone_review_clock_x04_019_v1() TO service_role;

-- Triggers installed only when absent; existing definitions are not overwritten.

-- public.activity_fact_calculation_rule_series_v1.arctor_x04_019_formula_series_clock exported trigger MD5=c785d0420537bf9d78a808ccc4f8627a
DO $x04_020_trigger_install$
BEGIN
 IF pg_catalog.to_regclass('public.activity_fact_calculation_rule_series_v1') IS NULL THEN
   RAISE EXCEPTION 'X04_020_STOP_DEPENDENCY_TABLE_MISSING:public.activity_fact_calculation_rule_series_v1';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.activity_fact_calculation_rule_series_v1'::regclass AND t.tgname='arctor_x04_019_formula_series_clock'
 ) THEN
   EXECUTE 'CREATE TRIGGER arctor_x04_019_formula_series_clock AFTER INSERT OR DELETE OR UPDATE ON public.activity_fact_calculation_rule_series_v1 FOR EACH ROW EXECUTE FUNCTION public.arctor_model_formula_series_clock_x04_019_v1();';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.activity_fact_calculation_rule_series_v1'::regclass AND t.tgname='arctor_x04_019_formula_series_clock'
     AND NOT t.tgisinternal AND t.tgenabled='O'
     AND pg_catalog.md5(pg_catalog.pg_get_triggerdef(t.oid,true)||';')='c785d0420537bf9d78a808ccc4f8627a'
 ) THEN
   RAISE EXCEPTION 'X04_020_STOP_TRIGGER_DRIFT:arctor_x04_019_formula_series_clock';
 END IF;
END;
$x04_020_trigger_install$;

-- public.activity_fact_calculation_rule_versions_v1.arctor_x04_019_formula_version_clock exported trigger MD5=623b9b95a2e8e223c354763aaaf539c4
DO $x04_020_trigger_install$
BEGIN
 IF pg_catalog.to_regclass('public.activity_fact_calculation_rule_versions_v1') IS NULL THEN
   RAISE EXCEPTION 'X04_020_STOP_DEPENDENCY_TABLE_MISSING:public.activity_fact_calculation_rule_versions_v1';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.activity_fact_calculation_rule_versions_v1'::regclass AND t.tgname='arctor_x04_019_formula_version_clock'
 ) THEN
   EXECUTE 'CREATE TRIGGER arctor_x04_019_formula_version_clock AFTER INSERT OR DELETE OR UPDATE ON public.activity_fact_calculation_rule_versions_v1 FOR EACH ROW EXECUTE FUNCTION public.arctor_model_formula_version_clock_x04_019_v1();';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.activity_fact_calculation_rule_versions_v1'::regclass AND t.tgname='arctor_x04_019_formula_version_clock'
     AND NOT t.tgisinternal AND t.tgenabled='O'
     AND pg_catalog.md5(pg_catalog.pg_get_triggerdef(t.oid,true)||';')='623b9b95a2e8e223c354763aaaf539c4'
 ) THEN
   RAISE EXCEPTION 'X04_020_STOP_TRIGGER_DRIFT:arctor_x04_019_formula_version_clock';
 END IF;
END;
$x04_020_trigger_install$;

-- public.concept_aliases.arctor_x04_017_system_alias_clock exported trigger MD5=b18c2cb7cf7266acadc30173bee3835a
DO $x04_020_trigger_install$
BEGIN
 IF pg_catalog.to_regclass('public.concept_aliases') IS NULL THEN
   RAISE EXCEPTION 'X04_020_STOP_DEPENDENCY_TABLE_MISSING:public.concept_aliases';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.concept_aliases'::regclass AND t.tgname='arctor_x04_017_system_alias_clock'
 ) THEN
   EXECUTE 'CREATE TRIGGER arctor_x04_017_system_alias_clock AFTER INSERT OR DELETE OR UPDATE ON public.concept_aliases FOR EACH ROW EXECUTE FUNCTION public.arctor_model_alias_clock_x04_017_v1();';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.concept_aliases'::regclass AND t.tgname='arctor_x04_017_system_alias_clock'
     AND NOT t.tgisinternal AND t.tgenabled='O'
     AND pg_catalog.md5(pg_catalog.pg_get_triggerdef(t.oid,true)||';')='b18c2cb7cf7266acadc30173bee3835a'
 ) THEN
   RAISE EXCEPTION 'X04_020_STOP_TRIGGER_DRIFT:arctor_x04_017_system_alias_clock';
 END IF;
END;
$x04_020_trigger_install$;

-- public.concept_aliases.arctor_x04_018_actor_alias_clock exported trigger MD5=9a0eafc990464878c054fa1db16ee491
DO $x04_020_trigger_install$
BEGIN
 IF pg_catalog.to_regclass('public.concept_aliases') IS NULL THEN
   RAISE EXCEPTION 'X04_020_STOP_DEPENDENCY_TABLE_MISSING:public.concept_aliases';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.concept_aliases'::regclass AND t.tgname='arctor_x04_018_actor_alias_clock'
 ) THEN
   EXECUTE 'CREATE TRIGGER arctor_x04_018_actor_alias_clock AFTER INSERT OR DELETE OR UPDATE ON public.concept_aliases FOR EACH ROW EXECUTE FUNCTION public.arctor_model_actor_alias_clock_x04_018_v1();';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.concept_aliases'::regclass AND t.tgname='arctor_x04_018_actor_alias_clock'
     AND NOT t.tgisinternal AND t.tgenabled='O'
     AND pg_catalog.md5(pg_catalog.pg_get_triggerdef(t.oid,true)||';')='9a0eafc990464878c054fa1db16ee491'
 ) THEN
   RAISE EXCEPTION 'X04_020_STOP_TRIGGER_DRIFT:arctor_x04_018_actor_alias_clock';
 END IF;
END;
$x04_020_trigger_install$;

-- public.relation_evidence.arctor_x04_version_relation_evidence exported trigger MD5=a7db6b4ba720224c93b6adb58aba7e95
DO $x04_020_trigger_install$
BEGIN
 IF pg_catalog.to_regclass('public.relation_evidence') IS NULL THEN
   RAISE EXCEPTION 'X04_020_STOP_DEPENDENCY_TABLE_MISSING:public.relation_evidence';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.relation_evidence'::regclass AND t.tgname='arctor_x04_version_relation_evidence'
 ) THEN
   EXECUTE 'CREATE TRIGGER arctor_x04_version_relation_evidence AFTER INSERT OR DELETE OR UPDATE ON public.relation_evidence FOR EACH ROW EXECUTE FUNCTION public.arctor_model_clock_change_x04_v1();';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.relation_evidence'::regclass AND t.tgname='arctor_x04_version_relation_evidence'
     AND NOT t.tgisinternal AND t.tgenabled='O'
     AND pg_catalog.md5(pg_catalog.pg_get_triggerdef(t.oid,true)||';')='a7db6b4ba720224c93b6adb58aba7e95'
 ) THEN
   RAISE EXCEPTION 'X04_020_STOP_TRIGGER_DRIFT:arctor_x04_version_relation_evidence';
 END IF;
END;
$x04_020_trigger_install$;

-- public.system_value_object_relations.arctor_x04_version_system_relations exported trigger MD5=73f204d484143a6ed8017e3be327bcf6
DO $x04_020_trigger_install$
BEGIN
 IF pg_catalog.to_regclass('public.system_value_object_relations') IS NULL THEN
   RAISE EXCEPTION 'X04_020_STOP_DEPENDENCY_TABLE_MISSING:public.system_value_object_relations';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.system_value_object_relations'::regclass AND t.tgname='arctor_x04_version_system_relations'
 ) THEN
   EXECUTE 'CREATE TRIGGER arctor_x04_version_system_relations AFTER INSERT OR DELETE OR UPDATE ON public.system_value_object_relations FOR EACH ROW EXECUTE FUNCTION public.arctor_model_clock_change_x04_v1();';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.system_value_object_relations'::regclass AND t.tgname='arctor_x04_version_system_relations'
     AND NOT t.tgisinternal AND t.tgenabled='O'
     AND pg_catalog.md5(pg_catalog.pg_get_triggerdef(t.oid,true)||';')='73f204d484143a6ed8017e3be327bcf6'
 ) THEN
   RAISE EXCEPTION 'X04_020_STOP_TRIGGER_DRIFT:arctor_x04_version_system_relations';
 END IF;
END;
$x04_020_trigger_install$;

-- public.value_object_analytics_effect_rules_v1.arctor_x04_019_effect_rule_clock exported trigger MD5=f25b7b708e21ed1ec26eec8cf408259e
DO $x04_020_trigger_install$
BEGIN
 IF pg_catalog.to_regclass('public.value_object_analytics_effect_rules_v1') IS NULL THEN
   RAISE EXCEPTION 'X04_020_STOP_DEPENDENCY_TABLE_MISSING:public.value_object_analytics_effect_rules_v1';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.value_object_analytics_effect_rules_v1'::regclass AND t.tgname='arctor_x04_019_effect_rule_clock'
 ) THEN
   EXECUTE 'CREATE TRIGGER arctor_x04_019_effect_rule_clock AFTER INSERT OR DELETE OR UPDATE ON public.value_object_analytics_effect_rules_v1 FOR EACH ROW EXECUTE FUNCTION public.arctor_model_effect_rule_clock_x04_019_v1();';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.value_object_analytics_effect_rules_v1'::regclass AND t.tgname='arctor_x04_019_effect_rule_clock'
     AND NOT t.tgisinternal AND t.tgenabled='O'
     AND pg_catalog.md5(pg_catalog.pg_get_triggerdef(t.oid,true)||';')='f25b7b708e21ed1ec26eec8cf408259e'
 ) THEN
   RAISE EXCEPTION 'X04_020_STOP_TRIGGER_DRIFT:arctor_x04_019_effect_rule_clock';
 END IF;
END;
$x04_020_trigger_install$;

-- public.value_object_relation_types.arctor_x04_019_relation_type_clock exported trigger MD5=8b9eb9641f018754744ed4a2c2bbae78
DO $x04_020_trigger_install$
BEGIN
 IF pg_catalog.to_regclass('public.value_object_relation_types') IS NULL THEN
   RAISE EXCEPTION 'X04_020_STOP_DEPENDENCY_TABLE_MISSING:public.value_object_relation_types';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.value_object_relation_types'::regclass AND t.tgname='arctor_x04_019_relation_type_clock'
 ) THEN
   EXECUTE 'CREATE TRIGGER arctor_x04_019_relation_type_clock AFTER INSERT OR DELETE OR UPDATE ON public.value_object_relation_types FOR EACH ROW EXECUTE FUNCTION public.arctor_model_relation_type_clock_x04_019_v1();';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.value_object_relation_types'::regclass AND t.tgname='arctor_x04_019_relation_type_clock'
     AND NOT t.tgisinternal AND t.tgenabled='O'
     AND pg_catalog.md5(pg_catalog.pg_get_triggerdef(t.oid,true)||';')='8b9eb9641f018754744ed4a2c2bbae78'
 ) THEN
   RAISE EXCEPTION 'X04_020_STOP_TRIGGER_DRIFT:arctor_x04_019_relation_type_clock';
 END IF;
END;
$x04_020_trigger_install$;

-- public.value_object_relation_zone_reviews.arctor_x04_019_zone_review_clock exported trigger MD5=c28f9f76754bfa3c71cdf3719aeff03c
DO $x04_020_trigger_install$
BEGIN
 IF pg_catalog.to_regclass('public.value_object_relation_zone_reviews') IS NULL THEN
   RAISE EXCEPTION 'X04_020_STOP_DEPENDENCY_TABLE_MISSING:public.value_object_relation_zone_reviews';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.value_object_relation_zone_reviews'::regclass AND t.tgname='arctor_x04_019_zone_review_clock'
 ) THEN
   EXECUTE 'CREATE TRIGGER arctor_x04_019_zone_review_clock BEFORE INSERT OR DELETE OR UPDATE ON public.value_object_relation_zone_reviews FOR EACH ROW EXECUTE FUNCTION public.arctor_model_zone_review_clock_x04_019_v1();';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.value_object_relation_zone_reviews'::regclass AND t.tgname='arctor_x04_019_zone_review_clock'
     AND NOT t.tgisinternal AND t.tgenabled='O'
     AND pg_catalog.md5(pg_catalog.pg_get_triggerdef(t.oid,true)||';')='c28f9f76754bfa3c71cdf3719aeff03c'
 ) THEN
   RAISE EXCEPTION 'X04_020_STOP_TRIGGER_DRIFT:arctor_x04_019_zone_review_clock';
 END IF;
END;
$x04_020_trigger_install$;

-- public.value_object_relations.arctor_x04_version_actor_relations exported trigger MD5=e2c5d8c0b358e524fe7035d4b2e35e39
DO $x04_020_trigger_install$
BEGIN
 IF pg_catalog.to_regclass('public.value_object_relations') IS NULL THEN
   RAISE EXCEPTION 'X04_020_STOP_DEPENDENCY_TABLE_MISSING:public.value_object_relations';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.value_object_relations'::regclass AND t.tgname='arctor_x04_version_actor_relations'
 ) THEN
   EXECUTE 'CREATE TRIGGER arctor_x04_version_actor_relations AFTER INSERT OR DELETE OR UPDATE ON public.value_object_relations FOR EACH ROW EXECUTE FUNCTION public.arctor_model_clock_change_x04_v1();';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.value_object_relations'::regclass AND t.tgname='arctor_x04_version_actor_relations'
     AND NOT t.tgisinternal AND t.tgenabled='O'
     AND pg_catalog.md5(pg_catalog.pg_get_triggerdef(t.oid,true)||';')='e2c5d8c0b358e524fe7035d4b2e35e39'
 ) THEN
   RAISE EXCEPTION 'X04_020_STOP_TRIGGER_DRIFT:arctor_x04_version_actor_relations';
 END IF;
END;
$x04_020_trigger_install$;

-- public.value_objects.arctor_x04_version_value_objects exported trigger MD5=af6b75c0468d4d6d162e770574399c69
DO $x04_020_trigger_install$
BEGIN
 IF pg_catalog.to_regclass('public.value_objects') IS NULL THEN
   RAISE EXCEPTION 'X04_020_STOP_DEPENDENCY_TABLE_MISSING:public.value_objects';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.value_objects'::regclass AND t.tgname='arctor_x04_version_value_objects'
 ) THEN
   EXECUTE 'CREATE TRIGGER arctor_x04_version_value_objects AFTER INSERT OR DELETE OR UPDATE ON public.value_objects FOR EACH ROW EXECUTE FUNCTION public.arctor_model_clock_change_x04_v1();';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid='public.value_objects'::regclass AND t.tgname='arctor_x04_version_value_objects'
     AND NOT t.tgisinternal AND t.tgenabled='O'
     AND pg_catalog.md5(pg_catalog.pg_get_triggerdef(t.oid,true)||';')='af6b75c0468d4d6d162e770574399c69'
 ) THEN
   RAISE EXCEPTION 'X04_020_STOP_TRIGGER_DRIFT:arctor_x04_version_value_objects';
 END IF;
END;
$x04_020_trigger_install$;

-- Reproduce already accepted X04-019/020 privilege boundaries, without row DML.
-- These grants are not inferred from the export of clock functions: they came from
-- previously completed owner-approved REVOKE receipts in X04-019 and X04-020.
REVOKE TRUNCATE, TRIGGER ON TABLE
 public.system_value_object_relations,
 public.value_object_relation_zone_reviews,
 public.activity_fact_calculation_rule_series_v1,
 public.activity_fact_calculation_rule_versions_v1
FROM service_role;
REVOKE TRUNCATE, TRIGGER ON TABLE
 public.value_object_definition_versions,
 public.value_object_hierarchy_events,
 public.value_object_tree_operation_items,
 public.value_object_tree_operations,
 public.value_objects
FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE
 public.value_object_definition_versions,
 public.value_object_hierarchy_events,
 public.value_object_tree_operations,
 public.value_object_tree_operation_items
FROM service_role;

DO $x04_020_writer_privileges_guard$
DECLARE p text; t text;
BEGIN
 FOREACH t IN ARRAY ARRAY[
   'system_value_object_relations','value_object_relation_zone_reviews',
   'activity_fact_calculation_rule_series_v1','activity_fact_calculation_rule_versions_v1',
   'value_object_definition_versions','value_object_hierarchy_events',
   'value_object_tree_operation_items','value_object_tree_operations','value_objects'
 ] LOOP
   IF pg_catalog.has_table_privilege('service_role','public.'||t,'TRUNCATE')
     OR pg_catalog.has_table_privilege('service_role','public.'||t,'TRIGGER') THEN
     RAISE EXCEPTION 'X04_020_STOP_PRIVILEGE_BYPASS:%',t;
   END IF;
 END LOOP;
 FOREACH t IN ARRAY ARRAY[
   'value_object_definition_versions','value_object_hierarchy_events',
   'value_object_tree_operation_items','value_object_tree_operations'
 ] LOOP
   IF pg_catalog.has_table_privilege('service_role','public.'||t,'INSERT,UPDATE,DELETE') THEN
     RAISE EXCEPTION 'X04_020_STOP_AUX_DML:%',t;
   END IF;
 END LOOP;
END;
$x04_020_writer_privileges_guard$;

-- Checks that roles did not obtain write access to the clock version table.
DO $x04_020_final_guard$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_catalog.pg_class
          WHERE oid='public.arctor_model_versions_x04_v1'::regclass) THEN
    RAISE EXCEPTION 'X04_020_STOP_VERSION_TABLE_RLS';
  END IF;
  IF NOT pg_catalog.has_table_privilege('service_role','public.arctor_model_versions_x04_v1','SELECT') THEN
    RAISE EXCEPTION 'X04_020_STOP_SERVICE_SELECT';
  END IF;
  IF pg_catalog.has_table_privilege('service_role','public.arctor_model_versions_x04_v1','INSERT,UPDATE,DELETE')
    OR pg_catalog.has_table_privilege('service_role','public.arctor_model_versions_x04_v1','TRUNCATE')
    OR pg_catalog.has_table_privilege('service_role','public.arctor_model_versions_x04_v1','TRIGGER') THEN
    RAISE EXCEPTION 'X04_020_STOP_SERVICE_CLOCK_DML';
  END IF;
  IF pg_catalog.has_table_privilege('anon','public.arctor_model_versions_x04_v1','SELECT')
    OR pg_catalog.has_table_privilege('authenticated','public.arctor_model_versions_x04_v1','SELECT') THEN
    RAISE EXCEPTION 'X04_020_STOP_CLOCK_PUBLIC_READ';
  END IF;
END;
$x04_020_final_guard$;
COMMIT;
