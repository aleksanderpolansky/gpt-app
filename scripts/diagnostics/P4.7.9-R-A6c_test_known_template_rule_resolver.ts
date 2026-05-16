import { supabase } from "../../lib/supabase";

import {
  resolveKnownTemplateRubricatorClassificationRule,
  type KnownTemplateRuleResolverMode,
} from "../../lib/activity/knownTemplateRegistryRuleResolver";

const TEMPLATE_SLUGS = [
  "german-marketing-handwriting-practice",
  "knee-training-health-practice",
] as const;

const EXPECTED = {
  "german-marketing-handwriting-practice": {
    ruleKey: "german_marketing_handwriting_practice_to_business_german",
    objectTypeCode: "German_language",
    actionTypeCode: "practice",
    contextCode: "learning",
    contextualCategorySlug: "business-german",
    classificationRole: "primary",
    confidence: 1,
  },
  "knee-training-health-practice": {
    ruleKey: "knee_training_health_practice_to_knee_exercises",
    objectTypeCode: "knee",
    actionTypeCode: "train",
    contextCode: "health",
    contextualCategorySlug: "knee-exercises",
    classificationRole: "primary",
    confidence: 1,
  },
} as const;

function compareRule(
  templateSlug: keyof typeof EXPECTED,
  rule: {
    ruleKey: string;
    objectTypeCode: string;
    actionTypeCode: string;
    contextCode: string;
    contextualCategorySlug: string;
    classificationRole: string;
    confidence: number;
  }
): string[] {
  const expected = EXPECTED[templateSlug];
  const errors: string[] = [];

  const checks: Array<[string, unknown, unknown]> = [
    ["ruleKey", rule.ruleKey, expected.ruleKey],
    ["objectTypeCode", rule.objectTypeCode, expected.objectTypeCode],
    ["actionTypeCode", rule.actionTypeCode, expected.actionTypeCode],
    ["contextCode", rule.contextCode, expected.contextCode],
    [
      "contextualCategorySlug",
      rule.contextualCategorySlug,
      expected.contextualCategorySlug,
    ],
    ["classificationRole", rule.classificationRole, expected.classificationRole],
    ["confidence", rule.confidence, expected.confidence],
  ];

  for (const [field, actual, expectedValue] of checks) {
    if (actual !== expectedValue) {
      errors.push(
        `${templateSlug}: ${field} mismatch. expected="${String(
          expectedValue
        )}" actual="${String(actual)}"`
      );
    }
  }

  return errors;
}

async function runForTemplate(
  templateSlug: keyof typeof EXPECTED,
  mode: KnownTemplateRuleResolverMode
) {
  const result = await resolveKnownTemplateRubricatorClassificationRule({
    supabase,
    templateSlug,
    mode,
  });

  const errors: string[] = [];

  if (!result.ok) {
    errors.push(`${templateSlug}/${mode}: resolver returned ok=false`);
    errors.push(...result.errors);
  }

  if (result.ok) {
    errors.push(...compareRule(templateSlug, result.rule));

    if (mode === "prefer_db_metadata" && result.source !== "db_metadata") {
      errors.push(
        `${templateSlug}/${mode}: expected source db_metadata, got ${result.source}`
      );
    }

    if (mode === "hardcoded_only" && result.source !== "hardcoded_fallback") {
      errors.push(
        `${templateSlug}/${mode}: expected source hardcoded_fallback, got ${result.source}`
      );
    }

    if (
      mode === "prefer_db_metadata" &&
      result.diagnostics.dbMetadataMatchesHardcoded !== true
    ) {
      errors.push(
        `${templateSlug}/${mode}: expected dbMetadataMatchesHardcoded=true`
      );
    }

    if (
      mode === "prefer_db_metadata" &&
      result.diagnostics.mismatches.length !== 0
    ) {
      errors.push(
        `${templateSlug}/${mode}: expected empty mismatches, got ${JSON.stringify(
          result.diagnostics.mismatches
        )}`
      );
    }
  }

  return {
    templateSlug,
    mode,
    ok: errors.length === 0,
    source: result.source,
    resolverOk: result.ok,
    rule: result.ok ? result.rule : null,
    diagnostics: result.diagnostics,
    errors,
  };
}

async function main() {
  const rows = [];

  for (const templateSlug of TEMPLATE_SLUGS) {
    rows.push(await runForTemplate(templateSlug, "prefer_db_metadata"));
    rows.push(await runForTemplate(templateSlug, "hardcoded_only"));
  }

  const summary = {
    step: "P4.7.9-R-A6c",
    templatesCount: TEMPLATE_SLUGS.length,
    checksCount: rows.length,
    allOk: rows.every((row) => row.ok),
    dbMetadataRowsOk: rows
      .filter((row) => row.mode === "prefer_db_metadata")
      .every((row) => row.ok && row.source === "db_metadata"),
    hardcodedFallbackRowsOk: rows
      .filter((row) => row.mode === "hardcoded_only")
      .every((row) => row.ok && row.source === "hardcoded_fallback"),
  };

  console.log(
    JSON.stringify(
      {
        summary,
        rows,
      },
      null,
      2
    )
  );

  if (!summary.allOk) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
