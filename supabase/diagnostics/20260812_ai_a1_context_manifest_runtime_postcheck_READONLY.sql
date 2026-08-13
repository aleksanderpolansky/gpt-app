-- ARCTor.app — AI-A1 Context Manifest runtime postcheck
-- READ ONLY. No raw user text, instruction text or personal identifiers are returned.

with latest_execution as (
  select
    id,
    surface_code,
    operation_kind,
    input_hash,
    status,
    started_at,
    completed_at,
    created_at
  from public.ai_analysis_executions
  where surface_code = 'global_observation_preview'
  order by created_at desc
  limit 1
),
manifest_rows as (
  select
    m.analysis_execution_id,
    m.stage_sequence,
    m.stage_code,
    m.protocol_code,
    m.protocol_version,
    m.schema_name,
    m.schema_version,
    m.schema_hash,
    m.system_prompt_hash,
    m.request_hash,
    m.response_hash,
    m.provider,
    m.model_name,
    m.model_tier,
    m.store_provider_state,
    m.max_retries,
    m.max_output_tokens,
    m.status,
    m.validator_result_json,
    case
      when m.stage_code='domain_facet_routing'
        then jsonb_array_length(coalesce(m.retrieval_snapshot_json->'domainFacetOptions','[]'::jsonb))
      when m.stage_code='leaf_parameter_selection'
        then jsonb_array_length(coalesce(m.retrieval_snapshot_json->'candidateGroups','[]'::jsonb))
      else null
    end as retrieval_group_count,
    m.ai_usage_event_id,
    m.created_at
  from public.ai_context_manifests m
  join latest_execution e on e.id=m.analysis_execution_id
),
usage_rows as (
  select
    u.id,
    u.analysis_execution_id,
    u.model_name,
    u.provider,
    u.status,
    u.input_tokens,
    u.cached_input_tokens,
    u.output_tokens,
    u.total_tokens,
    u.actual_provider_cost_usd,
    u.openai_response_id,
    u.created_at,
    u.completed_at
  from public.ai_usage_events u
  join latest_execution e on e.id=u.analysis_execution_id
)
select jsonb_pretty(
  jsonb_build_object(
    'contract','ARCTOR_AI_A1_CONTEXT_MANIFEST_RUNTIME_POSTCHECK_V1',
    'execution',(
      select to_jsonb(e)
      from latest_execution e
    ),
    'manifestCount',(select count(*) from manifest_rows),
    'manifests',coalesce((
      select jsonb_agg(to_jsonb(m) order by m.stage_sequence)
      from manifest_rows m
    ),'[]'::jsonb),
    'usageEventCount',(select count(*) from usage_rows),
    'usageEvents',coalesce((
      select jsonb_agg(to_jsonb(u) order by u.created_at)
      from usage_rows u
    ),'[]'::jsonb),
    'acceptance',jsonb_build_object(
      'executionCompleted',coalesce((select status='completed' from latest_execution),false),
      'twoValidatedManifests',(
        select count(*)=2 and bool_and(status='validated')
        from manifest_rows
      ),
      'twoUsageEventsLinked',(
        select count(*)=2
        from usage_rows
      ),
      'storeFalse',coalesce((select bool_and(not store_provider_state) from manifest_rows),false),
      'zeroAutomaticRetries',coalesce((select bool_and(max_retries=0) from manifest_rows),false),
      'allHashesPresent',coalesce((
        select bool_and(
          schema_hash ~ '^[0-9a-f]{64}$'
          and system_prompt_hash ~ '^[0-9a-f]{64}$'
          and request_hash ~ '^[0-9a-f]{64}$'
          and response_hash ~ '^[0-9a-f]{64}$'
        )
        from manifest_rows
      ),false)
    )
  )
) as arctor_ai_a1_runtime_postcheck;
