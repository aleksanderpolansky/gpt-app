# GPT-APP / AI-NAVIGATOR
# ACTIVITY_TO_VALUE_OBJECTS_CONTROLLED_FLOW
# Step 06 / 12 — Save Gate API Preflight

Status: read-only API / contract inspection.
Date: 2026-06-15
Mode: no DB writes, no SQL, no OpenAI calls, no commit/push.

## Purpose

Step 06 inspects existing API routes and contracts before implementing any real write route.

The future write flow must be server-mediated and must not use direct browser Supabase access, because the Activity Facts Persistence Layer tables revoke direct access from `anon` and `authenticated`.

## Future target write sequence

The future save gate should eventually perform one controlled transaction-like flow:

1. resolve authenticated user and actor context;
2. create or reuse `activity_events`;
3. insert extracted rows into `activity_event_measures`;
4. match or create confirmed Value Objects only after user confirmation;
5. insert rows into `activity_object_facts`;
6. create `activity_fact_review_items` for review/audit decisions;
7. enqueue invalidation/recalculation into `activity_fact_recalculation_queue`;
8. return saved IDs to the UI;
9. never duplicate chronological time when one activity links to multiple Value Objects.

## Current rule

Do not implement the write route in Step 06.

Step 06 only answers:

- which routes already exist;
- which routes have POST/PATCH/DELETE methods;
- where auth/actor context appears;
- where Supabase/service-role usage appears;
- which route is the safest candidate for future implementation.

## Provisional decision to verify after report review

Most likely future route candidates:

- preview/read-only: keep `/activity-capture/facts-preview` and `/activity-capture/controlled-flow-map`;
- future save gate: create a dedicated route such as `/api/activity/facts/save-gate`;
- do not overload debug routes;
- do not use old first-write/debug routes as stable production API;
- reuse existing auth/actor helpers if identified by the report.

## Safety lock

- no DB writes;
- no SQL execution;
- no OpenAI calls;
- no hidden persistence;
- no commit/push in this step.
