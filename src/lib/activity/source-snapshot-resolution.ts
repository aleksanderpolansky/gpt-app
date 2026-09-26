import type { FormulaExpressionNodeV1 } from "../reality-curator/formula-rule-registry.contract";

export type SourceResolution = {
  mode: "direct" | "direct_or_snapshot" | "snapshot_only";
  snapshotValueObjectId?: string;
  multiplier?: number;
};

export type SourceTargetQualification = {
  mode: "default" | "explicit_qualifier";
  aliases: string[];
};

export type SourceBinding = {
  parameterDefinitionId: string;
  valueObjectId: string;
  sourceResolution?: SourceResolution;
  targetQualification?: SourceTargetQualification;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueAliases(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("SOURCE_TARGET_QUALIFIER_ALIASES_INVALID");
  }

  const aliases = Array.from(
    new Set(
      value
        .map((item) => text(item))
        .filter(Boolean)
        .map((item) => item.slice(0, 180)),
    ),
  );

  if (aliases.length > 24) {
    throw new Error("SOURCE_TARGET_QUALIFIER_ALIASES_TOO_MANY");
  }

  return aliases;
}

export function parseSourceResolution(
  value: unknown,
): SourceResolution | undefined {
  if (value === undefined) return undefined;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("SOURCE_RESOLUTION_INVALID");
  }

  const row = value as Record<string, unknown>;

  if (row.mode === "direct") {
    return undefined;
  }

  if (row.mode !== "direct_or_snapshot" && row.mode !== "snapshot_only") {
    throw new Error("SOURCE_RESOLUTION_MODE_INVALID");
  }

  if (
    typeof row.snapshotValueObjectId !== "string" ||
    !UUID.test(row.snapshotValueObjectId)
  ) {
    throw new Error("SOURCE_SNAPSHOT_SELECTION_REQUIRED");
  }

  if (
    typeof row.multiplier !== "number" ||
    !Number.isFinite(row.multiplier)
  ) {
    throw new Error("SOURCE_SNAPSHOT_MULTIPLIER_INVALID");
  }

  return {
    mode: row.mode,
    snapshotValueObjectId: row.snapshotValueObjectId,
    multiplier: row.multiplier,
  };
}

export function parseSourceTargetQualification(
  value: unknown,
): SourceTargetQualification | undefined {
  if (value === undefined) return undefined;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("SOURCE_TARGET_QUALIFICATION_INVALID");
  }

  const row = value as Record<string, unknown>;
  if (row.mode !== "default" && row.mode !== "explicit_qualifier") {
    throw new Error("SOURCE_TARGET_QUALIFICATION_MODE_INVALID");
  }

  const aliases = uniqueAliases(row.aliases);
  if (row.mode === "explicit_qualifier" && aliases.length === 0) {
    throw new Error("SOURCE_TARGET_QUALIFIER_ALIAS_REQUIRED");
  }

  return {
    mode: row.mode,
    aliases,
  };
}

export function validateSourceBindingTargetQualifications(
  bindings: readonly SourceBinding[],
) {
  const byParameter = new Map<string, SourceBinding[]>();

  for (const binding of bindings) {
    const rows = byParameter.get(binding.parameterDefinitionId) ?? [];
    rows.push(binding);
    byParameter.set(binding.parameterDefinitionId, rows);
  }

  for (const rows of byParameter.values()) {
    const qualifiedRows = rows.filter(
      (row) => row.targetQualification !== undefined,
    );

    // Legacy profiles intentionally remain untouched. Their historical
    // fan-out semantics are preserved until the profile is explicitly
    // re-authored with target-qualification metadata.
    if (qualifiedRows.length === 0) {
      continue;
    }

    if (qualifiedRows.length !== rows.length) {
      throw new Error("SOURCE_TARGET_QUALIFICATION_PARTIAL_SET_INVALID");
    }

    const defaultCount = qualifiedRows.filter(
      (row) => row.targetQualification?.mode === "default",
    ).length;

    if (defaultCount > 1) {
      throw new Error("SOURCE_TARGET_QUALIFICATION_MULTIPLE_DEFAULTS");
    }

    for (const row of qualifiedRows) {
      parseSourceTargetQualification(row.targetQualification);
    }
  }
}

export function snapshotExpression(
  multiplier: number,
): FormulaExpressionNodeV1 {
  return {
    op: "multiply",
    args: [
      { op: "input", input: "snapshot" },
      { op: "literal", value: multiplier },
    ],
  };
}
