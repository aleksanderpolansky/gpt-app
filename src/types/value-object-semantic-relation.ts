export type ValueObjectSemanticRelationLocale =
  | "en"
  | "pl"
  | "ru"
  | "uk"
  | "de"
  | "es"
  | "cs";

export type ValueObjectRelationDirectionality = "directed" | "symmetric";
export type ValueObjectRelationPerspective =
  | "outgoing"
  | "incoming"
  | "symmetric";
export type ValueObjectRelationStatus = "active" | "inactive";
export type ValueObjectRelationProvenance =
  | "manual"
  | "ai_suggested"
  | "imported"
  | "system";

export interface ValueObjectRelationTypeDto {
  relationTypeCode: string;
  directionalityCode: ValueObjectRelationDirectionality;
  fromScopeCode: "ordinary" | "analysis" | "both" | string;
  toScopeCode: "ordinary" | "analysis" | "both" | string;
  titleKey: string;
  descriptionKey: string;
  reverseTitleKey: string;
  reverseDescriptionKey: string;
  allowSelfLink: boolean;
  contractVersion: number;
  displayOrder: number;
  status: "active" | "inactive" | "future" | string;
}

export interface ValueObjectRelationCandidateDto {
  id: string;
  title: string;
  branchTypeCode: string | null;
  objectKind: string | null;
  nodeRoleCode: string | null;
  status: string;
}

export interface ValueObjectSemanticRelationDto {
  id: string;
  relationTypeCode: string;
  directionalityCode: ValueObjectRelationDirectionality;
  perspective: ValueObjectRelationPerspective;
  titleKey: string;
  descriptionKey: string;
  reverseTitleKey: string;
  reverseDescriptionKey: string;
  relatedValueObject: ValueObjectRelationCandidateDto;
  status: ValueObjectRelationStatus;
  provenanceCode: ValueObjectRelationProvenance | string;
  createdAt: string;
  updatedAt: string;
  deactivatedAt: string | null;
  reactivatedAt: string | null;
  canDeactivate: boolean;
  canReactivate: boolean;
}

export interface ValueObjectSemanticRelationListResponse {
  ok?: boolean;
  valueObjectId?: string;
  relationTypes?: ValueObjectRelationTypeDto[];
  candidates?: ValueObjectRelationCandidateDto[];
  relations?: ValueObjectSemanticRelationDto[];
  error?: string;
  errorCode?: string | null;
}

export interface ValueObjectSemanticRelationMutationResponse {
  ok?: boolean;
  disposition?: string;
  relation?: {
    id?: string;
    status?: string;
    relationTypeCode?: string;
    sourceValueObjectId?: string;
    targetValueObjectId?: string;
  };
  error?: string;
  errorCode?: string | null;
}
