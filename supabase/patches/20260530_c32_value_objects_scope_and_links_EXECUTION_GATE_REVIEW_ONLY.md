# GPT-APP / AI-NAVIGATOR
# C8-I / C32-SCHEMA-B — SQL Execution Gate Review Note

Status: REVIEW ONLY. SQL NOT EXECUTED.

Generated after C32-SCHEMA-A design package.

## Files reviewed

- `supabase/patches/20260530_c32_value_objects_scope_and_activity_vo_links_NO_EXECUTION.sql`
- `supabase/patches/20260530_c32_value_objects_scope_and_activity_vo_links_POSTCHECK_NO_EXECUTION.sql`

## Runtime reason for this schema package

C32 browser proofs showed:

- `value_objects` exists and is readable.
- `value_objects` currently exposes only organization scope: `organization_id`.
- Current user has spaces, but no organization-linked space.
- `activity_value_object_links` is absent from PostgREST schema cache.
- Therefore VO write and activity-to-VO link write must remain blocked until schema is expanded.

## Intended schema change

This package is additive:

1. Add optional personal/actor/space scope columns to `value_objects`:
   - `actor_id`
   - `space_id`
   - `app_user_id`
   - `owner_user_id`
   - `visibility`
   - `source`
   - `semantic_signature`
   - `metadata`

2. Keep `organization_id` for organization / enterprise / commercial Value Objects.

3. Create `activity_value_object_links` table for Activity Event -> Value Object exposure links.

4. Add explicit RLS posture:
   - RLS enabled.
   - No broad anon/authenticated direct grants.
   - service_role backend access explicitly granted.

## Important architecture rule

This schema package does NOT create state facts, state deltas, or state snapshots.

It only prepares:

`Activity Event -> unified Value Object -> exposure link`

State layers remain a later gated block.

## Execution gate

Do not execute SQL automatically.

SQL may be executed only after an explicit user confirmation phrase such as:

`EXECUTE C32 SCHEMA MIGRATION NOW`

After execution, run the postcheck SQL file and paste the result back into the chat.

## Current countdown

5 -> C32-SCHEMA-B: SQL package inspected and execution gate note created.
4 -> C32-SCHEMA-C: explicit SQL execution gate in Supabase SQL Editor.
3 -> C32-C: stable semantic bundle proof.
2 -> C32-D/E: explicit first VO write route and browser proof.
1 -> C32-H/I: first activity->VO link write and verification.
0 -> C32-J: status lock / transfer report.
