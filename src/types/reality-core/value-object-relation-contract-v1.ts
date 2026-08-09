export const VALUE_OBJECT_RELATION_FAMILIES_V1 = [
  "structural_crosslink",
  "motivation",
  "goal",
  "resource",
  "temporal",
  "analytics",
] as const;

export type ValueObjectRelationFamilyV1 =
  (typeof VALUE_OBJECT_RELATION_FAMILIES_V1)[number];

export const VALUE_OBJECT_RELATION_CANONICAL_ORIENTATIONS_V1 = [
  "same",
  "reverse",
  "symmetric",
] as const;

export type ValueObjectRelationCanonicalOrientationV1 =
  (typeof VALUE_OBJECT_RELATION_CANONICAL_ORIENTATIONS_V1)[number];

export const VALUE_OBJECT_RELATION_WRITE_POLICIES_V1 = [
  "enabled",
  "reverse_alias",
  "disabled",
  "future",
] as const;

export type ValueObjectRelationWritePolicyV1 =
  (typeof VALUE_OBJECT_RELATION_WRITE_POLICIES_V1)[number];

export const VALUE_OBJECT_RELATION_EVIDENCE_DIRECTIONS_V1 = [
  "supports",
  "contradicts",
] as const;

export type ValueObjectRelationEvidenceDirectionV1 =
  (typeof VALUE_OBJECT_RELATION_EVIDENCE_DIRECTIONS_V1)[number];

export const VALUE_OBJECT_RELATION_EVIDENCE_KINDS_V1 = [
  "user_statement",
  "activity_fact",
  "measure",
  "external_source",
  "expert_model",
  "system_rule",
  "correction",
] as const;

export type ValueObjectRelationEvidenceKindV1 =
  (typeof VALUE_OBJECT_RELATION_EVIDENCE_KINDS_V1)[number];

export const VALUE_OBJECT_RELATION_EVIDENCE_SOURCE_TYPES_V1 = [
  "user",
  "activity",
  "fact",
  "measure",
  "external",
  "expert_model",
  "system_rule",
] as const;

export type ValueObjectRelationEvidenceSourceTypeV1 =
  (typeof VALUE_OBJECT_RELATION_EVIDENCE_SOURCE_TYPES_V1)[number];

export type ValueObjectRelationCandidateValidationV1 = {
  readonly ok: true;
  readonly contractVersion: "P3_RELATION_DATA_CONTRACT_V1";
  readonly allowed: boolean;
  readonly reasonCode: string | null;
  readonly requestedRelationTypeCode: string;
  readonly canonicalRelationTypeCode: string | null;
  readonly canonicalSourceValueObjectId: string | null;
  readonly canonicalTargetValueObjectId: string | null;
  readonly canonicalOrientationCode:
    | ValueObjectRelationCanonicalOrientationV1
    | null;
  readonly relationFamilyCode: ValueObjectRelationFamilyV1 | null;
  readonly aiWritePolicyCode: "proposal_only" | "disabled" | null;
  readonly evidencePolicyCode: "optional" | "required" | null;
  readonly worldEvaluationPolicyCode: "contextual_only" | null;
};

export type ValueObjectRelationEvidenceV1 = {
  readonly id: string;
  readonly relationId: string;
  readonly ownerUserId: string;
  readonly ownerActorId: string;
  readonly evidenceDirectionCode: ValueObjectRelationEvidenceDirectionV1;
  readonly evidenceKindCode: ValueObjectRelationEvidenceKindV1;
  readonly sourceTypeCode: ValueObjectRelationEvidenceSourceTypeV1;
  readonly sourceReference: string | null;
  readonly evidenceText: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
};
