import { createHash, randomUUID } from "node:crypto";

import { supabase } from "../../../lib/supabase";
import {
  ARCTOR_CONTENT_LOCALES,
  isSupportedContentLocale,
  readLocalizedContentEnvelope,
  type ArctorContentLocale,
  type LocalizedContentEnvelope,
  type LocalizedContentFieldMap,
} from "./contentLocalization";
import {
  ARCTOR_CONTENT_LOCALIZATION_RUNTIME,
  generateLocalizedContentBatch,
  localizeEntityContent,
} from "./contentLocalization.server";

export const ARCTOR_VALUE_OBJECT_ALL_LOCALE_MATERIALIZATION_RUNTIME =
  "ARCTOR_VALUE_OBJECT_ALL_LOCALE_MATERIALIZATION_V1" as const;

const ENTITY_TYPE_CODE = "value_object";

export type ValueObjectMaterializationFieldCode = "title" | "description";

type ValueObjectRow = {
  id: string;
  title: string | null;
  description: string | null;
  metadata_json: Record<string, unknown> | null;
  owner_user_id: string | null;
  owner_actor_id: string | null;
};

type PlannerRow = {
  entity_key: string;
  field_code: string;
  target_locale_code: string;
  source_locale_code: string;
  source_revision: string;
  localized_text: string | null;
  status_code: string | null;
  provider_code: string | null;
  human_locked: boolean;
  use_canonical_source: boolean;
  is_fresh: boolean;
  needs_generation: boolean;
  needs_review: boolean;
};

export type ValueObjectAllLocaleMaterializationResult = {
  ok: true;
  entityId: string;
  fieldCodes: ValueObjectMaterializationFieldCode[];
  sourceLocale: ArctorContentLocale | null;
  aiGenerated: boolean;
  legacyEnvelopeComplete: boolean;
  platformWrites: number;
  preservedHumanPlatformValues: number;
  skippedFreshPlatformValues: number;
  complete: boolean;
  warnings: string[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeFieldCodes(
  value: ValueObjectMaterializationFieldCode[] | undefined,
): ValueObjectMaterializationFieldCode[] {
  const requested = value?.length ? value : ["title", "description"];
  return Array.from(
    new Set(
      requested.filter(
        (fieldCode): fieldCode is ValueObjectMaterializationFieldCode =>
          fieldCode === "title" || fieldCode === "description",
      ),
    ),
  );
}

function sourceRevision(input: {
  sourceLocale: ArctorContentLocale;
  fieldCode: ValueObjectMaterializationFieldCode;
  value: string;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        sourceLocale: input.sourceLocale,
        fieldCode: input.fieldCode,
        value: input.value,
      }),
      "utf8",
    )
    .digest("hex");
}

function plannerKey(
  fieldCode: ValueObjectMaterializationFieldCode,
  locale: ArctorContentLocale,
) {
  return `${fieldCode}::${locale}`;
}

function sourceValueFrom(
  row: ValueObjectRow,
  sourceFields: Partial<
    Record<ValueObjectMaterializationFieldCode, string | null>
  > | undefined,
  fieldCode: ValueObjectMaterializationFieldCode,
) {
  if (
    sourceFields &&
    Object.prototype.hasOwnProperty.call(sourceFields, fieldCode)
  ) {
    return asText(sourceFields[fieldCode]);
  }

  return fieldCode === "title"
    ? asText(row.title)
    : asText(row.description);
}

function hasCompleteEnvelope(
  envelope: LocalizedContentEnvelope | null,
  fieldCodes: ValueObjectMaterializationFieldCode[],
) {
  if (!envelope) return false;

  return fieldCodes.every((fieldCode) =>
    ARCTOR_CONTENT_LOCALES.every((locale) =>
      Boolean(asText(envelope.variants[locale]?.[fieldCode])),
    ),
  );
}

function envelopeMatchesCurrentSource(input: {
  envelope: LocalizedContentEnvelope | null;
  sourceLocale: ArctorContentLocale | null;
  fields: LocalizedContentFieldMap;
}) {
  if (!input.envelope || !input.sourceLocale) return false;

  return Object.entries(input.fields).every(([fieldCode, value]) => {
    const current = asText(value);
    if (!current) return true;

    const sourceVariant = asText(
      input.envelope?.variants[input.sourceLocale as ArctorContentLocale]?.[
        fieldCode
      ],
    );
    const original = asText(input.envelope?.original[fieldCode]);

    return sourceVariant === current || original === current;
  });
}

async function readOwnedValueObject(input: {
  appUserId: string;
  actorId: string;
  entityId: string;
}) {
  const { data, error } = await supabase
    .from("value_objects")
    .select(
      "id,title,description,metadata_json,owner_user_id,owner_actor_id",
    )
    .eq("id", input.entityId)
    .eq("owner_user_id", input.appUserId)
    .eq("owner_actor_id", input.actorId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `VALUE_OBJECT_ALL_LOCALE_READ_FAILED:${input.entityId}:${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      `VALUE_OBJECT_ALL_LOCALE_NOT_FOUND:${input.entityId}`,
    );
  }

  return data as ValueObjectRow;
}

async function writeLegacyEnvelope(input: {
  row: ValueObjectRow;
  envelope: LocalizedContentEnvelope;
}) {
  const metadata = asRecord(input.row.metadata_json);
  const { error } = await supabase
    .from("value_objects")
    .update({
      metadata_json: {
        ...metadata,
        localizedContent: input.envelope,
        contentLocalizationRuntime: ARCTOR_CONTENT_LOCALIZATION_RUNTIME,
      },
    })
    .eq("id", input.row.id)
    .eq("owner_user_id", input.row.owner_user_id)
    .eq("owner_actor_id", input.row.owner_actor_id);

  if (error) {
    throw new Error(
      `VALUE_OBJECT_ALL_LOCALE_LEGACY_WRITE_FAILED:${input.row.id}:${error.message}`,
    );
  }
}

async function registerSourceField(input: {
  appUserId: string;
  entityId: string;
  fieldCode: ValueObjectMaterializationFieldCode;
  sourceLocale: ArctorContentLocale;
  sourceRevision: string;
}) {
  const { error } = await supabase.rpc(
    "register_platform_localization_source_v1",
    {
      p_entity_type_code: ENTITY_TYPE_CODE,
      p_entity_key: input.entityId,
      p_field_code: input.fieldCode,
      p_source_locale_code: input.sourceLocale,
      p_source_revision: input.sourceRevision,
      p_content_class_code: "user_content",
      p_updated_by_app_user_id: input.appUserId,
    },
  );

  if (error) {
    throw new Error(
      `VALUE_OBJECT_ALL_LOCALE_SOURCE_REGISTER_FAILED:${input.entityId}:${input.fieldCode}:${error.message}`,
    );
  }
}

async function readPlannerForAllLocales(entityId: string) {
  const responses = await Promise.all(
    ARCTOR_CONTENT_LOCALES.map(async (locale) => {
      const { data, error } = await supabase.rpc(
        "get_platform_localization_batch_v1",
        {
          p_entity_type_code: ENTITY_TYPE_CODE,
          p_entity_keys: [entityId],
          p_locale_code: locale,
          p_limit: 20,
        },
      );

      if (error) {
        return {
          locale,
          rows: [] as PlannerRow[],
          error: error.message,
        };
      }

      return {
        locale,
        rows: (data ?? []) as PlannerRow[],
        error: null as string | null,
      };
    }),
  );

  const byKey = new Map<string, PlannerRow>();
  const warnings: string[] = [];

  for (const response of responses) {
    if (response.error) {
      warnings.push(
        `VALUE_OBJECT_ALL_LOCALE_PLANNER_FAILED:${entityId}:${response.locale}:${response.error}`,
      );
      continue;
    }

    for (const row of response.rows) {
      if (
        (row.field_code === "title" ||
          row.field_code === "description") &&
        isSupportedContentLocale(row.target_locale_code)
      ) {
        byKey.set(
          plannerKey(row.field_code, row.target_locale_code),
          row,
        );
      }
    }
  }

  return { byKey, warnings };
}

async function upsertVariant(input: {
  entityId: string;
  fieldCode: ValueObjectMaterializationFieldCode;
  locale: ArctorContentLocale;
  value: string;
  sourceRevision: string;
  providerCode: "openai" | "human";
  statusCode: "current" | "needs_review";
  humanLocked: boolean;
  modelName: string | null;
  providerResponseId: string | null;
}) {
  const { error } = await supabase.rpc(
    "upsert_platform_localized_content_v1",
    {
      p_entity_type_code: ENTITY_TYPE_CODE,
      p_entity_key: input.entityId,
      p_field_code: input.fieldCode,
      p_locale_code: input.locale,
      p_localized_text: input.value,
      p_source_revision: input.sourceRevision,
      p_provider_code: input.providerCode,
      p_status_code: input.statusCode,
      p_human_locked: input.humanLocked,
      p_model_name: input.modelName,
      p_provider_response_id: input.providerResponseId,
      p_ai_analysis_execution_id: null,
      p_generation_metadata_json: {
        runtime: ARCTOR_VALUE_OBJECT_ALL_LOCALE_MATERIALIZATION_RUNTIME,
        allLocales: true,
      },
    },
  );

  if (error) {
    throw new Error(
      `VALUE_OBJECT_ALL_LOCALE_VARIANT_WRITE_FAILED:${input.entityId}:${input.fieldCode}:${input.locale}:${error.message}`,
    );
  }
}

async function generateUnknownSourceEnvelope(input: {
  appUserId: string;
  actorId: string;
  row: ValueObjectRow;
  fields: LocalizedContentFieldMap;
}) {
  const generated = await generateLocalizedContentBatch({
    userId: input.appUserId,
    actorId: input.actorId,
    operationId: randomUUID(),
    sourceLocaleHint: "en",
    items: [
      {
        key: input.row.id,
        fields: input.fields,
      },
    ],
  });

  const envelope = generated.envelopes.get(input.row.id);

  if (!envelope) {
    throw new Error(
      `VALUE_OBJECT_ALL_LOCALE_GENERATION_RESULT_MISSING:${input.row.id}`,
    );
  }

  const detectedSourceLocale = envelope.detectedSourceLocale;
  const protectedEnvelope: LocalizedContentEnvelope = {
    ...envelope,
    humanLocales: Array.from(
      new Set<ArctorContentLocale>([
        ...envelope.humanLocales,
        detectedSourceLocale,
      ]),
    ),
    lastEditedLocale: detectedSourceLocale,
  };

  await writeLegacyEnvelope({
    row: input.row,
    envelope: protectedEnvelope,
  });

  return protectedEnvelope;
}

async function synchronizeEnvelopeToPlatform(input: {
  appUserId: string;
  row: ValueObjectRow;
  envelope: LocalizedContentEnvelope;
  sourceLocale: ArctorContentLocale;
  fields: LocalizedContentFieldMap;
  fieldCodes: ValueObjectMaterializationFieldCode[];
}) {
  const warnings: string[] = [];
  let platformWrites = 0;
  let preservedHumanPlatformValues = 0;
  let skippedFreshPlatformValues = 0;

  const revisions = new Map<ValueObjectMaterializationFieldCode, string>();

  for (const fieldCode of input.fieldCodes) {
    const sourceValue = asText(input.fields[fieldCode]);
    if (!sourceValue) continue;

    const revision = sourceRevision({
      sourceLocale: input.sourceLocale,
      fieldCode,
      value: sourceValue,
    });
    revisions.set(fieldCode, revision);

    try {
      await registerSourceField({
        appUserId: input.appUserId,
        entityId: input.row.id,
        fieldCode,
        sourceLocale: input.sourceLocale,
        sourceRevision: revision,
      });
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? error.message
          : `VALUE_OBJECT_ALL_LOCALE_SOURCE_REGISTER_FAILED:${input.row.id}:${fieldCode}`,
      );
    }
  }

  const planner = await readPlannerForAllLocales(input.row.id);
  warnings.push(...planner.warnings);

  if (planner.warnings.length > 0) {
    return {
      platformWrites,
      preservedHumanPlatformValues,
      skippedFreshPlatformValues,
      warnings,
      syncComplete: false,
    };
  }

  for (const fieldCode of input.fieldCodes) {
    const revision = revisions.get(fieldCode);
    const sourceValue = asText(input.fields[fieldCode]);

    if (!revision || !sourceValue) {
      continue;
    }

    for (const locale of ARCTOR_CONTENT_LOCALES) {
      const plan = planner.byKey.get(plannerKey(fieldCode, locale));
      const legacyHuman =
        input.envelope.humanLocales.includes(locale);
      const isSourceLocale = locale === input.sourceLocale;

      if (
        !isSourceLocale &&
        plan?.human_locked === true &&
        asText(plan.localized_text)
      ) {
        preservedHumanPlatformValues += 1;
        continue;
      }

      if (
        !isSourceLocale &&
        !legacyHuman &&
        plan &&
        plan.needs_generation === false &&
        plan.is_fresh === true &&
        asText(plan.localized_text)
      ) {
        skippedFreshPlatformValues += 1;
        continue;
      }

      const localizedValue = isSourceLocale
        ? sourceValue
        : asText(input.envelope.variants[locale]?.[fieldCode]);

      if (!localizedValue) {
        warnings.push(
          `VALUE_OBJECT_ALL_LOCALE_VARIANT_MISSING:${input.row.id}:${fieldCode}:${locale}`,
        );
        continue;
      }

      const humanLocked = isSourceLocale || legacyHuman;
      const providerCode: "openai" | "human" = humanLocked
        ? "human"
        : "openai";
      const statusCode: "current" | "needs_review" =
        humanLocked && !isSourceLocale ? "needs_review" : "current";

      try {
        await upsertVariant({
          entityId: input.row.id,
          fieldCode,
          locale,
          value: localizedValue,
          sourceRevision: revision,
          providerCode,
          statusCode,
          humanLocked,
          modelName:
            providerCode === "openai"
              ? input.envelope.model
              : null,
          providerResponseId:
            providerCode === "openai"
              ? input.envelope.responseId
              : null,
        });
        platformWrites += 1;
      } catch (error) {
        warnings.push(
          error instanceof Error
            ? error.message
            : `VALUE_OBJECT_ALL_LOCALE_VARIANT_WRITE_FAILED:${input.row.id}:${fieldCode}:${locale}`,
        );
      }
    }
  }

  return {
    platformWrites,
    preservedHumanPlatformValues,
    skippedFreshPlatformValues,
    warnings,
    syncComplete: warnings.length === 0,
  };
}

export async function materializeActorValueObjectAllLocalizationsV1(input: {
  appUserId: string;
  actorId: string;
  entityId: string;
  sourceLocaleHint?: unknown;
  fieldCodes?: ValueObjectMaterializationFieldCode[];
  sourceFields?: Partial<
    Record<ValueObjectMaterializationFieldCode, string | null>
  >;
}): Promise<ValueObjectAllLocaleMaterializationResult> {
  const warnings: string[] = [];
  const row = await readOwnedValueObject({
    appUserId: input.appUserId,
    actorId: input.actorId,
    entityId: input.entityId,
  });

  const fieldCodes = normalizeFieldCodes(input.fieldCodes);
  const fields: LocalizedContentFieldMap = {};

  for (const fieldCode of fieldCodes) {
    fields[fieldCode] = sourceValueFrom(
      row,
      input.sourceFields,
      fieldCode,
    );
  }

  const populatedFieldCodes = fieldCodes.filter((fieldCode) =>
    Boolean(asText(fields[fieldCode])),
  );

  if (populatedFieldCodes.length === 0) {
    return {
      ok: true,
      entityId: row.id,
      fieldCodes,
      sourceLocale: null,
      aiGenerated: false,
      legacyEnvelopeComplete: true,
      platformWrites: 0,
      preservedHumanPlatformValues: 0,
      skippedFreshPlatformValues: 0,
      complete: true,
      warnings,
    };
  }

  let envelope = readLocalizedContentEnvelope(row.metadata_json);
  const explicitSourceLocale = isSupportedContentLocale(
    input.sourceLocaleHint,
  )
    ? input.sourceLocaleHint
    : null;
  let sourceLocale: ArctorContentLocale | null =
    explicitSourceLocale ?? envelope?.detectedSourceLocale ?? null;

  const explicitChange =
    Boolean(input.sourceFields) &&
    populatedFieldCodes.some((fieldCode) =>
      Object.prototype.hasOwnProperty.call(
        input.sourceFields ?? {},
        fieldCode,
      ),
    );

  const legacyComplete = hasCompleteEnvelope(
    envelope,
    populatedFieldCodes,
  );
  const legacyMatches = envelopeMatchesCurrentSource({
    envelope,
    sourceLocale,
    fields,
  });

  let aiGenerated = false;

  if (
    explicitChange ||
    !envelope ||
    !legacyComplete ||
    !legacyMatches
  ) {
    if (sourceLocale) {
      const localization = await localizeEntityContent({
        userId: input.appUserId,
        actorId: input.actorId,
        operationId: randomUUID(),
        table: "value_objects",
        entityId: row.id,
        sourceLocaleHint: sourceLocale,
        fields: Object.fromEntries(
          populatedFieldCodes.map((fieldCode) => [
            fieldCode,
            fields[fieldCode],
          ]),
        ),
      });

      aiGenerated = localization.aiLocalized === true;

      if (localization.warning) {
        warnings.push(localization.warning);
      }

      const refreshed = await readOwnedValueObject({
        appUserId: input.appUserId,
        actorId: input.actorId,
        entityId: row.id,
      });
      row.metadata_json = refreshed.metadata_json;
      envelope = readLocalizedContentEnvelope(row.metadata_json);
    } else {
      envelope = await generateUnknownSourceEnvelope({
        appUserId: input.appUserId,
        actorId: input.actorId,
        row,
        fields: Object.fromEntries(
          populatedFieldCodes.map((fieldCode) => [
            fieldCode,
            fields[fieldCode],
          ]),
        ),
      });
      sourceLocale = envelope.detectedSourceLocale;
      aiGenerated = true;
      row.metadata_json = {
        ...asRecord(row.metadata_json),
        localizedContent: envelope,
        contentLocalizationRuntime: ARCTOR_CONTENT_LOCALIZATION_RUNTIME,
      };
    }
  }

  if (!envelope) {
    warnings.push(
      `VALUE_OBJECT_ALL_LOCALE_ENVELOPE_MISSING:${row.id}`,
    );

    return {
      ok: true,
      entityId: row.id,
      fieldCodes: populatedFieldCodes,
      sourceLocale,
      aiGenerated,
      legacyEnvelopeComplete: false,
      platformWrites: 0,
      preservedHumanPlatformValues: 0,
      skippedFreshPlatformValues: 0,
      complete: false,
      warnings,
    };
  }

  sourceLocale =
    explicitSourceLocale ??
    sourceLocale ??
    envelope.detectedSourceLocale;

  const finalLegacyComplete = hasCompleteEnvelope(
    envelope,
    populatedFieldCodes,
  );

  if (!finalLegacyComplete) {
    warnings.push(
      `VALUE_OBJECT_ALL_LOCALE_LEGACY_INCOMPLETE:${row.id}`,
    );
  }

  const sync = await synchronizeEnvelopeToPlatform({
    appUserId: input.appUserId,
    row,
    envelope,
    sourceLocale,
    fields,
    fieldCodes: populatedFieldCodes,
  });

  warnings.push(...sync.warnings);

  return {
    ok: true,
    entityId: row.id,
    fieldCodes: populatedFieldCodes,
    sourceLocale,
    aiGenerated,
    legacyEnvelopeComplete: finalLegacyComplete,
    platformWrites: sync.platformWrites,
    preservedHumanPlatformValues:
      sync.preservedHumanPlatformValues,
    skippedFreshPlatformValues:
      sync.skippedFreshPlatformValues,
    complete:
      finalLegacyComplete &&
      sync.syncComplete &&
      warnings.length === 0,
    warnings,
  };
}
