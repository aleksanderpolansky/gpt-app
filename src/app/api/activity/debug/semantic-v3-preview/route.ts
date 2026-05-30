import { NextResponse } from "next/server";

import { runSemanticPreviewPipelineV0 } from "../../../../../../lib/activity/categoryDerivation/semanticPreviewPipelineV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/debug/semantic-v3-preview";
const ROUTE_CONTRACT_VERSION = "semantic_v3_preview_route_contract_v0";
const READINESS_MODE = "route_contract_readiness_no_pipeline_execution";
const PREVIEW_MODE = "read_only_preview_post_body_no_db_write";
const PIPELINE = "semantic_preview_pipeline_v0";
const ENRICHMENT = "deterministic_text_enrichment_v0";
const RESOLVER = "semantic_bundle_resolver_v0";
const VALUE_OBJECT_POLICY = "value_object_candidate_policy_v0";
const EXPOSURE_POLICY = "activity_value_object_exposure_v0";
const STATE_DELTA_POLICY = "state_delta_candidate_policy_v0";

type SemanticV3PreviewBody = {
  inputText?: unknown;
  naturalInput?: unknown;
  title?: unknown;
  description?: unknown;
  durationMinutes?: unknown;
  inputLanguage?: unknown;
  detectedLanguage?: unknown;
};

function buildReadOnlyWrites() {
  return {
    sqlExecuted: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    supabaseReadExecuted: false,
    supabaseWriteExecuted: false,
    activityEventInserted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    stateFactCreated: false,
    stateDeltaCreated: false,
    stateSnapshotCreated: false,
  };
}

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

function buildPreviewInput(body: SemanticV3PreviewBody):
  | {
      ok: true;
      inputText: string;
      title: string | null;
      description: string | null;
      durationMinutes: number | null;
      inputLanguage: string | null;
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
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: ENDPOINT,
    routeContractVersion: ROUTE_CONTRACT_VERSION,
    policy: ROUTE_CONTRACT_VERSION,
    mode: READINESS_MODE,
    routeMode: PREVIEW_MODE,
    supportedMethods: ["GET", "POST"],
    methodSemantics: {
      GET: "Returns this route contract, example payload, and no-write policy. It does not run the semantic preview pipeline.",
      POST: "Runs deterministic semantic preview pipeline from request body. It is read-only and must not write to DB or create state facts/deltas/snapshots.",
    },
    pipeline: PIPELINE,
    enrichment: ENRICHMENT,
    resolver: RESOLVER,
    valueObjectPolicy: VALUE_OBJECT_POLICY,
    exposurePolicy: EXPOSURE_POLICY,
    stateDeltaPolicy: STATE_DELTA_POLICY,
    writes: buildReadOnlyWrites(),
    example: {
      method: "POST",
      inputText: "учил ребёнка математике 30 минут",
      durationMinutes: 30,
      inputLanguage: "ru",
    },
    validation: {
      requiredAnyOf: ["inputText", "naturalInput"],
      optionalFields: [
        "title",
        "description",
        "durationMinutes",
        "inputLanguage",
        "detectedLanguage",
      ],
      durationMinutes: "number >= 0 when provided",
    },
  });
}

export async function POST(request: Request) {
  let body: SemanticV3PreviewBody;

  try {
    body = (await request.json()) as SemanticV3PreviewBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        routeContractVersion: ROUTE_CONTRACT_VERSION,
        policy: ROUTE_CONTRACT_VERSION,
        mode: PREVIEW_MODE,
        error: "Invalid JSON body.",
        writes: buildReadOnlyWrites(),
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
        policy: ROUTE_CONTRACT_VERSION,
        mode: PREVIEW_MODE,
        error: input.error,
        writes: buildReadOnlyWrites(),
      },
      { status: 400 }
    );
  }

  const result = runSemanticPreviewPipelineV0({
    inputText: input.inputText,
    title: input.title,
    description: input.description,
    durationMinutes: input.durationMinutes,
    inputLanguage: input.inputLanguage,
    p4Step: "C33-C-PREVIEW-ROUTE-CONTRACT",
  });

  return NextResponse.json({
    endpoint: ENDPOINT,
    routeContractVersion: ROUTE_CONTRACT_VERSION,
    policy: ROUTE_CONTRACT_VERSION,
    mode: PREVIEW_MODE,
    method: "POST",
    pipeline: PIPELINE,
    enrichment: ENRICHMENT,
    resolver: RESOLVER,
    valueObjectPolicy: VALUE_OBJECT_POLICY,
    exposurePolicy: EXPOSURE_POLICY,
    stateDeltaPolicy: STATE_DELTA_POLICY,
    submittedInput: {
      inputText: input.inputText,
      title: input.title,
      description: input.description,
      durationMinutes: input.durationMinutes,
      inputLanguage: input.inputLanguage,
    },
    preview: result,
    ...result,
    writes: result.writes,
  });
}
