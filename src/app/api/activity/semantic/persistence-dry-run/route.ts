import { NextResponse } from "next/server";

import {
  buildSemanticPersistenceDryRunRouteV0,
} from "../../../../../../lib/activity/categoryDerivation/semanticPersistenceDryRunRouteContractV0";
import {
  type SemanticPersistenceRouteIntentV0,
} from "../../../../../../lib/activity/categoryDerivation/semanticPersistenceRouteGateContractV0";
import { runSemanticPreviewPipelineV0 } from "../../../../../../lib/activity/categoryDerivation/semanticPreviewPipelineV0";

export const dynamic = "force-dynamic";

type PersistenceDryRunBody = {
  inputText?: unknown;
  naturalInput?: unknown;
  durationMinutes?: unknown;
  inputLanguage?: unknown;
  detectedLanguage?: unknown;
  requestedIntent?: unknown;
  requestedTargetKey?: unknown;
  requestedActionKey?: unknown;
  userConfirmed?: unknown;
  explicitWriteExecutionEnabled?: unknown;
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

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    const parsed = Number.parseFloat(normalized);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return null;
}

function asIntent(value: unknown): SemanticPersistenceRouteIntentV0 {
  const text = asString(value);

  if (
    text === "persist_activity_event" ||
    text === "persist_category_resolution" ||
    text === "persist_value_object_candidate" ||
    text === "persist_activity_value_object_link" ||
    text === "persist_state_delta_candidate" ||
    text === "execute_review_action"
  ) {
    return text;
  }

  return "unknown";
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/semantic/persistence-dry-run",
    method: "POST",
    mode: "non_debug_dry_run_no_write",
    policy: "semantic_persistence_dry_run_route_skeleton_v0",
    authenticatedContextPolicy:
      "semantic_persistence_authenticated_context_contract_v0",
    writes: {
      sqlExecuted: false,
      dbWriteExecuted: false,
      activityEventInserted: false,
      categoryResolutionPersisted: false,
      valueObjectCreated: false,
      activityValueObjectLinkCreated: false,
      reviewActionPersisted: false,
      stateFactCreated: false,
      stateDeltaCreated: false,
      stateSnapshotCreated: false,
    },
    example: {
      inputText: "учил ребёнка математике 30 минут",
      durationMinutes: 30,
      inputLanguage: "ru",
      requestedIntent: "persist_value_object_candidate",
      requestedTargetKey: "vo:personal:child-learning-support",
      userConfirmed: true,
      explicitWriteExecutionEnabled: true,
      authenticatedUserId: "client-supplied-user-id-is-untrusted",
      actorId: "client-supplied-actor-id-is-untrusted",
      rlsVerificationToken: "client-supplied-token-is-untrusted",
    },
  });
}

export async function POST(request: Request) {
  let body: PersistenceDryRunBody;

  try {
    body = (await request.json()) as PersistenceDryRunBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  const inputText = asString(body.inputText) ?? asString(body.naturalInput);

  if (!inputText) {
    return NextResponse.json(
      {
        ok: false,
        error: "inputText or naturalInput is required.",
      },
      { status: 400 }
    );
  }

  const durationMinutes = asNumber(body.durationMinutes);
  const inputLanguage =
    asString(body.inputLanguage) ?? asString(body.detectedLanguage);

  const preview = runSemanticPreviewPipelineV0({
    inputText,
    durationMinutes,
    inputLanguage,
    p4Step: "C8-I-IMPLEMENT-20-AUTHENTICATED-DRY-RUN-CONTEXT",
  });

  const dryRun = buildSemanticPersistenceDryRunRouteV0({
    preview,
    requestedIntent: asIntent(body.requestedIntent),
    requestedTargetKey: asString(body.requestedTargetKey),
    requestedActionKey: asString(body.requestedActionKey),
    userConfirmed: asBoolean(body.userConfirmed),
    clientRequestedWriteExecution: asBoolean(body.explicitWriteExecutionEnabled),
    clientProvidedAuthenticatedUserId: asString(body.authenticatedUserId),
    clientProvidedActorId: asString(body.actorId),
    clientProvidedRlsVerificationToken: asString(body.rlsVerificationToken),
  });

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/semantic/persistence-dry-run",
    mode: "non_debug_dry_run_no_write",
    policy: "semantic_persistence_dry_run_route_skeleton_v0",
    authenticatedContextPolicy: dryRun.authenticatedContext.policy,
    dryRun,
    writes: dryRun.writes,
  });
}
