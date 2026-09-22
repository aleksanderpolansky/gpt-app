import type { FormulaExpressionNodeV1 } from "../reality-curator/formula-rule-registry.contract";

export type SourceResolution = {
  mode: "direct" | "direct_or_snapshot" | "snapshot_only";
  snapshotValueObjectId?: string;
  multiplier?: number;
};
export type SourceBinding = {
  parameterDefinitionId: string;
  valueObjectId: string;
  sourceResolution?: SourceResolution;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseSourceResolution(value: unknown): SourceResolution | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("SOURCE_RESOLUTION_INVALID");
  const row = value as Record<string, unknown>;
  if (row.mode === "direct") return undefined;
  if (row.mode !== "direct_or_snapshot" && row.mode !== "snapshot_only") throw new Error("SOURCE_RESOLUTION_MODE_INVALID");
  if (typeof row.snapshotValueObjectId !== "string" || !UUID.test(row.snapshotValueObjectId)) throw new Error("SOURCE_SNAPSHOT_SELECTION_REQUIRED");
  if (typeof row.multiplier !== "number" || !Number.isFinite(row.multiplier)) throw new Error("SOURCE_SNAPSHOT_MULTIPLIER_INVALID");
  return { mode: row.mode, snapshotValueObjectId: row.snapshotValueObjectId, multiplier: row.multiplier };
}
export function snapshotExpression(multiplier: number): FormulaExpressionNodeV1 {
  return { op: "multiply", args: [{ op: "input", input: "snapshot" }, { op: "literal", value: multiplier }] };
}
