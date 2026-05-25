-- GPT-APP / AI-NAVIGATOR
-- P4.10.0-C8-I-D4-L-L-N-B-FIX1
-- Extend value_object_state_facts.correction_status to allow rolled_back.
--
-- Reason:
-- D4-L-L-N-B failed safely: the fresh rollback target remained active and
-- historical proof fact remained unchanged. Earlier D4-B audit confirmed that
-- value_object_state_facts.correction_status was limited to:
--   active, corrected, revoked, superseded
--
-- But the atomic rollback RPC intentionally sets:
--   correction_status = 'rolled_back'
--
-- This migration aligns the table constraint with the rollback RPC, helper,
-- audit model, and debug proof expectation.
--
-- Safety:
-- - No table drop.
-- - No column drop.
-- - No delete.
-- - No RLS weakening.
-- - Existing statuses are preserved.
-- - Only the correction_status CHECK constraint is replaced.

BEGIN;

DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT c.conname
    INTO v_constraint_name
  FROM pg_constraint c
  WHERE c.conrelid = 'public.value_object_state_facts'::regclass
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%correction_status%'
  ORDER BY c.conname
  LIMIT 1;

  IF v_constraint_name IS NULL THEN
    RAISE EXCEPTION
      'No correction_status CHECK constraint found on public.value_object_state_facts';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.value_object_state_facts
    WHERE correction_status NOT IN (
      'active',
      'corrected',
      'revoked',
      'superseded',
      'rolled_back'
    )
  ) THEN
    RAISE EXCEPTION
      'Existing value_object_state_facts rows contain unsupported correction_status values';
  END IF;

  EXECUTE format(
    'ALTER TABLE public.value_object_state_facts DROP CONSTRAINT %I',
    v_constraint_name
  );

  ALTER TABLE public.value_object_state_facts
    ADD CONSTRAINT value_object_state_facts_correction_status_check
    CHECK (
      correction_status IN (
        'active',
        'corrected',
        'revoked',
        'superseded',
        'rolled_back'
      )
    );
END $$;

COMMIT;
