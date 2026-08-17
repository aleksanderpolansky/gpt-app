-- ARCTor.app
-- AI-A3.1 REVIEW-FIRST semantic fact pipeline
-- READ-ONLY schema/runtime counters postcheck.

with contract as (
  select public.ai_a3_1_review_first_schema_preflight_v1() as payload
),
counts as (
  select
    (select count(*) from public.activity_semantic_review_drafts_a31) as review_draft_rows,
    (select count(*) from public.activity_semantic_review_drafts_a31 where status='committed') as committed_review_rows,
    (select count(*) from public.activity_leaf_fact_coefficient_rules_a31 where status='active') as active_coefficient_rules,
    (select count(*) from public.actor_value_object_recognition_examples_a31) as actor_recognition_examples,
    (
      select count(*)
      from public.activity_object_facts
      where metadata->>'contract'='ARCTOR_AI_A3_1_REVIEW_FACT_COMMIT_V1'
    ) as review_fact_rows,
    (
      select count(*)
      from public.activity_events
      where coalesce(metadata_json->>'quickCaptureContract','')
        ='ARCTOR_AI_A3_1_REVIEW_FIRST_CAPTURE_V1'
        and coalesce(metadata_json->>'quickCaptureReviewStatus','')='pending'
    ) as pending_review_first_activities
)
select jsonb_pretty(
  contract.payload
  ||jsonb_build_object(
    'check','ARCTOR_AI_A3_1_REVIEW_FIRST_POSTCHECK_V1',
    'reviewDraftRows',counts.review_draft_rows,
    'committedReviewRows',counts.committed_review_rows,
    'activeCoefficientRules',counts.active_coefficient_rules,
    'actorRecognitionExamples',counts.actor_recognition_examples,
    'reviewFactRows',counts.review_fact_rows,
    'pendingReviewFirstActivities',counts.pending_review_first_activities,
    'readOnly',true
  )
) as arctor_ai_a3_1_review_first_postcheck
from contract,counts;
