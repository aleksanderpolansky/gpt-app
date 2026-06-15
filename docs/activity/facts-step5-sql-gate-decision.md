# GPT-APP / AI-NAVIGATOR — FACTS STEP 5/12

## SQL Gate Path Decision

Version: FACTS_STEP5_SQL_GATE_DECISION_V1_20260615
Status: decision lock + corrected SQL draft
Scope: Activity Facts Persistence Layer security path
Non-scope: SQL execution, Supabase write, OpenAI call, commit, push

## 1. Decision

Activity Facts must use a server-mediated private data path.

Browser UI must not write directly into:
- activity_event_measures
- activity_object_facts
- activity_fact_review_items
- activity_fact_recalculation_queue

Confirmed facts are created only by guarded API routes after explicit user confirmation.
API routes must use existing app-user / actor resolution and server-side Supabase access.
Personal fact tables must not be broadly exposed to anon or direct authenticated Data API clients.

## 2. Why Step 3 is corrected

Step 3 was structurally useful, but its direct authenticated grant pattern was too permissive.
Step 4 showed that existing activity_events security is stricter and already uses a private boundary.

Therefore the corrected v2 SQL draft uses:
- revoke all from anon, authenticated
- service_role grant only
- RLS enabled
- no-direct-public-access policies using false
- guarded API/server-mediated write path

## 3. Created corrected draft

Created:

docs/sql/FACTS_STEP5_activity_facts_schema_draft_v2_server_mediated.sql

## 4. Next step

FACTS STEP 6/12 should prepare a SELECT-only live schema inspection gate.

It must inspect:
1. activity_events columns and constraints.
2. value_objects columns and PK/FK target.
3. actor / app user / person mapping tables.
4. existing activity RLS policies.
5. existing grants.
6. existing updated_at helper trigger function.

## 5. Safety status

| Gate | Status |
|---|---|
| SQL executed | No |
| Supabase write | No |
| OpenAI call | No |
| Runtime code changed | No |
| Commit | No |
| Push | No |
