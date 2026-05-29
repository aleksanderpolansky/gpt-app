import { randomUUID } from "crypto";

import { deriveCategoryCandidates } from "./ruleExtractor";
import { buildActivityValueObjectExposureCandidatesV0 } from "./semanticActivityValueObjectExposureV0";
import { resolveSemanticBundleV0 } from "./semanticBundleResolverV0";
import { buildSemanticDerivationV3FromCurrentOutput } from "./semanticContractV3Adapter";
import { buildSemanticReviewActionCandidatesV0 } from "./semanticReviewActionContractV0";
import { buildStateDeltaCandidatesV0 } from "./semanticStateDeltaCandidatePolicyV0";
import { enrichSemanticDerivationV3FromText } from "./semanticTextSignalEnrichmentV0";
import { buildValueObjectCandidatesV0 } from "./semanticValueObjectCandidatePolicyV0";
import type { CategoryDerivationInput } from "./types";
import type { ActivityValueObjectExposureCandidateV0 } from "./semanticActivityValueObjectExposureV0";
import type { SemanticDerivationV3Result } from "./semanticContractV3";
import type { SemanticReviewActionCandidateV0 } from "./semanticReviewActionContractV0";
import type { StateDeltaCandidateV0 } from "./semanticStateDeltaCandidatePolicyV0";
import type { ValueObjectCandidateV0 } from "./semanticValueObjectCandidatePolicyV0";

export type SemanticPreviewPipelineInputV0 = {
  inputText: string;
  title?: string | null;
  description?: string | null;
  durationMinutes?: number | null;
  inputLanguage?: string | null;
  p4Step?: string;
};

export type SemanticPreviewPipelineWritesV0 = {
  sqlExecuted: false;
  dbWriteExecuted: false;
  activityEventInserted: false;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  stateFactCreated: false;
  stateDeltaCreated: false;
  stateSnapshotCreated: false;
};

export type SemanticPreviewPipelineResultV0 = {
  ok: true;
  mode: "read_only_preview";
  enrichment: "deterministic_text_enrichment_v0";
  resolver: "semantic_bundle_resolver_v0";
  valueObjectPolicy: "value_object_candidate_policy_v0";
  exposurePolicy: "activity_value_object_exposure_v0";
  stateDeltaPolicy: "state_delta_candidate_policy_v0";
  reviewActionPolicy: "semantic_review_action_contract_v0";
  activityEventId: string;
  input: {
    inputText: string;
    title: string | null;
    description: string | null;
    durationMinutes: number | null;
    inputLanguage: string | null;
  };
  extraction: {
    ok: boolean;
    skipped: boolean;
    skipReason: string | null;
    processorVersion: string;
    ruleVersion: string | null;
    confidence: number | null;
    candidateCount: number;
    warnings: string[];
    errors: string[];
  };
  semanticV3: SemanticDerivationV3Result;
  valueObjectCandidates: ValueObjectCandidateV0[];
  exposureCandidates: ActivityValueObjectExposureCandidateV0[];
  stateDeltaCandidates: StateDeltaCandidateV0[];
  reviewActionCandidates: SemanticReviewActionCandidateV0[];
  writes: SemanticPreviewPipelineWritesV0;
};

export function buildReadOnlyWritesV0(): SemanticPreviewPipelineWritesV0 {
  return {
    sqlExecuted: false,
    dbWriteExecuted: false,
    activityEventInserted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    stateFactCreated: false,
    stateDeltaCreated: false,
    stateSnapshotCreated: false,
  };
}

export function runSemanticPreviewPipelineV0(
  params: SemanticPreviewPipelineInputV0
): SemanticPreviewPipelineResultV0 {
  const activityEventId = randomUUID();

  const derivationInput: CategoryDerivationInput = {
    activityEventId,
    inputText: params.inputText,
    title: params.title ?? null,
    description: params.description ?? null,
    durationMinutes: params.durationMinutes ?? null,
    inputLanguage: params.inputLanguage ?? null,
    actorId: null,
    organizationId: null,
    metadata: {
      endpoint: "semantic_preview_pipeline_v0",
      mode: "read_only_preview",
      p4Step: params.p4Step ?? "C8-I-IMPLEMENT-12",
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
    inputText: params.inputText,
    detectedLanguage: params.inputLanguage ?? null,
    normalizedActivity: params.inputText,
    durationMinutes: params.durationMinutes ?? null,
    extractionResult,
  });

  const semanticV3Enriched = enrichSemanticDerivationV3FromText({
    result: semanticV3Base,
    inputText: params.inputText,
    inputLanguage: params.inputLanguage ?? null,
  });

  const semanticV3 = resolveSemanticBundleV0({
    result: semanticV3Enriched,
  });

  const valueObjectCandidates = buildValueObjectCandidatesV0({
    semanticV3,
    inputText: params.inputText,
  });

  const exposureCandidates = buildActivityValueObjectExposureCandidatesV0({
    semanticV3,
    valueObjectCandidates,
  });

  const stateDeltaCandidates = buildStateDeltaCandidatesV0({
    semanticV3,
    exposureCandidates,
  });

  const reviewActionCandidates = buildSemanticReviewActionCandidatesV0({
    semanticV3,
    valueObjectCandidates,
    exposureCandidates,
    stateDeltaCandidates,
  });

  return {
    ok: true,
    mode: "read_only_preview",
    enrichment: "deterministic_text_enrichment_v0",
    resolver: "semantic_bundle_resolver_v0",
    valueObjectPolicy: "value_object_candidate_policy_v0",
    exposurePolicy: "activity_value_object_exposure_v0",
    stateDeltaPolicy: "state_delta_candidate_policy_v0",
    reviewActionPolicy: "semantic_review_action_contract_v0",
    activityEventId,
    input: {
      inputText: params.inputText,
      title: params.title ?? null,
      description: params.description ?? null,
      durationMinutes: params.durationMinutes ?? null,
      inputLanguage: params.inputLanguage ?? null,
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
    stateDeltaCandidates,
    reviewActionCandidates,
    writes: buildReadOnlyWritesV0(),
  };
}
