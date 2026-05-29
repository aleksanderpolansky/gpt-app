import { NextResponse } from "next/server";

import { runSemanticPreviewPipelineV0 } from "../../../../../../lib/activity/categoryDerivation/semanticPreviewPipelineV0";

export const dynamic = "force-dynamic";

type SemanticV3PreviewBody = {
  inputText?: unknown;
  naturalInput?: unknown;
  title?: unknown;
  description?: unknown;
  durationMinutes?: unknown;
  inputLanguage?: unknown;
  detectedLanguage?: unknown;
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
    endpoint: "/api/activity/debug/semantic-v3-preview",
    method: "POST",
    mode: "read_only_preview",
    pipeline: "semantic_preview_pipeline_v0",
    enrichment: "deterministic_text_enrichment_v0",
    resolver: "semantic_bundle_resolver_v0",
    valueObjectPolicy: "value_object_candidate_policy_v0",
    exposurePolicy: "activity_value_object_exposure_v0",
    stateDeltaPolicy: "state_delta_candidate_policy_v0",
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
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  const input = buildPreviewInput(body);

  if (!input.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: input.error,
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
    p4Step: "C8-I-IMPLEMENT-10-FIX",
  });

  return NextResponse.json({
    endpoint: "/api/activity/debug/semantic-v3-preview",
    pipeline: "semantic_preview_pipeline_v0",
    ...result,
  });
}
