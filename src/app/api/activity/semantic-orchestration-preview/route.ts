import { NextResponse } from "next/server";

import {
  runActivitySemanticOrchestrationServiceV0,
  type ActivitySemanticOrchestrationInputV0,
} from "../../../../../lib/activity/categoryDerivation/activitySemanticOrchestrationServiceV0";

import {
  buildActivityProcessingCounters,
  type ActivityFactPreviewStatus,
  type ActivityIntakeSource,
  type ActivityMeasureCandidate,
  type ActivityObjectFactPreview,
  type ActivityProcessingPackage,
  type SemanticCategoryCandidate,
  type SemanticCategoryLayer,
  type ValueObjectMatchedCandidate,
  type MissingValueObjectCandidate,
} from "@/types/activity-to-value-objects";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/semantic-orchestration-preview";
const ROUTE_CONTRACT_VERSION =
  "product_semantic_preview_route_package_bridge_v1";
const ROUTE_MODE = "product_semantic_preview_no_write_v0" as const;

const SIDE_EFFECTS = {
  sqlExecuted: false,
  dbReadExecuted: false,
  dbWriteExecuted: false,
  activityEventCreated: false,
  stableBundlePersisted: false,
  valueObjectCreated: false,
  activityValueObjectLinkCreated: false,
  stateFactCreated: false,
  stateDeltaCreated: false,
  stateSnapshotCreated: false,
  productionWriteGateOpened: false,
  sandboxWriteGateOpened: false,
  rowsActuallyWritten: 0,
} as const;

const TRUSTED_CLIENT_FIELD_DENY_LIST = [
  "user_id",
  "userId",
  "authenticatedUserId",
  "owner_user_id",
  "ownerUserId",
  "organization_owner_id",
  "organizationOwnerId",
  "visibility_scope",
  "visibilityScope",
] as const;

const WRITE_FLAG_DENY_LIST = [
  "allowActivityEventCreation",
  "allowValueObjectCreation",
  "allowStateWrites",
  "productionWriteEnabled",
  "sandboxWriteEnabled",
  "writeGateOpened",
] as const;

type ProductSemanticPreviewSourceV0 = NonNullable<
  ActivitySemanticOrchestrationInputV0["source"]
>;

type JsonRecord = Record<string, unknown>;

type DurationExtractionResult = {
  numericValue: number;
  evidenceText: string;
  normalizedLabel: string;
};

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(
    {
      ...payload,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      routeMode: ROUTE_MODE,
      sourceContracts: {
        c33O1: "product_semantic_preview_route_contract",
        c33N2: "activity_semantic_orchestration_service_v0",
        c33N3: "product_routes_call_internal_services_directly",
        c33N4: "client_identity_is_not_trusted",
        c33N5: "activity_processing_package_bridge_no_write_v1",
      },
    },
    { status }
  );
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeInputLanguage(value: unknown): string {
  const text = asTrimmedString(value);
  return text === "" ? "unknown" : text;
}

function normalizeSource(value: unknown): ProductSemanticPreviewSourceV0 {
  const text = asTrimmedString(value);
  const allowed: ProductSemanticPreviewSourceV0[] = [
    "manual",
    "chat_ai",
    "calendar",
    "booking",
    "rule",
    "import",
    "system",
  ];

  return allowed.includes(text as ProductSemanticPreviewSourceV0)
    ? (text as ProductSemanticPreviewSourceV0)
    : "manual";
}

function normalizePackageLocale(
  inputLanguage: string
): ActivityProcessingPackage["rawInput"]["locale"] {
  if (
    inputLanguage === "ru" ||
    inputLanguage === "pl" ||
    inputLanguage === "de" ||
    inputLanguage === "es" ||
    inputLanguage === "en"
  ) {
    return inputLanguage;
  }

  return "unknown";
}

function normalizePackageSource(
  source: ProductSemanticPreviewSourceV0
): ActivityIntakeSource {
  if (source === "chat_ai") {
    return "right_ai_column";
  }

  if (source === "import") {
    return "future_external_import";
  }

  return "api_preview";
}

function hasProvidedField(body: JsonRecord, key: string): boolean {
  if (!Object.prototype.hasOwnProperty.call(body, key)) {
    return false;
  }

  const value = body[key];

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string" && value.trim() === "") {
    return false;
  }

  return true;
}

function hasTruthyWriteFlag(body: JsonRecord, key: string): boolean {
  const value = body[key];
  return value === true || value === "true" || value === 1 || value === "1";
}

function normalizeSemanticObjectKey(value: string, fallback: string) {
  const raw = value.trim().length > 0 ? value : fallback;

  const transliterated = raw
    .toLowerCase()
    .replace(/ё/g, "e")
    .replace(/й/g, "i")
    .replace(/ц/g, "c")
    .replace(/у/g, "u")
    .replace(/к/g, "k")
    .replace(/е/g, "e")
    .replace(/н/g, "n")
    .replace(/г/g, "g")
    .replace(/ш/g, "sh")
    .replace(/щ/g, "sch")
    .replace(/з/g, "z")
    .replace(/х/g, "h")
    .replace(/ъ/g, "")
    .replace(/ф/g, "f")
    .replace(/ы/g, "y")
    .replace(/в/g, "v")
    .replace(/а/g, "a")
    .replace(/п/g, "p")
    .replace(/р/g, "r")
    .replace(/о/g, "o")
    .replace(/л/g, "l")
    .replace(/д/g, "d")
    .replace(/ж/g, "zh")
    .replace(/э/g, "e")
    .replace(/я/g, "ya")
    .replace(/ч/g, "ch")
    .replace(/с/g, "s")
    .replace(/м/g, "m")
    .replace(/и/g, "i")
    .replace(/т/g, "t")
    .replace(/ь/g, "")
    .replace(/б/g, "b")
    .replace(/ю/g, "yu");

  const normalized = transliterated
    .normalize("NFKD")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 79);

  const withPrefix = /^[a-z]/.test(normalized)
    ? normalized
    : `x_${normalized}`;

  const finalValue = withPrefix.replace(/_+$/g, "").slice(0, 79);

  return finalValue.length >= 2 ? finalValue : fallback;
}

function includesAny(text: string, markers: readonly string[]) {
  return markers.some((marker) => text.includes(marker));
}

function extractDurationMinutes(rawText: string): DurationExtractionResult | null {
  const lowerText = rawText.toLowerCase();

  if (lowerText.includes("полчаса") || lowerText.includes("пол часа")) {
    return {
      numericValue: 30,
      evidenceText: "полчаса",
      normalizedLabel: "30 минут",
    };
  }

  if (lowerText.includes("полтора часа") || lowerText.includes("полторы часа")) {
    return {
      numericValue: 90,
      evidenceText: "полтора часа",
      normalizedLabel: "90 минут",
    };
  }

  const match = rawText.match(
    /(\d+(?:[.,]\d+)?)\s*(секунд(?:у|ы)?|сек\.?|s|минут(?:у|ы)?|мин\.?|m|min\.?|minutes?|час(?:а|ов)?|ч\.?|h|hours?)/i
  );

  if (!match) {
    return null;
  }

  const numericValue = Number(match[1].replace(",", "."));

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  const unit = match[2].toLowerCase();
  const evidenceText = match[0];

  if (
    unit.startsWith("сек") ||
    unit === "s"
  ) {
    const minutes = Math.max(1, Math.round(numericValue / 60));

    return {
      numericValue: minutes,
      evidenceText,
      normalizedLabel: `${minutes} минут`,
    };
  }

  if (
    unit.startsWith("час") ||
    unit === "ч" ||
    unit === "ч." ||
    unit === "h" ||
    unit.startsWith("hour")
  ) {
    const minutes = Math.round(numericValue * 60);

    return {
      numericValue: minutes,
      evidenceText,
      normalizedLabel: `${minutes} минут`,
    };
  }

  return {
    numericValue: Math.round(numericValue),
    evidenceText,
    normalizedLabel: `${Math.round(numericValue)} минут`,
  };
}

function inferDetectedActivityTitle(rawText: string) {
  const withoutDuration = rawText
    .replace(
      /\d+(?:[.,]\d+)?\s*(секунд(?:у|ы)?|сек\.?|s|минут(?:у|ы)?|мин\.?|m|min\.?|minutes?|час(?:а|ов)?|ч\.?|h|hours?)/gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

  return withoutDuration.length > 0 ? withoutDuration : rawText;
}

function createCategory(params: {
  localId: string;
  semanticObjectKey: string;
  labelRu: string;
  layer: SemanticCategoryLayer;
  confidence: number;
  evidenceText: string;
  reason: string;
}): SemanticCategoryCandidate {
  return params;
}

function inferSemanticCategories(rawText: string): SemanticCategoryCandidate[] {
  const lowerText = rawText.toLowerCase();
  const categories: SemanticCategoryCandidate[] = [];

  if (includesAny(lowerText, ["рилс", "reels", "reel", "shorts"])) {
    categories.push(
      createCategory({
        localId: "cat-watching-reels",
        semanticObjectKey: "watching_reels",
        labelRu: "Просмотр рилсов",
        layer: "activity_type",
        confidence: 0.92,
        evidenceText: rawText,
        reason: "В тексте явно указан просмотр рилсов / short-form video.",
      })
    );
  }

  if (includesAny(lowerText, ["немецк", "deutsch", "german"])) {
    categories.push(
      createCategory({
        localId: "cat-german-learning",
        semanticObjectKey: "german_learning",
        labelRu: "Изучение немецкого языка",
        layer: "learning",
        confidence: 0.9,
        evidenceText: rawText,
        reason: "Текст указывает на обучение немецкому языку.",
      })
    );
  }

  if (includesAny(lowerText, ["английск", "english"])) {
    categories.push(
      createCategory({
        localId: "cat-english-learning",
        semanticObjectKey: "english_learning",
        labelRu: "Изучение английского языка",
        layer: "learning",
        confidence: 0.9,
        evidenceText: rawText,
        reason: "Текст указывает на обучение английскому языку.",
      })
    );
  }

  if (includesAny(lowerText, ["испанск", "spanish", "español", "espanol"])) {
    categories.push(
      createCategory({
        localId: "cat-spanish-learning",
        semanticObjectKey: "spanish_learning",
        labelRu: "Изучение испанского языка",
        layer: "learning",
        confidence: 0.9,
        evidenceText: rawText,
        reason: "Текст указывает на обучение испанскому языку.",
      })
    );
  }

  if (includesAny(lowerText, ["польск", "polish", "polski"])) {
    categories.push(
      createCategory({
        localId: "cat-polish-learning",
        semanticObjectKey: "polish_learning",
        labelRu: "Изучение польского языка",
        layer: "learning",
        confidence: 0.9,
        evidenceText: rawText,
        reason: "Текст указывает на обучение польскому языку.",
      })
    );
  }

  if (
    includesAny(lowerText, [
      "подтяг",
      "отжим",
      "присед",
      "планк",
      "трениров",
      "exercise",
      "training",
    ])
  ) {
    categories.push(
      createCategory({
        localId: "cat-physical-training",
        semanticObjectKey: "physical_training",
        labelRu: "Физическая тренировка",
        layer: "physiology",
        confidence: 0.88,
        evidenceText: rawText,
        reason: "Текст указывает на физическую нагрузку.",
      })
    );
  }

  if (includesAny(lowerText, ["гулял", "ходил", "прогул", "walk"])) {
    categories.push(
      createCategory({
        localId: "cat-walking",
        semanticObjectKey: "walking",
        labelRu: "Ходьба / прогулка",
        layer: "activity_type",
        confidence: 0.86,
        evidenceText: rawText,
        reason: "Текст указывает на ходьбу или прогулку.",
      })
    );
  }

  if (includesAny(lowerText, ["спал", "сон", "sleep"])) {
    categories.push(
      createCategory({
        localId: "cat-sleep",
        semanticObjectKey: "sleep",
        labelRu: "Сон",
        layer: "recovery",
        confidence: 0.9,
        evidenceText: rawText,
        reason: "Текст указывает на сон или восстановление.",
      })
    );
  }

  if (includesAny(lowerText, ["работал", "работа", "work", "b2b", "клиент", "продаж"])) {
    categories.push(
      createCategory({
        localId: "cat-work",
        semanticObjectKey: "work_activity",
        labelRu: "Рабочая активность",
        layer: "work",
        confidence: 0.82,
        evidenceText: rawText,
        reason: "Текст указывает на рабочую или B2B-активность.",
      })
    );
  }

  if (includesAny(lowerText, ["стоматолог", "врач", "приём", "прием", "здоров"])) {
    categories.push(
      createCategory({
        localId: "cat-health",
        semanticObjectKey: "health_activity",
        labelRu: "Здоровье / медицинская активность",
        layer: "health",
        confidence: 0.85,
        evidenceText: rawText,
        reason: "Текст указывает на здоровье или медицинский контекст.",
      })
    );
  }

  if (categories.length === 0) {
    const title = inferDetectedActivityTitle(rawText);

    categories.push(
      createCategory({
        localId: "cat-right-ai-activity",
        semanticObjectKey: normalizeSemanticObjectKey(title, "right_ai_activity"),
        labelRu: title,
        layer: "activity_type",
        confidence: 0.7,
        evidenceText: rawText,
        reason: "Fallback category created by semantic preview package bridge.",
      })
    );
  }

  return categories.slice(0, 8);
}

function buildValueObjectMatches(
  categories: SemanticCategoryCandidate[]
): ValueObjectMatchedCandidate[] {
  return categories.map((category) => ({
    semanticCategoryLocalId: category.localId,
    matchStatus: "missing_candidate",
    valueObjectId: null,
    valueObjectTitle: null,
    parentValueObjectId: null,
    parentValueObjectTitle: null,
    confidence: Math.max(0.5, category.confidence - 0.1),
    reason:
      "Semantic preview identified a category, but real Value Object substitution is postponed to a later review step.",
  }));
}

function buildMissingValueObjectCandidates(
  categories: SemanticCategoryCandidate[]
): MissingValueObjectCandidate[] {
  return categories.map((category) => ({
    semanticCategoryLocalId: category.localId,
    semanticObjectKey: category.semanticObjectKey,
    proposedTitleRu: category.labelRu,
    proposedUsageScope: "private",
    proposedAuthorType: "user",
    proposedParentValueObjectId: null,
    proposedParentTitleRu: null,
    reason:
      "Candidate is shown for future Value Object review. Step 09A does not create or update Value Objects.",
    requiresUserConfirmation: true,
  }));
}

function buildFactPreviews(params: {
  categories: SemanticCategoryCandidate[];
  measure: ActivityMeasureCandidate | null;
}): ActivityObjectFactPreview[] {
  if (!params.measure) {
    return [];
  }

  return params.categories.map((category, index) => {
    const status: ActivityFactPreviewStatus = "ready_for_fact_write";

    return {
      localId: `fact-${category.semanticObjectKey}-duration-${index + 1}`,
      activityEventId: null,
      measureLocalId: params.measure?.localId ?? null,
      semanticCategoryLocalId: category.localId,
      semanticObjectKey: category.semanticObjectKey,
      valueObjectId: null,
      valueObjectTitle: null,
      measureType: "duration",
      unit: "minute",
      numericValue: params.measure?.numericValue ?? null,
      textValue: null,
      status,
      confidence: Math.min(category.confidence, params.measure?.confidence ?? 0.8),
      explanation: `Факт-кандидат: ${category.labelRu}, длительность ${params.measure?.numericValue ?? "?"} минут.`,
    };
  });
}

function buildDeniedResponse(errors: string[]) {
  return json(
    {
      ok: false,
      semanticPreviewReady: false,
      orchestrationReady: false,
      productRouteReady: false,
      internalServiceCalled: false,
      debugRouteCalled: false,
      activityEventId: null,
      stableBundleId: null,
      transactionStepCount: 0,
      memberTransactionStepCount: 0,
      blockedAuditTransactionStepCount: 0,
      activityProcessingPackage: null,
      saveGateBridge: {
        available: false,
        reason: "request_denied_before_package_bridge",
      },
      sideEffects: SIDE_EFFECTS,
      errors,
      warnings: [
        "Request was denied before calling the internal orchestration service.",
        "C33-O.2 route skeleton is preview-only and no-write.",
        "Client-provided identity/write fields are not trusted.",
      ],
    },
    400
  );
}

function validateRequest(body: JsonRecord): {
  errors: string[];
  rawText: string;
  inputLanguage: string;
  source: ProductSemanticPreviewSourceV0;
} {
  const rawText = asTrimmedString(body.rawText);
  const inputLanguage = normalizeInputLanguage(body.inputLanguage);
  const source = normalizeSource(body.source);
  const errors: string[] = [];

  if (rawText.length === 0) {
    errors.push("rawText is required");
  }

  if (rawText.length > 4000) {
    errors.push("rawText is too long for C33-O.2 preview skeleton");
  }

  const mode = asTrimmedString(body.mode);
  if (mode !== "" && mode !== "preview_only") {
    errors.push("only preview_only mode is allowed");
  }

  if (hasProvidedField(body, "activityEventId")) {
    errors.push("activityEventId is not accepted by the first product preview route skeleton");
  }

  for (const field of TRUSTED_CLIENT_FIELD_DENY_LIST) {
    if (hasProvidedField(body, field)) {
      errors.push(`client-provided ${field} is not trusted`);
    }
  }

  for (const field of WRITE_FLAG_DENY_LIST) {
    if (hasTruthyWriteFlag(body, field)) {
      errors.push(`${field} is not allowed in product semantic preview`);
    }
  }

  return {
    errors,
    rawText,
    inputLanguage,
    source,
  };
}

function buildActivityProcessingPackage(params: {
  rawText: string;
  inputLanguage: string;
  source: ProductSemanticPreviewSourceV0;
  orchestrationOk: boolean;
  orchestrationWarnings: string[];
  orchestrationErrors: string[];
}): ActivityProcessingPackage {
  const capturedAtIso = new Date().toISOString();
  const duration = extractDurationMinutes(params.rawText);
  const title = inferDetectedActivityTitle(params.rawText);
  const categories = inferSemanticCategories(params.rawText);
  const measure: ActivityMeasureCandidate | null = duration
    ? {
        localId: "measure-duration-minutes",
        measureType: "duration",
        unit: "minute",
        numericValue: duration.numericValue,
        textValue: null,
        confidence: 0.95,
        evidenceText: duration.evidenceText,
        normalizedLabel: duration.normalizedLabel,
      }
    : null;

  const valueObjectMatches = buildValueObjectMatches(categories);
  const missingValueObjectCandidates =
    buildMissingValueObjectCandidates(categories);
  const factPreviews = buildFactPreviews({
    categories,
    measure,
  });

  const status =
    factPreviews.length > 0 ? "ready_for_save_gate" : "needs_user_review";

  const draft: Omit<ActivityProcessingPackage, "counters"> = {
    packageId: `semantic-preview-package-${Date.now()}`,
    status,
    rawInput: {
      text: params.rawText,
      locale: normalizePackageLocale(params.inputLanguage),
      source: normalizePackageSource(params.source),
      capturedAtIso,
    },
    recognition: {
      status: factPreviews.length > 0 ? "obvious_activity" : "ambiguous_activity",
      confidence: factPreviews.length > 0 ? 0.9 : 0.65,
      reason: params.orchestrationOk
        ? "Semantic orchestration preview succeeded; package bridge created a save-gate-compatible no-write package."
        : "Semantic orchestration returned warnings/errors; package bridge created a review-only package.",
      detectedActivityTitle: title,
      shouldAskUserBeforeSaving: factPreviews.length === 0,
    },
    measures: measure ? [measure] : [],
    semanticCategories: categories,
    valueObjectMatches,
    missingValueObjectCandidates,
    factPreviews,
    safety: {
      previewOnly: true,
      dbWriteAllowed: false,
      sqlAllowed: false,
      openAiCallAllowed: false,
      medicalDiagnosisAllowed: false,
      notes: [
        "Semantic preview route remains no-write.",
        "ActivityProcessingPackage is returned only as a bridge payload for later save-gate confirmation.",
        "Value Object substitution is postponed; candidates are not created here.",
        "No Activity Event is created by this route.",
        ...params.orchestrationWarnings.slice(0, 5),
        ...params.orchestrationErrors.slice(0, 5),
      ],
    },
  };

  return {
    ...draft,
    counters: buildActivityProcessingCounters(draft),
  };
}

export async function GET() {
  return json({
    ok: true,
    productRouteReady: true,
    routePurpose: "product_style_semantic_preview_no_write_with_package_bridge",
    allowedMethod: "POST",
    createdByBlock: "C33-O.2 + STEP09A",
    rules: [
      "Route is preview-only.",
      "Route performs no SQL execution.",
      "Route performs no DB read.",
      "Route performs no DB write.",
      "Route calls internal activitySemanticOrchestrationServiceV0 directly.",
      "Route does not call debug routes.",
      "Route rejects Activity Event references in the first skeleton.",
      "Route rejects client-provided identity fields.",
      "Route rejects write flags.",
      "Route creates no Activity Event.",
      "Route persists no Stable Semantic Bundle.",
      "Route creates no Value Object.",
      "Route creates no State Fact, Delta or Snapshot.",
      "Route now also returns ActivityProcessingPackage for a later preview-to-save-gate adapter.",
    ],
    saveGateBridge: {
      available: true,
      mode: "activity_processing_package_preview_only",
      nextStep:
        "Right AI may later send this package to /api/activity/facts/save-gate after explicit confirmation.",
    },
    sideEffects: SIDE_EFFECTS,
  });
}

export async function POST(request: Request) {
  let body: JsonRecord = {};

  try {
    const parsed = await request.json();
    body = isRecord(parsed) ? parsed : {};
  } catch {
    body = {};
  }

  const validation = validateRequest(body);

  if (validation.errors.length > 0) {
    return buildDeniedResponse(validation.errors);
  }

  const orchestrationResult = runActivitySemanticOrchestrationServiceV0({
    mode: "preview_only",
    rawText: validation.rawText,
    inputLanguage: validation.inputLanguage,
    source: validation.source,
    activityEventId: null,
    authenticatedUserId: null,
    allowActivityEventCreation: false,
    allowValueObjectCreation: false,
    allowStateWrites: false,
  });

  const activityProcessingPackage = buildActivityProcessingPackage({
    rawText: validation.rawText,
    inputLanguage: validation.inputLanguage,
    source: validation.source,
    orchestrationOk: orchestrationResult.ok,
    orchestrationWarnings: orchestrationResult.warnings,
    orchestrationErrors: orchestrationResult.errors,
  });

  return json(
    {
      ok: orchestrationResult.ok,
      semanticPreviewReady: orchestrationResult.ok,
      orchestrationReady: true,
      productRouteReady: true,
      internalServiceCalled: true,
      debugRouteCalled: false,
      activityEventId: null,
      stableBundleId: null,
      transactionStepCount:
        orchestrationResult.orchestration.transactionStepCount,
      memberTransactionStepCount:
        orchestrationResult.orchestration.memberTransactionStepCount,
      blockedAuditTransactionStepCount:
        orchestrationResult.orchestration.blockedAuditTransactionStepCount,
      input: {
        rawText: validation.rawText,
        inputLanguage: validation.inputLanguage,
        source: validation.source,
        mode: "preview_only",
        activityEventId: null,
      },
      orchestration: {
        servicePolicy: orchestrationResult.policy,
        serviceMode: orchestrationResult.serviceMode,
        stableBundleServiceCalled:
          orchestrationResult.orchestration.stableBundleServiceCalled,
        stableBundleServiceMode:
          orchestrationResult.orchestration.stableBundleServiceMode,
        stableBundleServiceOk:
          orchestrationResult.orchestration.stableBundleServiceOk,
        activityEventReferenceAccepted:
          orchestrationResult.orchestration.activityEventReferenceAccepted,
      },
      activityProcessingPackage,
      saveGateBridge: {
        available: activityProcessingPackage.factPreviews.length > 0,
        packageStatus: activityProcessingPackage.status,
        factPreviewCount: activityProcessingPackage.factPreviews.length,
        acceptedFactDecisionPolicy:
          "A later adapter may accept ready_for_fact_write previews after user/system confirmation.",
        valueObjectPolicy:
          "Value Object candidates are preview-only here; no Value Object is created by this route.",
        noWriteGuarantee: SIDE_EFFECTS,
      },
      sideEffects: SIDE_EFFECTS,
      errors: orchestrationResult.errors,
      warnings: [
        ...orchestrationResult.warnings,
        "C33-O.2 product preview route performs no DB read or write.",
        "STEP09A package bridge returns ActivityProcessingPackage but still creates no DB rows.",
      ],
    },
    orchestrationResult.ok ? 200 : 500
  );
}
