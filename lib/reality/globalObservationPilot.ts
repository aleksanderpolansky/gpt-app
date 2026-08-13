import { Buffer } from "node:buffer";

import {
  runAiJsonWithUsageMetadata,
  type RunAiJsonUsageMetadata,
} from "../ai/openaiClient";
import { supabase } from "../supabase";
import {
  completeAiAnalysisExecution,
  createAiAnalysisExecution,
  createAiContextManifest,
  failAiAnalysisExecution,
  markAiContextManifestFailed,
  markAiContextManifestProviderCompleted,
  markAiContextManifestValidated,
} from "../ai/contextManifest";
import {
  RECOGNITION_CANDIDATE_CONTRACT_VERSION,
  RECOGNITION_CANDIDATE_LIMIT,
  isRecognitionCandidateSelectable,
  isRecognitionEvidenceClass,
  isRecognitionStatus,
  isRecognitionStatusShapeValid,
  type RecognitionEvidenceClass,
  type RecognitionStatus,
} from "./recognitionCandidatePolicy";
import {
  SEMANTIC_PROJECTION_CONTRACT_VERSION,
  buildSemanticProjections,
} from "./semanticProjectionPolicy";

const ROUTE_PATH = "/api/ai/reality/global-observation-preview";
const PILOT_MODEL_TIER = "nano";

const HARD_CAP_USD = 0.1;
const MAX_PROVIDER_CALLS = 2;
const OPERATION_DEADLINE_MS = 55_000;
const PROVIDER_CALL_TIMEOUT_MS = 25_000;

const MAX_INPUT_TEXT_CHARS = 4_000;
const MAX_SEGMENTS = 5;

const ROUTING_MAX_OUTPUT_TOKENS = 500;
const SELECTION_MAX_OUTPUT_TOKENS = 900;
const PILOT_OUTPUT_TOKEN_CEILING = 4_000;
const PILOT_INPUT_TOKEN_CEILING = 20_000;

const SUPPORTED_LOCALES = new Set(["ru", "en", "pl", "uk", "de", "es", "cs"]);
const TEMPORAL_PRECISIONS = new Set([
  "exact",
  "approximate",
  "date_only",
  "window_only",
  "unknown",
]);

type JsonRecord = Record<string, unknown>;

type DomainFacetOption = {
  rootCanonicalKey: string;
  title: string;
  facets: string[];
};

type DomainFacetRouteOption = {
  domainFacetKey: string;
  rootCanonicalKey: string;
  rootTitle: string;
  facetCode: string;
};

type RoutingSegment = {
  segmentId: string;
  sourceFragment: string;
  lookupText: string;
  rootCanonicalKey: string;
  facetCode: string;
  occurredAtIso: string | null;
  occurredAtRaw: string | null;
  temporalPrecision: string;
};

type RoutingOutputSegment = {
  segmentId: string;
  sourceFragment: string;
  lookupText: string;
  domainFacetKey: string;
  occurredAtIso: string | null;
  occurredAtRaw: string | null;
  temporalPrecision: string;
};

type RoutingOutput = {
  segments: RoutingOutputSegment[];
};

type ParameterContract = {
  parameterCode: string;
  dimensionCode: string;
  valueTypeCode: string;
  allowedUnitCodes: string[];
};

type CandidateDetails = {
  valueObjectId: string;
  canonicalKey: string;
  title: string;
  description: string | null;
  facetCode: string;
  objectKindCode: string | null;
  parameters: ParameterContract[];
};

type Candidate = CandidateDetails & {
  recognitionEvidenceClass: RecognitionEvidenceClass;
  recognitionProfileVersion: number | null;
  recognitionUncertaintyPolicyCode: string | null;
  selectionAllowed: boolean;
};

type CandidateGroup = {
  segmentId: string;
  resolutionMode: "recognition_candidates";
  exactMatchKind: string | null;
  recognitionStatus: RecognitionStatus;
  recognitionCandidateCount: number;
  selectionAllowed: boolean;
  candidates: Candidate[];
};

type ProposedFact = {
  parameterCode: string;
  unit: string;
  valueType: "numeric" | "text" | "boolean";
  valueNumeric: number | null;
  valueText: string | null;
  valueBoolean: boolean | null;
  rawFragment: string;
};

type SelectionRow = {
  selectionKey: string;
  confidence: number;
  facts: ProposedFact[];
};

type SelectionOutput = {
  selections: SelectionRow[];
};

type BudgetPreflight = {
  allowed: boolean;
  reason: string;
  operationId?: string;
  reservationId?: string;
  priceSnapshotId?: string;
  requestedCallMaxCostUsd?: number;
  operationReservedMaxCostUsd?: number;
  hardCapUsd?: number;
  callIndex?: number;
};

type BudgetedCallResult<T> = {
  parsed: T;
  outputText: string;
  usage: RunAiJsonUsageMetadata;
  contextManifestId: string;
  reservedMaxCostUsd: number;
  operationReservedMaxCostUsd: number;
  actualProviderCostUsd: number | null;
  usageLogWarning: string | null;
};

export type GlobalObservationPreviewRequest = {
  appUserId: string;
  actorId: string;
  inputText: string;
  locale?: string | null;
  timeZone?: string | null;
  operationId: string;
};

export class GlobalObservationPilotError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details: unknown = null,
  ) {
    super(message);
    this.name = "GlobalObservationPilotError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableText(value: unknown): string | null {
  const text = asText(value);
  return text || null;
}

function asFiniteNumber(value: unknown): number | null {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(numberValue) ? numberValue : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function containsFragment(source: string, fragment: string) {
  return source.toLocaleLowerCase().includes(fragment.toLocaleLowerCase());
}

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type DeterministicTemporalResolution = {
  occurredAtIso: string | null;
  temporalPrecision: string;
};

function readZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(byType.get("year")),
    month: Number(byType.get("month")),
    day: Number(byType.get("day")),
    hour: Number(byType.get("hour")),
    minute: Number(byType.get("minute")),
    second: Number(byType.get("second")),
  };
}

function zonedLocalDateTimeToIso(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  timeZone: string;
}) {
  const desiredLocalAsUtc = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour,
    input.minute,
    0,
  );

  let candidate = new Date(desiredLocalAsUtc);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = readZonedDateParts(candidate, input.timeZone);
    const actualLocalAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const deltaMs = desiredLocalAsUtc - actualLocalAsUtc;

    if (deltaMs === 0) {
      return candidate.toISOString();
    }

    candidate = new Date(candidate.getTime() + deltaMs);
  }

  const finalParts = readZonedDateParts(candidate, input.timeZone);

  if (
    finalParts.year !== input.year ||
    finalParts.month !== input.month ||
    finalParts.day !== input.day ||
    finalParts.hour !== input.hour ||
    finalParts.minute !== input.minute
  ) {
    return null;
  }

  return candidate.toISOString();
}

function normalizeRussianClockHour(hour: number, daypart: string | null) {
  if (!daypart) {
    return hour;
  }

  if (daypart === "вечера" || daypart === "дня") {
    return hour < 12 ? hour + 12 : hour;
  }

  if (daypart === "ночи" && hour === 12) {
    return 0;
  }

  return hour;
}

function parseRussianClock(raw: string) {
  const normalized = raw.toLocaleLowerCase().replaceAll("ё", "е");

  const numericColon = normalized.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);

  if (numericColon) {
    return {
      hour: Number(numericColon[1]),
      minute: Number(numericColon[2]),
    };
  }

  const numericDaypart = normalized.match(
    /(?:^|\s)(?:в|около)\s+([01]?\d|2[0-3])\s*(утра|дня|вечера|ночи)(?=$|[\s,.!?])/iu,
  );

  if (numericDaypart) {
    return {
      hour: normalizeRussianClockHour(
        Number(numericDaypart[1]),
        numericDaypart[2],
      ),
      minute: 0,
    };
  }

  const wordHours = new Map<string, number>([
    ["один", 1],
    ["одного", 1],
    ["два", 2],
    ["двух", 2],
    ["три", 3],
    ["трех", 3],
    ["четыре", 4],
    ["четырех", 4],
    ["пять", 5],
    ["пяти", 5],
    ["шесть", 6],
    ["шести", 6],
    ["семь", 7],
    ["семи", 7],
    ["восемь", 8],
    ["восьми", 8],
    ["девять", 9],
    ["девяти", 9],
    ["десять", 10],
    ["десяти", 10],
    ["одиннадцать", 11],
    ["одиннадцати", 11],
    ["двенадцать", 12],
    ["двенадцати", 12],
  ]);

  const wordDaypart = normalized.match(
    /(?:^|\s)(один|одного|два|двух|три|трех|четыре|четырех|пять|пяти|шесть|шести|семь|семи|восемь|восьми|девять|девяти|десять|десяти|одиннадцать|одиннадцати|двенадцать|двенадцати)\s+(утра|дня|вечера|ночи)(?=$|[\s,.!?])/iu,
  );

  if (!wordDaypart) {
    return null;
  }

  const baseHour = wordHours.get(wordDaypart[1]);

  if (baseHour === undefined) {
    return null;
  }

  return {
    hour: normalizeRussianClockHour(baseHour, wordDaypart[2]),
    minute: 0,
  };
}

function resolveRussianRelativeTemporalRaw(input: {
  raw: string;
  reportedAt: Date;
  timeZone: string;
}): DeterministicTemporalResolution | null {
  const normalized = input.raw.toLocaleLowerCase().replaceAll("ё", "е");

  const relativeDayOffset = normalized.includes("позавчера")
    ? -2
    : normalized.includes("вчера")
      ? -1
      : normalized.includes("сегодня")
        ? 0
        : null;

  if (relativeDayOffset === null) {
    return null;
  }

  const clock = parseRussianClock(input.raw);
  const hasDaypart =
    /(утром|утра|днем|дня|вечером|вечера|ночью|ночи)/iu.test(normalized);

  if (!clock) {
    return {
      occurredAtIso: null,
      temporalPrecision: hasDaypart ? "window_only" : "date_only",
    };
  }

  const localReference = readZonedDateParts(
    input.reportedAt,
    input.timeZone,
  );
  const localDateCursor = new Date(
    Date.UTC(
      localReference.year,
      localReference.month - 1,
      localReference.day,
    ),
  );

  localDateCursor.setUTCDate(
    localDateCursor.getUTCDate() + relativeDayOffset,
  );

  const occurredAtIso = zonedLocalDateTimeToIso({
    year: localDateCursor.getUTCFullYear(),
    month: localDateCursor.getUTCMonth() + 1,
    day: localDateCursor.getUTCDate(),
    hour: clock.hour,
    minute: clock.minute,
    timeZone: input.timeZone,
  });

  if (!occurredAtIso) {
    throw new GlobalObservationPilotError(
      502,
      "TEMPORAL_LOCAL_TIME_RESOLUTION_FAILED",
      "Explicit relative local time could not be resolved deterministically.",
      { raw: input.raw, timeZone: input.timeZone },
    );
  }

  return {
    occurredAtIso,
    temporalPrecision:
      /(около|примерно|приблизительно)/iu.test(normalized)
        ? "approximate"
        : "exact",
  };
}

function resolveTemporalRawDeterministically(input: {
  raw: string;
  locale: string;
  reportedAt: Date;
  timeZone: string;
}) {
  if (input.locale === "ru") {
    return resolveRussianRelativeTemporalRaw(input);
  }

  return null;
}

function extractExplicitMealLabel(input: {
  sourceFragment: string;
  locale: string;
}) {
  if (input.locale !== "ru") {
    return null;
  }

  const patterns = [
    { label: "breakfast", pattern: /(завтракал(?:а|и)?|завтрак)/iu },
    { label: "lunch", pattern: /(обедал(?:а|и)?|обед)/iu },
    { label: "dinner", pattern: /(ужинал(?:а|и)?|ужин)/iu },
  ];

  for (const item of patterns) {
    const match = input.sourceFragment.match(item.pattern);

    if (match?.[0]) {
      return {
        label: item.label,
        rawFragment: match[0],
      };
    }
  }

  return null;
}

function buildDeterministicRussianAvailableTimeSegment(input: {
  sourceText: string;
  locale: string;
  existingSegments: RoutingSegment[];
}): RoutingSegment[] | null {
  if (input.locale !== "ru") {
    return null;
  }

  const normalized = input.sourceText.toLocaleLowerCase().replaceAll("ё", "е");
  const hasAvailabilityWord =
    /(свободн[а-я]*|доступн[а-я]*)/iu.test(normalized);
  const hasTimeUnit =
    /(час[а-я]*|минут[а-я]*)/iu.test(normalized);
  const hasAvailabilityPredicate =
    /(есть|имею|имеется|будет|осталось|остается)/iu.test(normalized);

  if (
    !hasAvailabilityWord ||
    !hasTimeUnit ||
    !hasAvailabilityPredicate
  ) {
    return null;
  }

  const temporalMatch = input.sourceText.match(
    /(сегодня|вчера|позавчера)(?:\s+(утром|днем|вечером|ночью))?/iu,
  );
  const occurredAtRaw = temporalMatch?.[0] ?? null;
  const hasDaypart = Boolean(temporalMatch?.[2]);

  return [
    {
      segmentId: input.existingSegments[0]?.segmentId || "available_time_1",
      sourceFragment: input.sourceText.trim(),
      lookupText: "Доступное время",
      rootCanonicalKey: "domain.environment_context",
      facetCode: "CONTEXT",
      occurredAtIso: null,
      occurredAtRaw,
      temporalPrecision: occurredAtRaw
        ? hasDaypart
          ? "window_only"
          : "date_only"
        : "unknown",
    },
  ];
}

function estimateInputTokensUpperBound(input: {
  system: string;
  user: unknown;
  schema: Record<string, unknown>;
}) {
  // Conservative for ordinary UTF-8 text: every token contains at least one
  // byte. Add fixed framing overhead so we never budget from a character count
  // that is smaller than the serialized provider request.
  const serialized =
    input.system + JSON.stringify(input.user) + JSON.stringify(input.schema);

  return Buffer.byteLength(serialized, "utf8") + 1_024;
}

function getDomainFacetRouteOptions(
  catalog: DomainFacetOption[],
): DomainFacetRouteOption[] {
  return catalog.flatMap((entry) =>
    entry.facets.map((facetCode) => ({
      domainFacetKey: `${entry.rootCanonicalKey}::${facetCode}`,
      rootCanonicalKey: entry.rootCanonicalKey,
      rootTitle: entry.title,
      facetCode,
    })),
  );
}

function getRoutingSchema(
  catalog: DomainFacetOption[],
): Record<string, unknown> {
  const routeKeys = getDomainFacetRouteOptions(catalog).map(
    (option) => option.domainFacetKey,
  );

  if (routeKeys.length < 1) {
    throw new GlobalObservationPilotError(
      409,
      "GLOBAL_DOMAIN_FACET_CATALOG_EMPTY",
      "No active DOMAIN/FACET routes are available.",
    );
  }

  return {
    type: "object",
    additionalProperties: false,
    required: ["segments"],
    properties: {
      segments: {
        type: "array",
        minItems: 1,
        maxItems: MAX_SEGMENTS,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "segmentId",
            "sourceFragment",
            "lookupText",
            "domainFacetKey",
            "occurredAtIso",
            "occurredAtRaw",
            "temporalPrecision",
          ],
          properties: {
            segmentId: { type: "string" },
            sourceFragment: { type: "string" },
            lookupText: { type: "string" },
            domainFacetKey: {
              type: "string",
              enum: routeKeys,
            },
            occurredAtIso: { type: ["string", "null"] },
            occurredAtRaw: { type: ["string", "null"] },
            temporalPrecision: {
              type: "string",
              enum: ["exact", "approximate", "date_only", "window_only", "unknown"],
            },
          },
        },
      },
    },
  };
}

function getSelectionSchema(
  groups: CandidateGroup[],
): Record<string, unknown> {
  const selectionKeys = groups.flatMap((group) => [
    `${group.segmentId}::__NONE__`,
    ...group.candidates
      .filter((candidate) => candidate.selectionAllowed)
      .map(
        (candidate) => `${group.segmentId}::${candidate.canonicalKey}`,
      ),
  ]);

  return {
    type: "object",
    additionalProperties: false,
    required: ["selections"],
    properties: {
      selections: {
        type: "array",
        minItems: groups.length,
        maxItems: groups.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["selectionKey", "confidence", "facts"],
          properties: {
            selectionKey: {
              type: "string",
              enum: selectionKeys,
            },
            confidence: { type: "number" },
            facts: {
              type: "array",
              maxItems: 8,
              items: {
                type: "object",
                additionalProperties: false,
                required: [
                  "parameterCode",
                  "unit",
                  "valueType",
                  "valueNumeric",
                  "valueText",
                  "valueBoolean",
                  "rawFragment",
                ],
                properties: {
                  parameterCode: { type: "string" },
                  unit: { type: "string" },
                  valueType: {
                    type: "string",
                    enum: ["numeric", "text", "boolean"],
                  },
                  valueNumeric: { type: ["number", "null"] },
                  valueText: { type: ["string", "null"] },
                  valueBoolean: { type: ["boolean", "null"] },
                  rawFragment: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  };
}

async function getNanoPilotModel() {
  const { data, error } = await supabase
    .from("ai_model_tiers")
    .select("tier_code, default_model_name, enabled")
    .eq("tier_code", PILOT_MODEL_TIER)
    .maybeSingle();

  if (error || !data) {
    throw new GlobalObservationPilotError(
      503,
      "PILOT_MODEL_TIER_UNAVAILABLE",
      error?.message ?? "Nano pilot tier is unavailable.",
    );
  }

  if (!data.enabled || !asText(data.default_model_name)) {
    throw new GlobalObservationPilotError(
      503,
      "PILOT_MODEL_DISABLED",
      "Nano pilot model is not enabled.",
    );
  }

  return asText(data.default_model_name);
}

async function loadDomainFacetCatalog(): Promise<DomainFacetOption[]> {
  const { data: roots, error: rootError } = await supabase
    .from("value_objects")
    .select("id, canonical_key, title")
    .eq("scope_code", "global")
    .eq("ontology_node_role_code", "root")
    .eq("facet_code", "DOMAIN")
    .eq("status", "active")
    .order("canonical_key");

  if (rootError) {
    throw new GlobalObservationPilotError(
      500,
      "GLOBAL_DOMAIN_READ_FAILED",
      rootError.message,
    );
  }

  const rootRows = (roots ?? []) as Array<{
    id: string;
    canonical_key: string;
    title: string;
  }>;

  if (rootRows.length !== 12) {
    throw new GlobalObservationPilotError(
      409,
      "GLOBAL_DOMAIN_COUNT_INVALID",
      `Expected 12 global DOMAIN roots, received ${rootRows.length}.`,
    );
  }

  const rootIds = rootRows.map((row) => row.id);
  const { data: leaves, error: leafError } = await supabase
    .from("value_objects")
    .select("root_value_object_id, facet_code")
    .eq("scope_code", "global")
    .eq("ontology_node_role_code", "leaf")
    .eq("status", "active")
    .in("root_value_object_id", rootIds);

  if (leafError) {
    throw new GlobalObservationPilotError(
      500,
      "GLOBAL_LEAF_FACET_READ_FAILED",
      leafError.message,
    );
  }

  const facetsByRoot = new Map<string, Set<string>>();

  for (const row of (leaves ?? []) as Array<{
    root_value_object_id: string;
    facet_code: string;
  }>) {
    const facets = facetsByRoot.get(row.root_value_object_id) ?? new Set<string>();
    facets.add(row.facet_code);
    facetsByRoot.set(row.root_value_object_id, facets);
  }

  return rootRows.map((root) => ({
    rootCanonicalKey: root.canonical_key,
    title: root.title,
    facets: [...(facetsByRoot.get(root.id) ?? new Set<string>())].sort(),
  }));
}

function validateRoutingOutput(input: {
  output: unknown;
  sourceText: string;
  catalog: DomainFacetOption[];
  reportedAt: Date;
  locale: string;
  timeZone: string;
}): RoutingSegment[] {
  const outputRecord = asRecord(input.output);
  const rawSegments = asArray(outputRecord?.segments);

  if (
    rawSegments.length < 1 ||
    rawSegments.length > MAX_SEGMENTS
  ) {
    throw new GlobalObservationPilotError(
      502,
      "AI_ROUTING_SEGMENT_COUNT_INVALID",
      "AI routing returned an invalid segment count.",
    );
  }

  const allowedRoutes = new Map(
    getDomainFacetRouteOptions(input.catalog).map((option) => [
      option.domainFacetKey,
      option,
    ]),
  );

  const ids = new Set<string>();
  const segments: RoutingSegment[] = [];

  for (const rawSegment of rawSegments) {
    const row = asRecord(rawSegment);

    if (!row) {
      throw new GlobalObservationPilotError(
        502,
        "AI_ROUTING_SEGMENT_INVALID",
        "AI routing returned a non-object segment.",
      );
    }

    const segmentId = asText(row.segmentId);
    const sourceFragment = asText(row.sourceFragment);
    const lookupText = asText(row.lookupText);
    const domainFacetKey = asText(row.domainFacetKey);
    const routeOption = allowedRoutes.get(domainFacetKey);
    const rootCanonicalKey = routeOption?.rootCanonicalKey ?? "";
    const facetCode = routeOption?.facetCode ?? "";
    let occurredAtIso = asNullableText(row.occurredAtIso);
    const occurredAtRaw = asNullableText(row.occurredAtRaw);
    let temporalPrecision = asText(row.temporalPrecision);

    if (
      !segmentId ||
      segmentId.length > 32 ||
      ids.has(segmentId) ||
      !sourceFragment ||
      !containsFragment(input.sourceText, sourceFragment) ||
      !lookupText ||
      lookupText.length > 120 ||
      !routeOption ||
      !TEMPORAL_PRECISIONS.has(temporalPrecision)
    ) {
      throw new GlobalObservationPilotError(
        502,
        "AI_ROUTING_SEGMENT_CONTRACT_FAILED",
        "AI routing output failed deterministic server validation.",
        { segmentId, domainFacetKey, rootCanonicalKey, facetCode },
      );
    }

    if (
      occurredAtRaw &&
      !containsFragment(input.sourceText, occurredAtRaw)
    ) {
      throw new GlobalObservationPilotError(
        502,
        "AI_ROUTING_TEMPORAL_EVIDENCE_INVALID",
        "occurredAtRaw must be an exact substring of the user text.",
        { segmentId, occurredAtRaw },
      );
    }

    if (!occurredAtIso && occurredAtRaw) {
      const deterministicTemporal = resolveTemporalRawDeterministically({
        raw: occurredAtRaw,
        locale: input.locale,
        reportedAt: input.reportedAt,
        timeZone: input.timeZone,
      });

      if (deterministicTemporal) {
        occurredAtIso = deterministicTemporal.occurredAtIso;
        temporalPrecision = deterministicTemporal.temporalPrecision;
      }
    }

    if (occurredAtIso) {
      const parsed = new Date(occurredAtIso);

      if (
        Number.isNaN(parsed.getTime()) ||
        parsed.getTime() > input.reportedAt.getTime() + 5 * 60_000
      ) {
        throw new GlobalObservationPilotError(
          502,
          "AI_ROUTING_OCCURRED_AT_INVALID",
          "AI routing returned an invalid or future occurredAt timestamp.",
          { segmentId, occurredAtIso },
        );
      }
    }

    ids.add(segmentId);
    segments.push({
      segmentId,
      sourceFragment,
      lookupText,
      rootCanonicalKey,
      facetCode,
      occurredAtIso,
      occurredAtRaw,
      temporalPrecision,
    });
  }

  return segments;
}

async function readCandidateParameterContracts(candidateIds: string[]) {
  const result = new Map<string, ParameterContract[]>();

  if (candidateIds.length === 0) {
    return result;
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("value_object_parameter_assignments")
    .select("value_object_id, parameter_definition_id, display_order")
    .in("value_object_id", candidateIds)
    .eq("assignment_scope_code", "system")
    .eq("status", "active");

  if (assignmentError) {
    throw new GlobalObservationPilotError(
      500,
      "GLOBAL_PARAMETER_ASSIGNMENT_READ_FAILED",
      assignmentError.message,
    );
  }

  const assignmentRows = (assignments ?? []) as Array<{
    value_object_id: string;
    parameter_definition_id: string;
    display_order: number | null;
  }>;

  const definitionIds = [
    ...new Set(assignmentRows.map((row) => row.parameter_definition_id)),
  ];

  if (definitionIds.length === 0) {
    return result;
  }

  const { data: definitions, error: definitionError } = await supabase
    .from("value_object_parameter_definitions")
    .select(
      "id, parameter_code, dimension_code, value_type_code, allowed_unit_codes, status",
    )
    .in("id", definitionIds)
    .eq("status", "active");

  if (definitionError) {
    throw new GlobalObservationPilotError(
      500,
      "GLOBAL_PARAMETER_DEFINITION_READ_FAILED",
      definitionError.message,
    );
  }

  const definitionsById = new Map(
    ((definitions ?? []) as Array<{
      id: string;
      parameter_code: string;
      dimension_code: string;
      value_type_code: string;
      allowed_unit_codes: unknown;
      status: string;
    }>).map((row) => [row.id, row] as const),
  );

  assignmentRows.sort((a, b) => {
    const left = a.display_order ?? 1_000_000;
    const right = b.display_order ?? 1_000_000;
    return left - right;
  });

  for (const assignment of assignmentRows) {
    const definition = definitionsById.get(assignment.parameter_definition_id);

    if (!definition) {
      continue;
    }

    const units = asArray(definition.allowed_unit_codes)
      .map(asText)
      .filter(Boolean);

    const contracts = result.get(assignment.value_object_id) ?? [];
    contracts.push({
      parameterCode: definition.parameter_code,
      dimensionCode: definition.dimension_code,
      valueTypeCode: definition.value_type_code,
      allowedUnitCodes: units,
    });
    result.set(assignment.value_object_id, contracts);
  }

  return result;
}

async function loadCandidateDetails(candidateIds: string[]) {
  if (candidateIds.length === 0) {
    return new Map<string, Candidate>();
  }

  const parameterContracts = await readCandidateParameterContracts(candidateIds);

  const { data, error } = await supabase
    .from("value_objects")
    .select(
      "id, canonical_key, title, description, facet_code, object_kind_code",
    )
    .in("id", candidateIds)
    .eq("scope_code", "global")
    .eq("ontology_node_role_code", "leaf")
    .eq("status", "active");

  if (error) {
    throw new GlobalObservationPilotError(
      500,
      "GLOBAL_CANDIDATE_DETAILS_READ_FAILED",
      error.message,
    );
  }

  return new Map(
    ((data ?? []) as Array<{
      id: string;
      canonical_key: string;
      title: string;
      description: string | null;
      facet_code: string;
      object_kind_code: string | null;
    }>).map((row) => [
      row.id,
      {
        valueObjectId: row.id,
        canonicalKey: row.canonical_key,
        title: row.title,
        description: row.description,
        facetCode: row.facet_code,
        objectKindCode: row.object_kind_code,
        parameters: parameterContracts.get(row.id) ?? [],
      } satisfies CandidateDetails,
    ]),
  );
}

async function buildCandidateGroups(
  segments: RoutingSegment[],
  locale: string,
): Promise<CandidateGroup[]> {
  const interim: Array<{
    segment: RoutingSegment;
    recognitionStatus: RecognitionStatus;
    recognitionCandidateCount: number;
    candidates: Array<{
      valueObjectId: string;
      canonicalKey: string;
      evidenceClass: RecognitionEvidenceClass;
      profileVersion: number | null;
      uncertaintyPolicyCode: string | null;
      selectionAllowed: boolean;
    }>;
  }> = [];

  for (const segment of segments) {
    const { data, error } = await supabase.rpc(
      "get_global_value_object_recognition_candidates_v1",
      {
        p_query_text: segment.sourceFragment,
        p_locale: locale,
        p_semantic_tags: [],
        p_limit: RECOGNITION_CANDIDATE_LIMIT,
      },
    );

    if (error) {
      throw new GlobalObservationPilotError(
        500,
        "GLOBAL_RECOGNITION_CANDIDATES_FAILED",
        error.message,
      );
    }

    const record = asRecord(data);
    const contractVersion = asText(record?.contractVersion);
    const rawStatus = asText(record?.status);
    const candidateCount = asFiniteNumber(record?.candidateCount);
    const candidateLimit = asFiniteNumber(record?.candidateLimit);
    const rawCandidates = asArray(record?.candidates)
      .map(asRecord)
      .filter((row): row is JsonRecord => Boolean(row));

    if (
      contractVersion !== RECOGNITION_CANDIDATE_CONTRACT_VERSION ||
      !isRecognitionStatus(rawStatus) ||
      candidateCount === null ||
      !Number.isInteger(candidateCount) ||
      candidateCount < 0 ||
      candidateLimit !== RECOGNITION_CANDIDATE_LIMIT
    ) {
      throw new GlobalObservationPilotError(
        500,
        "GLOBAL_RECOGNITION_CANDIDATE_SHAPE_INVALID",
        "Recognition candidate RPC returned an invalid contract envelope.",
      );
    }

    const recognitionStatus = rawStatus;
    const shapeValid = isRecognitionStatusShapeValid({
      status: recognitionStatus,
      candidateCount,
      returnedCandidateCount: rawCandidates.length,
      limit: RECOGNITION_CANDIDATE_LIMIT,
    });

    if (!shapeValid) {
      throw new GlobalObservationPilotError(
        500,
        "GLOBAL_RECOGNITION_CANDIDATE_STATUS_INVALID",
        "Recognition candidate count/status invariants failed.",
        {
          recognitionStatus,
          candidateCount,
          returnedCandidateCount: rawCandidates.length,
        },
      );
    }

    const ids = new Set<string>();
    const canonicalKeys = new Set<string>();
    const candidates = rawCandidates.map((row) => {
      const valueObjectId = asText(row.valueObjectId);
      const canonicalKey = asText(row.canonicalKey);
      const evidenceClassRaw = asText(row.evidenceClass);
      const profileVersionRaw = asFiniteNumber(row.profileVersion);
      const uncertaintyPolicyCode = asNullableText(
        row.uncertaintyPolicyCode,
      );

      const evidenceClass = isRecognitionEvidenceClass(evidenceClassRaw)
        ? evidenceClassRaw
        : null;

      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(
          valueObjectId,
        ) ||
        !canonicalKey ||
        !evidenceClass ||
        ids.has(valueObjectId) ||
        canonicalKeys.has(canonicalKey) ||
        (profileVersionRaw !== null &&
          (!Number.isInteger(profileVersionRaw) || profileVersionRaw < 1))
      ) {
        throw new GlobalObservationPilotError(
          500,
          "GLOBAL_RECOGNITION_CANDIDATE_ROW_INVALID",
          "Recognition candidate RPC returned an invalid or duplicate candidate.",
          { valueObjectId, canonicalKey, evidenceClass: evidenceClassRaw },
        );
      }

      ids.add(valueObjectId);
      canonicalKeys.add(canonicalKey);

      return {
        valueObjectId,
        canonicalKey,
        evidenceClass,
        profileVersion: profileVersionRaw,
        uncertaintyPolicyCode,
        selectionAllowed: isRecognitionCandidateSelectable(
          recognitionStatus,
          evidenceClass,
        ),
      };
    });

    interim.push({
      segment,
      recognitionStatus,
      recognitionCandidateCount: candidateCount,
      candidates,
    });
  }

  const allIds = [
    ...new Set(
      interim.flatMap((row) =>
        row.candidates.map((candidate) => candidate.valueObjectId),
      ),
    ),
  ];
  const detailsById = await loadCandidateDetails(allIds);

  return interim.map((row) => {
    const candidates = row.candidates.map((recognitionCandidate) => {
      const details = detailsById.get(recognitionCandidate.valueObjectId);

      if (
        !details ||
        details.canonicalKey !== recognitionCandidate.canonicalKey
      ) {
        throw new GlobalObservationPilotError(
          409,
          "GLOBAL_CANDIDATE_DETAIL_MISMATCH",
          "Recognition candidate no longer resolves to the same active global leaf.",
          {
            valueObjectId: recognitionCandidate.valueObjectId,
            canonicalKey: recognitionCandidate.canonicalKey,
          },
        );
      }

      return {
        ...details,
        recognitionEvidenceClass: recognitionCandidate.evidenceClass,
        recognitionProfileVersion: recognitionCandidate.profileVersion,
        recognitionUncertaintyPolicyCode:
          recognitionCandidate.uncertaintyPolicyCode,
        selectionAllowed: recognitionCandidate.selectionAllowed,
      } satisfies Candidate;
    });

    const selectionAllowed = candidates.some(
      (candidate) => candidate.selectionAllowed,
    );

    if (
      row.recognitionStatus === "CANDIDATES_READY" &&
      !selectionAllowed
    ) {
      throw new GlobalObservationPilotError(
        500,
        "GLOBAL_RECOGNITION_READY_WITHOUT_SELECTABLE_EVIDENCE",
        "Candidate RPC reported model-ready candidates without exact/strong selectable evidence.",
      );
    }

    return {
      segmentId: row.segment.segmentId,
      resolutionMode: "recognition_candidates",
      exactMatchKind:
        candidates.length === 1 &&
        candidates[0].recognitionEvidenceClass === "exact"
          ? "recognition_exact"
          : null,
      recognitionStatus: row.recognitionStatus,
      recognitionCandidateCount: row.recognitionCandidateCount,
      selectionAllowed,
      candidates,
    };
  });
}

async function reserveBudget(input: {
  appUserId: string;
  operationId: string;
  model: string;
  estimatedInputTokens: number;
  maxOutputTokens: number;
}): Promise<BudgetPreflight> {
  const { data, error } = await supabase.rpc(
    "preflight_ai_pilot_call_budget_v1",
    {
      p_app_user_id: input.appUserId,
      p_operation_id: input.operationId,
      p_tier_code: PILOT_MODEL_TIER,
      p_model_name: input.model,
      p_input_tokens: input.estimatedInputTokens,
      p_cached_input_tokens: 0,
      p_max_output_tokens: input.maxOutputTokens,
    },
  );

  if (error) {
    throw new GlobalObservationPilotError(
      500,
      "AI_BUDGET_PREFLIGHT_FAILED",
      error.message,
    );
  }

  const row = asRecord(data);

  if (!row) {
    throw new GlobalObservationPilotError(
      500,
      "AI_BUDGET_PREFLIGHT_SHAPE_INVALID",
      "AI budget preflight returned an invalid response.",
    );
  }

  const result: BudgetPreflight = {
    allowed: row.allowed === true,
    reason: asText(row.reason),
    operationId: asNullableText(row.operationId) ?? undefined,
    reservationId: asNullableText(row.reservationId) ?? undefined,
    priceSnapshotId: asNullableText(row.priceSnapshotId) ?? undefined,
    requestedCallMaxCostUsd:
      asFiniteNumber(row.requestedCallMaxCostUsd) ?? undefined,
    operationReservedMaxCostUsd:
      asFiniteNumber(row.operationReservedMaxCostUsd) ?? undefined,
    hardCapUsd: asFiniteNumber(row.hardCapUsd) ?? undefined,
    callIndex: asFiniteNumber(row.callIndex) ?? undefined,
  };

  if (!result.allowed) {
    const freshConfirmation =
      row.requiresFreshExplicitConfirmation === true;

    throw new GlobalObservationPilotError(
      result.reason === "HARD_COST_CAP_EXCEEDED" ? 409 : 422,
      `AI_BUDGET_BLOCKED_${result.reason || "UNKNOWN"}`,
      freshConfirmation
        ? "The requested test could exceed the USD 0.10 operation cap and requires fresh explicit confirmation."
        : "The OpenAI pilot budget guard blocked this provider call.",
      row,
    );
  }

  if (!result.reservationId || !result.priceSnapshotId) {
    throw new GlobalObservationPilotError(
      500,
      "AI_BUDGET_RESERVATION_INVALID",
      "Allowed AI budget preflight returned no reservation.",
    );
  }

  return result;
}

async function createUsageEvent(input: {
  appUserId: string;
  analysisExecutionId: string;
  operationId: string;
  stage: string;
  model: string;
  reservation: BudgetPreflight;
  estimatedInputTokens: number;
  maxOutputTokens: number;
}) {
  const { data, error } = await supabase
    .from("ai_usage_events")
    .insert({
      app_user_id: input.appUserId,
      analysis_execution_id: input.analysisExecutionId,
      selected_tier_code: PILOT_MODEL_TIER,
      model_name: input.model,
      provider: "openai",
      route_path: ROUTE_PATH,
      operation_kind: "semantic_intake",
      input_tokens: input.estimatedInputTokens,
      cached_input_tokens: 0,
      output_tokens: 0,
      total_tokens: input.estimatedInputTokens,
      status: "preflight_allowed",
      request_metadata: {
        contract: "GSR1F_GLOBAL_OBSERVATION_PREVIEW_V1",
        stage: input.stage,
        previewOnly: true,
        walletDebited: false,
        conservativeInputTokenUpperBound: input.estimatedInputTokens,
      },
      response_metadata: {},
      pilot_operation_id: input.operationId,
      pilot_budget_reservation_id: input.reservation.reservationId,
      estimated_provider_cost_usd:
        input.reservation.requestedCallMaxCostUsd ?? null,
      max_output_tokens: input.maxOutputTokens,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new GlobalObservationPilotError(
      500,
      "AI_USAGE_PREFLIGHT_LOG_FAILED",
      error?.message ?? "Failed to create AI usage event.",
    );
  }

  return data.id as string;
}

async function calculateActualProviderCostUsd(input: {
  priceSnapshotId: string;
  usage: RunAiJsonUsageMetadata;
}) {
  const { data, error } = await supabase
    .from("ai_model_price_snapshots")
    .select(
      "input_cost_per_1m_tokens, cached_input_cost_per_1m_tokens, output_cost_per_1m_tokens",
    )
    .eq("id", input.priceSnapshotId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const inputPrice = asFiniteNumber(data.input_cost_per_1m_tokens);
  const cachedPrice =
    asFiniteNumber(data.cached_input_cost_per_1m_tokens) ?? inputPrice;
  const outputPrice = asFiniteNumber(data.output_cost_per_1m_tokens);

  if (inputPrice === null || cachedPrice === null || outputPrice === null) {
    return null;
  }

  const cachedInput = Math.min(
    input.usage.inputTokens,
    input.usage.cachedInputTokens,
  );
  const uncachedInput = Math.max(0, input.usage.inputTokens - cachedInput);

  return (
    (uncachedInput * inputPrice +
      cachedInput * cachedPrice +
      input.usage.outputTokens * outputPrice) /
    1_000_000
  );
}

async function finalizeUsageEvent(input: {
  usageEventId: string;
  usage: RunAiJsonUsageMetadata;
  priceSnapshotId: string;
}) {
  const actualProviderCostUsd = await calculateActualProviderCostUsd({
    priceSnapshotId: input.priceSnapshotId,
    usage: input.usage,
  });

  const { error } = await supabase
    .from("ai_usage_events")
    .update({
      input_tokens: input.usage.inputTokens,
      cached_input_tokens: input.usage.cachedInputTokens,
      output_tokens: input.usage.outputTokens,
      total_tokens: input.usage.totalTokens,
      actual_provider_cost_usd: actualProviderCostUsd,
      status: "openai_completed",
      openai_response_id: input.usage.responseId,
      response_metadata: {
        contract: "GSR1F_GLOBAL_OBSERVATION_PREVIEW_V1",
        rawUsage: input.usage.rawUsage,
      },
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.usageEventId);

  return {
    actualProviderCostUsd,
    warning: error ? `AI usage finalization failed: ${error.message}` : null,
  };
}

async function markUsageFailed(input: {
  usageEventId: string;
  error: unknown;
}) {
  await supabase
    .from("ai_usage_events")
    .update({
      status: "openai_failed",
      error_code:
        input.error instanceof Error ? input.error.name : "OPENAI_CALL_FAILED",
      error_message: "OpenAI provider call failed; raw provider output is not stored in this field.",
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.usageEventId);
}

async function runBudgetedJsonCall<T>(input: {
  appUserId: string;
  analysisExecutionId: string;
  operationId: string;
  stage: string;
  stageSequence: number;
  protocolCode: string;
  protocolVersion: string;
  model: string;
  system: string;
  user: unknown;
  schemaName: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
  retrievalSnapshot: JsonRecord;
  instructionRefs: unknown[];
  contextMetadata?: JsonRecord;
  signal: AbortSignal;
}): Promise<BudgetedCallResult<T>> {
  const estimatedInputTokens = estimateInputTokensUpperBound({
    system: input.system,
    user: input.user,
    schema: input.schema,
  });

  if (estimatedInputTokens > PILOT_INPUT_TOKEN_CEILING) {
    throw new GlobalObservationPilotError(
      422,
      "PILOT_INPUT_TOKEN_LIMIT_LOCAL",
      "The conservative request envelope exceeds the 20,000-token pilot limit.",
      {
        estimatedInputTokens,
        maxInputTokens: PILOT_INPUT_TOKEN_CEILING,
      },
    );
  }

  const reservation = await reserveBudget({
    appUserId: input.appUserId,
    operationId: input.operationId,
    model: input.model,
    estimatedInputTokens,
    maxOutputTokens: input.maxOutputTokens,
  });

  const usageEventId = await createUsageEvent({
    appUserId: input.appUserId,
    analysisExecutionId: input.analysisExecutionId,
    operationId: input.operationId,
    stage: input.stage,
    model: input.model,
    reservation,
    estimatedInputTokens,
    maxOutputTokens: input.maxOutputTokens,
  });

  let contextManifestId: string;

  try {
    contextManifestId = await createAiContextManifest({
      analysisExecutionId: input.analysisExecutionId,
      stageCode: input.stage,
      stageSequence: input.stageSequence,
      aiUsageEventId: usageEventId,
      protocolCode: input.protocolCode,
      protocolVersion: input.protocolVersion,
      schemaName: input.schemaName,
      schemaVersion: "v2",
      schema: input.schema,
      systemPrompt: input.system,
      requestPayload: input.user,
      provider: "openai",
      modelName: input.model,
      modelTier: PILOT_MODEL_TIER,
      storeProviderState: false,
      maxRetries: 0,
      maxOutputTokens: input.maxOutputTokens,
      instructionRefs: input.instructionRefs,
      retrievalSnapshot: input.retrievalSnapshot,
      toolPermissions: [],
      modelConfig: {
        reasoningEffort: "none",
        requestTimeoutMs: PROVIDER_CALL_TIMEOUT_MS,
        outputTokenCeiling: PILOT_OUTPUT_TOKEN_CEILING,
      },
      contextMetadata: input.contextMetadata,
    });
  } catch (error) {
    await markUsageFailed({ usageEventId, error });
    throw error;
  }

  try {
    const result = await runAiJsonWithUsageMetadata<T>({
      system: input.system,
      user: input.user,
      model: input.model,
      maxOutputTokens: input.maxOutputTokens,
      outputTokenCeiling: PILOT_OUTPUT_TOKEN_CEILING,
      structuredOutput: {
        name: input.schemaName,
        schema: input.schema,
        strict: true,
      },
      requestTimeoutMs: PROVIDER_CALL_TIMEOUT_MS,
      maxRetries: 0,
      signal: input.signal,
      store: false,
      reasoningEffort: "none",
    });

    await markAiContextManifestProviderCompleted(
      contextManifestId,
      result.outputText,
    );

    const finalized = await finalizeUsageEvent({
      usageEventId,
      usage: result.usage,
      priceSnapshotId: reservation.priceSnapshotId!,
    });

    return {
      parsed: result.parsed,
      outputText: result.outputText,
      usage: result.usage,
      contextManifestId,
      reservedMaxCostUsd: reservation.requestedCallMaxCostUsd ?? 0,
      operationReservedMaxCostUsd:
        reservation.operationReservedMaxCostUsd ?? 0,
      actualProviderCostUsd: finalized.actualProviderCostUsd,
      usageLogWarning: finalized.warning,
    };
  } catch (error) {
    await markAiContextManifestFailed(contextManifestId, error);
    await markUsageFailed({ usageEventId, error });
    throw error;
  }
}

function isTemporalClockMisclassifiedAsDuration(input: {
  parameterCode: string;
  rawFragment: string;
  segment: RoutingSegment;
  locale: string;
}) {
  if (
    input.parameterCode !== "duration" ||
    input.locale !== "ru" ||
    !input.rawFragment ||
    !input.segment.occurredAtRaw
  ) {
    return false;
  }

  const raw = input.rawFragment.toLocaleLowerCase().replaceAll("ё", "е");
  const temporal = input.segment.occurredAtRaw
    .toLocaleLowerCase()
    .replaceAll("ё", "е");

  const overlapsTemporalEvidence =
    temporal.includes(raw) || raw.includes(temporal);

  if (!overlapsTemporalEvidence) {
    return false;
  }

  const hasExplicitDurationUnit =
    /(секунд[а-я]*|минут[а-я]*|час(?:а|ов)?)/iu.test(raw);

  if (hasExplicitDurationUnit) {
    return false;
  }

  return /(сегодня|вчера|позавчера|утра|дня|вечера|ночи|около)/iu.test(raw);
}

function validateSelectionOutput(input: {
  output: unknown;
  segments: RoutingSegment[];
  groups: CandidateGroup[];
  locale: string;
}) {
  const outputRecord = asRecord(input.output);
  const rawSelections = asArray(outputRecord?.selections);

  if (rawSelections.length !== input.segments.length) {
    throw new GlobalObservationPilotError(
      502,
      "AI_SELECTION_COUNT_INVALID",
      "AI selection must return exactly one row per routed segment.",
    );
  }

  const segmentById = new Map(
    input.segments.map((segment) => [segment.segmentId, segment]),
  );
  const groupById = new Map(
    input.groups.map((group) => [group.segmentId, group]),
  );
  const seen = new Set<string>();

  return rawSelections.map((rawSelection) => {
    const row = asRecord(rawSelection);

    if (!row) {
      throw new GlobalObservationPilotError(
        502,
        "AI_SELECTION_ROW_INVALID",
        "AI selection returned a non-object row.",
      );
    }

    const selectionKey = asText(row.selectionKey);
    const confidence = asFiniteNumber(row.confidence);
    const separatorIndex = selectionKey.indexOf("::");
    const segmentId =
      separatorIndex > 0 ? selectionKey.slice(0, separatorIndex) : "";
    const selectedCanonicalKey =
      separatorIndex > 0 ? selectionKey.slice(separatorIndex + 2) : "";
    const segment = segmentById.get(segmentId);
    const group = groupById.get(segmentId);

    if (
      !segment ||
      !group ||
      seen.has(segmentId) ||
      confidence === null ||
      confidence < 0 ||
      confidence > 1
    ) {
      throw new GlobalObservationPilotError(
        502,
        "AI_SELECTION_ROW_CONTRACT_FAILED",
        "AI selection row failed deterministic server validation.",
        { selectionKey, segmentId },
      );
    }

    seen.add(segmentId);

    if (selectedCanonicalKey === "__NONE__") {
      if (asArray(row.facts).length > 0) {
        throw new GlobalObservationPilotError(
          502,
          "AI_SELECTION_FACT_WITHOUT_TARGET",
          "AI returned facts without a selected semantic leaf.",
          { selectionKey, segmentId },
        );
      }

      return {
        segmentId,
        sourceFragment: segment.sourceFragment,
        selected: null,
        confidence,
        facts: [],
        temporal: {
          occurredAtIso: segment.occurredAtIso,
          occurredAtRaw: segment.occurredAtRaw,
          temporalPrecision: segment.temporalPrecision,
        },
      };
    }

    if (!group.selectionAllowed) {
      throw new GlobalObservationPilotError(
        502,
        "AI_SELECTION_UNRESOLVED_GROUP_BYPASS_BLOCKED",
        "AI attempted to select a semantic leaf from an unresolved recognition group.",
        {
          selectionKey,
          segmentId,
          recognitionStatus: group.recognitionStatus,
        },
      );
    }

    const candidate = group.candidates.find(
      (item) => item.canonicalKey === selectedCanonicalKey,
    );

    if (!candidate || !candidate.selectionAllowed) {
      throw new GlobalObservationPilotError(
        502,
        "AI_SELECTION_KEY_CONTRACT_FAILED",
        "selectionKey did not resolve to a server-selectable candidate inside its segment.",
        { selectionKey, segmentId, selectedCanonicalKey },
      );
    }

    const canonicalKey = candidate.canonicalKey;

    const parameterByCode = new Map(
      candidate.parameters.map((parameter) => [
        parameter.parameterCode,
        parameter,
      ]),
    );

    let facts = asArray(row.facts)
      .filter((rawFact) => {
        const fact = asRecord(rawFact);

        if (!fact) {
          return true;
        }

        return !isTemporalClockMisclassifiedAsDuration({
          parameterCode: asText(fact.parameterCode),
          rawFragment: asText(fact.rawFragment),
          segment,
          locale: input.locale,
        });
      })
      .map((rawFact) => {
      const fact = asRecord(rawFact);

      if (!fact) {
        throw new GlobalObservationPilotError(
          502,
          "AI_FACT_ROW_INVALID",
          "AI returned a non-object fact.",
        );
      }

      const parameterCode = asText(fact.parameterCode);
      const unit = asText(fact.unit);
      const valueType = asText(fact.valueType);
      const rawFragment = asText(fact.rawFragment);
      const contract = parameterByCode.get(parameterCode);

      if (
        !contract ||
        !contract.allowedUnitCodes.includes(unit) ||
        !rawFragment ||
        !containsFragment(segment.sourceFragment, rawFragment)
      ) {
        throw new GlobalObservationPilotError(
          502,
          "AI_FACT_PARAMETER_OR_EVIDENCE_INVALID",
          "AI fact was outside the candidate parameter contract or lacked source evidence.",
          { segmentId, canonicalKey, parameterCode, unit },
        );
      }

      const valueNumeric = asFiniteNumber(fact.valueNumeric);
      const valueText = asNullableText(fact.valueText);
      const valueBoolean = asBoolean(fact.valueBoolean);

      const populated =
        (valueNumeric !== null ? 1 : 0) +
        (valueText !== null ? 1 : 0) +
        (valueBoolean !== null ? 1 : 0);

      if (
        populated !== 1 ||
        !["numeric", "text", "boolean"].includes(valueType) ||
        valueType !== contract.valueTypeCode ||
        (valueType === "numeric" && valueNumeric === null) ||
        (valueType === "text" && valueText === null) ||
        (valueType === "boolean" && valueBoolean === null)
      ) {
        throw new GlobalObservationPilotError(
          502,
          "AI_FACT_VALUE_CONTRACT_INVALID",
          "AI fact value failed the system parameter contract.",
          { segmentId, canonicalKey, parameterCode },
        );
      }

      return {
        parameterCode,
        unit,
        valueType,
        valueNumeric,
        valueText,
        valueBoolean,
        rawFragment,
        valueOriginCode: "user_explicit",
        sourceReliabilityCode: "user_reported",
        factStatus: "proposed",
      };
    });

    const mealLabelContract = parameterByCode.get("meal_label");
    const explicitMealLabel =
      candidate.canonicalKey === "process.nutrition.meal"
        ? extractExplicitMealLabel({
            sourceFragment: segment.sourceFragment,
            locale: input.locale,
          })
        : null;

    if (
      explicitMealLabel &&
      mealLabelContract?.valueTypeCode === "text" &&
      mealLabelContract.allowedUnitCodes.length > 0
    ) {
      const canonicalMealLabelFact = {
        parameterCode: "meal_label",
        unit: mealLabelContract.allowedUnitCodes[0],
        valueType: "text" as const,
        valueNumeric: null,
        valueText: explicitMealLabel.label,
        valueBoolean: null,
        rawFragment: explicitMealLabel.rawFragment,
        valueOriginCode: "user_explicit",
        sourceReliabilityCode: "user_reported",
        factStatus: "proposed",
      };

      facts = [
        ...facts.filter((fact) => fact.parameterCode !== "meal_label"),
        canonicalMealLabelFact,
      ];
    }

    return {
      segmentId,
      sourceFragment: segment.sourceFragment,
      selected: {
        valueObjectId: candidate.valueObjectId,
        canonicalKey: candidate.canonicalKey,
        title: candidate.title,
        facetCode: candidate.facetCode,
        objectKindCode: candidate.objectKindCode,
        semanticMatchMethodCode:
          candidate.recognitionEvidenceClass === "exact"
            ? "recognition_exact"
            : "ai_candidate",
      },
      confidence,
      facts,
      temporal: {
        occurredAtIso: segment.occurredAtIso,
        occurredAtRaw: segment.occurredAtRaw,
        temporalPrecision: segment.temporalPrecision,
      },
    };
  });
}

type SemanticProjectionTarget = {
  id: string;
  canonical_key: string;
  title: string;
  ontology_node_role_code: string;
  facet_code: string;
};

const SEMANTIC_PROJECTION_TARGET_NODE_ROLE_BY_KEY = new Map<string, string>([
  ["entity.food.item", "leaf"],
  ["domain.nutrition_consumption", "root"],
  ["process.home.household_task", "leaf"],
  ["domain.relationships_social_life", "root"],
]);

async function loadSemanticProjectionTargets(canonicalKeys: string[]) {
  const uniqueKeys = [...new Set(canonicalKeys.filter(Boolean))].sort();

  if (uniqueKeys.length === 0) {
    return new Map<string, SemanticProjectionTarget>();
  }

  const unexpectedKeys = uniqueKeys.filter(
    (canonicalKey) =>
      !SEMANTIC_PROJECTION_TARGET_NODE_ROLE_BY_KEY.has(canonicalKey),
  );

  if (unexpectedKeys.length > 0) {
    throw new GlobalObservationPilotError(
      500,
      "SEMANTIC_PROJECTION_TARGET_NOT_ALLOWLISTED",
      `Semantic projection target is not allowlisted: ${unexpectedKeys.join(", ")}.`,
      { unexpectedCanonicalKeys: unexpectedKeys },
    );
  }

  const { data, error } = await supabase
    .from("value_objects")
    .select("id, canonical_key, title, ontology_node_role_code, facet_code")
    .eq("scope_code", "global")
    .eq("status", "active")
    .in("canonical_key", uniqueKeys);

  if (error) {
    throw new GlobalObservationPilotError(
      500,
      "SEMANTIC_PROJECTION_TARGET_READ_FAILED",
      error.message,
    );
  }

  const rows = (data ?? []) as SemanticProjectionTarget[];
  const byKey = new Map(rows.map((row) => [row.canonical_key, row]));
  const missing = uniqueKeys.filter((canonicalKey) => !byKey.has(canonicalKey));

  if (missing.length > 0) {
    throw new GlobalObservationPilotError(
      409,
      "SEMANTIC_PROJECTION_TARGET_CONTRACT_FAILED",
      `Active global semantic projection targets are missing: ${missing.join(", ")}.`,
      { missingCanonicalKeys: missing },
    );
  }

  const roleMismatches = rows
    .filter(
      (row) =>
        SEMANTIC_PROJECTION_TARGET_NODE_ROLE_BY_KEY.get(row.canonical_key) !==
        row.ontology_node_role_code,
    )
    .map((row) => ({
      canonicalKey: row.canonical_key,
      expectedNodeRoleCode:
        SEMANTIC_PROJECTION_TARGET_NODE_ROLE_BY_KEY.get(row.canonical_key),
      actualNodeRoleCode: row.ontology_node_role_code,
    }));

  if (roleMismatches.length > 0) {
    throw new GlobalObservationPilotError(
      409,
      "SEMANTIC_PROJECTION_TARGET_ROLE_CONTRACT_FAILED",
      "Semantic projection target node-role contract failed.",
      { roleMismatches },
    );
  }

  return byKey;
}

export async function runGlobalObservationPreview(
  request: GlobalObservationPreviewRequest,
) {
  if (process.env.GSR1_OPENAI_PILOT_ENABLED === "false") {
    throw new GlobalObservationPilotError(
      503,
      "GSR1_OPENAI_PILOT_DISABLED",
      "Full Global Reality analysis is disabled by the emergency server switch.",
    );
  }

  const inputText = request.inputText.trim();

  if (!inputText || inputText.length > MAX_INPUT_TEXT_CHARS) {
    throw new GlobalObservationPilotError(
      400,
      "PILOT_INPUT_TEXT_INVALID",
      `inputText must contain 1-${MAX_INPUT_TEXT_CHARS} characters.`,
    );
  }

  const locale = asText(request.locale).toLowerCase() || "ru";

  if (!SUPPORTED_LOCALES.has(locale)) {
    throw new GlobalObservationPilotError(
      400,
      "PILOT_LOCALE_INVALID",
      "Unsupported pilot locale.",
    );
  }

  const timeZone = asText(request.timeZone) || "UTC";

  if (!isValidTimeZone(timeZone)) {
    throw new GlobalObservationPilotError(
      400,
      "PILOT_TIME_ZONE_INVALID",
      "Invalid IANA time zone.",
    );
  }

  const model = await getNanoPilotModel();
  const catalog = await loadDomainFacetCatalog();
  const reportedAt = new Date();
  const analysisExecutionId = await createAiAnalysisExecution({
    appUserId: request.appUserId,
    actorId: request.actorId,
    externalOperationId: request.operationId,
    surfaceCode: "global_observation_preview",
    operationKind: "activity_semantic_intake",
    localeCode: locale,
    timeZone,
    inputText,
    metadata: {
      contractVersion: "GSR1F_GLOBAL_OBSERVATION_PREVIEW_V1",
      previewOnly: true,
      dbFactWriteExecuted: false,
    },
  });

  const controller = new AbortController();
  const deadlineTimer = setTimeout(
    () => controller.abort(new Error("GSR1 operation deadline exceeded.")),
    OPERATION_DEADLINE_MS,
  );

  try {
    const domainFacetRouteOptions = getDomainFacetRouteOptions(catalog);
    const routingSchema = getRoutingSchema(catalog);

    const routingSystem = [
      "You are ARCTor Global System Reality routing stage 1.",
      "Split the user text into independent observed events/states only.",
      `Return 1-${MAX_SEGMENTS} segments.`,
      "A simple clause with one observed predicate/event/state MUST remain one segment.",
      "A duration, count, load, quantity, unit, or other measurement that describes an event MUST stay inside that event segment; NEVER create a separate segment only for the measurement.",
      "A date, relative day, clock time, or daypart that qualifies the same event/state/resource is temporal metadata for that segment; NEVER split it into a separate segment.",
      "An explicit amount of free/available time is a resource CONTEXT observation (context.resources.available_time), not leisure activity and not a Time DOMAIN.",
      "sourceFragment MUST be an exact substring of the user text and must contain the semantic event/state evidence, not only a number or unit.",
      "lookupText is a short semantic noun/activity phrase suitable for exact alias lookup.",
      "Choose domainFacetKey ONLY from the supplied live DOMAIN/FACET route options as a non-authoritative routing hint. The server recognition layer performs final global candidate retrieval and is not constrained to this hint.",
      "Do not invent a new ontology object.",
      "Do not diagnose.",
      "Do not infer calories, caffeine, physiological effects, hidden metrics, or causal relations.",
      "Temporal rule: occurredAt is not reportedAt.",
      "If the text contains an explicit relative/date/time/daypart expression, put that exact expression in occurredAtRaw. For relative expressions such as today/yesterday, leave occurredAtIso null; the server resolves supported local-time phrases deterministically from occurredAtRaw and the supplied timezone.",
      "A daypart without an explicit clock time is a temporal window, not a made-up hour. Never convert 'вечером' into 18:00 or another invented clock time.",
      "If no temporal expression is stated, return occurredAtRaw=null, occurredAtIso=null, temporalPrecision=unknown.",
      "Never turn temporal adjacency into causality.",
    ].join("\n");

    const routingUser = {
      inputText,
      reportedAt: reportedAt.toISOString(),
      timeZone,
      locale,
      domainFacetCatalog: domainFacetRouteOptions,
    };

    const routingCall = await runBudgetedJsonCall<RoutingOutput>({
      appUserId: request.appUserId,
      analysisExecutionId,
      operationId: request.operationId,
      stage: "domain_facet_routing",
      stageSequence: 1,
      protocolCode: "GSR1F_GLOBAL_OBSERVATION_PREVIEW",
      protocolVersion: "v1",
      model,
      system: routingSystem,
      user: routingUser,
      schemaName: "arctor_gsr1_routing_v2",
      schema: routingSchema,
      maxOutputTokens: ROUTING_MAX_OUTPUT_TOKENS,
      retrievalSnapshot: {
        ontologyScope: "global_system",
        domainFacetOptions: domainFacetRouteOptions.map((option) => ({
          domainFacetKey: option.domainFacetKey,
          rootCanonicalKey: option.rootCanonicalKey,
          facetCode: option.facetCode,
        })),
      },
      instructionRefs: [
        {
          kind: "embedded_runtime_instruction",
          code: "GSR1_ROUTING_STAGE1",
          version: "v2",
        },
      ],
      contextMetadata: {
        operationalInstructionLayerApplied: false,
        rawInputPersistedInManifest: false,
      },
      signal: controller.signal,
    });

    let aiSegments: RoutingSegment[];
    let segments: RoutingSegment[];

    try {
      aiSegments = validateRoutingOutput({
        output: routingCall.parsed,
        sourceText: inputText,
        catalog,
        reportedAt,
        locale,
        timeZone,
      });

      segments =
        buildDeterministicRussianAvailableTimeSegment({
          sourceText: inputText,
          locale,
          existingSegments: aiSegments,
        }) ?? aiSegments;

      await markAiContextManifestValidated(routingCall.contextManifestId, {
        passed: true,
        validator: "validateRoutingOutput",
        segmentCount: segments.length,
        deterministicAvailableTimeOverrideApplied: segments !== aiSegments,
      });
    } catch (error) {
      await markAiContextManifestFailed(routingCall.contextManifestId, error);
      throw error;
    }

    const candidateGroups = await buildCandidateGroups(segments, locale);

    const selectionSchema = getSelectionSchema(candidateGroups);
    const selectionSystem = [
      "You are ARCTor Global System Reality routing stage 2.",
      "For every segment return exactly one selection row.",
      "Choose selectionKey ONLY from the schema enum. Each key already binds one segment to one server-selectable candidate or __NONE__.",
      "If a candidate group has selectionAllowed=false, you MUST choose that segment's __NONE__ key and return zero facts for it.",
      "Supporting-only recognition evidence is never sufficient for semantic selection in this stage.",
      "Never move a candidate across segments and never output an ontology object not supplied by the server.",
      "For facts use ONLY parameterCode and unit pairs supplied for the selected candidate.",
      "Extract values ONLY when explicitly stated by the user in sourceFragment.",
      "A clock time is occurrence metadata, NEVER elapsed duration. For example 'около девяти вечера' means occurred-at about 21:00, not duration=9 hours.",
      "Lexical meal categories such as breakfast/lunch/dinner may be normalized only when directly expressed by the source wording; this is normalization, not inference.",
      "rawFragment MUST be an exact substring that contains the evidence for the value.",
      "Do not estimate or infer calories, caffeine amount, diagnosis, physical harm, mood effects, causal effects, or any unstated number.",
      "If a value is not explicitly stated, omit that fact.",
      "Do not create scientific or causal relations.",
    ].join("\n");

    const selectionUser = {
      locale,
      timeZone,
      reportedAt: reportedAt.toISOString(),
      segments,
      candidateGroups,
    };

    const selectionCall = await runBudgetedJsonCall<SelectionOutput>({
      appUserId: request.appUserId,
      analysisExecutionId,
      operationId: request.operationId,
      stage: "leaf_parameter_selection",
      stageSequence: 2,
      protocolCode: "GSR1F_GLOBAL_OBSERVATION_PREVIEW",
      protocolVersion: "v1",
      model,
      system: selectionSystem,
      user: selectionUser,
      schemaName: "arctor_gsr1_leaf_parameter_selection_v2",
      schema: selectionSchema,
      maxOutputTokens: SELECTION_MAX_OUTPUT_TOKENS,
      retrievalSnapshot: {
        ontologyScope: "global_system",
        candidateGroups: candidateGroups.map((group) => ({
          segmentId: group.segmentId,
          resolutionMode: group.resolutionMode,
          recognitionContractVersion:
            RECOGNITION_CANDIDATE_CONTRACT_VERSION,
          recognitionStatus: group.recognitionStatus,
          recognitionCandidateCount: group.recognitionCandidateCount,
          selectionAllowed: group.selectionAllowed,
          candidates: group.candidates.map((candidate) => ({
            valueObjectId: candidate.valueObjectId,
            canonicalKey: candidate.canonicalKey,
            facetCode: candidate.facetCode,
            objectKindCode: candidate.objectKindCode,
            recognitionEvidenceClass:
              candidate.recognitionEvidenceClass,
            recognitionProfileVersion:
              candidate.recognitionProfileVersion,
            selectionAllowed: candidate.selectionAllowed,
            allowedParameterCodes: candidate.parameters.map(
              (parameter) => parameter.parameterCode,
            ),
          })),
        })),
      },
      instructionRefs: [
        {
          kind: "embedded_runtime_instruction",
          code: "GSR1_ROUTING_STAGE2",
          version: "v2",
        },
      ],
      contextMetadata: {
        operationalInstructionLayerApplied: false,
        rawInputPersistedInManifest: false,
      },
      signal: controller.signal,
    });

    let previewRows: ReturnType<typeof validateSelectionOutput>;

    try {
      previewRows = validateSelectionOutput({
        output: selectionCall.parsed,
        segments,
        groups: candidateGroups,
        locale,
      });

      await markAiContextManifestValidated(selectionCall.contextManifestId, {
        passed: true,
        validator: "validateSelectionOutput",
        rowCount: previewRows.length,
      });
    } catch (error) {
      await markAiContextManifestFailed(selectionCall.contextManifestId, error);
      throw error;
    }

    const previewRowsWithProjectionCandidates = previewRows.map((row) => ({
      ...row,
      semanticProjections: buildSemanticProjections({
        selectedCanonicalKey: row.selected?.canonicalKey ?? null,
        sourceFragment: row.sourceFragment,
        contextText: inputText,
        locale,
      }),
    }));

    const projectionTargetByCanonicalKey = await loadSemanticProjectionTargets(
      previewRowsWithProjectionCandidates.flatMap((row) =>
        row.semanticProjections.map((projection) => projection.targetCanonicalKey),
      ),
    );

    const previewRowsWithSemanticProjections =
      previewRowsWithProjectionCandidates.map((row) => ({
        ...row,
        semanticProjections: row.semanticProjections.map((projection) => {
          const target = projectionTargetByCanonicalKey.get(
            projection.targetCanonicalKey,
          );

          if (!target) {
            throw new GlobalObservationPilotError(
              409,
              "SEMANTIC_PROJECTION_TARGET_MISSING",
              `Semantic projection target is unavailable: ${projection.targetCanonicalKey}.`,
            );
          }

          return {
            ...projection,
            targetValueObjectId: target.id,
            targetTitle: target.title,
            targetNodeRoleCode: target.ontology_node_role_code,
            targetFacetCode: target.facet_code,
          };
        }),
      }));

    await completeAiAnalysisExecution(analysisExecutionId);

    const reservedMaxUsd = Math.max(
      routingCall.operationReservedMaxCostUsd,
      selectionCall.operationReservedMaxCostUsd,
    );
    const actualKnownCosts = [
      routingCall.actualProviderCostUsd,
      selectionCall.actualProviderCostUsd,
    ].filter((value): value is number => value !== null);

    return {
      ok: true,
      contractVersion: "GSR1F_GLOBAL_OBSERVATION_PREVIEW_V1",
      previewOnly: true,
      dbFactWriteExecuted: false,
      operationId: request.operationId,
      analysisExecutionId,
      actorId: request.actorId,
      modelTier: PILOT_MODEL_TIER,
      model,
      reportedAt: reportedAt.toISOString(),
      timeZone,
      locale,
      analysisTrace: {
        semanticProjectionPolicy: {
          contractVersion: SEMANTIC_PROJECTION_CONTRACT_VERSION,
          deterministic: true,
          previewOnly: true,
          realityGraphWriteExecuted: false,
        },
        routing: segments.map((segment) => ({
          segmentId: segment.segmentId,
          sourceFragment: segment.sourceFragment,
          lookupText: segment.lookupText,
          rootCanonicalKey: segment.rootCanonicalKey,
          facetCode: segment.facetCode,
          occurredAtIso: segment.occurredAtIso,
          occurredAtRaw: segment.occurredAtRaw,
          temporalPrecision: segment.temporalPrecision,
        })),
        candidateGroups: candidateGroups.map((group) => ({
          segmentId: group.segmentId,
          resolutionMode: group.resolutionMode,
          recognitionStatus: group.recognitionStatus,
          recognitionCandidateCount: group.recognitionCandidateCount,
          selectionAllowed: group.selectionAllowed,
          candidates: group.candidates.map((candidate) => ({
            canonicalKey: candidate.canonicalKey,
            title: candidate.title,
            description: candidate.description,
            facetCode: candidate.facetCode,
            objectKindCode: candidate.objectKindCode,
            recognitionEvidenceClass:
              candidate.recognitionEvidenceClass,
            recognitionProfileVersion:
              candidate.recognitionProfileVersion,
            selectionAllowed: candidate.selectionAllowed,
            allowedParameterCodes: candidate.parameters.map(
              (parameter) => parameter.parameterCode,
            ),
          })),
        })),
      },
      rows: previewRowsWithSemanticProjections,
      safety: {
        hardCapUsd: HARD_CAP_USD,
        maxProviderCallsConfigured: MAX_PROVIDER_CALLS,
        providerCallsUsed: 2,
        automaticProviderRetries: 0,
        operationDeadlineMs: OPERATION_DEADLINE_MS,
        providerCallTimeoutMs: PROVIDER_CALL_TIMEOUT_MS,
        maxInputTokensPerCall: PILOT_INPUT_TOKEN_CEILING,
        maxOutputTokensPerCall: PILOT_OUTPUT_TOKEN_CEILING,
        reservedMaximumProviderCostUsd: reservedMaxUsd,
        actualProviderCostUsd:
          actualKnownCosts.length === 2
            ? actualKnownCosts.reduce((sum, value) => sum + value, 0)
            : null,
      },
      warnings: [
        routingCall.usageLogWarning,
        selectionCall.usageLogWarning,
      ].filter((value): value is string => Boolean(value)),
    };
  } catch (error) {
    await failAiAnalysisExecution(analysisExecutionId, error);
    throw error;
  } finally {
    clearTimeout(deadlineTimer);
  }
}
