import fs from "node:fs";
import path from "node:path";

type ExpectedKnownTemplate = {
  templateSlug: string;
  ruleKey: string;
  objectTypeCode: string;
  actionTypeCode: string;
  contextCode: string;
  contextualCategorySlug: string;
  valueObjectTitle: string;
  valueObjectType: string;
};

type SourceEvidence = {
  knownTemplateRubricatorRulesHasTemplateSlug: boolean;
  knownTemplateRubricatorRulesHasRuleKey: boolean;
  knownTemplateRubricatorRulesHasObjectTypeCode: boolean;
  knownTemplateRubricatorRulesHasActionTypeCode: boolean;
  knownTemplateRubricatorRulesHasContextCode: boolean;
  knownTemplateRubricatorRulesHasContextualCategorySlug: boolean;
  rubricatorValueObjectMapperHasValueObjectTitle: boolean;
  rubricatorValueObjectMapperHasValueObjectType: boolean;
};

type DbMetadata = {
  templateSlug: string;
  ruleKey: string | null;
  objectTypeCode: string | null;
  actionTypeCode: string | null;
  contextCode: string | null;
  contextualCategorySlug: string | null;
  valueObjectTitle: string | null;
  valueObjectMappingTitle: string | null;
  valueObjectType: string | null;
  metricKey: string | null;
  metricUnit: string | null;
  relationType: string | null;
  deltaDirection: string | null;
  aggregateType: string | null;
};

const PROJECT_ROOT = process.cwd();

const EXPECTED_TEMPLATES: ExpectedKnownTemplate[] = [
  {
    templateSlug: "german-marketing-handwriting-practice",
    ruleKey: "german_marketing_handwriting_practice_to_business_german",
    objectTypeCode: "German_language",
    actionTypeCode: "practice",
    contextCode: "learning",
    contextualCategorySlug: "business-german",
    valueObjectTitle: "Business German writing practice",
    valueObjectType: "skill",
  },
  {
    templateSlug: "knee-training-health-practice",
    ruleKey: "knee_training_health_practice_to_knee_exercises",
    objectTypeCode: "knee",
    actionTypeCode: "train",
    contextCode: "health",
    contextualCategorySlug: "knee-exercises",
    valueObjectTitle: "Knee training practice",
    valueObjectType: "health_activity",
  },
];

function readSourceFile(relativePath: string): string {
  const absolutePath = path.join(PROJECT_ROOT, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing source file: ${relativePath}`);
  }

  return fs.readFileSync(absolutePath, "utf8");
}

function hasQuotedValue(source: string, value: string): boolean {
  return (
    source.includes(`"${value}"`) ||
    source.includes(`'${value}'`) ||
    source.includes(`\`${value}\``)
  );
}

function buildSourceEvidence(template: ExpectedKnownTemplate): SourceEvidence {
  const knownTemplateRulesSource = readSourceFile(
    "lib/activity/knownTemplateRubricatorRules.ts"
  );

  const mapperSource = readSourceFile("lib/activity/rubricatorValueObjectMapper.ts");

  return {
    knownTemplateRubricatorRulesHasTemplateSlug: hasQuotedValue(
      knownTemplateRulesSource,
      template.templateSlug
    ),
    knownTemplateRubricatorRulesHasRuleKey: hasQuotedValue(
      knownTemplateRulesSource,
      template.ruleKey
    ),
    knownTemplateRubricatorRulesHasObjectTypeCode: hasQuotedValue(
      knownTemplateRulesSource,
      template.objectTypeCode
    ),
    knownTemplateRubricatorRulesHasActionTypeCode: hasQuotedValue(
      knownTemplateRulesSource,
      template.actionTypeCode
    ),
    knownTemplateRubricatorRulesHasContextCode: hasQuotedValue(
      knownTemplateRulesSource,
      template.contextCode
    ),
    knownTemplateRubricatorRulesHasContextualCategorySlug: hasQuotedValue(
      knownTemplateRulesSource,
      template.contextualCategorySlug
    ),
    rubricatorValueObjectMapperHasValueObjectTitle: hasQuotedValue(
      mapperSource,
      template.valueObjectTitle
    ),
    rubricatorValueObjectMapperHasValueObjectType: hasQuotedValue(
      mapperSource,
      template.valueObjectType
    ),
  };
}

function buildDbMetadataFromEnvironment(template: ExpectedKnownTemplate): DbMetadata {
  const envPrefix = template.templateSlug
    .replace(/-/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toUpperCase();

  return {
    templateSlug: template.templateSlug,
    ruleKey: process.env[`${envPrefix}_RULE_KEY`] ?? null,
    objectTypeCode: process.env[`${envPrefix}_OBJECT_TYPE_CODE`] ?? null,
    actionTypeCode: process.env[`${envPrefix}_ACTION_TYPE_CODE`] ?? null,
    contextCode: process.env[`${envPrefix}_CONTEXT_CODE`] ?? null,
    contextualCategorySlug:
      process.env[`${envPrefix}_CONTEXTUAL_CATEGORY_SLUG`] ?? null,
    valueObjectTitle: process.env[`${envPrefix}_VALUE_OBJECT_TITLE`] ?? null,
    valueObjectMappingTitle:
      process.env[`${envPrefix}_VALUE_OBJECT_MAPPING_TITLE`] ?? null,
    valueObjectType: process.env[`${envPrefix}_VALUE_OBJECT_TYPE`] ?? null,
    metricKey: process.env[`${envPrefix}_METRIC_KEY`] ?? null,
    metricUnit: process.env[`${envPrefix}_METRIC_UNIT`] ?? null,
    relationType: process.env[`${envPrefix}_RELATION_TYPE`] ?? null,
    deltaDirection: process.env[`${envPrefix}_DELTA_DIRECTION`] ?? null,
    aggregateType: process.env[`${envPrefix}_AGGREGATE_TYPE`] ?? null,
  };
}

function compareExpectedWithSource(
  template: ExpectedKnownTemplate,
  sourceEvidence: SourceEvidence
): string[] {
  const errors: string[] = [];

  for (const [key, value] of Object.entries(sourceEvidence)) {
    if (value !== true) {
      errors.push(`${template.templateSlug}: source evidence failed: ${key}`);
    }
  }

  return errors;
}

function compareExpectedWithDb(
  template: ExpectedKnownTemplate,
  db: DbMetadata
): string[] {
  const errors: string[] = [];

  const checks: Array<[string, string | null, string]> = [
    ["ruleKey", db.ruleKey, template.ruleKey],
    ["objectTypeCode", db.objectTypeCode, template.objectTypeCode],
    ["actionTypeCode", db.actionTypeCode, template.actionTypeCode],
    ["contextCode", db.contextCode, template.contextCode],
    [
      "contextualCategorySlug",
      db.contextualCategorySlug,
      template.contextualCategorySlug,
    ],
    ["valueObjectTitle", db.valueObjectTitle, template.valueObjectTitle],
    [
      "valueObjectMappingTitle",
      db.valueObjectMappingTitle,
      template.valueObjectTitle,
    ],
    ["valueObjectType", db.valueObjectType, template.valueObjectType],
    ["metricKey", db.metricKey, "duration_minutes"],
    ["metricUnit", db.metricUnit, "minutes"],
    ["relationType", db.relationType, "executes"],
    ["deltaDirection", db.deltaDirection, "increase"],
    ["aggregateType", db.aggregateType, "value_object"],
  ];

  for (const [field, actual, expected] of checks) {
    if (actual !== expected) {
      errors.push(
        `${template.templateSlug}: DB metadata mismatch for ${field}: expected "${expected}", got "${actual}"`
      );
    }
  }

  return errors;
}

function main() {
  const rows = EXPECTED_TEMPLATES.map((template) => {
    const sourceEvidence = buildSourceEvidence(template);
    const dbMetadata = buildDbMetadataFromEnvironment(template);

    const sourceErrors = compareExpectedWithSource(template, sourceEvidence);
    const dbErrors = compareExpectedWithDb(template, dbMetadata);

    return {
      templateSlug: template.templateSlug,
      ruleKey: template.ruleKey,
      sourceEvidence,
      dbMetadata,
      sourceOk: sourceErrors.length === 0,
      dbOk: dbErrors.length === 0,
      allOk: sourceErrors.length === 0 && dbErrors.length === 0,
      errors: [...sourceErrors, ...dbErrors],
    };
  });

  const summary = {
    templatesCount: rows.length,
    allSourceOk: rows.every((row) => row.sourceOk),
    allDbOk: rows.every((row) => row.dbOk),
    allOk: rows.every((row) => row.allOk),
  };

  console.log(
    JSON.stringify(
      {
        step: "P4.7.9-R-A5b",
        mode: "diagnostic_source_vs_db_metadata_comparison",
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

main();

