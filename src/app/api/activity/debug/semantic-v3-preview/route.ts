import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { deriveCategoryCandidates } from "../../../../../../lib/activity/categoryDerivation/ruleExtractor";
import { buildActivityValueObjectExposureCandidatesV0 } from "../../../../../../lib/activity/categoryDerivation/semanticActivityValueObjectExposureV0";
import { resolveSemanticBundleV0 } from "../../../../../../lib/activity/categoryDerivation/semanticBundleResolverV0";
import { buildSemanticDerivationV3FromCurrentOutput } from "../../../../../../lib/activity/categoryDerivation/semanticContractV3Adapter";
import { enrichSemanticDerivationV3FromText } from "../../../../../../lib/activity/categoryDerivation/semanticTextSignalEnrichmentV0";
import { buildValueObjectCandidatesV0 } from "../../../../../../lib/activity/categoryDerivation/semanticValueObjectCandidatePolicyV0";
import type { CategoryDerivationInput } from "../../../../../../lib/activity/categoryDerivation/types";

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
    enrichment: "deterministic_text_enrichment_v0",
    resolver: "semantic_bundle_resolver_v0",
    valueObjectPolicy: "value_object_candidate_policy_v0",
    exposurePolicy: "activity_value_object_exposure_v0",
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

  const activityEventId = randomUUID();

  const derivationInput: CategoryDerivationInput = {
    activityEventId,
    inputText: input.inputText,
    title: input.title,
    description: input.description,
    durationMinutes: input.durationMinutes,
    inputLanguage: input.inputLanguage,
    actorId: null,
    organizationId: null,
    metadata: {
      endpoint: "/api/activity/debug/semantic-v3-preview",
      mode: "read_only_preview",
      p4Step: "C8-I-IMPLEMENT-8",
      createdAt: new Date().toISOString(),
      dbWriteExecuted: false,
      valueObjectCreated: false,
      activityValueObjectLinkCreated: false,
      stateFactCreated: false,
      stateDeltaCreated: false,
      stateSnapshotCreated: false,
    },
  };

  const extractionResult = deriveCategoryCandidates(derivationInput);

  const semanticV3Base = buildSemanticDerivationV3FromCurrentOutput({
    inputText: input.inputText,
    detectedLanguage: input.inputLanguage,
    normalizedActivity: input.inputText,
    durationMinutes: input.durationMinutes,
    extractionResult,
  });

  const semanticV3Enriched = enrichSemanticDerivationV3FromText({
    result: semanticV3Base,
    inputText: input.inputText,
    inputLanguage: input.inputLanguage,
  });

  const semanticV3 = resolveSemanticBundleV0({
    result: semanticV3Enriched,
  });

  const valueObjectCandidates = buildValueObjectCandidatesV0({
    semanticV3,
    inputText: input.inputText,
  });

  const exposureCandidates = buildActivityValueObjectExposureCandidatesV0({
    semanticV3,
    valueObjectCandidates,
  });

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/debug/semantic-v3-preview",
    mode: "read_only_preview",
    enrichment: "deterministic_text_enrichment_v0",
    resolver: "semantic_bundle_resolver_v0",
    valueObjectPolicy: "value_object_candidate_policy_v0",
    exposurePolicy: "activity_value_object_exposure_v0",
    activityEventId,
    input: {
      inputText: input.inputText,
      title: input.title,
      description: input.description,
      durationMinutes: input.durationMinutes,
      inputLanguage: input.inputLanguage,
    },
    extraction: {
      ok: extractionResult.ok,
      skipped: extractionResult.skipped ?? false,
      skipReason: extractionResult.skipReason ?? null,
      processorVersion: extractionResult.processorVersion,
      ruleVersion: extractionResult.ruleVersion ?? null,
      confidence: extractionResult.confidence ?? null,
      candidateCount: extractionResult.candidates.length,
      warnings: extractionResult.warnings,
      errors: extractionResult.errors,
    },
    semanticV3,
    valueObjectCandidates,
    exposureCandidates,
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
