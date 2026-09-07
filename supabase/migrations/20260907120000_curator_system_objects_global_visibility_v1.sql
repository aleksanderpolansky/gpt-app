-- ARCTOR_CURATOR_SYSTEM_OBJECTS_GLOBAL_VISIBILITY_V1
-- Decision:
--   A System observation object confirmed by the Reality Curator is an active
--   ownerless GLOBAL catalog object immediately available to all users.
--   Actor/private objects remain private to their owner.
-- Scope:
--   Promote only rows created by the controlled curator contract
--   (metadata_json.curator_system_draft_v1). Unrelated system-hidden rows are
--   not touched.

begin;

do $preflight$
begin
  if to_regclass('public.value_objects') is null then
    raise exception using
      errcode='42P01',
      message='ARCTOR_GLOBAL_VISIBILITY_VALUE_OBJECTS_MISSING';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='value_objects'
      and column_name='metadata_json'
  ) then
    raise exception using
      errcode='42703',
      message='ARCTOR_GLOBAL_VISIBILITY_METADATA_COLUMN_MISSING';
  end if;

  if exists (
    select 1
    from public.value_objects vo
    where vo.metadata_json ? 'curator_system_draft_v1'
      and (
        vo.scope_code is distinct from 'global'
        or vo.owner_user_id is not null
        or vo.owner_actor_id is not null
        or vo.origin_type_code is distinct from 'system_model'
      )
  ) then
    raise exception using
      errcode='23514',
      message='ARCTOR_GLOBAL_VISIBILITY_CURATOR_ROW_CONTRACT_MISMATCH';
  end if;
end
$preflight$;

update public.value_objects vo
set
  status='active',
  visibility='public',
  privacy_level='public',
  visibility_code='public',
  privacy_class_code='public_ontology',
  updated_at=clock_timestamp(),
  metadata_json=
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            coalesce(vo.metadata_json,'{}'::jsonb)
              - 'system_hidden_from_observation_ui',
            '{curator_system_draft_v1,publicationState}',
            to_jsonb('published_by_curator_confirmation'::text),
            true
          ),
          '{curator_system_draft_v1,publishedAt}',
          to_jsonb(clock_timestamp()::text),
          true
        ),
        '{curator_global_visibility_v1}',
        jsonb_build_object(
          'promotedFromStatus',vo.status,
          'previousHidden',
            coalesce((vo.metadata_json->>'system_hidden_from_observation_ui')::boolean,false),
          'migratedAt',clock_timestamp()
        ),
        true
      ),
      '{curator_system_draft_v1,publicationMode}',
      to_jsonb('immediate_global_after_curator_confirmation'::text),
      true
    )
where vo.scope_code='global'
  and vo.owner_user_id is null
  and vo.owner_actor_id is null
  and vo.origin_type_code='system_model'
  and vo.metadata_json ? 'curator_system_draft_v1'
  and not (vo.metadata_json ? 'curator_global_visibility_v1')
  and (
    vo.status is distinct from 'active'
    or coalesce((vo.metadata_json->>'system_hidden_from_observation_ui')::boolean,false)
    or coalesce(vo.metadata_json #>> '{curator_system_draft_v1,publicationState}','')
       <> 'published_by_curator_confirmation'
  );

commit;
