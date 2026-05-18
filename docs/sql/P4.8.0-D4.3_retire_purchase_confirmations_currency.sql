/*
P4.8.0-D4.3
Safe migration: retire duplicate purchase_confirmations.currency

Goal:
- keep purchase_confirmations.purchase_currency as the only active runtime/business field;
- remove duplicate purchase_confirmations.currency only if safe;
- do not touch purchase_currency;
- do not modify purchase confirmation RPCs in this migration.
*/

BEGIN;

DO UTF8
DECLARE
  v_has_purchase_currency boolean;
  v_has_currency boolean;
  v_drift_count bigint;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'purchase_confirmations'
      AND column_name = 'purchase_currency'
  ) INTO v_has_purchase_currency;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'purchase_confirmations'
      AND column_name = 'currency'
  ) INTO v_has_currency;

  IF NOT v_has_purchase_currency THEN
    RAISE EXCEPTION 'Cannot continue: public.purchase_confirmations.purchase_currency does not exist';
  END IF;

  IF NOT v_has_currency THEN
    RAISE NOTICE 'No-op: public.purchase_confirmations.currency does not exist';
    RETURN;
  END IF;

  EXECUTE '
    SELECT count(*)
    FROM public.purchase_confirmations
    WHERE COALESCE(purchase_currency, '''') <> COALESCE(currency, '''')
  ' INTO v_drift_count;

  IF v_drift_count > 0 THEN
    RAISE EXCEPTION 'Cannot drop public.purchase_confirmations.currency: drift rows found: %', v_drift_count;
  END IF;

  ALTER TABLE public.purchase_confirmations
    DROP COLUMN currency;

  RAISE NOTICE 'Dropped duplicate column public.purchase_confirmations.currency. Active field remains purchase_currency.';
END UTF8;

COMMIT;

/*
Post-check:

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'purchase_confirmations'
  AND column_name IN ('purchase_currency', 'currency')
ORDER BY ordinal_position;
*/
