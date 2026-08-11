import type {
  RealityContextSnapshot,
  RealityContextSourceRef,
} from "../context/realityContextTypes";
import type {
  GoalEvidenceAcquisitionMethodCode,
  GoalEvidenceCoverageItem,
  GoalEvidenceCoverageReport,
  GoalEvidenceCoverageStatusCode,
  GoalEvidenceRequirement,
  GoalEvidenceRequirementMatch,
  GoalEvidenceRequirementPackage,
  GoalEvidenceUserOptionCode,
} from "./goalEvidenceRequirementTypes";

function refKey(ref: RealityContextSourceRef) {
  return `${ref.entityType}:${ref.entityId}`;
}

function parseTime(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function latestEvidenceTime(
  snapshot: RealityContextSnapshot,
  refs: readonly RealityContextSourceRef[],
) {
  const keys = new Set(refs.map(refKey));
  let latest: number | null = null;

  for (const item of snapshot.items) {
    if (!keys.has(refKey(item.sourceRef))) {
      continue;
    }

    const candidate =
      parseTime(item.time.observedAt) ??
      parseTime(item.time.effectiveAt) ??
      parseTime(item.time.knownAt);

    if (
      candidate !== null &&
      (latest === null || candidate > latest)
    ) {
      latest = candidate;
    }
  }

  return latest;
}

function evidenceIsStale(
  requirement: GoalEvidenceRequirement,
  snapshot: RealityContextSnapshot,
  refs: readonly RealityContextSourceRef[],
) {
  const maxAgeDays =
    requirement.freshnessPolicy.maxAgeDays;

  if (
    maxAgeDays === null ||
    requirement.freshnessPolicy.stableCharacteristic
  ) {
    return false;
  }

  const asOf = parseTime(snapshot.asOf);
  const latest = latestEvidenceTime(snapshot, refs);

  if (asOf === null || latest === null) {
    return false;
  }

  const ageMs = Math.max(0, asOf - latest);
  const maxAgeMs =
    maxAgeDays * 24 * 60 * 60 * 1000;

  return ageMs > maxAgeMs;
}

function mapAcquisitionMethodToUserOption(
  method: GoalEvidenceAcquisitionMethodCode,
): GoalEvidenceUserOptionCode | null {
  switch (method) {
    case "direct_question":
      return "answer_now";
    case "natural_observation":
    case "device_import":
      return "observe_then_refresh";
    case "professional_assessment":
      return "professional_assessment";
    case "later_plan_observation":
      return "proceed_provisionally";
    case "existing_reality":
    case "external_document":
      return null;
  }
}

function unique<T>(values: readonly T[]) {
  return [...new Set(values)];
}

function coverageStatus(params: {
  requirement: GoalEvidenceRequirement;
  snapshot: RealityContextSnapshot;
  match: GoalEvidenceRequirementMatch | undefined;
}): GoalEvidenceCoverageStatusCode {
  const { requirement, snapshot, match } = params;

  if (match?.explicitlyNotApplicable) {
    return "not_applicable";
  }

  if (
    requirement.professionalAssessmentRequired &&
    !match?.professionalAssessmentCompleted
  ) {
    return "professional_evaluation_required";
  }

  if (
    !match ||
    match.matchedSourceRefs.length === 0
  ) {
    return "missing";
  }

  if (
    evidenceIsStale(
      requirement,
      snapshot,
      match.matchedSourceRefs,
    )
  ) {
    return "stale";
  }

  return match.evidenceAdequacyCode === "sufficient"
    ? "sufficient"
    : "partial";
}

function acquisitionOptions(params: {
  requirement: GoalEvidenceRequirement;
  statusCode: GoalEvidenceCoverageStatusCode;
}) {
  const { requirement, statusCode } = params;

  if (
    statusCode === "sufficient" ||
    statusCode === "not_applicable"
  ) {
    return [] as GoalEvidenceUserOptionCode[];
  }

  const options =
    requirement.acquisitionMethodCodes
      .map(mapAcquisitionMethodToUserOption)
      .filter(
        (value): value is GoalEvidenceUserOptionCode =>
          value !== null,
      );

  if (
    requirement.provisionalUseAllowed &&
    !options.includes("proceed_provisionally")
  ) {
    options.push("proceed_provisionally");
  }

  return unique(options);
}

function blocksAffectedPlanPart(params: {
  requirement: GoalEvidenceRequirement;
  statusCode: GoalEvidenceCoverageStatusCode;
}) {
  const { requirement, statusCode } = params;

  if (
    statusCode === "sufficient" ||
    statusCode === "not_applicable"
  ) {
    return false;
  }

  if (
    statusCode === "professional_evaluation_required"
  ) {
    return true;
  }

  return (
    requirement.importanceCode === "critical" &&
    !requirement.provisionalUseAllowed
  );
}

export function buildGoalEvidenceCoverageReport(params: {
  package: GoalEvidenceRequirementPackage;
  snapshot: RealityContextSnapshot;
  matches: readonly GoalEvidenceRequirementMatch[];
}): GoalEvidenceCoverageReport {
  const matchByRequirement = new Map(
    params.matches.map(
      (match) => [match.requirementCode, match] as const,
    ),
  );

  const items: GoalEvidenceCoverageItem[] =
    params.package.requirements.map((requirement) => {
      const match =
        matchByRequirement.get(
          requirement.requirementCode,
        );

      const statusCode = coverageStatus({
        requirement,
        snapshot: params.snapshot,
        match,
      });

      return {
        requirementCode:
          requirement.requirementCode,
        importanceCode:
          requirement.importanceCode,
        statusCode,
        matchedSourceRefs:
          match?.matchedSourceRefs ?? [],
        acquisitionOptionCodes:
          acquisitionOptions({
            requirement,
            statusCode,
          }),
        blocksAffectedPlanPart:
          blocksAffectedPlanPart({
            requirement,
            statusCode,
          }),
      };
    });

  const blockingRequirementCodes =
    items
      .filter((item) => item.blocksAffectedPlanPart)
      .map((item) => item.requirementCode);

  const unresolved = items.filter(
    (item) =>
      item.statusCode !== "sufficient" &&
      item.statusCode !== "not_applicable",
  );

  const readinessCode =
    blockingRequirementCodes.length > 0
      ? "blocked_for_specific_parts"
      : unresolved.length > 0
        ? "provisional"
        : "ready";

  return {
    packageCode: params.package.packageCode,
    packageVersion:
      params.package.packageVersion,
    readinessCode,
    totalRequirements: items.length,
    sufficientCount: items.filter(
      (item) => item.statusCode === "sufficient",
    ).length,
    partialCount: items.filter(
      (item) => item.statusCode === "partial",
    ).length,
    staleCount: items.filter(
      (item) => item.statusCode === "stale",
    ).length,
    missingCount: items.filter(
      (item) => item.statusCode === "missing",
    ).length,
    notApplicableCount: items.filter(
      (item) =>
        item.statusCode === "not_applicable",
    ).length,
    professionalEvaluationRequiredCount:
      items.filter(
        (item) =>
          item.statusCode ===
          "professional_evaluation_required",
      ).length,
    items,
    availableUserOptionCodes: unique(
      unresolved.flatMap(
        (item) => item.acquisitionOptionCodes,
      ),
    ),
    blockingRequirementCodes,
  };
}
