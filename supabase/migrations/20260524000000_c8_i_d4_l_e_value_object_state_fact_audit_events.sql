-- GPT-APP / AI-NAVIGATOR
-- P4.10.0-C8-I-D4-L-E
-- Dedicated State Fact Audit Table Migration File
--
-- Purpose:
--   Create a dedicated audit table for controlled lifecycle events
--   on public.value_object_state_facts.
--
-- Important:
--   This migration file is created but not applied by D4-L-E.
--   It does not implement rollback/correction runtime.
--   It does not create any API route or helper.
--
-- Design source:
--   docs/value-objects/p4-10-0-c8-i-d4-l-d-dedicated-state-fact-audit-table-migration-design.txt

BEGIN;

CREATE TABLE IF NOT EXISTS public.value_object_state_fact_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL,
  actor_id uuid NULL,
  value_object_id uuid NOT NULL,
  state_fact_id uuid NOT NULL,
  related_state_fact_id uuid NULL,

  dimension_key text NOT NULL,
  action_type text NOT NULL,

  previous_correction_status text NULL,
  new_correction_status text NULL,

  reason text NOT NULL,
  request_trace_id text NOT NULL,
  idempotency_key text NOT NULL,

  source_route text NOT NULL,
  helper_version text NOT NULL,
  contract_version text NULL,
  d4_gate_version text NULL,

  previous_valid_to timestamptz NULL,
  new_valid_to timestamptz NULL,

  evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT value_object_state_fact_audit_events_reason_not_empty
    CHECK (length(trim(reason)) > 0),

  CONSTRAINT value_object_state_fact_audit_events_trace_not_empty
    CHECK (length(trim(request_trace_id)) > 0),

  CONSTRAINT value_object_state_fact_audit_events_idempotency_not_empty
    CHECK (length(trim(idempotency_key)) > 0),

  CONSTRAINT value_object_state_fact_audit_events_action_type_check
    CHECK (
      action_type IN (
        'created',
        'rollback_requested',
        'rolled_back',
        'correction_requested',
        'corrected',
        'superseded',
        'expired',
        'rejected_rollback',
        'rejected_correction'
      )
    ),

  CONSTRAINT value_object_state_fact_audit_events_state_fact_fk
    FOREIGN KEY (state_fact_id)
    REFERENCES public.value_object_state_facts(id)
    ON DELETE RESTRICT,

  CONSTRAINT value_object_state_fact_audit_events_related_state_fact_fk
    FOREIGN KEY (related_state_fact_id)
    REFERENCES public.value_object_state_facts(id)
    ON DELETE RESTRICT,

  CONSTRAINT value_object_state_fact_audit_events_value_object_fk
    FOREIGN KEY (value_object_id)
    REFERENCES public.value_objects(id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS value_object_state_fact_audit_events_idempotency_uq
  ON public.value_object_state_fact_audit_events (
    user_id,
    state_fact_id,
    action_type,
    idempotency_key
  );

CREATE INDEX IF NOT EXISTS value_object_state_fact_audit_events_user_created_idx
  ON public.value_object_state_fact_audit_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS value_object_state_fact_audit_events_state_fact_created_idx
  ON public.value_object_state_fact_audit_events (state_fact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS value_object_state_fact_audit_events_value_object_created_idx
  ON public.value_object_state_fact_audit_events (value_object_id, created_at DESC);

CREATE INDEX IF NOT EXISTS value_object_state_fact_audit_events_dimension_created_idx
  ON public.value_object_state_fact_audit_events (dimension_key, created_at DESC);

ALTER TABLE public.value_object_state_fact_audit_events ENABLE ROW LEVEL SECURITY;

-- Initial deny-by-default policy.
-- Server-side controlled helpers may use service role.
-- Public/client direct access remains blocked until an owner-scoped read model is designed.

CREATE POLICY value_object_state_fact_audit_events_deny_all_public_access
  ON public.value_object_state_fact_audit_events
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

COMMIT;
