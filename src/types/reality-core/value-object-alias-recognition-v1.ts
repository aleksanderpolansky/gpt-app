export const VALUE_OBJECT_ALIAS_STATUSES_V1 = [
  "draft",
  "suggested",
  "needs_review",
  "approved",
  "published",
  "hidden",
  "flagged",
  "rejected",
  "archived",
] as const;

export type ValueObjectAliasStatusV1 =
  (typeof VALUE_OBJECT_ALIAS_STATUSES_V1)[number];

export type ValueObjectAliasV1 = {
  readonly id: string;
  readonly aliasText: string;
  readonly aliasNormalized: string;
  readonly locale: string | null;
  readonly status: ValueObjectAliasStatusV1;
  readonly sourceType: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly recognitionActive: boolean;
};

export type ValueObjectAliasProfileV1 = {
  readonly ok: true;
  readonly contractVersion: "P2D_VALUE_OBJECT_ALIAS_RECOGNITION_V1";
  readonly valueObject: {
    readonly id: string;
    readonly title: string;
    readonly canonicalKey: string;
    readonly statusCode: string;
    readonly definitionVersion: number;
  };
  readonly aliases: readonly ValueObjectAliasV1[];
  readonly summary: {
    readonly aliasCount: number;
    readonly recognitionActiveAliasCount: number;
  };
  readonly permissions: {
    readonly actorOwner: true;
    readonly canManageAliases: boolean;
    readonly hardDeleteEnabled: false;
    readonly primaryTitleManagedBy: "P2C";
  };
};

export type ValueObjectAliasManageActionV1 =
  | "add"
  | "archive"
  | "restore";

export type ValueObjectAliasManageResultV1 = {
  readonly ok: true;
  readonly contractVersion: "P2D_VALUE_OBJECT_ALIAS_RECOGNITION_V1";
  readonly action: ValueObjectAliasManageActionV1;
  readonly stateAlreadySatisfied: boolean;
  readonly definitionVersionBefore: number;
  readonly definitionVersionAfter: number;
  readonly definitionVersionChanged: false;
  readonly alias: ValueObjectAliasV1;
  readonly profile: ValueObjectAliasProfileV1;
};

export type ValueObjectRecognitionCandidateV1 = {
  readonly valueObjectId: string;
  readonly canonicalKey: string;
  readonly title: string;
  readonly facetCode: string;
  readonly objectKindCode: string;
  readonly nodeRoleCode: "root" | "intermediate" | "leaf";
  readonly definitionVersion: number;
  readonly matchKind: "primary_title" | "alias";
  readonly aliasId: string | null;
  readonly aliasText: string | null;
  readonly aliasLocale: string | null;
};

export type ValueObjectRecognitionResultV1 = {
  readonly ok: true;
  readonly contractVersion: "P2D_VALUE_OBJECT_ALIAS_RECOGNITION_V1";
  readonly matchingMode: "exact_normalized_v1";
  readonly queryText: string;
  readonly queryNormalized: string;
  readonly requestedLocale: string | null;
  readonly exactMatchCount: number;
  readonly ambiguous: boolean;
  readonly resolvedValueObjectId: string | null;
  readonly candidates: readonly ValueObjectRecognitionCandidateV1[];
};
