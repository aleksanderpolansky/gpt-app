export type NavigatorAiTierCode = "nano" | "standard" | "pro";
export type NavigatorReasoningEffort = "low" | "medium" | "max";

export type NavigatorModelDefinition = {
  tierCode: NavigatorAiTierCode;
  modelName: string;
  displayName: string;
  shortLabel: string;
  caption: string;
  reasoningEffort: NavigatorReasoningEffort;
  inputUsdPer1m: number;
  cachedInputUsdPer1m: number;
  outputUsdPer1m: number;
  sourceUrl: string;
};

export const ARCTOR_NAVIGATOR_MODEL_CATALOG_V1 =
  "ARCTOR_NAVIGATOR_MODEL_CATALOG_V1" as const;

export const NAVIGATOR_MODEL_CATALOG_VERIFIED_AT =
  "2026-09-04T00:00:00.000Z" as const;
export const NAVIGATOR_MODEL_AUTO_SEED_EXPIRES_AT =
  "2026-09-11T23:59:59.999Z" as const;

const SOURCE_URL = "https://developers.openai.com/api/docs/models";

export const NAVIGATOR_MODEL_CATALOG: Record<
  NavigatorAiTierCode,
  NavigatorModelDefinition
> = {
  nano: {
    tierCode: "nano",
    modelName: "gpt-5.6-luna",
    displayName: "GPT-5.6 Luna",
    shortLabel: "Luna",
    caption: "fast / economy",
    reasoningEffort: "low",
    inputUsdPer1m: 0.2,
    cachedInputUsdPer1m: 0.02,
    outputUsdPer1m: 1.2,
    sourceUrl: SOURCE_URL,
  },
  standard: {
    tierCode: "standard",
    modelName: "gpt-5.6-terra",
    displayName: "GPT-5.6 Terra",
    shortLabel: "Terra",
    caption: "balanced",
    reasoningEffort: "medium",
    inputUsdPer1m: 2,
    cachedInputUsdPer1m: 0.2,
    outputUsdPer1m: 12,
    sourceUrl: SOURCE_URL,
  },
  pro: {
    tierCode: "pro",
    modelName: "gpt-5.6-sol",
    displayName: "GPT-5.6 Sol",
    shortLabel: "Sol",
    caption: "max",
    reasoningEffort: "max",
    inputUsdPer1m: 4,
    cachedInputUsdPer1m: 0.4,
    outputUsdPer1m: 20,
    sourceUrl: SOURCE_URL,
  },
};

export function getNavigatorModelDefinition(tierCode: NavigatorAiTierCode) {
  return NAVIGATOR_MODEL_CATALOG[tierCode];
}

export function getPublicNavigatorModelCatalog() {
  return (["nano", "standard", "pro"] as const).map((tierCode) => {
    const item = NAVIGATOR_MODEL_CATALOG[tierCode];
    return {
      tierCode: item.tierCode,
      modelName: item.modelName,
      displayName: item.displayName,
      shortLabel: item.shortLabel,
      caption: item.caption,
      reasoningEffort: item.reasoningEffort,
      frontier: tierCode === "pro",
    };
  });
}
