/**
 * GPT-APP / AI-NAVIGATOR
 * Public Semantic Cloud type contract.
 *
 * This file is intentionally type-only.
 *
 * Safety rules:
 * - Read-only public-safe projection.
 * - No write/resolver/admin actions.
 * - No raw unknownTermCandidates/externalConceptCandidates.
 * - No private activity links or private activity counts.
 * - No raw Value Object titles as public cloud labels in v0.
 */

export type SemanticCloudObjectType =
  | "organization"
  | "offer"
  | "certificate"
  | "event"
  | "public_value_object"
  | "public_info_unit";

export type SemanticCloudSource =
  | "entity_classifications_contextual_categories"
  | "legacy_organization_categories"
  | "public_object_links"
  | "empty_diagnostics";

export type SemanticCloudSourceStatus =
  | "ready"
  | "empty"
  | "partial"
  | "blocked"
  | "error";

export type SemanticCloudCategoryStatus =
  | "confirmed"
  | "resolved"
  | "approved"
  | "published";

export type SemanticCloudProjectionMode = "public_safe_projection";

export type SemanticCloudRelationKind =
  | "primary"
  | "secondary"
  | "related"
  | "child"
  | "parent";

export type SemanticCloudObjectTypeCounts = Partial<
  Record<SemanticCloudObjectType, number>
>;

export type SemanticCloudWordRelation = {
  readonly id: string;
  readonly categoryId: string;
  readonly key: string;
  readonly slug: string;
  readonly label: string;
  readonly relationKind: SemanticCloudRelationKind;
  readonly publicObjectCount: number;
  readonly href: string;
};

export type SemanticCloudWord = {
  readonly id: string;
  readonly categoryId: string;
  readonly key: string;
  readonly slug: string;
  readonly label: string;
  readonly normalizedLabel: string;
  readonly source: SemanticCloudSource;
  readonly status: SemanticCloudCategoryStatus;
  readonly publicObjectCount: number;
  readonly objectTypeCounts: SemanticCloudObjectTypeCounts;
  readonly weight: number;
  readonly minFontSizePx: number;
  readonly maxFontSizePx: number;
  readonly href: string;
  readonly objectTypes: readonly SemanticCloudObjectType[];
  readonly children: readonly SemanticCloudWordRelation[];
  readonly related: readonly SemanticCloudWordRelation[];
};

export type SemanticCloudDiagnostics = {
  readonly sourceStatus: SemanticCloudSourceStatus;
  readonly generatedAt: string;
  readonly source: SemanticCloudSource;
  readonly projectionMode: SemanticCloudProjectionMode;
  readonly totalWords: number;
  readonly totalPublicObjects: number;
  readonly allowedObjectTypes: readonly SemanticCloudObjectType[];
  readonly excludedPrivateLinks: boolean;
  readonly excludedRawCandidates: boolean;
  readonly excludedPreviewCandidates: boolean;
  readonly excludedUnresolvedCandidates: boolean;
  readonly excludedValueObjectTitlesAsLabelsInV0: boolean;
  readonly emptyReason?: string;
  readonly warnings: readonly string[];
};

export type SemanticCloudPublicResponse = {
  readonly ok: true;
  readonly mode: SemanticCloudProjectionMode;
  readonly generatedAt: string;
  readonly items: readonly SemanticCloudWord[];
  readonly diagnostics: SemanticCloudDiagnostics;
};

export type SemanticCloudPublicErrorResponse = {
  readonly ok: false;
  readonly mode: SemanticCloudProjectionMode;
  readonly generatedAt: string;
  readonly items: readonly [];
  readonly diagnostics: SemanticCloudDiagnostics & {
    readonly sourceStatus: "error";
  };
  readonly error: {
    readonly code: "semantic_cloud_public_projection_error";
    readonly message: string;
  };
};

export type SemanticCloudPublicApiResponse =
  | SemanticCloudPublicResponse
  | SemanticCloudPublicErrorResponse;

export type UnifiedInformationUnitKind =
  | "activity_event"
  | "organization"
  | "product"
  | "service"
  | "offer"
  | "certificate"
  | "event"
  | "public_value_object"
  | "private_value_object"
  | "public_info_unit";

export type UnifiedInformationUnitVisibility =
  | "private"
  | "organization_internal"
  | "public"
  | "public_safe_projection";

export type ValueObjectLifecycleKind =
  | "activity_first_system_can_create_or_link_vo"
  | "entity_first_user_created_vo_or_vo_backed_entity";

export type UnifiedExtractionLifecycleNote = {
  readonly unitKind: UnifiedInformationUnitKind;
  readonly valueObjectLifecycle: ValueObjectLifecycleKind;
  readonly usesCommonCategoryExtraction: true;
  readonly categoriesLinkedToExistingEntity: boolean;
  readonly systemMayCreateValueObject: boolean;
  readonly publicProjectionAllowedOnlyThroughPublicSafeLinks: boolean;
};

export type SemanticCloudPublicQueryScope = {
  readonly allowedObjectTypes: readonly SemanticCloudObjectType[];
  readonly projectionMode: SemanticCloudProjectionMode;
  readonly source: SemanticCloudSource;
  readonly limit: number;
};

export type SemanticCloudPublicEmptyReason =
  | "no_public_objects"
  | "no_confirmed_public_safe_category_links"
  | "source_blocked"
  | "not_implemented_yet";
