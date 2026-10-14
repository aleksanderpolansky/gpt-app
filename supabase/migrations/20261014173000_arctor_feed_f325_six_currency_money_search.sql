-- ARCTor FEED F3.2.5: six-currency monetary search by canonical money_value.
-- Conversion rates are official EUR-base references resolved SERVER-SIDE;
-- never supplied by browser clients. Search returns only F324-eligible public facts.
-- Amounts, original units and POINTS logic are never modified.
BEGIN;
SET LOCAL lock_timeout = '8s';
SET LOCAL statement_timeout = '90s';
DO $gate$
BEGIN
  IF to_regprocedure('public.arctor_feed_money_evidence_f324_v1(uuid[])') IS NULL
    OR to_regprocedure('public.arctor_feed_search_money_publications_f324_v1(uuid[],numeric,numeric,text,integer,timestamptz,uuid)') IS NULL
    OR to_regprocedure('public.arctor_feed_search_money_fx_f325_v1(uuid[],numeric,numeric,text,jsonb,integer,timestamptz,uuid)') IS NOT NULL
    OR (SELECT enabled FROM public.commercial_auto_fact_settings_v1 WHERE setting_key='global') IS DISTINCT FROM FALSE
  THEN RAISE EXCEPTION 'F325_PRECONDITION_FAILED'; END IF;
END;
$gate$;

CREATE FUNCTION public.arctor_feed_search_money_fx_f325_v1(
  p_object_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_min_value numeric DEFAULT NULL,
  p_max_value numeric DEFAULT NULL,
  p_target_currency text DEFAULT NULL,
  p_rates_per_eur jsonb DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_before_published_at timestamptz DEFAULT NULL,
  p_before_message_id uuid DEFAULT NULL
)
RETURNS TABLE(message_object_id uuid, published_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $fn$
DECLARE
  v_target text := upper(btrim(coalesce(p_target_currency,'')));
  v_code text;
  v_unknown_units bigint;
BEGIN
  IF v_target NOT IN ('EUR','PLN','UAH','USD','GBP','CZK')
    OR p_rates_per_eur IS NULL OR jsonb_typeof(p_rates_per_eur) <> 'object'
    OR p_min_value IS NULL OR p_max_value IS NULL OR p_min_value > p_max_value
    OR p_limit IS NULL OR p_limit < 1 OR p_limit > 50
    OR ((p_before_published_at IS NULL) <> (p_before_message_id IS NULL))
  THEN RAISE EXCEPTION 'F325_INVALID_MONEY_REQUEST' USING ERRCODE = '22023'; END IF;

  IF (SELECT count(*) FROM jsonb_object_keys(p_rates_per_eur)) <> 6 THEN
    RAISE EXCEPTION 'F325_INCOMPLETE_CURRENCY_SNAPSHOT' USING ERRCODE='22023';
  END IF;
  FOREACH v_code IN ARRAY ARRAY['EUR','PLN','UAH','USD','GBP','CZK']::text[] LOOP
    IF NOT (p_rates_per_eur ? v_code)
      OR jsonb_typeof(p_rates_per_eur -> v_code) <> 'number'
      OR (p_rates_per_eur ->> v_code)::numeric <= 0
      OR (p_rates_per_eur ->> v_code)::numeric > 1000000
    THEN RAISE EXCEPTION 'F325_INVALID_RATE_%', v_code USING ERRCODE='22023'; END IF;
  END LOOP;
  IF (p_rates_per_eur ->> 'EUR')::numeric <> 1 THEN
    RAISE EXCEPTION 'F325_EUR_IDENTITY_REQUIRED' USING ERRCODE='22023';
  END IF;

  -- Never silently omit a source currency that is not in the six-currency contract.
  SELECT count(*) INTO v_unknown_units
  FROM public.arctor_feed_money_evidence_f324_v1(p_object_ids) ev
  WHERE NOT (p_rates_per_eur ? upper(ev.unit_code));
  IF v_unknown_units > 0 THEN
    RAISE EXCEPTION 'F325_UNSUPPORTED_ORIGIN_CURRENCY' USING ERRCODE='22023';
  END IF;

  RETURN QUERY
  WITH converted AS (
    SELECT ev.message_object_id AS mid, ev.published_at AS pub_at,
      ev.value_numeric * (
        (p_rates_per_eur ->> v_target)::numeric /
        (p_rates_per_eur ->> upper(ev.unit_code))::numeric
      ) AS converted_amount
    FROM public.arctor_feed_money_evidence_f324_v1(p_object_ids) ev
  ), matched AS (
    SELECT c.mid, max(c.pub_at) AS pub_at
    FROM converted c
    WHERE c.converted_amount >= p_min_value AND c.converted_amount <= p_max_value
    GROUP BY c.mid
  )
  SELECT m.mid, m.pub_at FROM matched m
  WHERE (p_before_published_at IS NULL
       OR (m.pub_at,m.mid) < (p_before_published_at,p_before_message_id))
  ORDER BY m.pub_at DESC,m.mid DESC
  LIMIT p_limit;
END;
$fn$;

REVOKE ALL ON FUNCTION public.arctor_feed_search_money_fx_f325_v1(uuid[],numeric,numeric,text,jsonb,integer,timestamptz,uuid)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.arctor_feed_search_money_fx_f325_v1(uuid[],numeric,numeric,text,jsonb,integer,timestamptz,uuid)
TO service_role;
COMMIT;
