/*
P4.9.0-A7
Minimal v4.2 Category-Derived Value Object Foundation migration

Goal:
- extend value_objects with minimal v4.2 fields;
- create value_object_category_links;
- create activity_event_value_object_links;
- create value_object_usage_aggregates;
- do not delete or rewrite existing VO/VOI structures;
- do not make relation_type the central semantic model.
*/

BEGIN;

ALTER TABLE public.value_objects
  ADD COLUMN IF NOT EXISTS parent_value_object_id uuid,
  ADD COLUMN IF NOT EXISTS entity_protocol_characteristics_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS needs_user_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ui_visibility text NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS category_origin_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'value_objects_parent_value_object_id_fkey'
  ) THEN
    ALTER TABLE public.value_objects
      ADD CONSTRAINT value_objects_parent_value_object_id_fkey
      FOREIGN KEY (parent_value_object_id)
      REFERENCES public.value_objects(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'value_objects_no_self_parent_check'
  ) THEN
    ALTER TABLE public.value_objects
      ADD CONSTRAINT value_objects_no_self_parent_check
      CHECK (parent_value_object_id IS NULL OR parent_value_object_id <> id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'value_objects_entity_protocol_characteristics_json_is_object_check'
  ) THEN
    ALTER TABLE public.value_objects
      ADD CONSTRAINT value_objects_entity_protocol_characteristics_json_is_object_check
      CHECK (jsonb_typeof(entity_protocol_characteristics_json) = 'object');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'value_objects_category_origin_json_is_object_check'
  ) THEN
    ALTER TABLE public.value_objects
      ADD CONSTRAINT value_objects_category_origin_json_is_object_check
      CHECK (jsonb_typeof(category_origin_json) = 'object');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'value_objects_metadata_json_is_object_check'
  ) THEN
    ALTER TABLE public.value_objects
      ADD CONSTRAINT value_objects_metadata_json_is_object_check
      CHECK (jsonb_typeof(metadata_json) = 'object');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'value_objects_ui_visibility_check'
  ) THEN
    ALTER TABLE public.value_objects
      ADD CONSTRAINT value_objects_ui_visibility_check
      CHECK (ui_visibility IN ('visible', 'hidden', 'archived', 'merged', 'system_hidden'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_value_objects_parent_value_object_id
  ON public.value_objects(parent_value_object_id);

CREATE INDEX IF NOT EXISTS idx_value_objects_needs_user_review
  ON public.value_objects(needs_user_review);

CREATE INDEX IF NOT EXISTS idx_value_objects_ui_visibility
  ON public.value_objects(ui_visibility);

CREATE TABLE IF NOT EXISTS public.value_object_category_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value_object_id uuid NOT NULL REFERENCES public.value_objects(id) ON DELETE CASCADE,
  category_table text NOT NULL DEFAULT 'contextual_categories',
  category_id uuid NOT NULL,
  category_role text NOT NULL DEFAULT 'semantic_component',
  source text NOT NULL DEFAULT 'rule',
  confidence numeric NOT NULL DEFAULT 1,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT value_object_category_links_category_table_check
    CHECK (category_table IN (
      'contextual_categories',
      'business_categories',
      'organization_categories',
      'object_action_contextual_categories'
    )),
  CONSTRAINT value_object_category_links_category_role_check
    CHECK (category_role IN (
      'primary',
      'semantic_component',
      'context',
      'object',
      'action',
      'goal',
      'protocol',
      'general_meaning',
      'system_suggested'
    )),
  CONSTRAINT value_object_category_links_source_check
    CHECK (source IN ('rule', 'ai', 'manual', 'system_seed', 'migration')),
  CONSTRAINT value_object_category_links_confidence_check
    CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT value_object_category_links_metadata_is_object_check
    CHECK (jsonb_typeof(metadata_json) = 'object'),
  CONSTRAINT value_object_category_links_unique
    UNIQUE (value_object_id, category_table, category_id, category_role)
);

CREATE INDEX IF NOT EXISTS idx_value_object_category_links_value_object_id
  ON public.value_object_category_links(value_object_id);

CREATE INDEX IF NOT EXISTS idx_value_object_category_links_category
  ON public.value_object_category_links(category_table, category_id);

CREATE INDEX IF NOT EXISTS idx_value_object_category_links_role
  ON public.value_object_category_links(category_role);

CREATE TABLE IF NOT EXISTS public.activity_event_value_object_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.activity_events(id) ON DELETE CASCADE,
  value_object_id uuid NOT NULL REFERENCES public.value_objects(id) ON DELETE CASCADE,
  exposure_minutes numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'rule',
  confidence numeric NOT NULL DEFAULT 1,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT activity_event_value_object_links_exposure_minutes_check
    CHECK (exposure_minutes >= 0),
  CONSTRAINT activity_event_value_object_links_source_check
    CHECK (source IN ('rule', 'ai', 'manual', 'system_seed', 'migration')),
  CONSTRAINT activity_event_value_object_links_confidence_check
    CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT activity_event_value_object_links_metadata_is_object_check
    CHECK (jsonb_typeof(metadata_json) = 'object'),
  CONSTRAINT activity_event_value_object_links_unique
    UNIQUE (event_id, value_object_id, source)
);

CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_user_id
  ON public.activity_event_value_object_links(user_id);

CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_event_id
  ON public.activity_event_value_object_links(event_id);

CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_value_object_id
  ON public.activity_event_value_object_links(value_object_id);

CREATE INDEX IF NOT EXISTS idx_activity_event_value_object_links_exposure
  ON public.activity_event_value_object_links(value_object_id, exposure_minutes);

CREATE TABLE IF NOT EXISTS public.value_object_usage_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  value_object_id uuid NOT NULL REFERENCES public.value_objects(id) ON DELETE CASCADE,
  usage_count bigint NOT NULL DEFAULT 0,
  exposure_minutes numeric NOT NULL DEFAULT 0,
  first_used_at timestamp with time zone NULL,
  last_used_at timestamp with time zone NULL,
  last_event_id uuid NULL REFERENCES public.activity_events(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'rule',
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT value_object_usage_aggregates_usage_count_check
    CHECK (usage_count >= 0),
  CONSTRAINT value_object_usage_aggregates_exposure_minutes_check
    CHECK (exposure_minutes >= 0),
  CONSTRAINT value_object_usage_aggregates_source_check
    CHECK (source IN ('rule', 'ai', 'manual', 'system_seed', 'migration')),
  CONSTRAINT value_object_usage_aggregates_metadata_is_object_check
    CHECK (jsonb_typeof(metadata_json) = 'object'),
  CONSTRAINT value_object_usage_aggregates_unique
    UNIQUE (user_id, value_object_id)
);

CREATE INDEX IF NOT EXISTS idx_value_object_usage_aggregates_user_id
  ON public.value_object_usage_aggregates(user_id);

CREATE INDEX IF NOT EXISTS idx_value_object_usage_aggregates_value_object_id
  ON public.value_object_usage_aggregates(value_object_id);

CREATE INDEX IF NOT EXISTS idx_value_object_usage_aggregates_object_cloud
  ON public.value_object_usage_aggregates(user_id, exposure_minutes DESC, usage_count DESC);

COMMIT;

/*
Post-check:

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    table_name IN (
      'value_object_category_links',
      'activity_event_value_object_links',
      'value_object_usage_aggregates'
    )
    OR (
      table_name = 'value_objects'
      AND column_name IN (
        'parent_value_object_id',
        'entity_protocol_characteristics_json',
        'needs_user_review',
        'ui_visibility',
        'category_origin_json',
        'metadata_json'
      )
    )
  )
ORDER BY table_name, ordinal_position;
*/
