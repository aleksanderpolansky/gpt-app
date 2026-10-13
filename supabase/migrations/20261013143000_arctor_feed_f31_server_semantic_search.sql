-- ARCTor FEED F3.1A • SEMANTIC SERVER SEARCH • 2026-10-13
-- Intended application: Supabase SQL Editor after 01_PRECHECK returns PASS.
-- Adds a reverse lookup index and one read-only service-role RPC.
-- Does NOT create/modify/delete facts or publications, enable automatic facts,
-- or modify the F1.2 triggers or shared fact executor.
BEGIN;
SET LOCAL lock_timeout = '8s';
SET LOCAL statement_timeout = '90s';

DO $gate$
BEGIN
 IF to_regclass('public.message_object_relations') IS NULL
    OR to_regclass('public.activity_object_facts') IS NULL
    OR to_regclass('public.activity_events') IS NULL
    OR to_regclass('public.message_objects') IS NULL
    OR to_regclass('public.value_objects') IS NULL
    OR to_regclass('public.message_object_distributions') IS NULL
    OR to_regclass('public.actors') IS NULL
    OR to_regclass('public.actor_public_profiles') IS NULL
    OR to_regclass('public.organizations') IS NULL THEN
    RAISE EXCEPTION 'ARCTOR_FEED_F31_REQUIRED_TABLE_MISSING';
 END IF;
 IF to_regprocedure('public.arctor_feed_search_publications_f31_v1(uuid[],uuid,uuid,numeric,numeric,text,integer,timestamptz,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'ARCTOR_FEED_F31_ALREADY_INSTALLED_STOP';
 END IF;
 IF to_regprocedure('public.arctor_feed_sync_links_for_message_f12_v1(uuid)') IS NULL THEN
    RAISE EXCEPTION 'ARCTOR_FEED_F31_REQUIRES_F12';
 END IF;
END;
$gate$;

-- Existing unique index (message_object_id, relation_code, target_value_object_id)
-- is not useful for an inverse lookup starting with target_value_object_id.
CREATE INDEX IF NOT EXISTS arctor_feed_f31_reverse_leaf_message_idx
ON public.message_object_relations(target_value_object_id, message_object_id)
WHERE relation_code = 'commercial_fact_leaf'
  AND target_value_object_id IS NOT NULL;

-- One server-only read function: search tree -> confirmed source facts ->
-- linked publications. Multiple conditions must belong to ONE activity event.
-- Numeric values ALWAYS come from activity_object_facts; never from tag metadata.
CREATE FUNCTION public.arctor_feed_search_publications_f31_v1(
  p_object_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_metric_object_id uuid DEFAULT NULL,
  p_parameter_definition_id uuid DEFAULT NULL,
  p_min_value numeric DEFAULT NULL,
  p_max_value numeric DEFAULT NULL,
  p_unit_code text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_before_published_at timestamptz DEFAULT NULL,
  p_before_message_id uuid DEFAULT NULL
)
RETURNS TABLE (
  message_object_id uuid,
  published_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $fn$
DECLARE
  v_object_ids uuid[];
  v_required integer;
  v_limit integer;
  v_has_metric boolean;
  v_unit text;
BEGIN
  SELECT coalesce(array_agg(DISTINCT id), ARRAY[]::uuid[])
    INTO v_object_ids
  FROM unnest(coalesce(p_object_ids, ARRAY[]::uuid[])) AS t(id)
  WHERE id IS NOT NULL;
  v_has_metric := p_metric_object_id IS NOT NULL;
  v_required := cardinality(v_object_ids) + CASE WHEN v_has_metric THEN 1 ELSE 0 END;
  v_unit := lower(btrim(coalesce(p_unit_code,'')));
  v_limit := coalesce(p_limit, 20);

  IF cardinality(coalesce(p_object_ids, ARRAY[]::uuid[])) > 8
     OR cardinality(v_object_ids) <> cardinality(coalesce(p_object_ids, ARRAY[]::uuid[]))
     OR v_required < 1 OR v_required > 9 THEN
    RAISE EXCEPTION 'ARCTOR_FEED_F31_OBJECT_FILTER_INVALID' USING ERRCODE='22023';
  END IF;
  IF v_limit < 1 OR v_limit > 50 THEN
    RAISE EXCEPTION 'ARCTOR_FEED_F31_LIMIT_INVALID' USING ERRCODE='22023';
  END IF;
  IF (p_before_published_at IS NULL) <> (p_before_message_id IS NULL) THEN
    RAISE EXCEPTION 'ARCTOR_FEED_F31_CURSOR_INCOMPLETE' USING ERRCODE='22023';
  END IF;
  IF v_has_metric THEN
    IF p_parameter_definition_id IS NULL OR v_unit = ''
       OR (p_min_value IS NULL AND p_max_value IS NULL)
       OR (p_min_value IS NOT NULL AND p_max_value IS NOT NULL
           AND p_min_value > p_max_value) THEN
      RAISE EXCEPTION 'ARCTOR_FEED_F31_METRIC_FILTER_INVALID' USING ERRCODE='22023';
    END IF;
  ELSIF p_parameter_definition_id IS NOT NULL OR p_min_value IS NOT NULL
        OR p_max_value IS NOT NULL OR v_unit <> '' THEN
    RAISE EXCEPTION 'ARCTOR_FEED_F31_METRIC_WITHOUT_OBJECT' USING ERRCODE='22023';
  END IF;

  RETURN QUERY
  WITH RECURSIVE filters AS (
    SELECT v.id AS filter_no, v.object_id
    FROM unnest(v_object_ids) WITH ORDINALITY AS v(object_id, id)
    UNION ALL
    SELECT 0::bigint AS filter_no, p_metric_object_id
    WHERE v_has_metric
  ),
  descendants(filter_no, node_id, depth) AS (
    SELECT fil.filter_no, vo.id, 0 AS depth
    FROM filters fil
    JOIN public.value_objects vo ON vo.id=fil.object_id
    WHERE vo.status='active' AND vo.scope_code='global'
    UNION ALL
    SELECT d.filter_no, child.id, d.depth+1
    FROM descendants d
    JOIN public.value_objects child ON child.parent_value_object_id=d.node_id
    WHERE d.depth < 30 AND child.status='active' AND child.scope_code='global'
  ),
  qualifying_facts AS (
    SELECT r.message_object_id, f.activity_event_id, d.filter_no
    FROM descendants d
    JOIN public.value_objects vo ON vo.id=d.node_id
      AND vo.ontology_node_role_code='leaf'
      AND vo.scope_code='global' AND vo.status='active'
    JOIN public.message_object_relations r
      ON r.target_value_object_id=vo.id
     AND r.relation_code='commercial_fact_leaf'
     AND r.metadata_json->>'contract'='ARCTOR_FEED_FACT_LEAF_LINK_F12_V1'
    JOIN public.activity_events e
      ON e.source_message_object_id=r.message_object_id
     AND e.activity_context_code='commercial'
    JOIN public.activity_object_facts f
      ON f.activity_event_id=e.id
     AND f.value_object_id=r.target_value_object_id
     AND f.fact_status='confirmed'
     AND f.fact_role_code='source'
     AND f.parameter_definition_id IS NOT NULL
     AND f.user_id=e.user_id
    JOIN public.message_objects m
      ON m.id=r.message_object_id
     AND m.owner_user_id=e.user_id
     AND m.audience_scope_code='public'
     AND m.lifecycle_status='active'
    WHERE jsonb_typeof(r.metadata_json->'factRefs')='array'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(r.metadata_json->'factRefs') AS refs(ref)
        WHERE refs.ref->>'factId'=f.id::text
          AND refs.ref->>'activityEventId'=e.id::text
          AND refs.ref->>'parameterDefinitionId'=f.parameter_definition_id::text
      )
      AND (
        d.filter_no <> 0 OR (
          f.parameter_definition_id=p_parameter_definition_id
          AND f.value_numeric IS NOT NULL
          AND lower(f.unit)=v_unit
          AND (p_min_value IS NULL OR f.value_numeric>=p_min_value)
          AND (p_max_value IS NULL OR f.value_numeric<=p_max_value)
        )
      )
  ),
  matched_events AS (
    SELECT q.message_object_id,q.activity_event_id
    FROM qualifying_facts q
    GROUP BY q.message_object_id,q.activity_event_id
    HAVING count(DISTINCT q.filter_no)=v_required
  )
  SELECT m.id, coalesce(m.activated_at,m.created_at) AS published_at
  FROM public.message_objects m
  WHERE m.audience_scope_code='public'
    AND m.lifecycle_status='active'
    AND m.origin_kind_code='native'
    AND m.origin_provider_code='arctor'
    AND EXISTS (
      SELECT 1 FROM matched_events me WHERE me.message_object_id=m.id
    )
    AND EXISTS (
      SELECT 1 FROM public.message_object_distributions dist
      WHERE dist.message_object_id=m.id
        AND dist.channel_code='arctor'
        AND dist.delivery_status='succeeded'
    )
    AND EXISTS (
      SELECT 1 FROM public.actors actor
      WHERE actor.id=m.author_actor_id AND actor.status='active'
        AND (
          (
            actor.actor_type='organization'
            AND EXISTS (
              SELECT 1 FROM public.organizations org
              WHERE org.id=actor.organization_id
                AND org.status='active'
                AND org.directory_status='published'
                AND org.is_public_profile_enabled=true
                AND org.is_listed_in_directory=true
                AND org.public_slug IS NOT NULL
            )
          ) OR (
            actor.actor_type IN ('person','avatar')
            AND EXISTS (
              SELECT 1 FROM public.actor_public_profiles prof
              WHERE prof.actor_id=actor.id
            )
          )
        )
    )
    AND (
      p_before_published_at IS NULL
      OR (coalesce(m.activated_at,m.created_at),m.id)
          < (p_before_published_at,p_before_message_id)
    )
  ORDER BY coalesce(m.activated_at,m.created_at) DESC,m.id DESC
  LIMIT v_limit;
END;
$fn$;

REVOKE ALL ON FUNCTION public.arctor_feed_search_publications_f31_v1(
 uuid[],uuid,uuid,numeric,numeric,text,integer,timestamptz,uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.arctor_feed_search_publications_f31_v1(
 uuid[],uuid,uuid,numeric,numeric,text,integer,timestamptz,uuid
) TO service_role;

COMMIT;
