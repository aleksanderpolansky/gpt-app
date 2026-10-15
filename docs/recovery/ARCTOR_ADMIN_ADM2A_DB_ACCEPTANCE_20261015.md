# ADM-2A: Supabase foundation and audit-history acceptance

Date: 2026-10-15. Source: manually executed SQL scripts with administrator-confirmed postchecks.

## Database changes already executed manually (DO NOT rerun against the same production DB)

1. `20261015120000_arctor_admin_adm2a_case_foundation.sql`: four tables, eight role records, RLS, service_role permissions.
2. `20261015130000_arctor_admin_adm2a_event_history_hardening.sql`: REVOKE UPDATE/DELETE/TRUNCATE on the audit events table and install two ALWAYS protective triggers.

## Confirmed SQL verification supplied by the administrator

- `ARCTOR_ADMIN_ADM2A_POSTCHECK_V1`: PASS; tablesInstalled=4; roleCount=8; rlsEnabled=4; casesStored=0; assignmentsStored=0; historyEventsStored=0; agentExecutionEnabled=0; serviceRoleEventAppend=true; serviceRoleCanChangeEventHistory=false; browserTableGrantsPresent=false; sourceDedupIndexPresent=true; existingQueuesUnchanged=true; automaticCommercialFactWritingChanged=false.
- `ARCTOR_ADMIN_ADM2A_AUDIT_GUARD_POSTCHECK_V1`: PASS; serviceCanSelect=true; serviceCanInsert=true; serviceCanUpdate=false; serviceCanDelete=false; serviceCanTruncate=false; protectiveTriggersEnabled=2; dbWritesPerformed=false.

These checks do not prove current commercial auto-fact writing switch is OFF; only that the ADM-2A migration did not change that switch. Verify the current setting independently before enabling any automation.

## Deployment and migration history note

Both SQL scripts have ALREADY been applied manually in Supabase. They are committed here to version control for reproducibility and audit purposes. They are NOT registered automatically in `supabase_migrations.schema_migrations` by this Git commit. Do not run `supabase db push` or reapply this non-idempotent foundation migration to the same project without explicitly reconciling its migration history in a reviewed, separate task. Git/Vercel deployment does not by itself rerun these SQL files.

## Security

`service_role` has read-and-append privileges on case events but no UPDATE, DELETE, TRUNCATE per checks. The protection does not protect against a privileged database owner who can modify schema, triggers, roles or their grants. Agent execution is disabled. Current user-facing routes are not connected to ADM-2A tables until ADM-2B.

## This Git change

No application TypeScript files changed. No SQL was executed from this package. No existing queues or facts were edited. No seed was imported. The next task is ADM-2B, using preflight on existing admin authorization and row-level/role permissions.
