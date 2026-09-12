import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
  type RequirePlatformAdminSuccess,
} from "@/lib/admin/require-platform-admin";
import {
  bindConsequenceTaskToTemplateV1,
  countConsequenceConstructorTasksV1,
  listConsequenceConstructorTasksV1,
  listConsequenceTemplateOptionsV1,
  reconcileConsequenceConstructorTasksV1,
} from "@/lib/reality-curator/consequence-constructor.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "admin-consequence-constructor-v1" as const;

type JsonRecord = Record<string, unknown>;
type WorkBody = {
  action?: unknown;
  taskId?: unknown;
  templateId?: unknown;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
    const tasks = await listConsequenceConstructorTasksV1();
    const templates = await listConsequenceTemplateOptionsV1();
    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      pendingCount: tasks.length,
      tasks,
      templates,
      targetSelectionEnabled: false,
      targetSelectionReason: "observation_object_relations_not_configured_yet",
      contextualPairPolicy: "activity_specific_only",
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
  if (action !== "bind_template") {
    return errorResponse("CONSEQUENCE_ACTION_INVALID", 400);
  }

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
