import { Buffer } from "node:buffer";

import {
  runAiJsonWithUsageMetadata,
  type RunAiJsonUsageMetadata,
} from "../ai/openaiClient";
import { supabase } from "../supabase";

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

type Candidate = {
  valueObjectId: string;
  canonicalKey: string;
  title: string;
  description: string | null;
  facetCode: string;
  objectKindCode: string | null;
  parameters: ParameterContract[];
};

type CandidateGroup = {
  segmentId: string;
  resolutionMode: "exact" | "bounded_candidates";
  exactMatchKind: string | null;
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
  segmentId: string;
  canonicalKey: string | null;
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
  usage: RunAiJsonUsageMetadata;
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
              enum: ["exact", "approximate", "date_only", "unknown"],
            },
          },
        },
      },
    },
  };
}

function getSelectionSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["selections"],
    properties: {
      selections: {
        type: "array",
        minItems: 1,
        maxItems: MAX_SEGMENTS,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["segmentId", "canonicalKey", "confidence", "facts"],
          properties: {
            segmentId: { type: "string" },
            canonicalKey: { type: ["string", "null"] },
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
    const occurredAtIso = asNullableText(row.occurredAtIso);
    const occurredAtRaw = asNullableText(row.occurredAtRaw);
    const temporalPrecision = asText(row.temporalPrecision);

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
      } satisfies Candidate,
    ]),
  );
}

async function buildCandidateGroups(
  segments: RoutingSegment[],
  locale: string,
): Promise<CandidateGroup[]> {
  const interim: Array<{
    segment: RoutingSegment;
    resolutionMode: "exact" | "bounded_candidates";
    exactMatchKind: string | null;
    candidateIds: string[];
  }> = [];

  for (const segment of segments) {
    const { data: exactData, error: exactError } = await supabase.rpc(
      "recognize_global_value_object_text_v1",
      {
        p_query_text: segment.lookupText,
        p_locale: locale,
        p_root_canonical_key: segment.rootCanonicalKey,
        p_facet_code: segment.facetCode,
        p_limit: 12,
      },
    );

    if (exactError) {
      throw new GlobalObservationPilotError(
        500,
        "GLOBAL_EXACT_RECOGNITION_FAILED",
        exactError.message,
      );
    }

    const exactRecord = asRecord(exactData);
    const exactCandidates = asArray(exactRecord?.candidates)
      .map(asRecord)
      .filter((row): row is JsonRecord => Boolean(row));

    if (asFiniteNumber(exactRecord?.exactMatchCount) === 1) {
      const winner = exactCandidates[0];
      const valueObjectId = asText(winner?.valueObjectId);

      if (!valueObjectId) {
        throw new GlobalObservationPilotError(
          500,
          "GLOBAL_EXACT_RECOGNITION_SHAPE_INVALID",
          "Exact recognition returned no Value Object id.",
        );
      }

      interim.push({
        segment,
        resolutionMode: "exact",
        exactMatchKind: asNullableText(winner?.matchKind),
        candidateIds: [valueObjectId],
      });
      continue;
    }

    const { data: boundedData, error: boundedError } = await supabase.rpc(
      "get_global_value_object_leaf_candidates_v1",
      {
        p_root_canonical_key: segment.rootCanonicalKey,
        p_facet_code: segment.facetCode,
        p_limit: 12,
      },
    );

    if (boundedError) {
      throw new GlobalObservationPilotError(
        500,
        "GLOBAL_BOUNDED_CANDIDATES_FAILED",
        boundedError.message,
      );
    }

    const boundedRecord = asRecord(boundedData);
    const boundedCandidates = asArray(boundedRecord?.candidates)
      .map(asRecord)
      .filter((row): row is JsonRecord => Boolean(row));

    const candidateCount = asFiniteNumber(boundedRecord?.candidateCount);

    if (
      candidateCount === null ||
      candidateCount > 10 ||
      boundedCandidates.length > 10
    ) {
      throw new GlobalObservationPilotError(
        409,
        "GLOBAL_CANDIDATE_BOUND_VIOLATED",
        "DOMAIN/FACET candidate bound exceeded 10.",
      );
    }

    interim.push({
      segment,
      resolutionMode: "bounded_candidates",
      exactMatchKind: null,
      candidateIds: boundedCandidates.map((row) => asText(row.valueObjectId)).filter(Boolean),
    });
  }

  const allIds = [
    ...new Set(interim.flatMap((row) => row.candidateIds)),
  ];
  const detailsById = await loadCandidateDetails(allIds);

  return interim.map((row) => {
    const candidates = row.candidateIds
      .map((id) => detailsById.get(id))
      .filter((candidate): candidate is Candidate => Boolean(candidate));

    if (candidates.length !== row.candidateIds.length) {
      throw new GlobalObservationPilotError(
        409,
        "GLOBAL_CANDIDATE_DETAIL_MISMATCH",
        "One or more candidate Value Objects are no longer active leaves.",
      );
    }

    return {
      segmentId: row.segment.segmentId,
      resolutionMode: row.resolutionMode,
      exactMatchKind: row.exactMatchKind,
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
  const errorMessage =
    input.error instanceof Error ? input.error.message : String(input.error);

  await supabase
    .from("ai_usage_events")
    .update({
      status: "openai_failed",
      error_code:
        input.error instanceof Error ? input.error.name : "OPENAI_CALL_FAILED",
      error_message: errorMessage.slice(0, 2_000),
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.usageEventId);
}

async function runBudgetedJsonCall<T>(input: {
  appUserId: string;
  operationId: string;
  stage: string;
  model: string;
  system: string;
  user: unknown;
  schemaName: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
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
    operationId: input.operationId,
    stage: input.stage,
    model: input.model,
    reservation,
    estimatedInputTokens,
    maxOutputTokens: input.maxOutputTokens,
  });

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

    const finalized = await finalizeUsageEvent({
      usageEventId,
      usage: result.usage,
      priceSnapshotId: reservation.priceSnapshotId!,
    });

    return {
      parsed: result.parsed,
      usage: result.usage,
      reservedMaxCostUsd: reservation.requestedCallMaxCostUsd ?? 0,
      operationReservedMaxCostUsd:
        reservation.operationReservedMaxCostUsd ?? 0,
      actualProviderCostUsd: finalized.actualProviderCostUsd,
      usageLogWarning: finalized.warning,
    };
  } catch (error) {
    await markUsageFailed({ usageEventId, error });
    throw error;
  }
}

function validateSelectionOutput(input: {
  output: unknown;
  segments: RoutingSegment[];
  groups: CandidateGroup[];
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

    const segmentId = asText(row.segmentId);
    const canonicalKey = asNullableText(row.canonicalKey);
    const confidence = asFiniteNumber(row.confidence);
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
        { segmentId },
      );
    }

    seen.add(segmentId);

    if (!canonicalKey) {
      if (asArray(row.facts).length > 0) {
        throw new GlobalObservationPilotError(
          502,
          "AI_SELECTION_FACT_WITHOUT_TARGET",
          "AI returned facts without a selected semantic leaf.",
          { segmentId },
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

    const candidate = group.candidates.find(
      (item) => item.canonicalKey === canonicalKey,
    );

    if (!candidate) {
      throw new GlobalObservationPilotError(
        502,
        "AI_SELECTION_OUTSIDE_CANDIDATE_SET",
        "AI selected a Value Object that was not in the bounded candidate set.",
        { segmentId, canonicalKey },
      );
    }

    const parameterByCode = new Map(
      candidate.parameters.map((parameter) => [
        parameter.parameterCode,
        parameter,
      ]),
    );

    const facts = asArray(row.facts).map((rawFact) => {
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
          group.resolutionMode === "exact"
            ? group.exactMatchKind === "primary_title"
              ? "exact_primary_name"
              : "exact_alias"
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

export async function runGlobalObservationPreview(
  request: GlobalObservationPreviewRequest,
) {
  if (process.env.GSR1_OPENAI_PILOT_ENABLED !== "true") {
    throw new GlobalObservationPilotError(
      503,
      "GSR1_OPENAI_PILOT_DISABLED",
      "GSR-1 OpenAI pilot is disabled.",
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
      "sourceFragment MUST be an exact substring of the user text and must contain the semantic event/state evidence, not only a number or unit.",
      "lookupText is a short semantic noun/activity phrase suitable for exact alias lookup.",
      "Choose domainFacetKey ONLY from the supplied live DOMAIN/FACET route options. The key already binds a valid root and facet; never invent or recombine them.",
      "Do not invent a new ontology object.",
      "Do not diagnose.",
      "Do not infer calories, caffeine, physiological effects, hidden metrics, or causal relations.",
      "Temporal rule: occurredAt is not reportedAt. If occurrence time cannot be grounded from the text and supplied clock context, return null and temporalPrecision=unknown.",
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
      operationId: request.operationId,
      stage: "domain_facet_routing",
      model,
      system: routingSystem,
      user: routingUser,
      schemaName: "arctor_gsr1_routing_v2",
      schema: routingSchema,
      maxOutputTokens: ROUTING_MAX_OUTPUT_TOKENS,
      signal: controller.signal,
    });

    const segments = validateRoutingOutput({
      output: routingCall.parsed,
      sourceText: inputText,
      catalog,
      reportedAt,
    });

    const candidateGroups = await buildCandidateGroups(segments, locale);

    const selectionSchema = getSelectionSchema();
    const selectionSystem = [
      "You are ARCTor Global System Reality routing stage 2.",
      "For every segment return exactly one selection row.",
      "Choose canonicalKey ONLY from that segment's supplied candidate list, or null.",
      "Never output an ontology object not supplied by the server.",
      "For facts use ONLY parameterCode and unit pairs supplied for the selected candidate.",
      "Extract values ONLY when explicitly stated by the user in sourceFragment.",
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
      operationId: request.operationId,
      stage: "leaf_parameter_selection",
      model,
      system: selectionSystem,
      user: selectionUser,
      schemaName: "arctor_gsr1_leaf_parameter_selection_v1",
      schema: selectionSchema,
      maxOutputTokens: SELECTION_MAX_OUTPUT_TOKENS,
      signal: controller.signal,
    });

    const previewRows = validateSelectionOutput({
      output: selectionCall.parsed,
      segments,
      groups: candidateGroups,
    });

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
      actorId: request.actorId,
      modelTier: PILOT_MODEL_TIER,
      model,
      reportedAt: reportedAt.toISOString(),
      timeZone,
      locale,
      rows: previewRows,
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
  } finally {
    clearTimeout(deadlineTimer);
  }
}
