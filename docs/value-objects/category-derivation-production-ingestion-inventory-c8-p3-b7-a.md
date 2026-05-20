# P4.10.0-C8-P3-B7-A — Production Activity Ingestion Inventory

Date: 2026-05-20
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / production ingestion preparation

Purpose: identify the normal production activity creation flow before enabling Category Derivation outside the debug route.

## 1. Git status

```text
?? docs/value-objects/category-derivation-production-ingestion-inventory-c8-p3-b7-a.md
```

## 2. Recent commits

```text
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
b0c4003 Map exact contextual categories schema and resolver create path
```

## 3. Current verified baseline

- P4.10.0-C8-P3-B6 is complete.
- Debug route browser suite passed all cases.
- Category Derivation can resolve 5 candidates under personal_activity context.
- Value Object Bridge receives additionalCategoryLinks.
- Bridge creates additionalValueObjectCategoryLinks.
- additionalValueObjectCategoryLinkErrors remains empty.

## 4. Activity debug route references

```text
Pattern: free-text-value-object-test

src/app/api/activity/debug/free-text-value-object-test/route.ts-512-      ]),
src/app/api/activity/debug/free-text-value-object-test/route.ts-513-      categoryType: readStringField(candidate, ["categoryType", "category_type"]),
src/app/api/activity/debug/free-text-value-object-test/route.ts-514-      resolutionStatus,
src/app/api/activity/debug/free-text-value-object-test/route.ts-515-      metadata: {
src/app/api/activity/debug/free-text-value-object-test/route.ts-516-        sourceLayer: "category_derivation",
src/app/api/activity/debug/free-text-value-object-test/route.ts:517:        sourceRoute: "/api/activity/debug/free-text-value-object-test",
src/app/api/activity/debug/free-text-value-object-test/route.ts-518-        p4Step: "P4.10.0-C8-P3-B5-B3",
src/app/api/activity/debug/free-text-value-object-test/route.ts-519-      },
src/app/api/activity/debug/free-text-value-object-test/route.ts-520-    });
src/app/api/activity/debug/free-text-value-object-test/route.ts-521-  }
src/app/api/activity/debug/free-text-value-object-test/route.ts-522-
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-552-      durationMinutes: params.durationMinutes,
src/app/api/activity/debug/free-text-value-object-test/route.ts-553-      inputLanguage: null,
src/app/api/activity/debug/free-text-value-object-test/route.ts-554-      actorId: params.personActorId,
src/app/api/activity/debug/free-text-value-object-test/route.ts-555-      organizationId: null,
src/app/api/activity/debug/free-text-value-object-test/route.ts-556-      metadata: {
src/app/api/activity/debug/free-text-value-object-test/route.ts:557:        endpoint: "/api/activity/debug/free-text-value-object-test",
src/app/api/activity/debug/free-text-value-object-test/route.ts-558-        p4Step: "P4.10.0-C8-O1",
src/app/api/activity/debug/free-text-value-object-test/route.ts-559-        featureFlag: "categoryDerivation",
src/app/api/activity/debug/free-text-value-object-test/route.ts-560-      },
src/app/api/activity/debug/free-text-value-object-test/route.ts-561-    };
src/app/api/activity/debug/free-text-value-object-test/route.ts-562-
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-644-}
src/app/api/activity/debug/free-text-value-object-test/route.ts-645-
src/app/api/activity/debug/free-text-value-object-test/route.ts-646-export async function GET() {
src/app/api/activity/debug/free-text-value-object-test/route.ts-647-  return NextResponse.json({
src/app/api/activity/debug/free-text-value-object-test/route.ts-648-    ok: true,
src/app/api/activity/debug/free-text-value-object-test/route.ts:649:    endpoint: "/api/activity/debug/free-text-value-object-test",
src/app/api/activity/debug/free-text-value-object-test/route.ts-650-    enabled: ACTIVITY_RECORDING_ENABLED,
src/app/api/activity/debug/free-text-value-object-test/route.ts-651-    status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
src/app/api/activity/debug/free-text-value-object-test/route.ts-652-    message: ACTIVITY_RECORDING_ENABLED
src/app/api/activity/debug/free-text-value-object-test/route.ts-653-      ? "Debug-only endpoint for testing completed free-text Activity Event -> Value Object fallback mapping."
src/app/api/activity/debug/free-text-value-object-test/route.ts-654-      : ACTIVITY_RECORDING_DISABLED_MESSAGE,
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-887-        derivationRowsCreated:
src/app/api/activity/debug/free-text-value-object-test/route.ts-888-          categoryDerivationResult.persistence?.derivationRowsCreated ?? null,
src/app/api/activity/debug/free-text-value-object-test/route.ts-889-      },
src/app/api/activity/debug/free-text-value-object-test/route.ts-890-    },
src/app/api/activity/debug/free-text-value-object-test/route.ts-891-    metadata: {
src/app/api/activity/debug/free-text-value-object-test/route.ts:892:      endpoint: "/api/activity/debug/free-text-value-object-test",
src/app/api/activity/debug/free-text-value-object-test/route.ts-893-      p4Step: "P4.10.0-C8-O1",
src/app/api/activity/debug/free-text-value-object-test/route.ts-894-    },
src/app/api/activity/debug/free-text-value-object-test/route.ts-895-    startedAt: processingStartedAt.toISOString(),
src/app/api/activity/debug/free-text-value-object-test/route.ts-896-    finishedAt: new Date().toISOString(),
src/app/api/activity/debug/free-text-value-object-test/route.ts-897-    durationMs: new Date().getTime() - processingStartedAt.getTime(),
```

## 5. Activity event insert references

```text
Pattern: activity_events

lib/activity/rubricatorValueObjectMapper.ts-313-function isApprovedActivityEventClassification(row: GenericRow): boolean {
lib/activity/rubricatorValueObjectMapper.ts-314-  const entityType = getString(row, "entity_type");
lib/activity/rubricatorValueObjectMapper.ts-315-  const status = getString(row, "status");
lib/activity/rubricatorValueObjectMapper.ts-316-
lib/activity/rubricatorValueObjectMapper.ts-317-  return (
lib/activity/rubricatorValueObjectMapper.ts:318:    (entityType === "activity_event" || entityType === "activity_events") &&
lib/activity/rubricatorValueObjectMapper.ts-319-    status === "approved"
lib/activity/rubricatorValueObjectMapper.ts-320-  );
lib/activity/rubricatorValueObjectMapper.ts-321-}
lib/activity/rubricatorValueObjectMapper.ts-322-
lib/activity/rubricatorValueObjectMapper.ts-323-async function readActivityEvent(
--
lib/activity/rubricatorValueObjectMapper.ts-326-): Promise<{
lib/activity/rubricatorValueObjectMapper.ts-327-  event: ActivityEventForRubricatorMapping | null;
lib/activity/rubricatorValueObjectMapper.ts-328-  errorMessage: string | null;
lib/activity/rubricatorValueObjectMapper.ts-329-}> {
lib/activity/rubricatorValueObjectMapper.ts-330-  const { data, error } = await supabase
lib/activity/rubricatorValueObjectMapper.ts:331:    .from("activity_events")
lib/activity/rubricatorValueObjectMapper.ts-332-    .select(
lib/activity/rubricatorValueObjectMapper.ts-333-      [
lib/activity/rubricatorValueObjectMapper.ts-334-        "id",
lib/activity/rubricatorValueObjectMapper.ts-335-        "user_id",
lib/activity/rubricatorValueObjectMapper.ts-336-        "status",
--
lib/activity/valueObjectBridge.ts-449-): Promise<{
lib/activity/valueObjectBridge.ts-450-  event: ActivityEventForValueObjectBridge | null;
lib/activity/valueObjectBridge.ts-451-  errorMessage: string | null;
lib/activity/valueObjectBridge.ts-452-}> {
lib/activity/valueObjectBridge.ts-453-  const { data, error } = await supabase
lib/activity/valueObjectBridge.ts:454:    .from("activity_events")
lib/activity/valueObjectBridge.ts-455-    .select(
lib/activity/valueObjectBridge.ts-456-      [
lib/activity/valueObjectBridge.ts-457-        "id",
lib/activity/valueObjectBridge.ts-458-        "user_id",
lib/activity/valueObjectBridge.ts-459-        "status",
--
src/app/api/activity/complete/route.ts-290-      { status: 400 }
src/app/api/activity/complete/route.ts-291-    );
src/app/api/activity/complete/route.ts-292-  }
src/app/api/activity/complete/route.ts-293-
src/app/api/activity/complete/route.ts-294-  const { data: eventData, error: eventError } = await supabase
src/app/api/activity/complete/route.ts:295:    .from("activity_events")
src/app/api/activity/complete/route.ts-296-    .select("*")
src/app/api/activity/complete/route.ts-297-    .eq("id", eventId)
src/app/api/activity/complete/route.ts-298-    .eq("user_id", appUser.id)
src/app/api/activity/complete/route.ts-299-    .maybeSingle();
src/app/api/activity/complete/route.ts-300-
--
src/app/api/activity/complete/route.ts-482-    finishedAt: new Date().toISOString(),
src/app/api/activity/complete/route.ts-483-    durationMs: getDurationMs(processingStartedAt),
src/app/api/activity/complete/route.ts-484-  });
src/app/api/activity/complete/route.ts-485-
src/app/api/activity/complete/route.ts-486-  const { data: updatedEventData, error: updateError } = await supabase
src/app/api/activity/complete/route.ts:487:    .from("activity_events")
src/app/api/activity/complete/route.ts-488-    .update({
src/app/api/activity/complete/route.ts-489-      ended_at: timing.endedAt,
src/app/api/activity/complete/route.ts-490-      duration_minutes: timing.durationMinutes,
src/app/api/activity/complete/route.ts-491-      status: completedStatus,
src/app/api/activity/complete/route.ts-492-      processing_status: "processed",
--
src/app/api/activity/complete/route.ts-903-      finishedAt: new Date().toISOString(),
src/app/api/activity/complete/route.ts-904-      durationMs: getDurationMs(processingStartedAt),
src/app/api/activity/complete/route.ts-905-    });
src/app/api/activity/complete/route.ts-906-
src/app/api/activity/complete/route.ts-907-    await supabase
src/app/api/activity/complete/route.ts:908:      .from("activity_events")
src/app/api/activity/complete/route.ts-909-      .update({
src/app/api/activity/complete/route.ts-910-        processing_status: "failed",
src/app/api/activity/complete/route.ts-911-        updated_at: new Date().toISOString(),
src/app/api/activity/complete/route.ts-912-      })
src/app/api/activity/complete/route.ts-913-      .eq("id", updatedEvent.id)
--
src/app/api/activity/day-summary/route.ts-498-  const date = resolveDate(url.searchParams, timezone);
src/app/api/activity/day-summary/route.ts-499-  const limit = parseLimit(url.searchParams);
src/app/api/activity/day-summary/route.ts-500-  const dayRange = buildLocalDayRange(date, timezone);
src/app/api/activity/day-summary/route.ts-501-
src/app/api/activity/day-summary/route.ts-502-  const { data: rawEvents, error: eventsError } = await supabase
src/app/api/activity/day-summary/route.ts:503:    .from("activity_events")
src/app/api/activity/day-summary/route.ts-504-    .select("*")
src/app/api/activity/day-summary/route.ts-505-    .eq("user_id", appUser.id)
src/app/api/activity/day-summary/route.ts-506-    .or(`started_at.gte.${dayRange.from},created_at.gte.${dayRange.from}`)
src/app/api/activity/day-summary/route.ts-507-    .order("created_at", { ascending: false })
src/app/api/activity/day-summary/route.ts-508-    .limit(500);
--
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-113-async function assertEventOwnership(
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-114-  eventId: string,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-115-  userId: string
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-116-): Promise<EventOwnershipResult> {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-117-  const { data, error } = await supabase
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts:118:    .from("activity_events")
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-119-    .select("id, user_id")
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-120-    .eq("id", eventId)
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-121-    .eq("user_id", userId)
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-122-    .maybeSingle();
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-123-
--
src/app/api/activity/debug-trace/route.ts-395-  let eventLinks: GenericRow[] = [];
src/app/api/activity/debug-trace/route.ts-396-
src/app/api/activity/debug-trace/route.ts-397-  activityEvents = mergeRows(
src/app/api/activity/debug-trace/route.ts-398-    activityEvents,
src/app/api/activity/debug-trace/route.ts-399-    await fetchUserOwnedByIds({
src/app/api/activity/debug-trace/route.ts:400:      table: "activity_events",
src/app/api/activity/debug-trace/route.ts-401-      userId,
src/app/api/activity/debug-trace/route.ts-402-      column: "id",
src/app/api/activity/debug-trace/route.ts-403-      values: Array.from(eventIds),
src/app/api/activity/debug-trace/route.ts-404-      limit,
src/app/api/activity/debug-trace/route.ts-405-      orderBy: "created_at",
--
src/app/api/activity/debug-trace/route.ts-551-  });
src/app/api/activity/debug-trace/route.ts-552-
src/app/api/activity/debug-trace/route.ts-553-  activityEvents = mergeRows(
src/app/api/activity/debug-trace/route.ts-554-    activityEvents,
src/app/api/activity/debug-trace/route.ts-555-    await fetchUserOwnedByIds({
src/app/api/activity/debug-trace/route.ts:556:      table: "activity_events",
src/app/api/activity/debug-trace/route.ts-557-      userId,
src/app/api/activity/debug-trace/route.ts-558-      column: "id",
src/app/api/activity/debug-trace/route.ts-559-      values: Array.from(eventIds),
src/app/api/activity/debug-trace/route.ts-560-      limit,
src/app/api/activity/debug-trace/route.ts-561-      orderBy: "created_at",
--
src/app/api/activity/debug-trace/route.ts-1183-    const status =
src/app/api/activity/debug-trace/route.ts-1184-      getStringField(row, "processing_status") ?? getStringField(row, "status");
src/app/api/activity/debug-trace/route.ts-1185-
src/app/api/activity/debug-trace/route.ts-1186-    if (isProblemStatus(status)) {
src/app/api/activity/debug-trace/route.ts-1187-      problems.push({
src/app/api/activity/debug-trace/route.ts:1188:        sourceTable: "activity_events",
src/app/api/activity/debug-trace/route.ts-1189-        sourceId: getId(row),
src/app/api/activity/debug-trace/route.ts-1190-        severity: inferSeverity(status),
src/app/api/activity/debug-trace/route.ts-1191-        status,
src/app/api/activity/debug-trace/route.ts-1192-        stage: null,
src/app/api/activity/debug-trace/route.ts-1193-        message:
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-756-  const nowIso = new Date().toISOString();
src/app/api/activity/debug/free-text-value-object-test/route.ts-757-  const title = asString(body.title) ?? "Free-text activity test";
src/app/api/activity/debug/free-text-value-object-test/route.ts-758-  const description = asString(body.description);
src/app/api/activity/debug/free-text-value-object-test/route.ts-759-
src/app/api/activity/debug/free-text-value-object-test/route.ts-760-  const { data: createdEventData, error: createError } = await supabase
src/app/api/activity/debug/free-text-value-object-test/route.ts:761:    .from("activity_events")
src/app/api/activity/debug/free-text-value-object-test/route.ts-762-    .insert({
src/app/api/activity/debug/free-text-value-object-test/route.ts-763-      user_id: appUser.id,
src/app/api/activity/debug/free-text-value-object-test/route.ts-764-      performed_by_actor_id: personActor.id,
src/app/api/activity/debug/free-text-value-object-test/route.ts-765-      acting_as_actor_id: personActor.id,
src/app/api/activity/debug/free-text-value-object-test/route.ts-766-      acting_for_actor_id: null,
--
src/app/api/activity/events/[id]/corrections/route.ts-161-  userId: string;
src/app/api/activity/events/[id]/corrections/route.ts-162-}) {
src/app/api/activity/events/[id]/corrections/route.ts-163-  const { eventId, userId } = params;
src/app/api/activity/events/[id]/corrections/route.ts-164-
src/app/api/activity/events/[id]/corrections/route.ts-165-  const { data, error } = await supabase
src/app/api/activity/events/[id]/corrections/route.ts:166:    .from("activity_events")
src/app/api/activity/events/[id]/corrections/route.ts-167-    .select("id,user_id")
src/app/api/activity/events/[id]/corrections/route.ts-168-    .eq("id", eventId)
src/app/api/activity/events/[id]/corrections/route.ts-169-    .eq("user_id", userId)
src/app/api/activity/events/[id]/corrections/route.ts-170-    .maybeSingle();
src/app/api/activity/events/[id]/corrections/route.ts-171-
--
src/app/api/activity/events/[id]/route.ts-504-  };
src/app/api/activity/events/[id]/route.ts-505-}) {
src/app/api/activity/events/[id]/route.ts-506-  const { userId, eventId, searchRange } = params;
src/app/api/activity/events/[id]/route.ts-507-
src/app/api/activity/events/[id]/route.ts-508-  const { data, error } = await supabase
src/app/api/activity/events/[id]/route.ts:509:    .from("activity_events")
src/app/api/activity/events/[id]/route.ts-510-    .select("*")
src/app/api/activity/events/[id]/route.ts-511-    .eq("user_id", userId)
src/app/api/activity/events/[id]/route.ts-512-    .neq("id", eventId)
src/app/api/activity/events/[id]/route.ts-513-    .not("started_at", "is", null)
src/app/api/activity/events/[id]/route.ts-514-    .gte("started_at", searchRange.from)
--
src/app/api/activity/events/[id]/route.ts-800-
src/app/api/activity/events/[id]/route.ts-801-async function getActivityEvent(params: { eventId: string; userId: string }) {
src/app/api/activity/events/[id]/route.ts-802-  const { eventId, userId } = params;
src/app/api/activity/events/[id]/route.ts-803-
src/app/api/activity/events/[id]/route.ts-804-  const { data, error } = await supabase
src/app/api/activity/events/[id]/route.ts:805:    .from("activity_events")
src/app/api/activity/events/[id]/route.ts-806-    .select("*")
src/app/api/activity/events/[id]/route.ts-807-    .eq("id", eventId)
src/app/api/activity/events/[id]/route.ts-808-    .eq("user_id", userId)
src/app/api/activity/events/[id]/route.ts-809-    .maybeSingle();
src/app/api/activity/events/[id]/route.ts-810-
--
src/app/api/activity/events/[id]/route.ts-936-
src/app/api/activity/events/[id]/route.ts-937-  const nowIso = new Date().toISOString();
src/app/api/activity/events/[id]/route.ts-938-  const existingMetadata = asRecord(event.metadata_json);
src/app/api/activity/events/[id]/route.ts-939-
src/app/api/activity/events/[id]/route.ts-940-  const { data, error } = await supabase
src/app/api/activity/events/[id]/route.ts:941:    .from("activity_events")
src/app/api/activity/events/[id]/route.ts-942-    .update({
src/app/api/activity/events/[id]/route.ts-943-      metadata_json: {
src/app/api/activity/events/[id]/route.ts-944-        ...existingMetadata,
src/app/api/activity/events/[id]/route.ts-945-        correction_audit_failed: true,
src/app/api/activity/events/[id]/route.ts-946-        correction_audit_failed_at: nowIso,
--
src/app/api/activity/events/[id]/route.ts-1264-      finishedAt: new Date().toISOString(),
src/app/api/activity/events/[id]/route.ts-1265-      durationMs: getDurationMs(rollbackProcessingStartedAt),
src/app/api/activity/events/[id]/route.ts-1266-    });
src/app/api/activity/events/[id]/route.ts-1267-
src/app/api/activity/events/[id]/route.ts-1268-    const { data: updatedEventData, error: updateError } = await supabase
src/app/api/activity/events/[id]/route.ts:1269:      .from("activity_events")
src/app/api/activity/events/[id]/route.ts-1270-      .update({
src/app/api/activity/events/[id]/route.ts-1271-        status: requestedStatus,
src/app/api/activity/events/[id]/route.ts-1272-        description: patchedComment,
src/app/api/activity/events/[id]/route.ts-1273-        processing_status: "processed",
src/app/api/activity/events/[id]/route.ts-1274-        metadata_json: {
--
src/app/api/activity/events/[id]/route.ts-1423-        finishedAt: new Date().toISOString(),
src/app/api/activity/events/[id]/route.ts-1424-        durationMs: getDurationMs(rollbackProcessingStartedAt),
src/app/api/activity/events/[id]/route.ts-1425-      });
src/app/api/activity/events/[id]/route.ts-1426-
src/app/api/activity/events/[id]/route.ts-1427-      await supabase
src/app/api/activity/events/[id]/route.ts:1428:        .from("activity_events")
src/app/api/activity/events/[id]/route.ts-1429-        .update({
src/app/api/activity/events/[id]/route.ts-1430-          processing_status: "failed",
src/app/api/activity/events/[id]/route.ts-1431-          updated_at: new Date().toISOString(),
src/app/api/activity/events/[id]/route.ts-1432-        })
src/app/api/activity/events/[id]/route.ts-1433-        .eq("id", updatedEvent.id)
--
src/app/api/activity/events/[id]/route.ts-1860-    finishedAt: new Date().toISOString(),
src/app/api/activity/events/[id]/route.ts-1861-    durationMs: getDurationMs(correctionProcessingStartedAt),
src/app/api/activity/events/[id]/route.ts-1862-  });
src/app/api/activity/events/[id]/route.ts-1863-
src/app/api/activity/events/[id]/route.ts-1864-  const { data: updatedEventData, error: updateError } = await supabase
src/app/api/activity/events/[id]/route.ts:1865:    .from("activity_events")
src/app/api/activity/events/[id]/route.ts-1866-    .update({
src/app/api/activity/events/[id]/route.ts-1867-      started_at: timing.startedAt,
src/app/api/activity/events/[id]/route.ts-1868-      ended_at: timing.endedAt,
src/app/api/activity/events/[id]/route.ts-1869-      duration_minutes: timing.durationMinutes,
src/app/api/activity/events/[id]/route.ts-1870-      description: patchedComment,
--
src/app/api/activity/events/[id]/route.ts-2037-        finishedAt: new Date().toISOString(),
src/app/api/activity/events/[id]/route.ts-2038-        durationMs: getDurationMs(correctionProcessingStartedAt),
src/app/api/activity/events/[id]/route.ts-2039-      });
src/app/api/activity/events/[id]/route.ts-2040-
src/app/api/activity/events/[id]/route.ts-2041-      await supabase
src/app/api/activity/events/[id]/route.ts:2042:        .from("activity_events")
src/app/api/activity/events/[id]/route.ts-2043-        .update({
src/app/api/activity/events/[id]/route.ts-2044-          processing_status: "failed",
src/app/api/activity/events/[id]/route.ts-2045-          updated_at: new Date().toISOString(),
src/app/api/activity/events/[id]/route.ts-2046-        })
src/app/api/activity/events/[id]/route.ts-2047-        .eq("id", updatedEvent.id)
--
src/app/api/activity/events/route.ts-289-  const includeDetails = parseBooleanFlag(url.searchParams, "includeDetails");
src/app/api/activity/events/route.ts-290-
src/app/api/activity/events/route.ts-291-  const mode = includeDetails ? "details" : "summary";
src/app/api/activity/events/route.ts-292-
src/app/api/activity/events/route.ts-293-  let eventsQuery = supabase
src/app/api/activity/events/route.ts:294:    .from("activity_events")
src/app/api/activity/events/route.ts-295-    .select("*")
src/app/api/activity/events/route.ts-296-    .eq("user_id", appUser.id);
src/app/api/activity/events/route.ts-297-
src/app/api/activity/events/route.ts-298-  if (status) {
src/app/api/activity/events/route.ts-299-    eventsQuery = eventsQuery.eq("status", status);
--
src/app/api/activity/intake/events/[id]/confirm/route.ts-281-
src/app/api/activity/intake/events/[id]/confirm/route.ts-282-async function getActivityEvent(params: { eventId: string; userId: string }) {
src/app/api/activity/intake/events/[id]/confirm/route.ts-283-  const { eventId, userId } = params;
src/app/api/activity/intake/events/[id]/confirm/route.ts-284-
src/app/api/activity/intake/events/[id]/confirm/route.ts-285-  const { data, error } = await supabase
src/app/api/activity/intake/events/[id]/confirm/route.ts:286:    .from("activity_events")
src/app/api/activity/intake/events/[id]/confirm/route.ts-287-    .select("*")
src/app/api/activity/intake/events/[id]/confirm/route.ts-288-    .eq("id", eventId)
```

## 6. Activity API route handlers

```text
Pattern: export async function POST

src/app/api/activities/route.ts-146-    ok: true,
src/app/api/activities/route.ts-147-    activities,
src/app/api/activities/route.ts-148-  });
src/app/api/activities/route.ts-149-}
src/app/api/activities/route.ts-150-
src/app/api/activities/route.ts:151:export async function POST(request: Request) {
src/app/api/activities/route.ts-152-  const { appUser, personActor, errorResponse } = await getCurrentUserContext();
src/app/api/activities/route.ts-153-
src/app/api/activities/route.ts-154-  if (errorResponse) {
src/app/api/activities/route.ts-155-    return errorResponse;
src/app/api/activities/route.ts-156-  }
--
src/app/api/activity/complete/route.ts-236-      comment: "Completed lifecycle smoke test with fixed duration",
src/app/api/activity/complete/route.ts-237-    },
src/app/api/activity/complete/route.ts-238-  });
src/app/api/activity/complete/route.ts-239-}
src/app/api/activity/complete/route.ts-240-
src/app/api/activity/complete/route.ts:241:export async function POST(request: Request) {
src/app/api/activity/complete/route.ts-242-  if (!ACTIVITY_RECORDING_ENABLED) {
src/app/api/activity/complete/route.ts-243-    return NextResponse.json(
src/app/api/activity/complete/route.ts-244-      {
src/app/api/activity/complete/route.ts-245-        ok: false,
src/app/api/activity/complete/route.ts-246-        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
--
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-152-  return {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-153-    ok: true,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-154-  };
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-155-}
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-156-
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts:157:export async function POST(request: NextRequest) {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-158-  const currentUser = await getCurrentAppUser();
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-159-
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-160-  if (!currentUser.ok) {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-161-    return currentUser.errorResponse;
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-162-  }
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-673-      categoryDerivationDryRun: false,
src/app/api/activity/debug/free-text-value-object-test/route.ts-674-    },
src/app/api/activity/debug/free-text-value-object-test/route.ts-675-  });
src/app/api/activity/debug/free-text-value-object-test/route.ts-676-}
src/app/api/activity/debug/free-text-value-object-test/route.ts-677-
src/app/api/activity/debug/free-text-value-object-test/route.ts:678:export async function POST(request: Request) {
src/app/api/activity/debug/free-text-value-object-test/route.ts-679-  if (!ACTIVITY_RECORDING_ENABLED) {
src/app/api/activity/debug/free-text-value-object-test/route.ts-680-    return NextResponse.json(
src/app/api/activity/debug/free-text-value-object-test/route.ts-681-      {
src/app/api/activity/debug/free-text-value-object-test/route.ts-682-        ok: false,
src/app/api/activity/debug/free-text-value-object-test/route.ts-683-        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
--
src/app/api/activity/intake/events/[id]/confirm/route.ts-323-      reviewNote: "Confirmed imported pending activity",
src/app/api/activity/intake/events/[id]/confirm/route.ts-324-    },
src/app/api/activity/intake/events/[id]/confirm/route.ts-325-  });
src/app/api/activity/intake/events/[id]/confirm/route.ts-326-}
src/app/api/activity/intake/events/[id]/confirm/route.ts-327-
src/app/api/activity/intake/events/[id]/confirm/route.ts:328:export async function POST(request: Request, context: RouteContext) {
src/app/api/activity/intake/events/[id]/confirm/route.ts-329-  if (!ACTIVITY_RECORDING_ENABLED) {
src/app/api/activity/intake/events/[id]/confirm/route.ts-330-    return NextResponse.json(
src/app/api/activity/intake/events/[id]/confirm/route.ts-331-      {
src/app/api/activity/intake/events/[id]/confirm/route.ts-332-        ok: false,
src/app/api/activity/intake/events/[id]/confirm/route.ts-333-        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
--
src/app/api/activity/intake/events/[id]/reject/route.ts-192-      note: "Imported event was reviewed and rejected before confirmation.",
src/app/api/activity/intake/events/[id]/reject/route.ts-193-    },
src/app/api/activity/intake/events/[id]/reject/route.ts-194-  });
src/app/api/activity/intake/events/[id]/reject/route.ts-195-}
src/app/api/activity/intake/events/[id]/reject/route.ts-196-
src/app/api/activity/intake/events/[id]/reject/route.ts:197:export async function POST(
src/app/api/activity/intake/events/[id]/reject/route.ts-198-  request: Request,
src/app/api/activity/intake/events/[id]/reject/route.ts-199-  context: { params: Promise<{ id: string }> }
src/app/api/activity/intake/events/[id]/reject/route.ts-200-) {
src/app/api/activity/intake/events/[id]/reject/route.ts-201-  if (!ACTIVITY_RECORDING_ENABLED) {
src/app/api/activity/intake/events/[id]/reject/route.ts-202-    return NextResponse.json(
--
src/app/api/activity/intake/route.ts-269-    note:
src/app/api/activity/intake/route.ts-270-      "P4.2.7 stores raw_activity_signals only. Imported or external signals should be reviewed before becoming completed activities.",
src/app/api/activity/intake/route.ts-271-  });
src/app/api/activity/intake/route.ts-272-}
src/app/api/activity/intake/route.ts-273-
src/app/api/activity/intake/route.ts:274:export async function POST(request: Request) {
src/app/api/activity/intake/route.ts-275-  if (!ACTIVITY_RECORDING_ENABLED) {
src/app/api/activity/intake/route.ts-276-    return NextResponse.json(
src/app/api/activity/intake/route.ts-277-      {
src/app/api/activity/intake/route.ts-278-        ok: false,
src/app/api/activity/intake/route.ts-279-        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
--
src/app/api/activity/intake/signals/[id]/ignore/route.ts-155-      },
src/app/api/activity/intake/signals/[id]/ignore/route.ts-156-    },
src/app/api/activity/intake/signals/[id]/ignore/route.ts-157-  });
src/app/api/activity/intake/signals/[id]/ignore/route.ts-158-}
src/app/api/activity/intake/signals/[id]/ignore/route.ts-159-
src/app/api/activity/intake/signals/[id]/ignore/route.ts:160:export async function POST(
src/app/api/activity/intake/signals/[id]/ignore/route.ts-161-  request: Request,
src/app/api/activity/intake/signals/[id]/ignore/route.ts-162-  context: { params: Promise<{ id: string }> }
src/app/api/activity/intake/signals/[id]/ignore/route.ts-163-) {
src/app/api/activity/intake/signals/[id]/ignore/route.ts-164-  if (!ACTIVITY_RECORDING_ENABLED) {
src/app/api/activity/intake/signals/[id]/ignore/route.ts-165-    return NextResponse.json(
--
src/app/api/activity/intake/signals/[id]/promote/route.ts-450-      activityTypeId: "optional-explicit-activity-type-id",
src/app/api/activity/intake/signals/[id]/promote/route.ts-451-    },
src/app/api/activity/intake/signals/[id]/promote/route.ts-452-  });
src/app/api/activity/intake/signals/[id]/promote/route.ts-453-}
src/app/api/activity/intake/signals/[id]/promote/route.ts-454-
src/app/api/activity/intake/signals/[id]/promote/route.ts:455:export async function POST(request: Request, context: RouteContext) {
src/app/api/activity/intake/signals/[id]/promote/route.ts-456-  if (!ACTIVITY_RECORDING_ENABLED) {
src/app/api/activity/intake/signals/[id]/promote/route.ts-457-    return NextResponse.json(
src/app/api/activity/intake/signals/[id]/promote/route.ts-458-      {
src/app/api/activity/intake/signals/[id]/promote/route.ts-459-        ok: false,
src/app/api/activity/intake/signals/[id]/promote/route.ts-460-        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
--
src/app/api/activity/record/route.ts-672-    note:
src/app/api/activity/record/route.ts-673-      "Legacy numeric codes are supported only as optional shortcuts, not as the primary UX model.",
src/app/api/activity/record/route.ts-674-  });
src/app/api/activity/record/route.ts-675-}
src/app/api/activity/record/route.ts-676-
src/app/api/activity/record/route.ts:677:export async function POST(request: Request) {
src/app/api/activity/record/route.ts-678-  if (!ACTIVITY_RECORDING_ENABLED) {
src/app/api/activity/record/route.ts-679-    return NextResponse.json(
src/app/api/activity/record/route.ts-680-      {
src/app/api/activity/record/route.ts-681-        ok: false,
src/app/api/activity/record/route.ts-682-        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
--
src/app/api/activity/start/route.ts-440-      sourceType: "manual_form",
src/app/api/activity/start/route.ts-441-    },
src/app/api/activity/start/route.ts-442-  });
src/app/api/activity/start/route.ts-443-}
src/app/api/activity/start/route.ts-444-
src/app/api/activity/start/route.ts:445:export async function POST(request: Request) {
src/app/api/activity/start/route.ts-446-  if (!ACTIVITY_RECORDING_ENABLED) {
src/app/api/activity/start/route.ts-447-    return NextResponse.json(
src/app/api/activity/start/route.ts-448-      {
src/app/api/activity/start/route.ts-449-        ok: false,
src/app/api/activity/start/route.ts-450-        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
--
src/app/api/availability-rules/route.ts-132-    ok: true,
src/app/api/availability-rules/route.ts-133-    availabilityRules,
src/app/api/availability-rules/route.ts-134-  });
src/app/api/availability-rules/route.ts-135-}
src/app/api/availability-rules/route.ts-136-
src/app/api/availability-rules/route.ts:137:export async function POST(request: Request) {
src/app/api/availability-rules/route.ts-138-  const { personActor, errorResponse } = await getCurrentUserContext();
src/app/api/availability-rules/route.ts-139-
src/app/api/availability-rules/route.ts-140-  if (errorResponse) {
src/app/api/availability-rules/route.ts-141-    return errorResponse;
src/app/api/availability-rules/route.ts-142-  }
--
src/app/api/bookings/[id]/cancel/route.ts-84-    personActor,
src/app/api/bookings/[id]/cancel/route.ts-85-    errorResponse: null,
src/app/api/bookings/[id]/cancel/route.ts-86-  };
src/app/api/bookings/[id]/cancel/route.ts-87-}
src/app/api/bookings/[id]/cancel/route.ts-88-
src/app/api/bookings/[id]/cancel/route.ts:89:export async function POST(request: Request, context: RouteContext) {
src/app/api/bookings/[id]/cancel/route.ts-90-  const { personActor, errorResponse } = await getCurrentUserContext();
src/app/api/bookings/[id]/cancel/route.ts-91-
src/app/api/bookings/[id]/cancel/route.ts-92-  if (errorResponse) {
src/app/api/bookings/[id]/cancel/route.ts-93-    return errorResponse;
src/app/api/bookings/[id]/cancel/route.ts-94-  }
--
src/app/api/bookings/[id]/complete/route.ts-84-    personActor,
src/app/api/bookings/[id]/complete/route.ts-85-    errorResponse: null,
src/app/api/bookings/[id]/complete/route.ts-86-  };
src/app/api/bookings/[id]/complete/route.ts-87-}
src/app/api/bookings/[id]/complete/route.ts-88-
src/app/api/bookings/[id]/complete/route.ts:89:export async function POST(request: Request, context: RouteContext) {
src/app/api/bookings/[id]/complete/route.ts-90-  const { personActor, errorResponse } = await getCurrentUserContext();
src/app/api/bookings/[id]/complete/route.ts-91-
src/app/api/bookings/[id]/complete/route.ts-92-  if (errorResponse) {
src/app/api/bookings/[id]/complete/route.ts-93-    return errorResponse;
src/app/api/bookings/[id]/complete/route.ts-94-  }
--
src/app/api/bookings/[id]/confirm/route.ts-84-    personActor,
src/app/api/bookings/[id]/confirm/route.ts-85-    errorResponse: null,
src/app/api/bookings/[id]/confirm/route.ts-86-  };
src/app/api/bookings/[id]/confirm/route.ts-87-}
src/app/api/bookings/[id]/confirm/route.ts-88-
src/app/api/bookings/[id]/confirm/route.ts:89:export async function POST(request: Request, context: RouteContext) {
src/app/api/bookings/[id]/confirm/route.ts-90-  const { personActor, errorResponse } = await getCurrentUserContext();
src/app/api/bookings/[id]/confirm/route.ts-91-
src/app/api/bookings/[id]/confirm/route.ts-92-  if (errorResponse) {
src/app/api/bookings/[id]/confirm/route.ts-93-    return errorResponse;
src/app/api/bookings/[id]/confirm/route.ts-94-  }
--
src/app/api/bookings/route.ts-184-    ok: true,
src/app/api/bookings/route.ts-185-    bookings,
src/app/api/bookings/route.ts-186-  });
src/app/api/bookings/route.ts-187-}
src/app/api/bookings/route.ts-188-
src/app/api/bookings/route.ts:189:export async function POST(request: Request) {
src/app/api/bookings/route.ts-190-  const { appUser, personActor, errorResponse } = await getCurrentUserContext();
src/app/api/bookings/route.ts-191-
src/app/api/bookings/route.ts-192-  if (errorResponse) {
src/app/api/bookings/route.ts-193-    return errorResponse;
src/app/api/bookings/route.ts-194-  }
--
src/app/api/calendar/events/route.ts-128-    ok: true,
src/app/api/calendar/events/route.ts-129-    calendarEvents,
src/app/api/calendar/events/route.ts-130-  });
src/app/api/calendar/events/route.ts-131-}
src/app/api/calendar/events/route.ts-132-
src/app/api/calendar/events/route.ts:133:export async function POST(request: Request) {
src/app/api/calendar/events/route.ts-134-  const { appUser, personActor, errorResponse } = await getCurrentUserContext();
src/app/api/calendar/events/route.ts-135-
src/app/api/calendar/events/route.ts-136-  if (errorResponse) {
src/app/api/calendar/events/route.ts-137-    return errorResponse;
src/app/api/calendar/events/route.ts-138-  }
--
src/app/api/certificates/cancel/route.ts-71-
src/app/api/certificates/cancel/route.ts-72-function parseRequiredText(value: unknown) {
src/app/api/certificates/cancel/route.ts-73-  return parseOptionalText(value);
src/app/api/certificates/cancel/route.ts-74-}
src/app/api/certificates/cancel/route.ts-75-
src/app/api/certificates/cancel/route.ts:76:export async function POST(request: Request) {
src/app/api/certificates/cancel/route.ts-77-  const { appUser, errorResponse } = await getCurrentAppUser();
src/app/api/certificates/cancel/route.ts-78-
src/app/api/certificates/cancel/route.ts-79-  if (errorResponse) {
src/app/api/certificates/cancel/route.ts-80-    return errorResponse;
src/app/api/certificates/cancel/route.ts-81-  }
--
src/app/api/certificates/expire-due/route.ts-64-    expiredCount: results.length,
src/app/api/certificates/expire-due/route.ts-65-    expiredCertificates: results,
src/app/api/certificates/expire-due/route.ts-66-  });
src/app/api/certificates/expire-due/route.ts-67-}
src/app/api/certificates/expire-due/route.ts-68-
src/app/api/certificates/expire-due/route.ts:69:export async function POST(request: Request) {
src/app/api/certificates/expire-due/route.ts-70-  if (!isAuthorizedCronRequest(request)) {
src/app/api/certificates/expire-due/route.ts-71-    return NextResponse.json(
src/app/api/certificates/expire-due/route.ts-72-      {
src/app/api/certificates/expire-due/route.ts-73-        ok: false,
src/app/api/certificates/expire-due/route.ts-74-        error: "Unauthorized",
--
src/app/api/certificates/redeem/route.ts-71-
src/app/api/certificates/redeem/route.ts-72-function parseRequiredText(value: unknown) {
src/app/api/certificates/redeem/route.ts-73-  return parseOptionalText(value);
src/app/api/certificates/redeem/route.ts-74-}
src/app/api/certificates/redeem/route.ts-75-
src/app/api/certificates/redeem/route.ts:76:export async function POST(request: Request) {
src/app/api/certificates/redeem/route.ts-77-  const { appUser, errorResponse } = await getCurrentAppUser();
src/app/api/certificates/redeem/route.ts-78-
src/app/api/certificates/redeem/route.ts-79-  if (errorResponse) {
src/app/api/certificates/redeem/route.ts-80-    return errorResponse;
src/app/api/certificates/redeem/route.ts-81-  }
--
src/app/api/certificates/request/route.ts-79-  }
src/app/api/certificates/request/route.ts-80-
src/app/api/certificates/request/route.ts-81-  return parsedValue;
src/app/api/certificates/request/route.ts-82-}
src/app/api/certificates/request/route.ts-83-
src/app/api/certificates/request/route.ts:84:export async function POST(request: Request) {
src/app/api/certificates/request/route.ts-85-  const { appUser, errorResponse } = await getCurrentAppUser();
src/app/api/certificates/request/route.ts-86-
src/app/api/certificates/request/route.ts-87-  if (errorResponse) {
src/app/api/certificates/request/route.ts-88-    return errorResponse;
src/app/api/certificates/request/route.ts-89-  }
--
src/app/api/geo/suggestions/route.ts-596-      { status: 500 }
src/app/api/geo/suggestions/route.ts-597-    );
src/app/api/geo/suggestions/route.ts-598-  }
src/app/api/geo/suggestions/route.ts-599-}
src/app/api/geo/suggestions/route.ts-600-
src/app/api/geo/suggestions/route.ts:601:export async function POST(request: Request) {
src/app/api/geo/suggestions/route.ts-602-  const { appUser, errorResponse } = await getCurrentAppUser();
src/app/api/geo/suggestions/route.ts-603-
```

## 7. Completed activity status references

```text
Pattern: completed

lib/activity/activityLifecycle.ts-2-  "draft",
lib/activity/activityLifecycle.ts-3-  "planned",
lib/activity/activityLifecycle.ts-4-  "confirmed",
lib/activity/activityLifecycle.ts-5-  "started",
lib/activity/activityLifecycle.ts-6-  "paused",
lib/activity/activityLifecycle.ts:7:  "completed",
lib/activity/activityLifecycle.ts-8-  "cancelled",
lib/activity/activityLifecycle.ts-9-  "missed",
lib/activity/activityLifecycle.ts-10-  "corrected",
lib/activity/activityLifecycle.ts-11-  "imported_pending",
lib/activity/activityLifecycle.ts-12-  "archived",
--
lib/activity/activityLifecycle.ts-17-export const ACTIVITY_STATUS_DRAFT: ActivityStatus = "draft";
lib/activity/activityLifecycle.ts-18-export const ACTIVITY_STATUS_PLANNED: ActivityStatus = "planned";
lib/activity/activityLifecycle.ts-19-export const ACTIVITY_STATUS_CONFIRMED: ActivityStatus = "confirmed";
lib/activity/activityLifecycle.ts-20-export const ACTIVITY_STATUS_STARTED: ActivityStatus = "started";
lib/activity/activityLifecycle.ts-21-export const ACTIVITY_STATUS_PAUSED: ActivityStatus = "paused";
lib/activity/activityLifecycle.ts:22:export const ACTIVITY_STATUS_COMPLETED: ActivityStatus = "completed";
lib/activity/activityLifecycle.ts-23-export const ACTIVITY_STATUS_CANCELLED: ActivityStatus = "cancelled";
lib/activity/activityLifecycle.ts-24-export const ACTIVITY_STATUS_MISSED: ActivityStatus = "missed";
lib/activity/activityLifecycle.ts-25-export const ACTIVITY_STATUS_CORRECTED: ActivityStatus = "corrected";
lib/activity/activityLifecycle.ts-26-export const ACTIVITY_STATUS_IMPORTED_PENDING: ActivityStatus = "imported_pending";
lib/activity/activityLifecycle.ts-27-export const ACTIVITY_STATUS_ARCHIVED: ActivityStatus = "archived";
--
lib/activity/activityLifecycle.ts-42-  "started",
lib/activity/activityLifecycle.ts-43-  "paused",
lib/activity/activityLifecycle.ts-44-] as const;
lib/activity/activityLifecycle.ts-45-
lib/activity/activityLifecycle.ts-46-export const ACTIVITY_FACT_STATUSES = [
lib/activity/activityLifecycle.ts:47:  "completed",
lib/activity/activityLifecycle.ts-48-] as const;
lib/activity/activityLifecycle.ts-49-
lib/activity/activityLifecycle.ts-50-export const ACTIVITY_IMPORT_REVIEW_STATUSES = [
lib/activity/activityLifecycle.ts-51-  "imported_pending",
lib/activity/activityLifecycle.ts-52-] as const;
--
lib/activity/activityLifecycle.ts-57-  "archived",
lib/activity/activityLifecycle.ts-58-  "corrected",
lib/activity/activityLifecycle.ts-59-] as const;
lib/activity/activityLifecycle.ts-60-
lib/activity/activityLifecycle.ts-61-export const ACTIVITY_TERMINAL_STATUSES = [
lib/activity/activityLifecycle.ts:62:  "completed",
lib/activity/activityLifecycle.ts-63-  "cancelled",
lib/activity/activityLifecycle.ts-64-  "missed",
lib/activity/activityLifecycle.ts-65-  "corrected",
lib/activity/activityLifecycle.ts-66-  "archived",
lib/activity/activityLifecycle.ts-67-] as const;
--
lib/activity/activityLifecycle.ts-130-> = {
lib/activity/activityLifecycle.ts-131-  draft: [
lib/activity/activityLifecycle.ts-132-    "planned",
lib/activity/activityLifecycle.ts-133-    "confirmed",
lib/activity/activityLifecycle.ts-134-    "started",
lib/activity/activityLifecycle.ts:135:    "completed",
lib/activity/activityLifecycle.ts-136-    "cancelled",
lib/activity/activityLifecycle.ts-137-    "archived",
lib/activity/activityLifecycle.ts-138-  ],
lib/activity/activityLifecycle.ts-139-
lib/activity/activityLifecycle.ts-140-  planned: [
lib/activity/activityLifecycle.ts-141-    "confirmed",
lib/activity/activityLifecycle.ts-142-    "started",
lib/activity/activityLifecycle.ts:143:    "completed",
lib/activity/activityLifecycle.ts-144-    "cancelled",
lib/activity/activityLifecycle.ts-145-    "missed",
lib/activity/activityLifecycle.ts-146-    "archived",
lib/activity/activityLifecycle.ts-147-  ],
lib/activity/activityLifecycle.ts-148-
lib/activity/activityLifecycle.ts-149-  confirmed: [
lib/activity/activityLifecycle.ts-150-    "planned",
lib/activity/activityLifecycle.ts-151-    "started",
lib/activity/activityLifecycle.ts:152:    "completed",
lib/activity/activityLifecycle.ts-153-    "cancelled",
lib/activity/activityLifecycle.ts-154-    "missed",
lib/activity/activityLifecycle.ts-155-    "archived",
lib/activity/activityLifecycle.ts-156-  ],
lib/activity/activityLifecycle.ts-157-
lib/activity/activityLifecycle.ts-158-  started: [
lib/activity/activityLifecycle.ts-159-    "paused",
lib/activity/activityLifecycle.ts:160:    "completed",
lib/activity/activityLifecycle.ts-161-    "cancelled",
lib/activity/activityLifecycle.ts-162-    "missed",
lib/activity/activityLifecycle.ts-163-    "archived",
lib/activity/activityLifecycle.ts-164-  ],
lib/activity/activityLifecycle.ts-165-
lib/activity/activityLifecycle.ts-166-  paused: [
lib/activity/activityLifecycle.ts-167-    "started",
lib/activity/activityLifecycle.ts:168:    "completed",
lib/activity/activityLifecycle.ts-169-    "cancelled",
lib/activity/activityLifecycle.ts-170-    "missed",
lib/activity/activityLifecycle.ts-171-    "archived",
lib/activity/activityLifecycle.ts-172-  ],
lib/activity/activityLifecycle.ts-173-
lib/activity/activityLifecycle.ts:174:  completed: [
lib/activity/activityLifecycle.ts-175-    "corrected",
lib/activity/activityLifecycle.ts-176-    "cancelled",
lib/activity/activityLifecycle.ts-177-    "missed",
lib/activity/activityLifecycle.ts-178-    "archived",
lib/activity/activityLifecycle.ts-179-  ],
--
lib/activity/activityLifecycle.ts-192-
lib/activity/activityLifecycle.ts-193-  imported_pending: [
lib/activity/activityLifecycle.ts-194-    "draft",
lib/activity/activityLifecycle.ts-195-    "planned",
lib/activity/activityLifecycle.ts-196-    "confirmed",
lib/activity/activityLifecycle.ts:197:    "completed",
lib/activity/activityLifecycle.ts-198-    "cancelled",
lib/activity/activityLifecycle.ts-199-    "archived",
lib/activity/activityLifecycle.ts-200-  ],
lib/activity/activityLifecycle.ts-201-
lib/activity/activityLifecycle.ts-202-  archived: [],
--
lib/activity/activityLifecycle.ts-383-    return {
lib/activity/activityLifecycle.ts-384-      fromStatus,
lib/activity/activityLifecycle.ts-385-      toStatus,
lib/activity/activityLifecycle.ts-386-      allowed: true,
lib/activity/activityLifecycle.ts-387-      transitionKind:
lib/activity/activityLifecycle.ts:388:        toStatus === "completed" ? "completion_flow" : "active_flow",
lib/activity/activityLifecycle.ts-389-      reason: `Active activity can transition to ${toStatus}.`,
lib/activity/activityLifecycle.ts-390-    };
lib/activity/activityLifecycle.ts-391-  }
lib/activity/activityLifecycle.ts-392-
lib/activity/activityLifecycle.ts:393:  if (fromStatus === "completed") {
lib/activity/activityLifecycle.ts-394-    return {
lib/activity/activityLifecycle.ts-395-      fromStatus,
lib/activity/activityLifecycle.ts-396-      toStatus,
lib/activity/activityLifecycle.ts-397-      allowed: true,
lib/activity/activityLifecycle.ts-398-      transitionKind:
--
lib/activity/activityProcessingLogs.ts-22-  | "debug";
lib/activity/activityProcessingLogs.ts-23-
lib/activity/activityProcessingLogs.ts-24-export type ActivityProcessingStatus =
lib/activity/activityProcessingLogs.ts-25-  | "started"
lib/activity/activityProcessingLogs.ts-26-  | "processing"
lib/activity/activityProcessingLogs.ts:27:  | "completed"
lib/activity/activityProcessingLogs.ts-28-  | "failed"
lib/activity/activityProcessingLogs.ts-29-  | "skipped"
lib/activity/activityProcessingLogs.ts-30-  | "warning"
lib/activity/activityProcessingLogs.ts-31-  | "retrying"
lib/activity/activityProcessingLogs.ts-32-  | "cancelled";
--
lib/activity/activityProcessingLogs.ts-163-      activity_correction_id: input.activityCorrectionId ?? null,
lib/activity/activityProcessingLogs.ts-164-      processing_run_id: input.processingRunId ?? null,
lib/activity/activityProcessingLogs.ts-165-      processor_name: input.processorName,
lib/activity/activityProcessingLogs.ts-166-      processor_version: nullableText(input.processorVersion),
lib/activity/activityProcessingLogs.ts-167-      processing_stage: input.processingStage,
lib/activity/activityProcessingLogs.ts:168:      processing_status: input.processingStatus ?? "completed",
lib/activity/activityProcessingLogs.ts-169-      severity: input.severity ?? "info",
lib/activity/activityProcessingLogs.ts-170-      message: nullableText(input.message),
lib/activity/activityProcessingLogs.ts-171-      input_json: toJsonObject(input.input),
lib/activity/activityProcessingLogs.ts-172-      output_json: toJsonObject(input.output),
lib/activity/activityProcessingLogs.ts-173-      error_json: toJsonObject(input.error),
--
lib/activity/activitySourceIntake.ts-307-  const defaultActivityStatus =
lib/activity/activitySourceIntake.ts-308-    getDefaultActivityStatusForRawSource(rawSourceType);
lib/activity/activitySourceIntake.ts-309-
lib/activity/activitySourceIntake.ts-310-  const importedPending = shouldCreateImportedPendingEvent(rawSourceType);
lib/activity/activitySourceIntake.ts-311-  const draft = shouldCreateDraftEvent(rawSourceType);
lib/activity/activitySourceIntake.ts:312:  const completed = shouldCreateCompletedEvent(rawSourceType);
lib/activity/activitySourceIntake.ts-313-
lib/activity/activitySourceIntake.ts-314-  return {
lib/activity/activitySourceIntake.ts-315-    rawSourceType,
lib/activity/activitySourceIntake.ts-316-    activityEventSource,
lib/activity/activitySourceIntake.ts-317-    defaultTrustLevel,
lib/activity/activitySourceIntake.ts-318-    defaultRawProcessingStatus,
lib/activity/activitySourceIntake.ts-319-    defaultActivityStatus,
lib/activity/activitySourceIntake.ts-320-    shouldCreateImportedPendingEvent: importedPending,
lib/activity/activitySourceIntake.ts-321-    shouldCreateDraftEvent: draft,
lib/activity/activitySourceIntake.ts:322:    shouldCreateCompletedEvent: completed,
lib/activity/activitySourceIntake.ts-323-    requiresHumanReview: importedPending || draft,
lib/activity/activitySourceIntake.ts-324-    reason: importedPending
lib/activity/activitySourceIntake.ts-325-      ? "External or imported signal should create an imported_pending event until reviewed."
lib/activity/activitySourceIntake.ts-326-      : draft
lib/activity/activitySourceIntake.ts-327-        ? "Unstructured or AI-suggested signal should create a draft until classified or confirmed."
lib/activity/activitySourceIntake.ts:328:        : "Direct trusted user action can create a completed event through the normal activity pipeline.",
lib/activity/activitySourceIntake.ts-329-  };
lib/activity/activitySourceIntake.ts-330-}
--
lib/activity/activityValueObjectLifecycle.ts-48-
lib/activity/activityValueObjectLifecycle.ts-49-/**
lib/activity/activityValueObjectLifecycle.ts-50- * Normal lifecycle wrapper for Activity Event -> Rubricator Mapper -> Value Object Bridge.
lib/activity/activityValueObjectLifecycle.ts-51- *
lib/activity/activityValueObjectLifecycle.ts-52- * Important:
lib/activity/activityValueObjectLifecycle.ts:53: * - This wrapper is for normal completed/confirmed lifecycle paths.
lib/activity/activityValueObjectLifecycle.ts-54- * - It does not create missing controlled Value Objects.
lib/activity/activityValueObjectLifecycle.ts-55- * - It does not use controlled text fallback.
lib/activity/activityValueObjectLifecycle.ts-56- * - It must not be called for imported_pending events before confirm.
lib/activity/activityValueObjectLifecycle.ts-57- * - Duplicate protection is delegated to processValueObjectBridgeForActivityEvent.
lib/activity/activityValueObjectLifecycle.ts-58- */
--
lib/activity/categoryDerivation/persistDerivations.ts-84-  if (derivationResult.errors.length > 0 || derivationResult.ok === false) {
lib/activity/categoryDerivation/persistDerivations.ts-85-    return "failed";
lib/activity/categoryDerivation/persistDerivations.ts-86-  }
lib/activity/categoryDerivation/persistDerivations.ts-87-
lib/activity/categoryDerivation/persistDerivations.ts-88-  if (derivationResult.warnings.length > 0) {
lib/activity/categoryDerivation/persistDerivations.ts:89:    return "completed_with_warnings";
lib/activity/categoryDerivation/persistDerivations.ts-90-  }
lib/activity/categoryDerivation/persistDerivations.ts-91-
lib/activity/categoryDerivation/persistDerivations.ts:92:  return "completed";
lib/activity/categoryDerivation/persistDerivations.ts-93-}
lib/activity/categoryDerivation/persistDerivations.ts-94-
lib/activity/categoryDerivation/persistDerivations.ts-95-function resolvedOrUnresolvedCandidates(
lib/activity/categoryDerivation/persistDerivations.ts-96-  derivationResult: CategoryDerivationResult,
lib/activity/categoryDerivation/persistDerivations.ts-97-  resolvedCandidates?: ResolvedCategoryCandidate[],
--
lib/activity/categoryDerivation/types.ts-36-  | "created_active"
lib/activity/categoryDerivation/types.ts-37-  | "unresolved";
lib/activity/categoryDerivation/types.ts-38-
lib/activity/categoryDerivation/types.ts-39-export type CategoryDerivationRunStatus =
lib/activity/categoryDerivation/types.ts-40-  | "started"
lib/activity/categoryDerivation/types.ts:41:  | "completed"
lib/activity/categoryDerivation/types.ts:42:  | "completed_with_warnings"
lib/activity/categoryDerivation/types.ts-43-  | "failed";
lib/activity/categoryDerivation/types.ts-44-
lib/activity/categoryDerivation/types.ts-45-export interface CategoryCandidate {
lib/activity/categoryDerivation/types.ts-46-  slug: string;
lib/activity/categoryDerivation/types.ts-47-  title?: string;
--
lib/activity/rubricatorValueObjectMapper.ts-717-    valueObjectId,
lib/activity/rubricatorValueObjectMapper.ts-718-    relationType: rule.relationType,
lib/activity/rubricatorValueObjectMapper.ts-719-    weight: 1,
lib/activity/rubricatorValueObjectMapper.ts-720-    confidence,
lib/activity/rubricatorValueObjectMapper.ts-721-    source: "rule",
lib/activity/rubricatorValueObjectMapper.ts:722:    instanceStatus: "completed",
lib/activity/rubricatorValueObjectMapper.ts-723-    instanceTitle: event.title ?? rule.valueObjectTitle,
lib/activity/rubricatorValueObjectMapper.ts-724-    instanceNote: event.description ?? event.input_text,
lib/activity/rubricatorValueObjectMapper.ts:725:    resultStatus: "completed",
lib/activity/rubricatorValueObjectMapper.ts-726-    qualityScore: null,
lib/activity/rubricatorValueObjectMapper.ts-727-    metricKey: rule.metricKey,
lib/activity/rubricatorValueObjectMapper.ts-728-    metricUnit: rule.metricUnit,
lib/activity/rubricatorValueObjectMapper.ts-729-    deltaValueNumeric: event.duration_minutes,
lib/activity/rubricatorValueObjectMapper.ts-730-    deltaValueText: null,
--
lib/activity/rubricatorValueObjectMapper.ts-779-    return result;
lib/activity/rubricatorValueObjectMapper.ts-780-  }
lib/activity/rubricatorValueObjectMapper.ts-781-
lib/activity/rubricatorValueObjectMapper.ts-782-  result.eventStatus = event.status;
lib/activity/rubricatorValueObjectMapper.ts-783-
lib/activity/rubricatorValueObjectMapper.ts:784:  if (!allowNonCompletedEvent && event.status !== "completed") {
lib/activity/rubricatorValueObjectMapper.ts-785-    result.ok = true;
lib/activity/rubricatorValueObjectMapper.ts-786-    result.skipped = true;
lib/activity/rubricatorValueObjectMapper.ts:787:    result.skipReason = `event_status_${event.status}_not_completed`;
lib/activity/rubricatorValueObjectMapper.ts-788-    return result;
lib/activity/rubricatorValueObjectMapper.ts-789-  }
lib/activity/rubricatorValueObjectMapper.ts-790-
lib/activity/rubricatorValueObjectMapper.ts-791-  const { rows: classificationRows, errorMessage: classificationError } =
lib/activity/rubricatorValueObjectMapper.ts-792-    await readEntityClassifications(supabase, eventId);
--
lib/activity/valueObjectBridge.ts-30-
lib/activity/valueObjectBridge.ts-31-type ValueObjectInstanceStatus =
lib/activity/valueObjectBridge.ts-32-  | "draft"
lib/activity/valueObjectBridge.ts-33-  | "planned"
lib/activity/valueObjectBridge.ts-34-  | "active"
lib/activity/valueObjectBridge.ts:35:  | "completed"
lib/activity/valueObjectBridge.ts-36-  | "cancelled"
lib/activity/valueObjectBridge.ts-37-  | "archived";
lib/activity/valueObjectBridge.ts-38-
lib/activity/valueObjectBridge.ts-39-type ActivityEventForValueObjectBridge = {
lib/activity/valueObjectBridge.ts-40-  id: string;
--
lib/activity/valueObjectBridge.ts-1222-    return result;
```

## 8. manual_chat source references

```text
Pattern: manual_chat

lib/activity/activitySourceIntake.ts-9-  RawActivitySignalSourceType,
lib/activity/activitySourceIntake.ts-10-  RawActivitySignalTrustLevel,
lib/activity/activitySourceIntake.ts-11-} from "./rawActivitySignals";
lib/activity/activitySourceIntake.ts-12-
lib/activity/activitySourceIntake.ts-13-export const RAW_ACTIVITY_SIGNAL_SOURCE_VALUES = [
lib/activity/activitySourceIntake.ts:14:  "manual_chat",
lib/activity/activitySourceIntake.ts-15-  "manual_form",
lib/activity/activitySourceIntake.ts-16-  "voice_input",
lib/activity/activitySourceIntake.ts-17-  "app_action",
lib/activity/activitySourceIntake.ts-18-  "system_event",
lib/activity/activitySourceIntake.ts-19-  "api_webhook",
--
lib/activity/activitySourceIntake.ts-33-  "booking",
lib/activity/activitySourceIntake.ts-34-  "rule",
lib/activity/activitySourceIntake.ts-35-  "import",
lib/activity/activitySourceIntake.ts-36-  "system",
lib/activity/activitySourceIntake.ts-37-  "manual_form",
lib/activity/activitySourceIntake.ts:38:  "manual_chat",
lib/activity/activitySourceIntake.ts-39-  "voice_input",
lib/activity/activitySourceIntake.ts-40-  "app_action",
lib/activity/activitySourceIntake.ts-41-  "system_event",
lib/activity/activitySourceIntake.ts-42-  "api_webhook",
lib/activity/activitySourceIntake.ts-43-  "nfc_sensor",
--
lib/activity/activitySourceIntake.ts-71-  ACTIVITY_EVENT_SOURCE_VALUES
lib/activity/activitySourceIntake.ts-72-);
lib/activity/activitySourceIntake.ts-73-
lib/activity/activitySourceIntake.ts-74-const DIRECT_USER_SOURCE_SET = new Set<RawActivitySignalSourceType>([
lib/activity/activitySourceIntake.ts-75-  "manual_form",
lib/activity/activitySourceIntake.ts:76:  "manual_chat",
lib/activity/activitySourceIntake.ts-77-  "app_action",
lib/activity/activitySourceIntake.ts-78-]);
lib/activity/activitySourceIntake.ts-79-
lib/activity/activitySourceIntake.ts-80-const REVIEW_REQUIRED_SOURCE_SET = new Set<RawActivitySignalSourceType>([
lib/activity/activitySourceIntake.ts-81-  "api_webhook",
--
lib/activity/activitySourceIntake.ts-167-
lib/activity/activitySourceIntake.ts-168-export function mapRawSourceTypeToActivityEventSource(
lib/activity/activitySourceIntake.ts-169-  sourceType: RawActivitySignalSourceType
lib/activity/activitySourceIntake.ts-170-): ActivityEventSourceType {
lib/activity/activitySourceIntake.ts-171-  switch (sourceType) {
lib/activity/activitySourceIntake.ts:172:    case "manual_chat":
lib/activity/activitySourceIntake.ts-173-    case "manual_form":
lib/activity/activitySourceIntake.ts-174-    case "voice_input":
lib/activity/activitySourceIntake.ts-175-    case "app_action":
lib/activity/activitySourceIntake.ts-176-    case "system_event":
lib/activity/activitySourceIntake.ts-177-    case "api_webhook":
--
lib/activity/activitySourceIntake.ts-194-export function getDefaultTrustLevelForSourceType(
lib/activity/activitySourceIntake.ts-195-  sourceType: RawActivitySignalSourceType
lib/activity/activitySourceIntake.ts-196-): RawActivitySignalTrustLevel {
lib/activity/activitySourceIntake.ts-197-  switch (sourceType) {
lib/activity/activitySourceIntake.ts-198-    case "manual_form":
lib/activity/activitySourceIntake.ts:199:    case "manual_chat":
lib/activity/activitySourceIntake.ts-200-    case "app_action":
lib/activity/activitySourceIntake.ts-201-      return "medium";
lib/activity/activitySourceIntake.ts-202-
lib/activity/activitySourceIntake.ts-203-    case "system_event":
lib/activity/activitySourceIntake.ts-204-      return "system";
--
lib/activity/rawActivitySignals.ts-8-  | { [key: string]: JsonValue };
lib/activity/rawActivitySignals.ts-9-
lib/activity/rawActivitySignals.ts-10-export type JsonObject = { [key: string]: JsonValue };
lib/activity/rawActivitySignals.ts-11-
lib/activity/rawActivitySignals.ts-12-export type RawActivitySignalSourceType =
lib/activity/rawActivitySignals.ts:13:  | "manual_chat"
lib/activity/rawActivitySignals.ts-14-  | "manual_form"
lib/activity/rawActivitySignals.ts-15-  | "voice_input"
lib/activity/rawActivitySignals.ts-16-  | "app_action"
lib/activity/rawActivitySignals.ts-17-  | "system_event"
lib/activity/rawActivitySignals.ts-18-  | "api_webhook"
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-772-      title,
src/app/api/activity/debug/free-text-value-object-test/route.ts-773-      description,
src/app/api/activity/debug/free-text-value-object-test/route.ts-774-      started_at: timing.startedAt,
src/app/api/activity/debug/free-text-value-object-test/route.ts-775-      ended_at: timing.endedAt,
src/app/api/activity/debug/free-text-value-object-test/route.ts-776-      duration_minutes: timing.durationMinutes,
src/app/api/activity/debug/free-text-value-object-test/route.ts:777:      source: "manual_chat",
src/app/api/activity/debug/free-text-value-object-test/route.ts-778-      status: "completed",
src/app/api/activity/debug/free-text-value-object-test/route.ts-779-      privacy_scope: "private",
src/app/api/activity/debug/free-text-value-object-test/route.ts-780-      processing_status: "processed",
src/app/api/activity/debug/free-text-value-object-test/route.ts-781-      metadata_json: {
src/app/api/activity/debug/free-text-value-object-test/route.ts-782-        parser: "debug_free_text_value_object_test_v1",
--
src/app/api/activity/intake/events/route.ts-39-  "failed",
src/app/api/activity/intake/events/route.ts-40-  "skipped",
src/app/api/activity/intake/events/route.ts-41-] as const;
src/app/api/activity/intake/events/route.ts-42-
src/app/api/activity/intake/events/route.ts-43-const ACTIVITY_EVENT_SOURCE_VALUES = [
src/app/api/activity/intake/events/route.ts:44:  "manual_chat",
src/app/api/activity/intake/events/route.ts-45-  "manual_form",
src/app/api/activity/intake/events/route.ts-46-  "voice_input",
src/app/api/activity/intake/events/route.ts-47-  "app_action",
src/app/api/activity/intake/events/route.ts-48-  "system_event",
src/app/api/activity/intake/events/route.ts-49-  "api_webhook",
--
src/app/api/activity/intake/route.ts-250-      status: "P4.2.7",
src/app/api/activity/intake/route.ts-251-      behavior:
src/app/api/activity/intake/route.ts-252-        "Repeated external signals with the same sourceEventId or idempotencyKey return a controlled duplicate response instead of a server error.",
src/app/api/activity/intake/route.ts-253-    },
src/app/api/activity/intake/route.ts-254-    supportedSourceTypes: [
src/app/api/activity/intake/route.ts:255:      "manual_chat",
src/app/api/activity/intake/route.ts-256-      "manual_form",
src/app/api/activity/intake/route.ts-257-      "voice_input",
src/app/api/activity/intake/route.ts-258-      "app_action",
src/app/api/activity/intake/route.ts-259-      "system_event",
src/app/api/activity/intake/route.ts-260-      "api_webhook",
--
src/app/api/activity/record/route.ts-624-      title: asString(body.title) ?? "Unclassified activity draft",
src/app/api/activity/record/route.ts-625-      description: asString(body.comment),
src/app/api/activity/record/route.ts-626-      started_at: timing.startedAt,
src/app/api/activity/record/route.ts-627-      ended_at: timing.endedAt,
src/app/api/activity/record/route.ts-628-      duration_minutes: timing.durationMinutes,
src/app/api/activity/record/route.ts:629:      source: normalizeSourceType(body.sourceType, "manual_chat"),
src/app/api/activity/record/route.ts-630-      status: "draft",
src/app/api/activity/record/route.ts-631-      privacy_scope: "private",
src/app/api/activity/record/route.ts-632-      processing_status: "pending",
src/app/api/activity/record/route.ts-633-      metadata_json: {
src/app/api/activity/record/route.ts-634-        parser: "template_first_v2",
--
supabase/migrations/013_activity_templates_v2.sql-145-
supabase/migrations/013_activity_templates_v2.sql-146-  constraint activity_templates_default_source_type_check
supabase/migrations/013_activity_templates_v2.sql-147-    check (
supabase/migrations/013_activity_templates_v2.sql-148-      default_source_type in (
supabase/migrations/013_activity_templates_v2.sql-149-        'manual_form',
supabase/migrations/013_activity_templates_v2.sql:150:        'manual_chat',
supabase/migrations/013_activity_templates_v2.sql-151-        'voice_input',
supabase/migrations/013_activity_templates_v2.sql-152-        'app_action',
supabase/migrations/013_activity_templates_v2.sql-153-        'system_event',
supabase/migrations/013_activity_templates_v2.sql-154-        'api_webhook',
supabase/migrations/013_activity_templates_v2.sql-155-        'nfc_sensor',
--
supabase/migrations/014_activity_events_v2_template_link.sql-42-    'import',
supabase/migrations/014_activity_events_v2_template_link.sql-43-    'system',
supabase/migrations/014_activity_events_v2_template_link.sql-44-
supabase/migrations/014_activity_events_v2_template_link.sql-45-    -- v2 source_type values
supabase/migrations/014_activity_events_v2_template_link.sql-46-    'manual_form',
supabase/migrations/014_activity_events_v2_template_link.sql:47:    'manual_chat',
supabase/migrations/014_activity_events_v2_template_link.sql-48-    'voice_input',
supabase/migrations/014_activity_events_v2_template_link.sql-49-    'app_action',
supabase/migrations/014_activity_events_v2_template_link.sql-50-    'system_event',
supabase/migrations/014_activity_events_v2_template_link.sql-51-    'api_webhook',
supabase/migrations/014_activity_events_v2_template_link.sql-52-    'nfc_sensor',
--
supabase/migrations/020_activity_raw_signals.sql-36-  updated_at timestamptz not null default now(),
supabase/migrations/020_activity_raw_signals.sql-37-
supabase/migrations/020_activity_raw_signals.sql-38-  constraint raw_activity_signals_source_type_check
supabase/migrations/020_activity_raw_signals.sql-39-    check (
supabase/migrations/020_activity_raw_signals.sql-40-      source_type in (
supabase/migrations/020_activity_raw_signals.sql:41:        'manual_chat',
supabase/migrations/020_activity_raw_signals.sql-42-        'manual_form',
supabase/migrations/020_activity_raw_signals.sql-43-        'voice_input',
supabase/migrations/020_activity_raw_signals.sql-44-        'app_action',
supabase/migrations/020_activity_raw_signals.sql-45-        'system_event',
supabase/migrations/020_activity_raw_signals.sql-46-        'api_webhook',
```

## 9. processActivityValueObjectBridge references

```text
Pattern: processActivityValueObjectBridge

lib/activity/activityValueObjectLifecycle.ts-54- * - It does not create missing controlled Value Objects.
lib/activity/activityValueObjectLifecycle.ts-55- * - It does not use controlled text fallback.
lib/activity/activityValueObjectLifecycle.ts-56- * - It must not be called for imported_pending events before confirm.
lib/activity/activityValueObjectLifecycle.ts-57- * - Duplicate protection is delegated to processValueObjectBridgeForActivityEvent.
lib/activity/activityValueObjectLifecycle.ts-58- */
lib/activity/activityValueObjectLifecycle.ts:59:export async function processActivityValueObjectBridge(
lib/activity/activityValueObjectLifecycle.ts-60-  input: ProcessActivityValueObjectBridgeInput
lib/activity/activityValueObjectLifecycle.ts-61-): Promise<ProcessActivityValueObjectBridgeResult> {
lib/activity/activityValueObjectLifecycle.ts-62-  const { supabase, eventId, processorName, allowNonCompletedEvent = false } =
lib/activity/activityValueObjectLifecycle.ts-63-    input;
lib/activity/activityValueObjectLifecycle.ts-64-
--
src/app/api/activity/complete/route.ts-14-  getDurationMs,
src/app/api/activity/complete/route.ts-15-  safeCreateActivityProcessingLog,
src/app/api/activity/complete/route.ts-16-} from "../../../../../lib/activity/activityProcessingLogs";
src/app/api/activity/complete/route.ts-17-import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
src/app/api/activity/complete/route.ts-18-import { processActivityImpacts } from "../../../../../lib/activity/activityImpactProcessor";
src/app/api/activity/complete/route.ts:19:import { processActivityValueObjectBridge } from "../../../../../lib/activity/activityValueObjectLifecycle";
src/app/api/activity/complete/route.ts-20-import { ensureActivityEventRubricatorClassificationForKnownTemplate } from "../../../../../lib/activity/activityRubricatorClassificationLifecycle";
src/app/api/activity/complete/route.ts-21-import { buildRubricatorResolverLogMetadata } from "../../../../../lib/activity/rubricatorResolverLogMetadata";
src/app/api/activity/complete/route.ts-22-import {
src/app/api/activity/complete/route.ts-23-  createRawActivitySignal,
src/app/api/activity/complete/route.ts-24-  markRawActivitySignalFailed,
--
src/app/api/activity/complete/route.ts-728-      startedAt: processingStartedAt.toISOString(),
src/app/api/activity/complete/route.ts-729-      finishedAt: new Date().toISOString(),
src/app/api/activity/complete/route.ts-730-      durationMs: getDurationMs(processingStartedAt),
src/app/api/activity/complete/route.ts-731-    });
src/app/api/activity/complete/route.ts-732-
src/app/api/activity/complete/route.ts:733:    const valueObjectBridgeResult = await processActivityValueObjectBridge({
src/app/api/activity/complete/route.ts-734-      supabase,
src/app/api/activity/complete/route.ts-735-      eventId: updatedEvent.id,
src/app/api/activity/complete/route.ts-736-      processorName: "activity_complete_route_p4_7_7",
src/app/api/activity/complete/route.ts-737-    });
src/app/api/activity/complete/route.ts-738-
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-4-import {
src/app/api/activity/debug/free-text-value-object-test/route.ts-5-  ACTIVITY_RECORDING_DISABLED_MESSAGE,
src/app/api/activity/debug/free-text-value-object-test/route.ts-6-  ACTIVITY_RECORDING_ENABLED,
src/app/api/activity/debug/free-text-value-object-test/route.ts-7-} from "../../../../../../lib/activity/activityRecordingConfig";
src/app/api/activity/debug/free-text-value-object-test/route.ts-8-import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
src/app/api/activity/debug/free-text-value-object-test/route.ts:9:import { processActivityValueObjectBridge } from "../../../../../../lib/activity/activityValueObjectLifecycle";
src/app/api/activity/debug/free-text-value-object-test/route.ts-10-import { safeCreateActivityProcessingLog } from "../../../../../../lib/activity/activityProcessingLogs";
src/app/api/activity/debug/free-text-value-object-test/route.ts-11-import { supabase } from "../../../../../../lib/supabase";
src/app/api/activity/debug/free-text-value-object-test/route.ts-12-import { deriveCategoryCandidates } from "../../../../../../lib/activity/categoryDerivation/ruleExtractor";
src/app/api/activity/debug/free-text-value-object-test/route.ts-13-import {
src/app/api/activity/debug/free-text-value-object-test/route.ts-14-  resolveCategoryCandidates,
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-821-        activityEventId: createdEvent.id,
src/app/api/activity/debug/free-text-value-object-test/route.ts-822-        derivationRunId:
src/app/api/activity/debug/free-text-value-object-test/route.ts-823-          categoryDerivationResult.persistence?.derivationRunId ?? null,
src/app/api/activity/debug/free-text-value-object-test/route.ts-824-        categoryDerivationResult,
src/app/api/activity/debug/free-text-value-object-test/route.ts-825-      });
src/app/api/activity/debug/free-text-value-object-test/route.ts:826:  const bridgeResult = await processActivityValueObjectBridge({
src/app/api/activity/debug/free-text-value-object-test/route.ts-827-      additionalCategoryLinks: categoryDerivationBridgeAdditionalCategoryLinks,
src/app/api/activity/debug/free-text-value-object-test/route.ts-828-    supabase,
src/app/api/activity/debug/free-text-value-object-test/route.ts-829-    eventId: createdEvent.id,
src/app/api/activity/debug/free-text-value-object-test/route.ts-830-    processorName: "activity_debug_free_text_value_object_test",
src/app/api/activity/debug/free-text-value-object-test/route.ts-831-    allowNonCompletedEvent: false,
--
src/app/api/activity/intake/events/[id]/confirm/route.ts-7-  getDurationMs,
src/app/api/activity/intake/events/[id]/confirm/route.ts-8-  safeCreateActivityProcessingLog,
src/app/api/activity/intake/events/[id]/confirm/route.ts-9-} from "../../../../../../../../lib/activity/activityProcessingLogs";
src/app/api/activity/intake/events/[id]/confirm/route.ts-10-import { getActivityUserContext } from "../../../../../../../../lib/activity/activityUserContext";
src/app/api/activity/intake/events/[id]/confirm/route.ts-11-import { processActivityImpacts } from "../../../../../../../../lib/activity/activityImpactProcessor";
src/app/api/activity/intake/events/[id]/confirm/route.ts:12:import { processActivityValueObjectBridge } from "../../../../../../../../lib/activity/activityValueObjectLifecycle";
src/app/api/activity/intake/events/[id]/confirm/route.ts-13-import { ensureActivityEventRubricatorClassificationForKnownTemplate } from "../../../../../../../../lib/activity/activityRubricatorClassificationLifecycle";
src/app/api/activity/intake/events/[id]/confirm/route.ts-14-import { buildRubricatorResolverLogMetadata } from "../../../../../../../../lib/activity/rubricatorResolverLogMetadata";
src/app/api/activity/intake/events/[id]/confirm/route.ts-15-import { supabase } from "../../../../../../../../lib/supabase";
src/app/api/activity/intake/events/[id]/confirm/route.ts-16-
src/app/api/activity/intake/events/[id]/confirm/route.ts-17-export const dynamic = "force-dynamic";
--
src/app/api/activity/intake/events/[id]/confirm/route.ts-635-        startedAt: processingStartedAt.toISOString(),
src/app/api/activity/intake/events/[id]/confirm/route.ts-636-        finishedAt: new Date().toISOString(),
src/app/api/activity/intake/events/[id]/confirm/route.ts-637-        durationMs: getDurationMs(processingStartedAt),
src/app/api/activity/intake/events/[id]/confirm/route.ts-638-      });
src/app/api/activity/intake/events/[id]/confirm/route.ts-639-
src/app/api/activity/intake/events/[id]/confirm/route.ts:640:      const valueObjectBridgeResult = await processActivityValueObjectBridge({
src/app/api/activity/intake/events/[id]/confirm/route.ts-641-        supabase,
src/app/api/activity/intake/events/[id]/confirm/route.ts-642-        eventId: updatedEvent.id,
src/app/api/activity/intake/events/[id]/confirm/route.ts-643-        processorName: "activity_confirm_route_p4_7_7",
src/app/api/activity/intake/events/[id]/confirm/route.ts-644-      });
src/app/api/activity/intake/events/[id]/confirm/route.ts-645-
--
src/app/api/activity/record/route.ts-10-  getDurationMs,
src/app/api/activity/record/route.ts-11-  safeCreateActivityProcessingLog,
src/app/api/activity/record/route.ts-12-} from "../../../../../lib/activity/activityProcessingLogs";
src/app/api/activity/record/route.ts-13-import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
src/app/api/activity/record/route.ts-14-import { processActivityImpacts } from "../../../../../lib/activity/activityImpactProcessor";
src/app/api/activity/record/route.ts:15:import { processActivityValueObjectBridge } from "../../../../../lib/activity/activityValueObjectLifecycle";
src/app/api/activity/record/route.ts-16-import { ensureActivityEventRubricatorClassificationForKnownTemplate } from "../../../../../lib/activity/activityRubricatorClassificationLifecycle";
src/app/api/activity/record/route.ts-17-import { buildRubricatorResolverLogMetadata } from "../../../../../lib/activity/rubricatorResolverLogMetadata";
src/app/api/activity/record/route.ts-18-import {
src/app/api/activity/record/route.ts-19-  createRawActivitySignal,
src/app/api/activity/record/route.ts-20-  markRawActivitySignalFailed,
--
src/app/api/activity/record/route.ts-1263-      startedAt: processingStartedAt.toISOString(),
src/app/api/activity/record/route.ts-1264-      finishedAt: new Date().toISOString(),
src/app/api/activity/record/route.ts-1265-      durationMs: getDurationMs(processingStartedAt),
src/app/api/activity/record/route.ts-1266-    });
src/app/api/activity/record/route.ts-1267-
src/app/api/activity/record/route.ts:1268:    const valueObjectBridgeResult = await processActivityValueObjectBridge({
src/app/api/activity/record/route.ts-1269-      supabase,
src/app/api/activity/record/route.ts-1270-      eventId: createdEvent.id,
src/app/api/activity/record/route.ts-1271-      processorName: "activity_record_route_p4_7_7",
src/app/api/activity/record/route.ts-1272-    });
src/app/api/activity/record/route.ts-1273-
```

## 10. Category Derivation route references

```text
Pattern: runCategoryDerivationForRoute

NO MATCH.
```

## 11. resolveCategoryCandidates references

```text
Pattern: resolveCategoryCandidates

lib/activity/categoryDerivation/resolver.ts-251-    row: result.data ?? null,
lib/activity/categoryDerivation/resolver.ts-252-    error: errorMessage(result.error),
lib/activity/categoryDerivation/resolver.ts-253-  };
lib/activity/categoryDerivation/resolver.ts-254-}
lib/activity/categoryDerivation/resolver.ts-255-
lib/activity/categoryDerivation/resolver.ts:256:export async function resolveCategoryCandidates(
lib/activity/categoryDerivation/resolver.ts-257-  supabase: CategoryResolverSupabaseClient,
lib/activity/categoryDerivation/resolver.ts-258-  candidates: CategoryCandidate[],
lib/activity/categoryDerivation/resolver.ts-259-  options: CategoryResolverOptions = {},
lib/activity/categoryDerivation/resolver.ts-260-): Promise<CategoryResolutionResult> {
lib/activity/categoryDerivation/resolver.ts-261-  const createPolicy = options.createPolicy ?? "suggested_only";
--
lib/activity/categoryDerivation/resolver.ts-436-    },
lib/activity/categoryDerivation/resolver.ts-437-  };
lib/activity/categoryDerivation/resolver.ts-438-}
lib/activity/categoryDerivation/resolver.ts-439-
lib/activity/categoryDerivation/resolver.ts-440-export const categoryDerivationResolver = {
lib/activity/categoryDerivation/resolver.ts:441:  resolveCategoryCandidates,
lib/activity/categoryDerivation/resolver.ts-442-};
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-9-import { processActivityValueObjectBridge } from "../../../../../../lib/activity/activityValueObjectLifecycle";
src/app/api/activity/debug/free-text-value-object-test/route.ts-10-import { safeCreateActivityProcessingLog } from "../../../../../../lib/activity/activityProcessingLogs";
src/app/api/activity/debug/free-text-value-object-test/route.ts-11-import { supabase } from "../../../../../../lib/supabase";
src/app/api/activity/debug/free-text-value-object-test/route.ts-12-import { deriveCategoryCandidates } from "../../../../../../lib/activity/categoryDerivation/ruleExtractor";
src/app/api/activity/debug/free-text-value-object-test/route.ts-13-import {
src/app/api/activity/debug/free-text-value-object-test/route.ts:14:  resolveCategoryCandidates,
src/app/api/activity/debug/free-text-value-object-test/route.ts-15-  type CategoryResolverCreatePolicy,
src/app/api/activity/debug/free-text-value-object-test/route.ts-16-  type CategoryResolverSupabaseClient,
src/app/api/activity/debug/free-text-value-object-test/route.ts-17-} from "../../../../../../lib/activity/categoryDerivation/resolver";
src/app/api/activity/debug/free-text-value-object-test/route.ts-18-import {
src/app/api/activity/debug/free-text-value-object-test/route.ts-19-  persistCategoryDerivations,
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-560-      },
src/app/api/activity/debug/free-text-value-object-test/route.ts-561-    };
src/app/api/activity/debug/free-text-value-object-test/route.ts-562-
src/app/api/activity/debug/free-text-value-object-test/route.ts-563-    const extractionResult = deriveCategoryCandidates(derivationInput);
src/app/api/activity/debug/free-text-value-object-test/route.ts-564-
src/app/api/activity/debug/free-text-value-object-test/route.ts:565:    const resolutionResult = await resolveCategoryCandidates(
src/app/api/activity/debug/free-text-value-object-test/route.ts-566-      supabase as unknown as CategoryResolverSupabaseClient,
src/app/api/activity/debug/free-text-value-object-test/route.ts-567-      extractionResult.candidates,
src/app/api/activity/debug/free-text-value-object-test/route.ts-568-      {
src/app/api/activity/debug/free-text-value-object-test/route.ts-569-        createPolicy: options.createPolicy,
src/app/api/activity/debug/free-text-value-object-test/route.ts-570-        dryRun: options.dryRun,
```

## 12. create activity route candidates

```text
Pattern: duration_minutes

lib/activity/activityImpactProcessor.ts-347-  rule: ImpactRuleRow;
lib/activity/activityImpactProcessor.ts-348-  durationMinutes: number | null;
lib/activity/activityImpactProcessor.ts-349-}) {
lib/activity/activityImpactProcessor.ts-350-  const { rule, durationMinutes } = params;
lib/activity/activityImpactProcessor.ts-351-
lib/activity/activityImpactProcessor.ts:352:  if (rule.impact_value_mode === "duration_minutes") {
lib/activity/activityImpactProcessor.ts-353-    return {
lib/activity/activityImpactProcessor.ts-354-      impactValueNumeric: durationMinutes,
lib/activity/activityImpactProcessor.ts-355-      impactValueText: rule.impact_value_text,
lib/activity/activityImpactProcessor.ts-356-    };
lib/activity/activityImpactProcessor.ts-357-  }
--
lib/activity/categoryDerivation/ruleExtractor.ts-96-    semanticLayer: "metric",
lib/activity/categoryDerivation/ruleExtractor.ts-97-    categoryType: "measurement",
lib/activity/categoryDerivation/ruleExtractor.ts-98-    confidence: 0.98,
lib/activity/categoryDerivation/ruleExtractor.ts-99-    isRequired: true,
lib/activity/categoryDerivation/ruleExtractor.ts-100-    isConfirmed: true,
lib/activity/categoryDerivation/ruleExtractor.ts:101:    metadata: makeMetadata("duration_minutes_metric", ["durationMinutes or minute expression"]),
lib/activity/categoryDerivation/ruleExtractor.ts-102-  });
lib/activity/categoryDerivation/ruleExtractor.ts-103-}
lib/activity/categoryDerivation/ruleExtractor.ts-104-
lib/activity/categoryDerivation/ruleExtractor.ts-105-export function deriveCategoryCandidates(
lib/activity/categoryDerivation/ruleExtractor.ts-106-  input: CategoryDerivationInput,
--
lib/activity/importedActivityTemplateMapping.ts-55-  status: string | null;
lib/activity/importedActivityTemplateMapping.ts-56-  is_active: boolean | null;
lib/activity/importedActivityTemplateMapping.ts-57-  owner_user_id: string | null;
lib/activity/importedActivityTemplateMapping.ts-58-  default_activity_type_id: string | null;
lib/activity/importedActivityTemplateMapping.ts-59-  legacy_activity_code_template_id: string | null;
lib/activity/importedActivityTemplateMapping.ts:60:  default_duration_minutes: number | null;
lib/activity/importedActivityTemplateMapping.ts-61-  default_status: string | null;
lib/activity/importedActivityTemplateMapping.ts-62-  default_source_type: string | null;
lib/activity/importedActivityTemplateMapping.ts-63-  default_privacy_scope: string | null;
lib/activity/importedActivityTemplateMapping.ts-64-  default_metadata_json: Record<string, unknown> | null;
lib/activity/importedActivityTemplateMapping.ts-65-  sort_order: number | null;
--
lib/activity/importedActivityTemplateMapping.ts-400-async function loadActiveTemplates(userId: string) {
lib/activity/importedActivityTemplateMapping.ts-401-  const { data: systemTemplatesData, error: systemTemplatesError } =
lib/activity/importedActivityTemplateMapping.ts-402-    await supabase
lib/activity/importedActivityTemplateMapping.ts-403-      .from("activity_templates")
lib/activity/importedActivityTemplateMapping.ts-404-      .select(
lib/activity/importedActivityTemplateMapping.ts:405:        "id, slug, title, short_title, description, template_group, template_scope, source_type, status, is_active, owner_user_id, default_activity_type_id, legacy_activity_code_template_id, default_duration_minutes, default_status, default_source_type, default_privacy_scope, default_metadata_json, sort_order"
lib/activity/importedActivityTemplateMapping.ts-406-      )
lib/activity/importedActivityTemplateMapping.ts-407-      .eq("template_scope", "system")
lib/activity/importedActivityTemplateMapping.ts-408-      .eq("status", "active")
lib/activity/importedActivityTemplateMapping.ts-409-      .eq("is_active", true)
lib/activity/importedActivityTemplateMapping.ts-410-      .order("sort_order", { ascending: true })
--
lib/activity/importedActivityTemplateMapping.ts-415-  }
lib/activity/importedActivityTemplateMapping.ts-416-
lib/activity/importedActivityTemplateMapping.ts-417-  const { data: userTemplatesData, error: userTemplatesError } = await supabase
lib/activity/importedActivityTemplateMapping.ts-418-    .from("activity_templates")
lib/activity/importedActivityTemplateMapping.ts-419-    .select(
lib/activity/importedActivityTemplateMapping.ts:420:      "id, slug, title, short_title, description, template_group, template_scope, source_type, status, is_active, owner_user_id, default_activity_type_id, legacy_activity_code_template_id, default_duration_minutes, default_status, default_source_type, default_privacy_scope, default_metadata_json, sort_order"
lib/activity/importedActivityTemplateMapping.ts-421-    )
lib/activity/importedActivityTemplateMapping.ts-422-    .eq("template_scope", "user")
lib/activity/importedActivityTemplateMapping.ts-423-    .eq("owner_user_id", userId)
lib/activity/importedActivityTemplateMapping.ts-424-    .eq("status", "active")
lib/activity/importedActivityTemplateMapping.ts-425-    .eq("is_active", true)
--
lib/activity/knownTemplateRegistryMetadata.ts-6-
lib/activity/knownTemplateRegistryMetadata.ts-7-export type KnownTemplateRegistryVersion = "v0.1-default_metadata_json";
lib/activity/knownTemplateRegistryMetadata.ts-8-
lib/activity/knownTemplateRegistryMetadata.ts-9-export type KnownTemplateValueObjectRelationType = "executes";
lib/activity/knownTemplateRegistryMetadata.ts-10-
lib/activity/knownTemplateRegistryMetadata.ts:11:export type KnownTemplateMetricKey = "duration_minutes";
lib/activity/knownTemplateRegistryMetadata.ts-12-
lib/activity/knownTemplateRegistryMetadata.ts-13-export type KnownTemplateMetricUnit = "minutes";
lib/activity/knownTemplateRegistryMetadata.ts-14-
lib/activity/knownTemplateRegistryMetadata.ts-15-export type KnownTemplateDeltaDirection = "increase";
lib/activity/knownTemplateRegistryMetadata.ts-16-
--
lib/activity/knownTemplateRegistryMetadata.ts-312-    `${path}.relationType`
lib/activity/knownTemplateRegistryMetadata.ts-313-  );
lib/activity/knownTemplateRegistryMetadata.ts-314-
lib/activity/knownTemplateRegistryMetadata.ts-315-  const metricKey = expectLiteral(
lib/activity/knownTemplateRegistryMetadata.ts-316-    metricKeyRaw,
lib/activity/knownTemplateRegistryMetadata.ts:317:    "duration_minutes",
lib/activity/knownTemplateRegistryMetadata.ts-318-    errors,
lib/activity/knownTemplateRegistryMetadata.ts-319-    `${path}.metricKey`
lib/activity/knownTemplateRegistryMetadata.ts-320-  );
lib/activity/knownTemplateRegistryMetadata.ts-321-
lib/activity/knownTemplateRegistryMetadata.ts-322-  const metricUnit = expectLiteral(metricUnitRaw, "minutes", errors, `${path}.metricUnit`);
--
lib/activity/rubricatorValueObjectMapper.ts-10-  status: string;
lib/activity/rubricatorValueObjectMapper.ts-11-  title: string | null;
lib/activity/rubricatorValueObjectMapper.ts-12-  description: string | null;
lib/activity/rubricatorValueObjectMapper.ts-13-  input_text: string | null;
lib/activity/rubricatorValueObjectMapper.ts-14-  event_code: string | null;
lib/activity/rubricatorValueObjectMapper.ts:15:  duration_minutes: number | null;
lib/activity/rubricatorValueObjectMapper.ts-16-  started_at: string | null;
lib/activity/rubricatorValueObjectMapper.ts-17-  ended_at: string | null;
lib/activity/rubricatorValueObjectMapper.ts-18-  activity_template_id: string | null;
lib/activity/rubricatorValueObjectMapper.ts-19-  activity_type_id: string | null;
lib/activity/rubricatorValueObjectMapper.ts-20-  template_id: string | null;
--
lib/activity/rubricatorValueObjectMapper.ts-97-    objectTypeCode: "German_language",
lib/activity/rubricatorValueObjectMapper.ts-98-    actionTypeCode: "practice",
lib/activity/rubricatorValueObjectMapper.ts-99-    contextCode: "learning",
lib/activity/rubricatorValueObjectMapper.ts-100-    contextualCategorySlug: "business-german",
lib/activity/rubricatorValueObjectMapper.ts-101-    relationType: "executes",
lib/activity/rubricatorValueObjectMapper.ts:102:    metricKey: "duration_minutes",
lib/activity/rubricatorValueObjectMapper.ts-103-    metricUnit: "minutes",
lib/activity/rubricatorValueObjectMapper.ts-104-    deltaDirection: "increase",
lib/activity/rubricatorValueObjectMapper.ts-105-    aggregateType: "value_object",
lib/activity/rubricatorValueObjectMapper.ts-106-    fallbackNeedleGroups: [
lib/activity/rubricatorValueObjectMapper.ts-107-      ["german", "deutsch", "ð¢ðÁð╝ðÁÐå", "niemieck", "alem├ín"],
--
lib/activity/rubricatorValueObjectMapper.ts-146-    objectTypeCode: "knee",
lib/activity/rubricatorValueObjectMapper.ts-147-    actionTypeCode: "train",
lib/activity/rubricatorValueObjectMapper.ts-148-    contextCode: "health",
lib/activity/rubricatorValueObjectMapper.ts-149-    contextualCategorySlug: "knee-exercises",
lib/activity/rubricatorValueObjectMapper.ts-150-    relationType: "executes",
lib/activity/rubricatorValueObjectMapper.ts:151:    metricKey: "duration_minutes",
lib/activity/rubricatorValueObjectMapper.ts-152-    metricUnit: "minutes",
lib/activity/rubricatorValueObjectMapper.ts-153-    deltaDirection: "increase",
lib/activity/rubricatorValueObjectMapper.ts-154-    aggregateType: "value_object",
lib/activity/rubricatorValueObjectMapper.ts-155-    fallbackNeedleGroups: [
lib/activity/rubricatorValueObjectMapper.ts-156-      ["knee", "ð║ð¥ð╗ðÁð¢ð¥", "kolano", "rodilla", "knie"],
--
lib/activity/rubricatorValueObjectMapper.ts-181-    objectTypeCode: "walking",
lib/activity/rubricatorValueObjectMapper.ts-182-    actionTypeCode: "walk",
lib/activity/rubricatorValueObjectMapper.ts-183-    contextCode: "commute",
lib/activity/rubricatorValueObjectMapper.ts-184-    contextualCategorySlug: "walking-to-work",
lib/activity/rubricatorValueObjectMapper.ts-185-    relationType: "executes",
lib/activity/rubricatorValueObjectMapper.ts:186:    metricKey: "duration_minutes",
lib/activity/rubricatorValueObjectMapper.ts-187-    metricUnit: "minutes",
lib/activity/rubricatorValueObjectMapper.ts-188-    deltaDirection: "increase",
lib/activity/rubricatorValueObjectMapper.ts-189-    aggregateType: "value_object",
lib/activity/rubricatorValueObjectMapper.ts-190-    fallbackNeedleGroups: [
lib/activity/rubricatorValueObjectMapper.ts-191-      [
--
lib/activity/rubricatorValueObjectMapper.ts-336-        "status",
lib/activity/rubricatorValueObjectMapper.ts-337-        "title",
lib/activity/rubricatorValueObjectMapper.ts-338-        "description",
lib/activity/rubricatorValueObjectMapper.ts-339-        "input_text",
lib/activity/rubricatorValueObjectMapper.ts-340-        "event_code",
lib/activity/rubricatorValueObjectMapper.ts:341:        "duration_minutes",
lib/activity/rubricatorValueObjectMapper.ts-342-        "started_at",
lib/activity/rubricatorValueObjectMapper.ts-343-        "ended_at",
lib/activity/rubricatorValueObjectMapper.ts-344-        "activity_template_id",
lib/activity/rubricatorValueObjectMapper.ts-345-        "activity_type_id",
lib/activity/rubricatorValueObjectMapper.ts-346-        "template_id",
--
lib/activity/rubricatorValueObjectMapper.ts-631-      title: rule.valueObjectTitle,
lib/activity/rubricatorValueObjectMapper.ts-632-      description: rule.valueObjectDescription,
lib/activity/rubricatorValueObjectMapper.ts-633-      unit_type: rule.valueObjectUnitType,
lib/activity/rubricatorValueObjectMapper.ts-634-      default_price: null,
lib/activity/rubricatorValueObjectMapper.ts-635-      default_currency: null,
lib/activity/rubricatorValueObjectMapper.ts:636:      default_duration_minutes:
lib/activity/rubricatorValueObjectMapper.ts:637:        rule.defaultDurationMinutes ?? event.duration_minutes,
lib/activity/rubricatorValueObjectMapper.ts-638-      is_marketplace_sellable: false,
lib/activity/rubricatorValueObjectMapper.ts-639-      is_free_possible: false,
lib/activity/rubricatorValueObjectMapper.ts-640-      status: "active",
lib/activity/rubricatorValueObjectMapper.ts-641-    })
lib/activity/rubricatorValueObjectMapper.ts-642-    .select("id")
--
lib/activity/rubricatorValueObjectMapper.ts-705-  valueObjectId: string,
lib/activity/rubricatorValueObjectMapper.ts-706-  classification: RubricatorClassificationSummary | null,
lib/activity/rubricatorValueObjectMapper.ts-707-  valueObjectCreated: boolean,
lib/activity/rubricatorValueObjectMapper.ts-708-  rule: ControlledRubricatorValueObjectRule
lib/activity/rubricatorValueObjectMapper.ts-709-): ValueObjectBridgeMapping | null {
lib/activity/rubricatorValueObjectMapper.ts:710:  if (event.duration_minutes === null) {
lib/activity/rubricatorValueObjectMapper.ts-711-    return null;
lib/activity/rubricatorValueObjectMapper.ts-712-  }
lib/activity/rubricatorValueObjectMapper.ts-713-
lib/activity/rubricatorValueObjectMapper.ts-714-  const confidence = normalizeConfidence(classification?.confidence ?? null);
lib/activity/rubricatorValueObjectMapper.ts-715-
--
lib/activity/rubricatorValueObjectMapper.ts-724-    instanceNote: event.description ?? event.input_text,
lib/activity/rubricatorValueObjectMapper.ts-725-    resultStatus: "completed",
lib/activity/rubricatorValueObjectMapper.ts-726-    qualityScore: null,
lib/activity/rubricatorValueObjectMapper.ts-727-    metricKey: rule.metricKey,
lib/activity/rubricatorValueObjectMapper.ts-728-    metricUnit: rule.metricUnit,
lib/activity/rubricatorValueObjectMapper.ts:729:    deltaValueNumeric: event.duration_minutes,
lib/activity/rubricatorValueObjectMapper.ts-730-    deltaValueText: null,
lib/activity/rubricatorValueObjectMapper.ts-731-    deltaDirection: rule.deltaDirection,
lib/activity/rubricatorValueObjectMapper.ts-732-    aggregateDate: null,
lib/activity/rubricatorValueObjectMapper.ts-733-    aggregateType: rule.aggregateType,
lib/activity/rubricatorValueObjectMapper.ts-734-    aggregateKey: valueObjectId,
--
lib/activity/valueObjectBridge.ts-40-  id: string;
lib/activity/valueObjectBridge.ts-41-  user_id: string;
lib/activity/valueObjectBridge.ts-42-  status: string;
lib/activity/valueObjectBridge.ts-43-  started_at: string | null;
lib/activity/valueObjectBridge.ts-44-  ended_at: string | null;
lib/activity/valueObjectBridge.ts:45:  duration_minutes: number | null;
lib/activity/valueObjectBridge.ts-46-  title: string | null;
lib/activity/valueObjectBridge.ts-47-  description: string | null;
lib/activity/valueObjectBridge.ts-48-  performed_by_actor_id?: string | null;
lib/activity/valueObjectBridge.ts-49-  acting_as_actor_id?: string | null;
lib/activity/valueObjectBridge.ts-50-  acting_for_actor_id?: string | null;
--
lib/activity/valueObjectBridge.ts-457-        "id",
lib/activity/valueObjectBridge.ts-458-        "user_id",
lib/activity/valueObjectBridge.ts-459-        "status",
lib/activity/valueObjectBridge.ts-460-        "started_at",
lib/activity/valueObjectBridge.ts-461-        "ended_at",
lib/activity/valueObjectBridge.ts:462:        "duration_minutes",
lib/activity/valueObjectBridge.ts-463-        "title",
lib/activity/valueObjectBridge.ts-464-        "description",
lib/activity/valueObjectBridge.ts-465-        "performed_by_actor_id",
lib/activity/valueObjectBridge.ts-466-        "acting_as_actor_id",
lib/activity/valueObjectBridge.ts-467-        "acting_for_actor_id",
--
lib/activity/valueObjectBridge.ts-751-    processorName,
lib/activity/valueObjectBridge.ts-752-    mappingMetadata,
lib/activity/valueObjectBridge.ts-753-  } = params;
lib/activity/valueObjectBridge.ts-754-
lib/activity/valueObjectBridge.ts-755-  const projectionSource = normalizeV42ProjectionSource(bridgeSource);
lib/activity/valueObjectBridge.ts:756:  const exposureMinutes = normalizeExposureMinutes(event.duration_minutes);
lib/activity/valueObjectBridge.ts-757-  const nowIso = new Date().toISOString();
lib/activity/valueObjectBridge.ts-758-
lib/activity/valueObjectBridge.ts-759-  const existingProjection = await readExistingV42ProjectionLink(
lib/activity/valueObjectBridge.ts-760-    supabase,
lib/activity/valueObjectBridge.ts-761-    event.id,
--
lib/activity/valueObjectBridge.ts-1324-          null,
lib/activity/valueObjectBridge.ts-1325-        organization_id: ownerContext.organizationId,
lib/activity/valueObjectBridge.ts-1326-        status: mapping.instanceStatus ?? "completed",
lib/activity/valueObjectBridge.ts-1327-        started_at: event.started_at,
lib/activity/valueObjectBridge.ts-1328-        ended_at: event.ended_at,
lib/activity/valueObjectBridge.ts:1329:        duration_minutes: event.duration_minutes,
lib/activity/valueObjectBridge.ts-1330-        instance_title: mapping.instanceTitle ?? event.title,
lib/activity/valueObjectBridge.ts-1331-        instance_note: mapping.instanceNote ?? event.description,
lib/activity/valueObjectBridge.ts-1332-        result_status: mapping.resultStatus ?? null,
lib/activity/valueObjectBridge.ts-1333-        quality_score: mapping.qualityScore ?? null,
lib/activity/valueObjectBridge.ts-1334-        confidence,
--
src/app/activities/page.tsx-25-  title: string;
src/app/activities/page.tsx-26-  description: string | null;
src/app/activities/page.tsx-27-  raw_input: string | null;
src/app/activities/page.tsx-28-  start_time: string | null;
src/app/activities/page.tsx-29-  end_time: string | null;
src/app/activities/page.tsx:30:  duration_minutes: number | null;
src/app/activities/page.tsx-31-  status: string;
src/app/activities/page.tsx-32-  source: string;
src/app/activities/page.tsx-33-  ai_confidence: number | null;
src/app/activities/page.tsx-34-  created_at: string;
src/app/activities/page.tsx-35-  activity_participants: ActivityParticipant[];
--
src/app/activities/page.tsx-115-                  : "Not specified"}
src/app/activities/page.tsx-116-              </p>
src/app/activities/page.tsx-117-
src/app/activities/page.tsx-118-              <p>
src/app/activities/page.tsx-119-                <strong>Duration:</strong>{" "}
src/app/activities/page.tsx:120:                {activity.duration_minutes ?? "Not calculated"} minutes
src/app/activities/page.tsx-121-              </p>
src/app/activities/page.tsx-122-
src/app/activities/page.tsx-123-              <p>
src/app/activities/page.tsx-124-                <strong>Status:</strong> {activity.status}
src/app/activities/page.tsx-125-              </p>
--
src/app/api/activities/route.ts-204-      title,
src/app/api/activities/route.ts-205-      description,
src/app/api/activities/route.ts-206-      raw_input: rawInput,
src/app/api/activities/route.ts-207-      start_time: startTime,
src/app/api/activities/route.ts-208-      end_time: endTime,
src/app/api/activities/route.ts:209:      duration_minutes: durationMinutes,
src/app/api/activities/route.ts-210-      location_id: locationId,
```

## 13. correction/activity timeline routes

```text
Pattern: activity/debug

src/app/api/activity/debug-known-template-registry/route.ts-14-} from "../../../../../lib/activity/knownTemplateRegistryTable";
src/app/api/activity/debug-known-template-registry/route.ts-15-import { supabase } from "../../../../../lib/supabase";
src/app/api/activity/debug-known-template-registry/route.ts-16-
src/app/api/activity/debug-known-template-registry/route.ts-17-export const dynamic = "force-dynamic";
src/app/api/activity/debug-known-template-registry/route.ts-18-
src/app/api/activity/debug-known-template-registry/route.ts:19:const ENDPOINT = "/api/activity/debug-known-template-registry";
src/app/api/activity/debug-known-template-registry/route.ts-20-
src/app/api/activity/debug-known-template-registry/route.ts-21-const DEFAULT_TEMPLATE_SLUGS = [
src/app/api/activity/debug-known-template-registry/route.ts-22-  "german-marketing-handwriting-practice",
src/app/api/activity/debug-known-template-registry/route.ts-23-  "knee-training-health-practice",
src/app/api/activity/debug-known-template-registry/route.ts-24-];
--
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-60-    return {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-61-      ok: false,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-62-      errorResponse: NextResponse.json(
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-63-        {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-64-          ok: false,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts:65:          endpoint: "/api/activity/debug-rubricator-value-object-bridge",
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-66-          error: "Unauthorized.",
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-67-        },
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-68-        { status: 401 }
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-69-      ),
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-70-    };
--
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-80-    return {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-81-      ok: false,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-82-      errorResponse: NextResponse.json(
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-83-        {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-84-          ok: false,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts:85:          endpoint: "/api/activity/debug-rubricator-value-object-bridge",
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-86-          error: error.message,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-87-        },
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-88-        { status: 500 }
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-89-      ),
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-90-    };
--
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-94-    return {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-95-      ok: false,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-96-      errorResponse: NextResponse.json(
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-97-        {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-98-          ok: false,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts:99:          endpoint: "/api/activity/debug-rubricator-value-object-bridge",
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-100-          error: "Authenticated Auth0 user is not linked to app_users.",
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-101-        },
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-102-        { status: 403 }
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-103-      ),
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-104-    };
--
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-125-    return {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-126-      ok: false,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-127-      errorResponse: NextResponse.json(
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-128-        {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-129-          ok: false,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts:130:          endpoint: "/api/activity/debug-rubricator-value-object-bridge",
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-131-          error: error.message,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-132-        },
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-133-        { status: 500 }
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-134-      ),
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-135-    };
--
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-139-    return {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-140-      ok: false,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-141-      errorResponse: NextResponse.json(
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-142-        {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-143-          ok: false,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts:144:          endpoint: "/api/activity/debug-rubricator-value-object-bridge",
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-145-          error: "Activity event not found for current user.",
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-146-        },
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-147-        { status: 404 }
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-148-      ),
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-149-    };
--
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-169-    body = (await request.json()) as RequestBody;
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-170-  } catch {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-171-    return NextResponse.json(
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-172-      {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-173-        ok: false,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts:174:        endpoint: "/api/activity/debug-rubricator-value-object-bridge",
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-175-        error: "Invalid JSON body.",
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-176-      },
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-177-      { status: 400 }
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-178-    );
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-179-  }
--
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-182-
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-183-  if (!eventId) {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-184-    return NextResponse.json(
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-185-      {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-186-        ok: false,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts:187:        endpoint: "/api/activity/debug-rubricator-value-object-bridge",
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-188-        error: "eventId is required.",
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-189-      },
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-190-      { status: 400 }
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-191-    );
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-192-  }
--
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-222-
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-223-  if (!mappingResult.ok) {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-224-    return NextResponse.json(
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-225-      {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-226-        ok: false,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts:227:        endpoint: "/api/activity/debug-rubricator-value-object-bridge",
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-228-        userId: appUser.id,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-229-        dryRun,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-230-        requestedCreateMissingControlledValueObject,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-231-        effectiveCreateMissingControlledValueObject,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-232-        stage: "rubricator_mapping",
--
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-237-  }
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-238-
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-239-  if (mappingResult.skipped || mappingResult.mappings.length === 0) {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-240-    return NextResponse.json({
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-241-      ok: true,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts:242:      endpoint: "/api/activity/debug-rubricator-value-object-bridge",
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-243-      userId: appUser.id,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-244-      dryRun,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-245-      requestedCreateMissingControlledValueObject,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-246-      effectiveCreateMissingControlledValueObject,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-247-      stage: "rubricator_mapping",
--
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-252-  }
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-253-
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-254-  if (dryRun) {
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-255-    return NextResponse.json({
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-256-      ok: true,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts:257:      endpoint: "/api/activity/debug-rubricator-value-object-bridge",
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-258-      userId: appUser.id,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-259-      dryRun,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-260-      requestedCreateMissingControlledValueObject,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-261-      effectiveCreateMissingControlledValueObject,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-262-      stage: "dry_run",
--
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-275-    processorName: "debug_rubricator_value_object_bridge_p4_7_r",
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-276-  });
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-277-
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-278-  return NextResponse.json({
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-279-    ok: mappingResult.ok && bridgeResult.ok,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts:280:    endpoint: "/api/activity/debug-rubricator-value-object-bridge",
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-281-    userId: appUser.id,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-282-    dryRun,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-283-    requestedCreateMissingControlledValueObject,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-284-    effectiveCreateMissingControlledValueObject,
src/app/api/activity/debug-rubricator-value-object-bridge/route.ts-285-    stage: "bridge_executed",
--
src/app/api/activity/debug-trace/route.ts-1463-      {
src/app/api/activity/debug-trace/route.ts-1464-        ok: false,
src/app/api/activity/debug-trace/route.ts-1465-        error:
src/app/api/activity/debug-trace/route.ts-1466-          "Provide at least one filter: eventId, rawSignalId, correctionId or processingRunId.",
src/app/api/activity/debug-trace/route.ts-1467-        examples: [
src/app/api/activity/debug-trace/route.ts:1468:          "/api/activity/debug-trace?eventId=<activity_event_id>",
src/app/api/activity/debug-trace/route.ts:1469:          "/api/activity/debug-trace?rawSignalId=<raw_signal_id>",
src/app/api/activity/debug-trace/route.ts:1470:          "/api/activity/debug-trace?processingRunId=<processing_run_id>",
src/app/api/activity/debug-trace/route.ts:1471:          "/api/activity/debug-trace?correctionId=<activity_correction_id>",
src/app/api/activity/debug-trace/route.ts:1472:          "/api/activity/debug-trace?eventId=<activity_event_id>&mode=summary",
src/app/api/activity/debug-trace/route.ts:1473:          "/api/activity/debug-trace?rawSignalId=<raw_signal_id>&mode=summary",
src/app/api/activity/debug-trace/route.ts-1474-        ],
src/app/api/activity/debug-trace/route.ts-1475-      },
src/app/api/activity/debug-trace/route.ts-1476-      { status: 400 }
src/app/api/activity/debug-trace/route.ts-1477-    );
src/app/api/activity/debug-trace/route.ts-1478-  }
--
src/app/api/activity/debug-trace/route.ts-1489-
src/app/api/activity/debug-trace/route.ts-1490-    const summary = buildTraceCounts(trace);
src/app/api/activity/debug-trace/route.ts-1491-
src/app/api/activity/debug-trace/route.ts-1492-    return NextResponse.json({
src/app/api/activity/debug-trace/route.ts-1493-      ok: true,
src/app/api/activity/debug-trace/route.ts:1494:      endpoint: "/api/activity/debug-trace",
src/app/api/activity/debug-trace/route.ts-1495-      mode,
src/app/api/activity/debug-trace/route.ts-1496-      filters: {
src/app/api/activity/debug-trace/route.ts-1497-        requested: requestedFilters,
src/app/api/activity/debug-trace/route.ts-1498-        expanded: {
src/app/api/activity/debug-trace/route.ts-1499-          eventIds: Array.from(eventIds),
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-512-      ]),
src/app/api/activity/debug/free-text-value-object-test/route.ts-513-      categoryType: readStringField(candidate, ["categoryType", "category_type"]),
src/app/api/activity/debug/free-text-value-object-test/route.ts-514-      resolutionStatus,
src/app/api/activity/debug/free-text-value-object-test/route.ts-515-      metadata: {
src/app/api/activity/debug/free-text-value-object-test/route.ts-516-        sourceLayer: "category_derivation",
src/app/api/activity/debug/free-text-value-object-test/route.ts:517:        sourceRoute: "/api/activity/debug/free-text-value-object-test",
src/app/api/activity/debug/free-text-value-object-test/route.ts-518-        p4Step: "P4.10.0-C8-P3-B5-B3",
src/app/api/activity/debug/free-text-value-object-test/route.ts-519-      },
src/app/api/activity/debug/free-text-value-object-test/route.ts-520-    });
src/app/api/activity/debug/free-text-value-object-test/route.ts-521-  }
src/app/api/activity/debug/free-text-value-object-test/route.ts-522-
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-552-      durationMinutes: params.durationMinutes,
src/app/api/activity/debug/free-text-value-object-test/route.ts-553-      inputLanguage: null,
src/app/api/activity/debug/free-text-value-object-test/route.ts-554-      actorId: params.personActorId,
src/app/api/activity/debug/free-text-value-object-test/route.ts-555-      organizationId: null,
src/app/api/activity/debug/free-text-value-object-test/route.ts-556-      metadata: {
src/app/api/activity/debug/free-text-value-object-test/route.ts:557:        endpoint: "/api/activity/debug/free-text-value-object-test",
src/app/api/activity/debug/free-text-value-object-test/route.ts-558-        p4Step: "P4.10.0-C8-O1",
src/app/api/activity/debug/free-text-value-object-test/route.ts-559-        featureFlag: "categoryDerivation",
src/app/api/activity/debug/free-text-value-object-test/route.ts-560-      },
src/app/api/activity/debug/free-text-value-object-test/route.ts-561-    };
src/app/api/activity/debug/free-text-value-object-test/route.ts-562-
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-644-}
src/app/api/activity/debug/free-text-value-object-test/route.ts-645-
src/app/api/activity/debug/free-text-value-object-test/route.ts-646-export async function GET() {
src/app/api/activity/debug/free-text-value-object-test/route.ts-647-  return NextResponse.json({
src/app/api/activity/debug/free-text-value-object-test/route.ts-648-    ok: true,
src/app/api/activity/debug/free-text-value-object-test/route.ts:649:    endpoint: "/api/activity/debug/free-text-value-object-test",
src/app/api/activity/debug/free-text-value-object-test/route.ts-650-    enabled: ACTIVITY_RECORDING_ENABLED,
src/app/api/activity/debug/free-text-value-object-test/route.ts-651-    status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
src/app/api/activity/debug/free-text-value-object-test/route.ts-652-    message: ACTIVITY_RECORDING_ENABLED
src/app/api/activity/debug/free-text-value-object-test/route.ts-653-      ? "Debug-only endpoint for testing completed free-text Activity Event -> Value Object fallback mapping."
src/app/api/activity/debug/free-text-value-object-test/route.ts-654-      : ACTIVITY_RECORDING_DISABLED_MESSAGE,
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-887-        derivationRowsCreated:
src/app/api/activity/debug/free-text-value-object-test/route.ts-888-          categoryDerivationResult.persistence?.derivationRowsCreated ?? null,
src/app/api/activity/debug/free-text-value-object-test/route.ts-889-      },
src/app/api/activity/debug/free-text-value-object-test/route.ts-890-    },
src/app/api/activity/debug/free-text-value-object-test/route.ts-891-    metadata: {
src/app/api/activity/debug/free-text-value-object-test/route.ts:892:      endpoint: "/api/activity/debug/free-text-value-object-test",
src/app/api/activity/debug/free-text-value-object-test/route.ts-893-      p4Step: "P4.10.0-C8-O1",
src/app/api/activity/debug/free-text-value-object-test/route.ts-894-    },
src/app/api/activity/debug/free-text-value-object-test/route.ts-895-    startedAt: processingStartedAt.toISOString(),
src/app/api/activity/debug/free-text-value-object-test/route.ts-896-    finishedAt: new Date().toISOString(),
src/app/api/activity/debug/free-text-value-object-test/route.ts-897-    durationMs: new Date().getTime() - processingStartedAt.getTime(),
```

## 14. production activity API candidates

```text
Pattern: /api/activity

src/app/activity-capture/page.tsx-271-  async function loadTemplates() {
src/app/activity-capture/page.tsx-272-    setTemplatesLoading(true);
src/app/activity-capture/page.tsx-273-    setTemplatesError(null);
src/app/activity-capture/page.tsx-274-
src/app/activity-capture/page.tsx-275-    try {
src/app/activity-capture/page.tsx:276:      const response = await fetch("/api/activity/templates?limit=50", {
src/app/activity-capture/page.tsx-277-        method: "GET",
src/app/activity-capture/page.tsx-278-        headers: {
src/app/activity-capture/page.tsx-279-          Accept: "application/json",
src/app/activity-capture/page.tsx-280-        },
src/app/activity-capture/page.tsx-281-      });
--
src/app/activity-capture/page.tsx-309-
src/app/activity-capture/page.tsx-310-  async function loadRecentEvents() {
src/app/activity-capture/page.tsx-311-    setRecentEventsLoading(true);
src/app/activity-capture/page.tsx-312-
src/app/activity-capture/page.tsx-313-    try {
src/app/activity-capture/page.tsx:314:      const response = await fetch("/api/activity/events?limit=20", {
src/app/activity-capture/page.tsx-315-        method: "GET",
src/app/activity-capture/page.tsx-316-        headers: {
src/app/activity-capture/page.tsx-317-          Accept: "application/json",
src/app/activity-capture/page.tsx-318-        },
src/app/activity-capture/page.tsx-319-      });
--
src/app/activity-capture/page.tsx-364-    setRecordLoading(true);
src/app/activity-capture/page.tsx-365-    setRecordError(null);
src/app/activity-capture/page.tsx-366-    setRecordResult(null);
src/app/activity-capture/page.tsx-367-
src/app/activity-capture/page.tsx-368-    try {
src/app/activity-capture/page.tsx:369:      const response = await fetch("/api/activity/record", {
src/app/activity-capture/page.tsx-370-        method: "POST",
src/app/activity-capture/page.tsx-371-        headers: {
src/app/activity-capture/page.tsx-372-          "Content-Type": "application/json",
src/app/activity-capture/page.tsx-373-          Accept: "application/json",
src/app/activity-capture/page.tsx-374-        },
--
src/app/activity-capture/page.tsx-406-    setStartLoading(true);
src/app/activity-capture/page.tsx-407-    setRecordError(null);
src/app/activity-capture/page.tsx-408-    setRecordResult(null);
src/app/activity-capture/page.tsx-409-
src/app/activity-capture/page.tsx-410-    try {
src/app/activity-capture/page.tsx:411:      const response = await fetch("/api/activity/start", {
src/app/activity-capture/page.tsx-412-        method: "POST",
src/app/activity-capture/page.tsx-413-        headers: {
src/app/activity-capture/page.tsx-414-          "Content-Type": "application/json",
src/app/activity-capture/page.tsx-415-          Accept: "application/json",
src/app/activity-capture/page.tsx-416-        },
--
src/app/activity-capture/page.tsx-454-    setCompleteLoadingId(eventId);
src/app/activity-capture/page.tsx-455-    setRecordError(null);
src/app/activity-capture/page.tsx-456-    setRecordResult(null);
src/app/activity-capture/page.tsx-457-
src/app/activity-capture/page.tsx-458-    try {
src/app/activity-capture/page.tsx:459:      const response = await fetch("/api/activity/complete", {
src/app/activity-capture/page.tsx-460-        method: "POST",
src/app/activity-capture/page.tsx-461-        headers: {
src/app/activity-capture/page.tsx-462-          "Content-Type": "application/json",
src/app/activity-capture/page.tsx-463-          Accept: "application/json",
src/app/activity-capture/page.tsx-464-        },
--
src/app/activity-capture/page.tsx-512-              >
src/app/activity-capture/page.tsx-513-                Today Panel
src/app/activity-capture/page.tsx-514-              </Link>
src/app/activity-capture/page.tsx-515-              <Link
src/app/activity-capture/page.tsx-516-                className="rounded-full border border-zinc-700 px-4 py-2 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
src/app/activity-capture/page.tsx:517:                href="/api/activity/templates"
src/app/activity-capture/page.tsx-518-                target="_blank"
src/app/activity-capture/page.tsx-519-              >
src/app/activity-capture/page.tsx-520-                Templates API
src/app/activity-capture/page.tsx-521-              </Link>
src/app/activity-capture/page.tsx-522-              <Link
src/app/activity-capture/page.tsx-523-                className="rounded-full border border-zinc-700 px-4 py-2 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
src/app/activity-capture/page.tsx:524:                href="/api/activity/events?limit=10"
src/app/activity-capture/page.tsx-525-                target="_blank"
src/app/activity-capture/page.tsx-526-              >
src/app/activity-capture/page.tsx-527-                Events API
src/app/activity-capture/page.tsx-528-              </Link>
src/app/activity-capture/page.tsx-529-              <Link
src/app/activity-capture/page.tsx-530-                className="rounded-full border border-zinc-700 px-4 py-2 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
src/app/activity-capture/page.tsx:531:                href="/api/activity/start"
src/app/activity-capture/page.tsx-532-                target="_blank"
src/app/activity-capture/page.tsx-533-              >
src/app/activity-capture/page.tsx-534-                Start API
src/app/activity-capture/page.tsx-535-              </Link>
src/app/activity-capture/page.tsx-536-              <Link
src/app/activity-capture/page.tsx-537-                className="rounded-full border border-zinc-700 px-4 py-2 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
src/app/activity-capture/page.tsx:538:                href="/api/activity/complete"
src/app/activity-capture/page.tsx-539-                target="_blank"
src/app/activity-capture/page.tsx-540-              >
src/app/activity-capture/page.tsx-541-                Complete API
src/app/activity-capture/page.tsx-542-              </Link>
src/app/activity-capture/page.tsx-543-            </div>
--
src/app/activity-today/page.tsx-916-            `Invalid timeline adjustment for ${item.candidate.eventId}.`
src/app/activity-today/page.tsx-917-          );
src/app/activity-today/page.tsx-918-        }
src/app/activity-today/page.tsx-919-
src/app/activity-today/page.tsx-920-        const response = await fetch(
src/app/activity-today/page.tsx:921:          `/api/activity/events/${encodeURIComponent(
src/app/activity-today/page.tsx-922-            item.candidate.eventId
src/app/activity-today/page.tsx-923-          )}`,
src/app/activity-today/page.tsx-924-          {
src/app/activity-today/page.tsx-925-            method: "PATCH",
src/app/activity-today/page.tsx-926-            headers: {
--
src/app/activity-today/page.tsx-1938-    setLoading(true);
src/app/activity-today/page.tsx-1939-    setError(null);
src/app/activity-today/page.tsx-1940-
src/app/activity-today/page.tsx-1941-    try {
src/app/activity-today/page.tsx-1942-      const response = await fetch(
src/app/activity-today/page.tsx:1943:        `/api/activity/day-summary?date=${encodeURIComponent(
src/app/activity-today/page.tsx-1944-          targetDate
src/app/activity-today/page.tsx-1945-        )}&timezone=${encodeURIComponent(DEFAULT_TIMEZONE)}&limit=20`,
src/app/activity-today/page.tsx-1946-        {
src/app/activity-today/page.tsx-1947-          method: "GET",
src/app/activity-today/page.tsx-1948-          headers: {
--
src/app/activity-today/page.tsx-2011-      response: correctionHistoryStates[eventId]?.response ?? null,
src/app/activity-today/page.tsx-2012-    });
src/app/activity-today/page.tsx-2013-
src/app/activity-today/page.tsx-2014-    try {
src/app/activity-today/page.tsx-2015-      const response = await fetch(
src/app/activity-today/page.tsx:2016:        `/api/activity/events/${encodeURIComponent(
src/app/activity-today/page.tsx-2017-          eventId
src/app/activity-today/page.tsx-2018-        )}/corrections?limit=20`,
src/app/activity-today/page.tsx-2019-        {
src/app/activity-today/page.tsx-2020-          method: "GET",
src/app/activity-today/page.tsx-2021-          headers: {
--
src/app/activity-today/page.tsx-2136-      result: null,
src/app/activity-today/page.tsx-2137-    });
src/app/activity-today/page.tsx-2138-
src/app/activity-today/page.tsx-2139-    try {
src/app/activity-today/page.tsx-2140-      const response = await fetch(
src/app/activity-today/page.tsx:2141:        `/api/activity/events/${encodeURIComponent(event.id)}`,
src/app/activity-today/page.tsx-2142-        {
src/app/activity-today/page.tsx-2143-          method: "PATCH",
src/app/activity-today/page.tsx-2144-          headers: {
src/app/activity-today/page.tsx-2145-            "Content-Type": "application/json",
src/app/activity-today/page.tsx-2146-            Accept: "application/json",
--
src/app/activity-today/page.tsx-2227-              >
src/app/activity-today/page.tsx-2228-                Capture UI
src/app/activity-today/page.tsx-2229-              </Link>
src/app/activity-today/page.tsx-2230-              <Link
src/app/activity-today/page.tsx-2231-                className="rounded-full border border-zinc-700 px-4 py-2 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
src/app/activity-today/page.tsx:2232:                href={`/api/activity/day-summary?date=${encodeURIComponent(
src/app/activity-today/page.tsx-2233-                  date
src/app/activity-today/page.tsx-2234-                )}&timezone=${encodeURIComponent(DEFAULT_TIMEZONE)}`}
src/app/activity-today/page.tsx-2235-                target="_blank"
src/app/activity-today/page.tsx-2236-              >
src/app/activity-today/page.tsx-2237-                Day Summary API
src/app/activity-today/page.tsx-2238-              </Link>
src/app/activity-today/page.tsx-2239-              <Link
src/app/activity-today/page.tsx-2240-                className="rounded-full border border-zinc-700 px-4 py-2 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
src/app/activity-today/page.tsx:2241:                href="/api/activity/events?limit=10"
src/app/activity-today/page.tsx-2242-                target="_blank"
src/app/activity-today/page.tsx-2243-              >
src/app/activity-today/page.tsx-2244-                Events API
src/app/activity-today/page.tsx-2245-              </Link>
src/app/activity-today/page.tsx-2246-            </div>
--
src/app/api/activity/complete/route.ts-217-}
src/app/api/activity/complete/route.ts-218-
src/app/api/activity/complete/route.ts-219-export async function GET() {
src/app/api/activity/complete/route.ts-220-  return NextResponse.json({
src/app/api/activity/complete/route.ts-221-    ok: true,
src/app/api/activity/complete/route.ts:222:    endpoint: "/api/activity/complete",
src/app/api/activity/complete/route.ts-223-    method: "POST",
src/app/api/activity/complete/route.ts-224-    enabled: ACTIVITY_RECORDING_ENABLED,
src/app/api/activity/complete/route.ts-225-    status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
src/app/api/activity/complete/route.ts-226-    message: ACTIVITY_RECORDING_ENABLED
src/app/api/activity/complete/route.ts-227-      ? "Complete a previously started activity event and process rule-based impacts."
--
src/app/api/activity/complete/route.ts-407-    userId: appUser.id,
src/app/api/activity/complete/route.ts-408-    sourceType: "manual_form",
src/app/api/activity/complete/route.ts-409-    sourceEventId: event.id,
src/app/api/activity/complete/route.ts-410-    idempotencyKey: `${event.id}:complete:${timing.endedAt}:${timing.durationMinutes}`,
src/app/api/activity/complete/route.ts-411-    rawPayload: {
src/app/api/activity/complete/route.ts:412:      endpoint: "/api/activity/complete",
src/app/api/activity/complete/route.ts-413-      body,
src/app/api/activity/complete/route.ts-414-      eventId: event.id,
src/app/api/activity/complete/route.ts-415-      previousStatus: event.status,
src/app/api/activity/complete/route.ts-416-      timing,
src/app/api/activity/complete/route.ts-417-    },
--
src/app/api/activity/complete/route.ts-473-      ? {}
src/app/api/activity/complete/route.ts-474-      : {
src/app/api/activity/complete/route.ts-475-          message: rawSignalResult.error,
src/app/api/activity/complete/route.ts-476-        },
src/app/api/activity/complete/route.ts-477-    metadata: {
src/app/api/activity/complete/route.ts:478:      endpoint: "/api/activity/complete",
src/app/api/activity/complete/route.ts-479-      mode: "template_first_complete",
src/app/api/activity/complete/route.ts-480-    },
src/app/api/activity/complete/route.ts-481-    startedAt: processingStartedAt.toISOString(),
src/app/api/activity/complete/route.ts-482-    finishedAt: new Date().toISOString(),
src/app/api/activity/complete/route.ts-483-    durationMs: getDurationMs(processingStartedAt),
--
src/app/api/activity/complete/route.ts-538-      },
src/app/api/activity/complete/route.ts-539-      error: {
src/app/api/activity/complete/route.ts-540-        message: updateError?.message ?? "Failed to complete activity event.",
src/app/api/activity/complete/route.ts-541-      },
src/app/api/activity/complete/route.ts-542-      metadata: {
src/app/api/activity/complete/route.ts:543:        endpoint: "/api/activity/complete",
src/app/api/activity/complete/route.ts-544-        mode: "template_first_complete",
src/app/api/activity/complete/route.ts-545-      },
src/app/api/activity/complete/route.ts-546-      startedAt: processingStartedAt.toISOString(),
src/app/api/activity/complete/route.ts-547-      finishedAt: new Date().toISOString(),
src/app/api/activity/complete/route.ts-548-      durationMs: getDurationMs(processingStartedAt),
--
src/app/api/activity/complete/route.ts-579-      activityEventId: updatedEvent.id,
src/app/api/activity/complete/route.ts-580-      status: updatedEvent.status,
src/app/api/activity/complete/route.ts-581-      processingStatus: updatedEvent.processing_status,
src/app/api/activity/complete/route.ts-582-    },
src/app/api/activity/complete/route.ts-583-    metadata: {
src/app/api/activity/complete/route.ts:584:      endpoint: "/api/activity/complete",
src/app/api/activity/complete/route.ts-585-      mode: "template_first_complete",
src/app/api/activity/complete/route.ts-586-    },
src/app/api/activity/complete/route.ts-587-    startedAt: processingStartedAt.toISOString(),
src/app/api/activity/complete/route.ts-588-    finishedAt: new Date().toISOString(),
src/app/api/activity/complete/route.ts-589-    durationMs: getDurationMs(processingStartedAt),
--
src/app/api/activity/complete/route.ts-634-        message: "Completed activity was processed, but raw signal could not be marked as processed.",
src/app/api/activity/complete/route.ts-635-        error: {
src/app/api/activity/complete/route.ts-636-          message: processedSignalResult.error,
src/app/api/activity/complete/route.ts-637-        },
src/app/api/activity/complete/route.ts-638-        metadata: {
src/app/api/activity/complete/route.ts:639:          endpoint: "/api/activity/complete",
src/app/api/activity/complete/route.ts-640-          mode: "template_first_complete",
src/app/api/activity/complete/route.ts-641-        },
src/app/api/activity/complete/route.ts-642-        startedAt: processingStartedAt.toISOString(),
src/app/api/activity/complete/route.ts-643-        finishedAt: new Date().toISOString(),
src/app/api/activity/complete/route.ts-644-        durationMs: getDurationMs(processingStartedAt),
--
src/app/api/activity/complete/route.ts-666-        skipped: impactResult.skipped,
src/app/api/activity/complete/route.ts-667-        reason: impactResult.reason,
src/app/api/activity/complete/route.ts-668-        counts: impactResult.counts,
src/app/api/activity/complete/route.ts-669-      },
src/app/api/activity/complete/route.ts-670-      metadata: {
src/app/api/activity/complete/route.ts:671:        endpoint: "/api/activity/complete",
src/app/api/activity/complete/route.ts-672-        mode: "template_first_complete",
src/app/api/activity/complete/route.ts-673-      },
src/app/api/activity/complete/route.ts-674-      startedAt: processingStartedAt.toISOString(),
src/app/api/activity/complete/route.ts-675-      finishedAt: new Date().toISOString(),
src/app/api/activity/complete/route.ts-676-      durationMs: getDurationMs(processingStartedAt),
--
src/app/api/activity/complete/route.ts-718-        created: rubricatorClassificationResult.created,
src/app/api/activity/complete/route.ts-719-        alreadyExisted: rubricatorClassificationResult.alreadyExisted,
src/app/api/activity/complete/route.ts-720-        errors: rubricatorClassificationResult.errors,
src/app/api/activity/complete/route.ts-721-      },
src/app/api/activity/complete/route.ts-722-      metadata: {
src/app/api/activity/complete/route.ts:723:        endpoint: "/api/activity/complete",
src/app/api/activity/complete/route.ts-724-        mode: "template_first_complete",
src/app/api/activity/complete/route.ts-725-        p4Step: "P4.7.8-R-G1",
src/app/api/activity/complete/route.ts-726-        ruleResolver: buildRubricatorResolverLogMetadata(rubricatorClassificationResult),
src/app/api/activity/complete/route.ts-727-      },
src/app/api/activity/complete/route.ts-728-      startedAt: processingStartedAt.toISOString(),
--
src/app/api/activity/complete/route.ts-762-        mappingsCount: valueObjectBridgeResult.mappingResult?.mappings.length ?? 0,
src/app/api/activity/complete/route.ts-763-        bridgeCreatedCount: valueObjectBridgeResult.bridgeResult?.created.length ?? 0,
```

## 15. feature flag / enabled references

```text
Pattern: enableCategoryDerivation

src/app/api/activity/debug/free-text-value-object-test/route.ts-30-  title?: unknown;
src/app/api/activity/debug/free-text-value-object-test/route.ts-31-  description?: unknown;
src/app/api/activity/debug/free-text-value-object-test/route.ts-32-  durationMinutes?: unknown;
src/app/api/activity/debug/free-text-value-object-test/route.ts-33-  startedAt?: unknown;
src/app/api/activity/debug/free-text-value-object-test/route.ts-34-  endedAt?: unknown;
src/app/api/activity/debug/free-text-value-object-test/route.ts:35:  enableCategoryDerivation?: unknown;
src/app/api/activity/debug/free-text-value-object-test/route.ts-36-  categoryDerivationEnabled?: unknown;
src/app/api/activity/debug/free-text-value-object-test/route.ts-37-  categoryDerivation?: unknown;
src/app/api/activity/debug/free-text-value-object-test/route.ts-38-  categoryDerivationDryRun?: unknown;
src/app/api/activity/debug/free-text-value-object-test/route.ts-39-  categoryDerivationCreatePolicy?: unknown;
src/app/api/activity/debug/free-text-value-object-test/route.ts-40-};
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-137-  body: FreeTextValueObjectTestBody
src/app/api/activity/debug/free-text-value-object-test/route.ts-138-):
src/app/api/activity/debug/free-text-value-object-test/route.ts-139-  | { ok: true; options: CategoryDerivationRouteOptions }
src/app/api/activity/debug/free-text-value-object-test/route.ts-140-  | { ok: false; error: string } {
src/app/api/activity/debug/free-text-value-object-test/route.ts-141-  const enabled =
src/app/api/activity/debug/free-text-value-object-test/route.ts:142:    asBoolean(body.enableCategoryDerivation) ??
src/app/api/activity/debug/free-text-value-object-test/route.ts-143-    asBoolean(body.categoryDerivationEnabled) ??
src/app/api/activity/debug/free-text-value-object-test/route.ts-144-    asBoolean(body.categoryDerivation) ??
src/app/api/activity/debug/free-text-value-object-test/route.ts-145-    false;
src/app/api/activity/debug/free-text-value-object-test/route.ts-146-
src/app/api/activity/debug/free-text-value-object-test/route.ts-147-  const dryRun = asBoolean(body.categoryDerivationDryRun) ?? false;
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-653-      ? "Debug-only endpoint for testing completed free-text Activity Event -> Value Object fallback mapping."
src/app/api/activity/debug/free-text-value-object-test/route.ts-654-      : ACTIVITY_RECORDING_DISABLED_MESSAGE,
src/app/api/activity/debug/free-text-value-object-test/route.ts-655-    categoryDerivation: {
src/app/api/activity/debug/free-text-value-object-test/route.ts-656-      available: true,
src/app/api/activity/debug/free-text-value-object-test/route.ts-657-      defaultEnabled: false,
src/app/api/activity/debug/free-text-value-object-test/route.ts:658:      enableFlag: "enableCategoryDerivation",
src/app/api/activity/debug/free-text-value-object-test/route.ts-659-      dryRunFlag: "categoryDerivationDryRun",
src/app/api/activity/debug/free-text-value-object-test/route.ts-660-      createPolicyField: "categoryDerivationCreatePolicy",
src/app/api/activity/debug/free-text-value-object-test/route.ts-661-      createPolicyValues: [
src/app/api/activity/debug/free-text-value-object-test/route.ts-662-        "never",
src/app/api/activity/debug/free-text-value-object-test/route.ts-663-        "suggested_only",
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-666-    },
src/app/api/activity/debug/free-text-value-object-test/route.ts-667-    example: {
src/app/api/activity/debug/free-text-value-object-test/route.ts-668-      inputText: "walked to work for 15 minutes",
src/app/api/activity/debug/free-text-value-object-test/route.ts-669-      durationMinutes: 15,
src/app/api/activity/debug/free-text-value-object-test/route.ts-670-      title: "Walked to work",
src/app/api/activity/debug/free-text-value-object-test/route.ts:671:      enableCategoryDerivation: true,
src/app/api/activity/debug/free-text-value-object-test/route.ts-672-      categoryDerivationCreatePolicy: "suggested_only",
src/app/api/activity/debug/free-text-value-object-test/route.ts-673-      categoryDerivationDryRun: false,
src/app/api/activity/debug/free-text-value-object-test/route.ts-674-    },
src/app/api/activity/debug/free-text-value-object-test/route.ts-675-  });
src/app/api/activity/debug/free-text-value-object-test/route.ts-676-}
```

## 16. dryRun references

```text
Pattern: categoryDerivationDryRun

src/app/api/activity/debug/free-text-value-object-test/route.ts-33-  startedAt?: unknown;
src/app/api/activity/debug/free-text-value-object-test/route.ts-34-  endedAt?: unknown;
src/app/api/activity/debug/free-text-value-object-test/route.ts-35-  enableCategoryDerivation?: unknown;
src/app/api/activity/debug/free-text-value-object-test/route.ts-36-  categoryDerivationEnabled?: unknown;
src/app/api/activity/debug/free-text-value-object-test/route.ts-37-  categoryDerivation?: unknown;
src/app/api/activity/debug/free-text-value-object-test/route.ts:38:  categoryDerivationDryRun?: unknown;
src/app/api/activity/debug/free-text-value-object-test/route.ts-39-  categoryDerivationCreatePolicy?: unknown;
src/app/api/activity/debug/free-text-value-object-test/route.ts-40-};
src/app/api/activity/debug/free-text-value-object-test/route.ts-41-
src/app/api/activity/debug/free-text-value-object-test/route.ts-42-type CategoryDerivationRouteOptions = {
src/app/api/activity/debug/free-text-value-object-test/route.ts-43-  enabled: boolean;
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-142-    asBoolean(body.enableCategoryDerivation) ??
src/app/api/activity/debug/free-text-value-object-test/route.ts-143-    asBoolean(body.categoryDerivationEnabled) ??
src/app/api/activity/debug/free-text-value-object-test/route.ts-144-    asBoolean(body.categoryDerivation) ??
src/app/api/activity/debug/free-text-value-object-test/route.ts-145-    false;
src/app/api/activity/debug/free-text-value-object-test/route.ts-146-
src/app/api/activity/debug/free-text-value-object-test/route.ts:147:  const dryRun = asBoolean(body.categoryDerivationDryRun) ?? false;
src/app/api/activity/debug/free-text-value-object-test/route.ts-148-
src/app/api/activity/debug/free-text-value-object-test/route.ts-149-  const rawCreatePolicy =
src/app/api/activity/debug/free-text-value-object-test/route.ts-150-    asString(body.categoryDerivationCreatePolicy) ?? "suggested_only";
src/app/api/activity/debug/free-text-value-object-test/route.ts-151-
src/app/api/activity/debug/free-text-value-object-test/route.ts-152-  const allowedPolicies: CategoryResolverCreatePolicy[] = [
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-419-  return result;
src/app/api/activity/debug/free-text-value-object-test/route.ts-420-}
src/app/api/activity/debug/free-text-value-object-test/route.ts-421-
src/app/api/activity/debug/free-text-value-object-test/route.ts-422-function buildAdditionalCategoryLinksForBridge(params: {
src/app/api/activity/debug/free-text-value-object-test/route.ts-423-  categoryDerivationEnabled: boolean;
src/app/api/activity/debug/free-text-value-object-test/route.ts:424:  categoryDerivationDryRun: boolean;
src/app/api/activity/debug/free-text-value-object-test/route.ts-425-  activityEventId: string;
src/app/api/activity/debug/free-text-value-object-test/route.ts-426-  derivationRunId: string | null;
src/app/api/activity/debug/free-text-value-object-test/route.ts-427-  categoryDerivationResult: unknown;
src/app/api/activity/debug/free-text-value-object-test/route.ts-428-}): AdditionalValueObjectCategoryLink[] | undefined {
src/app/api/activity/debug/free-text-value-object-test/route.ts-429-  const {
src/app/api/activity/debug/free-text-value-object-test/route.ts-430-    categoryDerivationEnabled,
src/app/api/activity/debug/free-text-value-object-test/route.ts:431:    categoryDerivationDryRun,
src/app/api/activity/debug/free-text-value-object-test/route.ts-432-    activityEventId,
src/app/api/activity/debug/free-text-value-object-test/route.ts-433-    derivationRunId,
src/app/api/activity/debug/free-text-value-object-test/route.ts-434-    categoryDerivationResult,
src/app/api/activity/debug/free-text-value-object-test/route.ts-435-  } = params;
src/app/api/activity/debug/free-text-value-object-test/route.ts-436-
src/app/api/activity/debug/free-text-value-object-test/route.ts:437:  if (!categoryDerivationEnabled || categoryDerivationDryRun) {
src/app/api/activity/debug/free-text-value-object-test/route.ts-438-    return undefined;
src/app/api/activity/debug/free-text-value-object-test/route.ts-439-  }
src/app/api/activity/debug/free-text-value-object-test/route.ts-440-
src/app/api/activity/debug/free-text-value-object-test/route.ts-441-  const resolvedCandidates =
src/app/api/activity/debug/free-text-value-object-test/route.ts-442-    collectPossibleResolvedCandidates(categoryDerivationResult);
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-654-      : ACTIVITY_RECORDING_DISABLED_MESSAGE,
src/app/api/activity/debug/free-text-value-object-test/route.ts-655-    categoryDerivation: {
src/app/api/activity/debug/free-text-value-object-test/route.ts-656-      available: true,
src/app/api/activity/debug/free-text-value-object-test/route.ts-657-      defaultEnabled: false,
src/app/api/activity/debug/free-text-value-object-test/route.ts-658-      enableFlag: "enableCategoryDerivation",
src/app/api/activity/debug/free-text-value-object-test/route.ts:659:      dryRunFlag: "categoryDerivationDryRun",
src/app/api/activity/debug/free-text-value-object-test/route.ts-660-      createPolicyField: "categoryDerivationCreatePolicy",
src/app/api/activity/debug/free-text-value-object-test/route.ts-661-      createPolicyValues: [
src/app/api/activity/debug/free-text-value-object-test/route.ts-662-        "never",
src/app/api/activity/debug/free-text-value-object-test/route.ts-663-        "suggested_only",
src/app/api/activity/debug/free-text-value-object-test/route.ts-664-        "active_for_confirmed_required",
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-668-      inputText: "walked to work for 15 minutes",
src/app/api/activity/debug/free-text-value-object-test/route.ts-669-      durationMinutes: 15,
src/app/api/activity/debug/free-text-value-object-test/route.ts-670-      title: "Walked to work",
src/app/api/activity/debug/free-text-value-object-test/route.ts-671-      enableCategoryDerivation: true,
src/app/api/activity/debug/free-text-value-object-test/route.ts-672-      categoryDerivationCreatePolicy: "suggested_only",
src/app/api/activity/debug/free-text-value-object-test/route.ts:673:      categoryDerivationDryRun: false,
src/app/api/activity/debug/free-text-value-object-test/route.ts-674-    },
src/app/api/activity/debug/free-text-value-object-test/route.ts-675-  });
src/app/api/activity/debug/free-text-value-object-test/route.ts-676-}
src/app/api/activity/debug/free-text-value-object-test/route.ts-677-
src/app/api/activity/debug/free-text-value-object-test/route.ts-678-export async function POST(request: Request) {
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-781-      metadata_json: {
src/app/api/activity/debug/free-text-value-object-test/route.ts-782-        parser: "debug_free_text_value_object_test_v1",
src/app/api/activity/debug/free-text-value-object-test/route.ts-783-        p4Step: "P4.10.0-C8-O1",
src/app/api/activity/debug/free-text-value-object-test/route.ts-784-        freeTextValueObjectTest: true,
src/app/api/activity/debug/free-text-value-object-test/route.ts-785-        categoryDerivationEnabled: categoryDerivationOptions.enabled,
src/app/api/activity/debug/free-text-value-object-test/route.ts:786:        categoryDerivationDryRun: categoryDerivationOptions.dryRun,
src/app/api/activity/debug/free-text-value-object-test/route.ts-787-        categoryDerivationCreatePolicy: categoryDerivationOptions.createPolicy,
src/app/api/activity/debug/free-text-value-object-test/route.ts-788-        aiUsed: false,
src/app/api/activity/debug/free-text-value-object-test/route.ts-789-        createdAt: nowIso,
src/app/api/activity/debug/free-text-value-object-test/route.ts-790-      },
src/app/api/activity/debug/free-text-value-object-test/route.ts-791-    })
--
src/app/api/activity/debug/free-text-value-object-test/route.ts-815-  });
src/app/api/activity/debug/free-text-value-object-test/route.ts-816-
src/app/api/activity/debug/free-text-value-object-test/route.ts-817-    const categoryDerivationBridgeAdditionalCategoryLinks =
src/app/api/activity/debug/free-text-value-object-test/route.ts-818-      buildAdditionalCategoryLinksForBridge({
src/app/api/activity/debug/free-text-value-object-test/route.ts-819-        categoryDerivationEnabled: categoryDerivationOptions.enabled,
src/app/api/activity/debug/free-text-value-object-test/route.ts:820:        categoryDerivationDryRun: categoryDerivationOptions.dryRun,
src/app/api/activity/debug/free-text-value-object-test/route.ts-821-        activityEventId: createdEvent.id,
src/app/api/activity/debug/free-text-value-object-test/route.ts-822-        derivationRunId:
src/app/api/activity/debug/free-text-value-object-test/route.ts-823-          categoryDerivationResult.persistence?.derivationRunId ?? null,
src/app/api/activity/debug/free-text-value-object-test/route.ts-824-        categoryDerivationResult,
src/app/api/activity/debug/free-text-value-object-test/route.ts-825-      });
```

## 17. Questions before B7-B patch

- Which route is the real production route for manual free-text activity creation?
- Is production ingestion currently separate from debug/free-text-value-object-test?
- Should Category Derivation be enabled by default only for manual_chat completed activities?
- Should createPolicy stay suggested_only for production MVP?
- Should dryRun remain false only after explicit server-side allowlist?
- Should production route return Category Derivation debug details, or only store them internally?
- Should additionalCategoryLinks be passed to bridge only after categoryDerivation.ok === true?
- Should transient resolver errors fail the whole route or degrade gracefully?

## 18. Recommended B7-B direction

Do not enable Category Derivation globally yet.

Recommended minimal production policy:

- Enable only for completed manual_chat activity ingestion.
- Use categoryDerivationCreatePolicy = suggested_only.
- Use dryRun = false only in the selected production ingestion route.
- Keep safe guard: pass additionalCategoryLinks only for resolved candidates with valid categoryId.
- If Category Derivation fails, keep Activity Event and old bridge stable, but record warnings/errors.
- Do not expose large derivation payloads in normal user responses unless debug=true.

## 19. Next step

Proceed to P4.10.0-C8-P3-B7-B after reviewing this inventory:

- select exact production route
- add Category Derivation integration behind a narrow server-side policy
- add smoke check
- run browser-authenticated production-flow test
