import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../lib/actor-context";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AppUserContext = {
  readonly appUserId: string;
  readonly actorId: string;
};

type ProjectCreateBody = {
  readonly title?: unknown;
  readonly description?: unknown;
  readonly rootValueObjectId?: unknown;
  readonly projectModeCode?: unknown;
  readonly timezone?: unknown;
  readonly currencyCode?: unknown;
};

type ValueObjectRow = {
  readonly id: string;
  readonly title: string | null;
  readonly description: string | null;
  readonly parent_value_object_id: string | null;
  readonly root_value_object_id: string | null;
  readonly scope_code: string | null;
  readonly ontology_node_role_code: string | null;
  readonly visibility_code: string | null;
  readonly visibility: string | null;
  readonly status: string | null;
};

type ProjectActivityLinkRow = {
  readonly project_context_id: string;
  readonly activity_event_id: string;
};

type ProjectActivityRow = {
  readonly id: string;
  readonly title: string | null;
  readonly status: string | null;
  readonly schedule_mode_code: string | null;
  readonly scheduled_date: string | null;
  readonly schedule_start_date: string | null;
  readonly schedule_end_date: string | null;
  readonly deadline_at: string | null;
  readonly started_at: string | null;
  readonly ended_at: string | null;
  readonly duration_minutes: number | null;
};

type ActivityRecurrenceRuleRow = {
  readonly id: string;
  readonly source_activity_event_id: string;
  readonly frequency_code: "daily" | "weekly" | "monthly";
  readonly interval_count: number;
  readonly anchor_date: string;
  readonly recurrence_basis_code: string;
  readonly end_mode_code: string;
  readonly until_date: string | null;
  readonly count_limit: number | null;
  readonly status_code: string;
};

type ActivityRecurrenceOccurrenceRow = {
  readonly recurrence_rule_id: string;
  readonly occurrence_ordinal: number;
  readonly occurrence_key: string;
  readonly nominal_schedule_mode_code: "date_only" | "date_range";
  readonly nominal_scheduled_date: string | null;
  readonly nominal_schedule_start_date: string | null;
  readonly nominal_schedule_end_date: string | null;
  readonly materialized_activity_event_id: string;
  readonly status_code: string;
};

type ProjectContextRow = {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly project_mode_code: string;
  readonly status_code: string;
  readonly timezone: string;
  readonly currency_code: string | null;
  readonly root_value_object_id: string;
  readonly created_at: string;
  readonly updated_at: string;
};

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalized,
  )
    ? normalized
    : null;
}

function normalizeRequiredText(
  value: unknown,
  maxLength: number,
): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();

  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

function normalizeOptionalText(
  value: unknown,
  maxLength: number,
): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return null;

  return normalized;
}

function normalizeMode(value: unknown): "finite" | "continuous" | null {
  return value === "finite" || value === "continuous" ? value : null;
}

function normalizeCurrencyCode(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;

  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function isPrivateLeaf(valueObject: ValueObjectRow) {
  const visibility =
    valueObject.visibility_code ?? valueObject.visibility ?? "private";

  return (
    valueObject.status === "active" &&
    valueObject.scope_code === "actor" &&
    valueObject.ontology_node_role_code === "leaf" &&
    visibility === "private"
  );
}

async function getCurrentUserContext(): Promise<
  | { context: AppUserContext; errorResponse: null }
  | { context: null; errorResponse: NextResponse }
> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      context: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 },
      ),
    };
  }

  try {
    const actorContext = await resolveActiveActorContext(session.user.sub);

    return {
      context: {
        appUserId: actorContext.appUserId,
        actorId: actorContext.actorId,
      },
      errorResponse: null,
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        context: null,
        errorResponse: NextResponse.json(
          {
            ok: false,
            error: error.message,
            errorCode: error.code,
          },
          { status: error.status },
        ),
      };
    }

    return {
      context: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: "Could not resolve active actor context",
        },
        { status: 500 },
      ),
    };
  }
}

async function readValueObjectsByIds(ids: readonly string[]) {
  if (ids.length === 0) return new Map<string, ValueObjectRow>();

  const { data, error } = await supabase
    .from("value_objects")
    .select(
      [
        "id",
        "title",
        "description",
        "parent_value_object_id",
        "root_value_object_id",
        "scope_code",
        "ontology_node_role_code",
        "visibility_code",
        "visibility",
        "status",
      ].join(","),
    )
    .in("id", [...new Set(ids)]);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as unknown as ValueObjectRow[]).map((row) => [row.id, row] as const),
  );
}

export async function GET() {
  const auth = await getCurrentUserContext();

  if (auth.errorResponse || !auth.context) {
    return auth.errorResponse;
  }

  const { appUserId, actorId } = auth.context;

  const [projectsResult, rootsResult] = await Promise.all([
    supabase
      .from("project_contexts")
      .select(
        [
          "id",
          "title",
          "description",
          "project_mode_code",
          "status_code",
          "timezone",
          "currency_code",
          "root_value_object_id",
          "created_at",
          "updated_at",
        ].join(","),
      )
      .eq("owner_user_id", appUserId)
      .eq("owner_actor_id", actorId)
      .neq("status_code", "archived")
      .order("updated_at", { ascending: false }),
    supabase
      .from("value_objects")
      .select(
        [
          "id",
          "title",
          "description",
          "parent_value_object_id",
          "root_value_object_id",
          "scope_code",
          "ontology_node_role_code",
          "visibility_code",
          "visibility",
          "status",
        ].join(","),
      )
      .eq("owner_user_id", appUserId)
      .eq("owner_actor_id", actorId)
      .eq("scope_code", "actor")
      .eq("ontology_node_role_code", "leaf")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  if (projectsResult.error) {
    return NextResponse.json(
      { ok: false, error: projectsResult.error.message },
      { status: 500 },
    );
  }

  if (rootsResult.error) {
    return NextResponse.json(
      { ok: false, error: rootsResult.error.message },
      { status: 500 },
    );
  }

  const projects = (projectsResult.data ?? []) as unknown as ProjectContextRow[];
  const eligibleRoots = ((rootsResult.data ?? []) as unknown as ValueObjectRow[]).filter(
    isPrivateLeaf,
  );

  const parentIds = eligibleRoots
    .map((row) => row.parent_value_object_id)
    .filter((id): id is string => Boolean(id));

  const projectRootIds = projects.map((row) => row.root_value_object_id);
  const projectIds = projects.map((row) => row.id);

  const projectActivityLinksByProject = new Map<string, string[]>();
  const projectActivitiesById = new Map<string, ProjectActivityRow>();
  const projectRecurrenceByActivityId =
    new Map<string, ActivityRecurrenceRuleRow>();
  const projectOccurrencesByRuleId =
    new Map<string, ActivityRecurrenceOccurrenceRow[]>();
  const projectOccurrenceActivityEventIds = new Set<string>();

  if (projectIds.length > 0) {
    const { data: linksData, error: linksError } = await supabase
      .from("project_activity_links")
      .select("project_context_id,activity_event_id")
      .in("project_context_id", projectIds)
      .eq("status_code", "active");

    if (linksError) {
      return NextResponse.json(
        { ok: false, error: linksError.message },
        { status: 500 },
      );
    }

    const links = (linksData ?? []) as unknown as ProjectActivityLinkRow[];

    for (const link of links) {
      const current =
        projectActivityLinksByProject.get(link.project_context_id) ?? [];
      current.push(link.activity_event_id);
      projectActivityLinksByProject.set(link.project_context_id, current);
    }

    const activityIds = [
      ...new Set(links.map((link) => link.activity_event_id)),
    ];

    if (activityIds.length > 0) {
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("activity_events")
        .select(
          [
            "id",
            "title",
            "status",
            "schedule_mode_code",
            "scheduled_date",
            "schedule_start_date",
            "schedule_end_date",
            "deadline_at",
            "started_at",
            "ended_at",
            "duration_minutes",
          ].join(","),
        )
        .in("id", activityIds);

      if (activitiesError) {
        return NextResponse.json(
          { ok: false, error: activitiesError.message },
          { status: 500 },
        );
      }

      for (const activity of (activitiesData ?? []) as unknown as ProjectActivityRow[]) {
        projectActivitiesById.set(activity.id, activity);
      }

      const { data: recurrenceData, error: recurrenceError } = await supabase
        .from("activity_recurrence_rules")
        .select(
          [
            "id",
            "source_activity_event_id",
            "frequency_code",
            "interval_count",
            "anchor_date",
            "recurrence_basis_code",
            "end_mode_code",
            "until_date",
            "count_limit",
            "status_code",
          ].join(","),
        )
        .in("source_activity_event_id", activityIds)
        .in("status_code", ["active", "paused"]);

      if (recurrenceError) {
        return NextResponse.json(
          { ok: false, error: recurrenceError.message },
          { status: 500 },
        );
      }

      for (const recurrence of (recurrenceData ?? []) as unknown as ActivityRecurrenceRuleRow[]) {
        projectRecurrenceByActivityId.set(
          recurrence.source_activity_event_id,
          recurrence,
        );
      }

      const recurrenceRuleIds = (recurrenceData ?? [])
        .map((row) => (row as unknown as ActivityRecurrenceRuleRow).id)
        .filter(Boolean);

      if (recurrenceRuleIds.length > 0) {
        const { data: occurrenceData, error: occurrenceError } = await supabase
          .from("activity_recurrence_occurrences")
          .select(
            [
              "recurrence_rule_id",
              "occurrence_ordinal",
              "occurrence_key",
              "nominal_schedule_mode_code",
              "nominal_scheduled_date",
              "nominal_schedule_start_date",
              "nominal_schedule_end_date",
              "materialized_activity_event_id",
              "status_code",
            ].join(","),
          )
          .in("recurrence_rule_id", recurrenceRuleIds)
          .in("status_code", ["active", "rescheduled"])
          .order("occurrence_ordinal", { ascending: true });

        if (occurrenceError) {
          return NextResponse.json(
            { ok: false, error: occurrenceError.message },
            { status: 500 },
          );
        }

        for (const occurrence of (occurrenceData ?? []) as unknown as ActivityRecurrenceOccurrenceRow[]) {
          const rows =
            projectOccurrencesByRuleId.get(occurrence.recurrence_rule_id) ?? [];
          rows.push(occurrence);
          projectOccurrencesByRuleId.set(occurrence.recurrence_rule_id, rows);
          projectOccurrenceActivityEventIds.add(
            occurrence.materialized_activity_event_id,
          );
        }
      }
    }
  }

  let relatedObjects: Map<string, ValueObjectRow>;

  try {
    relatedObjects = await readValueObjectsByIds([
      ...parentIds,
      ...projectRootIds,
    ]);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not read project elements",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    projects: projects.map((project) => {
      const root = relatedObjects.get(project.root_value_object_id);
      const linkedActivityIds =
        projectActivityLinksByProject.get(project.id) ?? [];
      const linkedActivityIdSet = new Set(linkedActivityIds);

      return {
        id: project.id,
        title: project.title,
        description: project.description,
        projectModeCode: project.project_mode_code,
        statusCode: project.status_code,
        timezone: project.timezone,
        currencyCode: project.currency_code,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        rootValueObject: root
          ? {
              id: root.id,
              title: root.title,
              parentValueObjectId: root.parent_value_object_id,
            }
          : {
              id: project.root_value_object_id,
              title: null,
              parentValueObjectId: null,
            },
        activities: linkedActivityIds
          .filter(
            (activityId) =>
              !projectOccurrenceActivityEventIds.has(activityId),
          )
          .map((activityId) => projectActivitiesById.get(activityId))
          .filter(
            (activity): activity is ProjectActivityRow =>
              Boolean(activity),
          )
          .map((activity) => ({
            id: activity.id,
            title: activity.title ?? activity.id,
            statusCode: activity.status,
            scheduleModeCode: activity.schedule_mode_code,
            scheduledDate: activity.scheduled_date,
            scheduleStartDate: activity.schedule_start_date,
            scheduleEndDate: activity.schedule_end_date,
            deadlineAt: activity.deadline_at,
            startedAt: activity.started_at,
            endedAt: activity.ended_at,
            durationMinutes: activity.duration_minutes,
            recurrence: projectRecurrenceByActivityId.has(activity.id)
              ? (() => {
                  const recurrence =
                    projectRecurrenceByActivityId.get(activity.id)!;

                  return {
                    id: recurrence.id,
                    frequencyCode: recurrence.frequency_code,
                    intervalCount: recurrence.interval_count,
                    anchorDate: recurrence.anchor_date,
                    recurrenceBasisCode: recurrence.recurrence_basis_code,
                    endModeCode: recurrence.end_mode_code,
                    untilDate: recurrence.until_date,
                    countLimit: recurrence.count_limit,
                    statusCode: recurrence.status_code,
                    materializedOccurrenceCount: (
                      projectOccurrencesByRuleId.get(recurrence.id) ?? []
                    ).filter((occurrence) =>
                      linkedActivityIdSet.has(
                        occurrence.materialized_activity_event_id,
                      ),
                    ).length,
                    upcomingOccurrences: (
                      projectOccurrencesByRuleId.get(recurrence.id) ?? []
                    )
                      .filter((occurrence) =>
                        linkedActivityIdSet.has(
                          occurrence.materialized_activity_event_id,
                        ),
                      )
                      .slice(0, 12)
                      .map((occurrence) => ({
                      occurrenceOrdinal: occurrence.occurrence_ordinal,
                      occurrenceKey: occurrence.occurrence_key,
                      scheduleModeCode: occurrence.nominal_schedule_mode_code,
                      scheduledDate: occurrence.nominal_scheduled_date,
                      scheduleStartDate: occurrence.nominal_schedule_start_date,
                      scheduleEndDate: occurrence.nominal_schedule_end_date,
                      activityEventId: occurrence.materialized_activity_event_id,
                      statusCode: occurrence.status_code,
                    })),
                  };
                })()
              : null,
          })),
      };
    }),
    eligibleRoots: eligibleRoots.map((root) => ({
      id: root.id,
      title: root.title,
      description: root.description,
      parentValueObjectId: root.parent_value_object_id,
      parentTitle: root.parent_value_object_id
        ? relatedObjects.get(root.parent_value_object_id)?.title ?? null
        : null,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await getCurrentUserContext();

  if (auth.errorResponse || !auth.context) {
    return auth.errorResponse;
  }

  let body: ProjectCreateBody;

  try {
    body = (await request.json()) as ProjectCreateBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const title = normalizeRequiredText(body.title, 240);
  const description = normalizeOptionalText(body.description, 4000);
  const rootValueObjectId = normalizeUuid(body.rootValueObjectId);
  const projectModeCode = normalizeMode(body.projectModeCode) ?? "finite";
  const timezone = normalizeOptionalText(body.timezone, 120) ?? "UTC";
  const currencyCode = normalizeCurrencyCode(body.currencyCode);

  if (!title) {
    return NextResponse.json(
      {
        ok: false,
        error: "Project title is required and must be 240 characters or fewer",
      },
      { status: 400 },
    );
  }

  if (!rootValueObjectId) {
    return NextResponse.json(
      {
        ok: false,
        error: "A valid linked personal element is required",
      },
      { status: 400 },
    );
  }

  if (
    body.currencyCode !== undefined &&
    body.currencyCode !== null &&
    body.currencyCode !== "" &&
    !currencyCode
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "currencyCode must contain exactly three Latin letters",
      },
      { status: 400 },
    );
  }

  const { appUserId, actorId } = auth.context;

  const { data: rootData, error: rootError } = await supabase
    .from("value_objects")
    .select(
      [
        "id",
        "title",
        "description",
        "parent_value_object_id",
        "root_value_object_id",
        "scope_code",
        "ontology_node_role_code",
        "visibility_code",
        "visibility",
        "status",
      ].join(","),
    )
    .eq("id", rootValueObjectId)
    .eq("owner_user_id", appUserId)
    .eq("owner_actor_id", actorId)
    .maybeSingle();

  if (rootError) {
    return NextResponse.json(
      { ok: false, error: rootError.message },
      { status: 500 },
    );
  }

  const root = rootData as ValueObjectRow | null;

  if (!root || !isPrivateLeaf(root)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "The linked project element must be your active private ontology leaf",
        errorCode: "PROJECT_ROOT_LEAF_REQUIRED",
      },
      { status: 409 },
    );
  }

  const { data: projectData, error: projectError } = await supabase
    .from("project_contexts")
    .insert({
      owner_user_id: appUserId,
      owner_actor_id: actorId,
      scope_code: "personal",
      organization_id: null,
      root_value_object_id: root.id,
      title,
      description,
      project_mode_code: projectModeCode,
      status_code: "draft",
      timezone,
      currency_code: currencyCode,
      created_by_actor_id: actorId,
      metadata_json: {
        ui_origin: "project_map_v1",
      },
    })
    .select(
      [
        "id",
        "title",
        "description",
        "project_mode_code",
        "status_code",
        "timezone",
        "currency_code",
        "root_value_object_id",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .single();

  if (projectError) {
    const status =
      projectError.code === "42501"
        ? 403
        : projectError.code === "23514" || projectError.code === "23505"
          ? 409
          : 500;

    return NextResponse.json(
      {
        ok: false,
        error: projectError.message,
        errorCode: projectError.code ?? "PROJECT_CREATE_FAILED",
      },
      { status },
    );
  }

  const project = projectData as unknown as ProjectContextRow;

  return NextResponse.json(
    {
      ok: true,
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        projectModeCode: project.project_mode_code,
        statusCode: project.status_code,
        timezone: project.timezone,
        currencyCode: project.currency_code,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        rootValueObject: {
          id: root.id,
          title: root.title,
          parentValueObjectId: root.parent_value_object_id,
        },
      },
    },
    { status: 201 },
  );
}
