import { createHash, randomUUID } from "node:crypto";

import { supabase } from "../../../lib/supabase";
import {
  ARCTOR_CONTENT_LOCALIZATION_RUNTIME,
  generateLocalizedContentBatch,
} from "../localization/contentLocalization.server";
import {
  isSupportedContentLocale,
  readLocalizedContentEnvelope,
  type ArctorContentLocale,
  type LocalizedContentEnvelope,
  type LocalizedContentFieldMap,
} from "../localization/contentLocalization";

export const ARCTOR_MESSAGE_OBJECT_ON_DEMAND_LOCALIZATION_RUNTIME =
  "ARCTOR_MESSAGE_OBJECT_ON_DEMAND_LOCALIZATION_V1" as const;

const MAX_BATCH_ITEMS = 5;

type JsonRecord = Record<string, unknown>;

export type MessageObjectLocalizationSource = {
  id: string;
  ownerUserId: string | null;
  createdByActorId: string | null;
  sourceLocaleHint: string | null;
  contentText: string | null;
  metadataJson: JsonRecord | null;
};

export type MessageObjectLocalizationResult = {
  contentTextById: Map<string, string>;
  generatedMessages: number;
  reusedMessages: number;
  warnings: string[];
};

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sourceRevision(input: {
  sourceLocaleHint: ArctorContentLocale;
  fields: LocalizedContentFieldMap;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        sourceLocaleHint: input.sourceLocaleHint,
        fields: input.fields,
      }),
      "utf8",
    )
    .digest("hex");
}

function cloneVariants(
  source: LocalizedContentEnvelope | null,
): LocalizedContentEnvelope["variants"] {
  const variants = {} as LocalizedContentEnvelope["variants"];

  for (const locale of ["en", "pl", "ru", "uk", "de", "es", "cs"] as const) {
    variants[locale] = {
      ...(source?.variants?.[locale] ?? {}),
    };
  }

  return variants;
}

function mergeTargetEnvelope(input: {
  existing: LocalizedContentEnvelope | null;
  generated: LocalizedContentEnvelope;
  targetLocale: ArctorContentLocale;
  contentText: string;
}) {
  const fieldCodes = Array.from(
    new Set([...(input.existing?.fieldCodes ?? []), "contentText"]),
  );
  const variants = cloneVariants(input.existing);
  const humanLocales = new Set(input.existing?.humanLocales ?? []);
  const generatedTarget = asText(
    input.generated.variants[input.targetLocale]?.contentText,
  );

  if (!humanLocales.has(input.targetLocale) && generatedTarget) {
    variants[input.targetLocale] = {
      ...variants[input.targetLocale],
      contentText: generatedTarget,
    };
  }

  if (!humanLocales.has(input.generated.detectedSourceLocale)) {
    variants[input.generated.detectedSourceLocale] = {
      ...variants[input.generated.detectedSourceLocale],
      contentText: input.contentText,
    };
  }

  return {
    ...input.generated,
    fieldCodes,
    original: {
      ...(input.existing?.original ?? {}),
      contentText: input.contentText,
    },
    variants,
    humanLocales: Array.from(humanLocales),
    lastEditedLocale: input.existing?.lastEditedLocale ?? null,
  } satisfies LocalizedContentEnvelope;
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}

export async function ensurePublicMessageObjectLocalizationsV1(input: {
  targetLocale: unknown;
  messages: MessageObjectLocalizationSource[];
}): Promise<MessageObjectLocalizationResult> {
  const result: MessageObjectLocalizationResult = {
    contentTextById: new Map(),
    generatedMessages: 0,
    reusedMessages: 0,
    warnings: [],
  };

  for (const message of input.messages) {
    if (message.contentText) {
      result.contentTextById.set(message.id, message.contentText);
    }
  }

  if (!isSupportedContentLocale(input.targetLocale)) {
    result.warnings.push("MESSAGE_LOCALIZATION_TARGET_LOCALE_INVALID");
    return result;
  }

  const targetLocale = input.targetLocale as ArctorContentLocale;

  type Pending = {
    message: MessageObjectLocalizationSource;
    sourceLocaleHint: ArctorContentLocale;
    revision: string;
    existing: LocalizedContentEnvelope | null;
  };

  const pendingGroups = new Map<string, Pending[]>();

  for (const message of input.messages) {
    const contentText = asText(message.contentText);

    if (!contentText) {
      continue;
    }

    if (!isSupportedContentLocale(message.sourceLocaleHint)) {
      result.warnings.push(
        `MESSAGE_LOCALIZATION_SOURCE_LOCALE_UNKNOWN:${message.id}`,
      );
      continue;
    }

    if (!message.ownerUserId || !message.createdByActorId) {
      result.warnings.push(
        `MESSAGE_LOCALIZATION_BILLING_IDENTITY_MISSING:${message.id}`,
      );
      continue;
    }

    const sourceLocaleHint = message.sourceLocaleHint as ArctorContentLocale;
    const fields: LocalizedContentFieldMap = { contentText };
    const revision = sourceRevision({ sourceLocaleHint, fields });
    const existing = readLocalizedContentEnvelope(message.metadataJson);
    const existingValue =
      existing?.sourceRevision === revision
        ? asText(existing.variants[targetLocale]?.contentText)
        : null;

    if (existingValue) {
      result.contentTextById.set(message.id, existingValue);
      result.reusedMessages += 1;
      continue;
    }

    const groupKey = [
      message.ownerUserId,
      message.createdByActorId,
      sourceLocaleHint,
    ].join("|");
    const group = pendingGroups.get(groupKey) ?? [];
    group.push({ message, sourceLocaleHint, revision, existing });
    pendingGroups.set(groupKey, group);
  }

  for (const group of pendingGroups.values()) {
    const first = group[0];

    if (!first?.message.ownerUserId || !first.message.createdByActorId) {
      continue;
    }

    for (const batch of chunk(group, MAX_BATCH_ITEMS)) {
      try {
        const generated = await generateLocalizedContentBatch({
          userId: first.message.ownerUserId,
          actorId: first.message.createdByActorId,
          operationId: randomUUID(),
          sourceLocaleHint: first.sourceLocaleHint,
          targetLocales: [targetLocale],
          items: batch.map((item) => ({
            key: item.message.id,
            fields: {
              contentText: item.message.contentText,
            },
          })),
        });

        for (const item of batch) {
          const contentText = asText(item.message.contentText);
          const generatedEnvelope = generated.envelopes.get(item.message.id);

          if (!contentText || !generatedEnvelope) {
            result.warnings.push(
              `MESSAGE_LOCALIZATION_AI_RESULT_MISSING:${item.message.id}`,
            );
            continue;
          }

          const merged = mergeTargetEnvelope({
            existing:
              item.existing?.sourceRevision === item.revision
                ? item.existing
                : null,
            generated: generatedEnvelope,
            targetLocale,
            contentText,
          });
          const localizedValue = asText(
            merged.variants[targetLocale]?.contentText,
          );

          if (localizedValue) {
            result.contentTextById.set(item.message.id, localizedValue);
          }

          const currentMetadata = item.message.metadataJson ?? {};
          const { error } = await supabase
            .from("message_objects")
            .update({
              metadata_json: {
                ...currentMetadata,
                localizedContent: merged,
                contentLocalizationRuntime: ARCTOR_CONTENT_LOCALIZATION_RUNTIME,
                messageLocalizationRuntime:
                  ARCTOR_MESSAGE_OBJECT_ON_DEMAND_LOCALIZATION_RUNTIME,
              },
            })
            .eq("id", item.message.id)
            .eq("owner_user_id", item.message.ownerUserId)
            .eq("created_by_actor_id", item.message.createdByActorId);

          if (error) {
            result.warnings.push(
              `MESSAGE_LOCALIZATION_CACHE_WRITE_FAILED:${item.message.id}:${error.message}`,
            );
          }

          result.generatedMessages += 1;
        }
      } catch (error) {
        result.warnings.push(
          error instanceof Error
            ? error.message
            : "MESSAGE_LOCALIZATION_BATCH_FAILED",
        );
      }
    }
  }

  return result;
}
