import {
  GOAL_EVIDENCE_ACQUISITION_METHOD_CODES,
  GOAL_EVIDENCE_DIMENSION_CODES,
  GOAL_EVIDENCE_IMPORTANCE_CODES,
  GOAL_EVIDENCE_SOURCE_KIND_CODES,
  GOAL_EVIDENCE_SUBJECT_SCOPE_CODES,
  type GoalEvidenceRequirementPackage,
} from "./goalEvidenceRequirementTypes";

function hasDuplicates(values: readonly string[]) {
  return new Set(values).size !== values.length;
}

export function validateGoalEvidenceRequirementPackage(
  value: GoalEvidenceRequirementPackage,
): readonly string[] {
  const errors: string[] = [];

  if (value.schemaVersion !== 1) {
    errors.push("GOAL_EVIDENCE_SCHEMA_VERSION_UNSUPPORTED");
  }

  if (!value.packageCode.trim()) {
    errors.push("GOAL_EVIDENCE_PACKAGE_CODE_REQUIRED");
  }

  if (value.packageVersion < 1) {
    errors.push("GOAL_EVIDENCE_PACKAGE_VERSION_INVALID");
  }

  if (value.specialistPerspectiveCodes.length === 0) {
    errors.push(
      "GOAL_EVIDENCE_SPECIALIST_PERSPECTIVE_REQUIRED",
    );
  }

  if (value.requirements.length === 0) {
    errors.push("GOAL_EVIDENCE_REQUIREMENTS_EMPTY");
  }

  if (
    hasDuplicates(
      value.requirements.map(
        (item) => item.requirementCode,
      ),
    )
  ) {
    errors.push(
      "GOAL_EVIDENCE_REQUIREMENT_CODE_DUPLICATE",
    );
  }

  const allowedImportance =
    new Set<string>(GOAL_EVIDENCE_IMPORTANCE_CODES);

  const allowedDimensions =
    new Set<string>(GOAL_EVIDENCE_DIMENSION_CODES);

  const allowedScopes =
    new Set<string>(GOAL_EVIDENCE_SUBJECT_SCOPE_CODES);

  const allowedAcquisition =
    new Set<string>(
      GOAL_EVIDENCE_ACQUISITION_METHOD_CODES,
    );

  const allowedSourceKinds =
    new Set<string>(GOAL_EVIDENCE_SOURCE_KIND_CODES);

  value.sourceRefs.forEach((source, index) => {
    if (!allowedSourceKinds.has(source.sourceKindCode)) {
      errors.push(
        `GOAL_EVIDENCE_SOURCE_KIND_INVALID:${index}`,
      );
    }

    if (!source.title.trim() || !source.publisher.trim()) {
      errors.push(
        `GOAL_EVIDENCE_SOURCE_IDENTITY_REQUIRED:${index}`,
      );
    }
  });

  for (const requirement of value.requirements) {
    if (!requirement.requirementCode.trim()) {
      errors.push(
        "GOAL_EVIDENCE_REQUIREMENT_CODE_REQUIRED",
      );
    }

    if (!requirement.informationNeedText.trim()) {
      errors.push(
        `GOAL_EVIDENCE_INFORMATION_NEED_REQUIRED:${requirement.requirementCode}`,
      );
    }

    if (
      !allowedImportance.has(requirement.importanceCode)
    ) {
      errors.push(
        `GOAL_EVIDENCE_IMPORTANCE_INVALID:${requirement.requirementCode}`,
      );
    }

    if (
      requirement.dimensionCodes.length === 0 ||
      requirement.dimensionCodes.some(
        (code) => !allowedDimensions.has(code),
      )
    ) {
      errors.push(
        `GOAL_EVIDENCE_DIMENSION_INVALID:${requirement.requirementCode}`,
      );
    }

    if (
      !allowedScopes.has(requirement.subjectScopeCode)
    ) {
      errors.push(
        `GOAL_EVIDENCE_SUBJECT_SCOPE_INVALID:${requirement.requirementCode}`,
      );
    }

    if (
      requirement.acquisitionMethodCodes.length === 0 ||
      requirement.acquisitionMethodCodes.some(
        (code) => !allowedAcquisition.has(code),
      )
    ) {
      errors.push(
        `GOAL_EVIDENCE_ACQUISITION_INVALID:${requirement.requirementCode}`,
      );
    }

    if (
      requirement.freshnessPolicy.maxAgeDays !== null &&
      requirement.freshnessPolicy.maxAgeDays < 0
    ) {
      errors.push(
        `GOAL_EVIDENCE_FRESHNESS_INVALID:${requirement.requirementCode}`,
      );
    }

    if (
      requirement.sourceRefIndexes.some(
        (index) =>
          index < 0 ||
          index >= value.sourceRefs.length,
      )
    ) {
      errors.push(
        `GOAL_EVIDENCE_SOURCE_REF_INVALID:${requirement.requirementCode}`,
      );
    }

    if (
      requirement.professionalAssessmentRequired &&
      !requirement.acquisitionMethodCodes.includes(
        "professional_assessment",
      )
    ) {
      errors.push(
        `GOAL_EVIDENCE_PROFESSIONAL_ROUTE_REQUIRED:${requirement.requirementCode}`,
      );
    }
  }

  return errors;
}
