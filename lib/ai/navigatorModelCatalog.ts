import {
  ARCTOR_AI_MODEL_AUTO_SEED_EXPIRES_AT,
  ARCTOR_AI_MODEL_CATALOG,
  ARCTOR_AI_MODEL_CATALOG_VERIFIED_AT,
  ARCTOR_AI_MODEL_ORDER,
  getArctorAiModelDefinition,
  getPublicArctorAiModelCatalog,
  type ArctorAiBillingTierCode,
  type ArctorAiModelDefinition,
  type ArctorAiReasoningEffort,
} from "./platformModelCatalog";

export type NavigatorAiTierCode = ArctorAiBillingTierCode;
export type NavigatorReasoningEffort = ArctorAiReasoningEffort;
export type NavigatorModelDefinition = ArctorAiModelDefinition;

export const ARCTOR_NAVIGATOR_MODEL_CATALOG_V2 =
  "ARCTOR_NAVIGATOR_MODEL_CATALOG_V2_20260930" as const;

// Compatibility alias for older imports. New API responses use V2.
export const ARCTOR_NAVIGATOR_MODEL_CATALOG_V1 =
  ARCTOR_NAVIGATOR_MODEL_CATALOG_V2;

export const NAVIGATOR_MODEL_CATALOG_VERIFIED_AT =
  ARCTOR_AI_MODEL_CATALOG_VERIFIED_AT;

export const NAVIGATOR_MODEL_AUTO_SEED_EXPIRES_AT =
  ARCTOR_AI_MODEL_AUTO_SEED_EXPIRES_AT;

export const NAVIGATOR_MODEL_CATALOG = ARCTOR_AI_MODEL_CATALOG;

export function getNavigatorModelDefinition(
  tierCode: NavigatorAiTierCode,
) {
  return getArctorAiModelDefinition(tierCode);
}

export function getPublicNavigatorModelCatalog() {
  return getPublicArctorAiModelCatalog().filter(
    (item) => item.surfaces.navigator,
  );
}

export const NAVIGATOR_MODEL_ORDER = ARCTOR_AI_MODEL_ORDER;
