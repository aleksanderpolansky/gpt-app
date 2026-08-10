import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";
import { runAiJsonWithUsageMetadata } from "../../../../lib/ai/openaiClient";
import type { RunAiJsonUsageMetadata } from "../../../../lib/ai/openaiClient";
import { resolveCurrentActorAiProcessingContext } from "@/lib/ai/processingInstructions.server";

export const dynamic = "force-dynamic";

type AiTierCode = "nano" | "standard" | "pro";

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

function estimateInputTokens(systemPrompt: string, userMessage: string) {
  return Math.max(1, Math.ceil((systemPrompt.length + userMessage.length) / 4));
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

async function buildBillingPreflight(params: {
  appUserId: string;
  selectedTier: AiTierCode;
  systemPrompt: string;
  userMessage: string;
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

  const { data: priceSnapshot, error: priceError } = await supabase
    .from("ai_model_price_snapshots")
    .select(
      "tier_code, model_name, provider, pricing_currency, display_currency, input_cost_per_1m_tokens, cached_input_cost_per_1m_tokens, output_cost_per_1m_tokens, usd_to_eur_rate, eur_markup_multiplier",
    )
    .eq("tier_code", params.selectedTier)
    .eq("provider", "openai")
    .eq("is_active", true)
    .is("valid_to", null)
    .order("valid_from", { ascending: false })
    .limit(1)
    .maybeSingle<AiModelPriceSnapshotRow>();

  if (priceError || !priceSnapshot) {
    return {
      ok: false,
      response: billingErrorResponse({
        status: 503,
        code: "missing_active_price_snapshot",
        message: "Ð”Ð»Ñ Ð²Ñ‹Ð±Ñ€Ð°Ð½Ð½Ð¾Ð¹ Ð¼Ð¾Ð´ÐµÐ»Ð¸ Ð¿Ð¾ÐºÐ° Ð½ÐµÑ‚ Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾Ð¹ Ñ†ÐµÐ½Ñ‹. ÐŸÐ¾Ð¿Ñ€Ð¾Ð±ÑƒÐ¹Ñ‚Ðµ Ð´Ñ€ÑƒÐ³Ð¾Ð¹ ÑƒÑ€Ð¾Ð²ÐµÐ½ÑŒ AI.",
        selectedTier: params.selectedTier,
      }),
    };
  }

  const resolvedModelName = tier.default_model_name || priceSnapshot.model_name;

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
  const estimatedInputTokens = estimateInputTokens(params.systemPrompt, params.userMessage);
  const estimatedOutputTokens = CHAT_MAX_OUTPUT_TOKENS;
  const estimatedCostEur = calculateEstimatedCostEur({
    priceSnapshot,
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
      priceSnapshot,
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

    if (!userMessage) {
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

    const processingContext = await resolveCurrentActorAiProcessingContext({
      runtimeCode: "navigator_chat",
      locale: body.locale,
    });

    const systemPrompt = processingContext.systemPrompt;
    const modelUserPayload = {
      message: userMessage,
      personalProcessingGuidance: processingContext.actorInstructionText,
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
      userMessage: JSON.stringify(modelUserPayload),});

    if (!preflightResult.ok) {
      return preflightResult.response;
    }

    await supabase.from("chat_messages").insert({
      user_id: appUser.id,
      role: "user",
      content: userMessage,
    });

    const aiCall = await runAiJsonWithUsageMetadata<ChatAiResponse>({
      system: systemPrompt,
      user: modelUserPayload,
      model: preflightResult.preflight.modelName,
      maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
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
      instructionContext: processingContext.publicMetadata,
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
