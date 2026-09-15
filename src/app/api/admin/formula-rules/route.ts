import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { configureFormulaRuleDraftV1 } from "@/lib/reality-curator/formula-rule-builder.server";
import {
  createFormulaRuleDraftV1,
  listFormulaRuleRegistryV1,
} from "@/lib/reality-curator/formula-rule-registry.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "admin-formula-rules-v1" as const;

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function errorStatus(message: string) {
  if (message.endsWith("_NOT_FOUND")) return 404;
  if (message.startsWith("FORMULA_RULE_BUILDER_")) return 400;
  if (
    message.includes("_INVALID") ||
    message.includes("_MUST_BE_") ||
    message.includes("_NOT_EDITABLE") ||
    message.includes("_PATCH_EMPTY")
  ) {
    return 400;
  }
  if (
    message.includes("OWNER_MISMATCH") ||
    message.includes("NOT_OWNED") ||
    message.includes("PROTECTED")
  ) {
    return 403;
  }
  if (
    message.includes("23505") ||
    message.includes("duplicate") ||
    message.includes("DUPLICATE")
  ) {
    return 409;
  }
  return 500;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json(
    {
      ok: false,
      routeMarker: ROUTE_MARKER,
      error: message,
      formulaExecutionEnabled: false,
      factWriteEnabled: false,
    },
    { status: errorStatus(message) },
  );
}

export async function GET() {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  try {
    const series = await listFormulaRuleRegistryV1();

    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      series,
      count: series.length,
      draftWriteEnabled: true,
      publishEnabled: false,
      formulaExecutionEnabled: false,
      factWriteEnabled: false,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  let body: JsonRecord;
  try {
    body = asRecord(await request.json());
  } catch {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        error: "FORMULA_RULE_INVALID_JSON",
      },
      { status: 400 },
    );
  }

  const action = text(body.action);

  try {
    if (action === "create_draft") {
      const result = await createFormulaRuleDraftV1({
        ...(body as Parameters<typeof createFormulaRuleDraftV1>[0]),
        seriesMetadata: {
          ...asRecord(body.seriesMetadata),
          curatorAppUserId: guard.appUser.id,
          curatorAdminId: guard.platformAdmin.id,
          curatorRole: guard.platformAdmin.role,
          provenance: "admin_formula_rule_route",
        },
        versionMetadata: {
          ...asRecord(body.versionMetadata),
          curatorAppUserId: guard.appUser.id,
          curatorAdminId: guard.platformAdmin.id,
          curatorRole: guard.platformAdmin.role,
          provenance: "admin_formula_rule_route",
        },
      });

      return NextResponse.json({
        ok: true,
        routeMarker: ROUTE_MARKER,
        action,
        ...result,
        publishEnabled: false,
        formulaExecutionEnabled: false,
        factWriteEnabled: false,
      });
    }

    if (action === "configure_draft") {
      const result = await configureFormulaRuleDraftV1({
        ...(body as Parameters<typeof configureFormulaRuleDraftV1>[0]),
        curatorMetadata: {
          ...asRecord(body.curatorMetadata),
          curatorAppUserId: guard.appUser.id,
          curatorAdminId: guard.platformAdmin.id,
          curatorRole: guard.platformAdmin.role,
          builderProvenance: "admin_formula_rule_builder_v1",
        },
      });

      return NextResponse.json({
        ok: true,
        routeMarker: ROUTE_MARKER,
        action,
        ...result,
        publishEnabled: false,
        formulaExecutionEnabled: false,
        factWriteEnabled: false,
      });
    }

    if (action === "update_draft") {
      return NextResponse.json(
        {
          ok: false,
          routeMarker: ROUTE_MARKER,
          error:
            "FORMULA_RULE_RAW_DRAFT_UPDATE_RETIRED_USE_CONFIGURE_DRAFT",
          allowedActions: ["create_draft", "configure_draft"],
        },
        { status: 410 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        error: "FORMULA_RULE_ACTION_INVALID",
        allowedActions: ["create_draft", "configure_draft"],
      },
      { status: 400 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
