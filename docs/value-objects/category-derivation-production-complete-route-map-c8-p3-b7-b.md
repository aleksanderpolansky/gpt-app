# P4.10.0-C8-P3-B7-B — Production Complete Route Exact Map

Date: 2026-05-20
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / production activity complete route preparation

Purpose: identify exact anchors in src/app/api/activity/complete/route.ts before enabling Category Derivation outside debug route.

## 1. Git status

```text
?? docs/value-objects/category-derivation-production-complete-route-map-c8-p3-b7-b.md
```

## 2. Recent commits

```text
83e3f6b Inventory production ingestion paths for category derivation
4b79f6b Document final category derivation browser suite pass
52f6d1f Document category derivation case three runtime pass
0555bd7 Fix contextual category name payload in category derivation resolver
1238027 Add contextual category name to category derivation resolver
2b1d5ea Patch category derivation resolver context with one-line createCategory call
db5ede7 Fix category derivation debug route diagnostics
ba6c1e3 Patch category derivation resolver context with real createCategory call
6efd0ae Clean up failed category derivation resolver retry artifacts
f9b2c53 Retry category derivation resolver context fix safely
2d856cd Recover category derivation resolver after failed context patch
bad18ee Fix category derivation resolver contextual category context
c22056e Document live context resolution result for category derivation
d0d4c96 Add live context resolution SQL check
```

## 3. Target files

```text
.\src\app\api\activity\complete\route.ts => FOUND, 933 lines
.\src\app\api\activity\debug\free-text-value-object-test\route.ts => FOUND, 950 lines
```

## 4. complete route imports

```text
FILE: .\src\app\api\activity\complete\route.ts
PATTERN: import
MATCH COUNT: 12

----- .\src\app\api\activity\complete\route.ts:1 | pattern: import -----
    1: import { randomUUID } from "crypto";
      import { NextResponse } from "next/server";
      import {
        ACTIVITY_RECORDING_DISABLED_MESSAGE,
        ACTIVITY_RECORDING_ENABLED,
      } from "../../../../../lib/activity/activityRecordingConfig";
      import {
        ACTIVITY_COMPLETABLE_STATUSES,
        ACTIVITY_STATUS_COMPLETED,
        canTransitionActivityStatus,
        isCompletableActivityStatus,
      } from "../../../../../lib/activity/activityLifecycle";
      import {
        getDurationMs,
        safeCreateActivityProcessingLog,
      } from "../../../../../lib/activity/activityProcessingLogs";
      import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
      import { processActivityImpacts } from "../../../../../lib/activity/activityImpactProcessor";
      import { processActivityValueObjectBridge } from "../../../../../lib/activity/activityValueObjectLifecycle";
      import { ensureActivityEventRubricatorClassificationForKnownTemplate } from "../../../../../lib/activity/activityRubricatorClassificationLifecycle";
      import { buildRubricatorResolverLogMetadata } from "../../../../../lib/activity/rubricatorResolverLogMetadata";
      import {
        createRawActivitySignal,
        markRawActivitySignalFailed,
        markRawActivitySignalProcessed,
      } from "../../../../../lib/activity/rawActivitySignals";
      import { supabase } from "../../../../../lib/supabase";
      
      export const dynamic = "force-dynamic";
      
      type ActivityCompleteBody = {
        eventId?: unknown;
        endedAt?: unknown;
        endTime?: unknown;
        durationMinutes?: unknown;
        comment?: unknown;

----- .\src\app\api\activity\complete\route.ts:2 | pattern: import -----
    2: import { NextResponse } from "next/server";
      import {
        ACTIVITY_RECORDING_DISABLED_MESSAGE,
        ACTIVITY_RECORDING_ENABLED,
      } from "../../../../../lib/activity/activityRecordingConfig";
      import {
        ACTIVITY_COMPLETABLE_STATUSES,
        ACTIVITY_STATUS_COMPLETED,
        canTransitionActivityStatus,
        isCompletableActivityStatus,
      } from "../../../../../lib/activity/activityLifecycle";
      import {
        getDurationMs,
        safeCreateActivityProcessingLog,
      } from "../../../../../lib/activity/activityProcessingLogs";
      import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
      import { processActivityImpacts } from "../../../../../lib/activity/activityImpactProcessor";
      import { processActivityValueObjectBridge } from "../../../../../lib/activity/activityValueObjectLifecycle";
      import { ensureActivityEventRubricatorClassificationForKnownTemplate } from "../../../../../lib/activity/activityRubricatorClassificationLifecycle";
      import { buildRubricatorResolverLogMetadata } from "../../../../../lib/activity/rubricatorResolverLogMetadata";
      import {
        createRawActivitySignal,
        markRawActivitySignalFailed,
        markRawActivitySignalProcessed,
      } from "../../../../../lib/activity/rawActivitySignals";
      import { supabase } from "../../../../../lib/supabase";
      
      export const dynamic = "force-dynamic";
      
      type ActivityCompleteBody = {
        eventId?: unknown;
        endedAt?: unknown;
        endTime?: unknown;
        durationMinutes?: unknown;
        comment?: unknown;
      };

----- .\src\app\api\activity\complete\route.ts:3 | pattern: import -----
    3: import {
        ACTIVITY_RECORDING_DISABLED_MESSAGE,
        ACTIVITY_RECORDING_ENABLED,
      } from "../../../../../lib/activity/activityRecordingConfig";
      import {
        ACTIVITY_COMPLETABLE_STATUSES,
        ACTIVITY_STATUS_COMPLETED,
        canTransitionActivityStatus,
        isCompletableActivityStatus,
      } from "../../../../../lib/activity/activityLifecycle";
      import {
        getDurationMs,
        safeCreateActivityProcessingLog,
      } from "../../../../../lib/activity/activityProcessingLogs";
      import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
      import { processActivityImpacts } from "../../../../../lib/activity/activityImpactProcessor";
      import { processActivityValueObjectBridge } from "../../../../../lib/activity/activityValueObjectLifecycle";
      import { ensureActivityEventRubricatorClassificationForKnownTemplate } from "../../../../../lib/activity/activityRubricatorClassificationLifecycle";
      import { buildRubricatorResolverLogMetadata } from "../../../../../lib/activity/rubricatorResolverLogMetadata";
      import {
        createRawActivitySignal,
        markRawActivitySignalFailed,
        markRawActivitySignalProcessed,
      } from "../../../../../lib/activity/rawActivitySignals";
      import { supabase } from "../../../../../lib/supabase";
      
      export const dynamic = "force-dynamic";
      
      type ActivityCompleteBody = {
        eventId?: unknown;
        endedAt?: unknown;
        endTime?: unknown;
        durationMinutes?: unknown;
        comment?: unknown;
      };
      
```

## 5. complete route POST entry

```text
FILE: .\src\app\api\activity\complete\route.ts
PATTERN: export async function POST
MATCH COUNT: 1

----- .\src\app\api\activity\complete\route.ts:241 | pattern: export async function POST -----
            comment: "Completed lifecycle smoke test with fixed duration",
          },
        });
      }
      
  241: export async function POST(request: Request) {
        if (!ACTIVITY_RECORDING_ENABLED) {
          return NextResponse.json(
            {
              ok: false,
              error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
            },
            { status: 503 }
          );
        }
      
        const { appUser, errorResponse } = await getActivityUserContext();
      
        if (errorResponse) {
          return errorResponse;
        }
      
        if (!appUser) {
          return NextResponse.json(
            {
              ok: false,
              error: "User context not found",
            },
            { status: 500 }
          );
        }
      
        let body: ActivityCompleteBody;
      
        try {
          body = (await request.json()) as ActivityCompleteBody;
        } catch {
          return NextResponse.json(
            {
              ok: false,
              error: "Invalid JSON body",
            },
            { status: 400 }
          );
        }
      
        const eventId = asString(body.eventId);
      
        if (!eventId) {
          return NextResponse.json(
            {
              ok: false,
              error: "eventId is required.",
            },
            { status: 400 }
          );
        }
      
        const { data: eventData, error: eventError } = await supabase
          .from("activity_events")
          .select("*")
          .eq("id", eventId)
          .eq("user_id", appUser.id)
          .maybeSingle();
      
        if (eventError) {
```

## 6. request body parsing

```text
FILE: .\src\app\api\activity\complete\route.ts
PATTERN: await request.json
MATCH COUNT: 1

----- .\src\app\api\activity\complete\route.ts:271 | pattern: await request.json -----
              ok: false,
              error: "User context not found",
            },
            { status: 500 }
          );
        }
      
        let body: ActivityCompleteBody;
      
        try {
  271:     body = (await request.json()) as ActivityCompleteBody;
        } catch {
          return NextResponse.json(
            {
              ok: false,
              error: "Invalid JSON body",
            },
            { status: 400 }
          );
        }
      
        const eventId = asString(body.eventId);
      
        if (!eventId) {
          return NextResponse.json(
            {
              ok: false,
              error: "eventId is required.",
            },
            { status: 400 }
          );
        }
      
        const { data: eventData, error: eventError } = await supabase
          .from("activity_events")
          .select("*")
          .eq("id", eventId)
          .eq("user_id", appUser.id)
          .maybeSingle();
      
        if (eventError) {
          return NextResponse.json(
            {
              ok: false,
              error: eventError.message,
            },
            { status: 500 }
          );
        }
      
        if (!eventData) {
          return NextResponse.json(
            {
              ok: false,
              error: "Activity event not found or access denied.",
            },
```

## 7. eventId extraction

```text
FILE: .\src\app\api\activity\complete\route.ts
PATTERN: eventId
MATCH COUNT: 32

----- .\src\app\api\activity\complete\route.ts:32 | pattern: eventId -----
      import {
        createRawActivitySignal,
        markRawActivitySignalFailed,
        markRawActivitySignalProcessed,
      } from "../../../../../lib/activity/rawActivitySignals";
      import { supabase } from "../../../../../lib/supabase";
      
      export const dynamic = "force-dynamic";
      
      type ActivityCompleteBody = {
   32:   eventId?: unknown;
        endedAt?: unknown;
        endTime?: unknown;
        durationMinutes?: unknown;
        comment?: unknown;
      };
      
      type ActivityEventRow = {
        id: string;
        user_id: string;
        performed_by_actor_id: string | null;
        acting_as_actor_id: string | null;
        acting_for_actor_id: string | null;
        activity_type_id: string | null;
        activity_template_id: string | null;
        template_id: string | null;
        event_code: string | null;
        input_text: string | null;
        title: string | null;
        description: string | null;
        started_at: string | null;
        ended_at: string | null;
        duration_minutes: number | null;
        source: string | null;
        status: string;
        privacy_scope: string | null;
        processing_status: string | null;
        metadata_json: Record<string, unknown> | null;
        created_at: string;
        updated_at: string;
      };
      
      type CompletionTiming =
        | {
            ok: true;
            startedAt: string;
            endedAt: string;
            durationMinutes: number;
          }
        | {
            ok: false;
            error: string;
          };
      
      
      function asRecord(value: unknown): Record<string, unknown> {

----- .\src\app\api\activity\complete\route.ts:203 | pattern: eventId -----
        return {
          ok: true,
          startedAt: startedDate.toISOString(),
          endedAt: endedDate.toISOString(),
          durationMinutes: Math.round(
            (endedDate.getTime() - startedDate.getTime()) / 60000
          ),
        };
      }
      
  203: async function getExistingImpactEventsCount(eventId: string) {
        const { count, error } = await supabase
          .from("impact_events")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("event_id", eventId);
      
        if (error) {
          throw new Error(error.message);
        }
      
        return count ?? 0;
      }
      
      export async function GET() {
        return NextResponse.json({
          ok: true,
          endpoint: "/api/activity/complete",
          method: "POST",
          enabled: ACTIVITY_RECORDING_ENABLED,
          status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
          message: ACTIVITY_RECORDING_ENABLED
            ? "Complete a previously started activity event and process rule-based impacts."
            : ACTIVITY_RECORDING_DISABLED_MESSAGE,
          example: {
            eventId: "activity-event-uuid",
            comment: "Completed lifecycle smoke test",
          },
          deterministicTestExample: {
            eventId: "activity-event-uuid",
            durationMinutes: 5,
            comment: "Completed lifecycle smoke test with fixed duration",
          },
        });
      }
      
      export async function POST(request: Request) {
        if (!ACTIVITY_RECORDING_ENABLED) {
          return NextResponse.json(
            {
              ok: false,
              error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
            },
            { status: 503 }

----- .\src\app\api\activity\complete\route.ts:210 | pattern: eventId -----
        };
      }
      
      async function getExistingImpactEventsCount(eventId: string) {
        const { count, error } = await supabase
          .from("impact_events")
          .select("id", {
            count: "exact",
            head: true,
          })
  210:     .eq("event_id", eventId);
      
        if (error) {
          throw new Error(error.message);
        }
      
        return count ?? 0;
      }
      
      export async function GET() {
        return NextResponse.json({
          ok: true,
          endpoint: "/api/activity/complete",
          method: "POST",
          enabled: ACTIVITY_RECORDING_ENABLED,
          status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
          message: ACTIVITY_RECORDING_ENABLED
            ? "Complete a previously started activity event and process rule-based impacts."
            : ACTIVITY_RECORDING_DISABLED_MESSAGE,
          example: {
            eventId: "activity-event-uuid",
            comment: "Completed lifecycle smoke test",
          },
          deterministicTestExample: {
            eventId: "activity-event-uuid",
            durationMinutes: 5,
            comment: "Completed lifecycle smoke test with fixed duration",
          },
        });
      }
      
      export async function POST(request: Request) {
        if (!ACTIVITY_RECORDING_ENABLED) {
          return NextResponse.json(
            {
              ok: false,
              error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
            },
            { status: 503 }
          );
        }
      
        const { appUser, errorResponse } = await getActivityUserContext();
      
        if (errorResponse) {
          return errorResponse;

----- .\src\app\api\activity\complete\route.ts:230 | pattern: eventId -----
        return NextResponse.json({
          ok: true,
          endpoint: "/api/activity/complete",
          method: "POST",
          enabled: ACTIVITY_RECORDING_ENABLED,
          status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
          message: ACTIVITY_RECORDING_ENABLED
            ? "Complete a previously started activity event and process rule-based impacts."
            : ACTIVITY_RECORDING_DISABLED_MESSAGE,
          example: {
  230:       eventId: "activity-event-uuid",
            comment: "Completed lifecycle smoke test",
          },
          deterministicTestExample: {
            eventId: "activity-event-uuid",
            durationMinutes: 5,
            comment: "Completed lifecycle smoke test with fixed duration",
          },
        });
      }
      
      export async function POST(request: Request) {
        if (!ACTIVITY_RECORDING_ENABLED) {
          return NextResponse.json(
            {
              ok: false,
              error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
            },
            { status: 503 }
          );
        }
      
        const { appUser, errorResponse } = await getActivityUserContext();
      
        if (errorResponse) {
          return errorResponse;
        }
      
        if (!appUser) {
          return NextResponse.json(
            {
              ok: false,
              error: "User context not found",
            },
            { status: 500 }
          );
        }
      
        let body: ActivityCompleteBody;
      
        try {
          body = (await request.json()) as ActivityCompleteBody;
        } catch {
          return NextResponse.json(
            {
              ok: false,

----- .\src\app\api\activity\complete\route.ts:234 | pattern: eventId -----
          enabled: ACTIVITY_RECORDING_ENABLED,
          status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
          message: ACTIVITY_RECORDING_ENABLED
            ? "Complete a previously started activity event and process rule-based impacts."
            : ACTIVITY_RECORDING_DISABLED_MESSAGE,
          example: {
            eventId: "activity-event-uuid",
            comment: "Completed lifecycle smoke test",
          },
          deterministicTestExample: {
  234:       eventId: "activity-event-uuid",
            durationMinutes: 5,
            comment: "Completed lifecycle smoke test with fixed duration",
          },
        });
      }
      
      export async function POST(request: Request) {
        if (!ACTIVITY_RECORDING_ENABLED) {
          return NextResponse.json(
            {
              ok: false,
              error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
            },
            { status: 503 }
          );
        }
      
        const { appUser, errorResponse } = await getActivityUserContext();
      
        if (errorResponse) {
          return errorResponse;
        }
      
        if (!appUser) {
          return NextResponse.json(
            {
              ok: false,
              error: "User context not found",
            },
            { status: 500 }
          );
        }
      
        let body: ActivityCompleteBody;
      
        try {
          body = (await request.json()) as ActivityCompleteBody;
        } catch {
          return NextResponse.json(
            {
              ok: false,
              error: "Invalid JSON body",
            },
            { status: 400 }
          );

----- .\src\app\api\activity\complete\route.ts:282 | pattern: eventId -----
        } catch {
          return NextResponse.json(
            {
              ok: false,
              error: "Invalid JSON body",
            },
            { status: 400 }
          );
        }
      
  282:   const eventId = asString(body.eventId);
      
        if (!eventId) {
          return NextResponse.json(
            {
              ok: false,
              error: "eventId is required.",
            },
            { status: 400 }
          );
        }
      
        const { data: eventData, error: eventError } = await supabase
          .from("activity_events")
          .select("*")
          .eq("id", eventId)
          .eq("user_id", appUser.id)
          .maybeSingle();
      
        if (eventError) {
          return NextResponse.json(
            {
              ok: false,
              error: eventError.message,
            },
            { status: 500 }
          );
        }
      
        if (!eventData) {
          return NextResponse.json(
            {
              ok: false,
              error: "Activity event not found or access denied.",
            },
            { status: 404 }
          );
        }
      
        const event = eventData as ActivityEventRow;
        const completedStatus = ACTIVITY_STATUS_COMPLETED;
      
        if (event.status === completedStatus) {
          try {
            const existingImpactEventsCount = await getExistingImpactEventsCount(
              event.id

----- .\src\app\api\activity\complete\route.ts:284 | pattern: eventId -----
            {
              ok: false,
              error: "Invalid JSON body",
            },
            { status: 400 }
          );
        }
      
        const eventId = asString(body.eventId);
      
  284:   if (!eventId) {
          return NextResponse.json(
            {
              ok: false,
              error: "eventId is required.",
            },
            { status: 400 }
          );
        }
      
        const { data: eventData, error: eventError } = await supabase
          .from("activity_events")
          .select("*")
          .eq("id", eventId)
          .eq("user_id", appUser.id)
          .maybeSingle();
      
        if (eventError) {
          return NextResponse.json(
            {
              ok: false,
              error: eventError.message,
            },
            { status: 500 }
          );
        }
      
        if (!eventData) {
          return NextResponse.json(
            {
              ok: false,
              error: "Activity event not found or access denied.",
            },
            { status: 404 }
          );
        }
      
        const event = eventData as ActivityEventRow;
        const completedStatus = ACTIVITY_STATUS_COMPLETED;
      
        if (event.status === completedStatus) {
          try {
            const existingImpactEventsCount = await getExistingImpactEventsCount(
              event.id
            );
      

----- .\src\app\api\activity\complete\route.ts:288 | pattern: eventId -----
            { status: 400 }
          );
        }
      
        const eventId = asString(body.eventId);
      
        if (!eventId) {
          return NextResponse.json(
            {
              ok: false,
  288:         error: "eventId is required.",
            },
            { status: 400 }
          );
        }
      
        const { data: eventData, error: eventError } = await supabase
          .from("activity_events")
          .select("*")
          .eq("id", eventId)
          .eq("user_id", appUser.id)
          .maybeSingle();
      
        if (eventError) {
          return NextResponse.json(
            {
              ok: false,
              error: eventError.message,
            },
            { status: 500 }
          );
        }
      
        if (!eventData) {
          return NextResponse.json(
            {
              ok: false,
              error: "Activity event not found or access denied.",
            },
            { status: 404 }
          );
        }
      
        const event = eventData as ActivityEventRow;
        const completedStatus = ACTIVITY_STATUS_COMPLETED;
      
        if (event.status === completedStatus) {
          try {
            const existingImpactEventsCount = await getExistingImpactEventsCount(
              event.id
            );
      
            const impactResult = await processActivityImpacts({
              eventId: event.id,
              userId: appUser.id,
              activityTemplateId: event.activity_template_id,
```

## 8. source/manual_chat handling

```text
NO MATCH: manual_chat
```

## 9. completed status handling

```text
FILE: .\src\app\api\activity\complete\route.ts
PATTERN: completedStatus
MATCH COUNT: 7

----- .\src\app\api\activity\complete\route.ts:322 | pattern: completedStatus -----
          return NextResponse.json(
            {
              ok: false,
              error: "Activity event not found or access denied.",
            },
            { status: 404 }
          );
        }
      
        const event = eventData as ActivityEventRow;
  322:   const completedStatus = ACTIVITY_STATUS_COMPLETED;
      
        if (event.status === completedStatus) {
          try {
            const existingImpactEventsCount = await getExistingImpactEventsCount(
              event.id
            );
      
            const impactResult = await processActivityImpacts({
              eventId: event.id,
              userId: appUser.id,
              activityTemplateId: event.activity_template_id,
              activityTypeId: event.activity_type_id,
              durationMinutes: event.duration_minutes,
              startedAt: event.started_at,
            });
      
            return NextResponse.json({
              ok: true,
              status: "already_completed",
              event,
              impactEvents: impactResult.impactEvents,
              dailyAggregates: impactResult.dailyAggregates,
              currentSnapshots: impactResult.currentSnapshots,
              impactProcessor: {
                ok: impactResult.ok,
                skipped: impactResult.skipped,
                reason: impactResult.reason,
                counts: impactResult.counts,
                existingImpactEventsCount,
              },
              lifecycle: {
                alreadyCompleted: true,
                note:
                  "Activity event was already completed. Duplicate impact processing was skipped if impacts already existed.",
              },
            });
          } catch (error) {
            return NextResponse.json(
              {
                ok: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to inspect completed activity event.",
              },
              { status: 500 }
            );
          }
        }
      
        if (!isCompletableActivityStatus(event.status)) {
          return NextResponse.json(
            {
              ok: false,
              error: `Activity event status '${event.status}' cannot be completed by this endpoint.`,
              allowedStatuses: Array.from(ACTIVITY_COMPLETABLE_STATUSES),
            },
            { status: 409 }
          );
        }

----- .\src\app\api\activity\complete\route.ts:324 | pattern: completedStatus -----
              ok: false,
              error: "Activity event not found or access denied.",
            },
            { status: 404 }
          );
        }
      
        const event = eventData as ActivityEventRow;
        const completedStatus = ACTIVITY_STATUS_COMPLETED;
      
  324:   if (event.status === completedStatus) {
          try {
            const existingImpactEventsCount = await getExistingImpactEventsCount(
              event.id
            );
      
            const impactResult = await processActivityImpacts({
              eventId: event.id,
              userId: appUser.id,
              activityTemplateId: event.activity_template_id,
              activityTypeId: event.activity_type_id,
              durationMinutes: event.duration_minutes,
              startedAt: event.started_at,
            });
      
            return NextResponse.json({
              ok: true,
              status: "already_completed",
              event,
              impactEvents: impactResult.impactEvents,
              dailyAggregates: impactResult.dailyAggregates,
              currentSnapshots: impactResult.currentSnapshots,
              impactProcessor: {
                ok: impactResult.ok,
                skipped: impactResult.skipped,
                reason: impactResult.reason,
                counts: impactResult.counts,
                existingImpactEventsCount,
              },
              lifecycle: {
                alreadyCompleted: true,
                note:
                  "Activity event was already completed. Duplicate impact processing was skipped if impacts already existed.",
              },
            });
          } catch (error) {
            return NextResponse.json(
              {
                ok: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to inspect completed activity event.",
              },
              { status: 500 }
            );
          }
        }
      
        if (!isCompletableActivityStatus(event.status)) {
          return NextResponse.json(
            {
              ok: false,
              error: `Activity event status '${event.status}' cannot be completed by this endpoint.`,
              allowedStatuses: Array.from(ACTIVITY_COMPLETABLE_STATUSES),
            },
            { status: 409 }
          );
        }
      
        const timing = resolveCompletionTiming({

----- .\src\app\api\activity\complete\route.ts:422 | pattern: completedStatus -----
            endpoint: "/api/activity/complete",
            body,
            eventId: event.id,
            previousStatus: event.status,
            timing,
          },
          normalizedPreview: {
            activityEventId: event.id,
            title: event.title,
            previousStatus: event.status,
  422:       nextStatus: completedStatus,
            startedAt: timing.startedAt,
            endedAt: timing.endedAt,
            durationMinutes: timing.durationMinutes,
          },
          occurredAt: timing.endedAt,
          trustLevel: "medium",
          privacyScope:
            event.privacy_scope === "shared_with_org" ||
            event.privacy_scope === "public_masked" ||
            event.privacy_scope === "public"
              ? event.privacy_scope
              : "private",
          processingStatus: "processing",
          metadata: {
            parser: "template_first_v2",
            processingRunId,
            mode: "template_first_complete",
            lifecycle: completedStatus,
            previousStatus: event.status,
            activityTemplateId: event.activity_template_id,
            activityTypeId: event.activity_type_id,
          },
        });
      
        const rawSignal = rawSignalResult.signal;
      
        await safeCreateActivityProcessingLog({
          userId: appUser.id,
          rawSignalId: rawSignal?.id ?? null,
          activityEventId: event.id,
          processingRunId,
          processorName: "activity_complete_route",
          processingStage: "ingest",
          processingStatus: rawSignalResult.ok ? "completed" : "warning",
          severity: rawSignalResult.ok ? "info" : "warning",
          message: rawSignalResult.ok
            ? "Raw activity complete signal captured."
            : "Raw activity complete signal creation failed; continuing without raw signal.",
          input: {
            eventId: event.id,
            previousStatus: event.status,
            endedAt: timing.endedAt,
            durationMinutes: timing.durationMinutes,
          },
          output: rawSignal
            ? {
                rawSignalId: rawSignal.id,
              }
            : {},
          error: rawSignalResult.ok
            ? {}
            : {
                message: rawSignalResult.error,
              },
          metadata: {
            endpoint: "/api/activity/complete",
            mode: "template_first_complete",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),

----- .\src\app\api\activity\complete\route.ts:440 | pattern: completedStatus -----
            event.privacy_scope === "shared_with_org" ||
            event.privacy_scope === "public_masked" ||
            event.privacy_scope === "public"
              ? event.privacy_scope
              : "private",
          processingStatus: "processing",
          metadata: {
            parser: "template_first_v2",
            processingRunId,
            mode: "template_first_complete",
  440:       lifecycle: completedStatus,
            previousStatus: event.status,
            activityTemplateId: event.activity_template_id,
            activityTypeId: event.activity_type_id,
          },
        });
      
        const rawSignal = rawSignalResult.signal;
      
        await safeCreateActivityProcessingLog({
          userId: appUser.id,
          rawSignalId: rawSignal?.id ?? null,
          activityEventId: event.id,
          processingRunId,
          processorName: "activity_complete_route",
          processingStage: "ingest",
          processingStatus: rawSignalResult.ok ? "completed" : "warning",
          severity: rawSignalResult.ok ? "info" : "warning",
          message: rawSignalResult.ok
            ? "Raw activity complete signal captured."
            : "Raw activity complete signal creation failed; continuing without raw signal.",
          input: {
            eventId: event.id,
            previousStatus: event.status,
            endedAt: timing.endedAt,
            durationMinutes: timing.durationMinutes,
          },
          output: rawSignal
            ? {
                rawSignalId: rawSignal.id,
              }
            : {},
          error: rawSignalResult.ok
            ? {}
            : {
                message: rawSignalResult.error,
              },
          metadata: {
            endpoint: "/api/activity/complete",
            mode: "template_first_complete",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: getDurationMs(processingStartedAt),
        });
      
        const { data: updatedEventData, error: updateError } = await supabase
          .from("activity_events")
          .update({
            ended_at: timing.endedAt,
            duration_minutes: timing.durationMinutes,
            status: completedStatus,
            processing_status: "processed",
            description: comment ?? event.description,
            metadata_json: {
              ...existingMetadata,
              lifecycle: completedStatus,
              lifecycle_completed_at: nowIso,
              previous_status: event.status,
              completion_comment: comment,
              completion_duration_source:

----- .\src\app\api\activity\complete\route.ts:491 | pattern: completedStatus -----
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: getDurationMs(processingStartedAt),
        });
      
        const { data: updatedEventData, error: updateError } = await supabase
          .from("activity_events")
          .update({
            ended_at: timing.endedAt,
            duration_minutes: timing.durationMinutes,
  491:       status: completedStatus,
            processing_status: "processed",
            description: comment ?? event.description,
            metadata_json: {
              ...existingMetadata,
              lifecycle: completedStatus,
              lifecycle_completed_at: nowIso,
              previous_status: event.status,
              completion_comment: comment,
              completion_duration_source:
                asNumber(body.durationMinutes) !== null
                  ? "explicit_duration"
                  : asString(body.endedAt) || asString(body.endTime)
                    ? "explicit_end_time"
                    : "current_time",
            },
            updated_at: nowIso,
          })
          .eq("id", event.id)
          .eq("user_id", appUser.id)
          .select()
          .single();
      
        if (updateError || !updatedEventData) {
          if (rawSignal) {
            await markRawActivitySignalFailed({
              signalId: rawSignal.id,
              userId: appUser.id,
              error: updateError?.message ?? "Failed to complete activity event.",
            });
          }
      
          await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: event.id,
            processingRunId,
            processorName: "activity_complete_route",
            processingStage: "complete_event",
            processingStatus: "failed",
            severity: "error",
            message: "Failed to update activity event to completed status.",
            input: {
              eventId: event.id,
              previousStatus: event.status,
              endedAt: timing.endedAt,
              durationMinutes: timing.durationMinutes,
            },
            error: {
              message: updateError?.message ?? "Failed to complete activity event.",
            },
            metadata: {
              endpoint: "/api/activity/complete",
              mode: "template_first_complete",
            },
            startedAt: processingStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: getDurationMs(processingStartedAt),
          });
      
          return NextResponse.json(

----- .\src\app\api\activity\complete\route.ts:496 | pattern: completedStatus -----
        const { data: updatedEventData, error: updateError } = await supabase
          .from("activity_events")
          .update({
            ended_at: timing.endedAt,
            duration_minutes: timing.durationMinutes,
            status: completedStatus,
            processing_status: "processed",
            description: comment ?? event.description,
            metadata_json: {
              ...existingMetadata,
  496:         lifecycle: completedStatus,
              lifecycle_completed_at: nowIso,
              previous_status: event.status,
              completion_comment: comment,
              completion_duration_source:
                asNumber(body.durationMinutes) !== null
                  ? "explicit_duration"
                  : asString(body.endedAt) || asString(body.endTime)
                    ? "explicit_end_time"
                    : "current_time",
            },
            updated_at: nowIso,
          })
          .eq("id", event.id)
          .eq("user_id", appUser.id)
          .select()
          .single();
      
        if (updateError || !updatedEventData) {
          if (rawSignal) {
            await markRawActivitySignalFailed({
              signalId: rawSignal.id,
              userId: appUser.id,
              error: updateError?.message ?? "Failed to complete activity event.",
            });
          }
      
          await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: event.id,
            processingRunId,
            processorName: "activity_complete_route",
            processingStage: "complete_event",
            processingStatus: "failed",
            severity: "error",
            message: "Failed to update activity event to completed status.",
            input: {
              eventId: event.id,
              previousStatus: event.status,
              endedAt: timing.endedAt,
              durationMinutes: timing.durationMinutes,
            },
            error: {
              message: updateError?.message ?? "Failed to complete activity event.",
            },
            metadata: {
              endpoint: "/api/activity/complete",
              mode: "template_first_complete",
            },
            startedAt: processingStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: getDurationMs(processingStartedAt),
          });
      
          return NextResponse.json(
            {
              ok: false,
              error: updateError?.message ?? "Failed to complete activity event.",
            },
            { status: 500 }

----- .\src\app\api\activity\complete\route.ts:778 | pattern: completedStatus -----
              mode: "template_first_complete",
              p4Step: "P4.7.7-R-E2",
            },
            startedAt: processingStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: getDurationMs(processingStartedAt),
          });
      
          return NextResponse.json({
            ok: true,
  778:       status: completedStatus,
            event: updatedEvent,
            impactEvents: impactResult.impactEvents,
            dailyAggregates: impactResult.dailyAggregates,
            currentSnapshots: impactResult.currentSnapshots,
            impactProcessor: {
              ok: impactResult.ok,
              skipped: impactResult.skipped,
              reason: impactResult.reason,
              counts: impactResult.counts,
            },
            rubricatorClassification: {
              ok: rubricatorClassificationResult.ok,
              skipped: rubricatorClassificationResult.skipped,
              skipReason: rubricatorClassificationResult.skipReason,
              ruleKey: rubricatorClassificationResult.ruleKey,
              classificationId: rubricatorClassificationResult.classificationId,
              classificationStatus:
                rubricatorClassificationResult.classificationStatus,
              created: rubricatorClassificationResult.created,
              alreadyExisted: rubricatorClassificationResult.alreadyExisted,
              errors: rubricatorClassificationResult.errors,
            },
            valueObjectBridge: {
              ok: valueObjectBridgeResult.ok,
              skipped: valueObjectBridgeResult.skipped,
              skipReason: valueObjectBridgeResult.skipReason,
              errors: valueObjectBridgeResult.errors,
              mapping: valueObjectBridgeResult.mappingResult
                ? {
                    ok: valueObjectBridgeResult.mappingResult.ok,
                    skipped: valueObjectBridgeResult.mappingResult.skipped,
                    skipReason: valueObjectBridgeResult.mappingResult.skipReason,
                    classificationSummaryCount:
                      valueObjectBridgeResult.mappingResult.classificationSummary
                        .length,
                    mappingsCount:
                      valueObjectBridgeResult.mappingResult.mappings.length,
                  }
                : null,
              bridge: valueObjectBridgeResult.bridgeResult
                ? {
                    ok: valueObjectBridgeResult.bridgeResult.ok,
                    skipped: valueObjectBridgeResult.bridgeResult.skipped,
                    skipReason: valueObjectBridgeResult.bridgeResult.skipReason,
                    mappingsRequested:
                      valueObjectBridgeResult.bridgeResult.mappingsRequested,
                    createdCount:
                      valueObjectBridgeResult.bridgeResult.created.length,
                    created: valueObjectBridgeResult.bridgeResult.created,
                    errors: valueObjectBridgeResult.bridgeResult.errors,
                  }
                : null,
            },
            processingLogs: {
              rawSignalId: rawSignal?.id ?? null,
              processingRunId,
              rubricatorClassification: {
                ok: rubricatorClassificationLogResult.ok,
                error: rubricatorClassificationLogResult.error,
                logId: rubricatorClassificationLogResult.log?.id ?? null,
```

## 10. activity_events select/update

```text
FILE: .\src\app\api\activity\complete\route.ts
PATTERN: .from("activity_events")
MATCH COUNT: 3

----- .\src\app\api\activity\complete\route.ts:295 | pattern: .from("activity_events") -----
          return NextResponse.json(
            {
              ok: false,
              error: "eventId is required.",
            },
            { status: 400 }
          );
        }
      
        const { data: eventData, error: eventError } = await supabase
  295:     .from("activity_events")
          .select("*")
          .eq("id", eventId)
          .eq("user_id", appUser.id)
          .maybeSingle();
      
        if (eventError) {
          return NextResponse.json(
            {
              ok: false,
              error: eventError.message,
            },
            { status: 500 }
          );
        }
      
        if (!eventData) {
          return NextResponse.json(
            {
              ok: false,
              error: "Activity event not found or access denied.",
            },
            { status: 404 }
          );
        }
      
        const event = eventData as ActivityEventRow;
        const completedStatus = ACTIVITY_STATUS_COMPLETED;
      
        if (event.status === completedStatus) {
          try {
            const existingImpactEventsCount = await getExistingImpactEventsCount(
              event.id
            );
      
            const impactResult = await processActivityImpacts({
              eventId: event.id,
              userId: appUser.id,
              activityTemplateId: event.activity_template_id,
              activityTypeId: event.activity_type_id,
              durationMinutes: event.duration_minutes,
              startedAt: event.started_at,
            });
      
            return NextResponse.json({
              ok: true,
              status: "already_completed",
              event,
              impactEvents: impactResult.impactEvents,
              dailyAggregates: impactResult.dailyAggregates,
              currentSnapshots: impactResult.currentSnapshots,
              impactProcessor: {
                ok: impactResult.ok,
                skipped: impactResult.skipped,
                reason: impactResult.reason,
                counts: impactResult.counts,
                existingImpactEventsCount,
              },
              lifecycle: {
                alreadyCompleted: true,
                note:

----- .\src\app\api\activity\complete\route.ts:487 | pattern: .from("activity_events") -----
          metadata: {
            endpoint: "/api/activity/complete",
            mode: "template_first_complete",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: getDurationMs(processingStartedAt),
        });
      
        const { data: updatedEventData, error: updateError } = await supabase
  487:     .from("activity_events")
          .update({
            ended_at: timing.endedAt,
            duration_minutes: timing.durationMinutes,
            status: completedStatus,
            processing_status: "processed",
            description: comment ?? event.description,
            metadata_json: {
              ...existingMetadata,
              lifecycle: completedStatus,
              lifecycle_completed_at: nowIso,
              previous_status: event.status,
              completion_comment: comment,
              completion_duration_source:
                asNumber(body.durationMinutes) !== null
                  ? "explicit_duration"
                  : asString(body.endedAt) || asString(body.endTime)
                    ? "explicit_end_time"
                    : "current_time",
            },
            updated_at: nowIso,
          })
          .eq("id", event.id)
          .eq("user_id", appUser.id)
          .select()
          .single();
      
        if (updateError || !updatedEventData) {
          if (rawSignal) {
            await markRawActivitySignalFailed({
              signalId: rawSignal.id,
              userId: appUser.id,
              error: updateError?.message ?? "Failed to complete activity event.",
            });
          }
      
          await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: event.id,
            processingRunId,
            processorName: "activity_complete_route",
            processingStage: "complete_event",
            processingStatus: "failed",
            severity: "error",
            message: "Failed to update activity event to completed status.",
            input: {
              eventId: event.id,
              previousStatus: event.status,
              endedAt: timing.endedAt,
              durationMinutes: timing.durationMinutes,
            },
            error: {
              message: updateError?.message ?? "Failed to complete activity event.",
            },
            metadata: {
              endpoint: "/api/activity/complete",
              mode: "template_first_complete",
            },
            startedAt: processingStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),

----- .\src\app\api\activity\complete\route.ts:908 | pattern: .from("activity_events") -----
            metadata: {
              endpoint: "/api/activity/complete",
              mode: "template_first_complete",
            },
            startedAt: processingStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: getDurationMs(processingStartedAt),
          });
      
          await supabase
  908:       .from("activity_events")
            .update({
              processing_status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", updatedEvent.id)
            .eq("user_id", appUser.id);
      
          return NextResponse.json(
            {
              ok: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to process rule-based activity impacts after completion.",
              event: updatedEvent,
            },
            { status: 500 }
          );
        }
      }
      
      
      
      
      
```

## 11. updatedEventData anchor

```text
FILE: .\src\app\api\activity\complete\route.ts
PATTERN: updatedEventData
MATCH COUNT: 3

----- .\src\app\api\activity\complete\route.ts:486 | pattern: updatedEventData -----
              },
          metadata: {
            endpoint: "/api/activity/complete",
            mode: "template_first_complete",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: getDurationMs(processingStartedAt),
        });
      
  486:   const { data: updatedEventData, error: updateError } = await supabase
          .from("activity_events")
          .update({
            ended_at: timing.endedAt,
            duration_minutes: timing.durationMinutes,
            status: completedStatus,
            processing_status: "processed",
            description: comment ?? event.description,
            metadata_json: {
              ...existingMetadata,
              lifecycle: completedStatus,
              lifecycle_completed_at: nowIso,
              previous_status: event.status,
              completion_comment: comment,
              completion_duration_source:
                asNumber(body.durationMinutes) !== null
                  ? "explicit_duration"
                  : asString(body.endedAt) || asString(body.endTime)
                    ? "explicit_end_time"
                    : "current_time",
            },
            updated_at: nowIso,
          })
          .eq("id", event.id)
          .eq("user_id", appUser.id)
          .select()
          .single();
      
        if (updateError || !updatedEventData) {
          if (rawSignal) {
            await markRawActivitySignalFailed({
              signalId: rawSignal.id,
              userId: appUser.id,
              error: updateError?.message ?? "Failed to complete activity event.",
            });
          }
      
          await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: event.id,
            processingRunId,
            processorName: "activity_complete_route",
            processingStage: "complete_event",
            processingStatus: "failed",
            severity: "error",
            message: "Failed to update activity event to completed status.",
            input: {
              eventId: event.id,
              previousStatus: event.status,
              endedAt: timing.endedAt,
              durationMinutes: timing.durationMinutes,
            },
            error: {
              message: updateError?.message ?? "Failed to complete activity event.",
            },
            metadata: {
              endpoint: "/api/activity/complete",
              mode: "template_first_complete",
            },
            startedAt: processingStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: getDurationMs(processingStartedAt),
          });
      
          return NextResponse.json(
            {
              ok: false,
              error: updateError?.message ?? "Failed to complete activity event.",
            },
            { status: 500 }
          );
        }
      
        const updatedEvent = updatedEventData as ActivityEventRow;
      
        await safeCreateActivityProcessingLog({
          userId: appUser.id,
          rawSignalId: rawSignal?.id ?? null,
          activityEventId: updatedEvent.id,
          processingRunId,

----- .\src\app\api\activity\complete\route.ts:514 | pattern: updatedEventData -----
                    ? "explicit_end_time"
                    : "current_time",
            },
            updated_at: nowIso,
          })
          .eq("id", event.id)
          .eq("user_id", appUser.id)
          .select()
          .single();
      
  514:   if (updateError || !updatedEventData) {
          if (rawSignal) {
            await markRawActivitySignalFailed({
              signalId: rawSignal.id,
              userId: appUser.id,
              error: updateError?.message ?? "Failed to complete activity event.",
            });
          }
      
          await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: event.id,
            processingRunId,
            processorName: "activity_complete_route",
            processingStage: "complete_event",
            processingStatus: "failed",
            severity: "error",
            message: "Failed to update activity event to completed status.",
            input: {
              eventId: event.id,
              previousStatus: event.status,
              endedAt: timing.endedAt,
              durationMinutes: timing.durationMinutes,
            },
            error: {
              message: updateError?.message ?? "Failed to complete activity event.",
            },
            metadata: {
              endpoint: "/api/activity/complete",
              mode: "template_first_complete",
            },
            startedAt: processingStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: getDurationMs(processingStartedAt),
          });
      
          return NextResponse.json(
            {
              ok: false,
              error: updateError?.message ?? "Failed to complete activity event.",
            },
            { status: 500 }
          );
        }
      
        const updatedEvent = updatedEventData as ActivityEventRow;
      
        await safeCreateActivityProcessingLog({
          userId: appUser.id,
          rawSignalId: rawSignal?.id ?? null,
          activityEventId: updatedEvent.id,
          processingRunId,
          processorName: "activity_complete_route",
          processingStage: "complete_event",
          processingStatus: "completed",
          severity: "info",
          message: "Activity event completed from lifecycle complete flow.",
          input: {
            eventId: event.id,
            previousStatus: event.status,
            endedAt: timing.endedAt,
            durationMinutes: timing.durationMinutes,
          },
          output: {
            activityEventId: updatedEvent.id,
            status: updatedEvent.status,
            processingStatus: updatedEvent.processing_status,
          },
          metadata: {
            endpoint: "/api/activity/complete",
            mode: "template_first_complete",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: getDurationMs(processingStartedAt),
        });
      
        try {
          const impactResult = await processActivityImpacts({
            eventId: updatedEvent.id,

----- .\src\app\api\activity\complete\route.ts:560 | pattern: updatedEventData -----
      
          return NextResponse.json(
            {
              ok: false,
              error: updateError?.message ?? "Failed to complete activity event.",
            },
            { status: 500 }
          );
        }
      
  560:   const updatedEvent = updatedEventData as ActivityEventRow;
      
        await safeCreateActivityProcessingLog({
          userId: appUser.id,
          rawSignalId: rawSignal?.id ?? null,
          activityEventId: updatedEvent.id,
          processingRunId,
          processorName: "activity_complete_route",
          processingStage: "complete_event",
          processingStatus: "completed",
          severity: "info",
          message: "Activity event completed from lifecycle complete flow.",
          input: {
            eventId: event.id,
            previousStatus: event.status,
            endedAt: timing.endedAt,
            durationMinutes: timing.durationMinutes,
          },
          output: {
            activityEventId: updatedEvent.id,
            status: updatedEvent.status,
            processingStatus: updatedEvent.processing_status,
          },
          metadata: {
            endpoint: "/api/activity/complete",
            mode: "template_first_complete",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: getDurationMs(processingStartedAt),
        });
      
        try {
          const impactResult = await processActivityImpacts({
            eventId: updatedEvent.id,
            userId: appUser.id,
            activityTemplateId: updatedEvent.activity_template_id,
            activityTypeId: updatedEvent.activity_type_id,
            durationMinutes: updatedEvent.duration_minutes,
            startedAt: updatedEvent.started_at,
          });
      
          const processedSignalResult = rawSignal
            ? await markRawActivitySignalProcessed({
                signalId: rawSignal.id,
                userId: appUser.id,
                outputEventId: updatedEvent.id,
                normalizedPreview: {
                  activityEventId: updatedEvent.id,
                  previousStatus: event.status,
                  nextStatus: updatedEvent.status,
                  startedAt: timing.startedAt,
                  endedAt: timing.endedAt,
                  durationMinutes: timing.durationMinutes,
                  impactProcessor: {
                    ok: impactResult.ok,
                    skipped: impactResult.skipped,
                    reason: impactResult.reason,
                    counts: impactResult.counts,
                  },
                },
              })
            : null;
      
          if (processedSignalResult && !processedSignalResult.ok) {
            await safeCreateActivityProcessingLog({
              userId: appUser.id,
              rawSignalId: rawSignal?.id ?? null,
              activityEventId: updatedEvent.id,
              processingRunId,
              processorName: "activity_complete_route",
              processingStage: "finalize",
              processingStatus: "warning",
              severity: "warning",
              message: "Completed activity was processed, but raw signal could not be marked as processed.",
              error: {
                message: processedSignalResult.error,
              },
              metadata: {
                endpoint: "/api/activity/complete",
                mode: "template_first_complete",
```

## 12. updatedEvent anchor

```text
FILE: .\src\app\api\activity\complete\route.ts
PATTERN: updatedEvent
MATCH COUNT: 37

----- .\src\app\api\activity\complete\route.ts:486 | pattern: updatedEvent -----
              },
          metadata: {
            endpoint: "/api/activity/complete",
            mode: "template_first_complete",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: getDurationMs(processingStartedAt),
        });
      
  486:   const { data: updatedEventData, error: updateError } = await supabase
          .from("activity_events")
          .update({
            ended_at: timing.endedAt,
            duration_minutes: timing.durationMinutes,
            status: completedStatus,
            processing_status: "processed",
            description: comment ?? event.description,
            metadata_json: {
              ...existingMetadata,
              lifecycle: completedStatus,
              lifecycle_completed_at: nowIso,
              previous_status: event.status,
              completion_comment: comment,
              completion_duration_source:
                asNumber(body.durationMinutes) !== null
                  ? "explicit_duration"
                  : asString(body.endedAt) || asString(body.endTime)
                    ? "explicit_end_time"
                    : "current_time",
            },
            updated_at: nowIso,
          })
          .eq("id", event.id)
          .eq("user_id", appUser.id)
          .select()
          .single();
      
        if (updateError || !updatedEventData) {
          if (rawSignal) {
            await markRawActivitySignalFailed({
              signalId: rawSignal.id,
              userId: appUser.id,
              error: updateError?.message ?? "Failed to complete activity event.",
            });
          }
      
          await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: event.id,
            processingRunId,
            processorName: "activity_complete_route",
            processingStage: "complete_event",
            processingStatus: "failed",
            severity: "error",
            message: "Failed to update activity event to completed status.",
            input: {
              eventId: event.id,
              previousStatus: event.status,
              endedAt: timing.endedAt,
              durationMinutes: timing.durationMinutes,
            },
            error: {
              message: updateError?.message ?? "Failed to complete activity event.",
            },
            metadata: {
              endpoint: "/api/activity/complete",
              mode: "template_first_complete",
            },
            startedAt: processingStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: getDurationMs(processingStartedAt),
          });
      
          return NextResponse.json(
            {
              ok: false,
              error: updateError?.message ?? "Failed to complete activity event.",
            },
            { status: 500 }
          );
        }
      
        const updatedEvent = updatedEventData as ActivityEventRow;
      
        await safeCreateActivityProcessingLog({
          userId: appUser.id,
          rawSignalId: rawSignal?.id ?? null,
          activityEventId: updatedEvent.id,
          processingRunId,

----- .\src\app\api\activity\complete\route.ts:514 | pattern: updatedEvent -----
                    ? "explicit_end_time"
                    : "current_time",
            },
            updated_at: nowIso,
          })
          .eq("id", event.id)
          .eq("user_id", appUser.id)
          .select()
          .single();
      
  514:   if (updateError || !updatedEventData) {
          if (rawSignal) {
            await markRawActivitySignalFailed({
              signalId: rawSignal.id,
              userId: appUser.id,
              error: updateError?.message ?? "Failed to complete activity event.",
            });
          }
      
          await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: event.id,
            processingRunId,
            processorName: "activity_complete_route",
            processingStage: "complete_event",
            processingStatus: "failed",
            severity: "error",
            message: "Failed to update activity event to completed status.",
            input: {
              eventId: event.id,
              previousStatus: event.status,
              endedAt: timing.endedAt,
              durationMinutes: timing.durationMinutes,
            },
            error: {
              message: updateError?.message ?? "Failed to complete activity event.",
            },
            metadata: {
              endpoint: "/api/activity/complete",
              mode: "template_first_complete",
            },
            startedAt: processingStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: getDurationMs(processingStartedAt),
          });
      
          return NextResponse.json(
            {
              ok: false,
              error: updateError?.message ?? "Failed to complete activity event.",
            },
            { status: 500 }
          );
        }
      
        const updatedEvent = updatedEventData as ActivityEventRow;
      
        await safeCreateActivityProcessingLog({
          userId: appUser.id,
          rawSignalId: rawSignal?.id ?? null,
          activityEventId: updatedEvent.id,
          processingRunId,
          processorName: "activity_complete_route",
          processingStage: "complete_event",
          processingStatus: "completed",
          severity: "info",
          message: "Activity event completed from lifecycle complete flow.",
          input: {
            eventId: event.id,
            previousStatus: event.status,
            endedAt: timing.endedAt,
            durationMinutes: timing.durationMinutes,
          },
          output: {
            activityEventId: updatedEvent.id,
            status: updatedEvent.status,
            processingStatus: updatedEvent.processing_status,
          },
          metadata: {
            endpoint: "/api/activity/complete",
            mode: "template_first_complete",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: getDurationMs(processingStartedAt),
        });
      
        try {
          const impactResult = await processActivityImpacts({
            eventId: updatedEvent.id,

----- .\src\app\api\activity\complete\route.ts:560 | pattern: updatedEvent -----
      
          return NextResponse.json(
            {
              ok: false,
              error: updateError?.message ?? "Failed to complete activity event.",
            },
            { status: 500 }
          );
        }
      
  560:   const updatedEvent = updatedEventData as ActivityEventRow;
      
        await safeCreateActivityProcessingLog({
          userId: appUser.id,
          rawSignalId: rawSignal?.id ?? null,
          activityEventId: updatedEvent.id,
          processingRunId,
          processorName: "activity_complete_route",
          processingStage: "complete_event",
          processingStatus: "completed",
          severity: "info",
          message: "Activity event completed from lifecycle complete flow.",
          input: {
            eventId: event.id,
            previousStatus: event.status,
            endedAt: timing.endedAt,
            durationMinutes: timing.durationMinutes,
          },
          output: {
            activityEventId: updatedEvent.id,
            status: updatedEvent.status,
            processingStatus: updatedEvent.processing_status,
          },
          metadata: {
            endpoint: "/api/activity/complete",
            mode: "template_first_complete",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: getDurationMs(processingStartedAt),
        });
      
        try {
          const impactResult = await processActivityImpacts({
            eventId: updatedEvent.id,
            userId: appUser.id,
            activityTemplateId: updatedEvent.activity_template_id,
            activityTypeId: updatedEvent.activity_type_id,
            durationMinutes: updatedEvent.duration_minutes,
            startedAt: updatedEvent.started_at,
          });
      
          const processedSignalResult = rawSignal
            ? await markRawActivitySignalProcessed({
                signalId: rawSignal.id,
                userId: appUser.id,
                outputEventId: updatedEvent.id,
                normalizedPreview: {
                  activityEventId: updatedEvent.id,
                  previousStatus: event.status,
                  nextStatus: updatedEvent.status,
                  startedAt: timing.startedAt,
                  endedAt: timing.endedAt,
                  durationMinutes: timing.durationMinutes,
                  impactProcessor: {
                    ok: impactResult.ok,
                    skipped: impactResult.skipped,
                    reason: impactResult.reason,
                    counts: impactResult.counts,
                  },
                },
              })
            : null;
      
          if (processedSignalResult && !processedSignalResult.ok) {
            await safeCreateActivityProcessingLog({
              userId: appUser.id,
              rawSignalId: rawSignal?.id ?? null,
              activityEventId: updatedEvent.id,
              processingRunId,
              processorName: "activity_complete_route",
              processingStage: "finalize",
              processingStatus: "warning",
              severity: "warning",
              message: "Completed activity was processed, but raw signal could not be marked as processed.",
              error: {
                message: processedSignalResult.error,
              },
              metadata: {
                endpoint: "/api/activity/complete",
                mode: "template_first_complete",

----- .\src\app\api\activity\complete\route.ts:565 | pattern: updatedEvent -----
            },
            { status: 500 }
          );
        }
      
        const updatedEvent = updatedEventData as ActivityEventRow;
      
        await safeCreateActivityProcessingLog({
          userId: appUser.id,
          rawSignalId: rawSignal?.id ?? null,
  565:     activityEventId: updatedEvent.id,
          processingRunId,
          processorName: "activity_complete_route",
          processingStage: "complete_event",
          processingStatus: "completed",
          severity: "info",
          message: "Activity event completed from lifecycle complete flow.",
          input: {
            eventId: event.id,
            previousStatus: event.status,
            endedAt: timing.endedAt,
            durationMinutes: timing.durationMinutes,
          },
          output: {
            activityEventId: updatedEvent.id,
            status: updatedEvent.status,
            processingStatus: updatedEvent.processing_status,
          },
          metadata: {
            endpoint: "/api/activity/complete",
            mode: "template_first_complete",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: getDurationMs(processingStartedAt),
        });
      
        try {
          const impactResult = await processActivityImpacts({
            eventId: updatedEvent.id,
            userId: appUser.id,
            activityTemplateId: updatedEvent.activity_template_id,
            activityTypeId: updatedEvent.activity_type_id,
            durationMinutes: updatedEvent.duration_minutes,
            startedAt: updatedEvent.started_at,
          });
      
          const processedSignalResult = rawSignal
            ? await markRawActivitySignalProcessed({
                signalId: rawSignal.id,
                userId: appUser.id,
                outputEventId: updatedEvent.id,
                normalizedPreview: {
                  activityEventId: updatedEvent.id,
                  previousStatus: event.status,
                  nextStatus: updatedEvent.status,
                  startedAt: timing.startedAt,
                  endedAt: timing.endedAt,
                  durationMinutes: timing.durationMinutes,
                  impactProcessor: {
                    ok: impactResult.ok,
                    skipped: impactResult.skipped,
                    reason: impactResult.reason,
                    counts: impactResult.counts,
                  },
                },
              })
            : null;
      
          if (processedSignalResult && !processedSignalResult.ok) {
            await safeCreateActivityProcessingLog({
              userId: appUser.id,
              rawSignalId: rawSignal?.id ?? null,
              activityEventId: updatedEvent.id,
              processingRunId,
              processorName: "activity_complete_route",
              processingStage: "finalize",
              processingStatus: "warning",
              severity: "warning",
              message: "Completed activity was processed, but raw signal could not be marked as processed.",
              error: {
                message: processedSignalResult.error,
              },
              metadata: {
                endpoint: "/api/activity/complete",
                mode: "template_first_complete",
              },
              startedAt: processingStartedAt.toISOString(),
              finishedAt: new Date().toISOString(),
              durationMs: getDurationMs(processingStartedAt),
            });

----- .\src\app\api\activity\complete\route.ts:579 | pattern: updatedEvent -----
          processingStatus: "completed",
          severity: "info",
          message: "Activity event completed from lifecycle complete flow.",
          input: {
            eventId: event.id,
            previousStatus: event.status,
            endedAt: timing.endedAt,
            durationMinutes: timing.durationMinutes,
          },
          output: {
  579:       activityEventId: updatedEvent.id,
            status: updatedEvent.status,
            processingStatus: updatedEvent.processing_status,
          },
          metadata: {
            endpoint: "/api/activity/complete",
            mode: "template_first_complete",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: getDurationMs(processingStartedAt),
        });
      
        try {
          const impactResult = await processActivityImpacts({
            eventId: updatedEvent.id,
            userId: appUser.id,
            activityTemplateId: updatedEvent.activity_template_id,
            activityTypeId: updatedEvent.activity_type_id,
            durationMinutes: updatedEvent.duration_minutes,
            startedAt: updatedEvent.started_at,
          });
      
          const processedSignalResult = rawSignal
            ? await markRawActivitySignalProcessed({
                signalId: rawSignal.id,
                userId: appUser.id,
                outputEventId: updatedEvent.id,
                normalizedPreview: {
                  activityEventId: updatedEvent.id,
                  previousStatus: event.status,
                  nextStatus: updatedEvent.status,
                  startedAt: timing.startedAt,
                  endedAt: timing.endedAt,
                  durationMinutes: timing.durationMinutes,
                  impactProcessor: {
                    ok: impactResult.ok,
                    skipped: impactResult.skipped,
                    reason: impactResult.reason,
                    counts: impactResult.counts,
                  },
                },
              })
            : null;
      
          if (processedSignalResult && !processedSignalResult.ok) {
            await safeCreateActivityProcessingLog({
              userId: appUser.id,
              rawSignalId: rawSignal?.id ?? null,
              activityEventId: updatedEvent.id,
              processingRunId,
              processorName: "activity_complete_route",
              processingStage: "finalize",
              processingStatus: "warning",
              severity: "warning",
              message: "Completed activity was processed, but raw signal could not be marked as processed.",
              error: {
                message: processedSignalResult.error,
              },
              metadata: {
                endpoint: "/api/activity/complete",
                mode: "template_first_complete",
              },
              startedAt: processingStartedAt.toISOString(),
              finishedAt: new Date().toISOString(),
              durationMs: getDurationMs(processingStartedAt),
            });
          }
      
          await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: updatedEvent.id,
            processingRunId,
            processorName: "activity_complete_route",
            processingStage: "process_impacts",
            processingStatus: impactResult.ok ? "completed" : "skipped",
            severity: impactResult.ok ? "info" : "notice",
            message: "Rule-based activity impacts processed after completion.",
            input: {
              activityTemplateId: updatedEvent.activity_template_id,

----- .\src\app\api\activity\complete\route.ts:580 | pattern: updatedEvent -----
          severity: "info",
          message: "Activity event completed from lifecycle complete flow.",
          input: {
            eventId: event.id,
            previousStatus: event.status,
            endedAt: timing.endedAt,
            durationMinutes: timing.durationMinutes,
          },
          output: {
            activityEventId: updatedEvent.id,
  580:       status: updatedEvent.status,
            processingStatus: updatedEvent.processing_status,
          },
          metadata: {
            endpoint: "/api/activity/complete",
            mode: "template_first_complete",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: getDurationMs(processingStartedAt),
        });
      
        try {
          const impactResult = await processActivityImpacts({
            eventId: updatedEvent.id,
            userId: appUser.id,
            activityTemplateId: updatedEvent.activity_template_id,
            activityTypeId: updatedEvent.activity_type_id,
            durationMinutes: updatedEvent.duration_minutes,
            startedAt: updatedEvent.started_at,
          });
      
          const processedSignalResult = rawSignal
            ? await markRawActivitySignalProcessed({
                signalId: rawSignal.id,
                userId: appUser.id,
                outputEventId: updatedEvent.id,
                normalizedPreview: {
                  activityEventId: updatedEvent.id,
                  previousStatus: event.status,
                  nextStatus: updatedEvent.status,
                  startedAt: timing.startedAt,
                  endedAt: timing.endedAt,
                  durationMinutes: timing.durationMinutes,
                  impactProcessor: {
                    ok: impactResult.ok,
                    skipped: impactResult.skipped,
                    reason: impactResult.reason,
                    counts: impactResult.counts,
                  },
                },
              })
            : null;
      
          if (processedSignalResult && !processedSignalResult.ok) {
            await safeCreateActivityProcessingLog({
              userId: appUser.id,
              rawSignalId: rawSignal?.id ?? null,
              activityEventId: updatedEvent.id,
              processingRunId,
              processorName: "activity_complete_route",
              processingStage: "finalize",
              processingStatus: "warning",
              severity: "warning",
              message: "Completed activity was processed, but raw signal could not be marked as processed.",
              error: {
                message: processedSignalResult.error,
              },
              metadata: {
                endpoint: "/api/activity/complete",
                mode: "template_first_complete",
              },
              startedAt: processingStartedAt.toISOString(),
              finishedAt: new Date().toISOString(),
              durationMs: getDurationMs(processingStartedAt),
            });
          }
      
          await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: updatedEvent.id,
            processingRunId,
            processorName: "activity_complete_route",
            processingStage: "process_impacts",
            processingStatus: impactResult.ok ? "completed" : "skipped",
            severity: impactResult.ok ? "info" : "notice",
            message: "Rule-based activity impacts processed after completion.",
            input: {
              activityTemplateId: updatedEvent.activity_template_id,
              activityTypeId: updatedEvent.activity_type_id,

----- .\src\app\api\activity\complete\route.ts:581 | pattern: updatedEvent -----
          message: "Activity event completed from lifecycle complete flow.",
          input: {
            eventId: event.id,
            previousStatus: event.status,
            endedAt: timing.endedAt,
            durationMinutes: timing.durationMinutes,
          },
          output: {
            activityEventId: updatedEvent.id,
            status: updatedEvent.status,
  581:       processingStatus: updatedEvent.processing_status,
          },
          metadata: {
            endpoint: "/api/activity/complete",
            mode: "template_first_complete",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: getDurationMs(processingStartedAt),
        });
      
        try {
          const impactResult = await processActivityImpacts({
            eventId: updatedEvent.id,
            userId: appUser.id,
            activityTemplateId: updatedEvent.activity_template_id,
            activityTypeId: updatedEvent.activity_type_id,
            durationMinutes: updatedEvent.duration_minutes,
            startedAt: updatedEvent.started_at,
          });
      
          const processedSignalResult = rawSignal
            ? await markRawActivitySignalProcessed({
                signalId: rawSignal.id,
                userId: appUser.id,
                outputEventId: updatedEvent.id,
                normalizedPreview: {
                  activityEventId: updatedEvent.id,
                  previousStatus: event.status,
                  nextStatus: updatedEvent.status,
                  startedAt: timing.startedAt,
                  endedAt: timing.endedAt,
                  durationMinutes: timing.durationMinutes,
                  impactProcessor: {
                    ok: impactResult.ok,
                    skipped: impactResult.skipped,
                    reason: impactResult.reason,
                    counts: impactResult.counts,
                  },
                },
              })
            : null;
      
          if (processedSignalResult && !processedSignalResult.ok) {
            await safeCreateActivityProcessingLog({
              userId: appUser.id,
              rawSignalId: rawSignal?.id ?? null,
              activityEventId: updatedEvent.id,
              processingRunId,
              processorName: "activity_complete_route",
              processingStage: "finalize",
              processingStatus: "warning",
              severity: "warning",
              message: "Completed activity was processed, but raw signal could not be marked as processed.",
              error: {
                message: processedSignalResult.error,
              },
              metadata: {
                endpoint: "/api/activity/complete",
                mode: "template_first_complete",
              },
              startedAt: processingStartedAt.toISOString(),
              finishedAt: new Date().toISOString(),
              durationMs: getDurationMs(processingStartedAt),
            });
          }
      
          await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: updatedEvent.id,
            processingRunId,
            processorName: "activity_complete_route",
            processingStage: "process_impacts",
            processingStatus: impactResult.ok ? "completed" : "skipped",
            severity: impactResult.ok ? "info" : "notice",
            message: "Rule-based activity impacts processed after completion.",
            input: {
              activityTemplateId: updatedEvent.activity_template_id,
              activityTypeId: updatedEvent.activity_type_id,
              durationMinutes: updatedEvent.duration_minutes,

----- .\src\app\api\activity\complete\route.ts:594 | pattern: updatedEvent -----
            endpoint: "/api/activity/complete",
            mode: "template_first_complete",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: getDurationMs(processingStartedAt),
        });
      
        try {
          const impactResult = await processActivityImpacts({
  594:       eventId: updatedEvent.id,
            userId: appUser.id,
            activityTemplateId: updatedEvent.activity_template_id,
            activityTypeId: updatedEvent.activity_type_id,
            durationMinutes: updatedEvent.duration_minutes,
            startedAt: updatedEvent.started_at,
          });
      
          const processedSignalResult = rawSignal
            ? await markRawActivitySignalProcessed({
                signalId: rawSignal.id,
                userId: appUser.id,
                outputEventId: updatedEvent.id,
                normalizedPreview: {
                  activityEventId: updatedEvent.id,
                  previousStatus: event.status,
                  nextStatus: updatedEvent.status,
                  startedAt: timing.startedAt,
                  endedAt: timing.endedAt,
                  durationMinutes: timing.durationMinutes,
                  impactProcessor: {
                    ok: impactResult.ok,
                    skipped: impactResult.skipped,
                    reason: impactResult.reason,
                    counts: impactResult.counts,
                  },
                },
              })
            : null;
      
          if (processedSignalResult && !processedSignalResult.ok) {
            await safeCreateActivityProcessingLog({
              userId: appUser.id,
              rawSignalId: rawSignal?.id ?? null,
              activityEventId: updatedEvent.id,
              processingRunId,
              processorName: "activity_complete_route",
              processingStage: "finalize",
              processingStatus: "warning",
              severity: "warning",
              message: "Completed activity was processed, but raw signal could not be marked as processed.",
              error: {
                message: processedSignalResult.error,
              },
              metadata: {
                endpoint: "/api/activity/complete",
                mode: "template_first_complete",
              },
              startedAt: processingStartedAt.toISOString(),
              finishedAt: new Date().toISOString(),
              durationMs: getDurationMs(processingStartedAt),
            });
          }
      
          await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: updatedEvent.id,
            processingRunId,
            processorName: "activity_complete_route",
            processingStage: "process_impacts",
            processingStatus: impactResult.ok ? "completed" : "skipped",
            severity: impactResult.ok ? "info" : "notice",
            message: "Rule-based activity impacts processed after completion.",
            input: {
              activityTemplateId: updatedEvent.activity_template_id,
              activityTypeId: updatedEvent.activity_type_id,
              durationMinutes: updatedEvent.duration_minutes,
              startedAt: updatedEvent.started_at,
            },
            output: {
              ok: impactResult.ok,
              skipped: impactResult.skipped,
              reason: impactResult.reason,
              counts: impactResult.counts,
            },
            metadata: {
              endpoint: "/api/activity/complete",
              mode: "template_first_complete",
            },
            startedAt: processingStartedAt.toISOString(),

----- .\src\app\api\activity\complete\route.ts:596 | pattern: updatedEvent -----
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: getDurationMs(processingStartedAt),
        });
      
        try {
          const impactResult = await processActivityImpacts({
            eventId: updatedEvent.id,
            userId: appUser.id,
  596:       activityTemplateId: updatedEvent.activity_template_id,
            activityTypeId: updatedEvent.activity_type_id,
            durationMinutes: updatedEvent.duration_minutes,
            startedAt: updatedEvent.started_at,
          });
      
          const processedSignalResult = rawSignal
            ? await markRawActivitySignalProcessed({
                signalId: rawSignal.id,
                userId: appUser.id,
                outputEventId: updatedEvent.id,
                normalizedPreview: {
                  activityEventId: updatedEvent.id,
                  previousStatus: event.status,
                  nextStatus: updatedEvent.status,
                  startedAt: timing.startedAt,
                  endedAt: timing.endedAt,
                  durationMinutes: timing.durationMinutes,
                  impactProcessor: {
                    ok: impactResult.ok,
                    skipped: impactResult.skipped,
                    reason: impactResult.reason,
                    counts: impactResult.counts,
                  },
                },
              })
            : null;
      
          if (processedSignalResult && !processedSignalResult.ok) {
            await safeCreateActivityProcessingLog({
              userId: appUser.id,
              rawSignalId: rawSignal?.id ?? null,
              activityEventId: updatedEvent.id,
              processingRunId,
              processorName: "activity_complete_route",
              processingStage: "finalize",
              processingStatus: "warning",
              severity: "warning",
              message: "Completed activity was processed, but raw signal could not be marked as processed.",
              error: {
                message: processedSignalResult.error,
              },
              metadata: {
                endpoint: "/api/activity/complete",
                mode: "template_first_complete",
              },
              startedAt: processingStartedAt.toISOString(),
              finishedAt: new Date().toISOString(),
              durationMs: getDurationMs(processingStartedAt),
            });
          }
      
          await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: updatedEvent.id,
            processingRunId,
            processorName: "activity_complete_route",
            processingStage: "process_impacts",
            processingStatus: impactResult.ok ? "completed" : "skipped",
            severity: impactResult.ok ? "info" : "notice",
            message: "Rule-based activity impacts processed after completion.",
            input: {
              activityTemplateId: updatedEvent.activity_template_id,
              activityTypeId: updatedEvent.activity_type_id,
              durationMinutes: updatedEvent.duration_minutes,
              startedAt: updatedEvent.started_at,
            },
            output: {
              ok: impactResult.ok,
              skipped: impactResult.skipped,
              reason: impactResult.reason,
              counts: impactResult.counts,
            },
            metadata: {
              endpoint: "/api/activity/complete",
              mode: "template_first_complete",
            },
            startedAt: processingStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: getDurationMs(processingStartedAt),

----- .\src\app\api\activity\complete\route.ts:597 | pattern: updatedEvent -----
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: getDurationMs(processingStartedAt),
        });
      
        try {
          const impactResult = await processActivityImpacts({
            eventId: updatedEvent.id,
            userId: appUser.id,
            activityTemplateId: updatedEvent.activity_template_id,
  597:       activityTypeId: updatedEvent.activity_type_id,
            durationMinutes: updatedEvent.duration_minutes,
            startedAt: updatedEvent.started_at,
          });
      
          const processedSignalResult = rawSignal
            ? await markRawActivitySignalProcessed({
                signalId: rawSignal.id,
                userId: appUser.id,
                outputEventId: updatedEvent.id,
                normalizedPreview: {
                  activityEventId: updatedEvent.id,
                  previousStatus: event.status,
                  nextStatus: updatedEvent.status,
                  startedAt: timing.startedAt,
                  endedAt: timing.endedAt,
                  durationMinutes: timing.durationMinutes,
                  impactProcessor: {
                    ok: impactResult.ok,
                    skipped: impactResult.skipped,
                    reason: impactResult.reason,
                    counts: impactResult.counts,
                  },
                },
              })
            : null;
      
          if (processedSignalResult && !processedSignalResult.ok) {
            await safeCreateActivityProcessingLog({
              userId: appUser.id,
              rawSignalId: rawSignal?.id ?? null,
              activityEventId: updatedEvent.id,
              processingRunId,
              processorName: "activity_complete_route",
              processingStage: "finalize",
              processingStatus: "warning",
              severity: "warning",
              message: "Completed activity was processed, but raw signal could not be marked as processed.",
              error: {
                message: processedSignalResult.error,
              },
              metadata: {
                endpoint: "/api/activity/complete",
                mode: "template_first_complete",
              },
              startedAt: processingStartedAt.toISOString(),
              finishedAt: new Date().toISOString(),
              durationMs: getDurationMs(processingStartedAt),
            });
          }
      
          await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: updatedEvent.id,
            processingRunId,
            processorName: "activity_complete_route",
            processingStage: "process_impacts",
            processingStatus: impactResult.ok ? "completed" : "skipped",
            severity: impactResult.ok ? "info" : "notice",
            message: "Rule-based activity impacts processed after completion.",
            input: {
              activityTemplateId: updatedEvent.activity_template_id,
              activityTypeId: updatedEvent.activity_type_id,
              durationMinutes: updatedEvent.duration_minutes,
              startedAt: updatedEvent.started_at,
            },
            output: {
              ok: impactResult.ok,
              skipped: impactResult.skipped,
              reason: impactResult.reason,
              counts: impactResult.counts,
            },
            metadata: {
              endpoint: "/api/activity/complete",
              mode: "template_first_complete",
            },
            startedAt: processingStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: getDurationMs(processingStartedAt),
          });
```

## 13. bridge call in complete route

```text
FILE: .\src\app\api\activity\complete\route.ts
PATTERN: processActivityValueObjectBridge
MATCH COUNT: 2

----- .\src\app\api\activity\complete\route.ts:19 | pattern: processActivityValueObjectBridge -----
        ACTIVITY_RECORDING_DISABLED_MESSAGE,
        ACTIVITY_RECORDING_ENABLED,
      } from "../../../../../lib/activity/activityRecordingConfig";
      import {
        ACTIVITY_COMPLETABLE_STATUSES,
        ACTIVITY_STATUS_COMPLETED,
        canTransitionActivityStatus,
        isCompletableActivityStatus,
      } from "../../../../../lib/activity/activityLifecycle";
      import {
        getDurationMs,
        safeCreateActivityProcessingLog,
      } from "../../../../../lib/activity/activityProcessingLogs";
      import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
      import { processActivityImpacts } from "../../../../../lib/activity/activityImpactProcessor";
   19: import { processActivityValueObjectBridge } from "../../../../../lib/activity/activityValueObjectLifecycle";
      import { ensureActivityEventRubricatorClassificationForKnownTemplate } from "../../../../../lib/activity/activityRubricatorClassificationLifecycle";
      import { buildRubricatorResolverLogMetadata } from "../../../../../lib/activity/rubricatorResolverLogMetadata";
      import {
        createRawActivitySignal,
        markRawActivitySignalFailed,
        markRawActivitySignalProcessed,
      } from "../../../../../lib/activity/rawActivitySignals";
      import { supabase } from "../../../../../lib/supabase";
      
      export const dynamic = "force-dynamic";
      
      type ActivityCompleteBody = {
        eventId?: unknown;
        endedAt?: unknown;
        endTime?: unknown;
        durationMinutes?: unknown;
        comment?: unknown;
      };
      
      type ActivityEventRow = {
        id: string;
        user_id: string;
        performed_by_actor_id: string | null;
        acting_as_actor_id: string | null;
        acting_for_actor_id: string | null;
        activity_type_id: string | null;
        activity_template_id: string | null;
        template_id: string | null;
        event_code: string | null;
        input_text: string | null;
        title: string | null;
        description: string | null;
        started_at: string | null;
        ended_at: string | null;
        duration_minutes: number | null;
        source: string | null;
        status: string;
        privacy_scope: string | null;
        processing_status: string | null;
        metadata_json: Record<string, unknown> | null;
        created_at: string;
        updated_at: string;
      };
      
      type CompletionTiming =
        | {
            ok: true;
            startedAt: string;
            endedAt: string;
            durationMinutes: number;
          }
        | {
            ok: false;
            error: string;
          };
      
      
      function asRecord(value: unknown): Record<string, unknown> {
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          return value as Record<string, unknown>;
        }
      
        return {};
      }
      
      function asString(value: unknown): string | null {
        if (typeof value !== "string") {
          return null;
        }
      
        const trimmed = value.trim();
      
        return trimmed.length > 0 ? trimmed : null;
      }
      
      function asNumber(value: unknown): number | null {
        if (typeof value === "number" && Number.isFinite(value)) {
          return value;
        }
      
        if (typeof value === "string") {
          const normalized = value.trim().replace(",", ".");
          const parsed = Number.parseFloat(normalized);
      
          if (Number.isFinite(parsed)) {
            return parsed;
          }
        }
      
        return null;
      }
      
      function resolveCompletionTiming(params: {
        event: ActivityEventRow;
        body: ActivityCompleteBody;
      }): CompletionTiming {
        const { event, body } = params;
      
        if (!event.started_at) {
          return {

----- .\src\app\api\activity\complete\route.ts:733 | pattern: processActivityValueObjectBridge -----
              created: rubricatorClassificationResult.created,
              alreadyExisted: rubricatorClassificationResult.alreadyExisted,
              errors: rubricatorClassificationResult.errors,
            },
            metadata: {
              endpoint: "/api/activity/complete",
              mode: "template_first_complete",
              p4Step: "P4.7.8-R-G1",
              ruleResolver: buildRubricatorResolverLogMetadata(rubricatorClassificationResult),
            },
            startedAt: processingStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: getDurationMs(processingStartedAt),
          });
      
  733:     const valueObjectBridgeResult = await processActivityValueObjectBridge({
            supabase,
            eventId: updatedEvent.id,
            processorName: "activity_complete_route_p4_7_7",
          });
      
          const valueObjectBridgeLogResult =
            await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: updatedEvent.id,
            processingRunId,
            processorName: "activity_complete_route_value_object_bridge",
            processingStage: "finalize",
            processingStatus: valueObjectBridgeResult.ok
              ? valueObjectBridgeResult.skipped
                ? "skipped"
                : "completed"
              : "warning",
            severity: valueObjectBridgeResult.ok ? "info" : "warning",
            message: "Value Object bridge processed after activity completion.",
            input: {
              eventId: updatedEvent.id,
            },
            output: {
              ok: valueObjectBridgeResult.ok,
              skipped: valueObjectBridgeResult.skipped,
              skipReason: valueObjectBridgeResult.skipReason,
              mappingSkipped: valueObjectBridgeResult.mappingResult?.skipped ?? null,
              mappingsCount: valueObjectBridgeResult.mappingResult?.mappings.length ?? 0,
              bridgeCreatedCount: valueObjectBridgeResult.bridgeResult?.created.length ?? 0,
              errors: valueObjectBridgeResult.errors,
            },
            metadata: {
              endpoint: "/api/activity/complete",
              mode: "template_first_complete",
              p4Step: "P4.7.7-R-E2",
            },
            startedAt: processingStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: getDurationMs(processingStartedAt),
          });
      
          return NextResponse.json({
            ok: true,
            status: completedStatus,
            event: updatedEvent,
            impactEvents: impactResult.impactEvents,
            dailyAggregates: impactResult.dailyAggregates,
            currentSnapshots: impactResult.currentSnapshots,
            impactProcessor: {
              ok: impactResult.ok,
              skipped: impactResult.skipped,
              reason: impactResult.reason,
              counts: impactResult.counts,
            },
            rubricatorClassification: {
              ok: rubricatorClassificationResult.ok,
              skipped: rubricatorClassificationResult.skipped,
              skipReason: rubricatorClassificationResult.skipReason,
              ruleKey: rubricatorClassificationResult.ruleKey,
              classificationId: rubricatorClassificationResult.classificationId,
              classificationStatus:
                rubricatorClassificationResult.classificationStatus,
              created: rubricatorClassificationResult.created,
              alreadyExisted: rubricatorClassificationResult.alreadyExisted,
              errors: rubricatorClassificationResult.errors,
            },
            valueObjectBridge: {
              ok: valueObjectBridgeResult.ok,
              skipped: valueObjectBridgeResult.skipped,
              skipReason: valueObjectBridgeResult.skipReason,
              errors: valueObjectBridgeResult.errors,
              mapping: valueObjectBridgeResult.mappingResult
                ? {
                    ok: valueObjectBridgeResult.mappingResult.ok,
                    skipped: valueObjectBridgeResult.mappingResult.skipped,
                    skipReason: valueObjectBridgeResult.mappingResult.skipReason,
                    classificationSummaryCount:
                      valueObjectBridgeResult.mappingResult.classificationSummary
                        .length,
                    mappingsCount:
                      valueObjectBridgeResult.mappingResult.mappings.length,
                  }
                : null,
              bridge: valueObjectBridgeResult.bridgeResult
                ? {
                    ok: valueObjectBridgeResult.bridgeResult.ok,
                    skipped: valueObjectBridgeResult.bridgeResult.skipped,
                    skipReason: valueObjectBridgeResult.bridgeResult.skipReason,
                    mappingsRequested:
                      valueObjectBridgeResult.bridgeResult.mappingsRequested,
                    createdCount:
                      valueObjectBridgeResult.bridgeResult.created.length,
                    created: valueObjectBridgeResult.bridgeResult.created,
                    errors: valueObjectBridgeResult.bridgeResult.errors,
                  }
                : null,
            },
            processingLogs: {
              rawSignalId: rawSignal?.id ?? null,
```

## 14. processing logs in complete route

```text
FILE: .\src\app\api\activity\complete\route.ts
PATTERN: processingLogs
MATCH COUNT: 2

----- .\src\app\api\activity\complete\route.ts:16 | pattern: processingLogs -----
      } from "../../../../../lib/activity/activityRecordingConfig";
      import {
        ACTIVITY_COMPLETABLE_STATUSES,
        ACTIVITY_STATUS_COMPLETED,
        canTransitionActivityStatus,
        isCompletableActivityStatus,
      } from "../../../../../lib/activity/activityLifecycle";
      import {
        getDurationMs,
        safeCreateActivityProcessingLog,
   16: } from "../../../../../lib/activity/activityProcessingLogs";
      import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
      import { processActivityImpacts } from "../../../../../lib/activity/activityImpactProcessor";
      import { processActivityValueObjectBridge } from "../../../../../lib/activity/activityValueObjectLifecycle";
      import { ensureActivityEventRubricatorClassificationForKnownTemplate } from "../../../../../lib/activity/activityRubricatorClassificationLifecycle";
      import { buildRubricatorResolverLogMetadata } from "../../../../../lib/activity/rubricatorResolverLogMetadata";
      import {
        createRawActivitySignal,
        markRawActivitySignalFailed,
        markRawActivitySignalProcessed,
      } from "../../../../../lib/activity/rawActivitySignals";
      import { supabase } from "../../../../../lib/supabase";
      
      export const dynamic = "force-dynamic";
      
      type ActivityCompleteBody = {
        eventId?: unknown;
        endedAt?: unknown;
        endTime?: unknown;
        durationMinutes?: unknown;
        comment?: unknown;
      };
      
      type ActivityEventRow = {
        id: string;
        user_id: string;
        performed_by_actor_id: string | null;
        acting_as_actor_id: string | null;
        acting_for_actor_id: string | null;
        activity_type_id: string | null;
        activity_template_id: string | null;
        template_id: string | null;
        event_code: string | null;
        input_text: string | null;
        title: string | null;
        description: string | null;
        started_at: string | null;
        ended_at: string | null;
        duration_minutes: number | null;
        source: string | null;
        status: string;
        privacy_scope: string | null;
        processing_status: string | null;
        metadata_json: Record<string, unknown> | null;
        created_at: string;
        updated_at: string;
      };
      
      type CompletionTiming =
        | {
            ok: true;
            startedAt: string;
            endedAt: string;
            durationMinutes: number;
          }
        | {
            ok: false;
            error: string;
          };
      
      
      function asRecord(value: unknown): Record<string, unknown> {
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          return value as Record<string, unknown>;
        }
      
        return {};
      }
      
      function asString(value: unknown): string | null {
        if (typeof value !== "string") {
          return null;
        }
      
        const trimmed = value.trim();
      
        return trimmed.length > 0 ? trimmed : null;
      }
      
      function asNumber(value: unknown): number | null {
        if (typeof value === "number" && Number.isFinite(value)) {

----- .\src\app\api\activity\complete\route.ts:832 | pattern: processingLogs -----
                    skipReason: valueObjectBridgeResult.bridgeResult.skipReason,
                    mappingsRequested:
                      valueObjectBridgeResult.bridgeResult.mappingsRequested,
                    createdCount:
                      valueObjectBridgeResult.bridgeResult.created.length,
                    created: valueObjectBridgeResult.bridgeResult.created,
                    errors: valueObjectBridgeResult.bridgeResult.errors,
                  }
                : null,
            },
  832:       processingLogs: {
              rawSignalId: rawSignal?.id ?? null,
              processingRunId,
              rubricatorClassification: {
                ok: rubricatorClassificationLogResult.ok,
                error: rubricatorClassificationLogResult.error,
                logId: rubricatorClassificationLogResult.log?.id ?? null,
              },
              valueObjectBridge: {
                ok: valueObjectBridgeLogResult.ok,
                error: valueObjectBridgeLogResult.error,
                logId: valueObjectBridgeLogResult.log?.id ?? null,
              },
            },
            rawSignal: rawSignal
              ? {
                  id: rawSignal.id,
                  processingStatus:
                    processedSignalResult?.signal?.processing_status ??
                    rawSignal.processing_status,
                }
              : null,
            processingRunId,
            lifecycle: {
              startedAt: timing.startedAt,
              endedAt: timing.endedAt,
              durationMinutes: timing.durationMinutes,
              impactsCreated: impactResult.counts.impactEvents > 0,
              note:
                "Activity event was completed. Rule-based impacts, daily aggregates and current snapshots were processed without AI.",
            },
          });
        } catch (error) {
          if (rawSignal) {
            await markRawActivitySignalFailed({
              signalId: rawSignal.id,
              userId: appUser.id,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to process rule-based activity impacts after completion.",
            });
          }
      
          await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: updatedEvent.id,
            processingRunId,
            processorName: "activity_complete_route",
            processingStage: "process_impacts",
            processingStatus: "failed",
            severity: "error",
            message: "Failed to process rule-based activity impacts after completion.",
            input: {
              activityTemplateId: updatedEvent.activity_template_id,
              activityTypeId: updatedEvent.activity_type_id,
              durationMinutes: updatedEvent.duration_minutes,
              startedAt: updatedEvent.started_at,
            },
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to process rule-based activity impacts after completion.",
            },
            metadata: {
              endpoint: "/api/activity/complete",
              mode: "template_first_complete",
            },
            startedAt: processingStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: getDurationMs(processingStartedAt),
          });
      
          await supabase
            .from("activity_events")
            .update({
              processing_status: "failed",
              updated_at: new Date().toISOString(),
            })
```

## 15. route response shape

```text
FILE: .\src\app\api\activity\complete\route.ts
PATTERN: NextResponse.json
MATCH COUNT: 14

----- .\src\app\api\activity\complete\route.ts:220 | pattern: NextResponse.json -----
          .eq("event_id", eventId);
      
        if (error) {
          throw new Error(error.message);
        }
      
        return count ?? 0;
      }
      
      export async function GET() {
  220:   return NextResponse.json({
          ok: true,
          endpoint: "/api/activity/complete",
          method: "POST",
          enabled: ACTIVITY_RECORDING_ENABLED,
          status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
          message: ACTIVITY_RECORDING_ENABLED
            ? "Complete a previously started activity event and process rule-based impacts."
            : ACTIVITY_RECORDING_DISABLED_MESSAGE,
          example: {
            eventId: "activity-event-uuid",
            comment: "Completed lifecycle smoke test",
          },
          deterministicTestExample: {
            eventId: "activity-event-uuid",
            durationMinutes: 5,
            comment: "Completed lifecycle smoke test with fixed duration",
          },
        });
      }
      
      export async function POST(request: Request) {
        if (!ACTIVITY_RECORDING_ENABLED) {
          return NextResponse.json(
            {
              ok: false,
              error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
            },
            { status: 503 }
          );
        }
      
        const { appUser, errorResponse } = await getActivityUserContext();
      
        if (errorResponse) {
          return errorResponse;
        }
      
        if (!appUser) {
          return NextResponse.json(
            {
              ok: false,
              error: "User context not found",
            },
            { status: 500 }
          );
        }
      
        let body: ActivityCompleteBody;
      
        try {
          body = (await request.json()) as ActivityCompleteBody;
        } catch {
          return NextResponse.json(
            {
              ok: false,
              error: "Invalid JSON body",
            },
            { status: 400 }
          );
        }
      
        const eventId = asString(body.eventId);
      
        if (!eventId) {
          return NextResponse.json(
            {
              ok: false,
              error: "eventId is required.",
            },
            { status: 400 }
          );
        }
      
        const { data: eventData, error: eventError } = await supabase
          .from("activity_events")
          .select("*")
          .eq("id", eventId)
          .eq("user_id", appUser.id)
          .maybeSingle();
      

----- .\src\app\api\activity\complete\route.ts:243 | pattern: NextResponse.json -----
          deterministicTestExample: {
            eventId: "activity-event-uuid",
            durationMinutes: 5,
            comment: "Completed lifecycle smoke test with fixed duration",
          },
        });
      }
      
      export async function POST(request: Request) {
        if (!ACTIVITY_RECORDING_ENABLED) {
  243:     return NextResponse.json(
            {
              ok: false,
              error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
            },
            { status: 503 }
          );
        }
      
        const { appUser, errorResponse } = await getActivityUserContext();
      
        if (errorResponse) {
          return errorResponse;
        }
      
        if (!appUser) {
          return NextResponse.json(
            {
              ok: false,
              error: "User context not found",
            },
            { status: 500 }
          );
        }
      
        let body: ActivityCompleteBody;
      
        try {
          body = (await request.json()) as ActivityCompleteBody;
        } catch {
          return NextResponse.json(
            {
              ok: false,
              error: "Invalid JSON body",
            },
            { status: 400 }
          );
        }
      
        const eventId = asString(body.eventId);
      
        if (!eventId) {
          return NextResponse.json(
            {
              ok: false,
              error: "eventId is required.",
            },
            { status: 400 }
          );
        }
      
        const { data: eventData, error: eventError } = await supabase
          .from("activity_events")
          .select("*")
          .eq("id", eventId)
          .eq("user_id", appUser.id)
          .maybeSingle();
      
        if (eventError) {
          return NextResponse.json(
            {
              ok: false,
              error: eventError.message,
            },
            { status: 500 }
          );
        }
      
        if (!eventData) {
          return NextResponse.json(
            {
              ok: false,
              error: "Activity event not found or access denied.",
            },
            { status: 404 }
          );
        }
      
        const event = eventData as ActivityEventRow;
        const completedStatus = ACTIVITY_STATUS_COMPLETED;
      

----- .\src\app\api\activity\complete\route.ts:259 | pattern: NextResponse.json -----
          );
        }
      
        const { appUser, errorResponse } = await getActivityUserContext();
      
        if (errorResponse) {
          return errorResponse;
        }
      
        if (!appUser) {
  259:     return NextResponse.json(
            {
              ok: false,
              error: "User context not found",
            },
            { status: 500 }
          );
        }
      
        let body: ActivityCompleteBody;
      
        try {
          body = (await request.json()) as ActivityCompleteBody;
        } catch {
          return NextResponse.json(
            {
              ok: false,
              error: "Invalid JSON body",
            },
            { status: 400 }
          );
        }
      
        const eventId = asString(body.eventId);
      
        if (!eventId) {
          return NextResponse.json(
            {
              ok: false,
              error: "eventId is required.",
            },
            { status: 400 }
          );
        }
      
        const { data: eventData, error: eventError } = await supabase
          .from("activity_events")
          .select("*")
          .eq("id", eventId)
          .eq("user_id", appUser.id)
          .maybeSingle();
      
        if (eventError) {
          return NextResponse.json(
            {
              ok: false,
              error: eventError.message,
            },
            { status: 500 }
          );
        }
      
        if (!eventData) {
          return NextResponse.json(
            {
              ok: false,
              error: "Activity event not found or access denied.",
            },
            { status: 404 }
          );
        }
      
        const event = eventData as ActivityEventRow;
        const completedStatus = ACTIVITY_STATUS_COMPLETED;
      
        if (event.status === completedStatus) {
          try {
            const existingImpactEventsCount = await getExistingImpactEventsCount(
              event.id
            );
      
            const impactResult = await processActivityImpacts({
              eventId: event.id,
              userId: appUser.id,
              activityTemplateId: event.activity_template_id,
              activityTypeId: event.activity_type_id,
              durationMinutes: event.duration_minutes,
              startedAt: event.started_at,
            });
      
            return NextResponse.json({

----- .\src\app\api\activity\complete\route.ts:273 | pattern: NextResponse.json -----
            },
            { status: 500 }
          );
        }
      
        let body: ActivityCompleteBody;
      
        try {
          body = (await request.json()) as ActivityCompleteBody;
        } catch {
  273:     return NextResponse.json(
            {
              ok: false,
              error: "Invalid JSON body",
            },
            { status: 400 }
          );
        }
      
        const eventId = asString(body.eventId);
      
        if (!eventId) {
          return NextResponse.json(
            {
              ok: false,
              error: "eventId is required.",
            },
            { status: 400 }
          );
        }
      
        const { data: eventData, error: eventError } = await supabase
          .from("activity_events")
          .select("*")
          .eq("id", eventId)
          .eq("user_id", appUser.id)
          .maybeSingle();
      
        if (eventError) {
          return NextResponse.json(
            {
              ok: false,
              error: eventError.message,
            },
            { status: 500 }
          );
        }
      
        if (!eventData) {
          return NextResponse.json(
            {
              ok: false,
              error: "Activity event not found or access denied.",
            },
            { status: 404 }
          );
        }
      
        const event = eventData as ActivityEventRow;
        const completedStatus = ACTIVITY_STATUS_COMPLETED;
      
        if (event.status === completedStatus) {
          try {
            const existingImpactEventsCount = await getExistingImpactEventsCount(
              event.id
            );
      
            const impactResult = await processActivityImpacts({
              eventId: event.id,
              userId: appUser.id,
              activityTemplateId: event.activity_template_id,
              activityTypeId: event.activity_type_id,
              durationMinutes: event.duration_minutes,
              startedAt: event.started_at,
            });
      
            return NextResponse.json({
              ok: true,
              status: "already_completed",
              event,
              impactEvents: impactResult.impactEvents,
              dailyAggregates: impactResult.dailyAggregates,
              currentSnapshots: impactResult.currentSnapshots,
              impactProcessor: {
                ok: impactResult.ok,
                skipped: impactResult.skipped,
                reason: impactResult.reason,
                counts: impactResult.counts,
                existingImpactEventsCount,
              },
              lifecycle: {

----- .\src\app\api\activity\complete\route.ts:285 | pattern: NextResponse.json -----
              ok: false,
              error: "Invalid JSON body",
            },
            { status: 400 }
          );
        }
      
        const eventId = asString(body.eventId);
      
        if (!eventId) {
  285:     return NextResponse.json(
            {
              ok: false,
              error: "eventId is required.",
            },
            { status: 400 }
          );
        }
      
        const { data: eventData, error: eventError } = await supabase
          .from("activity_events")
          .select("*")
          .eq("id", eventId)
          .eq("user_id", appUser.id)
          .maybeSingle();
      
        if (eventError) {
          return NextResponse.json(
            {
              ok: false,
              error: eventError.message,
            },
            { status: 500 }
          );
        }
      
        if (!eventData) {
          return NextResponse.json(
            {
              ok: false,
              error: "Activity event not found or access denied.",
            },
            { status: 404 }
          );
        }
      
        const event = eventData as ActivityEventRow;
        const completedStatus = ACTIVITY_STATUS_COMPLETED;
      
        if (event.status === completedStatus) {
          try {
            const existingImpactEventsCount = await getExistingImpactEventsCount(
              event.id
            );
      
            const impactResult = await processActivityImpacts({
              eventId: event.id,
              userId: appUser.id,
              activityTemplateId: event.activity_template_id,
              activityTypeId: event.activity_type_id,
              durationMinutes: event.duration_minutes,
              startedAt: event.started_at,
            });
      
            return NextResponse.json({
              ok: true,
              status: "already_completed",
              event,
              impactEvents: impactResult.impactEvents,
              dailyAggregates: impactResult.dailyAggregates,
              currentSnapshots: impactResult.currentSnapshots,
              impactProcessor: {
                ok: impactResult.ok,
                skipped: impactResult.skipped,
                reason: impactResult.reason,
                counts: impactResult.counts,
                existingImpactEventsCount,
              },
              lifecycle: {
                alreadyCompleted: true,
                note:
                  "Activity event was already completed. Duplicate impact processing was skipped if impacts already existed.",
              },
            });
          } catch (error) {
            return NextResponse.json(
              {
                ok: false,
                error:
                  error instanceof Error
                    ? error.message

----- .\src\app\api\activity\complete\route.ts:302 | pattern: NextResponse.json -----
        }
      
        const { data: eventData, error: eventError } = await supabase
          .from("activity_events")
          .select("*")
          .eq("id", eventId)
          .eq("user_id", appUser.id)
          .maybeSingle();
      
        if (eventError) {
  302:     return NextResponse.json(
            {
              ok: false,
              error: eventError.message,
            },
            { status: 500 }
          );
        }
      
        if (!eventData) {
          return NextResponse.json(
            {
              ok: false,
              error: "Activity event not found or access denied.",
            },
            { status: 404 }
          );
        }
      
        const event = eventData as ActivityEventRow;
        const completedStatus = ACTIVITY_STATUS_COMPLETED;
      
        if (event.status === completedStatus) {
          try {
            const existingImpactEventsCount = await getExistingImpactEventsCount(
              event.id
            );
      
            const impactResult = await processActivityImpacts({
              eventId: event.id,
              userId: appUser.id,
              activityTemplateId: event.activity_template_id,
              activityTypeId: event.activity_type_id,
              durationMinutes: event.duration_minutes,
              startedAt: event.started_at,
            });
      
            return NextResponse.json({
              ok: true,
              status: "already_completed",
              event,
              impactEvents: impactResult.impactEvents,
              dailyAggregates: impactResult.dailyAggregates,
              currentSnapshots: impactResult.currentSnapshots,
              impactProcessor: {
                ok: impactResult.ok,
                skipped: impactResult.skipped,
                reason: impactResult.reason,
                counts: impactResult.counts,
                existingImpactEventsCount,
              },
              lifecycle: {
                alreadyCompleted: true,
                note:
                  "Activity event was already completed. Duplicate impact processing was skipped if impacts already existed.",
              },
            });
          } catch (error) {
            return NextResponse.json(
              {
                ok: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to inspect completed activity event.",
              },
              { status: 500 }
            );
          }
        }
      
        if (!isCompletableActivityStatus(event.status)) {
          return NextResponse.json(
            {
              ok: false,
              error: `Activity event status '${event.status}' cannot be completed by this endpoint.`,
              allowedStatuses: Array.from(ACTIVITY_COMPLETABLE_STATUSES),
            },
            { status: 409 }
          );
        }

----- .\src\app\api\activity\complete\route.ts:312 | pattern: NextResponse.json -----
          return NextResponse.json(
            {
              ok: false,
              error: eventError.message,
            },
            { status: 500 }
          );
        }
      
        if (!eventData) {
  312:     return NextResponse.json(
            {
              ok: false,
              error: "Activity event not found or access denied.",
            },
            { status: 404 }
          );
        }
      
        const event = eventData as ActivityEventRow;
        const completedStatus = ACTIVITY_STATUS_COMPLETED;
      
        if (event.status === completedStatus) {
          try {
            const existingImpactEventsCount = await getExistingImpactEventsCount(
              event.id
            );
      
            const impactResult = await processActivityImpacts({
              eventId: event.id,
              userId: appUser.id,
              activityTemplateId: event.activity_template_id,
              activityTypeId: event.activity_type_id,
              durationMinutes: event.duration_minutes,
              startedAt: event.started_at,
            });
      
            return NextResponse.json({
              ok: true,
              status: "already_completed",
              event,
              impactEvents: impactResult.impactEvents,
              dailyAggregates: impactResult.dailyAggregates,
              currentSnapshots: impactResult.currentSnapshots,
              impactProcessor: {
                ok: impactResult.ok,
                skipped: impactResult.skipped,
                reason: impactResult.reason,
                counts: impactResult.counts,
                existingImpactEventsCount,
              },
              lifecycle: {
                alreadyCompleted: true,
                note:
                  "Activity event was already completed. Duplicate impact processing was skipped if impacts already existed.",
              },
            });
          } catch (error) {
            return NextResponse.json(
              {
                ok: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to inspect completed activity event.",
              },
              { status: 500 }
            );
          }
        }
      
        if (!isCompletableActivityStatus(event.status)) {
          return NextResponse.json(
            {
              ok: false,
              error: `Activity event status '${event.status}' cannot be completed by this endpoint.`,
              allowedStatuses: Array.from(ACTIVITY_COMPLETABLE_STATUSES),
            },
            { status: 409 }
          );
        }
      
        const timing = resolveCompletionTiming({
          event,
          body,
        });
      
        if (!timing.ok) {
          return NextResponse.json(
            {
              ok: false,

----- .\src\app\api\activity\complete\route.ts:339 | pattern: NextResponse.json -----
      
            const impactResult = await processActivityImpacts({
              eventId: event.id,
              userId: appUser.id,
              activityTemplateId: event.activity_template_id,
              activityTypeId: event.activity_type_id,
              durationMinutes: event.duration_minutes,
              startedAt: event.started_at,
            });
      
  339:       return NextResponse.json({
              ok: true,
              status: "already_completed",
              event,
              impactEvents: impactResult.impactEvents,
              dailyAggregates: impactResult.dailyAggregates,
              currentSnapshots: impactResult.currentSnapshots,
              impactProcessor: {
                ok: impactResult.ok,
                skipped: impactResult.skipped,
                reason: impactResult.reason,
                counts: impactResult.counts,
                existingImpactEventsCount,
              },
              lifecycle: {
                alreadyCompleted: true,
                note:
                  "Activity event was already completed. Duplicate impact processing was skipped if impacts already existed.",
              },
            });
          } catch (error) {
            return NextResponse.json(
              {
                ok: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to inspect completed activity event.",
              },
              { status: 500 }
            );
          }
        }
      
        if (!isCompletableActivityStatus(event.status)) {
          return NextResponse.json(
            {
              ok: false,
              error: `Activity event status '${event.status}' cannot be completed by this endpoint.`,
              allowedStatuses: Array.from(ACTIVITY_COMPLETABLE_STATUSES),
            },
            { status: 409 }
          );
        }
      
        const timing = resolveCompletionTiming({
          event,
          body,
        });
      
        if (!timing.ok) {
          return NextResponse.json(
            {
              ok: false,
              error: timing.error,
            },
            { status: 400 }
          );
        }
      
        const comment = asString(body.comment);
        const existingMetadata = asRecord(event.metadata_json);
        const nowIso = new Date().toISOString();
      
        const processingRunId = randomUUID();
        const processingStartedAt = new Date();
      
        const rawSignalResult = await createRawActivitySignal({
          userId: appUser.id,
          sourceType: "manual_form",
          sourceEventId: event.id,
          idempotencyKey: `${event.id}:complete:${timing.endedAt}:${timing.durationMinutes}`,
          rawPayload: {
            endpoint: "/api/activity/complete",
            body,
            eventId: event.id,
            previousStatus: event.status,
            timing,
          },
          normalizedPreview: {
            activityEventId: event.id,
```

## 16. error/failure path

```text
FILE: .\src\app\api\activity\complete\route.ts
PATTERN: processing_status
MATCH COUNT: 6

----- .\src\app\api\activity\complete\route.ts:58 | pattern: processing_status -----
        event_code: string | null;
        input_text: string | null;
        title: string | null;
        description: string | null;
        started_at: string | null;
        ended_at: string | null;
        duration_minutes: number | null;
        source: string | null;
        status: string;
        privacy_scope: string | null;
   58:   processing_status: string | null;
        metadata_json: Record<string, unknown> | null;
        created_at: string;
        updated_at: string;
      };
      
      type CompletionTiming =
        | {
            ok: true;
            startedAt: string;
            endedAt: string;
            durationMinutes: number;
          }
        | {
            ok: false;
            error: string;
          };
      
      
      function asRecord(value: unknown): Record<string, unknown> {
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          return value as Record<string, unknown>;
        }
      
        return {};
      }
      
      function asString(value: unknown): string | null {
        if (typeof value !== "string") {
          return null;
        }
      
        const trimmed = value.trim();
      
        return trimmed.length > 0 ? trimmed : null;
      }
      
      function asNumber(value: unknown): number | null {
        if (typeof value === "number" && Number.isFinite(value)) {
          return value;
        }
      
        if (typeof value === "string") {
          const normalized = value.trim().replace(",", ".");
          const parsed = Number.parseFloat(normalized);
      
          if (Number.isFinite(parsed)) {
            return parsed;
          }
        }
      
        return null;
      }
      
      function resolveCompletionTiming(params: {
        event: ActivityEventRow;
        body: ActivityCompleteBody;
      }): CompletionTiming {
        const { event, body } = params;
      
        if (!event.started_at) {
          return {
            ok: false,
            error: "Cannot complete activity event without started_at.",
          };
        }
      
        const startedDate = new Date(event.started_at);
      
        if (Number.isNaN(startedDate.getTime())) {
          return {

----- .\src\app\api\activity\complete\route.ts:492 | pattern: processing_status -----
          finishedAt: new Date().toISOString(),
          durationMs: getDurationMs(processingStartedAt),
        });
      
        const { data: updatedEventData, error: updateError } = await supabase
          .from("activity_events")
          .update({
            ended_at: timing.endedAt,
            duration_minutes: timing.durationMinutes,
            status: completedStatus,
  492:       processing_status: "processed",
            description: comment ?? event.description,
            metadata_json: {
              ...existingMetadata,
              lifecycle: completedStatus,
              lifecycle_completed_at: nowIso,
              previous_status: event.status,
              completion_comment: comment,
              completion_duration_source:
                asNumber(body.durationMinutes) !== null
                  ? "explicit_duration"
                  : asString(body.endedAt) || asString(body.endTime)
                    ? "explicit_end_time"
                    : "current_time",
            },
            updated_at: nowIso,
          })
          .eq("id", event.id)
          .eq("user_id", appUser.id)
          .select()
          .single();
      
        if (updateError || !updatedEventData) {
          if (rawSignal) {
            await markRawActivitySignalFailed({
              signalId: rawSignal.id,
              userId: appUser.id,
              error: updateError?.message ?? "Failed to complete activity event.",
            });
          }
      
          await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: event.id,
            processingRunId,
            processorName: "activity_complete_route",
            processingStage: "complete_event",
            processingStatus: "failed",
            severity: "error",
            message: "Failed to update activity event to completed status.",
            input: {
              eventId: event.id,
              previousStatus: event.status,
              endedAt: timing.endedAt,
              durationMinutes: timing.durationMinutes,
            },
            error: {
              message: updateError?.message ?? "Failed to complete activity event.",
            },
            metadata: {
              endpoint: "/api/activity/complete",
              mode: "template_first_complete",
            },
            startedAt: processingStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: getDurationMs(processingStartedAt),
          });
      
          return NextResponse.json(
            {
              ok: false,
              error: updateError?.message ?? "Failed to complete activity event.",
            },
            { status: 500 }
          );
        }
      
        const updatedEvent = updatedEventData as ActivityEventRow;
      
        await safeCreateActivityProcessingLog({

----- .\src\app\api\activity\complete\route.ts:581 | pattern: processing_status -----
          message: "Activity event completed from lifecycle complete flow.",
          input: {
            eventId: event.id,
            previousStatus: event.status,
            endedAt: timing.endedAt,
            durationMinutes: timing.durationMinutes,
          },
          output: {
            activityEventId: updatedEvent.id,
            status: updatedEvent.status,
  581:       processingStatus: updatedEvent.processing_status,
          },
          metadata: {
            endpoint: "/api/activity/complete",
            mode: "template_first_complete",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: getDurationMs(processingStartedAt),
        });
      
        try {
          const impactResult = await processActivityImpacts({
            eventId: updatedEvent.id,
            userId: appUser.id,
            activityTemplateId: updatedEvent.activity_template_id,
            activityTypeId: updatedEvent.activity_type_id,
            durationMinutes: updatedEvent.duration_minutes,
            startedAt: updatedEvent.started_at,
          });
      
          const processedSignalResult = rawSignal
            ? await markRawActivitySignalProcessed({
                signalId: rawSignal.id,
                userId: appUser.id,
                outputEventId: updatedEvent.id,
                normalizedPreview: {
                  activityEventId: updatedEvent.id,
                  previousStatus: event.status,
                  nextStatus: updatedEvent.status,
                  startedAt: timing.startedAt,
                  endedAt: timing.endedAt,
                  durationMinutes: timing.durationMinutes,
                  impactProcessor: {
                    ok: impactResult.ok,
                    skipped: impactResult.skipped,
                    reason: impactResult.reason,
                    counts: impactResult.counts,
                  },
                },
              })
            : null;
      
          if (processedSignalResult && !processedSignalResult.ok) {
            await safeCreateActivityProcessingLog({
              userId: appUser.id,
              rawSignalId: rawSignal?.id ?? null,
              activityEventId: updatedEvent.id,
              processingRunId,
              processorName: "activity_complete_route",
              processingStage: "finalize",
              processingStatus: "warning",
              severity: "warning",
              message: "Completed activity was processed, but raw signal could not be marked as processed.",
              error: {
                message: processedSignalResult.error,
              },
              metadata: {
                endpoint: "/api/activity/complete",
                mode: "template_first_complete",
              },
              startedAt: processingStartedAt.toISOString(),
              finishedAt: new Date().toISOString(),
              durationMs: getDurationMs(processingStartedAt),
            });
          }
      
          await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: updatedEvent.id,

----- .\src\app\api\activity\complete\route.ts:850 | pattern: processing_status -----
              valueObjectBridge: {
                ok: valueObjectBridgeLogResult.ok,
                error: valueObjectBridgeLogResult.error,
                logId: valueObjectBridgeLogResult.log?.id ?? null,
              },
            },
            rawSignal: rawSignal
              ? {
                  id: rawSignal.id,
                  processingStatus:
  850:               processedSignalResult?.signal?.processing_status ??
                    rawSignal.processing_status,
                }
              : null,
            processingRunId,
            lifecycle: {
              startedAt: timing.startedAt,
              endedAt: timing.endedAt,
              durationMinutes: timing.durationMinutes,
              impactsCreated: impactResult.counts.impactEvents > 0,
              note:
                "Activity event was completed. Rule-based impacts, daily aggregates and current snapshots were processed without AI.",
            },
          });
        } catch (error) {
          if (rawSignal) {
            await markRawActivitySignalFailed({
              signalId: rawSignal.id,
              userId: appUser.id,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to process rule-based activity impacts after completion.",
            });
          }
      
          await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: updatedEvent.id,
            processingRunId,
            processorName: "activity_complete_route",
            processingStage: "process_impacts",
            processingStatus: "failed",
            severity: "error",
            message: "Failed to process rule-based activity impacts after completion.",
            input: {
              activityTemplateId: updatedEvent.activity_template_id,
              activityTypeId: updatedEvent.activity_type_id,
              durationMinutes: updatedEvent.duration_minutes,
              startedAt: updatedEvent.started_at,
            },
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to process rule-based activity impacts after completion.",
            },
            metadata: {
              endpoint: "/api/activity/complete",
              mode: "template_first_complete",
            },
            startedAt: processingStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: getDurationMs(processingStartedAt),
          });
      
          await supabase
            .from("activity_events")
            .update({
              processing_status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", updatedEvent.id)
            .eq("user_id", appUser.id);
      
          return NextResponse.json(
            {
              ok: false,
              error:
                error instanceof Error

----- .\src\app\api\activity\complete\route.ts:851 | pattern: processing_status -----
                ok: valueObjectBridgeLogResult.ok,
                error: valueObjectBridgeLogResult.error,
                logId: valueObjectBridgeLogResult.log?.id ?? null,
              },
            },
            rawSignal: rawSignal
              ? {
                  id: rawSignal.id,
                  processingStatus:
                    processedSignalResult?.signal?.processing_status ??
  851:               rawSignal.processing_status,
                }
              : null,
            processingRunId,
            lifecycle: {
              startedAt: timing.startedAt,
              endedAt: timing.endedAt,
              durationMinutes: timing.durationMinutes,
              impactsCreated: impactResult.counts.impactEvents > 0,
              note:
                "Activity event was completed. Rule-based impacts, daily aggregates and current snapshots were processed without AI.",
            },
          });
        } catch (error) {
          if (rawSignal) {
            await markRawActivitySignalFailed({
              signalId: rawSignal.id,
              userId: appUser.id,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to process rule-based activity impacts after completion.",
            });
          }
      
          await safeCreateActivityProcessingLog({
            userId: appUser.id,
            rawSignalId: rawSignal?.id ?? null,
            activityEventId: updatedEvent.id,
            processingRunId,
            processorName: "activity_complete_route",
            processingStage: "process_impacts",
            processingStatus: "failed",
            severity: "error",
            message: "Failed to process rule-based activity impacts after completion.",
            input: {
              activityTemplateId: updatedEvent.activity_template_id,
              activityTypeId: updatedEvent.activity_type_id,
              durationMinutes: updatedEvent.duration_minutes,
              startedAt: updatedEvent.started_at,
            },
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to process rule-based activity impacts after completion.",
            },
            metadata: {
              endpoint: "/api/activity/complete",
              mode: "template_first_complete",
            },
            startedAt: processingStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: getDurationMs(processingStartedAt),
          });
      
          await supabase
            .from("activity_events")
            .update({
              processing_status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", updatedEvent.id)
            .eq("user_id", appUser.id);
      
          return NextResponse.json(
            {
              ok: false,
              error:
                error instanceof Error
                  ? error.message

----- .\src\app\api\activity\complete\route.ts:910 | pattern: processing_status -----
              mode: "template_first_complete",
            },
            startedAt: processingStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: getDurationMs(processingStartedAt),
          });
      
          await supabase
            .from("activity_events")
            .update({
  910:         processing_status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", updatedEvent.id)
            .eq("user_id", appUser.id);
      
          return NextResponse.json(
            {
              ok: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to process rule-based activity impacts after completion.",
              event: updatedEvent,
            },
            { status: 500 }
          );
        }
      }
      
      
      
      
      
```

## 17. existing Category Derivation references in complete route

```text
NO MATCH: Category Derivation
```

## 18. runCategoryDerivationForRoute in debug route for comparison

```text
NO MATCH: runCategoryDerivationForRoute
```

## 19. additionalCategoryLinks builder in debug route for comparison

```text
FILE: .\src\app\api\activity\debug\free-text-value-object-test\route.ts
PATTERN: buildAdditionalCategoryLinksForBridge
MATCH COUNT: 2

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:422 | pattern: buildAdditionalCategoryLinksForBridge -----
          ]);
      
          if (slug) {
            result.set(slug, row);
          }
        }
      
        return result;
      }
      
  422: function buildAdditionalCategoryLinksForBridge(params: {
        categoryDerivationEnabled: boolean;
        categoryDerivationDryRun: boolean;
        activityEventId: string;
        derivationRunId: string | null;
        categoryDerivationResult: unknown;
      }): AdditionalValueObjectCategoryLink[] | undefined {
        const {
          categoryDerivationEnabled,
          categoryDerivationDryRun,
          activityEventId,
          derivationRunId,
          categoryDerivationResult,
        } = params;
      
        if (!categoryDerivationEnabled || categoryDerivationDryRun) {
          return undefined;
        }
      
        const resolvedCandidates =
          collectPossibleResolvedCandidates(categoryDerivationResult);
        const derivationRowsBySlug = buildDerivationRowBySlug(
          collectPossibleDerivationRows(categoryDerivationResult)
        );
      
        const allowedResolutionStatuses = new Set([
          "resolved_existing",
          "created_suggested",
          "created_active",
        ]);
      
        const links: AdditionalValueObjectCategoryLink[] = [];
      
        for (const candidate of resolvedCandidates) {
          const categoryId = readStringField(candidate, [
            "categoryId",
            "category_id",
            "resolvedCategoryId",
            "resolved_category_id",
          ]);
      
          if (!isUuidLike(categoryId)) {
            continue;
          }
      
          const resolutionStatus =
            readStringField(candidate, ["resolutionStatus", "resolution_status"]) ??
            "resolved_existing";
      
          if (!allowedResolutionStatuses.has(resolutionStatus)) {
            continue;
          }
      
          const candidateSlug =
            readStringField(candidate, [
              "candidateSlug",
              "candidate_slug",
              "categorySlug",
              "category_slug",
              "slug",
            ]) ?? categoryId;
      
          const derivationRow = derivationRowsBySlug.get(candidateSlug) ?? null;
      
          const activityCategoryDerivationId = derivationRow
            ? readStringField(derivationRow, ["id", "activityCategoryDerivationId"])
            : null;
      
          links.push({
            categoryId,
            categoryTable: "contextual_categories",
            categoryRole: "semantic_component",
            source: "rule",
            confidence:
              readNumberField(candidate, ["confidence", "score"]) ??
              readNumberField(derivationRow ?? {}, ["confidence", "score"]),
            derivationRunId,
            activityCategoryDerivationId,
            activityEventId,
            candidateSlug,
            candidateTitle: readStringField(candidate, [
              "candidateTitle",
              "candidate_title",
              "title",
              "label",
              "name",
            ]),
            semanticLayer: readStringField(candidate, [
              "semanticLayer",
              "semantic_layer",
            ]),

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:818 | pattern: buildAdditionalCategoryLinksForBridge -----
          activityEventId: createdEvent.id,
          inputText,
          title,
          description,
          durationMinutes: timing.durationMinutes,
          personActorId: personActor.id,
          options: categoryDerivationOptions,
        });
      
          const categoryDerivationBridgeAdditionalCategoryLinks =
  818:       buildAdditionalCategoryLinksForBridge({
              categoryDerivationEnabled: categoryDerivationOptions.enabled,
              categoryDerivationDryRun: categoryDerivationOptions.dryRun,
              activityEventId: createdEvent.id,
              derivationRunId:
                categoryDerivationResult.persistence?.derivationRunId ?? null,
              categoryDerivationResult,
            });
        const bridgeResult = await processActivityValueObjectBridge({
            additionalCategoryLinks: categoryDerivationBridgeAdditionalCategoryLinks,
          supabase,
          eventId: createdEvent.id,
          processorName: "activity_debug_free_text_value_object_test",
          allowNonCompletedEvent: false,
        });
      
        const categoryDerivationWarning =
          categoryDerivationResult.enabled && categoryDerivationResult.ok === false;
      
        const logResult = await safeCreateActivityProcessingLog({
          userId: appUser.id,
          rawSignalId: null,
          activityEventId: createdEvent.id,
          processingRunId,
          processorName: "activity_debug_free_text_value_object_test",
          processingStage: "finalize",
          processingStatus: bridgeResult.ok
            ? categoryDerivationWarning
              ? "warning"
              : bridgeResult.skipped
                ? "skipped"
                : "completed"
            : "warning",
          severity:
            bridgeResult.ok && !categoryDerivationWarning ? "info" : "warning",
          message: "Debug free-text Value Object bridge processed.",
          input: {
            eventId: createdEvent.id,
            inputText,
            durationMinutes: timing.durationMinutes,
            categoryDerivation: {
              enabled: categoryDerivationOptions.enabled,
              dryRun: categoryDerivationOptions.dryRun,
              createPolicy: categoryDerivationOptions.createPolicy,
            },
          },
          output: {
            ok: bridgeResult.ok,
            skipped: bridgeResult.skipped,
            skipReason: bridgeResult.skipReason,
            mappingSkipped: bridgeResult.mappingResult?.skipped ?? null,
            mappingsCount: bridgeResult.mappingResult?.mappings.length ?? 0,
            bridgeCreatedCount: bridgeResult.bridgeResult?.created.length ?? 0,
            errors: bridgeResult.errors,
            categoryDerivation: {
              enabled: categoryDerivationResult.enabled,
              ok: categoryDerivationResult.ok,
              skipped: categoryDerivationResult.skipped,
              error: categoryDerivationResult.error ?? null,
              extractionCandidateCount:
                categoryDerivationResult.extraction?.candidateCount ?? null,
              resolutionCreatedCount:
                categoryDerivationResult.resolution?.createdCount ?? null,
              resolutionReusedCount:
                categoryDerivationResult.resolution?.reusedCount ?? null,
              resolutionUnresolvedCount:
                categoryDerivationResult.resolution?.unresolvedCount ?? null,
              derivationRunId:
                categoryDerivationResult.persistence?.derivationRunId ?? null,
              derivationRowsCreated:
                categoryDerivationResult.persistence?.derivationRowsCreated ?? null,
            },
          },
          metadata: {
            endpoint: "/api/activity/debug/free-text-value-object-test",
            p4Step: "P4.10.0-C8-O1",
          },
          startedAt: processingStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: new Date().getTime() - processingStartedAt.getTime(),
        });
      
        const responseOk =
          bridgeResult.ok &&
          (!categoryDerivationResult.enabled || categoryDerivationResult.ok !== false);
      
        return NextResponse.json({
          ok: responseOk,
          status: bridgeResult.ok
            ? bridgeResult.skipped
              ? "created_but_bridge_skipped"
```

## 20. bridge additionalCategoryLinks call in debug route for comparison

```text
FILE: .\src\app\api\activity\debug\free-text-value-object-test\route.ts
PATTERN: additionalCategoryLinks: categoryDerivationBridgeAdditionalCategoryLinks
MATCH COUNT: 1

----- .\src\app\api\activity\debug\free-text-value-object-test\route.ts:827 | pattern: additionalCategoryLinks: categoryDerivationBridgeAdditionalCategoryLinks -----
        const categoryDerivationResult = await runCategoryDerivationForDebugRoute({
          activityEventId: createdEvent.id,
          inputText,
          title,
          description,
          durationMinutes: timing.durationMinutes,
          personActorId: personActor.id,
          options: categoryDerivationOptions,
        });
      
          const categoryDerivationBridgeAdditionalCategoryLinks =
            buildAdditionalCategoryLinksForBridge({
              categoryDerivationEnabled: categoryDerivationOptions.enabled,
              categoryDerivationDryRun: categoryDerivationOptions.dryRun,
              activityEventId: createdEvent.id,
              derivationRunId:
                categoryDerivationResult.persistence?.derivationRunId ?? null,
              categoryDerivationResult,
            });
        const bridgeResult = await processActivityValueObjectBridge({
  827:       additionalCategoryLinks: categoryDerivationBridgeAdditionalCategoryLinks,
          supabase,
          eventId: createdEvent.id,
          processorName: "activity_debug_free_text_value_object_test",
          allowNonCompletedEvent: false,
        });
      
        const categoryDerivationWarning =
          categoryDerivationResult.enabled && categoryDerivationResult.ok === false;
      
        const logResult = await safeCreateActivityProcessingLog({
          userId: appUser.id,
          rawSignalId: null,
          activityEventId: createdEvent.id,
          processingRunId,
          processorName: "activity_debug_free_text_value_object_test",
          processingStage: "finalize",
          processingStatus: bridgeResult.ok
            ? categoryDerivationWarning
              ? "warning"
              : bridgeResult.skipped
                ? "skipped"
                : "completed"
            : "warning",
          severity:
            bridgeResult.ok && !categoryDerivationWarning ? "info" : "warning",
          message: "Debug free-text Value Object bridge processed.",
          input: {
            eventId: createdEvent.id,
            inputText,
            durationMinutes: timing.durationMinutes,
            categoryDerivation: {
              enabled: categoryDerivationOptions.enabled,
              dryRun: categoryDerivationOptions.dryRun,
              createPolicy: categoryDerivationOptions.createPolicy,
            },
          },
          output: {
            ok: bridgeResult.ok,
            skipped: bridgeResult.skipped,
            skipReason: bridgeResult.skipReason,
            mappingSkipped: bridgeResult.mappingResult?.skipped ?? null,
            mappingsCount: bridgeResult.mappingResult?.mappings.length ?? 0,
            bridgeCreatedCount: bridgeResult.bridgeResult?.created.length ?? 0,
            errors: bridgeResult.errors,
            categoryDerivation: {
              enabled: categoryDerivationResult.enabled,
              ok: categoryDerivationResult.ok,
              skipped: categoryDerivationResult.skipped,
              error: categoryDerivationResult.error ?? null,
              extractionCandidateCount:
                categoryDerivationResult.extraction?.candidateCount ?? null,
              resolutionCreatedCount:
                categoryDerivationResult.resolution?.createdCount ?? null,
              resolutionReusedCount:
                categoryDerivationResult.resolution?.reusedCount ?? null,
              resolutionUnresolvedCount:
                categoryDerivationResult.resolution?.unresolvedCount ?? null,
              derivationRunId:
                categoryDerivationResult.persistence?.derivationRunId ?? null,
              derivationRowsCreated:
```

## 21. Preliminary decision

Production candidate route:

- src/app/api/activity/complete/route.ts

Reason:

- It reads user-owned activity_events.
- It updates event status/timing to completed.
- It sets processing_status.
- It is the natural place where completed Activity Event should be processed into Value Objects.

Do not patch yet until exact bridge call and response/error behavior are reviewed from this map.

## 22. Recommended B7-C patch direction

Likely minimal integration:

1. Import runCategoryDerivationForRoute and helper types needed by complete route.
2. After updatedEvent is available and before processActivityValueObjectBridge, run Category Derivation only if:
   - updatedEvent.status === completedStatus
   - updatedEvent.source === manual_chat or compatible manual source
   - input_text/title/description exists
3. Use server-side options:
   - enabled: true only inside this narrow route policy
   - dryRun: false
   - createPolicy: suggested_only
4. Convert resolved candidates to additionalCategoryLinks.
5. Pass additionalCategoryLinks into processActivityValueObjectBridge.
6. If Category Derivation fails, keep old bridge stable and record the derivation error/warning.
7. Do not expose the full derivation payload unless debug mode is explicitly requested.

## 23. Next step

Proceed to P4.10.0-C8-P3-B7-C:

- patch production complete route with narrow Category Derivation policy
- add route smoke check
- add browser-authenticated complete-flow test
