-- GPT-APP / AI-NAVIGATOR
-- C8-I / C32-SCHEMA-A
-- Additive schema patch design for unified Value Objects + Activity Event -> Value Object links
-- Generated: 2026-05-30
--
-- IMPORTANT:
-- This file is a DESIGN / REVIEW PACKAGE.
-- Do NOT execute automatically.
-- Execute only after explicit SQL execution gate.
--
-- Current runtime evidence:
-- - activity_events first semantic persistence write is verified.
-- - value_objects currently exposes: id, organization_id, title, description, status, created_at, updated_at.
-- - user spaces are owner_user_id-scoped and currently have no organization_id.
-- - activity_value_object_links is missing from PostgREST schema cache.
--
-- Design goal:
-- - Keep unified Value Object.
-- - Do not introduce hard subtypes.
-- - Support personal/user/actor/space scoped Value Objects.
-- - Keep organization-scoped Value Objects for enterprise/commercial context.
-- - Create a controlled Activity Event -> Value Object link table.
-- - Do not create state facts/deltas/snapshots here.

BEGIN;

-- Required extension for gen_random_uuid() if not already present.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. Add personal/actor/space scope columns to value_objects
-- ============================================================

ALTER TABLE public.value_objects
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS space_id uuid,
  ADD COLUMN IF NOT EXISTS app_user_id uuid,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'semantic_candidate',
  ADD COLUMN IF NOT EXISTS semantic_signature jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Keep organization_id for enterprise/commercial/public Value Objects.
-- Personal Value Objects should use at least one of:
-- actor_id, space_id, app_user_id, owner_user_id.
-- Do not force a hard subtype.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'value_objects_actor_id_fkey'
      AND conrelid = 'public.value_objects'::regclass
  ) THEN
    ALTER TABLE public.value_objects
      ADD CONSTRAINT value_objects_actor_id_fkey
      FOREIGN KEY (actor_id)
      REFERENCES public.actors(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'value_objects_space_id_fkey'
      AND conrelid = 'public.value_objects'::regclass
  ) THEN
    ALTER TABLE public.value_objects
      ADD CONSTRAINT value_objects_space_id_fkey
      FOREIGN KEY (space_id)
      REFERENCES public.spaces(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'value_objects_app_user_id_fkey'
      AND conrelid = 'public.value_objects'::regclass
  ) THEN
    ALTER TABLE public.value_objects
      ADD CONSTRAINT value_objects_app_user_id_fkey
      FOREIGN KEY (app_user_id)
      REFERENCES public.app_users(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'value_objects_owner_user_id_fkey'
      AND conrelid = 'public.value_objects'::regclass
  ) THEN
    ALTER TABLE public.value_objects
      ADD CONSTRAINT value_objects_owner_user_id_fkey
      FOREIGN KEY (owner_user_id)
      REFERENCES public.app_users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_value_objects_actor_id
  ON public.value_objects(actor_id);

CREATE INDEX IF NOT EXISTS idx_value_objects_space_id
  ON public.value_objects(space_id);

CREATE INDEX IF NOT EXISTS idx_value_objects_app_user_id
  ON public.value_objects(app_user_id);

CREATE INDEX IF NOT EXISTS idx_value_objects_owner_user_id
  ON public.value_objects(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_value_objects_organization_id
  ON public.value_objects(organization_id);

CREATE INDEX IF NOT EXISTS idx_value_objects_status
  ON public.value_objects(status);

CREATE INDEX IF NOT EXISTS idx_value_objects_visibility
  ON public.value_objects(visibility);

-- ============================================================
-- 2. Create Activity Event -> Value Object link table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_value_object_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  activity_event_id uuid NOT NULL
    REFERENCES public.activity_events(id)
    ON DELETE CASCADE,

  value_object_id uuid NOT NULL
    REFERENCES public.value_objects(id)
    ON DELETE CASCADE,

  actor_id uuid
    REFERENCES public.actors(id)
    ON DELETE SET NULL,

  space_id uuid
    REFERENCES public.spaces(id)
    ON DELETE SET NULL,

  app_user_id uuid
    REFERENCES public.app_users(id)
    ON DELETE SET NULL,

  organization_id uuid
    REFERENCES public.organizations(id)
    ON DELETE SET NULL,

  link_type text NOT NULL DEFAULT 'semantic_exposure',
  exposure_type text,
  confidence numeric(5,4),

  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT activity_value_object_links_confidence_range_chk
    CHECK (
      confidence IS NULL
      OR (confidence >= 0 AND confidence <= 1)
    ),

  CONSTRAINT activity_value_object_links_unique_semantic_link
    UNIQUE (activity_event_id, value_object_id, link_type)
);

CREATE INDEX IF NOT EXISTS idx_activity_vo_links_activity_event_id
  ON public.activity_value_object_links(activity_event_id);

CREATE INDEX IF NOT EXISTS idx_activity_vo_links_value_object_id
  ON public.activity_value_object_links(value_object_id);

CREATE INDEX IF NOT EXISTS idx_activity_vo_links_actor_id
  ON public.activity_value_object_links(actor_id);

CREATE INDEX IF NOT EXISTS idx_activity_vo_links_space_id
  ON public.activity_value_object_links(space_id);

CREATE INDEX IF NOT EXISTS idx_activity_vo_links_app_user_id
  ON public.activity_value_object_links(app_user_id);

CREATE INDEX IF NOT EXISTS idx_activity_vo_links_organization_id
  ON public.activity_value_object_links(organization_id);

CREATE INDEX IF NOT EXISTS idx_activity_vo_links_link_type
  ON public.activity_value_object_links(link_type);

-- ============================================================
-- 3. RLS posture
-- ============================================================

ALTER TABLE public.value_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_value_object_links ENABLE ROW LEVEL SECURITY;

-- This patch keeps semantic/VO persistence backend-mediated.
-- No broad anon/authenticated direct grants are added here.

REVOKE ALL ON TABLE public.activity_value_object_links FROM anon;
REVOKE ALL ON TABLE public.activity_value_object_links FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.activity_value_object_links TO service_role;

-- Keep service_role backend access explicit for value_objects.
-- Do not broaden anon/authenticated access here.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.value_objects TO service_role;

-- Optional service_role policies for environments where RLS is not bypassed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'activity_value_object_links'
      AND policyname = 'activity_value_object_links_service_role_all'
  ) THEN
    CREATE POLICY activity_value_object_links_service_role_all
      ON public.activity_value_object_links
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'value_objects'
      AND policyname = 'value_objects_service_role_all'
  ) THEN
    CREATE POLICY value_objects_service_role_all
      ON public.value_objects
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE public.activity_value_object_links IS
  'C32 additive link table: connects Activity Event source-of-truth rows to unified Value Objects. No state facts/deltas/snapshots are created here.';

COMMENT ON COLUMN public.value_objects.actor_id IS
  'Optional personal/actor scope for unified Value Objects. Does not create a hard subtype.';

COMMENT ON COLUMN public.value_objects.space_id IS
  'Optional space scope for unified Value Objects. Used for personal/family/work/business spaces.';

COMMENT ON COLUMN public.value_objects.app_user_id IS
  'Optional app user scope for personal Value Objects.';

COMMENT ON COLUMN public.value_objects.owner_user_id IS
  'Optional owner user scope for personal Value Objects.';

COMMENT ON COLUMN public.value_objects.semantic_signature IS
  'Structured semantic signature derived from resolved category bundle. Candidate until confirmed by policy/review.';

COMMIT;
