import { supabase } from "../supabase";
import type { RawActivitySignalRow } from "./rawActivitySignals";

export type ImportedActivityTemplateMappingInput = {
  userId: string;
  rawSignal: RawActivitySignalRow;
  title: string;
  payload?: Record<string, unknown>;
  body?: Record<string, unknown>;
  normalizedPreview?: Record<string, unknown>;
};

export type ImportedActivityTemplateMappingCandidate = {
  templateId: string;
  activityTypeId: string | null;
  legacyTemplateId: string | null;
  slug: string | null;
  title: string | null;
  shortTitle: string | null;
  templateGroup: string | null;
  templateScope: string | null;
  sourceType: string | null;
  score: number;
  reasons: string[];
};

export type ImportedActivityTemplateMappingResult = {
  ok: boolean;
  matched: boolean;
  matchType:
    | "explicit_activity_template_id"
    | "explicit_legacy_template_id"
    | "explicit_activity_type_id"
    | "high_confidence_text"
    | "none";
  confidence: number;
  reason: string;
  activityTemplateId: string | null;
  activityTypeId: string | null;
  legacyTemplateId: string | null;
  selectedTemplate: ImportedActivityTemplateMappingCandidate | null;
  candidates: ImportedActivityTemplateMappingCandidate[];
  metadata: Record<string, unknown>;
};

type ActivityTemplateRow = {
  id: string;
  slug: string | null;
  title: string | null;
  short_title: string | null;
  description: string | null;
  template_group: string | null;
  template_scope: string | null;
  source_type: string | null;
  status: string | null;
  is_active: boolean | null;
  owner_user_id: string | null;
  default_activity_type_id: string | null;
  legacy_activity_code_template_id: string | null;
  default_duration_minutes: number | null;
  default_status: string | null;
  default_source_type: string | null;
  default_privacy_scope: string | null;
  default_metadata_json: Record<string, unknown> | null;
  sort_order: number | null;
};

type ActivityTypeRow = {
  id: string;
  code: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
};

const HIGH_CONFIDENCE_THRESHOLD = 85;
const MAX_CANDIDATES = 10;

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeText(value: unknown): string {
  const text = asString(value);

  if (!text) {
    return "";
  }

  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\-:|/\\.,;()[\]{}"'`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value.length > 0)
    )
  );
}

function pickString(
  records: Array<Record<string, unknown> | undefined>,
  keys: string[]
): string | null {
  for (const record of records) {
    if (!record) {
      continue;
    }

    for (const key of keys) {
      const value = asString(record[key]);

      if (value) {
        return value;
      }
    }
  }

  return null;
}

function buildSearchText(input: ImportedActivityTemplateMappingInput) {
  const payload = input.payload ?? {};
  const body = input.body ?? {};
  const normalizedPreview = input.normalizedPreview ?? {};
  const rawPayload = asRecord(input.rawSignal.raw_payload);
  const rawPayloadPayload = asRecord(rawPayload.payload);
  const rawPayloadMetadata = asRecord(rawPayload.metadata);
  const rawMetadata = asRecord(input.rawSignal.metadata_json);

  return normalizeText(
    [
      input.title,
      input.rawSignal.source_type,
      input.rawSignal.source_event_id,
      body.title,
      body.name,
      body.comment,
      body.description,
      body.note,
      payload.title,
      payload.name,
      payload.comment,
      payload.description,
      payload.note,
      payload.type,
      payload.category,
      payload.activity,
      payload.template,
      payload.templateSlug,
      payload.template_slug,
      payload.activityTemplateSlug,
      payload.activity_template_slug,
      payload.activityType,
      payload.activity_type,
      rawPayloadPayload.title,
      rawPayloadPayload.name,
      rawPayloadPayload.comment,
      rawPayloadPayload.description,
      rawPayloadPayload.note,
      rawPayloadPayload.type,
      rawPayloadPayload.category,
      rawPayloadPayload.activity,
      rawPayloadMetadata.adapter,
      rawPayloadMetadata.source,
      normalizedPreview.title,
      normalizedPreview.name,
      rawMetadata.adapter,
      rawMetadata.source,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function getExplicitTemplateId(input: ImportedActivityTemplateMappingInput) {
  const payload = input.payload ?? {};
  const body = input.body ?? {};
  const normalizedPreview = input.normalizedPreview ?? {};
  const rawPayload = asRecord(input.rawSignal.raw_payload);
  const rawPayloadPayload = asRecord(rawPayload.payload);
  const rawPayloadMetadata = asRecord(rawPayload.metadata);
  const rawMetadata = asRecord(input.rawSignal.metadata_json);

  return pickString(
    [
      body,
      payload,
      normalizedPreview,
      rawPayloadPayload,
      rawPayloadMetadata,
      rawMetadata,
    ],
    [
      "activityTemplateId",
      "activity_template_id",
      "templateId",
      "template_id",
      "templateUuid",
      "template_uuid",
    ]
  );
}

function getExplicitLegacyTemplateId(
  input: ImportedActivityTemplateMappingInput
) {
  const payload = input.payload ?? {};
  const body = input.body ?? {};
  const normalizedPreview = input.normalizedPreview ?? {};
  const rawPayload = asRecord(input.rawSignal.raw_payload);
  const rawPayloadPayload = asRecord(rawPayload.payload);
  const rawPayloadMetadata = asRecord(rawPayload.metadata);
  const rawMetadata = asRecord(input.rawSignal.metadata_json);

  return pickString(
    [
      body,
      payload,
      normalizedPreview,
      rawPayloadPayload,
      rawPayloadMetadata,
      rawMetadata,
    ],
    [
      "legacyTemplateId",
      "legacy_template_id",
      "legacyActivityCodeTemplateId",
      "legacy_activity_code_template_id",
      "activityCodeTemplateId",
      "activity_code_template_id",
    ]
  );
}

function getExplicitActivityTypeId(input: ImportedActivityTemplateMappingInput) {
  const payload = input.payload ?? {};
  const body = input.body ?? {};
  const normalizedPreview = input.normalizedPreview ?? {};
  const rawPayload = asRecord(input.rawSignal.raw_payload);
  const rawPayloadPayload = asRecord(rawPayload.payload);
  const rawPayloadMetadata = asRecord(rawPayload.metadata);
  const rawMetadata = asRecord(input.rawSignal.metadata_json);

  return pickString(
    [
      body,
      payload,
      normalizedPreview,
      rawPayloadPayload,
      rawPayloadMetadata,
      rawMetadata,
    ],
    ["activityTypeId", "activity_type_id"]
  );
}

function toCandidate(
  template: ActivityTemplateRow,
  score: number,
  reasons: string[]
): ImportedActivityTemplateMappingCandidate {
  return {
    templateId: template.id,
    activityTypeId: template.default_activity_type_id,
    legacyTemplateId: template.legacy_activity_code_template_id,
    slug: template.slug,
    title: template.title,
    shortTitle: template.short_title,
    templateGroup: template.template_group,
    templateScope: template.template_scope,
    sourceType: template.source_type,
    score,
    reasons,
  };
}

function scoreTemplate(params: {
  template: ActivityTemplateRow;
  searchText: string;
  rawSignal: RawActivitySignalRow;
}) {
  const { template, searchText, rawSignal } = params;
  const reasons: string[] = [];
  let score = 0;

  const slug = normalizeText(template.slug);
  const title = normalizeText(template.title);
  const shortTitle = normalizeText(template.short_title);
  const description = normalizeText(template.description);
  const group = normalizeText(template.template_group);
  const sourceType = normalizeText(template.source_type);
  const defaultSourceType = normalizeText(template.default_source_type);
  const rawSourceType = normalizeText(rawSignal.source_type);

  if (slug && searchText.includes(slug)) {
    score += 90;
    reasons.push("slug_in_search_text");
  }

  if (title && searchText.includes(title)) {
    score += 80;
    reasons.push("title_in_search_text");
  }

  if (shortTitle && searchText.includes(shortTitle)) {
    score += 60;
    reasons.push("short_title_in_search_text");
  }

  if (group && searchText.includes(group)) {
    score += 25;
    reasons.push("group_in_search_text");
  }

  if (sourceType && rawSourceType && sourceType === rawSourceType) {
    score += 15;
    reasons.push("template_source_matches_raw_source");
  }

  if (
    defaultSourceType &&
    rawSourceType &&
    defaultSourceType === rawSourceType
  ) {
    score += 10;
    reasons.push("default_source_matches_raw_source");
  }

  const templateWords = uniqueStrings(
    [slug, title, shortTitle, group]
      .join(" ")
      .split(" ")
      .map((word) => word.trim())
      .filter((word) => word.length >= 4)
  );

  const matchedWords = templateWords.filter((word) =>
    searchText.includes(word)
  );

  if (matchedWords.length > 0) {
    const wordScore = Math.min(matchedWords.length * 8, 40);
    score += wordScore;
    reasons.push(`matched_words:${matchedWords.slice(0, 6).join(",")}`);
  }

  if (description) {
    const descriptionWords = uniqueStrings(
      description
        .split(" ")
        .map((word) => word.trim())
        .filter((word) => word.length >= 6)
    );

    const matchedDescriptionWords = descriptionWords
      .filter((word) => searchText.includes(word))
      .slice(0, 5);

    if (matchedDescriptionWords.length > 0) {
      const descriptionScore = Math.min(
        matchedDescriptionWords.length * 4,
        20
      );
      score += descriptionScore;
      reasons.push(
        `matched_description_words:${matchedDescriptionWords.join(",")}`
      );
    }
  }

  return {
    score,
    reasons,
  };
}

async function loadActiveTemplates(userId: string) {
  const { data: systemTemplatesData, error: systemTemplatesError } =
    await supabase
      .from("activity_templates")
      .select(
        "id, slug, title, short_title, description, template_group, template_scope, source_type, status, is_active, owner_user_id, default_activity_type_id, legacy_activity_code_template_id, default_duration_minutes, default_status, default_source_type, default_privacy_scope, default_metadata_json, sort_order"
      )
      .eq("template_scope", "system")
      .eq("status", "active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

  if (systemTemplatesError) {
    throw new Error(systemTemplatesError.message);
  }

  const { data: userTemplatesData, error: userTemplatesError } = await supabase
    .from("activity_templates")
    .select(
      "id, slug, title, short_title, description, template_group, template_scope, source_type, status, is_active, owner_user_id, default_activity_type_id, legacy_activity_code_template_id, default_duration_minutes, default_status, default_source_type, default_privacy_scope, default_metadata_json, sort_order"
    )
    .eq("template_scope", "user")
    .eq("owner_user_id", userId)
    .eq("status", "active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (userTemplatesError) {
    throw new Error(userTemplatesError.message);
  }

  const byId = new Map<string, ActivityTemplateRow>();

  for (const template of (systemTemplatesData ?? []) as ActivityTemplateRow[]) {
    byId.set(template.id, template);
  }

  for (const template of (userTemplatesData ?? []) as ActivityTemplateRow[]) {
    byId.set(template.id, template);
  }

  return Array.from(byId.values());
}

async function findActivityTypeById(activityTypeId: string) {
  const { data, error } = await supabase
    .from("activity_types")
    .select("id, code, title, description, status")
    .eq("id", activityTypeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ActivityTypeRow | null) ?? null;
}

function noneResult(params: {
  reason: string;
  searchText: string;
  candidates: ImportedActivityTemplateMappingCandidate[];
  explicitActivityTemplateId: string | null;
  explicitLegacyTemplateId: string | null;
  explicitActivityTypeId: string | null;
}): ImportedActivityTemplateMappingResult {
  return {
    ok: true,
    matched: false,
    matchType: "none",
    confidence: 0,
    reason: params.reason,
    activityTemplateId: null,
    activityTypeId: null,
    legacyTemplateId: null,
    selectedTemplate: null,
    candidates: params.candidates,
    metadata: {
      mapper: "imported_activity_template_mapping_v1",
      matched: false,
      reason: params.reason,
      searchTextPreview: params.searchText.slice(0, 300),
      explicitActivityTemplateId: params.explicitActivityTemplateId,
      explicitLegacyTemplateId: params.explicitLegacyTemplateId,
      explicitActivityTypeId: params.explicitActivityTypeId,
      candidatesCount: params.candidates.length,
    },
  };
}

export async function mapImportedActivityToTemplate(
  input: ImportedActivityTemplateMappingInput
): Promise<ImportedActivityTemplateMappingResult> {
  const payload = input.payload ?? {};
  const body = input.body ?? {};
  const normalizedPreview = input.normalizedPreview ?? {};
  const searchText = buildSearchText({
    ...input,
    payload,
    body,
    normalizedPreview,
  });

  const explicitActivityTemplateId = getExplicitTemplateId({
    ...input,
    payload,
    body,
    normalizedPreview,
  });

  const explicitLegacyTemplateId = getExplicitLegacyTemplateId({
    ...input,
    payload,
    body,
    normalizedPreview,
  });

  const explicitActivityTypeId = getExplicitActivityTypeId({
    ...input,
    payload,
    body,
    normalizedPreview,
  });

  const templates = await loadActiveTemplates(input.userId);

  const candidates = templates
    .map((template) => {
      const scored = scoreTemplate({
        template,
        searchText,
        rawSignal: input.rawSignal,
      });

      return toCandidate(template, scored.score, scored.reasons);
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return (left.title ?? "").localeCompare(right.title ?? "");
    })
    .slice(0, MAX_CANDIDATES);

  if (explicitActivityTemplateId) {
    const template = templates.find(
      (item) => item.id === explicitActivityTemplateId
    );

    if (template) {
      const candidate = toCandidate(template, 100, [
        "explicit_activity_template_id",
      ]);

      return {
        ok: true,
        matched: true,
        matchType: "explicit_activity_template_id",
        confidence: 100,
        reason: "Explicit activity template id matched an active system/user template.",
        activityTemplateId: template.id,
        activityTypeId: template.default_activity_type_id,
        legacyTemplateId: template.legacy_activity_code_template_id,
        selectedTemplate: candidate,
        candidates,
        metadata: {
          mapper: "imported_activity_template_mapping_v1",
          matched: true,
          matchType: "explicit_activity_template_id",
          confidence: 100,
          explicitActivityTemplateId,
          selectedTemplateId: template.id,
          selectedActivityTypeId: template.default_activity_type_id,
          selectedLegacyTemplateId: template.legacy_activity_code_template_id,
          searchTextPreview: searchText.slice(0, 300),
        },
      };
    }
  }

  if (explicitLegacyTemplateId) {
    const template = templates.find(
      (item) => item.legacy_activity_code_template_id === explicitLegacyTemplateId
    );

    if (template) {
      const candidate = toCandidate(template, 100, [
        "explicit_legacy_template_id",
      ]);

      return {
        ok: true,
        matched: true,
        matchType: "explicit_legacy_template_id",
        confidence: 100,
        reason:
          "Explicit legacy template id matched an active system/user template.",
        activityTemplateId: template.id,
        activityTypeId: template.default_activity_type_id,
        legacyTemplateId: template.legacy_activity_code_template_id,
        selectedTemplate: candidate,
        candidates,
        metadata: {
          mapper: "imported_activity_template_mapping_v1",
          matched: true,
          matchType: "explicit_legacy_template_id",
          confidence: 100,
          explicitLegacyTemplateId,
          selectedTemplateId: template.id,
          selectedActivityTypeId: template.default_activity_type_id,
          selectedLegacyTemplateId: template.legacy_activity_code_template_id,
          searchTextPreview: searchText.slice(0, 300),
        },
      };
    }
  }

  if (explicitActivityTypeId) {
    const activityType = await findActivityTypeById(explicitActivityTypeId);

    if (activityType) {
      return {
        ok: true,
        matched: true,
        matchType: "explicit_activity_type_id",
        confidence: 90,
        reason:
          "Explicit activity type id matched an existing activity type. No template was selected.",
        activityTemplateId: null,
        activityTypeId: activityType.id,
        legacyTemplateId: null,
        selectedTemplate: null,
        candidates,
        metadata: {
          mapper: "imported_activity_template_mapping_v1",
          matched: true,
          matchType: "explicit_activity_type_id",
          confidence: 90,
          explicitActivityTypeId,
          selectedActivityTypeId: activityType.id,
          selectedActivityTypeCode: activityType.code,
          selectedActivityTypeTitle: activityType.title,
          searchTextPreview: searchText.slice(0, 300),
        },
      };
    }
  }

  const bestCandidate = candidates[0] ?? null;

  if (bestCandidate && bestCandidate.score >= HIGH_CONFIDENCE_THRESHOLD) {
    return {
      ok: true,
      matched: true,
      matchType: "high_confidence_text",
      confidence: Math.min(bestCandidate.score, 100),
      reason:
        "High-confidence deterministic text match selected an active template.",
      activityTemplateId: bestCandidate.templateId,
      activityTypeId: bestCandidate.activityTypeId,
      legacyTemplateId: bestCandidate.legacyTemplateId,
      selectedTemplate: bestCandidate,
      candidates,
      metadata: {
        mapper: "imported_activity_template_mapping_v1",
        matched: true,
        matchType: "high_confidence_text",
        confidence: Math.min(bestCandidate.score, 100),
        selectedTemplateId: bestCandidate.templateId,
        selectedActivityTypeId: bestCandidate.activityTypeId,
        selectedLegacyTemplateId: bestCandidate.legacyTemplateId,
        selectedTemplateTitle: bestCandidate.title,
        selectedTemplateSlug: bestCandidate.slug,
        reasons: bestCandidate.reasons,
        searchTextPreview: searchText.slice(0, 300),
        candidatesCount: candidates.length,
      },
    };
  }

  return noneResult({
    reason:
      candidates.length > 0
        ? "No template reached the high-confidence threshold."
        : "No candidate template matched the imported signal.",
    searchText,
    candidates,
    explicitActivityTemplateId,
    explicitLegacyTemplateId,
    explicitActivityTypeId,
  });
}
