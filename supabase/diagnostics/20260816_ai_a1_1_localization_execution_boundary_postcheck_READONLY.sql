-- ARCTor.app
-- AI-A1.1 Localization execution boundary runtime postcheck
-- READ ONLY
-- Run after one NEW quick-capture activity created by the patched runtime.

with localization as (
  select
    e.id,
    e.status,
    e.created_at,
    e.completed_at,
    e.surface_code,
    e.operation_kind,
    e.metadata_json
  from public.ai_analysis_executions e
  where e.surface_code = 'content_localization'
    and e.operation_kind = 'content_localization'
    and coalesce(e.metadata_json ->> 'parentSemanticExecutionId', '') <> ''
  order by e.created_at desc
  limit 1
),
semantic as (
  select
    e.id,
    e.status,
    e.created_at,
    e.completed_at,
    e.surface_code,
    e.operation_kind
  from public.ai_analysis_executions e
  join localization l
    on e.id::text = l.metadata_json ->> 'parentSemanticExecutionId'
  where e.surface_code = 'global_observation_preview'
    and e.operation_kind = 'activity_semantic_intake'
  limit 1
),
semantic_counts as (
  select
    s.id,
    count(distinct m.id) as manifest_count,
    count(distinct m.id) filter (where m.status = 'validated') as validated_manifest_count,
    count(distinct u.id) as usage_event_count,
    count(distinct m.ai_usage_event_id) filter (
      where m.status = 'validated'
        and m.ai_usage_event_id is not null
        and exists (
          select 1
          from public.ai_usage_events ux
          where ux.id = m.ai_usage_event_id
            and ux.analysis_execution_id = s.id
        )
    ) as manifest_linked_usage_count,
    bool_and(coalesce(m.store_provider_state, false) = false) as store_false,
    bool_and(coalesce(m.max_retries, 0) = 0) as zero_retries,
    bool_and(coalesce(u.status, '') = 'openai_completed') as usage_completed
  from semantic s
  left join public.ai_context_manifests m
    on m.analysis_execution_id = s.id
  left join public.ai_usage_events u
    on u.analysis_execution_id = s.id
  group by s.id
),
localization_counts as (
  select
    l.id,
    count(distinct m.id) as manifest_count,
    count(distinct m.id) filter (where m.status = 'validated') as validated_manifest_count,
    count(distinct u.id) as usage_event_count,
    count(distinct m.ai_usage_event_id) filter (
      where m.status = 'validated'
        and m.ai_usage_event_id is not null
        and exists (
          select 1
          from public.ai_usage_events ux
          where ux.id = m.ai_usage_event_id
            and ux.analysis_execution_id = l.id
        )
    ) as manifest_linked_usage_count,
    bool_and(coalesce(m.store_provider_state, false) = false) as store_false,
    bool_and(coalesce(m.max_retries, 0) = 0) as zero_retries,
    bool_and(coalesce(u.status, '') = 'openai_completed') as usage_completed,
    bool_and(
      coalesce((m.context_metadata_json #>> '{runtimeContextCompiler,actorInstructionApplied}')::boolean, false) = false
    ) as actor_guidance_not_applied,
    bool_and(
      coalesce(m.context_metadata_json #>> '{runtimeContextCompiler,actorInstructionPolicy}', '') = 'disabled_for_runtime'
    ) as actor_policy_disabled
  from localization l
  left join public.ai_context_manifests m
    on m.analysis_execution_id = l.id
  left join public.ai_usage_events u
    on u.analysis_execution_id = l.id
  group by l.id
)
select jsonb_build_object(
  'contract', 'ARCTOR_AI_A1_1_EXECUTION_BOUNDARY_POSTCHECK_V1',
  'semanticExecution', (
    select jsonb_build_object(
      'id', s.id,
      'status', s.status,
      'created_at', s.created_at,
      'completed_at', s.completed_at,
      'surface_code', s.surface_code,
      'operation_kind', s.operation_kind,
      'manifestCount', coalesce(sc.manifest_count, 0),
      'validatedManifestCount', coalesce(sc.validated_manifest_count, 0),
      'usageEventCount', coalesce(sc.usage_event_count, 0),
      'manifestLinkedUsageCount', coalesce(sc.manifest_linked_usage_count, 0)
    )
    from semantic s
    left join semantic_counts sc on sc.id = s.id
  ),
  'localizationExecution', (
    select jsonb_build_object(
      'id', l.id,
      'status', l.status,
      'created_at', l.created_at,
      'completed_at', l.completed_at,
      'surface_code', l.surface_code,
      'operation_kind', l.operation_kind,
      'parentSemanticExecutionId', l.metadata_json ->> 'parentSemanticExecutionId',
      'manifestCount', coalesce(lc.manifest_count, 0),
      'validatedManifestCount', coalesce(lc.validated_manifest_count, 0),
      'usageEventCount', coalesce(lc.usage_event_count, 0),
      'manifestLinkedUsageCount', coalesce(lc.manifest_linked_usage_count, 0),
      'actorGuidanceNotApplied', coalesce(lc.actor_guidance_not_applied, false),
      'actorPolicyDisabled', coalesce(lc.actor_policy_disabled, false)
    )
    from localization l
    left join localization_counts lc on lc.id = l.id
  ),
  'acceptance', jsonb_build_object(
    'semanticCompleted', coalesce((select status = 'completed' from semantic), false),
    'semanticHasExactlyTwoManifests', coalesce((select manifest_count = 2 from semantic_counts), false),
    'semanticHasTwoValidatedManifests', coalesce((select validated_manifest_count = 2 from semantic_counts), false),
    'semanticHasTwoUsageEvents', coalesce((select usage_event_count = 2 from semantic_counts), false),
    'semanticManifestUsageLinksExact', coalesce((select manifest_linked_usage_count = 2 from semantic_counts), false),
    'semanticUsageCompleted', coalesce((select usage_completed from semantic_counts), false),
    'semanticStoreFalse', coalesce((select store_false from semantic_counts), false),
    'semanticZeroRetries', coalesce((select zero_retries from semantic_counts), false),
    'localizationCompleted', coalesce((select status = 'completed' from localization), false),
    'localizationHasExactlyOneManifest', coalesce((select manifest_count = 1 from localization_counts), false),
    'localizationHasOneValidatedManifest', coalesce((select validated_manifest_count = 1 from localization_counts), false),
    'localizationHasOneUsageEvent', coalesce((select usage_event_count = 1 from localization_counts), false),
    'localizationManifestUsageLinkExact', coalesce((select manifest_linked_usage_count = 1 from localization_counts), false),
    'localizationUsageCompleted', coalesce((select usage_completed from localization_counts), false),
    'localizationStoreFalse', coalesce((select store_false from localization_counts), false),
    'localizationZeroRetries', coalesce((select zero_retries from localization_counts), false),
    'localizationActorGuidanceNotApplied', coalesce((select actor_guidance_not_applied from localization_counts), false),
    'localizationActorPolicyDisabled', coalesce((select actor_policy_disabled from localization_counts), false)
  )
) as arctor_ai_a1_1_runtime_postcheck;
