import type {
  ValueObjectOntologyCardNodeV1,
  ValueObjectOntologyCardV1,
} from "@/types/reality-core/value-object-ontology-runtime-v1";

export const VALUE_OBJECT_STRUCTURE_CARD_TYPES_V1 = [
  "ROOT_CARD",
  "INTERMEDIATE_CARD",
  "LEAF_CARD",
] as const;

export type ValueObjectStructureCardTypeV1 =
  (typeof VALUE_OBJECT_STRUCTURE_CARD_TYPES_V1)[number];

export type ValueObjectStructurePathNodeV1 = Pick<
  ValueObjectOntologyCardNodeV1,
  | "id"
  | "canonicalKey"
  | "title"
  | "facetCode"
  | "objectKindCode"
  | "nodeRoleCode"
  | "parentValueObjectId"
  | "rootValueObjectId"
  | "statusCode"
  | "definitionVersion"
> & {
  depth: number;
};

export type ValueObjectStructureChildV1 = Pick<
  ValueObjectOntologyCardNodeV1,
  | "id"
  | "canonicalKey"
  | "title"
  | "facetCode"
  | "objectKindCode"
  | "nodeRoleCode"
  | "parentValueObjectId"
  | "rootValueObjectId"
  | "statusCode"
  | "definitionVersion"
> & {
  childCount: number;
};

export type ValueObjectStructureCapabilitiesV1 = {
  canAddIntermediateChild: boolean;
  canAddLeafChild: boolean;
  canInsertIntermediateAbove: boolean;
  canReparent: boolean;
  canPreviewRestructure: boolean;
  canRename: boolean;
  canEditSemanticDefinition: boolean;
  canManageRecognition: boolean;
};

export type ValueObjectStructureCardV1 = {
  contractVersion: "value-object-structure-card-v1";
  cardType: ValueObjectStructureCardTypeV1;
  core: ValueObjectOntologyCardV1;
  path: ValueObjectStructurePathNodeV1[];
  children: ValueObjectStructureChildV1[];
  summary: {
    directChildCount: number;
    intermediateChildCount: number;
    leafChildCount: number;
    subtreeNodeCount: number;
    childFacetCounts: Record<string, number>;
  };
  recognition: {
    aliasCount: number;
    aliasStore: "concept_aliases";
    writeEnabled: true;
  };
  capabilities: ValueObjectStructureCapabilitiesV1;
};

export function isValueObjectStructureCardTypeV1(
  value: unknown,
): value is ValueObjectStructureCardTypeV1 {
  return (
    typeof value === "string" &&
    (VALUE_OBJECT_STRUCTURE_CARD_TYPES_V1 as readonly string[]).includes(value)
  );
}
