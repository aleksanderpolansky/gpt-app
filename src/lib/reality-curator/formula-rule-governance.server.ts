import { createHash } from "node:crypto";

import { supabase } from "../../../lib/supabase";
import { testFormulaRuleDraftV1 } from "./formula-rule-test-runner.server";
import {
  listFormulaRuleRegistryV1,
  updateFormulaRuleDraftV1,
} from "./formula-rule-registry.server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TEST_EVIDENCE_CONTRACT =
  "ARCTOR_FORMULA_TEST_EVIDENCE_V1" as const;
const PUBLISH_READINESS_CONTRACT =
  "ARCTOR_FORMULA_PUBLISH_READINESS_V1" as const;
const PUBLISH_AUDIT_CONTRACT =
  "ARCTOR_FORMULA_PUBLISH_AUDIT_V1" as const;
const PUBLISH_CONFIRMATION_CODE =
  "PUBLISH_FORMULA_RULE_V1" as const;

type JsonRecord = Record<string, unknown>;

type Registry = Awaited<ReturnType<typeof listFormulaRuleRegistryV1>>;
type RegistrySeries = Registry[number];
type RegistryVersion = RegistrySeries["versions"][number];

export type FormulaTestEvidenceRecorderV1 = {
  curatorAppUserId: string;
  curatorAdminId: string;
  curatorRole: string;
};

export type FormulaRulePublisherV1 = {
  curatorAppUserId: string;
  curatorAdminId: string;
  curatorRole: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";

  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("FORMULA_RULE_GOVERNANCE_NON_FINITE_NUMBER");
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const record = value as JsonRecord;
    const entries = Object.keys(record)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson(record[key] ?? null)}`,
      );
    return `{${entries.join(",")}}`;
  }

  throw new Error("FORMULA_RULE_GOVERNANCE_NON_JSON_VALUE");
}

function hashJson(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

async function findRuleVersion(ruleVersionId: string) {
  if (!UUID_RE.test(ruleVersionId)) {
    throw new Error("FORMULA_RULE_GOVERNANCE_VERSION_ID_INVALID");
  }

  const registry = await listFormulaRuleRegistryV1();

  for (const series of registry) {
    const version =
      series.versions.find((item) => item.id === ruleVersionId) ?? null;

    if (version) {
      return { series, version };
    }
  }

  throw new Error("FORMULA_RULE_GOVERNANCE_VERSION_NOT_FOUND");
}

function fingerprintPayload(
  series: RegistrySeries,
  version: RegistryVersion,
) {
  const metadata =
    asRecord(version.metadata_json);

  const scientificConstantsForFingerprint =
    Array.isArray(metadata.scientificConstants)
      ? metadata.scientificConstants
      : null;

  return {
    contract: "ARCTOR_FORMULA_CONFIGURATION_FINGERPRINT_V1",
    series: {
      id: series.id,
      ruleCode: series.rule_code,
      scopeCode: series.scope_code,
      activityTemplateId: series.activity_template_id,
      impactProfileId: series.impact_profile_id,
      sourceValueObjectId: series.source_value_object_id,
      sourceParameterDefinitionId: series.source_parameter_definition_id,
      targetValueObjectId: series.target_value_object_id,
      targetParameterDefinitionId: series.target_parameter_definition_id,
      baseRuleSeriesId: series.base_rule_series_id,
      resolutionModeCode: series.resolution_mode_code,
    },
    version: {
      id: version.id,
      versionNo: version.version_no,
      expressionLanguageCode: version.expression_language_code,
      inputContract: version.input_contract_json,
      conditionContract: version.condition_contract_json,
      expressionContract: version.expression_contract_json,
      triggerContract: version.trigger_contract_json,
      resultFactRoleCode: version.result_fact_role_code,
      resultUnitCode: version.result_unit_code,
      missingInputPolicyCode: version.missing_input_policy_code,
      ...(scientificConstantsForFingerprint
        ? {
            scientificConstants:
              scientificConstantsForFingerprint,
          }
        : {}),
    },
  };
}

export function formulaRuleConfigurationFingerprintV1(
  series: RegistrySeries,
  version: RegistryVersion,
) {
  return hashJson(fingerprintPayload(series, version));
}

function readinessReasons(
  series: RegistrySeries,
  version: RegistryVersion,
) {
  const reasons: string[] = [];
  const metadata = asRecord(version.metadata_json);
  const evidence = asRecord(metadata.testEvidence);
  const currentFingerprint = formulaRuleConfigurationFingerprintV1(
    series,
    version,
  );
  const publishedSibling =
    series.versions.find(
      (item) =>
        item.id !== version.id && item.status_code === "published",
    ) ?? null;

  if (series.status_code !== "active") {
    reasons.push("series_not_active");
  }

  if (
    version.status_code !== "draft" &&
    version.status_code !== "testing"
  ) {
    reasons.push("version_not_publish_candidate");
  }

  if (
    metadata.draftIncomplete !== false ||
    text(metadata.formulaState) !== "configured"
  ) {
    reasons.push("formula_not_configured");
  }

  if (text(metadata.testEvidenceState) !== "valid") {
    reasons.push("test_evidence_not_valid");
  }

  if (text(evidence.contract) !== TEST_EVIDENCE_CONTRACT) {
    reasons.push("test_evidence_contract_missing");
  }

  if (text(evidence.formulaFingerprint) !== currentFingerprint) {
    reasons.push("test_evidence_stale");
  }

  if (evidence.testPassed !== true) {
    reasons.push("test_not_passed");
  }

  if (evidence.noWrite !== true) {
    reasons.push("test_no_write_not_proven");
  }

  if (text(evidence.evaluationStatus) !== "evaluated") {
    reasons.push("test_not_evaluated");
  }

  if (text(evidence.unitAlgebraStatus) !== "resolved") {
    reasons.push("unit_algebra_not_resolved");
  }

  if (publishedSibling) {
    reasons.push("published_version_requires_atomic_supersede");
  }

  const ready = reasons.length === 0;

  return {
    contract: PUBLISH_READINESS_CONTRACT,
    ready,
    reasons,
    formulaFingerprint: currentFingerprint,
    evidenceState: text(metadata.testEvidenceState) || "missing",
    evidenceRecordedAt: text(evidence.recordedAt) || null,
    currentPublishedVersionId: publishedSibling?.id ?? null,
    requiresAtomicSupersede: Boolean(publishedSibling),
    publishEnabled: ready && !publishedSibling,
    formulaExecutionEnabled: false,
    factWriteEnabled: false,
  };
}

export async function getFormulaRulePublishReadinessV1(
  ruleVersionId: string,
) {
  const { series, version } = await findRuleVersion(ruleVersionId);

  return {
    seriesId: series.id,
    ruleCode: series.rule_code,
    versionId: version.id,
    versionNo: version.version_no,
    versionStatusCode: version.status_code,
    ...readinessReasons(series, version),
  };
}

export async function publishFormulaRuleVersionV1(input: {
  ruleVersionId: string;
  confirmationCode: string;
  publisher: FormulaRulePublisherV1;
}) {
  const ruleVersionId = text(input?.ruleVersionId);
  if (!UUID_RE.test(ruleVersionId)) {
    throw new Error("FORMULA_RULE_GOVERNANCE_VERSION_ID_INVALID");
  }

  if (text(input.confirmationCode) !== PUBLISH_CONFIRMATION_CODE) {
    throw new Error(
      "FORMULA_RULE_GOVERNANCE_PUBLISH_CONFIRMATION_REQUIRED",
    );
  }

  const before = await findRuleVersion(ruleVersionId);
  const readiness = readinessReasons(before.series, before.version);

  if (readiness.requiresAtomicSupersede) {
    throw new Error(
      "FORMULA_RULE_GOVERNANCE_PUBLISH_REQUIRES_ATOMIC_SUPERSEDE",
    );
  }

  if (!readiness.ready) {
    throw new Error(
      `FORMULA_RULE_GOVERNANCE_PUBLISH_NOT_READY:${readiness.reasons.join(
        ",",
      )}`,
    );
  }

  if (
    before.version.status_code !== "draft" &&
    before.version.status_code !== "testing"
  ) {
    throw new Error(
      "FORMULA_RULE_GOVERNANCE_VERSION_NOT_PUBLISH_CANDIDATE",
    );
  }

  const publishedAt = new Date().toISOString();
  const metadata = asRecord(before.version.metadata_json);
  const publishAudit = {
    contract: PUBLISH_AUDIT_CONTRACT,
    publishedAt,
    formulaFingerprint: readiness.formulaFingerprint,
    evidenceRecordedAt: readiness.evidenceRecordedAt,
    previousPublishedVersionId: null,
    supersedeMode: "none_first_publication_only",
    publishedBy: {
      curatorAppUserId: text(input.publisher.curatorAppUserId),
      curatorAdminId: text(input.publisher.curatorAdminId),
      curatorRole: text(input.publisher.curatorRole),
    },
  };

  const { data, error } = await supabase
    .from("activity_fact_calculation_rule_versions_v1")
    .update({
      status_code: "published",
      published_at: publishedAt,
      valid_from: publishedAt,
      metadata_json: {
        ...metadata,
        publishState: "published",
        publishContract: PUBLISH_AUDIT_CONTRACT,
        publishAudit,
      },
    })
    .eq("id", before.version.id)
    .eq("updated_at", before.version.updated_at)
    .in("status_code", ["draft", "testing"])
    .select(
      "id,rule_series_id,version_no,expression_language_code,input_contract_json,condition_contract_json,expression_contract_json,trigger_contract_json,result_fact_role_code,result_unit_code,missing_input_policy_code,status_code,supersedes_rule_version_id,published_at,valid_from,valid_to,metadata_json,created_at,updated_at",
    )
    .limit(1);

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "FORMULA_RULE_PUBLISH_CONFLICT_PUBLISHED_VERSION_ALREADY_EXISTS",
      );
    }

    throw new Error(
      `FORMULA_RULE_PUBLISH_UPDATE_FAILED:${error.message}`,
    );
  }

  const published =
    ((data as unknown as RegistryVersion[] | null) ?? [])[0] ?? null;

  if (!published) {
    throw new Error(
      "FORMULA_RULE_PUBLISH_CONFLICT_CONCURRENT_MUTATION",
    );
  }

  const publishedFingerprint = formulaRuleConfigurationFingerprintV1(
    before.series,
    published,
  );

  if (publishedFingerprint !== readiness.formulaFingerprint) {
    throw new Error(
      "FORMULA_RULE_PUBLISH_FINGERPRINT_CHANGED_DURING_TRANSITION",
    );
  }

  return {
    contract: "ARCTOR_FORMULA_EXPLICIT_PUBLISH_GATE_V1",
    seriesId: before.series.id,
    ruleCode: before.series.rule_code,
    versionId: published.id,
    versionNo: published.version_no,
    statusCode: published.status_code,
    publishedAt: published.published_at,
    validFrom: published.valid_from,
    formulaFingerprint: publishedFingerprint,
    publishAudit,
    publishEnabled: true,
    formulaExecutionEnabled: false,
    factWriteEnabled: false,
  };
}

export async function recordFormulaRuleTestEvidenceV1(input: {
  ruleVersionId: string;
  sampleInputs?: JsonRecord;
  recorder: FormulaTestEvidenceRecorderV1;
}) {
  const ruleVersionId = text(input?.ruleVersionId);
  if (!UUID_RE.test(ruleVersionId)) {
    throw new Error("FORMULA_RULE_GOVERNANCE_VERSION_ID_INVALID");
  }

  const sampleInputs = asRecord(input.sampleInputs);
  const before = await findRuleVersion(ruleVersionId);
  const beforeFingerprint = formulaRuleConfigurationFingerprintV1(
    before.series,
    before.version,
  );

  const test = await testFormulaRuleDraftV1({
    ruleVersionId,
    sampleInputs,
  });
  const testRecord = asRecord(test);
  const unitAlgebra = asRecord(testRecord.unitAlgebra);

  if (testRecord.noWrite !== true) {
    throw new Error("FORMULA_RULE_GOVERNANCE_TEST_NO_WRITE_REQUIRED");
  }

  if (text(testRecord.evaluationStatus) !== "evaluated") {
    throw new Error(
      `FORMULA_RULE_GOVERNANCE_TEST_NOT_EVALUATED:${text(
        testRecord.evaluationStatus,
      ) || "UNKNOWN"}`,
    );
  }

  if (testRecord.testPassed !== true) {
    throw new Error("FORMULA_RULE_GOVERNANCE_TEST_PASS_REQUIRED");
  }

  if (text(unitAlgebra.status) !== "resolved") {
    throw new Error(
      "FORMULA_RULE_GOVERNANCE_UNIT_ALGEBRA_RESOLVED_REQUIRED",
    );
  }

  const after = await findRuleVersion(ruleVersionId);
  const afterFingerprint = formulaRuleConfigurationFingerprintV1(
    after.series,
    after.version,
  );

  if (beforeFingerprint !== afterFingerprint) {
    throw new Error(
      "FORMULA_RULE_GOVERNANCE_CONFIGURATION_CHANGED_DURING_TEST",
    );
  }

  if (
    after.version.status_code !== "draft" &&
    after.version.status_code !== "testing"
  ) {
    throw new Error("FORMULA_RULE_GOVERNANCE_VERSION_NOT_EDITABLE");
  }

  const metadata = asRecord(after.version.metadata_json);
  const recordedAt = new Date().toISOString();

  const evidence = {
    contract: TEST_EVIDENCE_CONTRACT,
    formulaFingerprint: afterFingerprint,
    sampleInputsHash: hashJson(sampleInputs),
    outputHash: hashJson({
      hasOutput: Object.prototype.hasOwnProperty.call(testRecord, "output"),
      output: testRecord.output ?? null,
    }),
    evaluationStatus: "evaluated",
    unitAlgebraStatus: "resolved",
    testPassed: true,
    noWrite: true,
    targetUnitCode: text(testRecord.targetUnitCode) || null,
    recordedAt,
    recordedBy: {
      curatorAppUserId: text(input.recorder.curatorAppUserId),
      curatorAdminId: text(input.recorder.curatorAdminId),
      curatorRole: text(input.recorder.curatorRole),
    },
  };

  const updatedVersion = await updateFormulaRuleDraftV1({
    ruleVersionId,
    versionMetadata: {
      ...metadata,
      testEvidenceState: "valid",
      testEvidence: evidence,
      testEvidenceRecordedAt: recordedAt,
      testEvidenceContract: TEST_EVIDENCE_CONTRACT,
    },
  });

  return {
    seriesId: after.series.id,
    ruleCode: after.series.rule_code,
    versionId: updatedVersion.id,
    evidence,
    readiness: readinessReasons(after.series, updatedVersion),
    evidenceWriteEnabled: true,
    publishEnabled: false,
    formulaExecutionEnabled: false,
    factWriteEnabled: false,
  };
}
