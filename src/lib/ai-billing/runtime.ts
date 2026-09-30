import "server-only";

import { supabase } from "../../../lib/supabase";

export const AI_BILLING_B1_CONTRACT =
  "ARCTOR_AI_BILLING_B1_FOUNDATION_V1" as const;

export type AiUsageTokens = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type AiPriceSnapshot = {
  id: string;
  modelName: string;
  pricingCurrency: string;
  inputCostPer1mTokens: number;
  cachedInputCostPer1mTokens: number | null;
  outputCostPer1mTokens: number;
  usdToEurRate: number | null;
  eurMarkupMultiplier: number;
};

export type AiWalletAccess = {
  walletId: string | null;
  status: string;
  balanceEur: number;
  reservedEur: number;
  availableEur: number;
  currency: string;
};

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function nonNegative(value: unknown): number {
  const parsed = finiteNumber(value);
  return parsed !== null && parsed >= 0 ? parsed : 0;
}

function roundEur(value: number, digits = 8): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateAiUsageCostEur(input: {
  usage: AiUsageTokens;
  price: AiPriceSnapshot;
}): number {
  const inputTokens = Math.max(0, Math.trunc(input.usage.inputTokens));
  const cachedInputTokens = Math.min(
    inputTokens,
    Math.max(0, Math.trunc(input.usage.cachedInputTokens)),
  );
  const uncachedInputTokens = Math.max(0, inputTokens - cachedInputTokens);
  const outputTokens = Math.max(0, Math.trunc(input.usage.outputTokens));

  const cachedPrice =
    input.price.cachedInputCostPer1mTokens ??
    input.price.inputCostPer1mTokens;

  const providerCost =
    (uncachedInputTokens * input.price.inputCostPer1mTokens +
      cachedInputTokens * cachedPrice +
      outputTokens * input.price.outputCostPer1mTokens) /
    1_000_000;

  const pricingCurrency = input.price.pricingCurrency.toUpperCase();
  if (
    pricingCurrency === "USD" &&
    (!input.price.usdToEurRate || input.price.usdToEurRate <= 0)
  ) {
    throw new Error("AI_BILLING_USD_TO_EUR_RATE_REQUIRED");
  }

  const eurBase =
    pricingCurrency === "USD"
      ? providerCost * input.price.usdToEurRate!
      : providerCost;

  return roundEur(eurBase * input.price.eurMarkupMultiplier, 8);
}

export async function readAiWalletAccess(
  appUserId: string,
): Promise<AiWalletAccess> {
  const { data, error } = await supabase
    .from("ai_credit_wallets")
    .select("id,balance_eur,reserved_eur,currency,status")
    .eq("app_user_id", appUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`AI_BILLING_WALLET_READ_FAILED:${error.message}`);
  }

  const balanceEur = nonNegative(data?.balance_eur);
  const reservedEur = nonNegative(data?.reserved_eur);

  return {
    walletId: typeof data?.id === "string" ? data.id : null,
    status: typeof data?.status === "string" ? data.status : "not_created",
    balanceEur,
    reservedEur,
    availableEur: Math.max(balanceEur - reservedEur, 0),
    currency:
      typeof data?.currency === "string" && data.currency
        ? data.currency
        : "EUR",
  };
}

export async function readActiveModelPriceSnapshot(input: {
  modelName: string;
  tierCode?: string | null;
}): Promise<AiPriceSnapshot> {
  let query = supabase
    .from("ai_model_price_snapshots")
    .select(
      "id,model_name,tier_code,pricing_currency,input_cost_per_1m_tokens,cached_input_cost_per_1m_tokens,output_cost_per_1m_tokens,usd_to_eur_rate,eur_markup_multiplier,valid_from,is_active",
    )
    .eq("provider", "openai")
    .eq("model_name", input.modelName)
    .eq("is_active", true)
    .lte("valid_from", new Date().toISOString())
    .order("valid_from", { ascending: false })
    .limit(1);

  if (input.tierCode) {
    query = query.eq("tier_code", input.tierCode);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    throw new Error(
      `AI_BILLING_PRICE_SNAPSHOT_NOT_FOUND:${error?.message ?? input.modelName}`,
    );
  }

  const inputPrice = finiteNumber(data.input_cost_per_1m_tokens);
  const outputPrice = finiteNumber(data.output_cost_per_1m_tokens);
  const cachedPrice = finiteNumber(data.cached_input_cost_per_1m_tokens);
  const usdToEurRate = finiteNumber(data.usd_to_eur_rate);
  const markup = finiteNumber(data.eur_markup_multiplier) ?? 1;

  if (
    inputPrice === null ||
    inputPrice < 0 ||
    outputPrice === null ||
    outputPrice < 0 ||
    markup <= 0
  ) {
    throw new Error("AI_BILLING_PRICE_SNAPSHOT_INVALID");
  }

  return {
    id: String(data.id),
    modelName: String(data.model_name),
    pricingCurrency:
      typeof data.pricing_currency === "string"
        ? data.pricing_currency
        : "USD",
    inputCostPer1mTokens: inputPrice,
    cachedInputCostPer1mTokens:
      cachedPrice !== null && cachedPrice >= 0 ? cachedPrice : null,
    outputCostPer1mTokens: outputPrice,
    usdToEurRate:
      usdToEurRate !== null && usdToEurRate > 0 ? usdToEurRate : null,
    eurMarkupMultiplier: markup,
  };
}

export async function requireAiWalletForEstimatedCost(input: {
  appUserId: string;
  estimatedMaxCostEur: number;
}) {
  const wallet = await readAiWalletAccess(input.appUserId);
  const estimatedMaxCostEur = roundEur(
    Math.max(0, input.estimatedMaxCostEur),
    8,
  );

  if (wallet.status !== "active" || !wallet.walletId) {
    throw new Error("AI_BILLING_WALLET_NOT_ACTIVE");
  }

  if (estimatedMaxCostEur <= 0) {
    throw new Error("AI_BILLING_ESTIMATED_COST_INVALID");
  }

  if (wallet.availableEur < estimatedMaxCostEur) {
    throw new Error("AI_BILLING_INSUFFICIENT_BALANCE");
  }

  return {
    ...wallet,
    estimatedMaxCostEur,
  };
}

export async function settleAiUsageDebit(input: {
  appUserId: string;
  usageEventId: string;
  actualCostEur: number;
  walletDebitEur?: number;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const actualCostEur = roundEur(Math.max(0, input.actualCostEur), 8);
  const walletDebitEur = roundEur(
    Math.max(0, input.walletDebitEur ?? input.actualCostEur),
    6,
  );

  if (walletDebitEur <= 0) {
    throw new Error("AI_BILLING_ZERO_DEBIT_NOT_SETTLED");
  }

  const { data, error } = await supabase.rpc("settle_ai_usage_debit_v1", {
    p_usage_event_id: input.usageEventId,
    p_app_user_id: input.appUserId,
    p_actual_cost_eur: actualCostEur,
    p_wallet_debit_eur: walletDebitEur,
    p_reason: input.reason ?? "ARCTor AI usage debit",
    p_metadata: {
      contract: AI_BILLING_B1_CONTRACT,
      ...(input.metadata ?? {}),
    },
  });

  if (error) {
    throw new Error(`AI_BILLING_SETTLEMENT_FAILED:${error.message}`);
  }

  return data;
}
