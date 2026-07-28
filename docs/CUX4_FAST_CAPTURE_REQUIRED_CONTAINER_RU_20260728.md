# ARCTor.app — CUX4 Fast Capture with Required Activity Container

Дата: 28.07.2026
Baseline: `main @ 79dc36420fdc848cba3be1c55ba03d90a1337e19`

## 1. Scope

CUX4 changes only the user flow around the existing calendar capture:

1. The user types or dictates an activity.
2. The **Add activity** button is available immediately.
3. One canonical `activity_events` row is saved first.
4. The inline composer collapses.
5. A compact success notice appears.
6. The existing semantic analysis continues in a controlled `after()` task.
7. The required Activity Container opens through **Details** by the saved `activityEventId`.
8. If opened immediately, the container shows `pending` or `processing`.
9. The same container later shows the semantic result or parameters requiring clarification.

The Activity Container is mandatory. Only the visible waiting screen is removed from the quick path.

## 2. What is not changed

This package does not redesign:

- semantic interpretation rules;
- CUX3 personal rules;
- prompts and JSON shape of the current semantic preview;
- Impact Rule Registry;
- analytics calculations;
- fact-to-leaf fan-out;
- automatic application of AI proposals to activity fields;
- AI target confirmation rules.

The current semantic preview endpoint remains the analysis source.

## 3. Canonical write

`POST /api/activity/events` remains the only canonical activity write path.

The new sequence is:

```text
POST /api/activity/events
→ createActivityEventViaPp1Rpc
→ activity_events created
→ optional exact calendar projection
→ CUX4 enrichment run created
→ response returned to the user
→ after() processes the run
```

The background process never creates a second activity.

## 4. Incomplete timing

An incomplete exact schedule must not block quick capture.

When the locally inferred timing is invalid or incomplete:

- the original text is preserved;
- the initial activity is saved as `unscheduled`;
- no calendar projection is created;
- background analysis records its proposal in the Activity Container;
- the user can later confirm or correct uncertain parameters.

A valid manual or deterministic schedule is still saved immediately.

## 5. CUX4A1 registry usage

The existing table `activity_semantic_enrichment_runs_cux4` is used as the required Activity Container processing record.

Lifecycle:

```text
pending → processing → processed
                     → needs_clarification
                     → failed
```

The package uses the already deployed RPCs:

- `create_activity_semantic_enrichment_run_cux4_v1`;
- `claim_activity_semantic_enrichment_run_cux4_v1`;
- `finish_activity_semantic_enrichment_run_cux4_v1`.

No migration is included.

## 6. Result visibility

A new owner-filtered endpoint returns the saved activity and its latest CUX4 run:

```text
GET /api/calendar/activity-enrichment/[activityEventId]
```

The saved Activity Container polls only while status is `pending` or `processing`.

It shows:

- original text;
- saved activity title;
- current analysis status;
- summary;
- ready/candidate/missing counters;
- semantic fields;
- warnings;
- background error without deleting the activity.

## 7. Field safety

The quick composer stores `protectedFieldCodes` in the enrichment run snapshot for:

- manually changed title;
- manually changed valid schedule fields;
- manually selected planned targets.

This package does not yet apply AI fields to `activity_events`, so protected fields cannot be overwritten.

## 8. Files

Modified:

1. `src/app/api/activity/events/route.ts`
2. `src/app/calendar-rebuild/CalendarRebuildClient.tsx`
3. `src/app/calendar/activity-review/page.tsx`
4. `src/components/calendar/cux2-inline-activity-composer.tsx`

Added:

5. `src/app/api/calendar/activity-enrichment/[activityEventId]/route.ts`
6. `src/app/calendar/activity-review/saved-activity-review-client.tsx`
7. `src/lib/calendar/activitySemanticEnrichment.server.ts`
8. `docs/CUX4_FAST_CAPTURE_REQUIRED_CONTAINER_RU_20260728.md`
9. `scripts/cux4-fast-capture-required-container-contract-check.mjs`

## 9. Explicit exclusions

- no SQL;
- no migration;
- no automatic AI field apply;
- no retry/revert UI;
- no CUX5 selector work;
- no CUX6 shelf;
- no CUX7 timeline;
- no CUX8 visual completion;
- no commit or deployment in the static apply step.
