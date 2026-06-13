// GPT-APP / AI-NAVIGATOR
// Value Object Characteristics / Relations / Measures / Rollup read-only preview utilities
// Runtime status: no DB writes, no SQL execution, no OpenAI calls.
// This module is intentionally pure: it only transforms provided fixture/candidate data.

import type {
  ActivityEventMeasure,
  AnalyticsRollupMetric,
  AnalyticsRollupPreviewItem,
  ImpactRule,
  ValueObjectCharacteristic,
  ValueObjectRelation,
} from "../types/value-object-characteristics-rollup";

export interface RollupPreviewValueObjectLike {
  id: string;
  title: string;
  parentId?: string;
  description?: string;
}

export interface RollupPreviewInput {
  valueObjects: RollupPreviewValueObjectLike[];
  characteristics: ValueObjectCharacteristic[];
  eventMeasures: ActivityEventMeasure[];
  relations: ValueObjectRelation[];
  impactRules: ImpactRule[];
  rollupPreview: AnalyticsRollupPreviewItem[];
}

export interface RollupPreviewValueObjectNode {
  id: string;
  title: string;
  parentId?: string;
  description?: string;
  children: RollupPreviewValueObjectNode[];
}

export interface RollupPreviewMetricSummary {
  metric: AnalyticsRollupMetric;
  rawValue: number;
  weightedValue: number;
  unit?: string;
}

export interface RollupPreviewTargetSummary {
  targetValueObjectId: string;
  targetTitle: string;
  metrics: RollupPreviewMetricSummary[];
  relationPaths: string[][];
  confidenceAverage?: number;
}

export interface RollupPreviewSummary {
  valueObjectsCount: number;
  characteristicsCount: number;
  eventMeasuresCount: number;
  relationsCount: number;
  impactRulesCount: number;
  rollupItemsCount: number;
  isReadOnly: true;
  noDbWrites: true;
  targets: RollupPreviewTargetSummary[];
}

export function createValueObjectTitleMap(
  valueObjects: RollupPreviewValueObjectLike[],
): Record<string, string> {
  return valueObjects.reduce<Record<string, string>>((accumulator, valueObject) => {
    accumulator[valueObject.id] = valueObject.title;
    return accumulator;
  }, {});
}

export function buildValueObjectTree(
  valueObjects: RollupPreviewValueObjectLike[],
): RollupPreviewValueObjectNode[] {
  const nodesById = new Map<string, RollupPreviewValueObjectNode>();

  for (const valueObject of valueObjects) {
    nodesById.set(valueObject.id, {
      id: valueObject.id,
      title: valueObject.title,
      parentId: valueObject.parentId,
      description: valueObject.description,
      children: [],
    });
  }

  const roots: RollupPreviewValueObjectNode[] = [];

  for (const node of nodesById.values()) {
    if (node.parentId && nodesById.has(node.parentId)) {
      nodesById.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function getRelationsForValueObject(
  relations: ValueObjectRelation[],
  valueObjectId: string,
): ValueObjectRelation[] {
  return relations.filter(
    (relation) =>
      relation.fromValueObjectId === valueObjectId ||
      relation.toValueObjectId === valueObjectId,
  );
}

export function getEventMeasuresForValueObject(
  eventMeasures: ActivityEventMeasure[],
  valueObjectId: string,
): ActivityEventMeasure[] {
  return eventMeasures.filter((measure) => measure.valueObjectId === valueObjectId);
}

export function getCharacteristicsForValueObject(
  characteristics: ValueObjectCharacteristic[],
  valueObjectId: string,
): ValueObjectCharacteristic[] {
  return characteristics.filter(
    (characteristic) => characteristic.valueObjectId === valueObjectId,
  );
}

export function summarizeRollupPreview(
  input: RollupPreviewInput,
): RollupPreviewSummary {
  const titleMap = createValueObjectTitleMap(input.valueObjects);
  const targetMap = new Map<string, RollupPreviewTargetSummary>();

  for (const item of input.rollupPreview) {
    const existing = targetMap.get(item.targetValueObjectId);
    const metricSummary: RollupPreviewMetricSummary = {
      metric: item.metric,
      rawValue: item.rawValue,
      weightedValue: item.weightedValue,
      unit: item.unit,
    };

    if (!existing) {
      targetMap.set(item.targetValueObjectId, {
        targetValueObjectId: item.targetValueObjectId,
        targetTitle: titleMap[item.targetValueObjectId] ?? item.targetValueObjectId,
        metrics: [metricSummary],
        relationPaths: [item.relationPath],
        confidenceAverage: item.confidence,
      });
      continue;
    }

    existing.metrics.push(metricSummary);
    existing.relationPaths.push(item.relationPath);

    if (typeof item.confidence === "number") {
      const knownConfidences = input.rollupPreview
        .filter((candidate) => candidate.targetValueObjectId === item.targetValueObjectId)
        .map((candidate) => candidate.confidence)
        .filter((confidence): confidence is number => typeof confidence === "number");

      existing.confidenceAverage = knownConfidences.length
        ? knownConfidences.reduce((sum, confidence) => sum + confidence, 0) /
          knownConfidences.length
        : undefined;
    }
  }

  return {
    valueObjectsCount: input.valueObjects.length,
    characteristicsCount: input.characteristics.length,
    eventMeasuresCount: input.eventMeasures.length,
    relationsCount: input.relations.length,
    impactRulesCount: input.impactRules.length,
    rollupItemsCount: input.rollupPreview.length,
    isReadOnly: true,
    noDbWrites: true,
    targets: Array.from(targetMap.values()),
  };
}

export function formatRelationPath(
  relationPath: string[],
  valueObjects: RollupPreviewValueObjectLike[],
): string {
  const titleMap = createValueObjectTitleMap(valueObjects);
  return relationPath.map((id) => titleMap[id] ?? id).join(" -> ");
}

export function assertRollupPreviewIsReadOnly(
  summary: RollupPreviewSummary,
): true {
  if (summary.isReadOnly !== true || summary.noDbWrites !== true) {
    throw new Error("Rollup preview summary violated read-only guard.");
  }

  return true;
}
