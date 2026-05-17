export const KNOWN_TEMPLATE_REGISTRY_TABLE_NAME =
  "activity_template_known_registry_rules";

export const KNOWN_TEMPLATE_REGISTRY_TABLE_SELECT_COLUMNS = [
  "id",
  "activity_template_id",
  "template_slug",
  "enabled",
  "rule_key",
  "source_type",
  "classification_role",
  "confidence",
  "registry_version",
  "priority",
  "object_type_code",
  "action_type_code",
  "context_code",
  "contextual_category_slug",
  "value_object_title",
  "value_object_type",
  "relation_type",
  "metric_key",
  "metric_unit",
  "delta_direction",
  "aggregate_type",
  "metadata_json",
  "created_at",
  "updated_at",
].join(", ");

export type KnownTemplateRegistryTableRow = {
  id: string;
  activity_template_id: string;
  template_slug: string;
  enabled: boolean;
  rule_key: string;
  source_type: string;
  classification_role: string;
  confidence: number;
  registry_version: string;
  priority: number;
  object_type_code: string;
  action_type_code: string;
  context_code: string;
  contextual_category_slug: string;
  value_object_title: string;
  value_object_type: string;
  relation_type: string;
  metric_key: string;
  metric_unit: string;
  delta_direction: string;
  aggregate_type: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type KnownTemplateRegistryTableSnapshot = {
  tableRowId: string;
  activityTemplateId: string;
  templateSlug: string;
  enabled: boolean;
  ruleKey: string;
  sourceType: string;
  classificationRole: string;
  confidence: number;
  registryVersion: string;
  priority: number;
  objectTypeCode: string;
  actionTypeCode: string;
  contextCode: string;
  contextualCategorySlug: string;
  valueObjectTitle: string;
  valueObjectType: string;
  relationType: string;
  metricKey: string;
  metricUnit: string;
  deltaDirection: string;
  aggregateType: string;
  metadataJson: Record<string, unknown>;
};

export type KnownTemplateRegistryTableReadDiagnostics = {
  diagnosticOnly: true;
  runtimeSwitchPerformed: false;
  resolverChanged: false;
  tableName: string;
  templateSlug: string;
  selectedSource: "registry_table" | null;
  rowFound: boolean;
  errors: string[];
  warnings: string[];
};

export type KnownTemplateRegistryTableReadResult =
  | {
      ok: true;
      row: KnownTemplateRegistryTableRow;
      snapshot: KnownTemplateRegistryTableSnapshot;
      diagnostics: KnownTemplateRegistryTableReadDiagnostics;
    }
  | {
      ok: false;
      reason: "not_found" | "db_error" | "invalid_row";
      row?: unknown;
      diagnostics: KnownTemplateRegistryTableReadDiagnostics;
    };

export type KnownTemplateRegistryTableParseResult =
  | {
      ok: true;
      row: KnownTemplateRegistryTableRow;
    }
  | {
      ok: false;
      errors: string[];
    };

export type KnownTemplateRegistryTableComparisonResult = {
  allMatched: boolean;
  comparedFields: Record<string, boolean>;
  missingExpectedFields: string[];
  warnings: string[];
};

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

type SupabaseMaybeSingleResult = {
  data: unknown;
  error: SupabaseErrorLike | null;
};

type SupabaseFilterBuilderLike = {
  eq: (column: string, value: string | number | boolean) => SupabaseFilterBuilderLike;
  maybeSingle: () => Promise<SupabaseMaybeSingleResult>;
};

type SupabaseSelectBuilderLike = {
  select: (columns: string) => SupabaseFilterBuilderLike;
};

export type KnownTemplateRegistryTableClient = {
  from: (tableName: string) => SupabaseSelectBuilderLike;
};

function createBaseDiagnostics(
  templateSlug: string
): KnownTemplateRegistryTableReadDiagnostics {
  return {
    diagnosticOnly: true,
    runtimeSwitchPerformed: false,
    resolverChanged: false,
    tableName: KNOWN_TEMPLATE_REGISTRY_TABLE_NAME,
    templateSlug,
    selectedSource: null,
    rowFound: false,
    errors: [],
    warnings: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(
  row: Record<string, unknown>,
  key: string,
  errors: string[]
): string {
  const value = row[key];

  if (typeof value !== "string") {
    errors.push(key + " must be a string.");
    return "";
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    errors.push(key + " must be a non-empty string.");
    return "";
  }

  return trimmedValue;
}

function readRequiredBoolean(
  row: Record<string, unknown>,
  key: string,
  errors: string[]
): boolean {
  const value = row[key];

  if (typeof value !== "boolean") {
    errors.push(key + " must be a boolean.");
    return false;
  }

  return value;
}

function readRequiredNumber(
  row: Record<string, unknown>,
  key: string,
  errors: string[]
): number {
  const value = row[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  errors.push(key + " must be a finite number.");
  return 0;
}

function readOptionalRecord(
  row: Record<string, unknown>,
  key: string,
  errors: string[]
): Record<string, unknown> {
  const value = row[key];

  if (value === null || value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    errors.push(key + " must be a JSON object when present.");
    return {};
  }

  return value;
}

function readPath(
  value: unknown,
  path: string[]
): unknown {
  let currentValue = value;

  for (const pathPart of path) {
    if (!isRecord(currentValue)) {
      return undefined;
    }

    currentValue = currentValue[pathPart];
  }

  return currentValue;
}

function readExpectedString(
  value: unknown,
  path: string[],
  missingExpectedFields: string[]
): string | null {
  const pathValue = readPath(value, path);
  const pathLabel = path.join(".");

  if (typeof pathValue !== "string" || pathValue.trim().length === 0) {
    missingExpectedFields.push(pathLabel);
    return null;
  }

  return pathValue.trim();
}

function readExpectedBooleanWithDefault(
  value: unknown,
  path: string[],
  defaultValue: boolean
): boolean {
  const pathValue = readPath(value, path);

  if (typeof pathValue === "boolean") {
    return pathValue;
  }

  return defaultValue;
}

function readExpectedNumberWithDefault(
  value: unknown,
  path: string[],
  defaultValue: number
): number {
  const pathValue = readPath(value, path);

  if (typeof pathValue === "number" && Number.isFinite(pathValue)) {
    return pathValue;
  }

  if (typeof pathValue === "string" && pathValue.trim().length > 0) {
    const parsedValue = Number(pathValue);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return defaultValue;
}

function formatSupabaseError(error: SupabaseErrorLike): string {
  const parts = [
    error.code,
    error.message,
    error.details,
    error.hint,
  ].filter((part): part is string =>
    typeof part === "string" && part.trim().length > 0
  );

  if (parts.length === 0) {
    return "Unknown Supabase error while reading known-template registry table.";
  }

  return parts.join(" | ");
}

export function parseKnownTemplateRegistryTableRow(
  input: unknown
): KnownTemplateRegistryTableParseResult {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return {
      ok: false,
      errors: ["Registry table row must be an object."],
    };
  }

  const confidence = readRequiredNumber(input, "confidence", errors);
  const priority = readRequiredNumber(input, "priority", errors);

  if (confidence < 0 || confidence > 1) {
    errors.push("confidence must be between 0 and 1.");
  }

  if (priority <= 0) {
    errors.push("priority must be greater than 0.");
  }

  const row: KnownTemplateRegistryTableRow = {
    id: readRequiredString(input, "id", errors),
    activity_template_id: readRequiredString(input, "activity_template_id", errors),
    template_slug: readRequiredString(input, "template_slug", errors),
    enabled: readRequiredBoolean(input, "enabled", errors),
    rule_key: readRequiredString(input, "rule_key", errors),
    source_type: readRequiredString(input, "source_type", errors),
    classification_role: readRequiredString(input, "classification_role", errors),
    confidence,
    registry_version: readRequiredString(input, "registry_version", errors),
    priority,
    object_type_code: readRequiredString(input, "object_type_code", errors),
    action_type_code: readRequiredString(input, "action_type_code", errors),
    context_code: readRequiredString(input, "context_code", errors),
    contextual_category_slug: readRequiredString(
      input,
      "contextual_category_slug",
      errors
    ),
    value_object_title: readRequiredString(input, "value_object_title", errors),
    value_object_type: readRequiredString(input, "value_object_type", errors),
    relation_type: readRequiredString(input, "relation_type", errors),
    metric_key: readRequiredString(input, "metric_key", errors),
    metric_unit: readRequiredString(input, "metric_unit", errors),
    delta_direction: readRequiredString(input, "delta_direction", errors),
    aggregate_type: readRequiredString(input, "aggregate_type", errors),
    metadata_json: readOptionalRecord(input, "metadata_json", errors),
    created_at: readRequiredString(input, "created_at", errors),
    updated_at: readRequiredString(input, "updated_at", errors),
  };

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    row,
  };
}

export function toKnownTemplateRegistryTableSnapshot(
  row: KnownTemplateRegistryTableRow
): KnownTemplateRegistryTableSnapshot {
  return {
    tableRowId: row.id,
    activityTemplateId: row.activity_template_id,
    templateSlug: row.template_slug,
    enabled: row.enabled,
    ruleKey: row.rule_key,
    sourceType: row.source_type,
    classificationRole: row.classification_role,
    confidence: row.confidence,
    registryVersion: row.registry_version,
    priority: row.priority,
    objectTypeCode: row.object_type_code,
    actionTypeCode: row.action_type_code,
    contextCode: row.context_code,
    contextualCategorySlug: row.contextual_category_slug,
    valueObjectTitle: row.value_object_title,
    valueObjectType: row.value_object_type,
    relationType: row.relation_type,
    metricKey: row.metric_key,
    metricUnit: row.metric_unit,
    deltaDirection: row.delta_direction,
    aggregateType: row.aggregate_type,
    metadataJson: row.metadata_json,
  };
}

export function compareKnownTemplateRegistryTableSnapshotToDefaultMetadata(
  snapshot: KnownTemplateRegistryTableSnapshot,
  defaultMetadataJson: unknown
): KnownTemplateRegistryTableComparisonResult {
  const missingExpectedFields: string[] = [];
  const warnings: string[] = [];

  const expectedEnabled = readExpectedBooleanWithDefault(
    defaultMetadataJson,
    ["knownTemplateRegistry", "enabled"],
    true
  );
  const expectedConfidence = readExpectedNumberWithDefault(
    defaultMetadataJson,
    ["knownTemplateRegistry", "confidence"],
    1
  );

  const comparedFields: Record<string, boolean> = {
    enabled: snapshot.enabled === expectedEnabled,
    ruleKey:
      snapshot.ruleKey ===
      readExpectedString(
        defaultMetadataJson,
        ["knownTemplateRegistry", "ruleKey"],
        missingExpectedFields
      ),
    sourceType:
      snapshot.sourceType ===
      readExpectedString(
        defaultMetadataJson,
        ["knownTemplateRegistry", "sourceType"],
        missingExpectedFields
      ),
    classificationRole:
      snapshot.classificationRole ===
      readExpectedString(
        defaultMetadataJson,
        ["knownTemplateRegistry", "classificationRole"],
        missingExpectedFields
      ),
    confidence: snapshot.confidence === expectedConfidence,
    registryVersion:
      snapshot.registryVersion ===
      readExpectedString(
        defaultMetadataJson,
        ["knownTemplateRegistry", "registryVersion"],
        missingExpectedFields
      ),
    objectTypeCode:
      snapshot.objectTypeCode ===
      readExpectedString(
        defaultMetadataJson,
        ["rubricatorCandidate", "objectTypeCode"],
        missingExpectedFields
      ),
    actionTypeCode:
      snapshot.actionTypeCode ===
      readExpectedString(
        defaultMetadataJson,
        ["rubricatorCandidate", "actionTypeCode"],
        missingExpectedFields
      ),
    contextCode:
      snapshot.contextCode ===
      readExpectedString(
        defaultMetadataJson,
        ["rubricatorCandidate", "contextCode"],
        missingExpectedFields
      ),
    contextualCategorySlug:
      snapshot.contextualCategorySlug ===
      readExpectedString(
        defaultMetadataJson,
        ["rubricatorCandidate", "contextualCategorySlug"],
        missingExpectedFields
      ),
    valueObjectTitle:
      snapshot.valueObjectTitle ===
      readExpectedString(
        defaultMetadataJson,
        ["valueObjectMapping", "valueObjectTitle"],
        missingExpectedFields
      ),
    valueObjectType:
      snapshot.valueObjectType ===
      readExpectedString(
        defaultMetadataJson,
        ["valueObjectMapping", "valueObjectType"],
        missingExpectedFields
      ),
    relationType:
      snapshot.relationType ===
      readExpectedString(
        defaultMetadataJson,
        ["valueObjectMapping", "relationType"],
        missingExpectedFields
      ),
    metricKey:
      snapshot.metricKey ===
      readExpectedString(
        defaultMetadataJson,
        ["valueObjectMapping", "metricKey"],
        missingExpectedFields
      ),
    metricUnit:
      snapshot.metricUnit ===
      readExpectedString(
        defaultMetadataJson,
        ["valueObjectMapping", "metricUnit"],
        missingExpectedFields
      ),
    deltaDirection:
      snapshot.deltaDirection ===
      readExpectedString(
        defaultMetadataJson,
        ["valueObjectMapping", "deltaDirection"],
        missingExpectedFields
      ),
    aggregateType:
      snapshot.aggregateType ===
      readExpectedString(
        defaultMetadataJson,
        ["valueObjectMapping", "aggregateType"],
        missingExpectedFields
      ),
  };

  if (missingExpectedFields.length > 0) {
    warnings.push(
      "Default metadata JSON is missing fields required for full table comparison."
    );
  }

  return {
    allMatched:
      missingExpectedFields.length === 0 &&
      Object.values(comparedFields).every(Boolean),
    comparedFields,
    missingExpectedFields,
    warnings,
  };
}

export async function readKnownTemplateRegistryTableRowBySlug(
  supabase: KnownTemplateRegistryTableClient,
  templateSlug: string
): Promise<KnownTemplateRegistryTableReadResult> {
  const diagnostics = createBaseDiagnostics(templateSlug);

  try {
    const { data, error } = await supabase
      .from(KNOWN_TEMPLATE_REGISTRY_TABLE_NAME)
      .select(KNOWN_TEMPLATE_REGISTRY_TABLE_SELECT_COLUMNS)
      .eq("template_slug", templateSlug)
      .eq("enabled", true)
      .maybeSingle();

    if (error) {
      diagnostics.errors.push(formatSupabaseError(error));

      return {
        ok: false,
        reason: "db_error",
        diagnostics,
      };
    }

    if (data === null || data === undefined) {
      diagnostics.warnings.push(
        "No enabled registry table row found for template slug."
      );

      return {
        ok: false,
        reason: "not_found",
        diagnostics,
      };
    }

    const parsedRow = parseKnownTemplateRegistryTableRow(data);

    if (!parsedRow.ok) {
      diagnostics.errors.push(...parsedRow.errors);

      return {
        ok: false,
        reason: "invalid_row",
        row: data,
        diagnostics,
      };
    }

    diagnostics.rowFound = true;
    diagnostics.selectedSource = "registry_table";

    return {
      ok: true,
      row: parsedRow.row,
      snapshot: toKnownTemplateRegistryTableSnapshot(parsedRow.row),
      diagnostics,
    };
  } catch (error) {
    diagnostics.errors.push(
      error instanceof Error
        ? error.message
        : "Unknown exception while reading known-template registry table."
    );

    return {
      ok: false,
      reason: "db_error",
      diagnostics,
    };
  }
}
