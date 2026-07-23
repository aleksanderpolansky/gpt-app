/**
 * Compile-time fixtures for the semantic-lock v2 acceptance scenarios.
 *
 * These fixtures perform no writes and are not imported by production routes.
 */

import {
  REALITY_CORE_CONTRACT_VERSION_V2,
  type RealityCoreSaveRequestV2,
} from "./reality-core-contracts-v2";

const USER_ACTOR_ID = "00000000-0000-4000-8000-000000000001";
const DAUGHTER_ACTOR_ID = "00000000-0000-4000-8000-000000000002";
const RECORDER_ACTOR_ID = "00000000-0000-4000-8000-000000000003";
const EXERCISE_ACTIVITY_TYPE_ID = "00000000-0000-4000-8000-000000000101";
const CERTIFICATE_ORDER_TYPE_ID = "00000000-0000-4000-8000-000000000102";
const OBSERVATION_ACTIVITY_TYPE_ID = "00000000-0000-4000-8000-000000000103";
const PULL_UPS_LEAF_ID = "00000000-0000-4000-8000-000000000201";
const HOME_TIME_LEAF_ID = "00000000-0000-4000-8000-000000000202";

const USER_ACTOR_CONTEXT = {
  performedByActorId: USER_ACTOR_ID,
  actingAsActorId: USER_ACTOR_ID,
  initiatedByActorId: USER_ACTOR_ID,
  beneficiaryActorId: USER_ACTOR_ID,
  recordedByActorId: RECORDER_ACTOR_ID,
  actingRoleCode: "self",
} as const;

export const REALITY_MODEL_V2_FIXTURE_A1_PULL_UPS_AT_HOME = {
  contractVersion: REALITY_CORE_CONTRACT_VERSION_V2,
  sourcePackageId: "p2-contract-fixture-a1",
  actorContext: USER_ACTOR_CONTEXT,
  activity: {
    title: "Подтягивания дома",
    inputText: "Подтягивался дома 20 минут, 30 повторений",
    description: null,
    activityTypeId: EXERCISE_ACTIVITY_TYPE_ID,
    activityTemplateId: null,
    temporalDirection: "past",
    status: "completed",
    startedAt: "2026-07-23T19:00:00+02:00",
    endedAt: "2026-07-23T19:20:00+02:00",
    durationMinutes: 20,
    timezone: "Europe/Warsaw",
    locationId: null,
    sourceType: "user_text",
    sourceExternalId: null,
    privacy: "private",
    idempotencyKey: "fixture-a1-activity",
    metadata: {},
  },
  measures: [
    {
      localMeasureId: "measure-duration",
      parameterCode: "duration",
      value: {
        valueType: "numeric",
        valueNumeric: 20,
      },
      unitCode: "minute",
      time: {
        timeKind: "interval",
        observedAt: null,
        periodStart: "2026-07-23T19:00:00+02:00",
        periodEnd: "2026-07-23T19:20:00+02:00",
      },
      sourceType: "user_reported",
      confidence: 1,
      derivation: {
        isDerived: false,
        derivationMethod: null,
        derivationVersion: null,
        sourceLocalMeasureIds: [],
      },
      rawFragment: "20 минут",
      normalizedFragment: "20 minute",
      metadata: {},
    },
    {
      localMeasureId: "measure-repetitions",
      parameterCode: "repetition_count",
      value: {
        valueType: "numeric",
        valueNumeric: 30,
      },
      unitCode: "repetition",
      time: {
        timeKind: "point",
        observedAt: "2026-07-23T19:20:00+02:00",
        periodStart: null,
        periodEnd: null,
      },
      sourceType: "user_reported",
      confidence: 1,
      derivation: {
        isDerived: false,
        derivationMethod: null,
        derivationVersion: null,
        sourceLocalMeasureIds: [],
      },
      rawFragment: "30 повторений",
      normalizedFragment: "30 repetition",
      metadata: {},
    },
  ],
  objectFacts: [
    {
      localObjectFactId: "fact-pull-ups-duration",
      localMeasureId: "measure-duration",
      target: {
        targetType: "existing_activity_leaf",
        valueObjectId: PULL_UPS_LEAF_ID,
        semanticObjectKey: null,
        semanticObjectLabel: null,
      },
      relationTypeCode: "counts_toward",
      status: "confirmed",
      confidence: 1,
      sourceType: "user_reported",
      evidenceJson: { fragment: "Подтягивался дома 20 минут" },
      idempotencyKey: "fixture-a1-fact-1",
      metadata: {},
    },
    {
      localObjectFactId: "fact-pull-ups-repetitions",
      localMeasureId: "measure-repetitions",
      target: {
        targetType: "existing_activity_leaf",
        valueObjectId: PULL_UPS_LEAF_ID,
        semanticObjectKey: null,
        semanticObjectLabel: null,
      },
      relationTypeCode: "counts_toward",
      status: "confirmed",
      confidence: 1,
      sourceType: "user_reported",
      evidenceJson: { fragment: "30 повторений" },
      idempotencyKey: "fixture-a1-fact-2",
      metadata: {},
    },
    {
      localObjectFactId: "fact-home-duration",
      localMeasureId: "measure-duration",
      target: {
        targetType: "existing_activity_leaf",
        valueObjectId: HOME_TIME_LEAF_ID,
        semanticObjectKey: null,
        semanticObjectLabel: null,
      },
      relationTypeCode: "counts_toward",
      status: "confirmed",
      confidence: 1,
      sourceType: "user_reported",
      evidenceJson: { fragment: "дома 20 минут" },
      idempotencyKey: "fixture-a1-fact-3",
      metadata: {},
    },
  ],
  activityObjectLinks: [
    {
      localLinkId: "link-pull-ups",
      valueObjectId: PULL_UPS_LEAF_ID,
      relationTypeCode: "performs",
      status: "confirmed",
      confidence: 1,
      evidenceJson: { fragment: "Подтягивался" },
    },
  ],
} as const satisfies RealityCoreSaveRequestV2;

export const REALITY_MODEL_V2_FIXTURE_A3_CERTIFICATE_ORDER = {
  contractVersion: REALITY_CORE_CONTRACT_VERSION_V2,
  sourcePackageId: "p2-contract-fixture-a3",
  actorContext: USER_ACTOR_CONTEXT,
  activity: {
    title: "Заказ сертификата",
    inputText: "Заказал подарочный сертификат",
    description: null,
    activityTypeId: CERTIFICATE_ORDER_TYPE_ID,
    activityTemplateId: null,
    temporalDirection: "past",
    status: "completed",
    startedAt: "2026-07-23T20:00:00+02:00",
    endedAt: null,
    durationMinutes: null,
    timezone: "Europe/Warsaw",
    locationId: null,
    sourceType: "user_text",
    sourceExternalId: null,
    privacy: "private",
    idempotencyKey: "fixture-a3-activity",
    metadata: {},
  },
  measures: [],
  objectFacts: [],
  activityObjectLinks: [],
} as const satisfies RealityCoreSaveRequestV2;

export const REALITY_MODEL_V2_FIXTURE_A10_CANDIDATE_LEAF = {
  contractVersion: REALITY_CORE_CONTRACT_VERSION_V2,
  sourcePackageId: "p2-contract-fixture-a10",
  actorContext: {
    ...USER_ACTOR_CONTEXT,
    initiatedByActorId: DAUGHTER_ACTOR_ID,
    beneficiaryActorId: DAUGHTER_ACTOR_ID,
  },
  activity: {
    title: "Новый повторяемый вид игры",
    inputText: "Играл с дочерью в новую игру 45 минут",
    description: null,
    activityTypeId: EXERCISE_ACTIVITY_TYPE_ID,
    activityTemplateId: null,
    temporalDirection: "past",
    status: "completed",
    startedAt: "2026-07-23T17:00:00+02:00",
    endedAt: "2026-07-23T17:45:00+02:00",
    durationMinutes: 45,
    timezone: "Europe/Warsaw",
    locationId: null,
    sourceType: "user_text",
    sourceExternalId: null,
    privacy: "private",
    idempotencyKey: "fixture-a10-activity",
    metadata: {},
  },
  measures: [
    {
      localMeasureId: "measure-new-game-duration",
      parameterCode: "duration",
      value: {
        valueType: "numeric",
        valueNumeric: 45,
      },
      unitCode: "minute",
      time: {
        timeKind: "interval",
        observedAt: null,
        periodStart: "2026-07-23T17:00:00+02:00",
        periodEnd: "2026-07-23T17:45:00+02:00",
      },
      sourceType: "user_reported",
      confidence: 1,
      derivation: {
        isDerived: false,
        derivationMethod: null,
        derivationVersion: null,
        sourceLocalMeasureIds: [],
      },
      rawFragment: "45 минут",
      normalizedFragment: "45 minute",
      metadata: {},
    },
  ],
  objectFacts: [
    {
      localObjectFactId: "fact-new-game-candidate",
      localMeasureId: "measure-new-game-duration",
      target: {
        targetType: "semantic_candidate",
        valueObjectId: null,
        semanticObjectKey: "new_game_with_daughter",
        semanticObjectLabel: "Новая игра с дочерью",
      },
      relationTypeCode: "counts_toward",
      status: "proposed",
      confidence: 0.72,
      sourceType: "ai_extracted",
      evidenceJson: { fragment: "Играл с дочерью в новую игру 45 минут" },
      idempotencyKey: "fixture-a10-fact-1",
      metadata: { requiresUserReview: true },
    },
  ],
  activityObjectLinks: [],
} as const satisfies RealityCoreSaveRequestV2;

export const REALITY_MODEL_V2_FIXTURE_A13_HORMONE_WITHOUT_MEASUREMENT = {
  contractVersion: REALITY_CORE_CONTRACT_VERSION_V2,
  sourcePackageId: "p2-contract-fixture-a13",
  actorContext: USER_ACTOR_CONTEXT,
  activity: {
    title: "Субъективное напряжение",
    inputText: "После встречи чувствовал сильное напряжение",
    description: null,
    activityTypeId: OBSERVATION_ACTIVITY_TYPE_ID,
    activityTemplateId: null,
    temporalDirection: "past",
    status: "completed",
    startedAt: "2026-07-23T21:00:00+02:00",
    endedAt: null,
    durationMinutes: null,
    timezone: "Europe/Warsaw",
    locationId: null,
    sourceType: "user_text",
    sourceExternalId: null,
    privacy: "private",
    idempotencyKey: "fixture-a13-activity",
    metadata: {
      measurementRequest: "cortisol_measurement_needed",
      numericHormoneFactCreated: false,
    },
  },
  measures: [],
  objectFacts: [],
  activityObjectLinks: [],
} as const satisfies RealityCoreSaveRequestV2;
