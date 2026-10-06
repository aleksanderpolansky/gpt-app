import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";
import { createActivityEventViaPp1Rpc } from "@/lib/activity/pp1/createActivityEventRpc";
import {
  readProjectPlanningTimeContainerV1,
  writeProjectPlanningTimeContainerV1,
  type ProjectPlanningWindowKindV1,
} from "@/lib/activity/projectPlanningContainerV1";
import type { ActivityCreatePp1 } from "@/types/activity-model-pp1";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = {
  projectContextId?: unknown;
  title?: unknown;
  windowKind?: unknown;
  dateStart?: unknown;
  dateEnd?: unknown;
  timeStart?: unknown;
  timeEnd?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function uuid(value: unknown) {
  const candidate = text(value);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : null;
}

function dateKey(value: unknown) {
  const candidate = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
}

function clockKey(value: unknown) {
  const candidate = text(value);
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(candidate) ? candidate : null;
}

export async function POST(request: Request) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();

  if (errorResponse) return errorResponse;
  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "User context not found." },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const projectContextId = uuid(body.projectContextId);
  const title = text(body.title).slice(0, 240);
  const windowKind =
    body.windowKind === "date_range" || body.windowKind === "time_of_day"
      ? (body.windowKind as ProjectPlanningWindowKindV1)
      : null;

  if (!projectContextId || !title || !windowKind) {
    return NextResponse.json(
      {
        ok: false,
        error: "projectContextId, title and a supported windowKind are required.",
      },
      { status: 400 },
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("project_contexts")
    .select("id,timezone,status_code")
    .eq("id", projectContextId)
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { ok: false, error: projectError?.message ?? "Project not found." },
      { status: 404 },
    );
  }

  if (project.status_code === "archived") {
    return NextResponse.json(
      { ok: false, error: "Archived project cannot accept a time container." },
      { status: 409 },
    );
  }

  const timeZone =
    typeof project.timezone === "string" && project.timezone.trim()
      ? project.timezone.trim()
      : "UTC";

  let activity: ActivityCreatePp1;

  if (windowKind === "date_range") {
    const dateStart = dateKey(body.dateStart);
    const dateEnd = dateKey(body.dateEnd);

    if (!dateStart || !dateEnd || dateEnd < dateStart) {
      return NextResponse.json(
        { ok: false, error: "A valid dateStart/dateEnd range is required." },
        { status: 400 },
      );
    }

    activity = {
      activityRoleCode: "planned",
      title,
      inputText: title,
      description: null,
      source: "manual",
      privacyScope: "private",
      status: "planned",
      scheduleModeCode: "date_range",
      scheduleStartDate: dateStart,
      scheduleEndDate: dateEnd,
      metadata: writeProjectPlanningTimeContainerV1({}, {
        windowKind,
        timeZone,
      }),
    };
  } else {
    const timeStart = clockKey(body.timeStart);
    const timeEnd = clockKey(body.timeEnd);

    if (!timeStart || !timeEnd || timeEnd <= timeStart) {
      return NextResponse.json(
        { ok: false, error: "A valid timeStart/timeEnd interval is required." },
        { status: 400 },
      );
    }

    const [startHour, startMinute] = timeStart.split(":").map(Number);
    const [endHour, endMinute] = timeEnd.split(":").map(Number);
    const durationMinutes =
      endHour * 60 + endMinute - (startHour * 60 + startMinute);

    activity = {
      activityRoleCode: "planned",
      title,
      inputText: title,
      description: null,
      source: "manual",
      privacyScope: "private",
      status: "planned",
      scheduleModeCode: "unscheduled",
      durationMinutes,
      metadata: writeProjectPlanningTimeContainerV1({}, {
        windowKind,
        timeStart,
        timeEnd,
        timeZone,
      }),
    };
  }

  const created = await createActivityEventViaPp1Rpc({
    ownerUserId: appUser.id,
    ownerActorId: personActor.id,
    idempotencyKey: `pp5a:time-container:${crypto.randomUUID()}`,
    activity,
    plannedTargetValueObjectIds: [],
  });

  if (!created.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: created.errorMessage,
        errorCode: created.errorCode,
      },
      { status: 500 },
    );
  }

  const activityEventId =
    typeof created.data.activityEvent.id === "string"
      ? created.data.activityEvent.id
      : null;

  if (!activityEventId) {
    return NextResponse.json(
      { ok: false, error: "Created time container has no activity id." },
      { status: 500 },
    );
  }

  const { error: linkError } = await supabase
    .from("project_activity_links")
    .insert({
      project_context_id: projectContextId,
      activity_event_id: activityEventId,
      status_code: "active",
      provenance_code: "manual",
      metadata_json: {
        contract: "ARCTOR_PROJECT_TIME_CONTAINER_LINK_PP5A_V1",
      },
      created_by_actor_id: personActor.id,
    });

  if (linkError && linkError.code !== "23505") {
    return NextResponse.json(
      {
        ok: false,
        error: `Time container was created but project linking failed: ${linkError.message}`,
        activityEventId,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, activityEventId, windowKind },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();

  if (errorResponse) return errorResponse;
  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "User context not found." },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const projectContextId = uuid(url.searchParams.get("projectContextId"));
  const activityEventId = uuid(url.searchParams.get("activityEventId"));

  if (!projectContextId || !activityEventId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Valid projectContextId and activityEventId are required.",
      },
      { status: 400 },
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("project_contexts")
    .select("id,status_code")
    .eq("id", projectContextId)
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
    .maybeSingle();

  if (projectError) {
    return NextResponse.json(
      { ok: false, error: projectError.message },
      { status: 500 },
    );
  }

  if (!project) {
    return NextResponse.json(
      { ok: false, error: "Project not found." },
      { status: 404 },
    );
  }

  const { data: activity, error: activityError } = await supabase
    .from("activity_events")
    .select("id,activity_role_code,status,metadata_json")
    .eq("id", activityEventId)
    .eq("user_id", appUser.id)
    .eq("acting_as_actor_id", personActor.id)
    .maybeSingle();

  if (activityError) {
    return NextResponse.json(
      { ok: false, error: activityError.message },
      { status: 500 },
    );
  }

  if (
    !activity ||
    activity.activity_role_code !== "planned" ||
    !readProjectPlanningTimeContainerV1(activity.metadata_json)
  ) {
    return NextResponse.json(
      { ok: false, error: "Activity is not an owned planned time container." },
      { status: 409 },
    );
  }

  const [
    membershipsResult,
    sourceRelationsResult,
    targetRelationsResult,
    recurrenceResult,
    fulfillmentsResult,
  ] = await Promise.all([
    supabase
      .from("project_activity_links")
      .select("id,project_context_id")
      .eq("activity_event_id", activityEventId)
      .eq("status_code", "active"),
    supabase
      .from("activity_event_relations")
      .select("id,relation_type_code")
      .eq("source_activity_event_id", activityEventId)
      .eq("status_code", "active"),
    supabase
      .from("activity_event_relations")
      .select("id,relation_type_code")
      .eq("target_activity_event_id", activityEventId)
      .eq("status_code", "active"),
    supabase
      .from("activity_recurrence_rules")
      .select("id")
      .eq("source_activity_event_id", activityEventId)
      .in("status_code", ["active", "paused"]),
    supabase
      .from("activity_events")
      .select("id")
      .eq("fulfills_planned_activity_event_id", activityEventId)
      .eq("activity_role_code", "actual")
      .eq("status", "completed"),
  ]);

  const readError =
    membershipsResult.error ??
    sourceRelationsResult.error ??
    targetRelationsResult.error ??
    recurrenceResult.error ??
    fulfillmentsResult.error;

  if (readError) {
    return NextResponse.json(
      { ok: false, error: readError.message },
      { status: 500 },
    );
  }

  const memberships = membershipsResult.data ?? [];
  const belongsToRequestedProject = memberships.some(
    (row) => row.project_context_id === projectContextId,
  );

  if (!belongsToRequestedProject) {
    return NextResponse.json(
      {
        ok: false,
        error: "Time container is not actively linked to the selected project.",
      },
      { status: 409 },
    );
  }

  const sourceRelations = sourceRelationsResult.data ?? [];
  const targetRelations = targetRelationsResult.data ?? [];
  const containedTasks = sourceRelations.filter(
    (row) => row.relation_type_code === "contains",
  ).length;
  const activityRelations =
    sourceRelations.length + targetRelations.length;
  const otherProjectMemberships = Math.max(0, memberships.length - 1);
  const recurrenceRules = (recurrenceResult.data ?? []).length;
  const fulfillments = (fulfillmentsResult.data ?? []).length;

  const debts = {
    containedTasks,
    activityRelations,
    otherProjectMemberships,
    recurrenceRules,
    fulfillments,
  };

  if (
    containedTasks > 0 ||
    activityRelations > 0 ||
    otherProjectMemberships > 0 ||
    recurrenceRules > 0 ||
    fulfillments > 0
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Time container has active dependencies and cannot be removed yet.",
        errorCode: "TIME_CONTAINER_DELETE_BLOCKED",
        debts,
      },
      { status: 409 },
    );
  }

  const nowIso = new Date().toISOString();

  const { error: projectionError } = await supabase
    .from("calendar_events")
    .update({
      status: "cancelled",
      updated_at: nowIso,
    })
    .eq("user_id", appUser.id)
    .eq("related_activity_event_id", activityEventId)
    .not("status", "in", "(cancelled,archived,hidden)");

  if (projectionError) {
    return NextResponse.json(
      { ok: false, error: projectionError.message, retrySafe: true },
      { status: 500 },
    );
  }

  const { error: activityCancelError } = await supabase
    .from("activity_events")
    .update({
      status: "cancelled",
      updated_at: nowIso,
    })
    .eq("id", activityEventId)
    .eq("user_id", appUser.id)
    .eq("acting_as_actor_id", personActor.id)
    .eq("activity_role_code", "planned");

  if (activityCancelError) {
    return NextResponse.json(
      { ok: false, error: activityCancelError.message, retrySafe: true },
      { status: 500 },
    );
  }

  const membershipIds = memberships.map((row) => row.id);

  if (membershipIds.length > 0) {
    const { error: membershipError } = await supabase
      .from("project_activity_links")
      .update({
        status_code: "inactive",
        updated_at: nowIso,
      })
      .in("id", membershipIds)
      .eq("status_code", "active");

    if (membershipError) {
      return NextResponse.json(
        { ok: false, error: membershipError.message, retrySafe: true },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    disposition: "time_container_removed",
    projectContextId,
    activityEventId,
    auditRowPreserved: true,
  });
}
