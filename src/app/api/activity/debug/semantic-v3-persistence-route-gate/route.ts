import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextResponse } from "next/server";

import {
  buildSemanticPersistenceRouteGateV0,
  type SemanticPersistenceRouteIntentV0,
} from "../../../../../../lib/activity/categoryDerivation/semanticPersistenceRouteGateContractV0";
import { runSemanticPreviewPipelineV0 } from "../../../../../../lib/activity/categoryDerivation/semanticPreviewPipelineV0";

export const dynamic = "force-dynamic";

type PersistenceRouteGateBody = {
  inputText?: unknown;
  naturalInput?: unknown;
  durationMinutes?: unknown;
  inputLanguage?: unknown;
  detectedLanguage?: unknown;
  requestedIntent?: unknown;
  requestedTargetKey?: unknown;
  requestedActionKey?: unknown;
  authenticatedUserId?: unknown;
  actorId?: unknown;
  rlsVerificationToken?: unknown;
  userConfirmed?: unknown;
  explicitWriteExecutionEnabled?: unknown;
  sandboxContractOnly?: unknown;
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
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/debug/semantic-v3-persistence-route-gate",
    method: "POST",
    mode: "contract_only_no_write",
    policy: "semantic_persistence_route_gate_contract_v0",
    writes: {
      sqlExecuted: false,
      dbWriteExecuted: false,
      activityEventInserted: false,
      valueObjectCreated: false,
      activityValueObjectLinkCreated: false,
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
      explicitWriteExecutionEnabled: false,
      sandboxContractOnly: true,
    },
  });
}

export async function POST(request: Request) {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  let body: PersistenceRouteGateBody;

  try {
    body = (await request.json()) as PersistenceRouteGateBody;
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
    p4Step: "C8-I-IMPLEMENT-16-PERSISTENCE-ROUTE-GATE",
  });

  const routeGate = buildSemanticPersistenceRouteGateV0({
    preview,
    requestedIntent: asIntent(body.requestedIntent),
    requestedTargetKey: asString(body.requestedTargetKey),
    requestedActionKey: asString(body.requestedActionKey),
    authenticatedUserId: asString(body.authenticatedUserId),
    actorId: asString(body.actorId),
    rlsVerificationToken: asString(body.rlsVerificationToken),
    userConfirmed: asBoolean(body.userConfirmed),
    explicitWriteExecutionEnabled: asBoolean(body.explicitWriteExecutionEnabled),
    sandboxContractOnly: asBoolean(body.sandboxContractOnly),
  });

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/debug/semantic-v3-persistence-route-gate",
    mode: "contract_only_no_write",
    policy: "semantic_persistence_route_gate_contract_v0",
    preview: {
      ok: preview.ok,
      persistenceGatePolicy: preview.persistenceGatePolicy,
      canPersistNow: preview.persistenceGate.canPersistNow,
      blockers: preview.persistenceGate.blockers,
      counts: preview.persistenceGate.counts,
    },
    routeGate,
    writes: {
      sqlExecuted: false,
      dbWriteExecuted: false,
      activityEventInserted: false,
      valueObjectCreated: false,
      activityValueObjectLinkCreated: false,
      stateFactCreated: false,
      stateDeltaCreated: false,
      stateSnapshotCreated: false,
    },
  });
}
