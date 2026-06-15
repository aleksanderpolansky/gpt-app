# GPT-APP / AI-NAVIGATOR — FACTS STEP 6/12

## SELECT-only Live Schema Inspection Gate

Version: FACTS_STEP6_SELECT_ONLY_SCHEMA_INSPECTION_GATE_V1_20260615
Status: SQL inspection gate prepared, not executed
Scope: prepare a SELECT-only live schema inspection script
Non-scope: SQL execution, Supabase write, OpenAI call, commit, push

## 1. Purpose

Step 5 selected the server-mediated private facts path.

Before preparing an executable migration, the live Supabase schema must be inspected with SELECT-only SQL.

Created file:

docs/sql/FACTS_STEP6_select_only_live_schema_inspection_gate.sql",
",


| Section | Purpose |
|---|---|
| Required table existence | Checks activity_events, value_objects, fact draft tables, actors/app_users/persons. |
| activity_events columns | Confirms real columns, types, defaults and nullability. |
| value_objects columns | Confirms real FK target and hierarchy fields. |
| identity mapping columns | Looks for actor/app user/person mapping tables. |
| constraints | Checks PK/FK constraints around activity and VO tables. |
| indexes | Shows indexes around activity/value/fact candidate tables. |
| RLS flags | Checks whether RLS is enabled. |
| policies | Lists RLS policies. |
| grants | Lists table privileges for anon/authenticated/service_role. |
| updated_at helpers | Finds trigger/function candidates. |
| readiness checklist | Gives basic FK target readiness status. |

## 3. Safety

The prepared SQL file contains SELECT statements only.

It should not contain:

- create table
- alter table
- insert
- update
- delete
- drop
- grant
- revoke
- create policy
- alter policy

## 4. Execution rule

This step does not execute the SQL.

The SQL can be executed later only as a separate live inspection gate.

## 5. Next step

FACTS STEP 7/12 should review the SELECT-only SQL file for forbidden write keywords and prepare the manual execution instruction.

Only after the live output is returned can the executable migration be safely drafted.

## 6. Safety status

| Gate | Status |
|---|---|
| SQL executed | No |
| Supabase write | No |
| OpenAI call | No |
| Runtime code changed | No |
| Commit | No |
| Push | No |
