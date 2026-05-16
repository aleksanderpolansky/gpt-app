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

export type KnownTemplateRuleResolverSource =
  | "db_metadata"
  | "hardcoded_fallback";

export type KnownTemplateRuleResolverMode =
  | "prefer_db_metadata"
  | "hardcoded_only";

export type KnownTemplateRuleResolverDiagnostics = {
  requestedTemplateSlug: string;
  mode: KnownTemplateRuleResolverMode;
  hardcodedRuleFound: boolean;
  dbMetadataReadOk: boolean | null;
  dbMetadataFound: boolean | null;
  dbMetadataMatchesHardcoded: boolean | null;
  selectedSource: KnownTemplateRuleResolverSource | null;
  dbMetadataSummary: Record<string, unknown> | null;
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
    dbMetadataReadOk: null,
    dbMetadataFound: null,
    dbMetadataMatchesHardcoded: null,
    selectedSource: null,
    dbMetadataSummary: null,
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
  dbValue: unknown
): void {
  if (hardcodedValue !== dbValue) {
    mismatches.push(
      `${field}: hardcoded="${String(hardcodedValue)}" db="${String(dbValue)}"`
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
    metadata.templateSlug
  );

  pushMismatch(
    mismatches,
    "ruleKey",
    hardcodedRule.ruleKey,
    metadata.knownTemplateRegistry.ruleKey
  );

  pushMismatch(
    mismatches,
    "objectTypeCode",
    hardcodedRule.objectTypeCode,
    metadata.rubricatorCandidate.objectTypeCode
  );

  pushMismatch(
    mismatches,
    "actionTypeCode",
    hardcodedRule.actionTypeCode,
    metadata.rubricatorCandidate.actionTypeCode
  );

  pushMismatch(
    mismatches,
    "contextCode",
    hardcodedRule.contextCode,
    metadata.rubricatorCandidate.contextCode
  );

  pushMismatch(
    mismatches,
    "contextualCategorySlug",
    hardcodedRule.contextualCategorySlug,
    metadata.rubricatorCandidate.contextualCategorySlug
  );

  pushMismatch(
    mismatches,
    "classificationRole",
    hardcodedRule.classificationRole,
    metadata.knownTemplateRegistry.classificationRole
  );

  pushMismatch(
    mismatches,
    "confidence",
    hardcodedRule.confidence,
    metadata.knownTemplateRegistry.confidence
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

export async function resolveKnownTemplateRubricatorClassificationRule(
  input: ResolveKnownTemplateRubricatorClassificationRuleInput
): Promise<ResolveKnownTemplateRubricatorClassificationRuleResult> {
  const mode = input.mode ?? "prefer_db_metadata";
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
    diagnostics.warnings.push("Resolver mode is hardcoded_only; DB metadata was not read.");

    return {
      ok: true,
      rule: hardcodedRule,
      source: "hardcoded_fallback",
      diagnostics,
      errors: [],
    };
  }

  const dbReadResult = await readKnownTemplateRegistryMetadataBySlug(
    input.supabase,
    input.templateSlug
  );

  diagnostics.dbMetadataReadOk = dbReadResult.ok;
  diagnostics.dbMetadataFound = dbReadResult.found;

  if (!dbReadResult.ok) {
    diagnostics.selectedSource = "hardcoded_fallback";
    diagnostics.warnings.push(
      "DB metadata read failed; hardcoded fallback selected."
    );

    return {
      ok: true,
      rule: hardcodedRule,
      source: "hardcoded_fallback",
      diagnostics,
      errors: [],
    };
  }

  if (!dbReadResult.found || !dbReadResult.metadata) {
    diagnostics.selectedSource = "hardcoded_fallback";
    diagnostics.warnings.push(
      "DB metadata was not found; hardcoded fallback selected."
    );

    return {
      ok: true,
      rule: hardcodedRule,
      source: "hardcoded_fallback",
      diagnostics,
      errors: [],
    };
  }

  diagnostics.dbMetadataSummary = summarizeKnownTemplateRegistryMetadata(
    dbReadResult.metadata
  );

  const mismatches = compareKnownTemplateDbMetadataWithHardcodedRule(
    dbReadResult.metadata,
    hardcodedRule
  );

  diagnostics.mismatches = mismatches;
  diagnostics.dbMetadataMatchesHardcoded = mismatches.length === 0;

  if (mismatches.length > 0) {
    diagnostics.selectedSource = "hardcoded_fallback";
    diagnostics.warnings.push(
      "DB metadata does not match hardcoded rule; hardcoded fallback selected."
    );

    return {
      ok: true,
      rule: hardcodedRule,
      source: "hardcoded_fallback",
      diagnostics,
      errors: [],
    };
  }

  const dbBackedRule = buildKnownTemplateRuleFromDbMetadataWithHardcodedDefaults(
    dbReadResult.metadata,
    hardcodedRule
  );

  diagnostics.selectedSource = "db_metadata";

  return {
    ok: true,
    rule: dbBackedRule,
    source: "db_metadata",
    diagnostics,
    errors: [],
  };
}
