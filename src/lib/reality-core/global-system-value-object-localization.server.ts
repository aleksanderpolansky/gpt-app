import { randomUUID } from "node:crypto";

import { supabase } from "../../../lib/supabase";
import {
  ARCTOR_CONTENT_LOCALES,
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
  "ARCTOR_SYSTEM_VALUE_OBJECT_CANONICAL_ENGLISH_LOCALIZATION_V1" as const;

const REQUIRED_FIELDS = ["title", "description"] as const;
const MAX_BACKFILL_BATCH = 5;

type JsonRecord = Record<string, unknown>;

type CuratorSystemRow = {
  id: string;
  title: string | null;
  description: string | null;
  metadata_json: Record<string, unknown> | null;
};

type HumanOverride = {
  title: string;
  description: string;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function cleanText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeLocale(value: unknown): ArctorContentLocale {
  const normalized = cleanText(value)?.toLowerCase() ?? "en";
  return ARCTOR_CONTENT_LOCALES.includes(normalized as ArctorContentLocale)
    ? (normalized as ArctorContentLocale)
    : "en";
}

function cloneVariants(envelope: LocalizedContentEnvelope) {
  return Object.fromEntries(
    ARCTOR_CONTENT_LOCALES.map((locale) => [
      locale,
      { ...(envelope.variants[locale] ?? {}) },
    ]),
  ) as Record<ArctorContentLocale, LocalizedContentFieldMap>;
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
        fields: {
          title: titleEn,
          description: descriptionEn,
        },
      },
    ],
  });

  const envelope = generated.envelopes.get(input.entityKey);
  if (!envelope) {
    throw new Error("CURATOR_SYSTEM_LOCALIZATION_RESULT_MISSING");
  }

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

export async function backfillCuratorSystemValueObjectLocalizationsV1(input: {
  userId: string;
  actorId: string;
  limit?: number;
}) {
  const limit = Math.min(
    Math.max(Number.isFinite(input.limit) ? Math.trunc(input.limit ?? 0) : MAX_BACKFILL_BATCH, 1),
    MAX_BACKFILL_BATCH,
  );

  const { data, error } = await supabase
    .from("value_objects")
    .select("id,title,description,metadata_json")
    .eq("scope_code", "global")
    .is("owner_user_id", null)
    .is("owner_actor_id", null)
    .eq("origin_type_code", "system_model")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(2000);

  if (error) {
    return {
      repaired: 0,
      pending: 0,
      warnings: [`CURATOR_SYSTEM_LOCALIZATION_BACKFILL_READ_FAILED:${error.message}`],
    };
  }

  const pending = ((data ?? []) as CuratorSystemRow[])
    .filter((row) => {
      const metadata = asRecord(row.metadata_json);
      if (!metadata.curator_system_draft_v1) return false;
      const titleEn = cleanText(row.title);
      const descriptionEn = cleanText(row.description);
      if (!titleEn || !descriptionEn) return true;
      return !hasCompleteCanonicalSystemValueObjectLocalizationV1({
        metadata,
        titleEn,
        descriptionEn,
      });
    })
    .slice(0, limit);

  if (pending.length === 0) {
    return { repaired: 0, pending: 0, warnings: [] as string[] };
  }

  const valid = pending.filter(
    (row) => cleanText(row.title) && cleanText(row.description),
  );
  const warnings: string[] = pending
    .filter((row) => !cleanText(row.title) || !cleanText(row.description))
    .map((row) => `CURATOR_SYSTEM_LOCALIZATION_CANONICAL_ENGLISH_MISSING:${row.id}`);

  if (valid.length === 0) {
    return { repaired: 0, pending: pending.length, warnings };
  }

  let generated;
  try {
    generated = await generateLocalizedContentBatch({
      userId: input.userId,
      actorId: input.actorId,
      operationId: randomUUID(),
      sourceLocaleHint: "en",
      targetLocales: [...ARCTOR_CONTENT_LOCALES],
      items: valid.map((row) => ({
        key: row.id,
        fields: {
          title: cleanText(row.title),
          description: cleanText(row.description),
        },
      })),
    });
  } catch (generationError) {
    warnings.push(
      generationError instanceof Error
        ? generationError.message
        : "CURATOR_SYSTEM_LOCALIZATION_BACKFILL_GENERATION_FAILED",
    );
    return { repaired: 0, pending: pending.length, warnings };
  }

  let repaired = 0;
  for (const row of valid) {
    const titleEn = cleanText(row.title);
    const descriptionEn = cleanText(row.description);
    const envelope = generated.envelopes.get(row.id);
    if (!titleEn || !descriptionEn || !envelope) {
      warnings.push(`CURATOR_SYSTEM_LOCALIZATION_BACKFILL_RESULT_MISSING:${row.id}`);
      continue;
    }

    const metadata = asRecord(row.metadata_json);
    const draft = asRecord(metadata.curator_system_draft_v1);
    const overrides = readHumanDraftOverrides(metadata);
    overrides.set("en", { title: titleEn, description: descriptionEn });
    const localized = applyCanonicalEnglishAndHumanOverrides({
      envelope,
      titleEn,
      descriptionEn,
      overrides,
      lastEditedLocale: normalizeLocale(draft.creationLocale ?? draft.locale ?? "en"),
    });

    if (
      !hasCompleteCanonicalSystemValueObjectLocalizationV1({
        metadata: { localizedContent: localized },
        titleEn,
        descriptionEn,
      })
    ) {
      warnings.push(`CURATOR_SYSTEM_LOCALIZATION_BACKFILL_INCOMPLETE:${row.id}`);
      continue;
    }

    const now = new Date().toISOString();
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
      warnings.push(
        `CURATOR_SYSTEM_LOCALIZATION_BACKFILL_UPDATE_FAILED:${row.id}:${updateError.message}`,
      );
      continue;
    }

    repaired += 1;
  }

  return {
    repaired,
    pending: Math.max(0, pending.length - repaired),
    warnings,
  };
}
