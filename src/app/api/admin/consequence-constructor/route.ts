import crypto from "node:crypto";

import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
  type RequirePlatformAdminSuccess,
} from "@/lib/admin/require-platform-admin";
import {
  localizeGlobalSystemValueObject,
  normalizeGlobalSystemValueObjectLocale,
} from "@/lib/reality-core/global-system-value-object-localization";
import {
  bindConsequenceTaskToTemplateV1,
  countConsequenceConstructorTasksV1,
  listConsequenceConstructorTasksV1,
  listConsequenceTemplateOptionsV1,
  reconcileConsequenceConstructorTasksV1,
} from "@/lib/reality-curator/consequence-constructor.server";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "admin-consequence-constructor-v1-1" as const;
const CONSEQUENCE_PROCESSOR = "reality_curator_consequence_constructor" as const;
const CONSEQUENCE_PROCESSOR_VERSION = "1" as const;
const TARGET_SELECTED_EVENT = "consequence_constructor_target_selected" as const;
const TARGET_SELECTION_CONTRACT =
  "ARCTOR_REALITY_CURATOR_CONSEQUENCE_TARGET_SELECTION_V1" as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonRecord = Record<string, unknown>;

type WorkBody = {
  action?: unknown;
  taskId?: unknown;
  templateId?: unknown;
  targetValueObjectId?: unknown;
};

type GlobalValueObjectRow = {
  id: string;
  title: string;
  description: string | null;
  canonical_key: string | null;
  metadata_json: unknown;
  facet_code: string | null;
  node_role_code: string | null;
  ontology_node_role_code: string | null;
  scope_code: string | null;
  origin_type_code: string | null;
  owner_user_id: string | null;
  owner_actor_id: string | null;
  status: string;
};

type SystemRelationRow = {
  id: string;
  relation_type_code: string;
  source_value_object_id: string;
  target_value_object_id: string;
  status: string;
};

type TargetCandidate = {
  id: string;
  title: string;
  description: string | null;
  titleEn: string | null;
  descriptionEn: string | null;
  canonicalKey: string | null;
  relationIds: string[];
  relationTypeCodes: string[];
};

type SelectedTarget = {
  targetValueObjectId: string;
  targetValueObjectTitle: string;
  relationIds: string[];
  relationTypeCodes: string[];
  selectedAt: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => text(item)).filter(Boolean)
    : [];
}

function adminMetadata(guard: RequirePlatformAdminSuccess): JsonRecord {
  return {
    curatorAppUserId: guard.appUser.id,
    curatorAdminId: guard.platformAdmin.id,
    curatorRole: guard.platformAdmin.role,
    curatorNameSnapshot: guard.appUser.name,
    curatorEmailSnapshot: guard.appUser.email,
  };
}

function errorResponse(error: unknown, status = 500) {
  return NextResponse.json(
    {
      ok: false,
      routeMarker: ROUTE_MARKER,
      error: error instanceof Error ? error.message : String(error),
    },
    { status },
  );
}

async function buildTargetCandidates(
  sourceValueObjectIds: string[],
  localeValue: unknown,
) {
  const sourceIds = [...new Set(sourceValueObjectIds.filter((id) => UUID_RE.test(id)))];
  const result = new Map<string, TargetCandidate[]>();
  for (const sourceId of sourceIds) result.set(sourceId, []);
  if (sourceIds.length === 0) return result;

  const [outgoingResult, incomingResult] = await Promise.all([
    supabase
      .from("system_value_object_relations")
      .select(
        "id,relation_type_code,source_value_object_id,target_value_object_id,status",
      )
      .eq("status", "active")
      .in("source_value_object_id", sourceIds)
      .limit(10000),
    supabase
      .from("system_value_object_relations")
      .select(
        "id,relation_type_code,source_value_object_id,target_value_object_id,status",
      )
      .eq("status", "active")
      .in("target_value_object_id", sourceIds)
      .limit(10000),
  ]);

  if (outgoingResult.error) {
    throw new Error(
      `CONSEQUENCE_TARGET_RELATIONS_OUTGOING_READ_FAILED:${outgoingResult.error.message}`,
    );
  }
  if (incomingResult.error) {
    throw new Error(
      `CONSEQUENCE_TARGET_RELATIONS_INCOMING_READ_FAILED:${incomingResult.error.message}`,
    );
  }

  const relationById = new Map<string, SystemRelationRow>();
  for (const row of [
    ...((outgoingResult.data ?? []) as SystemRelationRow[]),
    ...((incomingResult.data ?? []) as SystemRelationRow[]),
  ]) {
    relationById.set(row.id, row);
  }
  const relations = [...relationById.values()];

  const otherIds = [
    ...new Set(
      relations.flatMap((relation) => [
        relation.source_value_object_id,
        relation.target_value_object_id,
      ]),
    ),
  ].filter((id) => !sourceIds.includes(id));

  if (otherIds.length === 0) return result;

  const { data: objectRows, error: objectError } = await supabase
    .from("value_objects")
    .select(
      "id,title,description,canonical_key,metadata_json,facet_code,node_role_code,ontology_node_role_code,scope_code,origin_type_code,owner_user_id,owner_actor_id,status",
    )
    .in("id", otherIds)
    .eq("scope_code", "global")
    .eq("origin_type_code", "system_model")
    .eq("status", "active")
    .eq("ontology_node_role_code", "leaf")
    .is("owner_user_id", null)
    .is("owner_actor_id", null)
    .limit(10000);

  if (objectError) {
    throw new Error(
      `CONSEQUENCE_TARGET_OBJECTS_READ_FAILED:${objectError.message}`,
    );
  }

  const locale = normalizeGlobalSystemValueObjectLocale(localeValue);
  const candidateById = new Map<string, TargetCandidate>();

  for (const row of (objectRows ?? []) as GlobalValueObjectRow[]) {
    const localized = localizeGlobalSystemValueObject(row, locale);
    const english = localizeGlobalSystemValueObject(row, "en");
    candidateById.set(row.id, {
      id: row.id,
      title: localized.title,
      description: localized.description,
      titleEn: english.title,
      descriptionEn: english.description,
      canonicalKey: localized.canonical_key,
      relationIds: [],
      relationTypeCodes: [],
    });
  }

  for (const sourceId of sourceIds) {
    const byTarget = new Map<string, TargetCandidate>();

    for (const relation of relations) {
      let targetId: string | null = null;
      if (relation.source_value_object_id === sourceId) {
        targetId = relation.target_value_object_id;
      } else if (relation.target_value_object_id === sourceId) {
        targetId = relation.source_value_object_id;
      }
      if (!targetId) continue;

      const base = candidateById.get(targetId);
      if (!base) continue;

      const existing = byTarget.get(targetId) ?? {
        ...base,
        relationIds: [],
        relationTypeCodes: [],
      };
      if (!existing.relationIds.includes(relation.id)) {
        existing.relationIds.push(relation.id);
      }
      if (!existing.relationTypeCodes.includes(relation.relation_type_code)) {
        existing.relationTypeCodes.push(relation.relation_type_code);
      }
      byTarget.set(targetId, existing);
    }

    result.set(
      sourceId,
      [...byTarget.values()].sort((left, right) =>
        left.title.localeCompare(right.title, locale),
      ),
    );
  }

  return result;
}

async function readSelectedTargetsByTask(
  tasks: Awaited<ReturnType<typeof listConsequenceConstructorTasksV1>>,
) {
  const byTask = new Map<string, SelectedTarget[]>();
  if (tasks.length === 0) return byTask;

  const taskIds = new Set(tasks.map((task) => task.id));
  const { data, error } = await supabase
    .from("activity_processing_logs")
    .select("metadata_json,started_at,created_at")
    .eq("processor_name", CONSEQUENCE_PROCESSOR)
    .eq("processor_version", CONSEQUENCE_PROCESSOR_VERSION)
    .contains("metadata_json", { eventCode: TARGET_SELECTED_EVENT })
    .order("started_at", { ascending: true })
    .limit(10000);

  if (error) {
    throw new Error(
      `CONSEQUENCE_TARGET_SELECTIONS_READ_FAILED:${error.message}`,
    );
  }

  const targetMaps = new Map<string, Map<string, SelectedTarget>>();

  for (const row of data ?? []) {
    const metadata = asRecord(row.metadata_json);
    const taskId = text(metadata.consequenceTaskId);
    const targetValueObjectId = text(metadata.targetValueObjectId);

    if (!taskIds.has(taskId) || !UUID_RE.test(targetValueObjectId)) {
      continue;
    }

    const taskTargets = targetMaps.get(taskId) ?? new Map<string, SelectedTarget>();
    taskTargets.set(targetValueObjectId, {
      targetValueObjectId,
      targetValueObjectTitle:
        text(metadata.targetValueObjectTitleSnapshot) || targetValueObjectId,
      relationIds: stringArray(metadata.relationIds),
      relationTypeCodes: stringArray(metadata.relationTypeCodes),
      selectedAt:
        text(metadata.selectedAt) ||
        text(row.started_at) ||
        text(row.created_at),
    });
    targetMaps.set(taskId, taskTargets);
  }

  for (const [taskId, targets] of targetMaps.entries()) {
    byTask.set(taskId, [...targets.values()]);
  }

  return byTask;
}

async function enrichTasksWithTargets(
  tasks: Awaited<ReturnType<typeof listConsequenceConstructorTasksV1>>,
  localeValue: unknown,
) {
  const [candidateMap, selectedMap] = await Promise.all([
    buildTargetCandidates(
      tasks.map((task) => task.sourceValueObjectId),
      localeValue,
    ),
    readSelectedTargetsByTask(tasks),
  ]);

  return tasks.map((task) => {
    const targetCandidates = candidateMap.get(task.sourceValueObjectId) ?? [];
    const allowedTargetIds = new Set(
      targetCandidates.map((candidate) => candidate.id),
    );
    const selectedTargets = (selectedMap.get(task.id) ?? []).filter((target) =>
      allowedTargetIds.has(target.targetValueObjectId),
    );
    const targetSelectionState =
      targetCandidates.length === 0
        ? "no_related_leaf_objects"
        : selectedTargets.length > 0
          ? "selected"
          : "ready";

    return {
      ...task,
      targetValueObjectId: selectedTargets[0]?.targetValueObjectId ?? null,
      targetSelectionState,
      targetCandidates,
      selectedTargets,
    };
  });
}

export async function GET(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  const url = new URL(request.url);
  const summaryOnly = url.searchParams.get("summary") === "1";

  try {
    if (summaryOnly) {
      return NextResponse.json({
        ok: true,
        routeMarker: ROUTE_MARKER,
        pendingCount: await countConsequenceConstructorTasksV1(),
      });
    }

    await reconcileConsequenceConstructorTasksV1({ limit: 1000 });
    const [tasks, templates] = await Promise.all([
      listConsequenceConstructorTasksV1(),
      listConsequenceTemplateOptionsV1(),
    ]);
    const enrichedTasks = await enrichTasksWithTargets(
      tasks,
      url.searchParams.get("locale"),
    );

    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      pendingCount: enrichedTasks.length,
      tasks: enrichedTasks,
      templates,
      targetSelectionEnabled: true,
      targetSelectionPolicy: "related_leaf_objects_only",
      relationDirectionPolicy: "either_direction_for_candidate_discovery",
      contextualPairPolicy: "task_first_then_typical_activity",
      targetSelectionBeforeTemplateAllowed: true,
      formulaWriteEnabled: false,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  let body: WorkBody;
  try {
    body = (await request.json()) as WorkBody;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const action = text(body.action);

  if (action === "bind_template") {
    try {
      const result = await bindConsequenceTaskToTemplateV1({
        taskId: text(body.taskId),
        templateId: text(body.templateId),
        curatorMetadata: adminMetadata(guard),
      });
      return NextResponse.json({
        ok: true,
        routeMarker: ROUTE_MARKER,
        action,
        ...result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = message.endsWith("NOT_FOUND")
        ? 404
        : message.includes("INVALID") || message.includes("NOT_AVAILABLE")
          ? 409
          : 500;
      return errorResponse(error, status);
    }
  }

  if (action === "select_target") {
    const taskId = text(body.taskId);
    const targetValueObjectId = text(body.targetValueObjectId);

    if (!UUID_RE.test(taskId)) {
      return errorResponse("CONSEQUENCE_TASK_ID_INVALID", 400);
    }
    if (!UUID_RE.test(targetValueObjectId)) {
      return errorResponse("CONSEQUENCE_TARGET_VALUE_OBJECT_ID_INVALID", 400);
    }

    try {
      const tasks = await listConsequenceConstructorTasksV1();
      const task = tasks.find((item) => item.id === taskId) ?? null;
      if (!task) return errorResponse("CONSEQUENCE_TASK_NOT_FOUND", 404);
      const candidateMap = await buildTargetCandidates(
        [task.sourceValueObjectId],
        "en",
      );
      const candidate =
        (candidateMap.get(task.sourceValueObjectId) ?? []).find(
          (item) => item.id === targetValueObjectId,
        ) ?? null;

      if (!candidate) {
        return errorResponse(
          "CONSEQUENCE_TARGET_NOT_RELATED_LEAF_OBJECT",
          409,
        );
      }

      const { data: existingRows, error: existingError } = await supabase
        .from("activity_processing_logs")
        .select("id")
        .eq("processor_name", CONSEQUENCE_PROCESSOR)
        .eq("processor_version", CONSEQUENCE_PROCESSOR_VERSION)
        .contains("metadata_json", {
          eventCode: TARGET_SELECTED_EVENT,
          consequenceTaskId: task.id,
          targetValueObjectId,
        })
        .limit(1);

      if (existingError) {
        throw new Error(
          `CONSEQUENCE_TARGET_SELECTION_DUPLICATE_READ_FAILED:${existingError.message}`,
        );
      }

      if (existingRows?.[0]) {
        return NextResponse.json({
          ok: true,
          routeMarker: ROUTE_MARKER,
          action,
          duplicate: true,
          targetValueObjectId,
        });
      }

      const now = new Date().toISOString();
      const { error } = await supabase.from("activity_processing_logs").insert({
        id: crypto.randomUUID(),
        user_id: guard.appUser.id,
        raw_signal_id: task.rawSignalId,
        activity_event_id: task.activityEventId,
        processor_name: CONSEQUENCE_PROCESSOR,
        processor_version: CONSEQUENCE_PROCESSOR_VERSION,
        processing_stage: "validate",
        processing_status: "completed",
        severity: "notice",
        message: "Consequence target leaf selected",
        input_json: {},
        output_json: {},
        error_json: {},
        metadata_json: {
          contract: TARGET_SELECTION_CONTRACT,
          eventCode: TARGET_SELECTED_EVENT,
          contextualPairPolicy: "task_first_then_typical_activity",
          activityContextStatus: task.activityTemplateId
            ? "typical_bound"
            : "raw_pending_template",
          consequenceTaskId: task.id,
          activityTemplateId: task.activityTemplateId,
          activityTemplateTitleSnapshot:
            task.activityTemplateTitle ?? task.activityTitle,
          parameterDefinitionId: task.parameterDefinitionId,
          parameterCode: task.parameterCode,
          sourceValueObjectId: task.sourceValueObjectId,
          sourceValueObjectTitleSnapshot: task.sourceValueObjectTitle,
          targetValueObjectId: candidate.id,
          targetValueObjectTitleSnapshot: candidate.title,
          relationIds: candidate.relationIds,
          relationTypeCodes: candidate.relationTypeCodes,
          formulaConfigured: false,
          selectedAt: now,
          ...adminMetadata(guard),
        },
        started_at: now,
        finished_at: now,
        duration_ms: 0,
      });

      if (error) {
        throw new Error(
          `CONSEQUENCE_TARGET_SELECTION_WRITE_FAILED:${error.message}`,
        );
      }

      return NextResponse.json({
        ok: true,
        routeMarker: ROUTE_MARKER,
        action,
        targetValueObjectId: candidate.id,
        targetValueObjectTitle: candidate.title,
        relationIds: candidate.relationIds,
        relationTypeCodes: candidate.relationTypeCodes,
      });
    } catch (error) {
      return errorResponse(error);
    }
  }

  return errorResponse("CONSEQUENCE_ACTION_INVALID", 400);
}
