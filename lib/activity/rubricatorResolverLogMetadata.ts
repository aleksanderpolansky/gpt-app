type GenericRecord = Record<string, unknown>;

function asRecord(value: unknown): GenericRecord {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as GenericRecord;
  }

  return {};
}

function getString(row: GenericRecord, key: string): string | null {
  const value = row[key];

  return typeof value === "string" ? value : null;
}

function getBoolean(row: GenericRecord, key: string): boolean | null {
  const value = row[key];

  return typeof value === "boolean" ? value : null;
}

function getArray(row: GenericRecord, key: string): unknown[] {
  const value = row[key];

  return Array.isArray(value) ? value : [];
}

export function buildRubricatorResolverLogMetadata(lifecycleResult: unknown) {
  const result = asRecord(lifecycleResult);
  const metadata = asRecord(result.metadata);
  const ruleResolver = asRecord(metadata.ruleResolver);
  const diagnostics = asRecord(ruleResolver.diagnostics);

  return {
    source: getString(ruleResolver, "source"),
    selectedSource: getString(diagnostics, "selectedSource"),
    mode: getString(diagnostics, "mode"),
    requestedTemplateSlug: getString(diagnostics, "requestedTemplateSlug"),
    hardcodedRuleFound: getBoolean(diagnostics, "hardcodedRuleFound"),
    dbMetadataReadOk: getBoolean(diagnostics, "dbMetadataReadOk"),
    dbMetadataFound: getBoolean(diagnostics, "dbMetadataFound"),
    dbMetadataMatchesHardcoded: getBoolean(
      diagnostics,
      "dbMetadataMatchesHardcoded"
    ),
    mismatches: getArray(diagnostics, "mismatches"),
    warnings: getArray(diagnostics, "warnings"),
    errors: getArray(ruleResolver, "errors"),
  };
}
