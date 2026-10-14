-- ARCTor FEED F3.2.2 • account-scoped saved semantic searches
-- Apply manually in Supabase SQL Editor after PRECHECK, then POSTCHECK.
-- Does not modify publication/fact writers, triggers, ON tree or feed search RPC.
BEGIN;
SET LOCAL lock_timeout = '8s';
SET LOCAL statement_timeout = '60s';

DO $gate$
BEGIN
  IF to_regclass('public.app_users') IS NULL THEN
    RAISE EXCEPTION 'ARCTOR_F322_APP_USERS_MISSING';
  END IF;
  IF to_regclass('public.arctor_feed_saved_search_tabs_v1') IS NOT NULL THEN
    RAISE EXCEPTION 'ARCTOR_F322_ALREADY_INSTALLED_STOP';
  END IF;
  IF to_regprocedure('public.arctor_feed_search_publications_f31_v1(uuid[],uuid,uuid,numeric,numeric,text,integer,timestamptz,uuid)') IS NULL THEN
    RAISE EXCEPTION 'ARCTOR_F322_REQUIRES_F31';
  END IF;
END;
$gate$;

CREATE TABLE public.arctor_feed_saved_search_tabs_v1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 80),
  filter_spec jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arctor_feed_saved_tab_spec_object_ck
    CHECK (jsonb_typeof(filter_spec) = 'object'),
  CONSTRAINT arctor_feed_saved_tab_spec_size_ck
    CHECK (octet_length(filter_spec::text) <= 4096)
);

CREATE INDEX arctor_feed_saved_tabs_owner_recent_idx
  ON public.arctor_feed_saved_search_tabs_v1(owner_user_id, created_at DESC, id DESC);

ALTER TABLE public.arctor_feed_saved_search_tabs_v1 ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies: only server-side service_role operations.
REVOKE ALL ON TABLE public.arctor_feed_saved_search_tabs_v1 FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.arctor_feed_saved_search_tabs_v1 TO service_role;
COMMIT;
