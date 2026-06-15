# GPT-APP / AI-NAVIGATOR
# ACTIVITY_TO_VALUE_OBJECTS_CONTROLLED_FLOW
# Step 09 Retry 1 / 12 — Pre-commit Integration Audit, False-positive Classifier

Status: refined pre-commit audit.
Date: 2026-06-15
Mode: no DB writes, no SQL, no OpenAI calls, no API route, no commit/push.

## Why retry was needed

The original Step 09 audit used naive word checks for terms like:

- `supabase`
- `openai`
- `/api/activity/facts/save-gate`

That produced false positives because the new preview files intentionally contain safety labels and explanatory text such as:

- `directBrowserSupabaseWriteAllowed: false`
- `openAiCallAllowed: false`
- future endpoint name in a contract fixture

These are not executable calls and not dangerous by themselves.

## Retry 1 audit rule

Forbidden means executable behavior, not safety vocabulary.

The refined audit checks:

- Supabase imports;
- Supabase `.from()` / `.select()` runtime calls;
- Supabase `.insert()` / `.upsert()` / `.update()` / `.delete()` calls;
- OpenAI imports / constructors / client calls;
- `fetch()` call to `/api/activity/facts/save-gate`;
- accidental creation of `/api/activity/facts/save-gate/route.ts`;
- accidental SQL migration files for this block.

## Commit gate

If Retry 1 passes, Step 10 / 12 should prepare the commit gate.

Required confirmation phrase for commit:

`ACTIVITY_VO_FLOW_PREVIEW_COMMIT_APPROVED`
