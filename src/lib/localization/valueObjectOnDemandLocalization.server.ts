import { createHash, randomUUID } from "node:crypto";

import { supabase } from "../../../lib/supabase";
import {
  generateLocalizedContentBatch,
} from "./contentLocalization.server";
import {
  isSupportedContentLocale,
  readLocalizedContentEnvelope,
  type ArctorContentLocale,
  type LocalizedContentFieldMap,
} from "./contentLocalization";

export const ARCTOR_VALUE_OBJECT_ON_DEMAND_LOCALIZATION_RUNTIME =
  "ARCTOR_VALUE_OBJECT_ON_DEMAND_LOCALIZATION_V1" as const;

const ENTITY_TYPE_CODE = "value_object";
const MAX_ENTITY_KEYS = 100;
const GENERATION_BATCH_SIZE = 5;
const GENERATION_BATCH_SOURCE_CHARS = 11_000;

export type ValueObjectLocalizedFieldCode = "title" | "description";

type ValueObjectSourceRow = {
  id: string;
  title: string | null;
  description: string | null;
  metadata_json?: Record<string, unknown> | null;
  owner_user_id: string | null;
  owner_actor_id: string | null;
  scope_code: string | null;
  origin_type_code: string | null;
};

type SourceRegistryRow = {
  entity_key: string;
  field_code: string;
  source_locale_code: string;
  source_revision: string;
};

type PlannerRow = {
  entity_key: string;
  field_code: string;
  target_locale_code: string;
  source_locale_code: string;
  source_revision: string;
  content_class_code: string;
  translation_policy_code: string;
  materialization_policy_code: string;
  localized_text: string | null;
  variant_source_revision: string | null;
  status_code: string | null;
  provider_code: string | null;
  human_locked: boolean;
  use_canonical_source: boolean;
  is_fresh: boolean;
  needs_generation: boolean;
  needs_review: boolean;
};

type PendingItem = {
  key: string;
  sourceLocale: ArctorContentLocale;
  fields: LocalizedContentFieldMap;
};

export type ValueObjectOnDemandLocalizationResult = {
  fieldsById: Map<
    string,
    Partial<Record<ValueObjectLocalizedFieldCode, string | null>>
  >;
  registeredFields: number;
  generatedFields: number;
  reusedFields: number;
  humanReviewFields: number;
  skippedUnknownSourceLocale: number;
  warnings: string[];
};

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function uniqueEntityKeys(value: string[]) {
  return Array.from(
    new Set(
      value
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_ENTITY_KEYS);
}

function normalizeFieldCodes(
  value: ValueObjectLocalizedFieldCode[] | undefined,
): ValueObjectLocalizedFieldCode[] {
  const requested = value?.length ? value : ["title", "description"];
  return Array.from(
    new Set(
      requested.filter(
        (fieldCode): fieldCode is ValueObjectLocalizedFieldCode =>
          fieldCode === "title" || fieldCode === "description",
      ),
    ),
  );
}

function sourceFieldValue(
  row: ValueObjectSourceRow,
  fieldCode: ValueObjectLocalizedFieldCode,
) {
  return fieldCode === "title"
    ? asText(row.title)
    : asText(row.description);
}

function sourceFieldRevision(input: {
  sourceLocale: ArctorContentLocale;
  fieldCode: ValueObjectLocalizedFieldCode;
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

function sourceLocaleFromRow(row: ValueObjectSourceRow) {
  const envelope = readLocalizedContentEnvelope(row.metadata_json);

  if (!envelope) {
    return null;
  }

  return envelope.detectedSourceLocale;
}

function plannerKey(entityKey: string, fieldCode: string) {
  return `${entityKey}\u0000${fieldCode}`;
}

function requestedSourceChars(fields: LocalizedContentFieldMap) {
  return Object.values(fields).reduce(
    (sum, value) => sum + (typeof value === "string" ? value.length : 0),
    0,
  );
}

function buildGenerationChunks(items: PendingItem[]) {
  const chunks: PendingItem[][] = [];
  let current: PendingItem[] = [];
  let currentChars = 0;

  for (const item of items) {
    const itemChars = requestedSourceChars(item.fields);

    if (
      current.length > 0 &&
      (current.length >= GENERATION_BATCH_SIZE ||
        currentChars + itemChars > GENERATION_BATCH_SOURCE_CHARS)
    ) {
      chunks.push(current);
      current = [];
      currentChars = 0;
    }

    current.push(item);
    currentChars += itemChars;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

async function readPlanner(
  entityKeys: string[],
  targetLocale: ArctorContentLocale,
  limit: number,
) {
  const { data, error } = await supabase.rpc(
    "get_platform_localization_batch_v1",
    {
      p_entity_type_code: ENTITY_TYPE_CODE,
      p_entity_keys: entityKeys,
      p_locale_code: targetLocale,
      p_limit: Math.min(Math.max(limit, 1), 2000),
    },
  );

  if (error) {
    throw new Error(
      `VALUE_OBJECT_ON_DEMAND_PLANNER_FAILED:${error.message}`,
    );
  }

  return (data ?? []) as PlannerRow[];
}

async function registerSourceField(input: {
  appUserId: string;
  entityKey: string;
  fieldCode: ValueObjectLocalizedFieldCode;
  sourceLocale: ArctorContentLocale;
  sourceRevision: string;
}) {
  const { error } = await supabase.rpc(
    "register_platform_localization_source_v1",
    {
      p_entity_type_code: ENTITY_TYPE_CODE,
      p_entity_key: input.entityKey,
      p_field_code: input.fieldCode,
      p_source_locale_code: input.sourceLocale,
      p_source_revision: input.sourceRevision,
      p_content_class_code: "user_content",
      p_updated_by_app_user_id: input.appUserId,
    },
  );

  if (error) {
    throw new Error(
      `VALUE_OBJECT_ON_DEMAND_SOURCE_REGISTER_FAILED:${input.entityKey}:${input.fieldCode}:${error.message}`,
    );
  }
}

async function writeLocalizedField(input: {
  entityKey: string;
  fieldCode: ValueObjectLocalizedFieldCode;
  targetLocale: ArctorContentLocale;
  value: string;
  sourceRevision: string;
  providerCode: "openai" | "human";
  statusCode: "current" | "needs_review";
  humanLocked: boolean;
  modelName: string | null;
  providerResponseId: string | null;
  aiAnalysisExecutionId: string | null;
  metadata: Record<string, unknown>;
}) {
  const { data, error } = await supabase.rpc(
    "upsert_platform_localized_content_v1",
    {
      p_entity_type_code: ENTITY_TYPE_CODE,
      p_entity_key: input.entityKey,
      p_field_code: input.fieldCode,
      p_locale_code: input.targetLocale,
      p_localized_text: input.value,
      p_source_revision: input.sourceRevision,
      p_provider_code: input.providerCode,
      p_status_code: input.statusCode,
      p_human_locked: input.humanLocked,
      p_model_name: input.modelName,
      p_provider_response_id: input.providerResponseId,
      p_ai_analysis_execution_id: input.aiAnalysisExecutionId,
      p_generation_metadata_json: input.metadata,
    },
  );

  if (error) {
    throw new Error(
      `VALUE_OBJECT_ON_DEMAND_VARIANT_WRITE_FAILED:${input.entityKey}:${input.fieldCode}:${input.targetLocale}:${error.message}`,
    );
  }

  return data as Record<string, unknown> | null;
}

function legacyHumanVariant(input: {
  row: ValueObjectSourceRow;
  targetLocale: ArctorContentLocale;
  fieldCode: ValueObjectLocalizedFieldCode;
}) {
  const envelope = readLocalizedContentEnvelope(input.row.metadata_json);

  if (
    !envelope ||
    !envelope.humanLocales.includes(input.targetLocale)
  ) {
    return null;
  }

  return asText(
    envelope.variants[input.targetLocale]?.[input.fieldCode],
  );
}

export async function ensureActorValueObjectLocalizationsV1(input: {
  appUserId: string;
  actorId: string;
  entityKeys: string[];
  targetLocale: unknown;
  fieldCodes?: ValueObjectLocalizedFieldCode[];
}): Promise<ValueObjectOnDemandLocalizationResult> {
  const result: ValueObjectOnDemandLocalizationResult = {
    fieldsById: new Map(),
    registeredFields: 0,
    generatedFields: 0,
    reusedFields: 0,
    humanReviewFields: 0,
    skippedUnknownSourceLocale: 0,
    warnings: [],
  };

  if (!isSupportedContentLocale(input.targetLocale)) {
    result.warnings.push("VALUE_OBJECT_ON_DEMAND_TARGET_LOCALE_INVALID");
    return result;
  }

  const targetLocale = input.targetLocale as ArctorContentLocale;
  const entityKeys = uniqueEntityKeys(input.entityKeys);
  const fieldCodes = normalizeFieldCodes(input.fieldCodes);

  if (entityKeys.length === 0 || fieldCodes.length === 0) {
    return result;
  }

  try {
    const { data, error } = await supabase
      .from("value_objects")
      .select(
        "id,title,description,owner_user_id,owner_actor_id,scope_code,origin_type_code",
      )
      .eq("owner_user_id", input.appUserId)
      .eq("owner_actor_id", input.actorId)
      .in("id", entityKeys);

    if (error) {
      throw new Error(
        `VALUE_OBJECT_ON_DEMAND_SOURCE_READ_FAILED:${error.message}`,
      );
    }

    const rows = (data ?? []) as ValueObjectSourceRow[];
    const rowById = new Map(rows.map((row) => [row.id, row]));

    const { data: registeredData, error: registeredError } = await supabase
      .from("platform_localization_sources_v1")
      .select("entity_key,field_code,source_locale_code,source_revision")
      .eq("entity_type_code", ENTITY_TYPE_CODE)
      .in("entity_key", entityKeys)
      .in("field_code", fieldCodes);

    if (registeredError) {
      throw new Error(
        `VALUE_OBJECT_ON_DEMAND_SOURCE_REGISTRY_READ_FAILED:${registeredError.message}`,
      );
    }

    const registeredRows = (registeredData ?? []) as SourceRegistryRow[];
    const registeredByField = new Map(
      registeredRows.map((row) => [
        plannerKey(row.entity_key, row.field_code),
        row,
      ]),
    );
    const registeredLocalesById = new Map<
      string,
      Set<ArctorContentLocale>
    >();
    const registeredFieldCodesById = new Map<string, Set<string>>();

    for (const registered of registeredRows) {
      if (isSupportedContentLocale(registered.source_locale_code)) {
        const locales =
          registeredLocalesById.get(registered.entity_key) ??
          new Set<ArctorContentLocale>();
        locales.add(registered.source_locale_code);
        registeredLocalesById.set(registered.entity_key, locales);
      }

      const codes =
        registeredFieldCodesById.get(registered.entity_key) ??
        new Set<string>();
      codes.add(registered.field_code);
      registeredFieldCodesById.set(registered.entity_key, codes);
    }

    // metadata_json may carry multiple locale variants and was the source of
    // the earlier egress problem. Read it only for a one-time/partial legacy
    // bootstrap, never for every normal localized catalog read.
    const metadataBootstrapIds = rows
      .filter((row) => {
        const registeredCodes =
          registeredFieldCodesById.get(row.id) ?? new Set<string>();
        return fieldCodes.some(
          (fieldCode) =>
            Boolean(sourceFieldValue(row, fieldCode)) &&
            !registeredCodes.has(fieldCode),
        );
      })
      .map((row) => row.id);

    if (metadataBootstrapIds.length > 0) {
      const { data: metadataData, error: metadataError } = await supabase
        .from("value_objects")
        .select("id,metadata_json")
        .eq("owner_user_id", input.appUserId)
        .eq("owner_actor_id", input.actorId)
        .in("id", metadataBootstrapIds);

      if (metadataError) {
        throw new Error(
          `VALUE_OBJECT_ON_DEMAND_LEGACY_METADATA_READ_FAILED:${metadataError.message}`,
        );
      }

      for (const metadataRow of (metadataData ?? []) as Array<{
        id: string;
        metadata_json: Record<string, unknown> | null;
      }>) {
        const current = rowById.get(metadataRow.id);

        if (current) {
          current.metadata_json = metadataRow.metadata_json;
        }
      }
    }

    const sourceLocaleById = new Map<string, ArctorContentLocale>();
    const revisionByField = new Map<string, string>();
    const desiredSources: Array<{
      entityKey: string;
      fieldCode: ValueObjectLocalizedFieldCode;
      sourceLocale: ArctorContentLocale;
      sourceRevision: string;
    }> = [];

    for (const row of rows) {
      const registeredLocales =
        registeredLocalesById.get(row.id) ?? new Set<ArctorContentLocale>();

      if (registeredLocales.size > 1) {
        result.warnings.push(
          `VALUE_OBJECT_ON_DEMAND_SOURCE_LOCALE_CONFLICT:${row.id}`,
        );
        continue;
      }

      const sourceLocale =
        registeredLocales.size === 1
          ? Array.from(registeredLocales)[0]
          : sourceLocaleFromRow(row);

      if (!sourceLocale) {
        result.skippedUnknownSourceLocale += 1;
        result.warnings.push(
          `VALUE_OBJECT_ON_DEMAND_SOURCE_LOCALE_UNKNOWN:${row.id}`,
        );
        continue;
      }

      sourceLocaleById.set(row.id, sourceLocale);

      for (const fieldCode of fieldCodes) {
        const value = sourceFieldValue(row, fieldCode);

        if (!value) {
          continue;
        }

        const revision = sourceFieldRevision({
          sourceLocale,
          fieldCode,
          value,
        });

        revisionByField.set(plannerKey(row.id, fieldCode), revision);
        desiredSources.push({
          entityKey: row.id,
          fieldCode,
          sourceLocale,
          sourceRevision: revision,
        });

        if (targetLocale === sourceLocale) {
          const fields = result.fieldsById.get(row.id) ?? {};
          fields[fieldCode] = value;
          result.fieldsById.set(row.id, fields);
        }
      }
    }

    const registeredEntityKeys = entityKeys.filter((entityKey) =>
      sourceLocaleById.has(entityKey),
    );

    for (const desired of desiredSources) {
      const existing = registeredByField.get(
        plannerKey(desired.entityKey, desired.fieldCode),
      );

      if (
        existing?.source_locale_code === desired.sourceLocale &&
        existing.source_revision === desired.sourceRevision
      ) {
        continue;
      }

      await registerSourceField({
        appUserId: input.appUserId,
        entityKey: desired.entityKey,
        fieldCode: desired.fieldCode,
        sourceLocale: desired.sourceLocale,
        sourceRevision: desired.sourceRevision,
      });

      result.registeredFields += 1;
    }

    if (registeredEntityKeys.length === 0) {
      return result;
    }

    let planner = await readPlanner(
      registeredEntityKeys,
      targetLocale,
      registeredEntityKeys.length * fieldCodes.length + 10,
    );

    // A legacy human locale in metadata_json is never silently replaced by AI.
    // Its exact source-revision provenance predates the new universal registry,
    // so import it conservatively as needs_review + human_locked.
    for (const plan of planner) {
      if (!plan.needs_generation) {
        continue;
      }

      const row = rowById.get(plan.entity_key);
      const fieldCode =
        plan.field_code === "title" || plan.field_code === "description"
          ? plan.field_code
          : null;

      if (!row || !fieldCode) {
        continue;
      }

      const humanValue = legacyHumanVariant({
        row,
        targetLocale,
        fieldCode,
      });

      if (!humanValue) {
        continue;
      }

      const sourceRevision = revisionByField.get(
        plannerKey(plan.entity_key, fieldCode),
      );

      if (!sourceRevision) {
        continue;
      }

      await writeLocalizedField({
        entityKey: plan.entity_key,
        fieldCode,
        targetLocale,
        value: humanValue,
        sourceRevision,
        providerCode: "human",
        statusCode: "needs_review",
        humanLocked: true,
        modelName: null,
        providerResponseId: null,
        aiAnalysisExecutionId: null,
        metadata: {
          runtime: ARCTOR_VALUE_OBJECT_ON_DEMAND_LOCALIZATION_RUNTIME,
          migrationKind: "legacy_human_locale_import",
          targetLocale,
        },
      });

      result.humanReviewFields += 1;
    }

    if (result.humanReviewFields > 0) {
      planner = await readPlanner(
        registeredEntityKeys,
        targetLocale,
        registeredEntityKeys.length * fieldCodes.length + 10,
      );
    }

    const pendingBySourceLocale = new Map<
      ArctorContentLocale,
      Map<string, LocalizedContentFieldMap>
    >();

    for (const plan of planner) {
      if (!plan.needs_generation) {
        continue;
      }

      const row = rowById.get(plan.entity_key);
      const sourceLocale = sourceLocaleById.get(plan.entity_key);
      const fieldCode =
        plan.field_code === "title" || plan.field_code === "description"
          ? plan.field_code
          : null;

      if (!row || !sourceLocale || !fieldCode) {
        continue;
      }

      const sourceValue = sourceFieldValue(row, fieldCode);

      if (!sourceValue) {
        continue;
      }

      let byEntity = pendingBySourceLocale.get(sourceLocale);

      if (!byEntity) {
        byEntity = new Map();
        pendingBySourceLocale.set(sourceLocale, byEntity);
      }

      const fields = byEntity.get(row.id) ?? {};
      fields[fieldCode] = sourceValue;
      byEntity.set(row.id, fields);
    }

    for (const [sourceLocale, byEntity] of pendingBySourceLocale) {
      const items: PendingItem[] = Array.from(byEntity.entries()).map(
        ([key, fields]) => ({
          key,
          sourceLocale,
          fields,
        }),
      );

      for (const chunk of buildGenerationChunks(items)) {
        const generated = await generateLocalizedContentBatch({
          userId: input.appUserId,
          actorId: input.actorId,
          operationId: randomUUID(),
          sourceLocaleHint: sourceLocale,
          targetLocales: [targetLocale],
          items: chunk.map((item) => ({
            key: item.key,
            fields: item.fields,
          })),
        });

        for (const item of chunk) {
          const envelope = generated.envelopes.get(item.key);

          if (!envelope) {
            result.warnings.push(
              `VALUE_OBJECT_ON_DEMAND_AI_RESULT_MISSING:${item.key}`,
            );
            continue;
          }

          for (const fieldCode of Object.keys(
            item.fields,
          ) as ValueObjectLocalizedFieldCode[]) {
            const translated = asText(
              envelope.variants[targetLocale]?.[fieldCode],
            );
            const sourceRevision = revisionByField.get(
              plannerKey(item.key, fieldCode),
            );

            if (!translated || !sourceRevision) {
              result.warnings.push(
                `VALUE_OBJECT_ON_DEMAND_AI_FIELD_MISSING:${item.key}:${fieldCode}:${targetLocale}`,
              );
              continue;
            }

            const writeResult = await writeLocalizedField({
              entityKey: item.key,
              fieldCode,
              targetLocale,
              value: translated,
              sourceRevision,
              providerCode: "openai",
              statusCode: "current",
              humanLocked: false,
              modelName: generated.model,
              providerResponseId: generated.usage.responseId,
              aiAnalysisExecutionId: generated.analysisExecutionId,
              metadata: {
                runtime: ARCTOR_VALUE_OBJECT_ON_DEMAND_LOCALIZATION_RUNTIME,
                targetLocale,
                sourceLocale,
                requestedLocales: [targetLocale],
              },
            });

            if (writeResult?.applied === false) {
              result.warnings.push(
                `VALUE_OBJECT_ON_DEMAND_WRITE_SKIPPED:${item.key}:${fieldCode}:${String(
                  writeResult.reason ?? "UNKNOWN",
                )}`,
              );
              continue;
            }

            result.generatedFields += 1;
          }
        }
      }
    }

    const finalPlanner = await readPlanner(
      registeredEntityKeys,
      targetLocale,
      registeredEntityKeys.length * fieldCodes.length + 10,
    );

    for (const plan of finalPlanner) {
      const fieldCode =
        plan.field_code === "title" || plan.field_code === "description"
          ? plan.field_code
          : null;

      if (!fieldCode) {
        continue;
      }

      const row = rowById.get(plan.entity_key);

      if (!row) {
        continue;
      }

      let value: string | null = null;

      if (plan.use_canonical_source) {
        value = sourceFieldValue(row, fieldCode);
      } else if (
        plan.localized_text &&
        (plan.is_fresh || plan.human_locked)
      ) {
        value = plan.localized_text;
      }

      if (value) {
        const fields = result.fieldsById.get(plan.entity_key) ?? {};
        fields[fieldCode] = value;
        result.fieldsById.set(plan.entity_key, fields);

        if (!plan.use_canonical_source && plan.is_fresh) {
          result.reusedFields += 1;
        }
      }
    }

    return result;
  } catch (error) {
    result.warnings.push(
      error instanceof Error
        ? error.message
        : "VALUE_OBJECT_ON_DEMAND_UNKNOWN_ERROR",
    );
    return result;
  }
}
