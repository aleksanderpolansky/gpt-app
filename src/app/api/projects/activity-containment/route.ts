import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";
import { readProjectPlanningTimeContainerV1 } from "@/lib/activity/projectPlanningContainerV1";

export const dynamic = "force-dynamic";

type Body = {
  projectContextId?: unknown;
  containerActivityEventId?: unknown;
  childActivityEventId?: unknown;
};

function uuid(value: unknown) {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : null;
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
  const containerActivityEventId = uuid(body.containerActivityEventId);
  const childActivityEventId = uuid(body.childActivityEventId);

  if (
    !projectContextId ||
    !containerActivityEventId ||
    !childActivityEventId ||
    containerActivityEventId === childActivityEventId
  ) {
    return NextResponse.json(
      { ok: false, error: "Valid distinct project/container/child ids are required." },
      { status: 400 },
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("project_contexts")
    .select("id,status_code")
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

  const { data: links, error: linksError } = await supabase
    .from("project_activity_links")
    .select("activity_event_id")
    .eq("project_context_id", projectContextId)
    .eq("status_code", "active")
    .in("activity_event_id", [containerActivityEventId, childActivityEventId]);

  if (linksError) {
    return NextResponse.json(
      { ok: false, error: linksError.message },
      { status: 500 },
    );
  }

  const linkedIds = new Set(
    (links ?? [])
      .map((row) =>
        row && typeof row === "object"
          ? (row as { activity_event_id?: unknown }).activity_event_id
          : null,
      )
      .filter((value): value is string => typeof value === "string"),
  );

  if (
    !linkedIds.has(containerActivityEventId) ||
    !linkedIds.has(childActivityEventId)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Container and child must both belong to the selected project.",
      },
      { status: 409 },
    );
  }

  const { data: container, error: containerError } = await supabase
    .from("activity_events")
    .select("id,activity_role_code,status,metadata_json")
    .eq("id", containerActivityEventId)
    .eq("user_id", appUser.id)
    .eq("acting_as_actor_id", personActor.id)
    .single();

  if (
    containerError ||
    !container ||
    container.activity_role_code !== "planned" ||
    !readProjectPlanningTimeContainerV1(container.metadata_json)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: containerError?.message ?? "Source activity is not a planned time container.",
      },
      { status: 409 },
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("activity_event_relations")
    .select("id")
    .eq("project_context_id", projectContextId)
    .eq("source_activity_event_id", containerActivityEventId)
    .eq("target_activity_event_id", childActivityEventId)
    .eq("relation_type_code", "contains")
    .eq("status_code", "active")
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { ok: false, error: existingError.message },
      { status: 500 },
    );
  }

  if (existing?.id) {
    return NextResponse.json({
      ok: true,
      disposition: "idempotent_replay",
      relationId: existing.id,
    });
  }

  const { data: relation, error: relationError } = await supabase
    .from("activity_event_relations")
    .insert({
      project_context_id: projectContextId,
      source_activity_event_id: containerActivityEventId,
      target_activity_event_id: childActivityEventId,
      relation_type_code: "contains",
      lag_minutes: 0,
      is_hard: true,
      calendar_basis_code: "project",
      condition_json: {
        contract: "ARCTOR_ACTIVITY_TIME_CONTAINER_CONTAINMENT_PP5A_V1",
      },
      metadata_json: {
        ui_origin: "project_map_time_container_v1",
      },
      status_code: "active",
      provenance_code: "manual",
      created_by_actor_id: personActor.id,
    })
    .select("id")
    .single();

  if (relationError || !relation) {
    return NextResponse.json(
      { ok: false, error: relationError?.message ?? "Containment relation failed." },
      { status: relationError?.code === "23514" ? 409 : 500 },
    );
  }

  return NextResponse.json(
    { ok: true, disposition: "created", relationId: relation.id },
    { status: 201 },
  );
}
