begin;

create table if not exists object_action_suggestion_requests (
  id uuid primary key default gen_random_uuid(),

  user_text text not null,
  locale text not null default 'ru',

  context_code text not null default 'business_directory',
  resolved_context_id uuid references contexts(id) on delete set null,

  entity_type text not null default 'organization',
  entity_id uuid,

  request_source text not null default 'directory_category_picker',
  source_type text not null default 'user_submitted',

  created_by_user_id text,

  proposed_object_text text,
  proposed_action_text text,
  proposed_category_text text,

  ai_status text not null default 'pending',
  ai_confidence numeric(5, 4),
  ai_model text,
  ai_prompt_version text,
  ai_suggested_object_text text,
  ai_suggested_action_text text,
  ai_suggested_category_text text,
  ai_suggested_object_type_id uuid references object_types(id) on delete set null,
  ai_suggested_action_type_id uuid references action_types(id) on delete set null,
  ai_suggested_contextual_category_id uuid references contextual_categories(id) on delete set null,
  matched_existing_category_id uuid references contextual_categories(id) on delete set null,
  ai_analysis_json jsonb not null default '{}'::jsonb,
  ai_error_message text,

  status text not null default 'needs_review',
  admin_decision text,
  admin_comment text,
  reviewed_by_user_id text,
  reviewed_at timestamp with time zone,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint object_action_suggestion_requests_user_text_not_empty
    check (length(trim(user_text)) > 0),

  constraint object_action_suggestion_requests_user_text_length
    check (length(user_text) <= 4000),

  constraint object_action_suggestion_requests_locale_not_empty
    check (length(trim(locale)) > 0),

  constraint object_action_suggestion_requests_context_code_not_empty
    check (length(trim(context_code)) > 0),

  constraint object_action_suggestion_requests_entity_type_allowed
    check (
      entity_type in (
        'organization',
        'offer',
        'certificate',
        'purchase_confirmation',
        'personal_activity',
        'health_activity',
        'learning_activity',
        'user_profile',
        'general'
      )
    ),

  constraint object_action_suggestion_requests_request_source_allowed
    check (
      request_source in (
        'directory_category_picker',
        'organization_profile',
        'organization_onboarding',
        'offer_form',
        'admin_panel',
        'api',
        'import',
        'other'
      )
    ),

  constraint object_action_suggestion_requests_source_type_allowed
    check (
      source_type in (
        'user_submitted',
        'owner_submitted',
        'admin_submitted',
        'ai_suggested',
        'imported',
        'system'
      )
    ),

  constraint object_action_suggestion_requests_ai_status_allowed
    check (
      ai_status in (
        'pending',
        'not_requested',
        'processing',
        'matched_existing',
        'new_category_suggested',
        'low_confidence',
        'needs_manual_review',
        'failed',
        'skipped'
      )
    ),

  constraint object_action_suggestion_requests_ai_confidence_range
    check (
      ai_confidence is null
      or (
        ai_confidence >= 0
        and ai_confidence <= 1
      )
    ),

  constraint object_action_suggestion_requests_status_allowed
    check (
      status in (
        'draft',
        'suggested',
        'needs_review',
        'approved',
        'merged',
        'rejected',
        'archived'
      )
    ),

  constraint object_action_suggestion_requests_admin_decision_allowed
    check (
      admin_decision is null
      or admin_decision in (
        'approve',
        'merge',
        'reject',
        'archive'
      )
    ),

  constraint object_action_suggestion_requests_review_consistency
    check (
      (
        admin_decision is null
        and reviewed_at is null
        and reviewed_by_user_id is null
      )
      or (
        admin_decision is not null
        and reviewed_at is not null
      )
    )
);

comment on table object_action_suggestion_requests is
  'Moderation queue for user-submitted Object-Action rubricator suggestions. These rows are not public categories and must not be used in public directory results until approved or merged into the real rubricator tables.';

comment on column object_action_suggestion_requests.user_text is
  'Free text from the user, for example: I repair electric scooters.';

comment on column object_action_suggestion_requests.context_code is
  'Requested context code, for example business_directory, health, learning, finance.';

comment on column object_action_suggestion_requests.entity_type is
  'Polymorphic entity type connected with the suggestion, for example organization.';

comment on column object_action_suggestion_requests.entity_id is
  'Optional polymorphic entity id connected with the suggestion, for example organizations.id.';

comment on column object_action_suggestion_requests.ai_status is
  'AI pre-analysis status. AI may suggest or match, but must not publish categories automatically.';

comment on column object_action_suggestion_requests.status is
  'Moderation status of the suggestion request. Public publication happens only after admin moderation and promotion into real rubricator tables.';

create index if not exists object_action_suggestion_requests_status_idx
on object_action_suggestion_requests (status);

create index if not exists object_action_suggestion_requests_ai_status_idx
on object_action_suggestion_requests (ai_status);

create index if not exists object_action_suggestion_requests_context_code_idx
on object_action_suggestion_requests (context_code);

create index if not exists object_action_suggestion_requests_resolved_context_id_idx
on object_action_suggestion_requests (resolved_context_id);

create index if not exists object_action_suggestion_requests_entity_idx
on object_action_suggestion_requests (entity_type, entity_id);

create index if not exists object_action_suggestion_requests_created_by_user_id_idx
on object_action_suggestion_requests (created_by_user_id);

create index if not exists object_action_suggestion_requests_matched_existing_category_id_idx
on object_action_suggestion_requests (matched_existing_category_id);

create index if not exists object_action_suggestion_requests_created_at_idx
on object_action_suggestion_requests (created_at desc);

create index if not exists object_action_suggestion_requests_ai_analysis_json_gin_idx
on object_action_suggestion_requests
using gin (ai_analysis_json);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'object_action_suggestion_requests_set_updated_at'
  ) then
    create trigger object_action_suggestion_requests_set_updated_at
    before update on object_action_suggestion_requests
    for each row
    execute function set_universal_rubricator_updated_at();
  end if;
end $$;

alter table object_action_suggestion_requests enable row level security;

grant insert on object_action_suggestion_requests to anon, authenticated;

drop policy if exists "Public can submit object action suggestion requests" on object_action_suggestion_requests;

create policy "Public can submit object action suggestion requests"
on object_action_suggestion_requests
for insert
to anon, authenticated
with check (
  status = 'needs_review'
  and admin_decision is null
  and admin_comment is null
  and reviewed_by_user_id is null
  and reviewed_at is null
);

commit;