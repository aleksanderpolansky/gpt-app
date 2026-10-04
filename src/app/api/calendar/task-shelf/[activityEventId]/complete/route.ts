import { NextResponse } from "next/server";

import { createActivityEventViaPp1Rpc } from "@/lib/activity/pp1/createActivityEventRpc";
import { getActivityUserContext } from "../../../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../../../lib/supabase";
import {
  readTaskOutcomeOptions,
  readTaskOutcomeSelection,
  writeTaskOutcomeSelection,
} from "@/lib/activity/taskOutcomeV1";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    activityEventId: string;
  }>;
};

type JsonRecord = Record<string, unknown>;

const ACTIVE_PLANNED_STATUSES = ["draft", "planned", "confirmed"] as const;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asRecords(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is JsonRecord =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function titleForActivity(row: JsonRecord) {
  return (
    asString(row.title) ??
    asString(row.input_text) ??
    asString(row.description) ??
    "Completed task"
  );
}

async function resolveContext(context: RouteContext) {
  const { appUser, personActor, errorResponse } =
    await getActivityUserContext();

  if (errorResponse) {
    return {
      appUser: null,
      personActor: null,
      activityEventId: null,
      errorResponse,
    };
  }

  if (!appUser || !personActor) {
    return {
      appUser: null,
      personActor: null,
      activityEventId: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "User context not found" },
        { status: 500 },
      ),
    };
  }

  const params = await context.params;
  const activityEventId = params.activityEventId?.trim();

  if (!activityEventId) {
    return {
      appUser: null,
      personActor: null,
      activityEventId: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Activity event id is required." },
        { status: 400 },
      ),
    };
  }

  return {
    appUser,
    personActor,
    activityEventId,
    errorResponse: null,
  };
}

async function loadOwnedPlannedActivity(params: {
  activityEventId: string;
  userId: string;
  actorId: string;
}) {
  const { data, error } = await supabase
    .from("activity_events")
    .select(
      [
        "id",
        "title",
        "input_text",
        "description",
        "source",
        "privacy_scope",
        "status",
        "activity_role_code",
        "schedule_mode_code",
        "scheduled_date",
        "schedule_start_date",
        "schedule_end_date",
        "deadline_at",
        "started_at",
        "ended_at",
        "duration_minutes",
        "metadata_json",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .eq("id", params.activityEventId)
    .eq("user_id", params.userId)
    .eq("acting_as_actor_id", params.actorId)
    .eq("activity_role_code", "planned")
    .single();

  if (error || !data) {
    return {
      row: null,
      error: error?.message ?? "Planned activity not found or access denied.",
    };
  }

  return {
    row: asRecord(data),
    error: null,
  };
}

async function findExistingCompletion(params: {
  plannedActivityEventId: string;
  userId: string;
  actorId: string;
}) {
  const { data, error } = await supabase
    .from("activity_events")
    .select("id,ended_at,created_at,updated_at,metadata_json")
    .eq("user_id", params.userId)
    .eq("acting_as_actor_id", params.actorId)
    .eq("activity_role_code", "actual")
    .eq("status", "completed")
    .eq(
      "fulfills_planned_activity_event_id",
      params.plannedActivityEventId,
    )
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return asRecords(data)[0] ?? null;
}

async function inheritProjectMembership(params: {
  plannedActivityEventId: string;
  actualActivityEventId: string;
  actorId: string;
}) {
  const { data: sourceLinksRaw, error: sourceError } =
    await supabase
      .from("project_activity_links")
      .select("project_context_id")
      .eq("activity_event_id", params.plannedActivityEventId)
      .eq("status_code", "active");

  if (sourceError) {
    return sourceError.message;
  }

  const sourceProjectIds = [
    ...new Set(
      asRecords(sourceLinksRaw)
        .map((row) => asString(row.project_context_id))
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  if (sourceProjectIds.length === 0) {
    return null;
  }

  const { data: existingLinksRaw, error: existingError } =
    await supabase
      .from("project_activity_links")
      .select("project_context_id")
      .eq("activity_event_id", params.actualActivityEventId)
      .eq("status_code", "active")
      .in("project_context_id", sourceProjectIds);

  if (existingError) {
    return existingError.message;
  }

  const existingProjectIds = new Set(
    asRecords(existingLinksRaw)
      .map((row) => asString(row.project_context_id))
      .filter((value): value is string => Boolean(value)),
  );

  const missingRows = sourceProjectIds
    .filter((projectContextId) => !existingProjectIds.has(projectContextId))
    .map((projectContextId) => ({
      project_context_id: projectContextId,
      activity_event_id: params.actualActivityEventId,
      status_code: "active",
      provenance_code: "system",
      metadata_json: {
        contract: "ARCTOR_TASK_COMPLETION_PROJECT_MEMBERSHIP_PP4D_V1",
        sourcePlannedActivityEventId: params.plannedActivityEventId,
      },
      created_by_actor_id: params.actorId,
    }));

  if (missingRows.length === 0) {
    return null;
  }

  const { error: insertError } = await supabase
    .from("project_activity_links")
    .insert(missingRows);

  return insertError?.message ?? null;
}

async function cancelExactProjection(params: {
  plannedActivityEventId: string;
  userId: string;
}) {
  const { error } = await supabase
    .from("calendar_events")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("related_activity_event_id", params.plannedActivityEventId)
    .eq("user_id", params.userId)
    .neq("status", "cancelled");

  return error?.message ?? null;
}

async function restoreExactProjection(params: {
  plannedActivityEventId: string;
  userId: string;
}) {
  const { error } = await supabase
    .from("calendar_events")
    .update({
      status: "planned",
      updated_at: new Date().toISOString(),
    })
    .eq("related_activity_event_id", params.plannedActivityEventId)
    .eq("user_id", params.userId)
    .eq("status", "cancelled");

  return error?.message ?? null;
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  const resolved = await resolveContext(context);

  if (resolved.errorResponse) return resolved.errorResponse;

  const { appUser, personActor, activityEventId } = resolved;

  if (!appUser || !personActor || !activityEventId) {
    return NextResponse.json(
      { ok: false, error: "Activity context could not be resolved." },
      { status: 500 },
    );
  }

  let body: { operationId?: unknown; outcomeLabel?: unknown } = {};

  try {
    body = (await request.json()) as { operationId?: unknown; outcomeLabel?: unknown };
  } catch {
    body = {};
  }

  const operationId = asString(body.operationId);

  if (
    !operationId ||
    operationId.length > 160 ||
    !/^[A-Za-z0-9:_-]+$/.test(operationId)
  ) {
    return NextResponse.json(
      { ok: false, error: "A valid operationId is required." },
      { status: 400 },
    );
  }

  const planned = await loadOwnedPlannedActivity({
    activityEventId,
    userId: appUser.id,
    actorId: personActor.id,
  });

  if (!planned.row) {
    return NextResponse.json(
      { ok: false, error: planned.error },
      { status: 404 },
    );
  }

  const plannedStatus = asString(planned.row.status);

  if (
    !plannedStatus ||
    !ACTIVE_PLANNED_STATUSES.includes(
      plannedStatus as (typeof ACTIVE_PLANNED_STATUSES)[number],
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Only active planned activities can be completed.",
        status: plannedStatus,
      },
      { status: 409 },
    );
  }

  const { data: recurrenceDefinitionRows, error: recurrenceDefinitionError } =
    await supabase
      .from("activity_recurrence_rules")
      .select("id")
      .eq("source_activity_event_id", activityEventId)
      .in("status_code", ["active", "paused"])
      .limit(1);

  if (recurrenceDefinitionError) {
    return NextResponse.json(
      {
        ok: false,
        error: recurrenceDefinitionError.message,
      },
      { status: 500 },
    );
  }

  if (Array.isArray(recurrenceDefinitionRows) && recurrenceDefinitionRows.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "A recurrence definition cannot be completed. Complete a specific occurrence instead.",
        code: "RECURRENCE_DEFINITION_NOT_EXECUTABLE",
      },
      { status: 409 },
    );
  }

  const configuredOutcomeOptions = readTaskOutcomeOptions(planned.row.metadata_json);
  const requestedOutcome = asString(body.outcomeLabel);
  const selectedOutcome = configuredOutcomeOptions.length > 0
    ? configuredOutcomeOptions.find((option) => option.toLocaleLowerCase() === requestedOutcome?.toLocaleLowerCase()) ?? null
    : requestedOutcome;

  if (configuredOutcomeOptions.length > 0 && !selectedOutcome) {
    return NextResponse.json({ ok: false, error: "Select one of the configured activity outcomes.", outcomeOptions: configuredOutcomeOptions }, { status: 400 });
  }

  try {
    const existing = await findExistingCompletion({
      plannedActivityEventId: activityEventId,
      userId: appUser.id,
      actorId: personActor.id,
    });

    if (existing) {
      return NextResponse.json({
        ok: true,
        disposition: "already_completed",
        plannedActivityEventId: activityEventId,
        actualActivityEventId: asString(existing.id),
        completedAt:
          asString(existing.ended_at) ??
          asString(existing.updated_at) ??
          asString(existing.created_at),
        selectedOutcome: readTaskOutcomeSelection(existing.metadata_json),
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not verify task completion state.",
      },
      { status: 500 },
    );
  }

  const completedAt = new Date().toISOString();

  const result = await createActivityEventViaPp1Rpc({
    ownerUserId: appUser.id,
    ownerActorId: personActor.id,
    idempotencyKey: `pp4d-task-complete:${operationId}`,
    plannedTargetValueObjectIds: [],
    activity: {
      activityRoleCode: "actual",
      title: titleForActivity(planned.row),
      inputText: asString(planned.row.input_text),
      description: asString(planned.row.description),
      source: "system_event",
      privacyScope: asString(planned.row.privacy_scope) ?? "private",
      status: "completed",
      endedAt: completedAt,
      fulfillsPlannedActivityEventId: activityEventId,
      metadata: writeTaskOutcomeSelection({
        contract: "ARCTOR_TASK_EXECUTION_LOOP_PP4D_V1",
        eventSource: "task_completion_pp4d_v1",
        sourcePlannedActivityEventId: activityEventId,
        completionObservedAt: completedAt,
        plannedScheduleSnapshot: {
          scheduleModeCode: asString(planned.row.schedule_mode_code),
          scheduledDate: asString(planned.row.scheduled_date),
          scheduleStartDate: asString(planned.row.schedule_start_date),
          scheduleEndDate: asString(planned.row.schedule_end_date),
          deadlineAt: asString(planned.row.deadline_at),
          startedAt: asString(planned.row.started_at),
          endedAt: asString(planned.row.ended_at),
        },
      }, selectedOutcome, completedAt),
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.errorMessage,
        errorCode: result.errorCode,
        errorDetails: result.errorDetails,
      },
      { status: 500 },
    );
  }

  const actualActivityEventId = asString(
    result.data.activityEvent.id,
  );

  if (!actualActivityEventId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Actual activity id is missing after completion.",
      },
      { status: 500 },
    );
  }

  const [membershipWarning, projectionWarning] = await Promise.all([
    inheritProjectMembership({
      plannedActivityEventId: activityEventId,
      actualActivityEventId,
      actorId: personActor.id,
    }),
    cancelExactProjection({
      plannedActivityEventId: activityEventId,
      userId: appUser.id,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    disposition: result.data.disposition,
    plannedActivityEventId: activityEventId,
    actualActivityEventId,
    completedAt,
    selectedOutcome,
    warnings: [membershipWarning, projectionWarning].filter(Boolean),
  });
}

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  const resolved = await resolveContext(context);

  if (resolved.errorResponse) return resolved.errorResponse;

  const { appUser, personActor, activityEventId } = resolved;

  if (!appUser || !personActor || !activityEventId) {
    return NextResponse.json(
      { ok: false, error: "Activity context could not be resolved." },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const actualActivityEventId = asString(
    url.searchParams.get("actualActivityEventId"),
  );

  if (!actualActivityEventId) {
    return NextResponse.json(
      { ok: false, error: "actualActivityEventId is required." },
      { status: 400 },
    );
  }

  const { data: actualRaw, error: actualError } = await supabase
    .from("activity_events")
    .select(
      "id,status,activity_role_code,fulfills_planned_activity_event_id,metadata_json",
    )
    .eq("id", actualActivityEventId)
    .eq("user_id", appUser.id)
    .eq("acting_as_actor_id", personActor.id)
    .eq("activity_role_code", "actual")
    .eq("fulfills_planned_activity_event_id", activityEventId)
    .single();

  if (actualError || !actualRaw) {
    return NextResponse.json(
      {
        ok: false,
        error:
          actualError?.message ??
          "Completed actual activity was not found.",
      },
      { status: 404 },
    );
  }

  const actual = asRecord(actualRaw);

  if (asString(actual.status) !== "completed") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only a completed task execution can be undone.",
        status: asString(actual.status),
      },
      { status: 409 },
    );
  }

  const undoneAt = new Date().toISOString();
  const metadata = {
    ...asRecord(actual.metadata_json),
    completionUndo: {
      contract: "ARCTOR_TASK_EXECUTION_UNDO_PP4D_V1",
      undoneAt,
      sourcePlannedActivityEventId: activityEventId,
    },
  };

  const { error: updateError } = await supabase
    .from("activity_events")
    .update({
      status: "cancelled",
      metadata_json: metadata,
      updated_at: undoneAt,
    })
    .eq("id", actualActivityEventId)
    .eq("user_id", appUser.id)
    .eq("acting_as_actor_id", personActor.id)
    .eq("activity_role_code", "actual")
    .eq("status", "completed");

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: updateError.message },
      { status: 500 },
    );
  }

  const projectionWarning = await restoreExactProjection({
    plannedActivityEventId: activityEventId,
    userId: appUser.id,
  });

  return NextResponse.json({
    ok: true,
    disposition: "completion_undone",
    plannedActivityEventId: activityEventId,
    actualActivityEventId,
    undoneAt,
    warning: projectionWarning,
  });
}
