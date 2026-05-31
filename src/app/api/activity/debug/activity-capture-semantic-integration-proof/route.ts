import { NextResponse } from "next/server";

import {
  ACTIVITY_CAPTURE_INPUT_CONTRACT_MODE_V0,
  ACTIVITY_CAPTURE_INPUT_CONTRACT_POLICY_V0,
  buildActivityCaptureInputContractV0,
  buildActivityCaptureInputWritesV0,
  type ActivityCaptureRawInputV0,
} from "../../../../../../lib/activity/activityCapture/activityCaptureInputContractV0";
import { runSemanticPreviewPipelineV0 } from "../../../../../../lib/activity/categoryDerivation/semanticPreviewPipelineV0";
import {
  SEMANTIC_NEXT_ACTION_PREVIEW_MODE_V0,
  SEMANTIC_NEXT_ACTION_PREVIEW_POLICY_V0,
  buildSemanticNextActionPreviewContractV0,
} from "../../../../../../lib/activity/categoryDerivation/semanticNextActionPreviewContractV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/debug/activity-capture-semantic-integration-proof";
const ROUTE_CONTRACT_VERSION =
  "activity_capture_semantic_integration_proof_route_v0";
const INTEGRATION_POLICY =
  "activity_capture_semantic_integration_proof_v0" as const;
const INTEGRATION_MODE =
  "read_only_activity_capture_to_semantic_and_next_action_no_db_write" as const;
const READINESS_MODE = "route_contract_readiness_no_pipeline_execution";
const SOURCE_SEMANTIC_PREVIEW_POLICY = "semantic_v3_preview_route_contract_v0";
const SOURCE_SEMANTIC_PREVIEW_MODE = "read_only_preview_post_body_no_db_write";

type ActivityCaptureIntegrationWritesV0 = ReturnType<
  typeof buildActivityCaptureInputWritesV0
>;

function buildIntegrationWrites(): ActivityCaptureIntegrationWritesV0 {
  return buildActivityCaptureInputWritesV0();
}

function buildReadinessResponse() {
  return {
    ok: true,
    endpoint: ENDPOINT,
    routeContractVersion: ROUTE_CONTRACT_VERSION,
    policy: INTEGRATION_POLICY,
    mode: READINESS_MODE,
    routeMode: INTEGRATION_MODE,
    supportedMethods: ["GET", "POST"],
    sourceContracts: {
      activityCaptureInputPolicy: ACTIVITY_CAPTURE_INPUT_CONTRACT_POLICY_V0,
      activityCaptureInputMode: ACTIVITY_CAPTURE_INPUT_CONTRACT_MODE_V0,
      semanticPreviewPolicy: SOURCE_SEMANTIC_PREVIEW_POLICY,
      semanticPreviewMode: SOURCE_SEMANTIC_PREVIEW_MODE,
      nextActionPreviewPolicy: SEMANTIC_NEXT_ACTION_PREVIEW_POLICY_V0,
      nextActionPreviewMode: SEMANTIC_NEXT_ACTION_PREVIEW_MODE_V0,
    },
    methodSemantics: {
      GET: "Returns this integration proof route contract. It does not execute Activity Capture, Semantic Preview or Next Action Preview.",
      POST: "Normalizes Activity Capture input, runs read-only Semantic Preview, then builds read-only Next Action Preview candidates.",
    },
    inputContract: {
      requiredAnyOf: [
        "rawText",
        "inputText",
        "naturalInput",
        "activityText",
        "text",
      ],
      optionalFields: [
        "title",
        "description",
        "source",
        "durationMinutes",
        "inputLanguage",
        "detectedLanguage",
        "languageCode",
        "occurredAtIso",
        "occurredAt",
        "timestamp",
        "timezone",
        "context",
        "clientUserId",
        "clientActorId",
        "clientSpaceId",
        "requestedActionKey",
        "requestedTargetKey",
      ],
      clientIdentity: "untrusted until server auth, actor resolution and RLS verification",
      durationMinutes: "number >= 0 when provided",
    },
    example: {
      method: "POST",
      rawText: "studied math with child for 30 minutes",
      durationMinutes: 30,
      inputLanguage: "en",
      source: "manual",
    },
    safetyNotes: [
      "This route is read-only.",
      "It performs no SQL, no Supabase read/write and no state write.",
      "It does not persist Activity Events.",
      "It does not create Value Objects or activity-to-VO links.",
      "It does not create state facts, state deltas or state snapshots.",
      "Client-provided identity fields remain untrusted.",
      "Any future persistence must use a separate authenticated persistence-gated route.",
    ],
    writes: buildIntegrationWrites(),
  };
}

export async function GET() {
  return NextResponse.json(buildReadinessResponse());
}

export async function POST(request: Request) {
  let body: ActivityCaptureRawInputV0;

  try {
    body = (await request.json()) as ActivityCaptureRawInputV0;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        routeContractVersion: ROUTE_CONTRACT_VERSION,
        policy: INTEGRATION_POLICY,
        mode: INTEGRATION_MODE,
        error: "Invalid JSON body.",
        activityCapture: null,
        semanticPreview: null,
        nextActionPreview: null,
        writes: buildIntegrationWrites(),
      },
      { status: 400 }
    );
  }

  const activityCapture = buildActivityCaptureInputContractV0(body);

  if (!activityCapture.ok || !activityCapture.nextActionPreviewRequest) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        routeContractVersion: ROUTE_CONTRACT_VERSION,
        policy: INTEGRATION_POLICY,
        mode: INTEGRATION_MODE,
        error: "Activity Capture input validation failed.",
        activityCapture,
        semanticPreview: null,
        nextActionPreview: null,
        writes: buildIntegrationWrites(),
      },
      { status: 400 }
    );
  }

  const previewRequest = activityCapture.nextActionPreviewRequest;

  const semanticPreview = runSemanticPreviewPipelineV0({
    inputText: previewRequest.inputText,
    title: previewRequest.title,
    description: previewRequest.description,
    durationMinutes: previewRequest.durationMinutes,
    inputLanguage: previewRequest.inputLanguage,
    p4Step: "C33-E-ACTIVITY-CAPTURE-SEMANTIC-INTEGRATION-PROOF",
  });

  const nextActionPreview = buildSemanticNextActionPreviewContractV0({
    sourcePreview: semanticPreview,
    requestedActionKey: previewRequest.requestedActionKey,
    requestedTargetKey: previewRequest.requestedTargetKey,
  });

  return NextResponse.json({
    ...nextActionPreview,
    ok: nextActionPreview.ok === true,
    endpoint: ENDPOINT,
    routeContractVersion: ROUTE_CONTRACT_VERSION,
    policy: INTEGRATION_POLICY,
    mode: INTEGRATION_MODE,
    method: "POST",
    sourceContracts: {
      activityCaptureInputPolicy: ACTIVITY_CAPTURE_INPUT_CONTRACT_POLICY_V0,
      activityCaptureInputMode: ACTIVITY_CAPTURE_INPUT_CONTRACT_MODE_V0,
      semanticPreviewPolicy: SOURCE_SEMANTIC_PREVIEW_POLICY,
      semanticPreviewMode: SOURCE_SEMANTIC_PREVIEW_MODE,
      nextActionPreviewPolicy: SEMANTIC_NEXT_ACTION_PREVIEW_POLICY_V0,
      nextActionPreviewMode: SEMANTIC_NEXT_ACTION_PREVIEW_MODE_V0,
    },
    submittedInput: activityCapture.normalizedInput,
    semanticPreviewRequest: activityCapture.semanticPreviewRequest,
    nextActionPreviewRequest: activityCapture.nextActionPreviewRequest,
    activityCapture,
    semanticPreview,
    nextActionPreview,
    execution: {
      activityCaptureContractExecuted: true,
      semanticPreviewPipelineExecuted: true,
      nextActionPreviewContractExecuted: true,
      persistenceAttempted: false,
      statePersistenceAttempted: false,
    },
    writes: buildIntegrationWrites(),
  });
}
