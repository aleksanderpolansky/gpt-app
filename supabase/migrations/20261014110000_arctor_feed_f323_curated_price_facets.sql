-- ARCTor F3.2.3 - curated price aspect registry (not a fact store).
-- Applied manually in Supabase SQL Editor after PRECHECK PASS.
BEGIN;
SET LOCAL lock_timeout = '8s';
SET LOCAL statement_timeout = '60s';

DO $gate$
BEGIN
  IF to_regclass('public.arctor_feed_price_leaf_registry_f323_v1') IS NOT NULL
     THEN RAISE EXCEPTION 'F323_PRICE_REGISTRY_ALREADY_INSTALLED'; END IF;
  IF to_regprocedure('public.arctor_feed_search_publications_f31_v1(uuid[],uuid,uuid,numeric,numeric,text,integer,timestamptz,uuid)') IS NULL
     THEN RAISE EXCEPTION 'F323_REQUIRES_F31'; END IF;
  IF (SELECT enabled FROM public.commercial_auto_fact_settings_v1 WHERE setting_key='global') IS DISTINCT FROM FALSE
     THEN RAISE EXCEPTION 'F323_AUTO_FACTS_MUST_BE_OFF'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.value_objects v
    JOIN public.value_object_parameter_definitions p
      ON p.id='ad49cf87-95b5-4839-a86a-a9a7c5b3406e'::uuid
    WHERE v.id='366c2c72-8d5e-5f6c-9294-9d36441001f3'::uuid
      AND v.ontology_node_role_code='leaf'
      AND v.scope_code='global' AND v.status='active'
      AND p.parameter_code='money_value'
      AND v.canonical_key LIKE 'system.price_of_1_kg_of_chicken_breast_fillet.%'
  ) THEN RAISE EXCEPTION 'F323_PRICE_LEAF_SEMANTIC_PROOF_MISSING'; END IF;
END;
$gate$;

CREATE TABLE public.arctor_feed_price_leaf_registry_f323_v1 (
  price_leaf_id uuid PRIMARY KEY REFERENCES public.value_objects(id) ON DELETE RESTRICT,
  parameter_definition_id uuid NOT NULL REFERENCES public.value_object_parameter_definitions(id) ON DELETE RESTRICT,
  enabled boolean NOT NULL DEFAULT true,
  approval_source text NOT NULL CHECK (char_length(approval_source) BETWEEN 8 AND 200),
  approved_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.arctor_feed_price_leaf_registry_f323_v1 IS
  'Curator-approved ontology price aspects, not amounts or publication facts. Extend only after review.';

INSERT INTO public.arctor_feed_price_leaf_registry_f323_v1
  (price_leaf_id,parameter_definition_id,enabled,approval_source)
VALUES
  ('366c2c72-8d5e-5f6c-9294-9d36441001f3',
   'ad49cf87-95b5-4839-a86a-a9a7c5b3406e',
   true,
   'ARCTOR_LIDL_PRICE_ASSIGNMENT_ONTOLOGY_V1_20261007:S10; F323 review 20261014');

ALTER TABLE public.arctor_feed_price_leaf_registry_f323_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.arctor_feed_price_leaf_registry_f323_v1 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.arctor_feed_price_leaf_registry_f323_v1 TO service_role;
-- No browser role can manage the curated price classification.
COMMIT;
