# GPT-APP / AI-NAVIGATOR — FACTS STEP 7/12

## Manual SELECT-only schema inspection instruction

Version: FACTS_STEP7_MANUAL_SELECT_ONLY_INSPECTION_INSTRUCTION_V1_20260615  
Status: prepared, not executed  
Scope: manual live schema inspection instruction  
Non-scope: schema change, data change, OpenAI call, commit, push

## 1. What was prepared

Created sanitized SQL file:

`docs/sql/FACTS_STEP7_select_only_live_schema_inspection_gate_SANITIZED.sql`

This file is based on Step 6, but comment-only lines were removed to avoid forbidden-keyword noise during manual safety scanning.

## 2. Manual execution rule

Do not run this SQL automatically from PowerShell.

When live Supabase inspection is needed:

1. Open Supabase Dashboard.
2. Open SQL Editor.
3. Open the local file:

`docs/sql/FACTS_STEP7_select_only_live_schema_inspection_gate_SANITIZED.sql`

4. Copy the full file content into SQL Editor.
5. Run it once.
6. Copy or export the output result tables.
7. Save the output as:

`FACTS_STEP8_LIVE_SCHEMA_INSPECTION_OUTPUT_YYYYMMDD_HHMMSS.txt`

8. Upload that output report into ChatGPT.

## 3. What the output is needed for

The output will decide whether the Step 5 server-mediated draft can be converted into an executable migration.

Required facts to confirm:

- `activity_events.id` exists and is UUID-compatible.
- `activity_events.user_id` exists.
- `value_objects.id` exists and is UUID-compatible.
- Activity security boundary remains private.
- Existing RLS and privilege pattern is compatible with server-mediated facts.
- Existing updated_at helper can be reused.

## 4. Safety status

| Gate | Status |
|---|---|
| SQL executed in this step | No |
| Supabase write | No |
| OpenAI call | No |
| Runtime code changed | No |
| Commit | No |
| Push | No |

## 5. Next step

FACTS STEP 8/12 should happen after the live SELECT-only output is uploaded.

Step 8 will analyze the live output and decide the executable migration shape.