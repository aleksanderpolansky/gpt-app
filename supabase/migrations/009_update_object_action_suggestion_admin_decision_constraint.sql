begin;

alter table object_action_suggestion_requests
drop constraint if exists admin_decision_allowed;

alter table object_action_suggestion_requests
drop constraint if exists object_action_suggestion_requests_admin_decision_allowed;

alter table object_action_suggestion_requests
add constraint object_action_suggestion_requests_admin_decision_allowed
check (
  admin_decision is null
  or admin_decision in (
    'approve',
    'merge',
    'reject',
    'archive',
    'approve_existing_match'
  )
);

commit;