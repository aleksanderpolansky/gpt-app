import crypto from "node:crypto";
import { Buffer } from "node:buffer";

import { getNavigatorModelDefinition } from "../../../lib/ai/navigatorModelCatalog";
import type { LocaleCode } from "@/i18n";
import { runBillableAiJson } from "../ai-billing/gateway.server";
import type { HelpBlockKind, HelpTranslations } from "./helpTypes";

const HELP_LOCALES: readonly LocaleCode[] = [
  "ru",
  "pl",
  "en",
  "es",
  "uk",
  "de",
  "cs",
] as const;

const LOCALE_NAMES: Record<LocaleCode, string> = {
  ru: "Russian",
  pl: "Polish",
  en: "English",
  es: "Spanish",
  uk: "Ukrainian",
  de: "German",
  cs: "Czech",
};

const HELP_TRANSLATION_ROUTE_PATH = "/api/admin/help-system";
const HELP_TRANSLATION_OPERATION_KIND = "content_localization" as const;
const HELP_TRANSLATION_MODEL_TIER = "pro" as const;
const HELP_TRANSLATION_MAX_OUTPUT_TOKENS = 16_000;
const HELP_TRANSLATION_OUTPUT_TOKEN_CEILING = 18_000;
const HELP_TRANSLATION_REQUEST_TIMEOUT_MS = 90_000;

const TRANSLATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    HELP_LOCALES.map((locale) => [locale, { type: "string" }]),
  ),
  required: [...HELP_LOCALES],
} satisfies Record<string, unknown>;

function readTranslations(value: unknown): HelpTranslations {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("HELP_TRANSLATION_INVALID_OBJECT");
  }

  const record = value as Record<string, unknown>;
  const result = {} as HelpTranslations;

  for (const locale of HELP_LOCALES) {
    const text = record[locale];
    if (typeof text !== "string" || !text.trim()) {
      throw new Error(`HELP_TRANSLATION_MISSING_LOCALE:${locale}`);
    }
    result[locale] = text.trim();
  }

  return result;
}

export function hashHelpSourceText(sourceText: string) {
  return crypto.createHash("sha256").update(sourceText, "utf8").digest("hex");
}

export async function translateHelpBlockAllLocales(input: {
  sourceLocale: LocaleCode;
  sourceText: string;
  billingUserId: string;
  requestIdempotencyKey: string;
  helpKey: string;
  blockKind: HelpBlockKind;
}) {
  const sourceText = input.sourceText.trim();

  if (!sourceText) {
    const translations = Object.fromEntries(
      HELP_LOCALES.map((locale) => [locale, ""]),
    ) as HelpTranslations;
    return {
      translations,
      provider: "none",
      modelName: null,
      reasoningEffort: null,
      responseId: null,
      usage: null,
      sourceHash: hashHelpSourceText(""),
    };
  }

  // HELP translations intentionally use the server-approved frontier slot.
  // Unlike ordinary content localization, EVERY non-empty admin save generates
  // a fresh seven-locale set and overwrites the previous translated variants.
  const frontier = getNavigatorModelDefinition("pro");

  const system = [
    "You are the localization engine for ARCTor's administrator-approved help system.",
    "Translate the supplied help block faithfully into all seven requested languages.",
    "Preserve the exact meaning, product names, URLs, numbers and factual qualifiers.",
    "Use natural professional UI language, not literal calques.",
    "Do not add new promises, benefits, legal claims, medical claims or marketing facts.",
    "The source may be either a WHAT block (what the feature is) or a WHY block (why it is useful); preserve that intent exactly.",
    "Return only the strict structured output.",
  ].join("\n");

  const user = {
    sourceLocale: input.sourceLocale,
    sourceLanguage: LOCALE_NAMES[input.sourceLocale],
    sourceText,
    targetLocales: HELP_LOCALES.map((locale) => ({
      code: locale,
      language: LOCALE_NAMES[locale],
    })),
    translationPolicy: "fresh_all_locales_on_every_admin_save",
  };

  // Conservative token reservation: UTF-8 bytes are an upper bound for the
  // number of ordinary text tokens. The fixed overhead covers provider
  // framing / schema serialization without under-reserving the admin save.
  const estimatedInputTokens =
    Buffer.byteLength(
      system + JSON.stringify(user) + JSON.stringify(TRANSLATION_SCHEMA),
      "utf8",
    ) + 1_024;

  const response = await runBillableAiJson<HelpTranslations>({
    billingUserId: input.billingUserId,
    requestIdempotencyKey: input.requestIdempotencyKey,
    routePath: HELP_TRANSLATION_ROUTE_PATH,
    operationKind: HELP_TRANSLATION_OPERATION_KIND,
    modelName: frontier.modelName,
    tierCode: HELP_TRANSLATION_MODEL_TIER,
    estimatedInputTokens,
    estimatedOutputTokens: HELP_TRANSLATION_OUTPUT_TOKEN_CEILING,
    preflightSafetyMultiplier: 1.25,
    providerRequest: {
      system,
      user,
      reasoningEffort: frontier.reasoningEffort,
      maxOutputTokens: HELP_TRANSLATION_MAX_OUTPUT_TOKENS,
      outputTokenCeiling: HELP_TRANSLATION_OUTPUT_TOKEN_CEILING,
      requestTimeoutMs: HELP_TRANSLATION_REQUEST_TIMEOUT_MS,
      maxRetries: 0,
      store: false,
      structuredOutput: {
        name: "arctor_help_translation_v1",
        schema: TRANSLATION_SCHEMA,
        strict: true,
      },
    },
    reason: "ARCTor administrator help translation",
    requestMetadata: {
      runtimeCode: "help_translation",
      helpKey: input.helpKey,
      blockKind: input.blockKind,
      sourceLocale: input.sourceLocale,
      targetLocales: [...HELP_LOCALES],
      translationPolicy: "fresh_all_locales_on_every_admin_save",
      billingPolicy: "initiating_admin",
      billingUserId: input.billingUserId,
    },
    settlementMetadata: {
      runtimeCode: "help_translation",
      helpKey: input.helpKey,
      blockKind: input.blockKind,
      billingPolicy: "initiating_admin",
      billingUserId: input.billingUserId,
    },
  });

  const translations = readTranslations(response.parsed);

  // The administrator's edited locale remains exact; all other locales are
  // freshly regenerated from it on every save.
  translations[input.sourceLocale] = sourceText;

  return {
    translations,
    provider: "openai",
    modelName: response.usage.model ?? frontier.modelName,
    reasoningEffort: frontier.reasoningEffort,
    responseId: response.usage.responseId,
    usage: response.usage.rawUsage,
    billing: {
      billingUserId: input.billingUserId,
      billingPolicy: "initiating_admin" as const,
      usageEventId: response.billing.usageEventId,
      walletDebitEur: response.billing.walletDebitEur,
      requestIdempotencyKey: response.billing.requestIdempotencyKey,
    },
    sourceHash: hashHelpSourceText(sourceText),
  };
}

export const HELP_TRANSLATION_POLICY_V1 = {
  locales: HELP_LOCALES,
  savePolicy: "fresh_all_locales_on_every_admin_save",
  modelSlot: "pro",
  reasoning: "max",
  store: false,
} as const;
