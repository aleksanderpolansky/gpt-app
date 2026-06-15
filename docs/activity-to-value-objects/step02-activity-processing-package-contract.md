# GPT-APP / AI-NAVIGATOR
# ACTIVITY_TO_VALUE_OBJECTS_CONTROLLED_FLOW
# Step 02 / 12 — ActivityProcessingPackage Contract

Status: implemented as TypeScript contract + deterministic fixture.
Date: 2026-06-15
Mode: no DB writes, no SQL, no OpenAI calls, no commit/push.

## Purpose

This step defines the intermediate package that connects free-text activity input with future Activity Facts and Value Objects.

Example user input:

> Играл с ребёнком в футбол 30 минут.

The system must transform this into a preview package containing:

1. raw input;
2. activity recognition result;
3. extracted measures;
4. semantic categories;
5. Value Object matches;
6. missing Value Object candidates;
7. Activity Object Fact previews;
8. safety flags and counters.

## Important vocabulary lock

The user clarified that the UI may say “steps” informally, but the data model must use facts.

Correct technical target:

- `activity_event_measures`
- `activity_object_facts`
- `activity_fact_review_items`
- `activity_fact_recalculation_queue`

Do not create a separate persisted `steps` table for this process.

## Safety rules

- Preview is not write.
- Candidate is not saved fact.
- Missing Value Object candidate is not automatically created.
- UI confirmation is not automatic DB write.
- One activity can generate several object facts, but total chronological time remains one activity duration.
- Physiology categories are observation signals, not medical diagnosis.

## Files created in this step

- `src/types/activity-to-value-objects.ts`
- `src/data/activity-to-value-objects/football-with-child-preview.ts`

## Next step

Step 03 / 12 should create a read-only UI page that renders this fixture as:

1. Activity recognition card;
2. measure table;
3. semantic category table;
4. Value Object matching table;
5. missing Value Object candidate table;
6. future `activity_object_facts` preview table.

Recommended route for the first UI preview:

`/activity-capture/facts-preview`

Rationale: `/project-knowledge` does not exist yet, while `/activity-capture` already exists and is the canonical activity input / preview route.
