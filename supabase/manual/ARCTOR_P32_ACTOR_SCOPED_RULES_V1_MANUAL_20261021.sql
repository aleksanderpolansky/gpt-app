-- ARCTor P3.2. MANUAL DATABASE MIGRATION. RUN ONCE after reviewing in Supabase SQL Editor.
-- No AI calls. No activity events or facts. Does not alter existing P4A preferences/drafts.
-- Before installing: SELECT to_regclass('public.actor_ai_scoped_rules_v1'),
--   to_regclass('public.actor_ai_scoped_rule_revisions_v1'); Both must be NULL.
BEGIN;
CREATE TABLE public.actor_ai_scoped_rules_v1 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_user_id uuid NOT NULL,
 owner_actor_id uuid NOT NULL,
 rule_code text NOT NULL CHECK (rule_code ~ '^[a-z][a-z0-9_]{2,47}$'),
 current_revision integer NOT NULL DEFAULT 1 CHECK (current_revision > 0),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','disabled')),
 document_json jsonb NOT NULL CHECK (jsonb_typeof(document_json) = 'object'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(owner_user_id,owner_actor_id,rule_code)
);
CREATE INDEX actor_ai_scoped_rules_owner_idx_v1
 ON public.actor_ai_scoped_rules_v1(owner_user_id,owner_actor_id,updated_at DESC);

CREATE TABLE public.actor_ai_scoped_rule_revisions_v1 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 rule_id uuid NOT NULL REFERENCES public.actor_ai_scoped_rules_v1(id),
 rule_code text NOT NULL,
 owner_user_id uuid NOT NULL,
 owner_actor_id uuid NOT NULL,
 revision integer NOT NULL CHECK (revision > 0),
 document_json jsonb NOT NULL,
 action_code text NOT NULL CHECK (action_code IN ('save','disable')),
 changed_by_actor_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(rule_id, revision)
);
CREATE INDEX actor_ai_scoped_revisions_owner_idx_v1
 ON public.actor_ai_scoped_rule_revisions_v1(owner_user_id,owner_actor_id,rule_code,revision DESC);

-- Both tables are server-only. No public PostgREST access.
ALTER TABLE public.actor_ai_scoped_rules_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actor_ai_scoped_rule_revisions_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.actor_ai_scoped_rules_v1 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.actor_ai_scoped_rule_revisions_v1 FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actor_ai_scoped_rules_v1 TO service_role;
GRANT SELECT, INSERT ON public.actor_ai_scoped_rule_revisions_v1 TO service_role;

CREATE FUNCTION public.arctor_actor_scoped_rule_revision_immutable_v1()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'P32_REVISION_IMMUTABLE' USING ERRCODE='23514';
END $$;
CREATE TRIGGER trg_actor_ai_scoped_rule_revision_immutable_v1
 BEFORE UPDATE OR DELETE ON public.actor_ai_scoped_rule_revisions_v1
 FOR EACH ROW EXECUTE FUNCTION public.arctor_actor_scoped_rule_revision_immutable_v1();
REVOKE ALL ON FUNCTION public.arctor_actor_scoped_rule_revision_immutable_v1() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.arctor_actor_scoped_rule_save_v1(
 p_owner_user_id uuid,
 p_owner_actor_id uuid,
 p_rule_code text,
 p_expected_revision integer,
 p_action text,
 p_document jsonb
)
RETURNS TABLE(saved_revision integer, saved_status text)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE
 v_old public.actor_ai_scoped_rules_v1%ROWTYPE;
 v_id uuid;
 v_doc jsonb;
 v_revision integer;
 v_status text;
 v_match jsonb;
 v_values jsonb;
 v_text text;
BEGIN
 IF p_owner_user_id IS NULL OR p_owner_actor_id IS NULL OR
    COALESCE(p_rule_code,'') !~ '^[a-z][a-z0-9_]{2,47}$' OR
    COALESCE(p_action,'') NOT IN ('save','disable') OR
    p_expected_revision IS NULL OR p_expected_revision < 0 OR p_expected_revision > 1000000 THEN
   RAISE EXCEPTION 'P32_INVALID_ARGUMENT' USING ERRCODE='P0001';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.actor_public_profiles pp
   JOIN public.actors a ON a.id=pp.actor_id AND a.status='active'
   WHERE pp.owner_user_id=p_owner_user_id AND pp.actor_id=p_owner_actor_id
     AND pp.profile_kind IN ('personal','avatar')
 ) THEN RAISE EXCEPTION 'P32_ACTOR_NOT_OWNED_OR_INACTIVE' USING ERRCODE='P0001'; END IF;

 -- Serializes new-row insert races as well as edits. No application-level locking needed.
 PERFORM pg_advisory_xact_lock(hashtextextended(
     p_owner_user_id::text || ':' || p_owner_actor_id::text || ':' || p_rule_code, 0));
 SELECT * INTO v_old FROM public.actor_ai_scoped_rules_v1
 WHERE owner_user_id=p_owner_user_id AND owner_actor_id=p_owner_actor_id AND rule_code=p_rule_code
 FOR UPDATE;
 IF FOUND THEN
   IF v_old.current_revision <> p_expected_revision THEN
     RAISE EXCEPTION 'P32_REVISION_CONFLICT' USING ERRCODE='P0001';
   END IF;
 ELSE
   IF p_expected_revision <> 0 OR p_action <> 'save' THEN
     RAISE EXCEPTION 'P32_REVISION_CONFLICT' USING ERRCODE='P0001';
   END IF;
 END IF;

 IF p_action = 'save' THEN
   IF p_document IS NULL OR jsonb_typeof(p_document) <> 'object'
      OR COALESCE(p_document->>'version','') <> 'arctor_actor_scoped_rule_v1'
      OR COALESCE(p_document->>'domainCode','') <> 'personal_activities'
      OR COALESCE(p_document->>'surfaceCode','') <> 'activity_quick_capture'
      OR COALESCE(p_document->>'eventType','') <> 'raw_activity_submitted'
      OR COALESCE(p_document->>'localeCode','') NOT IN ('ru','pl','uk','en','de','es','cs')
      OR COALESCE(p_document->>'inputMode','') NOT IN ('text_activity','voice_command')
      OR COALESCE(p_document->>'actionCode','') <> 'expand_raw_activity_text'
      OR jsonb_typeof(p_document->'matcher') IS DISTINCT FROM 'object' THEN
       RAISE EXCEPTION 'P32_INVALID_DOCUMENT' USING ERRCODE='P0001';
   END IF;
   v_match := p_document->'matcher';
   v_values := v_match->'lexemes';
   v_text := p_document->>'expandedText';
   IF jsonb_typeof(v_values) IS DISTINCT FROM 'array' THEN
     RAISE EXCEPTION 'P32_INVALID_LEXEMES' USING ERRCODE='P0001';
   END IF;
   IF COALESCE(v_match->>'type','') NOT IN ('exact_phrase','lexeme_set')
      OR jsonb_array_length(v_values) NOT BETWEEN 1 AND 8
      OR (v_match->>'type'='exact_phrase' AND jsonb_array_length(v_values)<>1)
      OR v_text IS NULL OR length(v_text) NOT BETWEEN 1 AND 600
      OR v_text <> btrim(v_text) OR v_text ~ '[[:cntrl:]]' THEN
     RAISE EXCEPTION 'P32_INVALID_DOCUMENT' USING ERRCODE='P0001';
   END IF;
   IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_values) AS elem(value)
      WHERE jsonb_typeof(elem.value) <> 'string'
        OR length(elem.value #>> '{}') NOT BETWEEN 1 AND 80
        OR (elem.value #>> '{}') <> btrim(elem.value #>> '{}')
        OR (elem.value #>> '{}') ~ '[[:cntrl:]]'
   ) OR EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_values) AS e(word)
      GROUP BY lower(e.word) HAVING count(*)>1
   ) THEN RAISE EXCEPTION 'P32_INVALID_LEXEMES' USING ERRCODE='P0001'; END IF;
   v_doc := p_document;
   v_status := 'draft';
 ELSE
   v_doc := v_old.document_json;
   v_status := 'disabled';
 END IF;

 IF v_old.id IS NULL THEN
   INSERT INTO public.actor_ai_scoped_rules_v1
     (owner_user_id,owner_actor_id,rule_code,current_revision,status,document_json)
   VALUES(p_owner_user_id,p_owner_actor_id,p_rule_code,1,v_status,v_doc)
   RETURNING id,current_revision INTO v_id,v_revision;
 ELSE
   UPDATE public.actor_ai_scoped_rules_v1
     SET current_revision=v_old.current_revision+1, status=v_status,
         document_json=v_doc,updated_at=clock_timestamp()
   WHERE id=v_old.id
   RETURNING id,current_revision INTO v_id,v_revision;
 END IF;
 INSERT INTO public.actor_ai_scoped_rule_revisions_v1
   (rule_id,rule_code,owner_user_id,owner_actor_id,revision,document_json,action_code,changed_by_actor_id)
 VALUES(v_id,p_rule_code,p_owner_user_id,p_owner_actor_id,v_revision,v_doc,p_action,p_owner_actor_id);
 saved_revision := v_revision;
 saved_status := v_status;
 RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.arctor_actor_scoped_rule_save_v1(uuid,uuid,text,integer,text,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.arctor_actor_scoped_rule_save_v1(uuid,uuid,text,integer,text,jsonb)
 TO service_role;
COMMIT;
