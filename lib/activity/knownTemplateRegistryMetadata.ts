import type { SupabaseClient } from "@supabase/supabase-js";

export type KnownTemplateRegistrySourceType = "system_seed";

export type KnownTemplateRegistryClassificationRole = "primary";

export type KnownTemplateRegistryVersion = "v0.1-default_metadata_json";

export type KnownTemplateValueObjectRelationType = "executes";

export type KnownTemplateMetricKey = "duration_minutes";

export type KnownTemplateMetricUnit = "minutes";

export type KnownTemplateDeltaDirection = "increase";

export type KnownTemplateAggregateType = "value_object";

export type KnownTemplateRegistryBlock = {
  enabled: boolean;
  ruleKey: string;
  templateSlug: string;
  sourceType: KnownTemplateRegistrySourceType;
  classificationRole: KnownTemplateRegistryClassificationRole;
  confidence: number;
  registryVersion: KnownTemplateRegistryVersion;
};

export type KnownTemplateRubricatorCandidate = {
  objectTypeCode: string;
  actionTypeCode: string;
  contextCode: string;
  contextualCategorySlug: string;
};

export type KnownTemplateValueObjectMapping = {
  valueObjectTitle: string;
  valueObjectType: string;
  relationType: KnownTemplateValueObjectRelationType;
  metricKey: KnownTemplateMetricKey;
  metricUnit: KnownTemplateMetricUnit;
  deltaDirection: KnownTemplateDeltaDirection;
  aggregateType: KnownTemplateAggregateType;
};

export type KnownTemplateRegistryMetadata = {
  templateId: string;
  templateSlug: string;
  templateTitle: string;
  defaultMetadataJson: Record<string, unknown>;
  knownTemplateRegistry: KnownTemplateRegistryBlock;
  rubricatorCandidate: KnownTemplateRubricatorCandidate;
  valueObjectTitle: string;
  valueObjectMapping: KnownTemplateValueObjectMapping;
};

export type KnownTemplateRegistryMetadataRow = {
  id: string;
  slug: string;
  title: string;
  status: string | null;
  is_active: boolean | null;
  default_metadata_json: Record<string, unknown> | null;
};

export type KnownTemplateRegistryMetadataValidationResult =
  | {
      ok: true;
      metadata: KnownTemplateRegistryMetadata;
      errors: [];
    }
  | {
      ok: false;
      metadata: null;
      errors: string[];
    };

export type ReadKnownTemplateRegistryMetadataResult =
  | {
      ok: true;
      found: true;
      metadata: KnownTemplateRegistryMetadata;
      errors: [];
    }
  | {
      ok: true;
      found: false;
      metadata: null;
      errors: [];
    }
  | {
      ok: false;
      found: false;
      metadata: null;
      errors: string[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  source: Record<string, unknown>,
  key: string,
  errors: string[],
  path: string
): string | null {
  const value = source[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path}.${key} must be a non-empty string`);
    return null;
  }

  return value;
}

function readBoolean(
  source: Record<string, unknown>,
  key: string,
  errors: string[],
  path: string
): boolean | null {
  const value = source[key];

  if (typeof value !== "boolean") {
    errors.push(`${path}.${key} must be a boolean`);
    return null;
  }

  return value;
}

function readNumber(
  source: Record<string, unknown>,
  key: string,
  errors: string[],
  path: string
): number | null {
  const value = source[key];

  if (typeof value !== "number" || Number.isNaN(value)) {
    errors.push(`${path}.${key} must be a number`);
    return null;
  }

  return value;
}

function readRecord(
  source: Record<string, unknown>,
  key: string,
  errors: string[],
  path: string
): Record<string, unknown> | null {
  const value = source[key];

  if (!isRecord(value)) {
    errors.push(`${path}.${key} must be an object`);
    return null;
  }

  return value;
}

function expectLiteral<T extends string>(
  value: string | null,
  expected: T,
  errors: string[],
  path: string
): T | null {
  if (value !== expected) {
    errors.push(`${path} must be "${expected}"`);
    return null;
  }

  return expected;
}

function parseKnownTemplateRegistryBlock(
  metadata: Record<string, unknown>,
  templateSlug: string,
  errors: string[]
): KnownTemplateRegistryBlock | null {
  const path = "default_metadata_json.knownTemplateRegistry";
  const block = readRecord(metadata, "knownTemplateRegistry", errors, "default_metadata_json");

  if (!block) {
    return null;
  }

  const enabled = readBoolean(block, "enabled", errors, path);
  const ruleKey = readString(block, "ruleKey", errors, path);
  const registryTemplateSlug = readString(block, "templateSlug", errors, path);
  const sourceTypeRaw = readString(block, "sourceType", errors, path);
  const classificationRoleRaw = readString(block, "classificationRole", errors, path);
  const confidence = readNumber(block, "confidence", errors, path);
  const registryVersionRaw = readString(block, "registryVersion", errors, path);

  const sourceType = expectLiteral(
    sourceTypeRaw,
    "system_seed",
    errors,
    `${path}.sourceType`
  );

  const classificationRole = expectLiteral(
    classificationRoleRaw,
    "primary",
    errors,
    `${path}.classificationRole`
  );

  const registryVersion = expectLiteral(
    registryVersionRaw,
    "v0.1-default_metadata_json",
    errors,
    `${path}.registryVersion`
  );

  if (enabled !== true) {
    errors.push(`${path}.enabled must be true`);
  }

  if (registryTemplateSlug !== templateSlug) {
    errors.push(`${path}.templateSlug must match activity_templates.slug`);
  }

  if (confidence !== 1) {
    errors.push(`${path}.confidence must be 1 for deterministic known-template registry v0.1`);
  }

  if (
    enabled === null ||
    ruleKey === null ||
    registryTemplateSlug === null ||
    sourceType === null ||
    classificationRole === null ||
    confidence === null ||
    registryVersion === null
  ) {
    return null;
  }

  return {
    enabled,
    ruleKey,
    templateSlug: registryTemplateSlug,
    sourceType,
    classificationRole,
    confidence,
    registryVersion,
  };
}

function parseRubricatorCandidate(
  metadata: Record<string, unknown>,
  errors: string[]
): KnownTemplateRubricatorCandidate | null {
  const path = "default_metadata_json.rubricatorCandidate";
  const block = readRecord(metadata, "rubricatorCandidate", errors, "default_metadata_json");

  if (!block) {
    return null;
  }

  const objectTypeCode = readString(block, "objectTypeCode", errors, path);
  const actionTypeCode = readString(block, "actionTypeCode", errors, path);
  const contextCode = readString(block, "contextCode", errors, path);
  const contextualCategorySlug = readString(block, "contextualCategorySlug", errors, path);

  if (
    objectTypeCode === null ||
    actionTypeCode === null ||
    contextCode === null ||
    contextualCategorySlug === null
  ) {
    return null;
  }

  return {
    objectTypeCode,
    actionTypeCode,
    contextCode,
    contextualCategorySlug,
  };
}

function parseValueObjectMapping(
  metadata: Record<string, unknown>,
  errors: string[]
): KnownTemplateValueObjectMapping | null {
  const path = "default_metadata_json.valueObjectMapping";
  const block = readRecord(metadata, "valueObjectMapping", errors, "default_metadata_json");

  if (!block) {
    return null;
  }

  const valueObjectTitle = readString(block, "valueObjectTitle", errors, path);
  const valueObjectType = readString(block, "valueObjectType", errors, path);
  const relationTypeRaw = readString(block, "relationType", errors, path);
  const metricKeyRaw = readString(block, "metricKey", errors, path);
  const metricUnitRaw = readString(block, "metricUnit", errors, path);
  const deltaDirectionRaw = readString(block, "deltaDirection", errors, path);
  const aggregateTypeRaw = readString(block, "aggregateType", errors, path);

  const relationType = expectLiteral(
    relationTypeRaw,
    "executes",
    errors,
    `${path}.relationType`
  );

  const metricKey = expectLiteral(
    metricKeyRaw,
    "duration_minutes",
    errors,
    `${path}.metricKey`
  );

  const metricUnit = expectLiteral(metricUnitRaw, "minutes", errors, `${path}.metricUnit`);

  const deltaDirection = expectLiteral(
    deltaDirectionRaw,
    "increase",
    errors,
    `${path}.deltaDirection`
  );

  const aggregateType = expectLiteral(
    aggregateTypeRaw,
    "value_object",
    errors,
    `${path}.aggregateType`
  );

  if (
    valueObjectTitle === null ||
    valueObjectType === null ||
    relationType === null ||
    metricKey === null ||
    metricUnit === null ||
    deltaDirection === null ||
    aggregateType === null
  ) {
    return null;
  }

  return {
    valueObjectTitle,
    valueObjectType,
    relationType,
    metricKey,
    metricUnit,
    deltaDirection,
    aggregateType,
  };
}

export function parseKnownTemplateRegistryMetadataRow(
  row: KnownTemplateRegistryMetadataRow
): KnownTemplateRegistryMetadataValidationResult {
  const errors: string[] = [];

  if (typeof row.id !== "string" || row.id.trim().length === 0) {
    errors.push("activity_templates.id must be a non-empty string");
  }

  if (typeof row.slug !== "string" || row.slug.trim().length === 0) {
    errors.push("activity_templates.slug must be a non-empty string");
  }

  if (typeof row.title !== "string" || row.title.trim().length === 0) {
    errors.push("activity_templates.title must be a non-empty string");
  }

  if (row.status !== "active") {
    errors.push("activity_templates.status must be active");
  }

  if (row.is_active !== true) {
    errors.push("activity_templates.is_active must be true");
  }

  if (!isRecord(row.default_metadata_json)) {
    errors.push("activity_templates.default_metadata_json must be an object");
    return {
      ok: false,
      metadata: null,
      errors,
    };
  }

  const metadataJson = row.default_metadata_json;
  const registry = parseKnownTemplateRegistryBlock(metadataJson, row.slug, errors);
  const rubricatorCandidate = parseRubricatorCandidate(metadataJson, errors);
  const valueObjectTitle = readString(
    metadataJson,
    "valueObjectTitle",
    errors,
    "default_metadata_json"
  );
  const valueObjectMapping = parseValueObjectMapping(metadataJson, errors);

  if (
    registry === null ||
    rubricatorCandidate === null ||
    valueObjectTitle === null ||
    valueObjectMapping === null
  ) {
    return {
      ok: false,
      metadata: null,
      errors,
    };
  }

  if (valueObjectTitle !== valueObjectMapping.valueObjectTitle) {
    errors.push(
      "default_metadata_json.valueObjectTitle must match valueObjectMapping.valueObjectTitle"
    );
  }

  if (errors.length > 0) {
    return {
      ok: false,
      metadata: null,
      errors,
    };
  }

  return {
    ok: true,
    metadata: {
      templateId: row.id,
      templateSlug: row.slug,
      templateTitle: row.title,
      defaultMetadataJson: metadataJson,
      knownTemplateRegistry: registry,
      rubricatorCandidate,
      valueObjectTitle,
      valueObjectMapping,
    },
    errors: [],
  };
}

export async function readKnownTemplateRegistryMetadataBySlug(
  supabase: SupabaseClient,
  templateSlug: string
): Promise<ReadKnownTemplateRegistryMetadataResult> {
  if (templateSlug.trim().length === 0) {
    return {
      ok: false,
      found: false,
      metadata: null,
      errors: ["templateSlug must be a non-empty string"],
    };
  }

  const { data, error } = await supabase
    .from("activity_templates")
    .select("id, slug, title, status, is_active, default_metadata_json")
    .eq("slug", templateSlug)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      found: false,
      metadata: null,
      errors: [`Failed to read activity template metadata: ${error.message}`],
    };
  }

  if (!data) {
    return {
      ok: true,
      found: false,
      metadata: null,
      errors: [],
    };
  }

  const validation = parseKnownTemplateRegistryMetadataRow(
    data as KnownTemplateRegistryMetadataRow
  );

  if (!validation.ok) {
    return {
      ok: false,
      found: false,
      metadata: null,
      errors: validation.errors,
    };
  }

  return {
    ok: true,
    found: true,
    metadata: validation.metadata,
    errors: [],
  };
}

export async function readKnownTemplateRegistryMetadataById(
  supabase: SupabaseClient,
  templateId: string
): Promise<ReadKnownTemplateRegistryMetadataResult> {
  if (templateId.trim().length === 0) {
    return {
      ok: false,
      found: false,
      metadata: null,
      errors: ["templateId must be a non-empty string"],
    };
  }

  const { data, error } = await supabase
    .from("activity_templates")
    .select("id, slug, title, status, is_active, default_metadata_json")
    .eq("id", templateId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      found: false,
      metadata: null,
      errors: [`Failed to read activity template metadata: ${error.message}`],
    };
  }

  if (!data) {
    return {
      ok: true,
      found: false,
      metadata: null,
      errors: [],
    };
  }

  const validation = parseKnownTemplateRegistryMetadataRow(
    data as KnownTemplateRegistryMetadataRow
  );

  if (!validation.ok) {
    return {
      ok: false,
      found: false,
      metadata: null,
      errors: validation.errors,
    };
  }

  return {
    ok: true,
    found: true,
    metadata: validation.metadata,
    errors: [],
  };
}

export function summarizeKnownTemplateRegistryMetadata(
  metadata: KnownTemplateRegistryMetadata
): Record<string, unknown> {
  return {
    templateId: metadata.templateId,
    templateSlug: metadata.templateSlug,
    templateTitle: metadata.templateTitle,
    ruleKey: metadata.knownTemplateRegistry.ruleKey,
    registryVersion: metadata.knownTemplateRegistry.registryVersion,
    rubricatorCandidate: metadata.rubricatorCandidate,
    valueObjectTitle: metadata.valueObjectTitle,
    valueObjectMapping: metadata.valueObjectMapping,
  };
}
