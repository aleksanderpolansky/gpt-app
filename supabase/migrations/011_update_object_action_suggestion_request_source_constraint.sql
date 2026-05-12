alter table object_action_suggestion_requests
drop constraint if exists object_action_suggestion_requests_request_source_allowed;

alter table object_action_suggestion_requests
add constraint object_action_suggestion_requests_request_source_allowed
check (
  request_source in (
    'directory_category_picker',
    'organization_profile',
    'organization_onboarding',
    'organization_category_change',
    'offer_form',
    'admin_panel',
    'api',
    'import',
    'other'
  )
);