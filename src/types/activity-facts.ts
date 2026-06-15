/**
 * GPT-APP / AI-NAVIGATOR
 * FACTS STEP 2/12 — Activity Facts Vocabulary Lock
 *
 * Purpose:
 * - Lock the shared vocabulary for Activity Event facts before SQL/API implementation.
 * - Keep Value Objects and personal user facts separated.
 * - Allow facts to point to an existing value_object_id OR remain semantic candidates through semantic_object_key.
 *
 * Safety:
 * - This file does not execute SQL.
 * - This file does not write to Supabase.
 * - This file does not call OpenAI.
 * - This file does not create Activity Events by itself.
 */

export const ACTIVITY_FACT_VOCABULARY_VERSION =
  "FACTS_VOCABULARY_LOCK_V1_20260615" as const;

export const ACTIVITY_CAPTURE_SURFACES = [
  "global_ai_panel",
  "workspace_ai_panel",
  "activity_capture",
  "today_journal",
  "mobile_quick_input",
  "api_import",
  "debug_read_only",
] as const;

export type ActivityCaptureSurface =
  (typeof ACTIVITY_CAPTURE_SURFACES)[number];

export const GENERAL_ACTIVITY_CANDIDATE_KINDS = [
  "ordinary_chat",
  "obvious_activity",
  "ambiguous_activity",
  "dual_intent_question_activity",
] as const;

export type GeneralActivityCandidateKind =
  (typeof GENERAL_ACTIVITY_CANDIDATE_KINDS)[number];

export const ACTIVITY_FACT_LIFECYCLE_STATUSES = [
  "ordinary_chat",
  "activity_candidate",
  "activity_review",
  "confirmed_fact",
  "corrected_fact",
  "rejected_candidate",
] as const;

export type ActivityFactLifecycleStatus =
  (typeof ACTIVITY_FACT_LIFECYCLE_STATUSES)[number];

export const ACTIVITY_EVENT_STATUSES = [
  "draft",
  "review",
  "confirmed",
  "corrected",
  "rejected",
  "superseded",
  "deleted",
] as const;

export type ActivityEventStatus = (typeof ACTIVITY_EVENT_STATUSES)[number];

export const ACTIVITY_FACT_STATUSES = [
  "proposed",
  "needs_review",
  "confirmed",
  "corrected",
  "rejected",
  "superseded",
  "deleted",
] as const;

export type ActivityFactStatus = (typeof ACTIVITY_FACT_STATUSES)[number];

export const ACTIVITY_FACT_REVIEW_DECISIONS = [
  "pending",
  "accepted",
  "edited",
  "rejected",
  "ignored",
] as const;

export type ActivityFactReviewDecision =
  (typeof ACTIVITY_FACT_REVIEW_DECISIONS)[number];

export const ACTIVITY_MEASURE_TYPES = [
  "duration",
  "distance",
  "count",
  "volume",
  "mass",
  "money",
  "energy",
  "repetitions",
  "state_score",
  "state_text",
  "boolean_state",
  "role",
  "context_tag",
  "derived_metric",
] as const;

export type ActivityMeasureType = (typeof ACTIVITY_MEASURE_TYPES)[number];

export const ACTIVITY_UNITS = [
  "minute",
  "hour",
  "meter",
  "kilometer",
  "count",
  "repetition",
  "set",
  "milliliter",
  "liter",
  "gram",
  "kilogram",
  "kcal",
  "pln",
  "eur",
  "usd",
  "score_0_10",
  "boolean",
  "text",
  "tag",
  "role",
  "km_per_hour",
] as const;

export type ActivityUnit = (typeof ACTIVITY_UNITS)[number];

export const ACTIVITY_MEASURE_SOURCE_TYPES = [
  "user_text",
  "user_edit",
  "ai_extraction",
  "rule_based",
  "tracker_import",
  "derived_calculation",
  "system_default",
] as const;

export type ActivityMeasureSourceType =
  (typeof ACTIVITY_MEASURE_SOURCE_TYPES)[number];

export const RECALCULATION_REASONS = [
  "fact_created",
  "fact_corrected",
  "fact_rejected",
  "fact_deleted",
  "value_object_linked",
  "value_object_unlinked",
  "hierarchy_changed",
  "standard_changed",
] as const;

export type RecalculationReason = (typeof RECALCULATION_REASONS)[number];

export const RECALCULATION_STATUSES = [
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const;

export type RecalculationStatus = (typeof RECALCULATION_STATUSES)[number];

export const ACTIVITY_FACT_UNIT_BY_MEASURE_TYPE: Readonly<
  Record<ActivityMeasureType, readonly ActivityUnit[]>
> = {
  duration: ["minute", "hour"],
  distance: ["meter", "kilometer"],
  count: ["count"],
  volume: ["milliliter", "liter"],
  mass: ["gram", "kilogram"],
  money: ["pln", "eur", "usd"],
  energy: ["kcal"],
  repetitions: ["repetition", "set", "count"],
  state_score: ["score_0_10"],
  state_text: ["text"],
  boolean_state: ["boolean"],
  role: ["role", "text"],
  context_tag: ["tag", "text"],
  derived_metric: ["km_per_hour", "kcal", "score_0_10", "text"],
};

export const SEMANTIC_OBJECT_KEY_RULES = {
  description:
    "Stable lower snake_case key for a semantic object/category candidate when value_object_id is not available yet.",
  regexSource: "^[a-z][a-z0-9_]{1,79}$",
  examples: [
    "cycling",
    "physical_activity",
    "leg_work",
    "cardio_load",
    "fresh_air",
    "sleep",
    "water_intake",
    "childcare",
    "business_negotiation",
  ],
} as const;

export const ACTIVITY_FACT_PRIVACY_RULES = [
  "Every confirmed fact must be user-owned through user_id and/or actor_id.",
  "A shared/system Value Object is only a reference object; the measure/fact row remains private to the user.",
  "Do not create a Value Object automatically only because a fact candidate exists.",
  "A fact can keep value_object_id as null and use semantic_object_key plus semantic_object_label until linked later.",
  "One chronological event can expose the same duration to multiple object facts, but chronological total time is not summed across those facts.",
  "No hidden write: confirmed facts are created only after explicit user confirmation.",
] as const;

export type ActivityEventDraft = {
  readonly rawText: string;
  readonly normalizedText?: string | null;
  readonly startedAt?: string | null;
  readonly endedAt?: string | null;
  readonly durationMinutes?: number | null;
  readonly captureSurface: ActivityCaptureSurface;
  readonly status: ActivityEventStatus;
};

export type ActivityEventMeasureDraft = {
  readonly measureType: ActivityMeasureType;
  readonly value: number | string | boolean;
  readonly unit: ActivityUnit;
  readonly source: ActivityMeasureSourceType;
  readonly confidence: number;
  readonly isDerived: boolean;
};

export type ActivityObjectFactDraft = {
  readonly semanticObjectKey: string;
  readonly semanticObjectLabel: string;
  readonly valueObjectId: string | null;
  readonly measureType: ActivityMeasureType;
  readonly value: number | string | boolean;
  readonly unit: ActivityUnit;
  readonly periodStart?: string | null;
  readonly periodEnd?: string | null;
  readonly status: ActivityFactStatus;
  readonly confidence: number;
};

export type ActivityFactReviewItemDraft = {
  readonly proposedLabel: string;
  readonly proposedValue: number | string | boolean;
  readonly proposedUnit: ActivityUnit;
  readonly userDecision: ActivityFactReviewDecision;
  readonly editedValue?: number | string | boolean | null;
  readonly editedUnit?: ActivityUnit | null;
  readonly rejectedReason?: string | null;
};

export type ActivityFactsReviewPackage = {
  readonly vocabularyVersion: typeof ACTIVITY_FACT_VOCABULARY_VERSION;
  readonly classifierKind: GeneralActivityCandidateKind;
  readonly lifecycleStatus: ActivityFactLifecycleStatus;
  readonly eventDraft: ActivityEventDraft;
  readonly measures: readonly ActivityEventMeasureDraft[];
  readonly objectFacts: readonly ActivityObjectFactDraft[];
  readonly reviewItems: readonly ActivityFactReviewItemDraft[];
  readonly warnings: readonly string[];
};

export function isActivityMeasureType(
  value: string,
): value is ActivityMeasureType {
  return (ACTIVITY_MEASURE_TYPES as readonly string[]).includes(value);
}

export function isActivityUnit(value: string): value is ActivityUnit {
  return (ACTIVITY_UNITS as readonly string[]).includes(value);
}

export function isActivityFactStatus(
  value: string,
): value is ActivityFactStatus {
  return (ACTIVITY_FACT_STATUSES as readonly string[]).includes(value);
}

export function isValidSemanticObjectKey(value: string): boolean {
  return new RegExp(SEMANTIC_OBJECT_KEY_RULES.regexSource).test(value);
}
