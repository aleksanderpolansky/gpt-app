export type ArctorAiBillingTierCode =
  | "nano"
  | "standard"
  | "pro"
  | "max";

export type ArctorAiReasoningEffort = "low" | "medium" | "max";

export type ArctorAiModelSurfaceAvailability = {
  navigator: boolean;
  dashboardProjection: boolean;
  aiChannels: boolean;
};

export type ArctorAiModelDefinition = {
  tierCode: ArctorAiBillingTierCode;
  modelName: string;
  displayName: string;
  shortLabel: string;
  caption: string;
  reasoningEffort: ArctorAiReasoningEffort;
  inputUsdPer1m: number;
  cachedInputUsdPer1m: number;
  outputUsdPer1m: number;
  sourceUrl: string;
  pricingSourceUrl: string;
  flagship: boolean;
  sortOrder: number;
  surfaces: ArctorAiModelSurfaceAvailability;
};

export const ARCTOR_AI_MODEL_CATALOG_V2 =
  "ARCTOR_AI_MODEL_CATALOG_V2_20260930" as const;

export const ARCTOR_AI_MODEL_CATALOG_VERIFIED_AT =
  "2026-09-30T00:00:00.000Z" as const;

export const ARCTOR_AI_MODEL_AUTO_SEED_EXPIRES_AT =
  "2026-10-07T23:59:59.999Z" as const;

const PRICING_SOURCE_URL =
  "https://developers.openai.com/api/docs/pricing";

export const ARCTOR_AI_MODEL_CATALOG: Record<
  ArctorAiBillingTierCode,
  ArctorAiModelDefinition
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
    sourceUrl:
      "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
    pricingSourceUrl: PRICING_SOURCE_URL,
    flagship: false,
    sortOrder: 10,
    surfaces: {
      navigator: true,
      dashboardProjection: true,
      aiChannels: false,
    },
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
    sourceUrl:
      "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
    pricingSourceUrl: PRICING_SOURCE_URL,
    flagship: false,
    sortOrder: 20,
    surfaces: {
      navigator: true,
      dashboardProjection: true,
      aiChannels: false,
    },
  },
  pro: {
    tierCode: "pro",
    modelName: "gpt-5.6-sol",
    displayName: "GPT-5.6 Sol",
    shortLabel: "Sol",
    caption: "powerful",
    reasoningEffort: "max",
    inputUsdPer1m: 4,
    cachedInputUsdPer1m: 0.4,
    outputUsdPer1m: 20,
    sourceUrl:
      "https://developers.openai.com/api/docs/models/gpt-5.6-sol",
    pricingSourceUrl: PRICING_SOURCE_URL,
    flagship: false,
    sortOrder: 30,
    surfaces: {
      navigator: true,
      dashboardProjection: true,
      aiChannels: false,
    },
  },
  max: {
    tierCode: "max",
    modelName: "gpt-6-astra",
    displayName: "GPT-6 Astra",
    shortLabel: "Astra",
    caption: "flagship / max",
    reasoningEffort: "max",
    inputUsdPer1m: 10,
    cachedInputUsdPer1m: 1,
    outputUsdPer1m: 50,
    sourceUrl:
      "https://developers.openai.com/api/docs/models/gpt-6-astra",
    pricingSourceUrl: PRICING_SOURCE_URL,
    flagship: true,
    sortOrder: 40,
    surfaces: {
      navigator: true,
      dashboardProjection: true,
      // AI channels still bypass the unified billing gateway today.
      // Enable this only in the channel-gateway migration patch.
      aiChannels: false,
    },
  },
};

export const ARCTOR_AI_MODEL_ORDER = [
  "nano",
  "standard",
  "pro",
  "max",
] as const satisfies readonly ArctorAiBillingTierCode[];

export function getArctorAiModelDefinition(
  tierCode: ArctorAiBillingTierCode,
) {
  return ARCTOR_AI_MODEL_CATALOG[tierCode];
}

export function getPublicArctorAiModelCatalog() {
  return ARCTOR_AI_MODEL_ORDER.map((tierCode) => {
    const item = ARCTOR_AI_MODEL_CATALOG[tierCode];

    return {
      tierCode: item.tierCode,
      modelName: item.modelName,
      displayName: item.displayName,
      shortLabel: item.shortLabel,
      caption: item.caption,
      reasoningEffort: item.reasoningEffort,
      flagship: item.flagship,
      frontier: item.flagship,
      sortOrder: item.sortOrder,
      surfaces: item.surfaces,
    };
  });
}
