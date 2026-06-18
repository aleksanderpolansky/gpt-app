import { NextResponse } from "next/server";

import {
  isValueObjectStandardMetricType,
  isValueObjectStandardPeriod,
  isValueObjectStandardPriority,
  isValueObjectStandardRuleType,
  isValueObjectStandardSource,
  isValueObjectStandardStatus,
  isValueObjectStandardUnit,
  validateValueObjectTargetStandard,
  type ValueObjectTargetStandard,
} from "@/types/value-object-standards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER =
  "value-object-standards-save-gate-route-no-write-step61-v1" as const;

const ROUTE_STATUS =
  "guarded_persistence_contract_only_no_write" as const;

const SIDE_EFFECTS = {
  dbReadExecuted: false,
  dbWriteExecuted: false,
  sqlExecuted: false,
  externalModelCallExecuted: false,
  valueObjectTargetStandardCreated: false,
  valueObjectTargetStandardUpdated: false,
  valueObjectTargetStandardArchived: false,
  rowsActuallyWritten: 0,
} as const;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type SaveGateMode = "preview" | "confirm_save";

type ValidationSummary = {
  mode: SaveGateMode;
  routeValueObjectId: string;
  bodyValueObjectId: string | null;
  idempotencyKey: string | null;
  writeIntentDetected: boolean;
};

type SaveGateValidationResult =
  | {
      ok: true;
      summary: ValidationSummary;
      standard: ValueObjectTargetStandard;
      errors: string[];
      warnings: string[];
    }
  | {
      ok: false;
      summary: ValidationSummary;
      standard: null;
      errors: string[];
      warnings: string[];
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

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeMode(value: unknown): SaveGateMode {
  return value === "confirm_save" ? "confirm_save" : "preview";
}

function normalizeOptionalString(value: unknown): string | undefined {
  const normalized = asString(value);

  return normalized ?? undefined;
}

function validateStandardDraft(
  routeValueObjectId: string,
  body: Record<string, unknown>
): SaveGateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const mode = normalizeMode(body.mode);
  const idempotencyKey = asString(body.idempotencyKey);
  const draft = asRecord(body.standardDraft);
  const bodyValueObjectId = asString(draft.valueObjectId);
  const writeIntentDetected = mode === "confirm_save";

  if (body.mode !== undefined && body.mode !== "preview" && body.mode !== "confirm_save") {
    warnings.push("Unknown mode was normalized to preview.");
  }

  if (!idempotencyKey) {
    warnings.push("idempotencyKey is missing; future writes will require it.");
  }

  if (!bodyValueObjectId) {
    errors.push("standardDraft.valueObjectId is required.");
  } else if (bodyValueObjectId !== routeValueObjectId) {
    errors.push("standardDraft.valueObjectId must match route valueObjectId.");
  }

  const metricType = asString(draft.metricType);
  const targetValue = asFiniteNumber(draft.targetValue);
  const targetMin = asFiniteNumber(draft.targetMin);
  const targetMax = asFiniteNumber(draft.targetMax);
  const unit = asString(draft.unit);
  const period = asString(draft.period);
  const ruleType = asString(draft.ruleType);
  const priority = asString(draft.priority);
  const source = asString(draft.source);
  const status = asString(draft.status);

  if (!metricType || !isValueObjectStandardMetricType(metricType)) {
    errors.push("standardDraft.metricType is invalid.");
  }

  if (targetValue === null) {
    errors.push("standardDraft.targetValue must be a finite number.");
  }

  if (!unit || !isValueObjectStandardUnit(unit)) {
    errors.push("standardDraft.unit is invalid.");
  }

  if (!period || !isValueObjectStandardPeriod(period)) {
    errors.push("standardDraft.period is invalid.");
  }

  if (!ruleType || !isValueObjectStandardRuleType(ruleType)) {
    errors.push("standardDraft.ruleType is invalid.");
  }

  if (!priority || !isValueObjectStandardPriority(priority)) {
    errors.push("standardDraft.priority is invalid.");
  }

  if (!source || !isValueObjectStandardSource(source)) {
    errors.push("standardDraft.source is invalid.");
  }

  if (!status || !isValueObjectStandardStatus(status)) {
    errors.push("standardDraft.status is invalid.");
  }

  if (writeIntentDetected) {
    errors.push("confirm_save is contract vocabulary only in Step 61C and remains blocked.");
  }

  const summary: ValidationSummary = {
    mode,
    routeValueObjectId,
    bodyValueObjectId,
    idempotencyKey,
    writeIntentDetected,
  };

  if (
    errors.length > 0 ||
    !bodyValueObjectId ||
    !metricType ||
    !isValueObjectStandardMetricType(metricType) ||
    targetValue === null ||
    !unit ||
    !isValueObjectStandardUnit(unit) ||
    !period ||
    !isValueObjectStandardPeriod(period) ||
    !ruleType ||
    !isValueObjectStandardRuleType(ruleType) ||
    !priority ||
    !isValueObjectStandardPriority(priority) ||
    !source ||
    !isValueObjectStandardSource(source) ||
    !status ||
    !isValueObjectStandardStatus(status)
  ) {
    return {
      ok: false,
      summary,
      standard: null,
      errors,
      warnings,
    };
  }

  const standard: ValueObjectTargetStandard = {
    valueObjectId: bodyValueObjectId,
    metricType,
    targetValue,
    targetMin: targetMin ?? undefined,
    targetMax: targetMax ?? undefined,
    unit,
    period,
    ruleType,
    priority,
    source,
    status,
    label: normalizeOptionalString(draft.label),
    description: normalizeOptionalString(draft.description),
    safetyNote: normalizeOptionalString(draft.safetyNote),
  };

  const contractValidation = validateValueObjectTargetStandard(standard);

  if (!contractValidation.ok) {
    return {
      ok: false,
      summary,
      standard: null,
      errors: [...errors, ...contractValidation.errors],
      warnings,
    };
  }

  return {
    ok: true,
    summary,
    standard,
    errors,
    warnings,
  };
}

function buildNoWriteResponse(params: {
  routeValueObjectId: string;
  validation: SaveGateValidationResult;
}) {
  return {
    ok: params.validation.ok,
    endpoint: `/api/value-objects/${params.routeValueObjectId}/standards/save-gate`,
    routeMarker: ROUTE_MARKER,
    routeStatus: ROUTE_STATUS,
    routePurpose: "value_object_target_standard_guarded_persistence_contract_no_write",
    productionWriteEnabled: false,
    requestSummary: params.validation.summary,
    validation: {
      ok: params.validation.ok,
      errors: params.validation.errors,
      warnings: params.validation.warnings,
    },
    plannedWrites: params.validation.ok
      ? [
          {
            table: "value_object_target_standards",
            operation:
              params.validation.summary.mode === "confirm_save"
                ? "blocked_create"
                : "planned_create",
            status: "not_executed",
            valueObjectId: params.routeValueObjectId,
            metricType: params.validation.standard.metricType,
            period: params.validation.standard.period,
            ruleType: params.validation.standard.ruleType,
          },
        ]
      : [],
    skipped: [
      {
        reason: "STEP61C_NO_WRITE_ROUTE_SCAFFOLD",
        detail:
          "This route validates the future persistence contract but does not create, update, archive, or delete standards.",
      },
    ],
    futurePersistenceContract: {
      allowedModes: ["preview", "confirm_save"],
      currentMode: params.validation.summary.mode,
      confirmSaveEnabled: false,
      confirmSaveBlockedBy: "VALUE_OBJECT_STANDARDS_SAVE_GATE_WRITE_NOT_ENABLED",
      futureTable: "value_object_target_standards",
      serverMediatedOnly: true,
    },
    sideEffects: SIDE_EFFECTS,
    rules: [
      "This route is a no-write save-gate scaffold for ValueObjectTargetStandard.",
      "This route validates request shape and returns planned-write preview data.",
      "This route must not call Supabase directly in Step 61C.",
      "This route must not insert, update, upsert, archive, or delete rows.",
      "This route must not execute SQL.",
      "This route must not call external model providers.",
      "confirm_save remains blocked until a later gated implementation step.",
      "Future persistence must remain server-mediated and must protect user-owned fact privacy.",
    ],
  };
}

function buildValidationErrorResponse(params: {
  routeValueObjectId: string;
  validation: SaveGateValidationResult;
  status: number;
  errorCode: string;
  errorMessage: string;
}) {
  return NextResponse.json(
    {
      ...buildNoWriteResponse({
        routeValueObjectId: params.routeValueObjectId,
        validation: params.validation,
      }),
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
    },
    { status: params.status }
  );
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const routeValueObjectId = decodeURIComponent(id);

  const validation = validateStandardDraft(routeValueObjectId, {
    mode: "preview",
    idempotencyKey: `preview:${routeValueObjectId}:duration:day`,
    standardDraft: {
      valueObjectId: routeValueObjectId,
      metricType: "duration",
      targetValue: 60,
      unit: "minutes",
      period: "day",
      ruleType: "desired_minimum",
      priority: "normal",
      source: "user_defined",
      status: "draft",
      label: "Preview standard",
      description:
        "No-write preview standard used to verify the save-gate contract route.",
    },
  });

  return NextResponse.json(
    buildNoWriteResponse({
      routeValueObjectId,
      validation,
    }),
    { status: 200 }
  );
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const routeValueObjectId = decodeURIComponent(id);

  let body: unknown = {};
  let invalidJson = false;

  try {
    body = await request.json();
  } catch {
    body = {};
    invalidJson = true;
  }

  const validation = validateStandardDraft(routeValueObjectId, asRecord(body));

  if (invalidJson) {
    return buildValidationErrorResponse({
      routeValueObjectId,
      validation,
      status: 400,
      errorCode: "VALUE_OBJECT_STANDARDS_SAVE_GATE_INVALID_JSON",
      errorMessage: "Request body must be valid JSON.",
    });
  }

  if (!validation.ok) {
    return buildValidationErrorResponse({
      routeValueObjectId,
      validation,
      status: validation.summary.writeIntentDetected ? 409 : 400,
      errorCode: validation.summary.writeIntentDetected
        ? "VALUE_OBJECT_STANDARDS_SAVE_GATE_WRITE_NOT_ENABLED"
        : "VALUE_OBJECT_STANDARDS_SAVE_GATE_VALIDATION_FAILED",
      errorMessage: validation.summary.writeIntentDetected
        ? "confirm_save is contract vocabulary only in Step 61C. Persistence remains blocked."
        : "Request body did not pass ValueObjectTargetStandard validation.",
    });
  }

  return NextResponse.json(
    buildNoWriteResponse({
      routeValueObjectId,
      validation,
    }),
    { status: 200 }
  );
}
