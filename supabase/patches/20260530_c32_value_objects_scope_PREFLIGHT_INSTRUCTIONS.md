# GPT-APP / AI-NAVIGATOR
# C8-I / C32-SCHEMA-B2 — Preflight Instructions

Status: SELECT-ONLY PREFLIGHT. Migration SQL is NOT executed.

## Purpose

Before executing the C32 schema migration, check whether the existing `value_objects.organization_id` column is nullable.

This matters because the migration intends to support personal / actor / space scoped Value Objects.

If `organization_id` is currently `NOT NULL`, then simply adding `actor_id`, `space_id`, `app_user_id`, and `owner_user_id` is not enough. Personal Value Object insert would still fail without `organization_id`.

## File to run manually in Supabase SQL Editor

`supabase/patches/20260530_c32_value_objects_scope_PREFLIGHT_SELECT_ONLY.sql`

## What is allowed

Run only the SELECT-only preflight file.

## What is not allowed yet

Do NOT run:

`supabase/patches/20260530_c32_value_objects_scope_and_activity_vo_links_NO_EXECUTION.sql`

until the preflight result is reviewed.

## Expected decision

If preflight verdict says:

`OK: value_objects.organization_id is nullable`

then we can proceed to explicit migration execution gate.

If preflight verdict says:

`BLOCKER: value_objects.organization_id is NOT NULL`

then the migration must be revised before execution, probably by adding:

`ALTER TABLE public.value_objects ALTER COLUMN organization_id DROP NOT NULL;`

This would be a separate reviewed decision before execution.

## Paste back

After running the SELECT-only preflight in Supabase SQL Editor, paste all results back into the chat.
