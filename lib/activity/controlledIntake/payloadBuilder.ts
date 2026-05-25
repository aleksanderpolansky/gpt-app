import {
  CONTROLLED_ACTIVITY_INTAKE_HELPER_LAYER,
  CONTROLLED_ACTIVITY_INTAKE_SCHEMA_VERSION,
} from "./types";
import type {
  ControlledActivityIntakePayload,
  ControlledActivityIntakeValidatedInput,
} from "./types";

export interface BuildControlledActivityIntakePayloadOptions {
  nowIso?: string;
}

export function buildControlledActivityIntakePayload(
  validatedInput: ControlledActivityIntakeValidatedInput,
  options: BuildControlledActivityIntakePayloadOptions = {},
): ControlledActivityIntakePayload {
  return {
    schemaVersion: CONTROLLED_ACTIVITY_INTAKE_SCHEMA_VERSION,
    helperLayer: CONTROLLED_ACTIVITY_INTAKE_HELPER_LAYER,
    generatedAt: options.nowIso ?? new Date().toISOString(),
    activityEventDraft: {
      title: validatedInput.title,
      inputText: validatedInput.inputText,
      source: validatedInput.source,
      status: "raw_intake_pending_semantic_processing",
      durationMinutes: validatedInput.durationMinutes,
      startedAt: validatedInput.startedAt,
      endedAt: validatedInput.endedAt,
      occurredAt: validatedInput.occurredAt,
      timezone: validatedInput.timezone,
      context: validatedInput.context,
      metadata: {
        ...validatedInput.metadata,
        controlledIntakeHelperLayer: CONTROLLED_ACTIVITY_INTAKE_HELPER_LAYER,
      },
    },
    semanticReadiness: {
      semanticProcessingNotStartedYet: true,
      categoryCandidatesCreated: false,
      metricCandidatesCreated: false,
      stateHookCandidatesCreated: false,
      valueObjectsCreated: false,
      stateFactsCreated: false,
      deltasCreated: false,
      snapshotsCreated: false,
    },
    guardrails: {
      activityEventIsSourceOfTruth: true,
      aiOutputIsCandidateOnly: true,
      noPersistencePerformed: true,
      noSupabaseWritePerformed: true,
      noAiCallPerformed: true,
      noRouteHandlerCreatedInThisBlock: true,
    },
  };
}