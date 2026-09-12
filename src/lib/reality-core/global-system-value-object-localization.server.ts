import { createHash, randomUUID } from "node:crypto";

import { supabase } from "../../../lib/supabase";
import {
  ARCTOR_CONTENT_LOCALES,
  ARCTOR_LOCALIZED_CONTENT_SCHEMA_VERSION,
  readLocalizedContentEnvelope,
  type ArctorContentLocale,
  type LocalizedContentEnvelope,
  type LocalizedContentFieldMap,
} from "@/lib/localization/contentLocalization";
import {
  ARCTOR_CONTENT_LOCALIZATION_RUNTIME,
  generateLocalizedContentBatch,
} from "@/lib/localization/contentLocalization.server";

export const ARCTOR_SYSTEM_VALUE_OBJECT_LOCALIZATION_RUNTIME =
  "ARCTOR_SYSTEM_VALUE_OBJECT_CANONICAL_ENGLISH_LOCALIZATION_V2_QUEUE" as const;

const REQUIRED_FIELDS = ["title", "description"] as const;
const MAX_BACKFILL_BATCH = 5;
const MAX_QUEUE_READ = 2000;
const RETRY_MINUTES = [5, 15, 60, 180, 720, 1440] as const;

export type CuratorSystemLocalizationState =
  | "pending"
  | "retrying"
  | "blocked"
  | "complete";

type JsonRecord = Record<string, unknown>;

type CuratorSystemRow = {
  id: string;
  title: string | null;
  description: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type HumanOverride = {
  title: string;
  description: string;
};

export type CuratorSystemLocalizationJob = {
  id: string;
  title: string;
  description: string;
  state: CuratorSystemLocalizationState;
  missingLocales: ArctorContentLocale[];
  attemptCount: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  lastError: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function cleanText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function finiteInteger(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
  }
  return 0;
}

function normalizeLocale(value: unknown): ArctorContentLocale {
  const normalized = cleanText(value)?.toLowerCase() ?? "en";
  return ARCTOR_CONTENT_LOCALES.includes(normalized as ArctorContentLocale)
    ? (normalized as ArctorContentLocale)
    : "en";
}

function normalizeState(value: unknown): CuratorSystemLocalizationState {
  return value === "pending" ||
    value === "retrying" ||
    value === "blocked" ||
    value === "complete"
    ? value
    : "pending";
}

function cloneVariants(envelope: LocalizedContentEnvelope) {
  return Object.fromEntries(
    ARCTOR_CONTENT_LOCALES.map((locale) => [
      locale,
      { ...(envelope.variants[locale] ?? {}) },
    ]),
  ) as Record<ArctorContentLocale, LocalizedContentFieldMap>;
}

function emptyVariants(): Record<
  ArctorContentLocale,
  LocalizedContentFieldMap
> {
  return {
    en: { title: null, description: null },
    pl: { title: null, description: null },
    ru: { title: null, description: null },
    uk: { title: null, description: null },
    de: { title: null, description: null },
    es: { title: null, description: null },
    cs: { title: null, description: null },
  };
}

function sourceRevision(titleEn: string, descriptionEn: string) {
  return createHash("sha256")
    .update(JSON.stringify({ title: titleEn, description: descriptionEn }), "utf8")
    .digest("hex");
}

function readHumanDraftOverrides(metadata: unknown) {
  const root = asRecord(metadata);
  const draft = asRecord(root.curator_system_draft_v1);
  const localizations = asRecord(draft.localizations);
  const overrides = new Map<ArctorContentLocale, HumanOverride>();

  for (const locale of ARCTOR_CONTENT_LOCALES) {
    const row = asRecord(localizations[locale]);
    const title = cleanText(row.title);
    const description = cleanText(row.description);
    if (title && description) {
      overrides.set(locale, { title, description });
    }
  }

  return overrides;
}

function applyCanonicalEnglishAndHumanOverrides(input: {
  envelope: LocalizedContentEnvelope;
  titleEn: string;
  descriptionEn: string;
  overrides?: Map<ArctorContentLocale, HumanOverride>;
  lastEditedLocale?: ArctorContentLocale | null;
}) {
  const variants = cloneVariants(input.envelope);
  const humanLocales = new Set<ArctorContentLocale>(input.envelope.humanLocales);

  variants.en = {
    ...variants.en,
    title: input.titleEn,
    description: input.descriptionEn,
  };
  humanLocales.add("en");

  for (const [locale, override] of input.overrides ?? []) {
    variants[locale] = {
      ...variants[locale],
      title: override.title,
      description: override.description,
    };
    humanLocales.add(locale);
  }

  return {
    ...input.envelope,
    detectedSourceLocale: "en",
    sourceLocaleHint: "en",
    original: {
      ...input.envelope.original,
      title: input.titleEn,
      description: input.descriptionEn,
    },
    variants,
    humanLocales: Array.from(humanLocales),
    lastEditedLocale: input.lastEditedLocale ?? input.envelope.lastEditedLocale,
  } satisfies LocalizedContentEnvelope;
}

export function createPendingCanonicalSystemValueObjectLocalizationV1(input: {
  curatorLocale: unknown;
  localizedTitle: string;
  localizedDescription: string;
  titleEn: string;
  descriptionEn: string;
}) {
  const curatorLocale = normalizeLocale(input.curatorLocale);
  const titleEn = input.titleEn.trim();
  const descriptionEn = input.descriptionEn.trim();
  const variants = emptyVariants();
  variants.en = { title: titleEn, description: descriptionEn };
  if (curatorLocale !== "en") {
    variants[curatorLocale] = {
      title: input.localizedTitle.trim(),
      description: input.localizedDescription.trim(),
    };
  }
  const now = new Date().toISOString();
  return {
    schemaVersion: ARCTOR_LOCALIZED_CONTENT_SCHEMA_VERSION,
    detectedSourceLocale: "en",
    sourceLocaleHint: "en",
    sourceRevision: sourceRevision(titleEn, descriptionEn),
    fieldCodes: [...REQUIRED_FIELDS],
    original: { title: titleEn, description: descriptionEn },
    variants,
    humanLocales: Array.from(new Set<ArctorContentLocale>(["en", curatorLocale])),
    lastEditedLocale: curatorLocale,
    generatedAt: now,
    provider: "human" as const,
    model: null,
    responseId: null,
    usage: {
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    },
  } satisfies LocalizedContentEnvelope;
}

export function hasCompleteCanonicalSystemValueObjectLocalizationV1(input: {
  metadata: unknown;
  titleEn: string;
  descriptionEn: string;
}) {
  const envelope = readLocalizedContentEnvelope(input.metadata);
  if (!envelope) return false;

  if (
    cleanText(envelope.variants.en?.title) !== input.titleEn.trim() ||
    cleanText(envelope.variants.en?.description) !== input.descriptionEn.trim()
  ) {
    return false;
  }

  return ARCTOR_CONTENT_LOCALES.every((locale) =>
    REQUIRED_FIELDS.every((fieldCode) =>
      Boolean(cleanText(envelope.variants[locale]?.[fieldCode])),
    ),
  );
}

function missingLocales(metadata: unknown): ArctorContentLocale[] {
  const envelope = readLocalizedContentEnvelope(metadata);
  if (!envelope) return [...ARCTOR_CONTENT_LOCALES];
  return ARCTOR_CONTENT_LOCALES.filter((locale) =>
    REQUIRED_FIELDS.some(
      (fieldCode) => !cleanText(envelope.variants[locale]?.[fieldCode]),
    ),
  );
}

function nextRetryAt(attemptCount: number) {
  const minutes = RETRY_MINUTES[Math.min(attemptCount, RETRY_MINUTES.length - 1)];
  return new Date(Date.now() + minutes * 60_000).toISOString();
}


export async function buildCanonicalSystemValueObjectLocalizationV1(input: {
  userId: string;
  actorId: string;
  entityKey: string;
  operationId: string;
  curatorLocale: unknown;
  localizedTitle: string;
  localizedDescription: string;
  titleEn: string;
  descriptionEn: string;
}) {
  const titleEn = input.titleEn.trim();
  const descriptionEn = input.descriptionEn.trim();
  const curatorLocale = normalizeLocale(input.curatorLocale);

  const generated = await generateLocalizedContentBatch({
    userId: input.userId,
    actorId: input.actorId,
    operationId: input.operationId,
    sourceLocaleHint: "en",
    targetLocales: [...ARCTOR_CONTENT_LOCALES],
    items: [
      {
        key: input.entityKey,
        fields: { title: titleEn, description: descriptionEn },
      },
    ],
  });

  const envelope = generated.envelopes.get(input.entityKey);
  if (!envelope) throw new Error("CURATOR_SYSTEM_LOCALIZATION_RESULT_MISSING");

  const overrides = new Map<ArctorContentLocale, HumanOverride>();
  overrides.set("en", { title: titleEn, description: descriptionEn });
  if (curatorLocale !== "en") {
    overrides.set(curatorLocale, {
      title: input.localizedTitle.trim(),
      description: input.localizedDescription.trim(),
    });
  }

  const localized = applyCanonicalEnglishAndHumanOverrides({
    envelope,
    titleEn,
    descriptionEn,
    overrides,
    lastEditedLocale: curatorLocale,
  });

  if (
    !hasCompleteCanonicalSystemValueObjectLocalizationV1({
      metadata: { localizedContent: localized },
      titleEn,
      descriptionEn,
    })
  ) {
    throw new Error("CURATOR_SYSTEM_LOCALIZATION_INCOMPLETE");
  }

  return localized;
}

async function readSystemObject(valueObjectId: string) {
  const { data, error } = await supabase
    .from("value_objects")
    .select("id,title,description,metadata_json,created_at,updated_at")
    .eq("id", valueObjectId)
    .eq("scope_code", "global")
    .eq("origin_type_code", "system_model")
    .eq("status", "active")
    .limit(1);
  if (error) {
    throw new Error(`CURATOR_SYSTEM_LOCALIZATION_ROW_READ_FAILED:${error.message}`);
  }
  return (data?.[0] ?? null) as CuratorSystemRow | null;
}

async function updateAttemptFailure(input: {
  row: CuratorSystemRow;
  error: string;
  blocked?: boolean;
}) {
  const metadata = asRecord(input.row.metadata_json);
  const draft = asRecord(metadata.curator_system_draft_v1);
  const attemptCount = finiteInteger(draft.localizationAttemptCount) + 1;
  const now = new Date().toISOString();
  const state: CuratorSystemLocalizationState = input.blocked
    ? "blocked"
    : "retrying";
  const nextMetadata = {
    ...metadata,
    curator_system_draft_v1: {
      ...draft,
      localizationState: state,
      localizationAttemptCount: attemptCount,
      localizationLastAttemptAt: now,
      localizationNextAttemptAt: input.blocked ? null : nextRetryAt(attemptCount),
      localizationLastError: input.error.slice(0, 2000),
      localizationMissingLocales: missingLocales(metadata),
    },
  };
  const { error } = await supabase
    .from("value_objects")
    .update({ metadata_json: nextMetadata })
    .eq("id", input.row.id)
    .eq("scope_code", "global")
    .eq("origin_type_code", "system_model");
  if (error) {
    console.error("CURATOR_SYSTEM_LOCALIZATION_FAILURE_STATE_WRITE_FAILED", error.message);
  }
  return {
    ok: false as const,
    state,
    error: input.error,
    attemptCount,
    nextAttemptAt: input.blocked ? null : nextRetryAt(attemptCount),
  };
}

export async function attemptCuratorSystemValueObjectLocalizationV1(input: {
  valueObjectId: string;
  fallbackUserId?: string | null;
  fallbackActorId?: string | null;
  force?: boolean;
}) {
  const row = await readSystemObject(input.valueObjectId);
  if (!row) {
    return {
      ok: false as const,
      state: "blocked" as const,
      error: "CURATOR_SYSTEM_LOCALIZATION_OBJECT_NOT_FOUND",
    };
  }

  const metadata = asRecord(row.metadata_json);
  const draft = asRecord(metadata.curator_system_draft_v1);
  const titleEn = cleanText(row.title);
  const descriptionEn = cleanText(row.description);
  if (!draft.contract || !titleEn || !descriptionEn) {
    return updateAttemptFailure({
      row,
      error: "CURATOR_SYSTEM_LOCALIZATION_CANONICAL_SOURCE_MISSING",
      blocked: true,
    });
  }

  if (
    hasCompleteCanonicalSystemValueObjectLocalizationV1({
      metadata,
      titleEn,
      descriptionEn,
    })
  ) {
    return { ok: true as const, state: "complete" as const, alreadyComplete: true };
  }

  const recordedNextAttemptAt = cleanText(draft.localizationNextAttemptAt);
  const recordedNextAttemptMs = recordedNextAttemptAt
    ? Date.parse(recordedNextAttemptAt)
    : Number.NaN;
  if (
    !input.force &&
    Number.isFinite(recordedNextAttemptMs) &&
    recordedNextAttemptMs > Date.now()
  ) {
    return {
      ok: false as const,
      state: normalizeState(draft.localizationState),
      error: cleanText(draft.localizationLastError),
      nextAttemptAt: recordedNextAttemptAt,
      skippedNotDue: true,
    };
  }

  const userId =
    cleanText(draft.localizationRequestedByUserId) ??
    cleanText(draft.curatorAppUserId) ??
    cleanText(input.fallbackUserId);
  const actorId =
    cleanText(draft.localizationRequestedByActorId) ??
    cleanText(input.fallbackActorId);
  if (!userId || !actorId) {
    return updateAttemptFailure({
      row,
      error: "CURATOR_SYSTEM_LOCALIZATION_REQUEST_CONTEXT_MISSING",
      blocked: true,
    });
  }

  const overrides = readHumanDraftOverrides(metadata);
  const curatorLocale = normalizeLocale(
    draft.creationLocale ?? draft.locale ?? "en",
  );
  const localizedDraft = overrides.get(curatorLocale);
  const englishDraft = overrides.get("en");
  if (!englishDraft || (curatorLocale !== "en" && !localizedDraft)) {
    return updateAttemptFailure({
      row,
      error: "CURATOR_SYSTEM_LOCALIZATION_HUMAN_DRAFT_MISSING",
      blocked: true,
    });
  }

  const attemptCount = finiteInteger(draft.localizationAttemptCount) + 1;
  const now = new Date().toISOString();

  try {
    const localized = await buildCanonicalSystemValueObjectLocalizationV1({
      userId,
      actorId,
      entityKey: row.id,
      operationId: randomUUID(),
      curatorLocale,
      localizedTitle:
        curatorLocale === "en"
          ? englishDraft.title
          : (localizedDraft?.title ?? englishDraft.title),
      localizedDescription:
        curatorLocale === "en"
          ? englishDraft.description
          : (localizedDraft?.description ?? englishDraft.description),
      titleEn,
      descriptionEn,
    });

    const nextMetadata = {
      ...metadata,
      localizedContent: localized,
      contentLocalizationRuntime: ARCTOR_CONTENT_LOCALIZATION_RUNTIME,
      systemValueObjectLocalizationRuntime:
        ARCTOR_SYSTEM_VALUE_OBJECT_LOCALIZATION_RUNTIME,
      curator_system_draft_v1: {
        ...draft,
        canonicalLocale: "en",
        localizationState: "complete",
        localizationLocales: [...ARCTOR_CONTENT_LOCALES],
        localizationMissingLocales: [],
        localizationAttemptCount: attemptCount,
        localizationLastAttemptAt: now,
        localizationNextAttemptAt: null,
        localizationLastError: null,
        localizationCompletedAt: now,
      },
    };

    const { error: updateError } = await supabase
      .from("value_objects")
      .update({ metadata_json: nextMetadata })
      .eq("id", row.id)
      .eq("scope_code", "global")
      .eq("origin_type_code", "system_model");
    if (updateError) {
      throw new Error(
        `CURATOR_SYSTEM_LOCALIZATION_UPDATE_FAILED:${updateError.message}`,
      );
    }

    return { ok: true as const, state: "complete" as const, attemptCount };
  } catch (error) {
    return updateAttemptFailure({
      row,
      error:
        error instanceof Error
          ? error.message
          : "CURATOR_SYSTEM_LOCALIZATION_GENERATION_FAILED",
    });
  }
}

async function readCuratorSystemRows() {
  const { data, error } = await supabase
    .from("value_objects")
    .select("id,title,description,metadata_json,created_at,updated_at")
    .eq("scope_code", "global")
    .is("owner_user_id", null)
    .is("owner_actor_id", null)
    .eq("origin_type_code", "system_model")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(MAX_QUEUE_READ);
  if (error) {
    throw new Error(`CURATOR_SYSTEM_LOCALIZATION_QUEUE_READ_FAILED:${error.message}`);
  }
  return (data ?? []) as CuratorSystemRow[];
}

function rowToJob(row: CuratorSystemRow): CuratorSystemLocalizationJob | null {
  const metadata = asRecord(row.metadata_json);
  const draft = asRecord(metadata.curator_system_draft_v1);
  if (!draft.contract) return null;
  const title = cleanText(row.title);
  const description = cleanText(row.description);
  if (!title || !description) {
    return {
      id: row.id,
      title: title ?? row.id,
      description: description ?? "",
      state: "blocked",
      missingLocales: [...ARCTOR_CONTENT_LOCALES],
      attemptCount: finiteInteger(draft.localizationAttemptCount),
      lastAttemptAt: cleanText(draft.localizationLastAttemptAt),
      nextAttemptAt: null,
      lastError:
        cleanText(draft.localizationLastError) ??
        "CURATOR_SYSTEM_LOCALIZATION_CANONICAL_SOURCE_MISSING",
      createdAt: cleanText(row.created_at),
      updatedAt: cleanText(row.updated_at),
    };
  }
  const complete = hasCompleteCanonicalSystemValueObjectLocalizationV1({
    metadata,
    titleEn: title,
    descriptionEn: description,
  });
  const recordedState = normalizeState(draft.localizationState);
  const state: CuratorSystemLocalizationState = complete
    ? "complete"
    : recordedState === "complete"
      ? "retrying"
      : recordedState;
  return {
    id: row.id,
    title,
    description,
    state,
    missingLocales: complete ? [] : missingLocales(metadata),
    attemptCount: finiteInteger(draft.localizationAttemptCount),
    lastAttemptAt: cleanText(draft.localizationLastAttemptAt),
    nextAttemptAt: cleanText(draft.localizationNextAttemptAt),
    lastError: cleanText(draft.localizationLastError),
    createdAt: cleanText(row.created_at),
    updatedAt: cleanText(row.updated_at),
  };
}

export async function listCuratorSystemLocalizationJobsV1(input?: {
  includeComplete?: boolean;
}) {
  const rows = await readCuratorSystemRows();
  const jobs = rows
    .map(rowToJob)
    .filter((job): job is CuratorSystemLocalizationJob => Boolean(job))
    .filter((job) => input?.includeComplete === true || job.state !== "complete");
  return jobs;
}

export async function processCuratorSystemLocalizationQueueV1(input?: {
  limit?: number;
  force?: boolean;
  fallbackUserId?: string | null;
  fallbackActorId?: string | null;
}) {
  const limit = Math.min(
    Math.max(Number.isFinite(input?.limit) ? Math.trunc(input?.limit ?? 0) : MAX_BACKFILL_BATCH, 1),
    25,
  );
  const rows = await readCuratorSystemRows();
  const candidates = rows
    .filter((row) => {
      const job = rowToJob(row);
      if (!job || job.state === "complete" || job.state === "blocked") return false;
      if (input?.force) return true;
      if (!job.nextAttemptAt) return true;
      const parsed = Date.parse(job.nextAttemptAt);
      return !Number.isFinite(parsed) || parsed <= Date.now();
    })
    .slice(0, limit);

  const results = [];
  for (const row of candidates) {
    const result = await attemptCuratorSystemValueObjectLocalizationV1({
      valueObjectId: row.id,
      fallbackUserId: input?.fallbackUserId,
      fallbackActorId: input?.fallbackActorId,
      force: input?.force,
    });
    results.push({ id: row.id, ...result });
  }
  const jobs = await listCuratorSystemLocalizationJobsV1();
  return {
    attempted: candidates.length,
    completeNow: results.filter((item) => item.state === "complete").length,
    pending: jobs.filter((job) => job.state === "pending" || job.state === "retrying").length,
    blocked: jobs.filter((job) => job.state === "blocked").length,
    results,
  };
}

export async function backfillCuratorSystemValueObjectLocalizationsV1(input: {
  userId: string;
  actorId: string;
  limit?: number;
}) {
  const result = await processCuratorSystemLocalizationQueueV1({
    limit: input.limit ?? MAX_BACKFILL_BATCH,
    fallbackUserId: input.userId,
    fallbackActorId: input.actorId,
  });
  return {
    repaired: result.completeNow,
    pending: result.pending + result.blocked,
    warnings: result.results
      .filter((item) => item.state !== "complete" && item.error)
      .map((item) => `${item.id}:${item.error}`),
  };
}
