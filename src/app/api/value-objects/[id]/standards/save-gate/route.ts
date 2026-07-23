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

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../../lib/auth0";
import { supabase } from "../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER =
  "value-object-standards-save-gate-route-server-mediated-real-write-step15g-v1" as const;

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

type AppUserRow = {
  id: string;
  auth0_sub?: string | null;
};

type ActorRow = {
  id: string;
  actor_type?: string | null;
};

type ValueObjectRow = {
  id: string;
  owner_actor_id?: string | null;
  created_by_actor_id?: string | null;
  actor_id?: string | null;
  app_user_id?: string | null;
  owner_user_id?: string | null;
  organization_id?: string | null;
  usage_scope?: string | null;
  title?: string | null;
  status?: string | null;
};

type CurrentUserContext =
  | {
      ok: true;
      appUser: AppUserRow;
      personActor: ActorRow;
    }
  | {
      ok: false;
      status: number;
      errorCode: string;
      errorMessage: string;
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
    const parsed = Number(value.trim());

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeMode(value: unknown): SaveGateMode {
  return value === "confirm_save" ? "confirm_save" : "preview";
}

function normalizeOptionalString(value: unknown): string | undefined {
  return asString(value) ?? undefined;
}

function buildEndpoint(routeValueObjectId: string) {
  return `/api/value-objects/${routeValueObjectId}/standards/save-gate`;
}

function validateStandardDraft(
  routeValueObjectId: string,
  body: Record<string, unknown>,
): SaveGateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const mode = normalizeMode(body.mode);
  const idempotencyKey = asString(body.idempotencyKey);
  const draft = asRecord(body.standardDraft);
  const bodyValueObjectId = asString(draft.valueObjectId);
  const writeIntentDetected = mode === "confirm_save";

  if (
    body.mode !== undefined &&
    body.mode !== "preview" &&
    body.mode !== "confirm_save"
  ) {
    warnings.push("Unknown mode was normalized to preview.");
  }

  if (!idempotencyKey) {
    warnings.push("idempotencyKey is missing; confirm_save requires it.");
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

  if (writeIntentDetected && !idempotencyKey) {
    errors.push("idempotencyKey is required for confirm_save.");
  }

  if (writeIntentDetected && source !== "user_defined") {
    errors.push("confirm_save allows only user_defined source.");
  }

  if (writeIntentDetected && status === "archived") {
    errors.push("confirm_save cannot create an archived standard.");
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

function buildPreviewResponse(params: {
  routeValueObjectId: string;
  validation: SaveGateValidationResult;
}) {
  return {
    ok: params.validation.ok,
    endpoint: buildEndpoint(params.routeValueObjectId),
    routeMarker: ROUTE_MARKER,
    routeStatus: "preview_ready_real_write_available_when_confirmed",
    routePurpose:
      "value_object_target_standard_guarded_persistence_preview_or_server_mediated_write",
    productionWriteEnabled: true,
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
                ? "create_when_confirmed"
                : "planned_create",
            status: "not_executed_in_preview",
            valueObjectId: params.routeValueObjectId,
            metricType: params.validation.standard.metricType,
            period: params.validation.standard.period,
            ruleType: params.validation.standard.ruleType,
            source: params.validation.standard.source,
          },
        ]
      : [],
    futurePersistenceContract: {
      allowedModes: ["preview", "confirm_save"],
      currentMode: params.validation.summary.mode,
      confirmSaveEnabled: true,
      confirmSaveBlockedBy: null,
      futureTable: "value_object_target_standards",
      serverMediatedOnly: true,
    },
    sideEffects: {
      dbReadExecuted: false,
      dbWriteExecuted: false,
      sqlExecuted: false,
      externalModelCallExecuted: false,
      valueObjectReadExecuted: false,
      valueObjectOwnershipChecked: false,
      valueObjectTargetStandardCreated: false,
      valueObjectTargetStandardUpdated: false,
      valueObjectTargetStandardArchived: false,
      rowsActuallyWritten: 0,
    },
    rules: [
      "Preview mode remains no-write.",
      "confirm_save performs server-mediated write only after validation.",
      "Ownership is derived from Auth0 session, app_users, persons, and actors.",
      "Client-provided ownership fields are ignored.",
      "Only user_defined target standards can be created through this user route.",
      "Direct browser Supabase writes remain forbidden.",
      "This route does not execute SQL.",
      "This route does not call external model providers.",
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
      ...buildPreviewResponse({
        routeValueObjectId: params.routeValueObjectId,
        validation: params.validation,
      }),
      ok: false,
      writeStatus: "not_written",
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
    },
    { status: params.status },
  );
}

function buildWriteErrorResponse(params: {
  routeValueObjectId: string;
  validation: Extract<SaveGateValidationResult, { ok: true }>;
  status: number;
  errorCode: string;
  errorMessage: string;
  dbReadExecuted?: boolean;
  dbWriteExecuted?: boolean;
}) {
  return NextResponse.json(
    {
      ok: false,
      endpoint: buildEndpoint(params.routeValueObjectId),
      routeMarker: ROUTE_MARKER,
      routeStatus: "server_mediated_write_failed",
      productionWriteEnabled: true,
      writeStatus: "failed",
      requestSummary: params.validation.summary,
      validation: {
        ok: params.validation.ok,
        errors: params.validation.errors,
        warnings: params.validation.warnings,
      },
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      dbReadExecuted: params.dbReadExecuted ?? true,
      dbWriteExecuted: params.dbWriteExecuted ?? false,
      sqlExecuted: false,
      externalModelCallExecuted: false,
      sideEffects: {
        dbReadExecuted: params.dbReadExecuted ?? true,
        dbWriteExecuted: params.dbWriteExecuted ?? false,
        sqlExecuted: false,
        externalModelCallExecuted: false,
        valueObjectReadExecuted: true,
        valueObjectOwnershipChecked: true,
        valueObjectTargetStandardCreated: false,
        valueObjectTargetStandardUpdated: false,
        valueObjectTargetStandardArchived: false,
        rowsActuallyWritten: 0,
      },
      safety: {
        serverMediatedOnly: true,
        directBrowserSupabaseWriteAllowed: false,
        clientProvidedOwnershipTrusted: false,
        medicalDiagnosisAllowed: false,
      },
    },
    { status: params.status },
  );
}

async function resolveCurrentUserContext(): Promise<CurrentUserContext> {
  let session: Awaited<ReturnType<typeof auth0.getSession>> | null = null;

  try {
    session = await auth0.getSession();
  } catch {
    session = null;
  }

  const auth0Sub = asString(session?.user?.sub);

  if (!auth0Sub) {
    return {
      ok: false,
      status: 401,
      errorCode: "VALUE_OBJECT_STANDARDS_SAVE_UNAUTHENTICATED",
      errorMessage: "Authentication is required to save target standards.",
    };
  }

  try {
    const actorContext = await resolveActiveActorContext(auth0Sub);

    return {
      ok: true,
      appUser: {
        id: actorContext.appUserId,
        auth0_sub: auth0Sub,
      },
      personActor: {
        id: actorContext.actorId,
        actor_type: actorContext.actorType,
      },
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        ok: false,
        status: error.status,
        errorCode: error.code,
        errorMessage: error.message,
      };
    }

    return {
      ok: false,
      status: 500,
      errorCode: "VALUE_OBJECT_STANDARDS_SAVE_ACTOR_CONTEXT_FAILED",
      errorMessage: "Could not resolve active actor context.",
    };
  }
}

function isValueObjectOwnedByCurrentActor(params: {
  valueObject: ValueObjectRow;
  appUser: AppUserRow;
  personActor: ActorRow;
}) {
  return (
    params.valueObject.owner_user_id === params.appUser.id &&
    params.valueObject.owner_actor_id === params.personActor.id
  );
}

async function readOwnedValueObject(params: {
  valueObjectId: string;
  appUser: AppUserRow;
  personActor: ActorRow;
}) {
  const { data, error } = await supabase
    .from("value_objects")
    .select(
      `
      id,
      owner_actor_id,
      created_by_actor_id,
      actor_id,
      app_user_id,
      owner_user_id,
      organization_id,
      usage_scope,
      title,
      status
    `,
    )
    .eq("id", params.valueObjectId)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      status: 500,
      errorCode: "VALUE_OBJECT_STANDARDS_SAVE_VALUE_OBJECT_LOOKUP_FAILED",
      errorMessage: error.message,
      valueObject: null,
    };
  }

  if (!data) {
    return {
      ok: false as const,
      status: 404,
      errorCode: "VALUE_OBJECT_STANDARDS_SAVE_VALUE_OBJECT_NOT_FOUND",
      errorMessage: "Value Object not found.",
      valueObject: null,
    };
  }

  const valueObject = data as ValueObjectRow;

  if (
    !isValueObjectOwnedByCurrentActor({
      valueObject,
      appUser: params.appUser,
      personActor: params.personActor,
    })
  ) {
    return {
      ok: false as const,
      status: 403,
      errorCode: "VALUE_OBJECT_STANDARDS_SAVE_VALUE_OBJECT_ACCESS_DENIED",
      errorMessage: "Value Object access denied.",
      valueObject: null,
    };
  }

  return {
    ok: true as const,
    valueObject,
  };
}

async function executeRealSave(params: {
  routeValueObjectId: string;
  validation: Extract<SaveGateValidationResult, { ok: true }>;
}) {
  const context = await resolveCurrentUserContext();

  if (!context.ok) {
    return buildWriteErrorResponse({
      routeValueObjectId: params.routeValueObjectId,
      validation: params.validation,
      status: context.status,
      errorCode: context.errorCode,
      errorMessage: context.errorMessage,
      dbReadExecuted: false,
      dbWriteExecuted: false,
    });
  }

  const ownedValueObject = await readOwnedValueObject({
    valueObjectId: params.routeValueObjectId,
    appUser: context.appUser,
    personActor: context.personActor,
  });

  if (!ownedValueObject.ok) {
    return buildWriteErrorResponse({
      routeValueObjectId: params.routeValueObjectId,
      validation: params.validation,
      status: ownedValueObject.status,
      errorCode: ownedValueObject.errorCode,
      errorMessage: ownedValueObject.errorMessage,
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const idempotencyKey = params.validation.summary.idempotencyKey;

  if (!idempotencyKey) {
    return buildWriteErrorResponse({
      routeValueObjectId: params.routeValueObjectId,
      validation: params.validation,
      status: 400,
      errorCode: "VALUE_OBJECT_STANDARDS_SAVE_IDEMPOTENCY_REQUIRED",
      errorMessage: "idempotencyKey is required for confirm_save.",
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  const { data: existingStandard, error: existingError } = await supabase
    .from("value_object_target_standards")
    .select(
      `
      id,
      value_object_id,
      user_id,
      owner_actor_id,
      metric_type,
      rule_type,
      target_value,
      target_min,
      target_max,
      unit,
      period,
      priority,
      source,
      status,
      label,
      created_at
    `,
    )
    .eq("user_id", context.appUser.id)
    .eq("owner_actor_id", context.personActor.id)
    .eq("value_object_id", params.routeValueObjectId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingError) {
    return buildWriteErrorResponse({
      routeValueObjectId: params.routeValueObjectId,
      validation: params.validation,
      status: 500,
      errorCode: "VALUE_OBJECT_STANDARDS_SAVE_IDEMPOTENCY_CHECK_FAILED",
      errorMessage: existingError.message,
      dbReadExecuted: true,
      dbWriteExecuted: false,
    });
  }

  if (existingStandard) {
    return NextResponse.json(
      {
        ok: true,
        endpoint: buildEndpoint(params.routeValueObjectId),
        routeMarker: ROUTE_MARKER,
        routeStatus: "server_mediated_write_idempotent_replay",
        productionWriteEnabled: true,
        writeStatus: "written",
        idempotentReplay: true,
        createdStandard: existingStandard,
        sideEffects: {
          dbReadExecuted: true,
          dbWriteExecuted: false,
          sqlExecuted: false,
          externalModelCallExecuted: false,
          valueObjectReadExecuted: true,
          valueObjectOwnershipChecked: true,
          valueObjectTargetStandardCreated: false,
          valueObjectTargetStandardUpdated: false,
          valueObjectTargetStandardArchived: false,
          rowsActuallyWritten: 0,
        },
      },
      { status: 200 },
    );
  }

  const standard = params.validation.standard;

  const insertPayload = {
    value_object_id: params.routeValueObjectId,
    user_id: context.appUser.id,
    owner_actor_id: context.personActor.id,
    created_by_actor_id: context.personActor.id,
    organization_id: ownedValueObject.valueObject.organization_id ?? null,
    metric_type: standard.metricType,
    rule_type: standard.ruleType,
    target_value: standard.targetValue,
    target_min: standard.targetMin ?? null,
    target_max: standard.targetMax ?? null,
    unit: standard.unit,
    period: standard.period,
    priority: standard.priority,
    source: "user_defined",
    status: standard.status,
    label: standard.label ?? null,
    description: standard.description ?? null,
    safety_note:
      standard.safetyNote ??
      "User-defined target standard for analytics comparison. Not medical, legal, financial or productivity truth.",
    idempotency_key: idempotencyKey,
    metadata: {
      routeMarker: ROUTE_MARKER,
      routeMode: params.validation.summary.mode,
      requestedSource: standard.source,
      valueObjectTitle: ownedValueObject.valueObject.title ?? null,
      valueObjectUsageScope: ownedValueObject.valueObject.usage_scope ?? null,
    },
  };

  const { data: insertedStandard, error: insertError } = await supabase
    .from("value_object_target_standards")
    .insert(insertPayload)
    .select(
      `
      id,
      value_object_id,
      user_id,
      owner_actor_id,
      metric_type,
      rule_type,
      target_value,
      target_min,
      target_max,
      unit,
      period,
      priority,
      source,
      status,
      label,
      created_at
    `,
    )
    .single();

  if (insertError) {
    return buildWriteErrorResponse({
      routeValueObjectId: params.routeValueObjectId,
      validation: params.validation,
      status: 500,
      errorCode: "VALUE_OBJECT_STANDARDS_SAVE_INSERT_FAILED",
      errorMessage: insertError.message,
      dbReadExecuted: true,
      dbWriteExecuted: true,
    });
  }

  return NextResponse.json(
    {
      ok: true,
      endpoint: buildEndpoint(params.routeValueObjectId),
      routeMarker: ROUTE_MARKER,
      routeStatus: "server_mediated_write_completed",
      productionWriteEnabled: true,
      writeStatus: "written",
      idempotentReplay: false,
      createdStandard: insertedStandard,
      sideEffects: {
        dbReadExecuted: true,
        dbWriteExecuted: true,
        sqlExecuted: false,
        externalModelCallExecuted: false,
        valueObjectReadExecuted: true,
        valueObjectOwnershipChecked: true,
        valueObjectTargetStandardCreated: true,
        valueObjectTargetStandardUpdated: false,
        valueObjectTargetStandardArchived: false,
        rowsActuallyWritten: 1,
      },
    },
    { status: 200 },
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
        "Preview standard used to verify the save-gate contract route without writing.",
    },
  });

  return NextResponse.json(
    buildPreviewResponse({
      routeValueObjectId,
      validation,
    }),
    { status: 200 },
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
      status: 400,
      errorCode: "VALUE_OBJECT_STANDARDS_SAVE_GATE_VALIDATION_FAILED",
      errorMessage:
        "Request body did not pass ValueObjectTargetStandard validation.",
    });
  }

  if (validation.summary.mode === "preview") {
    return NextResponse.json(
      buildPreviewResponse({
        routeValueObjectId,
        validation,
      }),
      { status: 200 },
    );
  }

  return executeRealSave({
    routeValueObjectId,
    validation,
  });
}
