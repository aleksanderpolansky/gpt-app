begin;

create table if not exists object_action_suggestion_events (
  id uuid primary key default gen_random_uuid(),

  suggestion_request_id uuid not null references object_action_suggestion_requests(id),

  actor_user_id uuid null references app_users(id),
  actor_role text null,

  event_type text not null,
  event_source text not null default 'admin_ui',

  status_before text null,
  status_after text not null,

  ai_status_before text null,
  ai_status_after text null,

  admin_decision text null,
  matched_existing_category_id uuid null references contextual_categories(id),
  created_contextual_category_id uuid null references contextual_categories(id),

  previous_values jsonb null,
  new_values jsonb null,
  metadata_json jsonb not null default '{}'::jsonb,

  public_note text null,
  internal_note text null,

  previous_hash text null,
  record_hash text null,

  created_at timestamp with time zone not null default now(),

  constraint object_action_suggestion_events_event_type_allowed
  check (
    event_type in (
      'created',
      'ai_analyzed',
      'rejected',
      'archived',
      'approve_existing_match',
      'approve_new_category',
      'status_changed',
      'comment_added',
      'rollback_requested',
      'rollback_applied'
    )
  ),

  constraint object_action_suggestion_events_event_source_allowed
  check (
    event_source in (
      'admin_ui',
      'api',
      'system',
      'ai',
      'import'
    )
  ),

  constraint object_action_suggestion_events_internal_note_not_empty
  check (
    internal_note is null
    or length(trim(internal_note)) > 0
  ),

  constraint object_action_suggestion_events_public_note_not_empty
  check (
    public_note is null
    or length(trim(public_note)) > 0
  )
);

create index if not exists object_action_suggestion_events_request_id_idx
on object_action_suggestion_events(suggestion_request_id);

create index if not exists object_action_suggestion_events_actor_user_id_idx
on object_action_suggestion_events(actor_user_id);

create index if not exists object_action_suggestion_events_event_type_idx
on object_action_suggestion_events(event_type);

create index if not exists object_action_suggestion_events_created_at_idx
on object_action_suggestion_events(created_at desc);

create index if not exists object_action_suggestion_events_matched_category_idx
on object_action_suggestion_events(matched_existing_category_id);

create index if not exists object_action_suggestion_events_created_category_idx
on object_action_suggestion_events(created_contextual_category_id);

commit;