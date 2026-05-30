import { NextResponse } from "next/server";

import { runSemanticPreviewPipelineV0 } from "../../../../../../lib/activity/categoryDerivation/semanticPreviewPipelineV0";
import {
  SEMANTIC_NEXT_ACTION_PREVIEW_MODE_V0,
  SEMANTIC_NEXT_ACTION_PREVIEW_POLICY_V0,
  buildSemanticNextActionPreviewContractV0,
  buildSemanticNextActionPreviewWritesV0,
} from "../../../../../../lib/activity/categoryDerivation/semanticNextActionPreviewContractV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/debug/semantic-next-action-preview";
const ROUTE_CONTRACT_VERSION = "semantic_next_action_preview_debug_route_v0";
const READINESS_MODE = "route_contract_readiness_no_pipeline_execution";
const SOURCE_PREVIEW_POLICY = "semantic_v3_preview_route_contract_v0";
const SOURCE_PREVIEW_MODE = "read_only_preview_post_body_no_db_write";

type SemanticNextActionPreviewBody = {
  inputText?: unknown;
  naturalInput?: unknown;
  title?: unknown;
  description?: unknown;
  durationMinutes?: unknown;
  inputLanguage?: unknown;
  detectedLanguage?: unknown;
  requestedActionKey?: unknown;
  requestedTargetKey?: unknown;
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

function buildPreviewInput(body: SemanticNextActionPreviewBody):
  | {
      ok: true;
      inputText: string;
      title: string | null;
      description: string | null;
      durationMinutes: number | null;
      inputLanguage: string | null;
      requestedActionKey: string | null;
      requestedTargetKey: string | null;
    }
  | {
      ok: false;
      error: string;
    } {
  const inputText = asString(body.inputText) ?? asString(body.naturalInput);

  if (!inputText) {
    return {
      ok: false,
      error: "inputText or naturalInput is required.",
    };
  }

  const durationMinutes = asNumber(body.durationMinutes);

  if (durationMinutes !== null && durationMinutes < 0) {
    return {
      ok: false,
      error: "durationMinutes must be greater than or equal to 0.",
    };
  }

  return {
    ok: true,
    inputText,
    title: asString(body.title),
    description: asString(body.description),
    durationMinutes,
    inputLanguage:
      asString(body.inputLanguage) ?? asString(body.detectedLanguage),
    requestedActionKey: asString(body.requestedActionKey),
    requestedTargetKey: asString(body.requestedTargetKey),
  };
}

function buildReadinessResponse() {
  return {
    ok: true,
    endpoint: ENDPOINT,
    routeContractVersion: ROUTE_CONTRACT_VERSION,
    policy: SEMANTIC_NEXT_ACTION_PREVIEW_POLICY_V0,
    mode: READINESS_MODE,
    routeMode: SEMANTIC_NEXT_ACTION_PREVIEW_MODE_V0,
    sourcePreviewPolicy: SOURCE_PREVIEW_POLICY,
    sourcePreviewMode: SOURCE_PREVIEW_MODE,
    supportedMethods: ["GET", "POST"],
    methodSemantics: {
      GET: "Returns this route contract, example payload, and no-write policy. It does not run semantic preview or next-action preview.",
      POST: "Runs Semantic Preview in read-only mode and converts reviewActionCandidates into read-only Next Action Preview candidates.",
    },
    inputContract: {
      requiredAnyOf: ["inputText", "naturalInput"],
      optionalFields: [
        "title",
        "description",
        "durationMinutes",
        "inputLanguage",
        "detectedLanguage",
        "requestedActionKey",
        "requestedTargetKey",
      ],
      durationMinutes: "number >= 0 when provided",
    },
    example: {
      method: "POST",
      inputText: "studied math with child for 30 minutes",
      durationMinutes: 30,
      inputLanguage: "en",
    },
    safetyNotes: [
      "This route is read-only.",
      "It performs no SQL, no Supabase read/write and no state write.",
      "It only converts reviewActionCandidates into user-facing next-action preview candidates.",
      "Any real button press must call a separate authenticated persistence-gated route.",
      "State delta candidates must not become state facts or snapshots from this layer.",
    ],
    writes: buildSemanticNextActionPreviewWritesV0(),
  };
}

export async function GET() {
  return NextResponse.json(buildReadinessResponse());
}

export async function POST(request: Request) {
  let body: SemanticNextActionPreviewBody;

  try {
    body = (await request.json()) as SemanticNextActionPreviewBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        routeContractVersion: ROUTE_CONTRACT_VERSION,
        policy: SEMANTIC_NEXT_ACTION_PREVIEW_POLICY_V0,
        mode: SEMANTIC_NEXT_ACTION_PREVIEW_MODE_V0,
        error: "Invalid JSON body.",
        writes: buildSemanticNextActionPreviewWritesV0(),
      },
      { status: 400 }
    );
  }

  const input = buildPreviewInput(body);

  if (!input.ok) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        routeContractVersion: ROUTE_CONTRACT_VERSION,
        policy: SEMANTIC_NEXT_ACTION_PREVIEW_POLICY_V0,
        mode: SEMANTIC_NEXT_ACTION_PREVIEW_MODE_V0,
        error: input.error,
        writes: buildSemanticNextActionPreviewWritesV0(),
      },
      { status: 400 }
    );
  }

  const sourcePreview = runSemanticPreviewPipelineV0({
    inputText: input.inputText,
    title: input.title,
    description: input.description,
    durationMinutes: input.durationMinutes,
    inputLanguage: input.inputLanguage,
    p4Step: "C33-D-NEXT-ACTION-PREVIEW-ROUTE",
  });

  const nextActionPreview = buildSemanticNextActionPreviewContractV0({
    sourcePreview,
    requestedActionKey: input.requestedActionKey,
    requestedTargetKey: input.requestedTargetKey,
  });

  return NextResponse.json({
    ...nextActionPreview,
    endpoint: ENDPOINT,
    routeContractVersion: ROUTE_CONTRACT_VERSION,
    policy: SEMANTIC_NEXT_ACTION_PREVIEW_POLICY_V0,
    mode: SEMANTIC_NEXT_ACTION_PREVIEW_MODE_V0,
    method: "POST",
    sourcePreviewPolicy: SOURCE_PREVIEW_POLICY,
    sourcePreviewMode: SOURCE_PREVIEW_MODE,
    submittedInput: {
      inputText: input.inputText,
      title: input.title,
      description: input.description,
      durationMinutes: input.durationMinutes,
      inputLanguage: input.inputLanguage,
      requestedActionKey: input.requestedActionKey,
      requestedTargetKey: input.requestedTargetKey,
    },
    sourcePreview,
    nextActionPreview,
    writes: nextActionPreview.writes,
  });
}
