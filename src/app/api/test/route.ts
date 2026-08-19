import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";
import { runAiJsonWithUsageMetadata } from "../../../../lib/ai/openaiClient";
import type { RunAiJsonUsageMetadata } from "../../../../lib/ai/openaiClient";
import { resolveRuntimeMethodologyContext } from "@/lib/ai/methodology/methodologyContext.server";
import {
  NAVIGATOR_MODEL_AUTO_SEED_EXPIRES_AT,
  NAVIGATOR_MODEL_CATALOG_VERIFIED_AT,
  getNavigatorModelDefinition,
  type NavigatorAiTierCode,
} from "../../../../lib/ai/navigatorModelCatalog";

export const dynamic = "force-dynamic";

export const ARCTOR_AI_RIGHT_RAIL_CHAT_PRICE_IMAGE_COMPAT_V1 =
  "ARCTOR_AI_RIGHT_RAIL_CHAT_PRICE_IMAGE_COMPAT_V1" as const;

export const ARCTOR_AI_RIGHT_RAIL_GPT56_MODEL_REGISTRY_V1 =
  "ARCTOR_AI_RIGHT_RAIL_GPT56_MODEL_REGISTRY_V1" as const;

type AiTierCode = NavigatorAiTierCode;

type ChatAiResponse = {
  reply: string;
};

type AppUserRow = {
  id: string;
  auth0_sub?: string | null;
  email?: string | null;
  name?: string | null;
};

type AiModelTierRow = {
  tier_code: string;
  display_name: string | null;
  default_model_name: string | null;
  enabled: boolean | null;
};

type AiModelPriceSnapshotRow = {
  tier_code: string;
  model_name: string;
  provider: string;
  pricing_currency: string;
  display_currency: string;
  input_cost_per_1m_tokens: string | number;
  cached_input_cost_per_1m_tokens: string | number | null;
  output_cost_per_1m_tokens: string | number;
  usd_to_eur_rate: string | number | null;
  eur_markup_multiplier: string | number | null;
  valid_from?: string | null;
  valid_to?: string | null;
  is_active?: boolean | null;
  source_url?: string | null;
  metadata?: unknown;
};

type AiCreditWalletRow = {
  id: string;
  app_user_id: string;
  balance_eur: string | number;
  reserved_eur: string | number;
  status: string;
};

type BillingPreflight = {
  tierCode: AiTierCode;
  modelName: string;
  wallet: AiCreditWalletRow;
  priceSnapshot: AiModelPriceSnapshotRow;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostEur: number;
  availableBalanceEur: number;
};

type UsageEventRow = {
  id: string;
};

type UsageDebitSettlement = {
  status: "wallet_debited" | "usage_debit_failed";
  usageEventId: string | null;
  walletId: string;
  balanceBeforeEur: number | null;
  balanceAfterEur: number | null;
  actualCostEur: number | null;
  walletDebitEur: number | null;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  openaiResponseId: string | null;
  errorCode?: string;
  errorMessage?: string;
};

const ALLOWED_TIERS = new Set<AiTierCode>(["nano", "standard", "pro"]);
const DEFAULT_TIER: AiTierCode = "standard";
const CHAT_MAX_OUTPUT_TOKENS = 200;
const PREFLIGHT_COST_SAFETY_MULTIPLIER = 1.25;
const CHAT_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
const CHAT_IMAGE_PREFLIGHT_TOKEN_ALLOWANCE = 4096;
const CHAT_IMAGE_DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

function parseSelectedTier(value: unknown): AiTierCode {
  if (typeof value !== "string") {
    return DEFAULT_TIER;
  }

  const normalized = value.trim().toLowerCase();

  if (ALLOWED_TIERS.has(normalized as AiTierCode)) {
    return normalized as AiTierCode;
  }

  return DEFAULT_TIER;
}

function asNumber(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toFixedNumber(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

function estimateInputTokens(systemPrompt: string, userMessage: string, hasImage = false) {
  const textEstimate = Math.max(1, Math.ceil((systemPrompt.length + userMessage.length) / 4));
  return textEstimate + (hasImage ? CHAT_IMAGE_PREFLIGHT_TOKEN_ALLOWANCE : 0);
}

function parseChatImage(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const dataUrl = typeof record.dataUrl === "string" ? record.dataUrl.trim() : "";
  if (!dataUrl) return null;

  const match = CHAT_IMAGE_DATA_URL_RE.exec(dataUrl);
  if (!match) {
    throw new Error("unsupported_chat_image");
  }

  const rawBytes = Math.floor((match[2].length * 3) / 4);
  if (rawBytes <= 0 || rawBytes > CHAT_IMAGE_MAX_BYTES) {
    throw new Error("chat_image_too_large");
  }

  return {
    dataUrl,
    mimeType: match[1],
    name: typeof record.name === "string" ? record.name.slice(0, 180) : "image",
  };
}

type FxRateResolution = {
  rate: number | null;
  source: "active_snapshot" | "historical_snapshot_fallback" | "not_available";
};

async function resolveUsdToEurRate(snapshot: AiModelPriceSnapshotRow): Promise<FxRateResolution> {
  const directRate = asNumber(snapshot.usd_to_eur_rate);
  if (directRate !== null && directRate > 0) {
    return { rate: directRate, source: "active_snapshot" };
  }

  const { data, error } = await supabase
    .from("ai_model_price_snapshots")
    .select("usd_to_eur_rate, valid_from")
    .eq("provider", "openai")
    .not("usd_to_eur_rate", "is", null)
    .order("valid_from", { ascending: false })
    .limit(1)
    .maybeSingle<{ usd_to_eur_rate: string | number | null; valid_from: string | null }>();

  if (error || !data) {
    return { rate: null, source: "not_available" };
  }

  const fallbackRate = asNumber(data.usd_to_eur_rate);
  return fallbackRate !== null && fallbackRate > 0
    ? { rate: fallbackRate, source: "historical_snapshot_fallback" }
    : { rate: null, source: "not_available" };
}

function getCostPer1mTokensEur(
  priceSnapshot: AiModelPriceSnapshotRow,
  fieldName:
    | "input_cost_per_1m_tokens"
    | "cached_input_cost_per_1m_tokens"
    | "output_cost_per_1m_tokens",
) {
  const rawCost = asNumber(priceSnapshot[fieldName]);

  if (rawCost === null || rawCost < 0) {
    return null;
  }

  const markup = asNumber(priceSnapshot.eur_markup_multiplier) ?? 1;
  const pricingCurrency = (priceSnapshot.pricing_currency ?? "USD").toUpperCase();
  const displayCurrency = (priceSnapshot.display_currency ?? "EUR").toUpperCase();

  if (pricingCurrency === "EUR" && displayCurrency === "EUR") {
    return rawCost * markup;
  }

  const usdToEurRate = asNumber(priceSnapshot.usd_to_eur_rate);

  if (pricingCurrency === "USD" && displayCurrency === "EUR" && usdToEurRate !== null) {
    return rawCost * usdToEurRate * markup;
  }

  return null;
}

function calculateEstimatedCostEur(params: {
  priceSnapshot: AiModelPriceSnapshotRow;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
}) {
  const inputEurPer1m = getCostPer1mTokensEur(
    params.priceSnapshot,
    "input_cost_per_1m_tokens",
  );
  const outputEurPer1m = getCostPer1mTokensEur(
    params.priceSnapshot,
    "output_cost_per_1m_tokens",
  );

  if (inputEurPer1m === null || outputEurPer1m === null) {
    return null;
  }

  const estimatedCostEur =
    (params.estimatedInputTokens / 1_000_000) * inputEurPer1m +
    (params.estimatedOutputTokens / 1_000_000) * outputEurPer1m;

  return toFixedNumber(estimatedCostEur * PREFLIGHT_COST_SAFETY_MULTIPLIER, 8);
}

function calculateActualCostEur(params: {
  priceSnapshot: AiModelPriceSnapshotRow;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}) {
  const inputEurPer1m = getCostPer1mTokensEur(
    params.priceSnapshot,
    "input_cost_per_1m_tokens",
  );
  const cachedInputEurPer1m =
    getCostPer1mTokensEur(params.priceSnapshot, "cached_input_cost_per_1m_tokens") ??
    inputEurPer1m;
  const outputEurPer1m = getCostPer1mTokensEur(
    params.priceSnapshot,
    "output_cost_per_1m_tokens",
  );

  if (inputEurPer1m === null || cachedInputEurPer1m === null || outputEurPer1m === null) {
    return null;
  }

  const cachedInputTokens = Math.min(
    Math.max(0, params.cachedInputTokens),
    Math.max(0, params.inputTokens),
  );
  const uncachedInputTokens = Math.max(0, params.inputTokens - cachedInputTokens);

  const actualCostEur =
    (uncachedInputTokens / 1_000_000) * inputEurPer1m +
    (cachedInputTokens / 1_000_000) * cachedInputEurPer1m +
    (Math.max(0, params.outputTokens) / 1_000_000) * outputEurPer1m;

  return toFixedNumber(actualCostEur, 8);
}

function toLedgerDebitAmountEur(actualCostEur: number) {
  if (!Number.isFinite(actualCostEur) || actualCostEur <= 0) {
    return 0;
  }

  const roundedUpToSixDecimals = Math.ceil(actualCostEur * 1_000_000) / 1_000_000;

  return toFixedNumber(Math.max(0.000001, roundedUpToSixDecimals), 6);
}

function billingErrorResponse(params: {
  status: number;
  code: string;
  message: string;
  selectedTier: AiTierCode;
  modelName?: string | null;
  availableBalanceEur?: number | null;
  estimatedCostEur?: number | null;
}) {
  return Response.json(
    {
      success: false,
      error: params.code,
      reply: params.message,
      selectedTier: params.selectedTier,
      model: params.modelName ?? null,
      billing: {
        status: "blocked_before_openai",
        availableBalanceEur: params.availableBalanceEur ?? null,
        estimatedCostEur: params.estimatedCostEur ?? null,
      },
    },
    { status: params.status },
  );
}


function pricesMatchCatalog(
  snapshot: AiModelPriceSnapshotRow,
  tierCode: AiTierCode,
) {
  const expected = getNavigatorModelDefinition(tierCode);
  const input = asNumber(snapshot.input_cost_per_1m_tokens);
  const cached = asNumber(snapshot.cached_input_cost_per_1m_tokens);
  const output = asNumber(snapshot.output_cost_per_1m_tokens);
  return (
    snapshot.model_name === expected.modelName &&
    input === expected.inputUsdPer1m &&
    cached === expected.cachedInputUsdPer1m &&
    output === expected.outputUsdPer1m
  );
}

async function ensureNavigatorTierModelCatalog(input: {
  tier: AiModelTierRow;
  tierCode: AiTierCode;
}) {
  const expected = getNavigatorModelDefinition(input.tierCode);

  const { data: exactSnapshot, error: exactError } = await supabase
    .from("ai_model_price_snapshots")
    .select(
      "tier_code, model_name, provider, pricing_currency, display_currency, input_cost_per_1m_tokens, cached_input_cost_per_1m_tokens, output_cost_per_1m_tokens, usd_to_eur_rate, eur_markup_multiplier, valid_from, valid_to, is_active, source_url, metadata",
    )
    .eq("tier_code", input.tierCode)
    .eq("provider", "openai")
    .eq("model_name", expected.modelName)
    .eq("is_active", true)
    .is("valid_to", null)
    .order("valid_from", { ascending: false })
    .limit(1)
    .maybeSingle<AiModelPriceSnapshotRow>();

  if (exactError) {
    throw new Error(`AI_NAVIGATOR_GPT56_PRICE_READ_FAILED:${exactError.message}`);
  }

  if (exactSnapshot) {
    if (!pricesMatchCatalog(exactSnapshot, input.tierCode)) {
      throw new Error("AI_NAVIGATOR_GPT56_PRICE_MISMATCH_FAIL_CLOSED");
    }

    if (input.tier.default_model_name !== expected.modelName) {
      const { error: tierUpdateError } = await supabase
        .from("ai_model_tiers")
        .update({ default_model_name: expected.modelName })
        .eq("tier_code", input.tierCode)
        .eq("enabled", true);
      if (tierUpdateError) {
        console.warn("AI_NAVIGATOR_GPT56_TIER_UPDATE_WARNING", tierUpdateError.message);
      }
    }

    return exactSnapshot;
  }

  if (Date.now() > Date.parse(NAVIGATOR_MODEL_AUTO_SEED_EXPIRES_AT)) {
    throw new Error("AI_NAVIGATOR_GPT56_AUTO_SEED_LEASE_EXPIRED");
  }

  const fxResolution = await supabase
    .from("ai_model_price_snapshots")
    .select("usd_to_eur_rate, valid_from")
    .eq("provider", "openai")
    .not("usd_to_eur_rate", "is", null)
    .order("valid_from", { ascending: false })
    .limit(1)
    .maybeSingle<{ usd_to_eur_rate: string | number | null; valid_from: string | null }>();

  if (fxResolution.error || !fxResolution.data) {
    throw new Error("AI_NAVIGATOR_GPT56_FX_RATE_UNAVAILABLE");
  }

  const fxRate = asNumber(fxResolution.data.usd_to_eur_rate);
  if (fxRate === null || fxRate <= 0) {
    throw new Error("AI_NAVIGATOR_GPT56_FX_RATE_INVALID");
  }

  const nowIso = new Date().toISOString();
  const { data: inserted, error: insertError } = await supabase
    .from("ai_model_price_snapshots")
    .insert({
      tier_code: input.tierCode,
      model_name: expected.modelName,
      provider: "openai",
      pricing_currency: "USD",
      display_currency: "EUR",
      input_cost_per_1m_tokens: expected.inputUsdPer1m,
      cached_input_cost_per_1m_tokens: expected.cachedInputUsdPer1m,
      output_cost_per_1m_tokens: expected.outputUsdPer1m,
      usd_to_eur_rate: fxRate,
      eur_markup_multiplier: 1,
      valid_from: nowIso,
      valid_to: null,
      is_active: true,
      source_url: expected.sourceUrl,
      source_note: `ARCTor verified navigator model catalog ${NAVIGATOR_MODEL_CATALOG_VERIFIED_AT}`,
      metadata: {
        contract: ARCTOR_AI_RIGHT_RAIL_GPT56_MODEL_REGISTRY_V1,
        verifiedAt: NAVIGATOR_MODEL_CATALOG_VERIFIED_AT,
        autoSeedExpiresAt: NAVIGATOR_MODEL_AUTO_SEED_EXPIRES_AT,
        reasoningEffort: expected.reasoningEffort,
        source: "server_verified_openai_model_catalog",
      },
    })
    .select(
      "tier_code, model_name, provider, pricing_currency, display_currency, input_cost_per_1m_tokens, cached_input_cost_per_1m_tokens, output_cost_per_1m_tokens, usd_to_eur_rate, eur_markup_multiplier, valid_from, valid_to, is_active, source_url, metadata",
    )
    .single<AiModelPriceSnapshotRow>();

  if (insertError || !inserted) {
    throw new Error(`AI_NAVIGATOR_GPT56_PRICE_INSERT_FAILED:${insertError?.message ?? "missing row"}`);
  }

  const { error: tierUpdateError } = await supabase
    .from("ai_model_tiers")
    .update({ default_model_name: expected.modelName })
    .eq("tier_code", input.tierCode)
    .eq("enabled", true);

  if (tierUpdateError) {
    console.warn("AI_NAVIGATOR_GPT56_TIER_UPDATE_WARNING", tierUpdateError.message);
  }

  const { error: deactivateError } = await supabase
    .from("ai_model_price_snapshots")
    .update({ is_active: false, valid_to: nowIso })
    .eq("tier_code", input.tierCode)
    .eq("provider", "openai")
    .eq("is_active", true)
    .is("valid_to", null)
    .neq("model_name", expected.modelName);

  if (deactivateError) {
    console.warn("AI_NAVIGATOR_GPT56_OLD_PRICE_DEACTIVATE_WARNING", deactivateError.message);
  }

  return inserted;
}

async function buildBillingPreflight(params: {
  appUserId: string;
  selectedTier: AiTierCode;
  systemPrompt: string;
  userMessage: string;
  hasImage?: boolean;
}): Promise<
  | { ok: true; preflight: BillingPreflight }
  | { ok: false; response: Response }
> {
  const { data: tier, error: tierError } = await supabase
    .from("ai_model_tiers")
    .select("tier_code, display_name, default_model_name, enabled")
    .eq("tier_code", params.selectedTier)
    .eq("enabled", true)
    .maybeSingle<AiModelTierRow>();

  if (tierError || !tier) {
    return {
      ok: false,
      response: billingErrorResponse({
        status: 400,
        code: "ai_tier_unavailable",
        message: "Ð’Ñ‹Ð±Ñ€Ð°Ð½Ð½Ñ‹Ð¹ ÑƒÑ€Ð¾Ð²ÐµÐ½ÑŒ AI ÑÐµÐ¹Ñ‡Ð°Ñ Ð½ÐµÐ´Ð¾ÑÑ‚ÑƒÐ¿ÐµÐ½.",
        selectedTier: params.selectedTier,
      }),
    };
  }

  let priceSnapshot: AiModelPriceSnapshotRow;
  try {
    priceSnapshot = await ensureNavigatorTierModelCatalog({
      tier,
      tierCode: params.selectedTier,
    });
  } catch (catalogError) {
    const code = catalogError instanceof Error ? catalogError.message : "AI_NAVIGATOR_GPT56_CATALOG_FAILED";
    return {
      ok: false,
      response: billingErrorResponse({
        status: 503,
        code: "missing_active_price_snapshot",
        message: code,
        selectedTier: params.selectedTier,
        modelName: getNavigatorModelDefinition(params.selectedTier).modelName,
      }),
    };
  }

  const fxResolution = await resolveUsdToEurRate(priceSnapshot);
  const effectivePriceSnapshot: AiModelPriceSnapshotRow =
    fxResolution.rate !== null
      ? { ...priceSnapshot, usd_to_eur_rate: fxResolution.rate }
      : priceSnapshot;

  const resolvedModelName = getNavigatorModelDefinition(params.selectedTier).modelName;

  const { data: wallet, error: walletError } = await supabase
    .from("ai_credit_wallets")
    .select("id, app_user_id, balance_eur, reserved_eur, status")
    .eq("app_user_id", params.appUserId)
    .eq("status", "active")
    .maybeSingle<AiCreditWalletRow>();

  if (walletError || !wallet) {
    return {
      ok: false,
      response: billingErrorResponse({
        status: 402,
        code: "missing_ai_wallet",
        message: "AI-Ð±Ð°Ð»Ð°Ð½Ñ Ð½Ðµ Ð½Ð°Ð¹Ð´ÐµÐ½. ÐÑƒÐ¶Ð½Ð¾ Ð¿Ð¾Ð¿Ð¾Ð»Ð½Ð¸Ñ‚ÑŒ AI-Ð¿Ð°ÐºÐµÑ‚ Ñ‡ÐµÑ€ÐµÐ· Ð°Ð´Ð¼Ð¸Ð½Ð¸ÑÑ‚Ñ€Ð°Ñ‚Ð¾Ñ€Ð°.",
        selectedTier: params.selectedTier,
        modelName: resolvedModelName,
      }),
    };
  }

  const balanceEur = asNumber(wallet.balance_eur);
  const reservedEur = asNumber(wallet.reserved_eur) ?? 0;

  if (balanceEur === null) {
    return {
      ok: false,
      response: billingErrorResponse({
        status: 503,
        code: "invalid_ai_wallet_balance",
        message: "AI-Ð±Ð°Ð»Ð°Ð½Ñ Ð²Ñ€ÐµÐ¼ÐµÐ½Ð½Ð¾ Ð½ÐµÐ´Ð¾ÑÑ‚ÑƒÐ¿ÐµÐ½ Ð´Ð»Ñ Ñ€Ð°ÑÑ‡Ñ‘Ñ‚Ð°.",
        selectedTier: params.selectedTier,
        modelName: resolvedModelName,
      }),
    };
  }

  const availableBalanceEur = toFixedNumber(Math.max(0, balanceEur - reservedEur), 8);
  const estimatedInputTokens = estimateInputTokens(
    params.systemPrompt,
    params.userMessage,
    params.hasImage === true,
  );
  const estimatedOutputTokens = CHAT_MAX_OUTPUT_TOKENS;
  const estimatedCostEur = calculateEstimatedCostEur({
    priceSnapshot: effectivePriceSnapshot,
    estimatedInputTokens,
    estimatedOutputTokens,
  });

  if (estimatedCostEur === null) {
    return {
      ok: false,
      response: billingErrorResponse({
        status: 503,
        code: "invalid_price_snapshot",
        message: "Ð¦ÐµÐ½Ð° Ð²Ñ‹Ð±Ñ€Ð°Ð½Ð½Ð¾Ð¹ Ð¼Ð¾Ð´ÐµÐ»Ð¸ Ð²Ñ€ÐµÐ¼ÐµÐ½Ð½Ð¾ Ð½ÐµÐ´Ð¾ÑÑ‚ÑƒÐ¿Ð½Ð° Ð´Ð»Ñ Ñ€Ð°ÑÑ‡Ñ‘Ñ‚Ð°.",
        selectedTier: params.selectedTier,
        modelName: resolvedModelName,
      }),
    };
  }

  if (availableBalanceEur < estimatedCostEur) {
    return {
      ok: false,
      response: billingErrorResponse({
        status: 402,
        code: "insufficient_ai_balance",
        message: "ÐÐµÐ´Ð¾ÑÑ‚Ð°Ñ‚Ð¾Ñ‡Ð½Ð¾ AI-Ð±Ð°Ð»Ð°Ð½ÑÐ° Ð´Ð»Ñ Ð²Ñ‹Ð±Ñ€Ð°Ð½Ð½Ð¾Ð¹ Ð¼Ð¾Ð´ÐµÐ»Ð¸. Ð’Ñ‹Ð±ÐµÑ€Ð¸Ñ‚Ðµ Ð±Ð¾Ð»ÐµÐµ ÑÐºÐ¾Ð½Ð¾Ð¼Ð½Ñ‹Ð¹ ÑƒÑ€Ð¾Ð²ÐµÐ½ÑŒ Ð¸Ð»Ð¸ Ð¿Ð¾Ð¿Ð¾Ð»Ð½Ð¸Ñ‚Ðµ AI-Ð¿Ð°ÐºÐµÑ‚.",
        selectedTier: params.selectedTier,
        modelName: resolvedModelName,
        availableBalanceEur,
        estimatedCostEur,
      }),
    };
  }

  return {
    ok: true,
    preflight: {
      tierCode: params.selectedTier,
      modelName: resolvedModelName,
      wallet,
      priceSnapshot: effectivePriceSnapshot,
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCostEur,
      availableBalanceEur,
    },
  };
}

async function insertUsageEvent(params: {
  appUserId: string;
  preflight: BillingPreflight;
  usage: RunAiJsonUsageMetadata;
  actualCostEur: number | null;
  walletDebitEur: number | null;
  status: "openai_completed" | "debit_failed";
  errorCode?: string;
  errorMessage?: string;
}) {
  const { data, error } = await supabase
    .from("ai_usage_events")
    .insert({
      app_user_id: params.appUserId,
      wallet_id: params.preflight.wallet.id,
      selected_tier_code: params.preflight.tierCode,
      model_name: params.usage.model ?? params.preflight.modelName,
      provider: "openai",
      route_path: "/api/test",
      operation_kind: "chat_message",
      input_tokens: params.usage.inputTokens,
      cached_input_tokens: params.usage.cachedInputTokens,
      output_tokens: params.usage.outputTokens,
      total_tokens: params.usage.totalTokens,
      estimated_cost_eur: params.preflight.estimatedCostEur,
      actual_cost_eur: params.actualCostEur,
      wallet_debit_eur: params.walletDebitEur,
      status: params.status,
      error_code: params.errorCode ?? null,
      error_message: params.errorMessage ?? null,
      openai_response_id: params.usage.responseId,
      request_metadata: {
        selectedTier: params.preflight.tierCode,
        estimatedInputTokens: params.preflight.estimatedInputTokens,
        estimatedOutputTokens: params.preflight.estimatedOutputTokens,
        preflightAvailableBalanceEur: params.preflight.availableBalanceEur,
      },
      response_metadata: {
        usage: params.usage.rawUsage ?? null,
      },
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single<UsageEventRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to insert ai_usage_events row");
  }

  return data;
}

async function markUsageEventDebitFailed(params: {
  usageEventId: string | null;
  errorCode: string;
  errorMessage: string;
}) {
  if (!params.usageEventId) {
    return;
  }

  await supabase
    .from("ai_usage_events")
    .update({
      status: "debit_failed",
      error_code: params.errorCode,
      error_message: params.errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", params.usageEventId);
}

async function settleAiUsageDebit(params: {
  appUser: AppUserRow;
  preflight: BillingPreflight;
  usage: RunAiJsonUsageMetadata;
}): Promise<UsageDebitSettlement> {
  const actualCostEur = calculateActualCostEur({
    priceSnapshot: params.preflight.priceSnapshot,
    inputTokens: params.usage.inputTokens,
    cachedInputTokens: params.usage.cachedInputTokens,
    outputTokens: params.usage.outputTokens,
  });

  if (actualCostEur === null) {
    let usageEventId: string | null = null;

    try {
      const usageEvent = await insertUsageEvent({
        appUserId: params.appUser.id,
        preflight: params.preflight,
        usage: params.usage,
        actualCostEur: null,
        walletDebitEur: null,
        status: "debit_failed",
        errorCode: "actual_cost_calculation_failed",
        errorMessage: "Could not calculate actual AI usage cost from price snapshot.",
      });
      usageEventId = usageEvent.id;
    } catch {
      // Keep the original billing failure visible even if audit row insertion fails.
    }

    return {
      status: "usage_debit_failed",
      usageEventId,
      walletId: params.preflight.wallet.id,
      balanceBeforeEur: null,
      balanceAfterEur: null,
      actualCostEur: null,
      walletDebitEur: null,
      inputTokens: params.usage.inputTokens,
      cachedInputTokens: params.usage.cachedInputTokens,
      outputTokens: params.usage.outputTokens,
      totalTokens: params.usage.totalTokens,
      openaiResponseId: params.usage.responseId,
      errorCode: "actual_cost_calculation_failed",
      errorMessage: "Could not calculate actual AI usage cost from price snapshot.",
    };
  }

  const walletDebitEur = toLedgerDebitAmountEur(actualCostEur);

  const { data: freshWallet, error: walletReadError } = await supabase
    .from("ai_credit_wallets")
    .select("id, app_user_id, balance_eur, reserved_eur, status")
    .eq("id", params.preflight.wallet.id)
    .eq("app_user_id", params.appUser.id)
    .eq("status", "active")
    .maybeSingle<AiCreditWalletRow>();

  if (walletReadError || !freshWallet) {
    return {
      status: "usage_debit_failed",
      usageEventId: null,
      walletId: params.preflight.wallet.id,
      balanceBeforeEur: null,
      balanceAfterEur: null,
      actualCostEur,
      walletDebitEur,
      inputTokens: params.usage.inputTokens,
      cachedInputTokens: params.usage.cachedInputTokens,
      outputTokens: params.usage.outputTokens,
      totalTokens: params.usage.totalTokens,
      openaiResponseId: params.usage.responseId,
      errorCode: "wallet_recheck_failed",
      errorMessage: walletReadError?.message ?? "Active AI wallet not found during debit.",
    };
  }

  const balanceBeforeEur = asNumber(freshWallet.balance_eur);
  const reservedEur = asNumber(freshWallet.reserved_eur) ?? 0;

  if (balanceBeforeEur === null) {
    return {
      status: "usage_debit_failed",
      usageEventId: null,
      walletId: freshWallet.id,
      balanceBeforeEur: null,
      balanceAfterEur: null,
      actualCostEur,
      walletDebitEur,
      inputTokens: params.usage.inputTokens,
      cachedInputTokens: params.usage.cachedInputTokens,
      outputTokens: params.usage.outputTokens,
      totalTokens: params.usage.totalTokens,
      openaiResponseId: params.usage.responseId,
      errorCode: "invalid_wallet_balance_during_debit",
      errorMessage: "AI wallet balance is not numeric during debit.",
    };
  }

  const availableBeforeEur = toFixedNumber(Math.max(0, balanceBeforeEur - reservedEur), 8);

  if (walletDebitEur <= 0 || availableBeforeEur < walletDebitEur) {
    let usageEventId: string | null = null;
    const errorCode = walletDebitEur <= 0 ? "zero_wallet_debit" : "post_call_insufficient_ai_balance";
    const errorMessage =
      walletDebitEur <= 0
        ? "Calculated wallet debit is zero. No wallet debit was posted."
        : "AI wallet balance became insufficient after OpenAI call.";

    try {
      const usageEvent = await insertUsageEvent({
        appUserId: params.appUser.id,
        preflight: params.preflight,
        usage: params.usage,
        actualCostEur,
        walletDebitEur,
        status: "debit_failed",
        errorCode,
        errorMessage,
      });
      usageEventId = usageEvent.id;
    } catch {
      // Do not hide the AI reply because of logging failure.
    }

    return {
      status: "usage_debit_failed",
      usageEventId,
      walletId: freshWallet.id,
      balanceBeforeEur,
      balanceAfterEur: balanceBeforeEur,
      actualCostEur,
      walletDebitEur,
      inputTokens: params.usage.inputTokens,
      cachedInputTokens: params.usage.cachedInputTokens,
      outputTokens: params.usage.outputTokens,
      totalTokens: params.usage.totalTokens,
      openaiResponseId: params.usage.responseId,
      errorCode,
      errorMessage,
    };
  }

  const balanceAfterEur = toFixedNumber(balanceBeforeEur - walletDebitEur, 6);
  let usageEventId: string | null = null;

  try {
    const usageEvent = await insertUsageEvent({
      appUserId: params.appUser.id,
      preflight: params.preflight,
      usage: params.usage,
      actualCostEur,
      walletDebitEur,
      status: "openai_completed",
    });
    usageEventId = usageEvent.id;

    const { error: ledgerError } = await supabase.from("ai_credit_ledger").insert({
      wallet_id: freshWallet.id,
      app_user_id: params.appUser.id,
      direction: "debit",
      amount_eur: walletDebitEur,
      balance_before_eur: toFixedNumber(balanceBeforeEur, 6),
      balance_after_eur: balanceAfterEur,
      source_type: "ai_usage",
      source_id: usageEvent.id,
      reason: "AI chat message usage debit",
      idempotency_key: "ai_usage:" + usageEvent.id,
      metadata: {
        routePath: "/api/test",
        selectedTier: params.preflight.tierCode,
        modelName: params.usage.model ?? params.preflight.modelName,
        openaiResponseId: params.usage.responseId,
        actualCostEur,
      },
    });

    if (ledgerError) {
      throw new Error(ledgerError.message);
    }

    const { error: walletUpdateError } = await supabase
      .from("ai_credit_wallets")
      .update({
        balance_eur: balanceAfterEur,
        updated_at: new Date().toISOString(),
      })
      .eq("id", freshWallet.id)
      .eq("app_user_id", params.appUser.id);

    if (walletUpdateError) {
      throw new Error(walletUpdateError.message);
    }

    await supabase
      .from("ai_usage_events")
      .update({
        status: "wallet_debited",
        completed_at: new Date().toISOString(),
      })
      .eq("id", usageEvent.id);

    return {
      status: "wallet_debited",
      usageEventId: usageEvent.id,
      walletId: freshWallet.id,
      balanceBeforeEur,
      balanceAfterEur,
      actualCostEur,
      walletDebitEur,
      inputTokens: params.usage.inputTokens,
      cachedInputTokens: params.usage.cachedInputTokens,
      outputTokens: params.usage.outputTokens,
      totalTokens: params.usage.totalTokens,
      openaiResponseId: params.usage.responseId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown debit error";

    await markUsageEventDebitFailed({
      usageEventId,
      errorCode: "usage_debit_write_failed",
      errorMessage,
    });

    return {
      status: "usage_debit_failed",
      usageEventId,
      walletId: freshWallet.id,
      balanceBeforeEur,
      balanceAfterEur,
      actualCostEur,
      walletDebitEur,
      inputTokens: params.usage.inputTokens,
      cachedInputTokens: params.usage.cachedInputTokens,
      outputTokens: params.usage.outputTokens,
      totalTokens: params.usage.totalTokens,
      openaiResponseId: params.usage.responseId,
      errorCode: "usage_debit_write_failed",
      errorMessage,
    };
  }
}

export async function POST(request: Request) {
  let selectedTier: AiTierCode = DEFAULT_TIER;

  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return Response.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const userMessage =
      typeof body.message === "string" ? body.message.trim() : "";
    selectedTier = parseSelectedTier(body.selectedTier);

    let chatImage: ReturnType<typeof parseChatImage> = null;
    try {
      chatImage = parseChatImage(body.image);
    } catch (imageError) {
      const imageCode = imageError instanceof Error ? imageError.message : "unsupported_chat_image";
      return Response.json(
        {
          success: false,
          error: imageCode,
          reply: imageCode === "chat_image_too_large"
            ? "The image is too large. Maximum size is 3 MB."
            : "Unsupported image. Use JPG, PNG, or WebP.",
        },
        { status: 400 },
      );
    }

    if (!userMessage && !chatImage) {
      return Response.json(
        { success: false, error: "Message is required" },
        { status: 400 },
      );
    }

    const { data: appUser, error: userError } = await supabase
      .from("app_users")
      .upsert(
        {
          auth0_sub: session.user.sub,
          email: session.user.email,
          name: session.user.name,
          picture: session.user.picture,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "auth0_sub",
        },
      )
      .select()
      .single<AppUserRow>();

    if (userError) {
      return Response.json(
        { success: false, error: userError.message },
        { status: 500 },
      );
    }

    const methodologyContext = await resolveRuntimeMethodologyContext({
      runtimeCode: "navigator_chat",
      locale: body.locale,
    });

    const systemPrompt = methodologyContext.systemPrompt;
    const modelUserPayload = {
      message: userMessage,
      personalProcessingGuidance: methodologyContext.actorInstructionText,
      attachment: chatImage
        ? { kind: "image", name: chatImage.name, mimeType: chatImage.mimeType }
        : null,
      instructionPriority: [
        "database_and_security_invariants",
        "explicit_current_message_data",
        "active_ARCTor_system_instructions",
        "personal_processing_defaults_for_missing_context",
      ],
    };
    const preflightResult = await buildBillingPreflight({
      appUserId: appUser.id,
      selectedTier,
      systemPrompt,
      userMessage: JSON.stringify(modelUserPayload),
      hasImage: Boolean(chatImage),
    });

    if (!preflightResult.ok) {
      return preflightResult.response;
    }

    await supabase.from("chat_messages").insert({
      user_id: appUser.id,
      role: "user",
      content: userMessage || `[image:${chatImage?.name ?? "attachment"}]`,
    });

    const aiCall = await runAiJsonWithUsageMetadata<ChatAiResponse>({
      system: systemPrompt,
      user: modelUserPayload,
      model: preflightResult.preflight.modelName,
      reasoningEffort: getNavigatorModelDefinition(selectedTier).reasoningEffort,
      maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
      structuredOutput: methodologyContext.structuredOutput,
      userImageDataUrl: chatImage?.dataUrl ?? null,
      store: false,
    });

    const aiResult = aiCall.parsed;
    const reply =
      typeof aiResult.reply === "string" && aiResult.reply.trim()
        ? aiResult.reply.trim()
        : "ÐŸÑƒÑÑ‚Ð¾Ð¹ Ð¾Ñ‚Ð²ÐµÑ‚";

    await supabase.from("chat_messages").insert({
      user_id: appUser.id,
      role: "assistant",
      content: reply,
    });

    const settlement = await settleAiUsageDebit({
      appUser,
      preflight: preflightResult.preflight,
      usage: aiCall.usage,
    });

    return Response.json({
      success: true,
      model: preflightResult.preflight.modelName,
      selectedTier,
      reply,
      instructionContext: methodologyContext.processingInstructionContext,
      methodologyTrace: methodologyContext.methodologyTrace,
      billing: {
        status: settlement.status,
        walletId: settlement.walletId,
        usageEventId: settlement.usageEventId,
        balanceBeforeEur: settlement.balanceBeforeEur,
        balanceAfterEur: settlement.balanceAfterEur,
        availableBalanceEur: preflightResult.preflight.availableBalanceEur,
        estimatedCostEur: preflightResult.preflight.estimatedCostEur,
        actualCostEur: settlement.actualCostEur,
        walletDebitEur: settlement.walletDebitEur,
        inputTokens: settlement.inputTokens,
        cachedInputTokens: settlement.cachedInputTokens,
        outputTokens: settlement.outputTokens,
        totalTokens: settlement.totalTokens,
        openaiResponseId: settlement.openaiResponseId,
        debitImplemented: true,
        errorCode: settlement.errorCode ?? null,
        errorMessage: settlement.errorMessage ?? null,
      },
    });
  } catch (error) {
    console.error("OPENAI_ERROR:", error);

    return Response.json(
      {
        success: false,
        model: null,
        selectedTier,
        reply: "ÐžÑˆÐ¸Ð±ÐºÐ° Ð½Ð° ÑÐµÑ€Ð²ÐµÑ€Ðµ",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
