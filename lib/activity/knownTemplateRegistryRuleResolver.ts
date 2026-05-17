import type { SupabaseClient } from "@supabase/supabase-js";
import {
  KNOWN_TEMPLATE_RUBRICATOR_CLASSIFICATION_RULES,
  type KnownTemplateRubricatorClassificationRule,
} from "./knownTemplateRubricatorRules";
import {
  readKnownTemplateRegistryMetadataBySlug,
  summarizeKnownTemplateRegistryMetadata,
  type KnownTemplateRegistryMetadata,
} from "./knownTemplateRegistryMetadata";
import {
  readKnownTemplateRegistryTableRowBySlug,
  type KnownTemplateRegistryTableClient,
  type KnownTemplateRegistryTableSnapshot,
} from "./knownTemplateRegistryTable";

export type KnownTemplateRuleResolverSource =
  | "registry_table"
  | "db_metadata"
  | "hardcoded_fallback";

export type KnownTemplateRuleResolverMode =
  | "prefer_registry_table"
  | "prefer_db_metadata"
  | "hardcoded_only";

export type KnownTemplateRuleResolverDiagnostics = {
  requestedTemplateSlug: string;
  mode: KnownTemplateRuleResolverMode;
  hardcodedRuleFound: boolean;

  registryTableReadOk: boolean | null;
  registryTableFound: boolean | null;
  registryTableMatchesHardcoded: boolean | null;
  registryTableSummary: Record<string, unknown> | null;
  registryTableErrors: string[];
  registryTableWarnings: string[];

  dbMetadataReadOk: boolean | null;
  dbMetadataFound: boolean | null;
  dbMetadataMatchesHardcoded: boolean | null;
  dbMetadataSummary: Record<string, unknown> | null;

  selectedSource: KnownTemplateRuleResolverSource | null;
  mismatches: string[];
  warnings: string[];
};

export type ResolveKnownTemplateRubricatorClassificationRuleInput = {
  supabase: SupabaseClient;
  templateSlug: string;
  mode?: KnownTemplateRuleResolverMode;
};

export type ResolveKnownTemplateRubricatorClassificationRuleResult =
  | {
      ok: true;
      rule: KnownTemplateRubricatorClassificationRule;
      source: KnownTemplateRuleResolverSource;
      diagnostics: KnownTemplateRuleResolverDiagnostics;
      errors: [];
    }
  | {
      ok: false;
      rule: null;
      source: null;
      diagnostics: KnownTemplateRuleResolverDiagnostics;
      errors: string[];
    };

function createBaseDiagnostics(
  templateSlug: string,
  mode: KnownTemplateRuleResolverMode
): KnownTemplateRuleResolverDiagnostics {
  return {
    requestedTemplateSlug: templateSlug,
    mode,
    hardcodedRuleFound: false,

    registryTableReadOk: null,
    registryTableFound: null,
    registryTableMatchesHardcoded: null,
    registryTableSummary: null,
    registryTableErrors: [],
    registryTableWarnings: [],

    dbMetadataReadOk: null,
    dbMetadataFound: null,
    dbMetadataMatchesHardcoded: null,
    dbMetadataSummary: null,

    selectedSource: null,
    mismatches: [],
    warnings: [],
  };
}

export function findHardcodedKnownTemplateRuleBySlug(
  templateSlug: string
): KnownTemplateRubricatorClassificationRule | null {
  return (
    KNOWN_TEMPLATE_RUBRICATOR_CLASSIFICATION_RULES.find(
      (rule) => rule.templateSlug === templateSlug
    ) ?? null
  );
}

function pushMismatch(
  mismatches: string[],
  field: string,
  hardcodedValue: unknown,
  candidateValue: unknown,
  candidateLabel: string
): void {
  if (hardcodedValue !== candidateValue) {
    mismatches.push(
      `${field}: hardcoded="${String(hardcodedValue)}" ${candidateLabel}="${String(
        candidateValue
      )}"`
    );
  }
}

export function compareKnownTemplateDbMetadataWithHardcodedRule(
  metadata: KnownTemplateRegistryMetadata,
  hardcodedRule: KnownTemplateRubricatorClassificationRule
): string[] {
  const mismatches: string[] = [];

  pushMismatch(
    mismatches,
    "templateSlug",
    hardcodedRule.templateSlug,
    metadata.templateSlug,
    "db"
  );

  pushMismatch(
    mismatches,
    "ruleKey",
    hardcodedRule.ruleKey,
    metadata.knownTemplateRegistry.ruleKey,
    "db"
  );

  pushMismatch(
    mismatches,
    "objectTypeCode",
    hardcodedRule.objectTypeCode,
    metadata.rubricatorCandidate.objectTypeCode,
    "db"
  );

  pushMismatch(
    mismatches,
    "actionTypeCode",
    hardcodedRule.actionTypeCode,
    metadata.rubricatorCandidate.actionTypeCode,
    "db"
  );

  pushMismatch(
    mismatches,
    "contextCode",
    hardcodedRule.contextCode,
    metadata.rubricatorCandidate.contextCode,
    "db"
  );

  pushMismatch(
    mismatches,
    "contextualCategorySlug",
    hardcodedRule.contextualCategorySlug,
    metadata.rubricatorCandidate.contextualCategorySlug,
    "db"
  );

  pushMismatch(
    mismatches,
    "classificationRole",
    hardcodedRule.classificationRole,
    metadata.knownTemplateRegistry.classificationRole,
    "db"
  );

  pushMismatch(
    mismatches,
    "confidence",
    hardcodedRule.confidence,
    metadata.knownTemplateRegistry.confidence,
    "db"
  );

  return mismatches;
}

export function compareKnownTemplateRegistryTableWithHardcodedRule(
  snapshot: KnownTemplateRegistryTableSnapshot,
  hardcodedRule: KnownTemplateRubricatorClassificationRule
): string[] {
  const mismatches: string[] = [];

  pushMismatch(
    mismatches,
    "templateSlug",
    hardcodedRule.templateSlug,
    snapshot.templateSlug,
    "registryTable"
  );

  pushMismatch(
    mismatches,
    "ruleKey",
    hardcodedRule.ruleKey,
    snapshot.ruleKey,
    "registryTable"
  );

  pushMismatch(
    mismatches,
    "objectTypeCode",
    hardcodedRule.objectTypeCode,
    snapshot.objectTypeCode,
    "registryTable"
  );

  pushMismatch(
    mismatches,
    "actionTypeCode",
    hardcodedRule.actionTypeCode,
    snapshot.actionTypeCode,
    "registryTable"
  );

  pushMismatch(
    mismatches,
    "contextCode",
    hardcodedRule.contextCode,
    snapshot.contextCode,
    "registryTable"
  );

  pushMismatch(
    mismatches,
    "contextualCategorySlug",
    hardcodedRule.contextualCategorySlug,
    snapshot.contextualCategorySlug,
    "registryTable"
  );

  pushMismatch(
    mismatches,
    "classificationRole",
    hardcodedRule.classificationRole,
    snapshot.classificationRole,
    "registryTable"
  );

  pushMismatch(
    mismatches,
    "confidence",
    hardcodedRule.confidence,
    snapshot.confidence,
    "registryTable"
  );

  return mismatches;
}

export function buildKnownTemplateRuleFromDbMetadataWithHardcodedDefaults(
  metadata: KnownTemplateRegistryMetadata,
  hardcodedRule: KnownTemplateRubricatorClassificationRule
): KnownTemplateRubricatorClassificationRule {
  return {
    ...hardcodedRule,
    ruleKey: metadata.knownTemplateRegistry.ruleKey,
    templateSlug: metadata.templateSlug,
    objectTypeCode: metadata.rubricatorCandidate.objectTypeCode,
    actionTypeCode: metadata.rubricatorCandidate.actionTypeCode,
    contextCode: metadata.rubricatorCandidate.contextCode,
    contextualCategorySlug: metadata.rubricatorCandidate.contextualCategorySlug,
    classificationRole: metadata.knownTemplateRegistry.classificationRole,
    confidence: metadata.knownTemplateRegistry.confidence,
  };
}

export function buildKnownTemplateRuleFromRegistryTableWithHardcodedDefaults(
  snapshot: KnownTemplateRegistryTableSnapshot,
  hardcodedRule: KnownTemplateRubricatorClassificationRule
): KnownTemplateRubricatorClassificationRule {
  return {
    ...hardcodedRule,
    ruleKey: snapshot.ruleKey,
    templateSlug: snapshot.templateSlug,
    objectTypeCode: snapshot.objectTypeCode,
    actionTypeCode: snapshot.actionTypeCode,
    contextCode: snapshot.contextCode,
    contextualCategorySlug: snapshot.contextualCategorySlug,
    classificationRole: hardcodedRule.classificationRole,
    confidence: snapshot.confidence,
  };
}

function summarizeKnownTemplateRegistryTableSnapshot(
  snapshot: KnownTemplateRegistryTableSnapshot
): Record<string, unknown> {
  return {
    tableRowId: snapshot.tableRowId,
    activityTemplateId: snapshot.activityTemplateId,
    templateSlug: snapshot.templateSlug,
    enabled: snapshot.enabled,
    ruleKey: snapshot.ruleKey,
    sourceType: snapshot.sourceType,
    classificationRole: snapshot.classificationRole,
    confidence: snapshot.confidence,
    registryVersion: snapshot.registryVersion,
    priority: snapshot.priority,
    rubricatorCandidate: {
      objectTypeCode: snapshot.objectTypeCode,
      actionTypeCode: snapshot.actionTypeCode,
      contextCode: snapshot.contextCode,
      contextualCategorySlug: snapshot.contextualCategorySlug,
    },
    valueObjectMapping: {
      valueObjectTitle: snapshot.valueObjectTitle,
      valueObjectType: snapshot.valueObjectType,
      relationType: snapshot.relationType,
      metricKey: snapshot.metricKey,
      metricUnit: snapshot.metricUnit,
      deltaDirection: snapshot.deltaDirection,
      aggregateType: snapshot.aggregateType,
    },
  };
}

async function tryResolveFromRegistryTable(input: {
  supabase: SupabaseClient;
  templateSlug: string;
  hardcodedRule: KnownTemplateRubricatorClassificationRule;
  diagnostics: KnownTemplateRuleResolverDiagnostics;
}): Promise<KnownTemplateRubricatorClassificationRule | null> {
  const tableReadResult = await readKnownTemplateRegistryTableRowBySlug(
    input.supabase as unknown as KnownTemplateRegistryTableClient,
    input.templateSlug
  );

  input.diagnostics.registryTableReadOk = tableReadResult.ok;
  input.diagnostics.registryTableFound = tableReadResult.ok
    ? true
    : tableReadResult.reason !== "not_found"
      ? false
      : false;

  input.diagnostics.registryTableErrors.push(
    ...tableReadResult.diagnostics.errors
  );

  input.diagnostics.registryTableWarnings.push(
    ...tableReadResult.diagnostics.warnings
  );

  if (!tableReadResult.ok) {
    input.diagnostics.warnings.push(
      `Registry table source was not usable (${tableReadResult.reason}); DB metadata fallback will be attempted.`
    );
    return null;
  }

  input.diagnostics.registryTableSummary =
    summarizeKnownTemplateRegistryTableSnapshot(tableReadResult.snapshot);

  const mismatches = compareKnownTemplateRegistryTableWithHardcodedRule(
    tableReadResult.snapshot,
    input.hardcodedRule
  );

  input.diagnostics.registryTableMatchesHardcoded = mismatches.length === 0;

  if (mismatches.length > 0) {
    input.diagnostics.mismatches = mismatches;
    input.diagnostics.warnings.push(
      "Registry table rule does not match hardcoded baseline; DB metadata fallback will be attempted."
    );
    return null;
  }

  input.diagnostics.selectedSource = "registry_table";

  return buildKnownTemplateRuleFromRegistryTableWithHardcodedDefaults(
    tableReadResult.snapshot,
    input.hardcodedRule
  );
}

async function tryResolveFromDbMetadata(input: {
  supabase: SupabaseClient;
  templateSlug: string;
  hardcodedRule: KnownTemplateRubricatorClassificationRule;
  diagnostics: KnownTemplateRuleResolverDiagnostics;
}): Promise<KnownTemplateRubricatorClassificationRule | null> {
  const dbReadResult = await readKnownTemplateRegistryMetadataBySlug(
    input.supabase,
    input.templateSlug
  );

  input.diagnostics.dbMetadataReadOk = dbReadResult.ok;
  input.diagnostics.dbMetadataFound = dbReadResult.found;

  if (!dbReadResult.ok) {
    input.diagnostics.warnings.push(
      "DB metadata read failed; hardcoded fallback will be selected if needed."
    );
    return null;
  }

  if (!dbReadResult.found || !dbReadResult.metadata) {
    input.diagnostics.warnings.push(
      "DB metadata was not found; hardcoded fallback will be selected if needed."
    );
    return null;
  }

  input.diagnostics.dbMetadataSummary = summarizeKnownTemplateRegistryMetadata(
    dbReadResult.metadata
  );

  const mismatches = compareKnownTemplateDbMetadataWithHardcodedRule(
    dbReadResult.metadata,
    input.hardcodedRule
  );

  input.diagnostics.dbMetadataMatchesHardcoded = mismatches.length === 0;

  if (mismatches.length > 0) {
    input.diagnostics.mismatches = mismatches;
    input.diagnostics.warnings.push(
      "DB metadata does not match hardcoded rule; hardcoded fallback will be selected if needed."
    );
    return null;
  }

  input.diagnostics.selectedSource = "db_metadata";

  return buildKnownTemplateRuleFromDbMetadataWithHardcodedDefaults(
    dbReadResult.metadata,
    input.hardcodedRule
  );
}

export async function resolveKnownTemplateRubricatorClassificationRule(
  input: ResolveKnownTemplateRubricatorClassificationRuleInput
): Promise<ResolveKnownTemplateRubricatorClassificationRuleResult> {
  const mode = input.mode ?? "prefer_registry_table";
  const diagnostics = createBaseDiagnostics(input.templateSlug, mode);
  const errors: string[] = [];

  if (input.templateSlug.trim().length === 0) {
    errors.push("templateSlug must be a non-empty string");

    return {
      ok: false,
      rule: null,
      source: null,
      diagnostics,
      errors,
    };
  }

  const hardcodedRule = findHardcodedKnownTemplateRuleBySlug(input.templateSlug);
  diagnostics.hardcodedRuleFound = hardcodedRule !== null;

  if (!hardcodedRule) {
    errors.push(
      `No hardcoded known-template rubricator rule found for templateSlug="${input.templateSlug}"`
    );

    return {
      ok: false,
      rule: null,
      source: null,
      diagnostics,
      errors,
    };
  }

  if (mode === "hardcoded_only") {
    diagnostics.selectedSource = "hardcoded_fallback";
    diagnostics.warnings.push(
      "Resolver mode is hardcoded_only; registry table and DB metadata were not read."
    );

    return {
      ok: true,
      rule: hardcodedRule,
      source: "hardcoded_fallback",
      diagnostics,
      errors: [],
    };
  }

  if (mode === "prefer_registry_table") {
    const registryTableRule = await tryResolveFromRegistryTable({
      supabase: input.supabase,
      templateSlug: input.templateSlug,
      hardcodedRule,
      diagnostics,
    });

    if (registryTableRule) {
      return {
        ok: true,
        rule: registryTableRule,
        source: "registry_table",
        diagnostics,
        errors: [],
      };
    }
  } else {
    diagnostics.warnings.push(
      "Resolver mode is prefer_db_metadata; registry table was not read."
    );
  }

  const dbBackedRule = await tryResolveFromDbMetadata({
    supabase: input.supabase,
    templateSlug: input.templateSlug,
    hardcodedRule,
    diagnostics,
  });

  if (dbBackedRule) {
    return {
      ok: true,
      rule: dbBackedRule,
      source: "db_metadata",
      diagnostics,
      errors: [],
    };
  }

  diagnostics.selectedSource = "hardcoded_fallback";
  diagnostics.warnings.push("Hardcoded fallback selected.");

  return {
    ok: true,
    rule: hardcodedRule,
    source: "hardcoded_fallback",
    diagnostics,
    errors: [],
  };
}
