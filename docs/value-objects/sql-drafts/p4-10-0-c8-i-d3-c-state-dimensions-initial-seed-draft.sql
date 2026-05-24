-- GPT-APP / AI-NAVIGATOR
-- P4.10.0-C8-I-D3-C — Draft Initial State Dimensions Seed SQL
--
-- Date: 2026-05-24
-- Status: DRAFT SEED SQL — DO NOT EXECUTE BEFORE REVIEW
--
-- Previous completed step:
-- P4.10.0-C8-I-D3-B — Reviewed Initial State Dimensions Seed List
--
-- Previous commit:
-- 38ced40 docs: add C8-I-D3-B reviewed state dimensions seed list
--
-- Purpose:
-- Seed public.state_dimensions with the first conservative state dimension dictionary.
--
-- Safety rules:
-- - This draft must only seed public.state_dimensions.
-- - This draft must not create user state facts.
-- - This draft must not create or modify Value Object subtypes.
-- - This draft must not touch value_objects.
-- - This draft must not touch activity_events.
-- - This draft must not touch impact_rules or impact_events.
-- - This draft must not touch commerce, points, certificates, offers, bookings, wallets, or purchase confirmations.
-- - This draft must not infer medical, hormonal, psychological, financial, or confirmed business outcomes.
--
-- Review rule:
-- Keep this file outside supabase/migrations until reviewed.

begin;

insert into public.state_dimensions (
  dimension_key,
  title,
  domain,
  description,
  unit_type,
  default_privacy_level,
  claim_policy,
  allowed_source_types,
  forbidden_claims,
  safer_proxy_wording,
  is_sensitive,
  is_active,
  metadata_json
)
values
(
  'attention_load',
  'Attention Load',
  'cognitive',
  'A non-medical estimate of how much attention or cognitive capacity has been required by recent activities.',
  'score_or_minutes',
  'private',
  'system_estimate',
  '["manual", "rule", "ai", "system", "correction"]'::jsonb,
  '[
    "attention disorder",
    "ADHD",
    "cognitive impairment",
    "mental health diagnosis"
  ]'::jsonb,
  '{
    "default": "attention load",
    "low": "low attention load",
    "medium": "moderate attention load",
    "high": "high attention demand",
    "disclaimer": "This is a planning signal, not a medical or psychological conclusion."
  }'::jsonb,
  false,
  true,
  '{
    "nba_use": "Can help decide whether the next action should be deep work, light work, recovery, language repetition, or a physical micro-break.",
    "first_seed": true,
    "safe_mvp": true,
    "seed_step": "P4.10.0-C8-I-D3-C"
  }'::jsonb
),
(
  'fatigue_signal',
  'Fatigue Signal',
  'recovery',
  'A weak proxy signal that the user may be tired based on workload, duration, sleep-related context, manual input, or repeated low-efficiency patterns.',
  'score',
  'private',
  'proxy_only',
  '["manual", "user_confirmed", "rule", "ai", "system", "correction"]'::jsonb,
  '[
    "diagnosed fatigue",
    "chronic fatigue",
    "medical exhaustion",
    "burnout diagnosis"
  ]'::jsonb,
  '{
    "default": "fatigue signal",
    "low": "low fatigue signal",
    "medium": "possible tiredness",
    "high": "stronger fatigue signal",
    "disclaimer": "This is a proxy signal, not a diagnosis."
  }'::jsonb,
  true,
  true,
  '{
    "nba_use": "Can reduce recommendation intensity and suggest recovery, passive learning, stretching, hydration, or low-cognitive-load tasks.",
    "first_seed": true,
    "safe_mvp": true,
    "seed_step": "P4.10.0-C8-I-D3-C"
  }'::jsonb
),
(
  'recovery_need',
  'Recovery Need',
  'recovery',
  'A safe estimate that the user may benefit from a recovery-oriented activity or lower-load next action.',
  'score',
  'private',
  'system_estimate',
  '["manual", "user_confirmed", "rule", "ai", "system", "correction"]'::jsonb,
  '[
    "medical recovery required",
    "clinical rest requirement",
    "injury diagnosis",
    "illness diagnosis"
  ]'::jsonb,
  '{
    "default": "recovery need",
    "low": "low recovery need",
    "medium": "some recovery may be useful",
    "high": "recovery-oriented activity may be useful",
    "disclaimer": "This is a planning estimate, not medical advice."
  }'::jsonb,
  true,
  true,
  '{
    "nba_use": "Can rank rest, sleep, stretching, food, hydration, walking, or low-load tasks higher when appropriate.",
    "first_seed": true,
    "safe_mvp": true,
    "seed_step": "P4.10.0-C8-I-D3-C"
  }'::jsonb
),
(
  'stress_load_estimate',
  'Stress Load Estimate',
  'emotional_regulation',
  'A proxy estimate of stress load based on activity context, conflicts, workload, interruptions, or user-confirmed stress.',
  'score',
  'private',
  'proxy_only',
  '["manual", "user_confirmed", "rule", "ai", "system", "correction"]'::jsonb,
  '[
    "high cortisol",
    "anxiety disorder",
    "panic disorder",
    "mental illness",
    "psychiatric condition"
  ]'::jsonb,
  '{
    "default": "stress load estimate",
    "low": "low stress-load signal",
    "medium": "possible stress pressure",
    "high": "higher emotional load signal",
    "disclaimer": "This is a proxy estimate, not a medical or psychological conclusion."
  }'::jsonb,
  true,
  true,
  '{
    "nba_use": "Can suggest decompression, conflict-free tasks, breathing, walking, lower-stakes work, or postponing hard negotiation.",
    "first_seed": true,
    "safe_mvp": true,
    "seed_step": "P4.10.0-C8-I-D3-C"
  }'::jsonb
),
(
  'learning_progress_signal',
  'Learning Progress Signal',
  'learning',
  'A non-certifying estimate of learning progress based on completed learning activities, repetitions, tests, corrections, and review frequency.',
  'score',
  'private',
  'system_estimate',
  '["manual", "rule", "ai", "system", "import", "correction"]'::jsonb,
  '[
    "certified level achieved",
    "official proficiency confirmed",
    "guaranteed exam readiness"
  ]'::jsonb,
  '{
    "default": "learning progress signal",
    "low": "low recent learning momentum",
    "medium": "some learning momentum",
    "high": "stronger practice momentum",
    "disclaimer": "This is not an official certificate or proficiency confirmation."
  }'::jsonb,
  false,
  true,
  '{
    "nba_use": "Can detect weak learning directions and suggest next exercises.",
    "first_seed": true,
    "safe_mvp": true,
    "seed_step": "P4.10.0-C8-I-D3-C"
  }'::jsonb
),
(
  'language_practice_balance',
  'Language Practice Balance',
  'learning_languages',
  'A balance estimate across language-practice directions such as English, German, Spanish, and Polish.',
  'score_or_distribution',
  'private',
  'system_estimate',
  '["manual", "rule", "ai", "system", "import", "correction"]'::jsonb,
  '[
    "language mastered",
    "official fluency confirmed",
    "certificate level achieved"
  ]'::jsonb,
  '{
    "default": "language practice balance",
    "low": "undertrained language direction",
    "medium": "moderate language-practice balance",
    "high": "stronger attention to this language",
    "disclaimer": "This is a practice-balance signal, not an official language-level assessment."
  }'::jsonb,
  false,
  true,
  '{
    "nba_use": "Can identify which language is under-practiced and should be proposed next.",
    "first_seed": true,
    "safe_mvp": true,
    "seed_step": "P4.10.0-C8-I-D3-C"
  }'::jsonb
),
(
  'physical_activity_load',
  'Physical Activity Load',
  'physical_activity',
  'A non-medical estimate of physical load based on activity records, duration, intensity, movement type, or user input.',
  'score_or_minutes',
  'private',
  'system_estimate',
  '["manual", "user_confirmed", "rule", "ai", "system", "import", "correction"]'::jsonb,
  '[
    "muscle growth confirmed",
    "injury diagnosed",
    "testosterone increased",
    "fat loss confirmed",
    "medical improvement"
  ]'::jsonb,
  '{
    "default": "physical activity load",
    "low": "low movement load",
    "medium": "moderate physical load",
    "high": "higher body-load signal",
    "disclaimer": "This is a training/planning signal, not a medical or body-composition conclusion."
  }'::jsonb,
  true,
  true,
  '{
    "nba_use": "Can prevent excessive load and recommend recovery, stretching, or light movement.",
    "first_seed": true,
    "safe_mvp": true,
    "seed_step": "P4.10.0-C8-I-D3-C"
  }'::jsonb
),
(
  'family_care_load_signal',
  'Family Care Load Signal',
  'family_care',
  'A proxy signal that the user performed family or care responsibility, such as helping a child learn, supervision, caregiving, or family duty.',
  'score_or_minutes',
  'private',
  'proxy_only',
  '["manual", "user_confirmed", "rule", "ai", "system", "correction"]'::jsonb,
  '[
    "child development improved",
    "parenting quality score",
    "family relationship diagnosis",
    "child psychological state"
  ]'::jsonb,
  '{
    "default": "family care load",
    "low": "low family-care load",
    "medium": "care responsibility signal",
    "high": "higher childcare-related effort",
    "disclaimer": "This describes activity meaning and load, not child outcomes or family diagnosis."
  }'::jsonb,
  true,
  true,
  '{
    "nba_use": "Can recognize family obligations and help balance recovery, work, learning, and delayed tasks.",
    "first_seed": true,
    "safe_mvp": true,
    "seed_step": "P4.10.0-C8-I-D3-C"
  }'::jsonb
),
(
  'work_responsibility_load',
  'Work Responsibility Load',
  'work',
  'A non-sensitive estimate of work responsibility load based on job-related tasks, obligations, time blocks, or role-based actions.',
  'score_or_minutes',
  'private',
  'system_estimate',
  '["manual", "rule", "ai", "system", "import", "correction"]'::jsonb,
  '[
    "job performance score",
    "employer evaluation",
    "disciplinary risk",
    "legal conclusion"
  ]'::jsonb,
  '{
    "default": "work responsibility load",
    "low": "low work-duty load",
    "medium": "moderate work obligation load",
    "high": "higher job-related effort",
    "disclaimer": "This is a workload/planning signal, not an employer evaluation or legal conclusion."
  }'::jsonb,
  false,
  true,
  '{
    "nba_use": "Can detect when work obligations are high and additional business or learning tasks should be lighter.",
    "first_seed": true,
    "safe_mvp": true,
    "seed_step": "P4.10.0-C8-I-D3-C"
  }'::jsonb
),
(
  'pipeline_building_effort',
  'Pipeline Building Effort',
  'business_development',
  'A safe estimate that the user performed activities that may build future business, sales, job-search, or partnership opportunities.',
  'score_or_minutes',
  'private',
  'system_estimate',
  '["manual", "rule", "ai", "system", "correction"]'::jsonb,
  '[
    "client acquired",
    "deal closed",
    "revenue earned",
    "guaranteed lead",
    "confirmed sales result"
  ]'::jsonb,
  '{
    "default": "pipeline-building effort",
    "low": "low commercial outreach effort",
    "medium": "some sales opportunity preparation",
    "high": "stronger business-development effort",
    "disclaimer": "This is preparation effort, not confirmed revenue or a closed deal."
  }'::jsonb,
  false,
  true,
  '{
    "nba_use": "Can rank business-development actions without claiming actual sales outcomes.",
    "first_seed": true,
    "safe_mvp": true,
    "seed_step": "P4.10.0-C8-I-D3-C"
  }'::jsonb
),
(
  'financial_pressure_signal',
  'Financial Pressure Signal',
  'financial_context',
  'A user-confirmed or explicitly entered signal that financial pressure is relevant to current planning.',
  'score_or_flag',
  'private',
  'user_confirmed',
  '["manual", "user_confirmed", "correction"]'::jsonb,
  '[
    "financial distress diagnosis",
    "bankruptcy risk",
    "creditworthiness",
    "income confirmed",
    "debt confirmed without user input"
  ]'::jsonb,
  '{
    "default": "financial pressure signal",
    "low": "low money-related planning pressure",
    "medium": "some financial priority signal",
    "high": "stronger income-related motivation signal",
    "disclaimer": "This should be based on user confirmation, not hidden financial inference."
  }'::jsonb,
  true,
  true,
  '{
    "nba_use": "Can prioritize income-generating, job-search, sales, or certification activities when user-confirmed.",
    "first_seed": true,
    "safe_mvp": true,
    "seed_step": "P4.10.0-C8-I-D3-C"
  }'::jsonb
),
(
  'social_interaction_load',
  'Social Interaction Load',
  'social_context',
  'A non-diagnostic estimate of the amount of social interaction or communication load.',
  'score_or_minutes',
  'private',
  'system_estimate',
  '["manual", "rule", "ai", "system", "correction"]'::jsonb,
  '[
    "social anxiety",
    "personality disorder",
    "relationship diagnosis",
    "psychological condition"
  ]'::jsonb,
  '{
    "default": "social interaction load",
    "low": "low people-facing effort",
    "medium": "moderate communication load",
    "high": "higher interaction intensity",
    "disclaimer": "This is an interaction-load signal, not a psychological conclusion."
  }'::jsonb,
  false,
  true,
  '{
    "nba_use": "Can suggest whether the next action should be people-facing or solitary.",
    "first_seed": true,
    "safe_mvp": true,
    "seed_step": "P4.10.0-C8-I-D3-C"
  }'::jsonb
)
on conflict (dimension_key) do update
set
  title = excluded.title,
  domain = excluded.domain,
  description = excluded.description,
  unit_type = excluded.unit_type,
  default_privacy_level = excluded.default_privacy_level,
  claim_policy = excluded.claim_policy,
  allowed_source_types = excluded.allowed_source_types,
  forbidden_claims = excluded.forbidden_claims,
  safer_proxy_wording = excluded.safer_proxy_wording,
  is_sensitive = excluded.is_sensitive,
  is_active = excluded.is_active,
  metadata_json = excluded.metadata_json;

commit;

-- ============================================================
-- Manual review checks before executable migration creation
-- ============================================================
--
-- 1. This file must remain outside supabase/migrations until reviewed.
-- 2. Expected inserted/upserted dimension count: 12.
-- 3. Sensitive true count: 6.
-- 4. Sensitive false count: 6.
-- 5. Active true count: 12.
-- 6. claim_policy counts:
--    - system_estimate: 8
--    - proxy_only: 3
--    - user_confirmed: 1
--    - direct_measurement: 0
--    - blocked: 0
-- 7. This file must not contain:
--    - create table
--    - alter table public.value_objects
--    - alter table public.activity_events
--    - alter table public.impact_rules
--    - alter table public.impact_events
--    - insert into public.value_object_state_facts
--    - insert into public.value_objects
--    - insert into public.recommendation_feedback
--    - delete from
--    - truncate
--    - drop table
--
-- Suggested post-execution smoke check later:
--
-- select
--   dimension_key,
--   title,
--   domain,
--   claim_policy,
--   default_privacy_level,
--   is_sensitive,
--   is_active
-- from public.state_dimensions
-- where dimension_key in (
--   'attention_load',
--   'fatigue_signal',
--   'recovery_need',
--   'stress_load_estimate',
--   'learning_progress_signal',
--   'language_practice_balance',
--   'physical_activity_load',
--   'family_care_load_signal',
--   'work_responsibility_load',
--   'pipeline_building_effort',
--   'financial_pressure_signal',
--   'social_interaction_load'
-- )
-- order by dimension_key;
