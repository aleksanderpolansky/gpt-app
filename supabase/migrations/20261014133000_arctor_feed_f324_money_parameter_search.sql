-- ARCTor F3.2.4: universal money_value facts in the PUBLIC commercial feed.
-- NOT a new fact store. F3.1A stays intact. Manually apply after PRECHECK.
-- Scope is intentionally F1.2-confirmed commercial publication links ONLY.
-- Multi-item activity-event item correlation is a separate future contract.
BEGIN;
SET LOCAL lock_timeout='8s';
SET LOCAL statement_timeout='90s';
DO $gate$
BEGIN
 IF to_regprocedure('public.arctor_feed_search_publications_f31_v1(uuid[],uuid,uuid,numeric,numeric,text,integer,timestamptz,uuid)') IS NULL
 OR to_regprocedure('public.arctor_feed_money_evidence_f324_v1(uuid[])') IS NOT NULL
 OR to_regclass('public.activity_object_facts') IS NULL
 OR to_regclass('public.message_object_relations') IS NULL
 OR (SELECT enabled FROM public.commercial_auto_fact_settings_v1 WHERE setting_key='global') IS DISTINCT FROM false
 OR NOT EXISTS (SELECT 1 FROM public.value_object_parameter_definitions WHERE id='ad49cf87-95b5-4839-a86a-a9a7c5b3406e'::uuid AND parameter_code='money_value')
 THEN RAISE EXCEPTION 'ARCTOR_F324_PRECONDITION_FAILED'; END IF;
END;
$gate$;

-- Parameter-first selective index. No additional facts or values stored.
CREATE INDEX IF NOT EXISTS arctor_feed_f324_money_parameter_unit_amount_idx
ON public.activity_object_facts(parameter_definition_id, lower(btrim(unit)), value_numeric, activity_event_id)
WHERE fact_status='confirmed' AND fact_role_code='source' AND value_numeric IS NOT NULL;

-- Internal evidence function; service_role only, never exposed to browser roles.
CREATE FUNCTION public.arctor_feed_money_evidence_f324_v1(p_object_ids uuid[] DEFAULT ARRAY[]::uuid[])
RETURNS TABLE(message_object_id uuid, activity_event_id uuid, fact_id uuid, value_numeric numeric, unit_code text, published_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $fn$
DECLARE v_ids uuid[]; v_count integer;
BEGIN
 SELECT coalesce(array_agg(DISTINCT id),ARRAY[]::uuid[]) INTO v_ids
 FROM unnest(coalesce(p_object_ids,ARRAY[]::uuid[])) AS t(id) WHERE id IS NOT NULL;
 v_count := cardinality(v_ids);
 IF cardinality(coalesce(p_object_ids,ARRAY[]::uuid[])) > 8
   OR v_count <> cardinality(coalesce(p_object_ids,ARRAY[]::uuid[])) THEN
   RAISE EXCEPTION 'F324_INVALID_OBJECT_IDS' USING ERRCODE='22023';
 END IF;
 RETURN QUERY
 WITH RECURSIVE roots(filter_no,node_id) AS (
   SELECT row_number() OVER (ORDER BY id)::bigint, id FROM unnest(v_ids) AS t(id)
 ), descendants(filter_no,node_id,depth) AS (
   SELECT r.filter_no,r.node_id,0 FROM roots r
   UNION ALL
   SELECT d.filter_no, child.id,d.depth+1
   FROM descendants d JOIN public.value_objects child ON child.parent_value_object_id=d.node_id
   WHERE d.depth<30 AND child.status='active' AND child.scope_code='global'
 ), object_matches AS (
   SELECT r.message_object_id, e.id AS event_id, d.filter_no
   FROM descendants d
   JOIN public.value_objects vo ON vo.id=d.node_id
     AND vo.status='active' AND vo.scope_code='global' AND vo.ontology_node_role_code='leaf'
   JOIN public.message_object_relations r ON r.target_value_object_id=vo.id
     AND r.relation_code='commercial_fact_leaf'
     AND r.metadata_json->>'contract'='ARCTOR_FEED_FACT_LEAF_LINK_F12_V1'
   JOIN public.activity_events e ON e.source_message_object_id=r.message_object_id
     AND e.activity_context_code='commercial'
   JOIN public.activity_object_facts f ON f.activity_event_id=e.id
     AND f.value_object_id=vo.id AND f.user_id=e.user_id
     AND f.fact_status='confirmed' AND f.fact_role_code='source'
     AND f.parameter_definition_id IS NOT NULL
   WHERE jsonb_typeof(r.metadata_json->'factRefs')='array'
     AND EXISTS (
       SELECT 1 FROM jsonb_array_elements(r.metadata_json->'factRefs') ref(x)
       WHERE ref.x->>'factId'=f.id::text
         AND ref.x->>'activityEventId'=e.id::text
         AND ref.x->>'parameterDefinitionId'=f.parameter_definition_id::text
     )
 ), matched_event_filter AS (
   SELECT om.message_object_id,om.event_id
   FROM object_matches om GROUP BY om.message_object_id,om.event_id
   HAVING count(DISTINCT om.filter_no)=v_count
 )
 SELECT m.id,e.id,f.id,f.value_numeric,lower(btrim(f.unit)),coalesce(m.activated_at,m.created_at)
 FROM public.activity_object_facts f
 JOIN public.value_objects vo ON vo.id=f.value_object_id
   AND vo.ontology_node_role_code='leaf' AND vo.status='active' AND vo.scope_code='global'
 JOIN public.activity_events e ON e.id=f.activity_event_id
   AND e.activity_context_code='commercial' AND e.user_id=f.user_id
 JOIN public.message_objects m ON m.id=e.source_message_object_id
   AND m.owner_user_id=e.user_id AND m.audience_scope_code='public'
   AND m.lifecycle_status='active' AND m.origin_kind_code='native' AND m.origin_provider_code='arctor'
 JOIN public.message_object_relations r ON r.message_object_id=m.id
   AND r.target_value_object_id=vo.id AND r.relation_code='commercial_fact_leaf'
   AND r.metadata_json->>'contract'='ARCTOR_FEED_FACT_LEAF_LINK_F12_V1'
 WHERE f.parameter_definition_id='ad49cf87-95b5-4839-a86a-a9a7c5b3406e'::uuid
   AND f.fact_status='confirmed' AND f.fact_role_code='source' AND f.value_numeric IS NOT NULL
   AND lower(btrim(f.unit)) ~ '^[a-z][a-z0-9_]{0,15}$'
   AND jsonb_typeof(r.metadata_json->'factRefs')='array'
   AND EXISTS (
     SELECT 1 FROM jsonb_array_elements(r.metadata_json->'factRefs') ref(x)
     WHERE ref.x->>'factId'=f.id::text
       AND ref.x->>'activityEventId'=e.id::text
       AND ref.x->>'parameterDefinitionId'=f.parameter_definition_id::text
   )
   AND (v_count=0 OR EXISTS (
     SELECT 1 FROM matched_event_filter me
     WHERE me.message_object_id=m.id AND me.event_id=e.id
   ))
   AND EXISTS (SELECT 1 FROM public.message_object_distributions dist
     WHERE dist.message_object_id=m.id AND dist.channel_code='arctor'
       AND dist.delivery_status='succeeded')
   AND EXISTS (SELECT 1 FROM public.actors a
     WHERE a.id=m.author_actor_id AND a.status='active' AND (
       (a.actor_type='organization' AND EXISTS (
         SELECT 1 FROM public.organizations org WHERE org.id=a.organization_id
           AND org.status='active' AND org.directory_status='published'
           AND org.is_public_profile_enabled=true AND org.is_listed_in_directory=true
           AND org.public_slug IS NOT NULL
       )) OR (a.actor_type IN ('person','avatar') AND EXISTS (
         SELECT 1 FROM public.actor_public_profiles ap WHERE ap.actor_id=a.id
       ))
     ));
END;
$fn$;

CREATE FUNCTION public.arctor_feed_money_facets_f324_v1(p_object_ids uuid[] DEFAULT ARRAY[]::uuid[])
RETURNS TABLE(unit_code text,min_value numeric,max_value numeric,publications bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $fn$
 SELECT e.unit_code,min(e.value_numeric),max(e.value_numeric),count(DISTINCT e.message_object_id)
 FROM public.arctor_feed_money_evidence_f324_v1(p_object_ids) e
 GROUP BY e.unit_code ORDER BY e.unit_code LIMIT 30;
$fn$;

CREATE FUNCTION public.arctor_feed_search_money_publications_f324_v1(
 p_object_ids uuid[] DEFAULT ARRAY[]::uuid[],
 p_min_value numeric DEFAULT NULL,
 p_max_value numeric DEFAULT NULL,
 p_unit_code text DEFAULT NULL,
 p_limit integer DEFAULT 20,
 p_before_published_at timestamptz DEFAULT NULL,
 p_before_message_id uuid DEFAULT NULL
)
RETURNS TABLE(message_object_id uuid,published_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $fn$
DECLARE v_unit text := lower(btrim(coalesce(p_unit_code,'')));
BEGIN
 IF v_unit !~ '^[a-z][a-z0-9_]{0,15}$'
   OR (p_min_value IS NULL AND p_max_value IS NULL)
   OR (p_min_value IS NOT NULL AND p_max_value IS NOT NULL AND p_min_value>p_max_value)
   OR p_limit IS NULL OR p_limit<1 OR p_limit>50
   OR ((p_before_published_at IS NULL)<>(p_before_message_id IS NULL)) THEN
   RAISE EXCEPTION 'F324_INVALID_MONEY_FILTER' USING ERRCODE='22023';
 END IF;
 RETURN QUERY
 SELECT e.message_object_id,max(e.published_at) AS published_at
 FROM public.arctor_feed_money_evidence_f324_v1(p_object_ids) e
 WHERE e.unit_code=v_unit
   AND (p_min_value IS NULL OR e.value_numeric>=p_min_value)
   AND (p_max_value IS NULL OR e.value_numeric<=p_max_value)
   AND (p_before_published_at IS NULL OR (e.published_at,e.message_object_id)
     < (p_before_published_at,p_before_message_id))
 GROUP BY e.message_object_id
 ORDER BY max(e.published_at) DESC,e.message_object_id DESC
 LIMIT p_limit;
END;
$fn$;

REVOKE ALL ON FUNCTION public.arctor_feed_money_evidence_f324_v1(uuid[]) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.arctor_feed_money_facets_f324_v1(uuid[]) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.arctor_feed_search_money_publications_f324_v1(uuid[],numeric,numeric,text,integer,timestamptz,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.arctor_feed_money_evidence_f324_v1(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.arctor_feed_money_facets_f324_v1(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.arctor_feed_search_money_publications_f324_v1(uuid[],numeric,numeric,text,integer,timestamptz,uuid) TO service_role;
COMMIT;
