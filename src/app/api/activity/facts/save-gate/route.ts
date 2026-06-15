import { NextResponse } from "next/server";

import {
  saveGateContractPreviewRequest,
  saveGateContractPreviewResponse,
} from "@/data/activity-to-value-objects/save-gate-contract-preview";
import { buildNoWriteExecutionPlan } from "@/lib/activity/facts/saveGate/executionPlan";
import {
  validateActivityFactsSaveGateRequest,
  type ActivityFactsSaveGateValidationResult,
} from "@/lib/activity/facts/saveGate/requestValidation";
import type { ActivityFactsSaveGateResponse } from "@/types/activity-facts-save-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/facts/save-gate" as const;

const ROUTE_LAYER =
  "activity-facts-save-gate-route-plan-scaffold-no-write-v1" as const;

const SIDE_EFFECTS = {
  dbReadExecuted: false,
  dbWriteExecuted: false,
  sqlExecuted: false,
  openAiCallExecuted: false,
  valueObjectCreated: false,
  activityEventCreated: false,
  activityEventMeasureCreated: false,
  activityObjectFactCreated: false,
  activityFactReviewItemCreated: false,
  recalculationQueueItemCreated: false,
  rowsActuallyWritten: 0,
} as const;

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function buildNoWriteResponse(params: {
  response: ActivityFactsSaveGateResponse;
  validation: ActivityFactsSaveGateValidationResult;
  ok: boolean;
}) {
  const executionPlan = buildNoWriteExecutionPlan(params.validation);

  return {
    ...params.response,
    ok: params.ok,
    endpoint: ENDPOINT,
    routeLayer: ROUTE_LAYER,
    routePurpose: "activity_facts_save_gate_scaffold_no_write",
    routeStatus: "plan_scaffold_only_no_persistence",
    productionWriteEnabled: false,
    requestSummary: params.validation.summary,
    validation: {
      ok: params.validation.ok,
      errors: params.validation.errors,
      warnings: params.validation.warnings,
    },
    plannedWrites: executionPlan.plannedWrites,
    skipped: executionPlan.skipped,
    noWriteExecutionPlan: executionPlan,
    sideEffects: SIDE_EFFECTS,
    rules: [
      "This route is a no-write execution-plan scaffold for the future server-mediated save gate.",
      "This route validates request shape and builds a planned-write preview.",
      "This route does not persist anything.",
      "This route must not insert, update, upsert or delete rows.",
      "This route must not call Supabase directly in this step.",
      "This route must not execute SQL.",
      "This route must not call external AI providers.",
      "This route blocks explicit write-intent requests until a later gated implementation step.",
      "The future write flow must remain server-mediated and must preserve user-owned fact privacy.",
    ],
  };
}

function buildValidationErrorResponse(params: {
  validation: ActivityFactsSaveGateValidationResult;
  errorCode: string;
  errorMessage: string;
  status: number;
}) {
  return NextResponse.json(
    {
      ...buildNoWriteResponse({
        response: {
          ...saveGateContractPreviewResponse,
          ok: false,
          writeStatus: "not_executed_contract_preview",
          dbWriteExecuted: false,
          sqlExecuted: false,
          openAiCallExecuted: false,
        },
        validation: params.validation,
        ok: false,
      }),
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
    },
    { status: params.status }
  );
}

export async function GET() {
  const validation = validateActivityFactsSaveGateRequest(
    saveGateContractPreviewRequest
  );

  return NextResponse.json(
    buildNoWriteResponse({
      response: saveGateContractPreviewResponse,
      validation,
      ok: true,
    }),
    { status: 200 }
  );
}

export async function POST(request: Request) {
  let body: unknown = {};
  let invalidJson = false;

  try {
    body = await request.json();
  } catch {
    body = {};
    invalidJson = true;
  }

  const validation = validateActivityFactsSaveGateRequest(asRecord(body));

  if (invalidJson) {
    return buildValidationErrorResponse({
      validation,
      errorCode: "ACTIVITY_FACTS_SAVE_GATE_INVALID_JSON",
      errorMessage: "Request body must be valid JSON.",
      status: 400,
    });
  }

  if (!validation.ok) {
    return buildValidationErrorResponse({
      validation,
      errorCode: "ACTIVITY_FACTS_SAVE_GATE_VALIDATION_FAILED",
      errorMessage: "Request body did not pass save-gate validation.",
      status: 400,
    });
  }

  if (validation.summary.writeIntentDetected) {
    return buildValidationErrorResponse({
      validation,
      errorCode: "ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED",
      errorMessage:
        "The save-gate route exists only as a no-write execution-plan scaffold in this step. Write intent was detected and blocked.",
      status: 409,
    });
  }

  return NextResponse.json(
    buildNoWriteResponse({
      response: saveGateContractPreviewResponse,
      validation,
      ok: true,
    }),
    { status: 200 }
  );
}
