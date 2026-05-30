import { NextResponse } from "next/server";

import { buildSemanticPersistenceDryRunRouteV0 } from "../../../../../../lib/activity/categoryDerivation/semanticPersistenceDryRunRouteContractV0";
import { buildSemanticServerAuthOwnershipDryRunContextV0 } from "../../../../../../lib/activity/categoryDerivation/semanticServerAuthOwnershipDryRunContextV0";
import { runSemanticPreviewPipelineV0 } from "../../../../../../lib/activity/categoryDerivation/semanticPreviewPipelineV0";

export const dynamic = "force-dynamic";

type SemanticPersistenceDryRunBodyV0 = {
  inputText?: unknown;
  durationMinutes?: unknown;
  inputLanguage?: unknown;
  p4Step?: unknown;
  requestedIntent?: unknown;
  requestedTargetKey?: unknown;
  requestedActionKey?: unknown;
  userConfirmed?: unknown;
  clientRequestedWriteExecution?: unknown;
  authenticatedUserId?: unknown;
  actorId?: unknown;
  rlsVerificationToken?: unknown;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asDurationMinutes(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function buildDefaultDryRunBody(): Required<
  Pick<
    SemanticPersistenceDryRunBodyV0,
    "inputText" | "durationMinutes" | "inputLanguage" | "requestedIntent" | "requestedTargetKey"
  >
> {
  return {
    inputText: "учил ребёнка математике 30 минут",
    durationMinutes: 30,
    inputLanguage: "ru",
    requestedIntent: "persist_value_object_candidate",
    requestedTargetKey: "vo:personal:child-learning-support",
  };
}

export async function GET() {
  const serverAuthOwnershipContext =
    await buildSemanticServerAuthOwnershipDryRunContextV0();

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/semantic/persistence-dry-run",
    method: "POST",
    policy: "semantic_persistence_dry_run_route_skeleton_v0",
    mode: "dry_run_only_no_write",
    countdownBeforeFirstDbWrite: "4/4",
    serverAuthOwnershipContext,
    exampleBody: buildDefaultDryRunBody(),
    writes: {
      sqlExecuted: false,
      dbWriteExecuted: false,
      supabaseWriteExecuted: false,
      activityEventInserted: false,
      valueObjectCreated: false,
      activityValueObjectLinkCreated: false,
      stateDeltaCreated: false,
      stateFactCreated: false,
      stateSnapshotCreated: false,
      serverAuthOwnershipContextDbWriteExecuted:
        serverAuthOwnershipContext.writes.dbWriteExecuted,
      serverAuthOwnershipContextSupabaseWriteExecuted:
        serverAuthOwnershipContext.writes.supabaseWriteExecuted,
    },
  });
}

export async function POST(request: Request) {
  let body: SemanticPersistenceDryRunBodyV0;

  try {
    body = (await request.json()) as SemanticPersistenceDryRunBodyV0;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  const defaults = buildDefaultDryRunBody();

  const inputText = asString(body.inputText) ?? defaults.inputText;
  const durationMinutes =
    asDurationMinutes(body.durationMinutes) ??
    (defaults.durationMinutes as number);
  const inputLanguage = asString(body.inputLanguage) ?? defaults.inputLanguage;
  const p4Step =
    asString(body.p4Step) ??
    "C8-I-IMPLEMENT-28-SEMANTIC-PERSISTENCE-DRY-RUN";

  const requestedIntent =
    asString(body.requestedIntent) ?? defaults.requestedIntent;
  const requestedTargetKey =
    asString(body.requestedTargetKey) ?? defaults.requestedTargetKey;
  const requestedActionKey = asString(body.requestedActionKey);
  const userConfirmed = asBoolean(body.userConfirmed);
  const clientRequestedWriteExecution = asBoolean(
    body.clientRequestedWriteExecution
  );

  const preview = runSemanticPreviewPipelineV0({
    inputText,
    durationMinutes,
    inputLanguage,
    p4Step,
  });

  const dryRun = buildSemanticPersistenceDryRunRouteV0({
    preview,
    requestedIntent,
    requestedTargetKey,
    requestedActionKey,
    userConfirmed,
    clientRequestedWriteExecution,
    clientProvidedAuthenticatedUserId: asString(body.authenticatedUserId),
    clientProvidedActorId: asString(body.actorId),
    clientProvidedRlsVerificationToken: asString(body.rlsVerificationToken),
  });

  const serverAuthOwnershipContext =
    await buildSemanticServerAuthOwnershipDryRunContextV0();

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/semantic/persistence-dry-run",
    policy: dryRun.policy,
    mode: dryRun.mode,
    countdownBeforeFirstDbWrite: "4/4",
    dryRunOnly: dryRun.dryRunOnly,
    canWriteNow: dryRun.canWriteNow,
    sqlAllowedNow: dryRun.sqlAllowedNow,
    supabaseInsertAllowedNow: dryRun.supabaseInsertAllowedNow,
    requestedIntent,
    requestedTargetKey,
    requestedActionKey,
    userConfirmed,
    clientRequestedWriteExecution,
    preview,
    routeGate: dryRun.routeGate,
    authenticatedContext: dryRun.authenticatedContext,
    serverAuthOwnershipContext,
    integrationImpact: {
      serverAuthDiagnosticsConnectedToDryRunRoute: true,
      modifiesExistingDryRunRoute: true,
      opensWriteGate: false,
      enablesDbWrite: false,
      canUseForDryRunOnly:
        serverAuthOwnershipContext.dryRunIntegrationDecision
          .canUseForDryRunOnly,
      nextRequiredStep: "C8-I-IMPLEMENT-29_BROWSER_AUTH_DRY_RUN_PROOF",
    },
    warnings: dryRun.warnings,
    dryRun,
    writes: {
      ...dryRun.writes,
      serverAuthOwnershipContextDbReadExecuted:
        serverAuthOwnershipContext.writes.dbReadExecuted,
      serverAuthOwnershipContextDbWriteExecuted:
        serverAuthOwnershipContext.writes.dbWriteExecuted,
      serverAuthOwnershipContextSupabaseReadExecuted:
        serverAuthOwnershipContext.writes.supabaseReadExecuted,
      serverAuthOwnershipContextSupabaseWriteExecuted:
        serverAuthOwnershipContext.writes.supabaseWriteExecuted,
    },
  });
}
