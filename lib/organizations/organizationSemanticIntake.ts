import OpenAI from "openai";

import { supabase } from "../supabase";

const BUSINESS_DIRECTORY_CONTEXT_CODE = "business_directory";
const ORGANIZATION_OBJECT_TYPE_CODE = "organization";
const CLASSIFY_ACTION_TYPE_CODE = "classify";
const FALLBACK_CATEGORY_SLUG = "other";
const FALLBACK_CATEGORY_LABEL = "Other";
const DEFAULT_MODEL = "gpt-5.5";

type VisibilitySuggestion = "public_safe" | "internal_only" | "needs_review";

export type OrganizationSemanticIntakeInput = {
  objectType?: "organization";
  objectId?: string | null;
  source?: string | null;
  name?: string | null;
  description?: string | null;
  organizationType?: string | null;
  country?: string | null;
  city?: string | null;
  district?: string | null;
  classifiedByUserId?: string | null;
  persist?: boolean;
  replaceExistingAiPrimary?: boolean;
};

export type OrganizationSemanticIntakeCandidate = {
  label: string;
  slug: string;
  confidence: number;
  reason: string;
  sourceText?: string;
  visibilitySuggestion: VisibilitySuggestion;
};

export type OrganizationSemanticIntakeUnknownTerm = {
  term: string;
  reason: string;
  suggestedLookup?: string;
};

export type OrganizationSemanticIntakeAnalysis = {
  language: string;
  normalizedTitle: string;
  shortSummary: string;
  categoryCandidates: OrganizationSemanticIntakeCandidate[];
  unknownTermCandidates: OrganizationSemanticIntakeUnknownTerm[];
  riskFlags: string[];
};

export type OrganizationSemanticIntakePersistence = {
  requested: boolean;
  wroteToDatabase: boolean;
  usedFallbackCategory: boolean;
  createdContextualCategory: boolean;
  createdEntityClassification: boolean;
  updatedEntityClassification: boolean;
  preservedExistingPrimaryClassification: boolean;
  businessDirectoryContextId: string | null;
  objectTypeId: string | null;
  actionTypeId: string | null;
  contextualCategoryId: string | null;
  entityClassificationId: string | null;
  selectedCategorySlug: string | null;
  selectedCategoryLabel: string | null;
  reviewState: "ai_candidate" | "system_fallback" | null;
  note: string;
};

export type OrganizationSemanticIntakeResult = {
  ok: boolean;
  mode: "openai_organization_semantic_intake_write_flow";
  objectType: "organization";
  objectId: string | null;
  source: string;
  model: string;
  responseId: string | null;
  usage: unknown | null;
  openaiStatus: "not_requested" | "succeeded" | "failed";
  error?: string;
  input: {
    name: string;
    description: string;
    organizationType: string;
    country: string;
    city: string;
    district: string;
  };
  analysis: OrganizationSemanticIntakeAnalysis;
  persistence: OrganizationSemanticIntakePersistence;
};

type ParsedSemanticOutput = {
  language?: string;
  normalizedTitle?: string;
  shortSummary?: string;
  categoryCandidates?: Array<{
    label?: string;
    slug?: string;
    confidence?: number;
    reason?: string;
    sourceText?: string;
    visibilitySuggestion?: VisibilitySuggestion;
  }>;
  unknownTermCandidates?: Array<{
    term?: string;
    reason?: string;
    suggestedLookup?: string;
  }>;
  riskFlags?: string[];
};

type LookupRow = {
  id: string | null;
};

type ContextualCategoryRow = {
  id: string;
  slug: string;
  name: string;
  status: string | null;
  is_active: boolean | null;
};

type EntityClassificationRow = {
  id: string;
  source_type: string | null;
  evidence_json: Record<string, unknown> | null;
};

function asText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0.5;
  }

  return Math.max(0, Math.min(1, value));
}

function safeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9а-яёąćęłńóśźżüöäß]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function truncateText(value: string, maxLength = 700): string {
  const text = value.trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}…`;
}

function tryParseJsonObject(text: string): ParsedSemanticOutput | null {
  const trimmed = text.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as ParsedSemanticOutput;
  } catch {
    // Continue to fenced/raw JSON extraction.
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1]) as ParsedSemanticOutput;
    } catch {
      // Continue to object extraction.
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const possibleJson = trimmed.slice(firstBrace, lastBrace + 1);

    try {
      return JSON.parse(possibleJson) as ParsedSemanticOutput;
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeParsedOutput(
  parsed: ParsedSemanticOutput | null,
  fallbackName: string,
): OrganizationSemanticIntakeAnalysis {
  if (!parsed) {
    return {
      language: "unknown",
      normalizedTitle: fallbackName,
      shortSummary: "OpenAI returned non-JSON output. Fallback category may be used.",
      categoryCandidates: [],
      unknownTermCandidates: [],
      riskFlags: ["non_json_output"],
    };
  }

  const categoryCandidates = Array.isArray(parsed.categoryCandidates)
    ? parsed.categoryCandidates
        .filter((candidate) => candidate && typeof candidate.label === "string")
        .slice(0, 12)
        .map((candidate) => {
          const label = asText(candidate.label);
          const slug = asText(candidate.slug) || safeSlug(label);
          const visibilitySuggestion =
            candidate.visibilitySuggestion === "public_safe" ||
            candidate.visibilitySuggestion === "internal_only" ||
            candidate.visibilitySuggestion === "needs_review"
              ? candidate.visibilitySuggestion
              : "needs_review";

          return {
            label,
            slug,
            confidence: clampConfidence(candidate.confidence),
            reason:
              typeof candidate.reason === "string"
                ? truncateText(candidate.reason, 500)
                : "No reason provided.",
            sourceText:
              typeof candidate.sourceText === "string"
                ? truncateText(candidate.sourceText, 300)
                : undefined,
            visibilitySuggestion,
          };
        })
        .filter((candidate) => candidate.label.length > 0 && candidate.slug.length > 0)
    : [];

  const unknownTermCandidates = Array.isArray(parsed.unknownTermCandidates)
    ? parsed.unknownTermCandidates
        .filter((candidate) => candidate && typeof candidate.term === "string")
        .slice(0, 20)
        .map((candidate) => ({
          term: asText(candidate.term),
          reason:
            typeof candidate.reason === "string"
              ? truncateText(candidate.reason, 500)
              : "No reason provided.",
          suggestedLookup:
            typeof candidate.suggestedLookup === "string"
              ? truncateText(candidate.suggestedLookup, 300)
              : undefined,
        }))
        .filter((candidate) => candidate.term.length > 0)
    : [];

  const riskFlags = Array.isArray(parsed.riskFlags)
    ? parsed.riskFlags
        .filter((flag): flag is string => typeof flag === "string")
        .slice(0, 20)
    : [];

  return {
    language: typeof parsed.language === "string" ? parsed.language : "unknown",
    normalizedTitle:
      typeof parsed.normalizedTitle === "string" ? parsed.normalizedTitle : fallbackName,
    shortSummary:
      typeof parsed.shortSummary === "string"
        ? truncateText(parsed.shortSummary, 700)
        : "",
    categoryCandidates,
    unknownTermCandidates,
    riskFlags,
  };
}

function createEmptyPersistence(
  requested: boolean,
  note: string,
): OrganizationSemanticIntakePersistence {
  return {
    requested,
    wroteToDatabase: false,
    usedFallbackCategory: false,
    createdContextualCategory: false,
    createdEntityClassification: false,
    updatedEntityClassification: false,
    preservedExistingPrimaryClassification: false,
    businessDirectoryContextId: null,
    objectTypeId: null,
    actionTypeId: null,
    contextualCategoryId: null,
    entityClassificationId: null,
    selectedCategorySlug: null,
    selectedCategoryLabel: null,
    reviewState: null,
    note,
  };
}

function selectBestCandidate(
  analysis: OrganizationSemanticIntakeAnalysis,
): OrganizationSemanticIntakeCandidate | null {
  const publicSafeCandidate = analysis.categoryCandidates.find(
    (candidate) => candidate.visibilitySuggestion === "public_safe",
  );

  if (publicSafeCandidate) {
    return publicSafeCandidate;
  }

  const needsReviewCandidate = analysis.categoryCandidates.find(
    (candidate) => candidate.visibilitySuggestion === "needs_review",
  );

  return needsReviewCandidate ?? null;
}

async function getLookupId(tableName: "contexts" | "object_types" | "action_types", code: string) {
  const { data, error } = await supabase
    .from(tableName)
    .select("id")
    .eq("code", code)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`${tableName}_${code}_lookup_failed: ${error.message}`);
  }

  const row = data as LookupRow | null;

  if (!row?.id) {
    throw new Error(`${tableName}_${code}_not_found`);
  }

  return row.id;
}

async function resolveContextualCategory(input: {
  contextId: string;
  slug: string;
  label: string;
  description: string | null;
  isFallback: boolean;
}) {
  const normalizedSlug = safeSlug(input.slug || input.label) || FALLBACK_CATEGORY_SLUG;
  const normalizedLabel = input.label.trim() || FALLBACK_CATEGORY_LABEL;

  const { data: existingRows, error: existingError } = await supabase
    .from("contextual_categories")
    .select("id, slug, name, status, is_active")
    .eq("context_id", input.contextId)
    .eq("slug", normalizedSlug)
    .limit(1);

  if (existingError) {
    throw new Error(`contextual_category_lookup_failed: ${existingError.message}`);
  }

  const existingCategory =
    ((existingRows ?? []) as ContextualCategoryRow[])[0] ?? null;

  if (existingCategory?.id) {
    return {
      category: existingCategory,
      created: false,
    };
  }

  const { data: insertedCategory, error: insertError } = await supabase
    .from("contextual_categories")
    .insert({
      context_id: input.contextId,
      parent_id: null,
      slug: normalizedSlug,
      name: normalizedLabel,
      description:
        input.description ??
        (input.isFallback
          ? "Fallback category used when semantic intake cannot safely resolve a better public category."
          : "AI-suggested business directory category created by organization semantic intake."),
      status: "approved",
      source_type: input.isFallback ? "system_seed" : "ai_suggested",
      sort_order: input.isFallback ? 999 : 900,
      is_active: true,
    })
    .select("id, slug, name, status, is_active")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: retryRows, error: retryError } = await supabase
        .from("contextual_categories")
        .select("id, slug, name, status, is_active")
        .eq("context_id", input.contextId)
        .eq("slug", normalizedSlug)
        .limit(1);

      if (retryError) {
        throw new Error(`contextual_category_retry_lookup_failed: ${retryError.message}`);
      }

      const retryCategory =
        ((retryRows ?? []) as ContextualCategoryRow[])[0] ?? null;

      if (retryCategory?.id) {
        return {
          category: retryCategory,
          created: false,
        };
      }
    }

    throw new Error(`contextual_category_insert_failed: ${insertError.message}`);
  }

  return {
    category: insertedCategory as ContextualCategoryRow,
    created: true,
  };
}

async function writePrimaryOrganizationClassification(input: {
  organizationId: string;
  contextId: string;
  objectTypeId: string;
  actionTypeId: string;
  contextualCategoryId: string;
  classifiedByUserId: string | null;
  confidence: number;
  source: string;
  model: string;
  responseId: string | null;
  usage: unknown | null;
  selectedCategory: {
    label: string;
    slug: string;
    reason: string;
    visibilitySuggestion: VisibilitySuggestion | "fallback";
  };
  reviewState: "ai_candidate" | "system_fallback";
  replaceExistingAiPrimary: boolean;
  openaiStatus: "not_requested" | "succeeded" | "failed";
  openaiError: string | null;
}) {
  const evidenceJson = {
    review_state: input.reviewState,
    source: input.source,
    semantic_intake: {
      object_type: "organization",
      model: input.model,
      response_id: input.responseId,
      openai_status: input.openaiStatus,
      openai_error: input.openaiError,
      usage: input.usage,
      selected_category: input.selectedCategory,
    },
    safety: {
      raw_openai_output_stored: false,
      raw_openai_output_publicly_exposed: false,
    },
  };

  const { data: existingRows, error: existingError } = await supabase
    .from("entity_classifications")
    .select("id, source_type, evidence_json")
    .eq("entity_type", "organization")
    .eq("entity_id", input.organizationId)
    .eq("object_type_id", input.objectTypeId)
    .eq("action_type_id", input.actionTypeId)
    .eq("context_id", input.contextId)
    .eq("classification_role", "primary")
    .eq("is_primary", true)
    .limit(1);

  if (existingError) {
    throw new Error(`entity_classification_lookup_failed: ${existingError.message}`);
  }

  const existingClassification =
    ((existingRows ?? []) as EntityClassificationRow[])[0] ?? null;

  if (existingClassification?.id) {
    const previousReviewState =
      typeof existingClassification.evidence_json?.review_state === "string"
        ? existingClassification.evidence_json.review_state
        : null;

    const canReplaceExisting =
      input.replaceExistingAiPrimary ||
      existingClassification.source_type === "ai_suggested" ||
      previousReviewState === "ai_candidate" ||
      previousReviewState === "system_fallback";

    if (!canReplaceExisting) {
      return {
        id: existingClassification.id,
        created: false,
        updated: false,
        preservedExistingPrimary: true,
      };
    }

    const { data: updatedRows, error: updateError } = await supabase
      .from("entity_classifications")
      .update({
        contextual_category_id: input.contextualCategoryId,
        confidence: input.confidence,
        status: "approved",
        source_type: "ai_suggested",
        classified_by_user_id: input.classifiedByUserId,
        evidence_json: evidenceJson,
        notes:
          input.reviewState === "system_fallback"
            ? "System fallback primary category assigned by organization semantic intake."
            : "AI candidate primary category assigned by organization semantic intake.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingClassification.id)
      .select("id")
      .limit(1);

    if (updateError) {
      throw new Error(`entity_classification_update_failed: ${updateError.message}`);
    }

    const updatedId =
      (((updatedRows ?? []) as Array<{ id: string }>)[0] ?? null)?.id ??
      existingClassification.id;

    return {
      id: updatedId,
      created: false,
      updated: true,
      preservedExistingPrimary: false,
    };
  }

  const { data: insertedClassification, error: insertError } = await supabase
    .from("entity_classifications")
    .insert({
      entity_type: "organization",
      entity_id: input.organizationId,
      object_type_id: input.objectTypeId,
      action_type_id: input.actionTypeId,
      context_id: input.contextId,
      contextual_category_id: input.contextualCategoryId,
      classification_role: "primary",
      is_primary: true,
      confidence: input.confidence,
      status: "approved",
      source_type: "ai_suggested",
      classified_by_user_id: input.classifiedByUserId,
      evidence_json: evidenceJson,
      notes:
        input.reviewState === "system_fallback"
          ? "System fallback primary category assigned by organization semantic intake."
          : "AI candidate primary category assigned by organization semantic intake.",
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`entity_classification_insert_failed: ${insertError.message}`);
  }

  const row = insertedClassification as { id: string };

  return {
    id: row.id,
    created: true,
    updated: false,
    preservedExistingPrimary: false,
  };
}

async function persistSemanticCategory(input: {
  organizationId: string;
  source: string;
  analysis: OrganizationSemanticIntakeAnalysis;
  selectedCandidate: OrganizationSemanticIntakeCandidate | null;
  model: string;
  responseId: string | null;
  usage: unknown | null;
  classifiedByUserId: string | null;
  replaceExistingAiPrimary: boolean;
  openaiStatus: "not_requested" | "succeeded" | "failed";
  openaiError: string | null;
}): Promise<OrganizationSemanticIntakePersistence> {
  const contextId = await getLookupId("contexts", BUSINESS_DIRECTORY_CONTEXT_CODE);
  const objectTypeId = await getLookupId("object_types", ORGANIZATION_OBJECT_TYPE_CODE);
  const actionTypeId = await getLookupId("action_types", CLASSIFY_ACTION_TYPE_CODE);

  const selectedCandidate = input.selectedCandidate;
  const usedFallbackCategory = !selectedCandidate;

  const selectedCategory = selectedCandidate
    ? {
        label: selectedCandidate.label,
        slug: selectedCandidate.slug,
        confidence: selectedCandidate.confidence,
        reason: selectedCandidate.reason,
        visibilitySuggestion: selectedCandidate.visibilitySuggestion,
      }
    : {
        label: FALLBACK_CATEGORY_LABEL,
        slug: FALLBACK_CATEGORY_SLUG,
        confidence: 0.2,
        reason: "No safe OpenAI category candidate was available.",
        visibilitySuggestion: "fallback" as const,
      };

  const resolvedCategory = await resolveContextualCategory({
    contextId,
    slug: selectedCategory.slug,
    label: selectedCategory.label,
    description: usedFallbackCategory
      ? "Fallback category used when organization semantic intake has no safe resolved category."
      : selectedCategory.reason,
    isFallback: usedFallbackCategory,
  });

  const reviewState = usedFallbackCategory ? "system_fallback" : "ai_candidate";

  const classificationWrite = await writePrimaryOrganizationClassification({
    organizationId: input.organizationId,
    contextId,
    objectTypeId,
    actionTypeId,
    contextualCategoryId: resolvedCategory.category.id,
    classifiedByUserId: input.classifiedByUserId,
    confidence: selectedCategory.confidence,
    source: input.source,
    model: input.model,
    responseId: input.responseId,
    usage: input.usage,
    selectedCategory: {
      label: selectedCategory.label,
      slug: selectedCategory.slug,
      reason: selectedCategory.reason,
      visibilitySuggestion: selectedCategory.visibilitySuggestion,
    },
    reviewState,
    replaceExistingAiPrimary: input.replaceExistingAiPrimary,
    openaiStatus: input.openaiStatus,
    openaiError: input.openaiError,
  });

  return {
    requested: true,
    wroteToDatabase:
      resolvedCategory.created ||
      classificationWrite.created ||
      classificationWrite.updated,
    usedFallbackCategory,
    createdContextualCategory: resolvedCategory.created,
    createdEntityClassification: classificationWrite.created,
    updatedEntityClassification: classificationWrite.updated,
    preservedExistingPrimaryClassification:
      classificationWrite.preservedExistingPrimary,
    businessDirectoryContextId: contextId,
    objectTypeId,
    actionTypeId,
    contextualCategoryId: resolvedCategory.category.id,
    entityClassificationId: classificationWrite.id,
    selectedCategorySlug: selectedCategory.slug,
    selectedCategoryLabel: selectedCategory.label,
    reviewState,
    note: classificationWrite.preservedExistingPrimary
      ? "Existing non-AI primary classification was preserved. No automatic overwrite was applied."
      : usedFallbackCategory
        ? "Fallback category was assigned so the organization does not remain invisible in the semantic cloud."
        : "AI candidate category was assigned as approved primary classification with review_state stored in evidence_json.",
  };
}

async function runOpenAiSemanticExtraction(input: {
  semanticInput: Record<string, unknown>;
  model: string;
  fallbackName: string;
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.responses.create({
    model: input.model,
    instructions: [
      "You are a semantic intake extractor for a B2B platform.",
      "Analyze the provided organization data.",
      "Return ONLY valid JSON. Do not return markdown.",
      "Do not create final truth. Return candidates only.",
      "Find important business categories, domains, services, industries, customer groups, and operational themes.",
      "Avoid private personal data. Prefer public-safe business categories when possible.",
      "Use this JSON shape:",
      "{",
      '  "language": "en|pl|de|es|ru|mixed|unknown",',
      '  "normalizedTitle": "short normalized organization title",',
      '  "shortSummary": "one sentence summary",',
      '  "categoryCandidates": [',
      '    { "label": "AI automation consulting", "slug": "ai-automation-consulting", "confidence": 0.95, "reason": "why this category is relevant", "sourceText": "text fragment", "visibilitySuggestion": "public_safe|internal_only|needs_review" }',
      "  ],",
      '  "unknownTermCandidates": [',
      '    { "term": "term needing lookup", "reason": "why lookup is useful", "suggestedLookup": "optional lookup phrase" }',
      "  ],",
      '  "riskFlags": ["optional safety or ambiguity flags"]',
      "}",
    ].join("\n"),
    input: JSON.stringify(input.semanticInput, null, 2),
    max_output_tokens: 1200,
  });

  const outputText = (response as { output_text?: string }).output_text ?? "";
  const analysis = normalizeParsedOutput(
    tryParseJsonObject(outputText),
    input.fallbackName,
  );

  return {
    responseId: response.id ?? null,
    usage: response.usage ?? null,
    analysis,
  };
}

export async function runOrganizationSemanticIntake(
  input: OrganizationSemanticIntakeInput,
): Promise<OrganizationSemanticIntakeResult> {
  const objectType = input.objectType ?? "organization";
  const objectId = asText(input.objectId ?? "") || null;
  const source = asText(input.source ?? "organization_semantic_intake");
  const name = asText(input.name ?? "");
  const description = asText(input.description ?? "");
  const organizationType = asText(input.organizationType ?? "");
  const country = asText(input.country ?? "");
  const city = asText(input.city ?? "");
  const district = asText(input.district ?? "");
  const model = process.env.OPENAI_SEMANTIC_MODEL || DEFAULT_MODEL;
  const persist = input.persist !== false;
  const replaceExistingAiPrimary = input.replaceExistingAiPrimary ?? true;
  const classifiedByUserId = asText(input.classifiedByUserId ?? "") || null;

  if (objectType !== "organization") {
    return {
      ok: false,
      mode: "openai_organization_semantic_intake_write_flow",
      objectType: "organization",
      objectId,
      source,
      model,
      responseId: null,
      usage: null,
      openaiStatus: "not_requested",
      error: "UNSUPPORTED_OBJECT_TYPE",
      input: {
        name,
        description,
        organizationType,
        country,
        city,
        district,
      },
      analysis: normalizeParsedOutput(null, name || "organization"),
      persistence: createEmptyPersistence(
        persist,
        "Unsupported object type. Persistence skipped.",
      ),
    };
  }

  if (!name && !description) {
    return {
      ok: false,
      mode: "openai_organization_semantic_intake_write_flow",
      objectType,
      objectId,
      source,
      model,
      responseId: null,
      usage: null,
      openaiStatus: "not_requested",
      error: "EMPTY_SEMANTIC_INPUT",
      input: {
        name,
        description,
        organizationType,
        country,
        city,
        district,
      },
      analysis: normalizeParsedOutput(null, name || "organization"),
      persistence: createEmptyPersistence(
        persist,
        "Empty semantic input. Persistence skipped.",
      ),
    };
  }

  const semanticInput = {
    objectType,
    objectId,
    source,
    name,
    description,
    organizationType,
    location: {
      country,
      city,
      district,
    },
  };

  let openaiStatus: "not_requested" | "succeeded" | "failed" = "not_requested";
  let openaiError: string | null = null;
  let responseId: string | null = null;
  let usage: unknown | null = null;
  let analysis = normalizeParsedOutput(null, name || "organization");

  try {
    const openaiResult = await runOpenAiSemanticExtraction({
      semanticInput,
      model,
      fallbackName: name || "organization",
    });

    openaiStatus = "succeeded";
    responseId = openaiResult.responseId;
    usage = openaiResult.usage;
    analysis = openaiResult.analysis;
  } catch (error) {
    openaiStatus = "failed";
    openaiError =
      error instanceof Error ? error.message : "Unknown OpenAI request error.";
    analysis = {
      ...analysis,
      shortSummary:
        "OpenAI semantic extraction failed. Fallback category may be used.",
      riskFlags: Array.from(
        new Set([...analysis.riskFlags, "openai_semantic_intake_failed"]),
      ),
    };
  }

  let persistence = createEmptyPersistence(
    persist,
    persist
      ? "Persistence requested but not executed yet."
      : "Persistence was not requested.",
  );

  if (persist) {
    if (!objectId) {
      persistence = createEmptyPersistence(
        true,
        "objectId is required for DB persistence. No category link was written.",
      );
    } else {
      try {
        persistence = await persistSemanticCategory({
          organizationId: objectId,
          source,
          analysis,
          selectedCandidate: selectBestCandidate(analysis),
          model,
          responseId,
          usage,
          classifiedByUserId,
          replaceExistingAiPrimary,
          openaiStatus,
          openaiError,
        });
      } catch (error) {
        persistence = {
          ...createEmptyPersistence(
            true,
            error instanceof Error
              ? error.message
              : "Unknown semantic persistence error.",
          ),
          requested: true,
        };

        return {
          ok: false,
          mode: "openai_organization_semantic_intake_write_flow",
          objectType,
          objectId,
          source,
          model,
          responseId,
          usage,
          openaiStatus,
          error:
            error instanceof Error
              ? error.message
              : "Unknown semantic persistence error.",
          input: {
            name,
            description,
            organizationType,
            country,
            city,
            district,
          },
          analysis,
          persistence,
        };
      }
    }
  }

  return {
    ok: openaiStatus === "succeeded" || persistence.wroteToDatabase,
    mode: "openai_organization_semantic_intake_write_flow",
    objectType,
    objectId,
    source,
    model,
    responseId,
    usage,
    openaiStatus,
    error: openaiError ?? undefined,
    input: {
      name,
      description,
      organizationType,
      country,
      city,
      district,
    },
    analysis,
    persistence,
  };
}
