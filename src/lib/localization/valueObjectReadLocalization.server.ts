import { supabase } from "../../../lib/supabase";
import {
  normalizeContentLocale,
  resolveLocalizedContentFields,
  type ArctorContentLocale,
} from "./contentLocalization";

export const ARCTOR_VALUE_OBJECT_READ_LOCALIZATION_RUNTIME =
  "ARCTOR_VALUE_OBJECT_READ_LOCALIZATION_V1" as const;

const ENTITY_TYPE_CODE = "value_object";
const MAX_ENTITY_KEYS = 100;

export type ActorValueObjectReadFieldCode = "title" | "description";

export type ActorValueObjectReadEntity = {
  id: string;
  title?: unknown;
  description?: unknown;
  metadata_json?: unknown;
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

export type ActorValueObjectReadLocalizationResult = {
  fieldsById: Map<
    string,
    Partial<Record<ActorValueObjectReadFieldCode, string | null>>
  >;
  sourceByField: Map<string, "registry" | "legacy_or_canonical">;
  registryRows: number;
  registryValuesUsed: number;
  canonicalSourceValuesUsed: number;
  warnings: string[];
};

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function plannerKey(entityKey: string, fieldCode: ActorValueObjectReadFieldCode) {
  return `${entityKey}::${fieldCode}`;
}

function normalizeFieldCodes(
  value: ActorValueObjectReadFieldCode[] | undefined,
): ActorValueObjectReadFieldCode[] {
  const requested = value?.length ? value : ["title", "description"];
  return Array.from(
    new Set(
      requested.filter(
        (fieldCode): fieldCode is ActorValueObjectReadFieldCode =>
          fieldCode === "title" || fieldCode === "description",
      ),
    ),
  );
}

function uniqueEntities(value: ActorValueObjectReadEntity[]) {
  const byId = new Map<string, ActorValueObjectReadEntity>();

  for (const entity of value) {
    if (!entity || typeof entity.id !== "string" || !entity.id.trim()) {
      continue;
    }

    byId.set(entity.id.trim(), entity);
    if (byId.size >= MAX_ENTITY_KEYS) {
      break;
    }
  }

  return [...byId.values()];
}

function canonicalField(
  entity: ActorValueObjectReadEntity,
  fieldCode: ActorValueObjectReadFieldCode,
) {
  return fieldCode === "title"
    ? asText(entity.title)
    : asText(entity.description);
}

/**
 * Read-only localization resolver for actor-owned observation objects.
 *
 * Contract:
 * - NEVER registers localization sources;
 * - NEVER generates translations;
 * - NEVER writes localized variants;
 * - reads the universal localization planner/registry when available;
 * - falls back to legacy metadata_json.localizedContent;
 * - finally falls back to the caller-provided canonical/current text;
 * - registry failure must not make an observation-object read fail.
 *
 * Callers must pass only entities they have already authorized for the active actor.
 */
export async function resolveActorValueObjectReadLocalizationsV1(input: {
  entities: ActorValueObjectReadEntity[];
  targetLocale: unknown;
  fieldCodes?: ActorValueObjectReadFieldCode[];
}): Promise<ActorValueObjectReadLocalizationResult> {
  const targetLocale: ArctorContentLocale = normalizeContentLocale(
    input.targetLocale,
  );
  const entities = uniqueEntities(input.entities);
  const fieldCodes = normalizeFieldCodes(input.fieldCodes);

  const result: ActorValueObjectReadLocalizationResult = {
    fieldsById: new Map(),
    sourceByField: new Map(),
    registryRows: 0,
    registryValuesUsed: 0,
    canonicalSourceValuesUsed: 0,
    warnings: [],
  };

  if (entities.length === 0 || fieldCodes.length === 0) {
    return result;
  }

  const entityById = new Map(entities.map((entity) => [entity.id, entity]));

  // Build a completely local fallback first.
  for (const entity of entities) {
    const fallback = {
      title: canonicalField(entity, "title"),
      description: canonicalField(entity, "description"),
    };

    const legacyOrCanonical = resolveLocalizedContentFields({
      metadata: entity.metadata_json,
      locale: targetLocale,
      fallback,
    });

    const fields: Partial<
      Record<ActorValueObjectReadFieldCode, string | null>
    > = {};

    for (const fieldCode of fieldCodes) {
      fields[fieldCode] = asText(legacyOrCanonical[fieldCode]);
      result.sourceByField.set(
        plannerKey(entity.id, fieldCode),
        "legacy_or_canonical",
      );
    }

    result.fieldsById.set(entity.id, fields);
  }

  // Registry is an override only. Its failure must not break ordinary reads.
  const { data, error } = await supabase.rpc(
    "get_platform_localization_batch_v1",
    {
      p_entity_type_code: ENTITY_TYPE_CODE,
      p_entity_keys: entities.map((entity) => entity.id),
      p_locale_code: targetLocale,
      p_limit: Math.min(2000, entities.length * fieldCodes.length + 10),
    },
  );

  if (error) {
    result.warnings.push(
      `VALUE_OBJECT_READ_LOCALIZATION_REGISTRY_READ_FAILED:${error.message}`,
    );
    return result;
  }

  const plannerRows = (data ?? []) as PlannerRow[];
  result.registryRows = plannerRows.length;

  for (const plan of plannerRows) {
    if (
      (plan.field_code !== "title" && plan.field_code !== "description") ||
      !fieldCodes.includes(plan.field_code)
    ) {
      continue;
    }

    const fieldCode = plan.field_code;
    const entity = entityById.get(plan.entity_key);

    if (!entity) {
      continue;
    }

    const current = result.fieldsById.get(entity.id) ?? {};

    if (plan.use_canonical_source) {
      const canonical = canonicalField(entity, fieldCode);
      if (canonical) {
        current[fieldCode] = canonical;
        result.fieldsById.set(entity.id, current);
        result.sourceByField.set(plannerKey(entity.id, fieldCode), "registry");
        result.canonicalSourceValuesUsed += 1;
      }
      continue;
    }

    const localized = asText(plan.localized_text);

    // Human-locked text stays authoritative even while awaiting review.
    // Machine variants must be fresh before overriding the fallback.
    if (localized && (plan.is_fresh || plan.human_locked)) {
      current[fieldCode] = localized;
      result.fieldsById.set(entity.id, current);
      result.sourceByField.set(plannerKey(entity.id, fieldCode), "registry");
      result.registryValuesUsed += 1;
    }
  }

  return result;
}
