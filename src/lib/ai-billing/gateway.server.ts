import "server-only";

import { supabase } from "../../../lib/supabase";
import {
  runAiJsonWithUsageMetadata,
  type RunAiJsonWithUsageMetadataResult,
} from "../../../lib/ai/openaiClient";
import {
  AI_BILLING_B1_CONTRACT,
  calculateAiUsageCostEur,
  readActiveModelPriceSnapshot,
  requireAiWalletForEstimatedCost,
  settleAiUsageDebit,
  type AiUsageTokens,
} from "./runtime";

export const AI_BILLING_GATEWAY_B2_1_CONTRACT =
  "ARCTOR_AI_BILLING_GATEWAY_B2_1_FOUNDATION_V1" as const;

/**
 * B2.1 is deliberately a foundation-only gateway.
 *
 * It centralizes:
 *   preflight -> usage event -> provider call -> provider usage -> cost ->
 *   B1 atomic settlement.
 *
 * B2.2 will add request-level idempotency + actual wallet reservation.
 * Until then, preflight honors reserved_eur but does not mutate it.
 */
export type AiBillingGatewayOperationKind =
  | "chat_message"
  | "activity_preview"
  | "semantic_intake"
  | "admin_test"
  | "other";

type ProviderRequest = Parameters<typeof runAiJsonWithUsageMetadata>[0];

export type BillableAiJsonInput = {
  billingUserId: string;
  routePath: string;
  operationKind: AiBillingGatewayOperationKind;
  modelName: string;
  tierCode?: string | null;

  /**
   * Deterministic caller-side upper-bound estimates used only for preflight.
   * They are not written as actual usage.
   */
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  preflightSafetyMultiplier?: number;

  providerRequest: Omit<ProviderRequest, "model">;

  reason?: string | null;
  requestMetadata?: Record<string, unknown>;
  settlementMetadata?: Record<string, unknown>;
};

export type AiBillingGatewaySettlement = {
  usageEventId: string;
  walletId: string;
  ledgerId: string | null;
  balanceBeforeEur: number | null;
  balanceAfterEur: number | null;
  reservedEur: number | null;
  availableBeforeEur: number;
  estimatedMaxCostEur: number;
  actualCostEur: number;
  walletDebitEur: number;
  status: string;
};

export type BillableAiJsonResult<T> =
  RunAiJsonWithUsageMetadataResult<T> & {
    billing: AiBillingGatewaySettlement;
  };

type UsageEventIdRow = {
  id: string;
};

type SettlementRow = {
  usage_event_id?: unknown;
  wallet_id?: unknown;
  ledger_id?: unknown;
  app_user_id?: unknown;
  balance_before_eur?: unknown;
  balance_after_eur?: unknown;
  reserved_eur?: unknown;
  wallet_debit_eur?: unknown;
  actual_cost_eur?: unknown;
  usage_status?: unknown;
};

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function nonNegativeInteger(value: unknown, code: string): number {
  const parsed = finiteNumber(value);

  if (parsed === null || parsed < 0) {
    throw new Error(code);
  }

  return Math.trunc(parsed);
}

function roundEur(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function toWalletDebitEur(actualCostEur: number): number {
  if (!Number.isFinite(actualCostEur) || actualCostEur <= 0) {
    throw new Error("AI_BILLING_GATEWAY_ACTUAL_COST_NOT_POSITIVE");
  }

  // Wallet/ledger precision is 6 decimals. Never round a real positive provider
  // cost down to zero or below the calculated cost.
  return roundEur(
    Math.max(0.000001, Math.ceil(actualCostEur * 1_000_000) / 1_000_000),
    6,
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function errorCode(error: unknown, fallback: string) {
  const message = errorMessage(error);
  const compact = message
    .trim()
    .replace(/[^A-Za-z0-9_:.-]+/g, "_")
    .slice(0, 180);

  return compact || fallback;
}

function firstSettlementRow(value: unknown): SettlementRow | null {
  if (Array.isArray(value)) {
    const row = value[0];
    return row && typeof row === "object" ? (row as SettlementRow) : null;
  }

  if (value && typeof value === "object") {
    return value as SettlementRow;
  }

  return null;
}

async function insertPreflightAllowedUsageEvent(input: {
  billingUserId: string;
  walletId: string;
  tierCode: string | null;
  modelName: string;
  routePath: string;
  operationKind: AiBillingGatewayOperationKind;
  estimatedMaxCostEur: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  availableBeforeEur: number;
  priceSnapshotId: string;
  requestMetadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from("ai_usage_events")
    .insert({
      app_user_id: input.billingUserId,
      wallet_id: input.walletId,
      selected_tier_code: input.tierCode,
      model_name: input.modelName,
      provider: "openai",
      route_path: input.routePath,
      operation_kind: input.operationKind,
      input_tokens: 0,
      cached_input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      estimated_cost_eur: input.estimatedMaxCostEur,
      actual_cost_eur: null,
      wallet_debit_eur: null,
      status: "preflight_allowed",
      error_code: null,
      error_message: null,
      openai_response_id: null,
      request_metadata: {
        contract: AI_BILLING_GATEWAY_B2_1_CONTRACT,
        b1Contract: AI_BILLING_B1_CONTRACT,
        billingUserId: input.billingUserId,
        priceSnapshotId: input.priceSnapshotId,
        estimatedInputTokens: input.estimatedInputTokens,
        estimatedOutputTokens: input.estimatedOutputTokens,
        availableBeforeEur: input.availableBeforeEur,
        reservationMode: "read_only_preflight_b2_1",
        requestIdempotencyMode: "not_yet_b2_2",
        ...(input.requestMetadata ?? {}),
      },
      response_metadata: {},
      completed_at: null,
    })
    .select("id")
    .single<UsageEventIdRow>();

  if (error || !data?.id) {
    throw new Error(
      `AI_BILLING_GATEWAY_USAGE_EVENT_CREATE_FAILED:${error?.message ?? "missing id"}`,
    );
  }

  return data.id;
}

async function markProviderFailed(input: {
  usageEventId: string;
  error: unknown;
}) {
  const message = errorMessage(input.error);

  const { error } = await supabase
    .from("ai_usage_events")
    .update({
      status: "openai_failed",
      error_code: errorCode(input.error, "AI_PROVIDER_FAILED"),
      error_message: message.slice(0, 4000),
      completed_at: new Date().toISOString(),
      response_metadata: {
        contract: AI_BILLING_GATEWAY_B2_1_CONTRACT,
        providerAttempted: true,
        providerCompleted: false,
      },
    })
    .eq("id", input.usageEventId);

  if (error) {
    console.error(
      "AI_BILLING_GATEWAY_PROVIDER_FAILURE_AUDIT_WRITE_FAILED",
      error.message,
    );
  }
}

async function writeProviderUsage(input: {
  usageEventId: string;
  usage: RunAiJsonWithUsageMetadataResult<unknown>["usage"];
  actualCostEur: number;
  walletDebitEur: number;
}) {
  const { error } = await supabase
    .from("ai_usage_events")
    .update({
      input_tokens: input.usage.inputTokens,
      cached_input_tokens: input.usage.cachedInputTokens,
      output_tokens: input.usage.outputTokens,
      total_tokens: input.usage.totalTokens,
      actual_cost_eur: input.actualCostEur,
      wallet_debit_eur: input.walletDebitEur,
      status: "openai_completed",
      error_code: null,
      error_message: null,
      openai_response_id: input.usage.responseId,
      response_metadata: {
        contract: AI_BILLING_GATEWAY_B2_1_CONTRACT,
        providerAttempted: true,
        providerCompleted: true,
        usage: input.usage.rawUsage ?? null,
      },
    })
    .eq("id", input.usageEventId);

  if (error) {
    throw new Error(
      `AI_BILLING_GATEWAY_PROVIDER_USAGE_WRITE_FAILED:${error.message}`,
    );
  }
}

async function markPostProviderBillingFailed(input: {
  usageEventId: string;
  usage: RunAiJsonWithUsageMetadataResult<unknown>["usage"];
  error: unknown;
  actualCostEur?: number | null;
  walletDebitEur?: number | null;
}) {
  const message = errorMessage(input.error);

  const { error } = await supabase
    .from("ai_usage_events")
    .update({
      input_tokens: input.usage.inputTokens,
      cached_input_tokens: input.usage.cachedInputTokens,
      output_tokens: input.usage.outputTokens,
      total_tokens: input.usage.totalTokens,
      actual_cost_eur: input.actualCostEur ?? null,
      wallet_debit_eur: input.walletDebitEur ?? null,
      status: "debit_failed",
      error_code: errorCode(input.error, "AI_BILLING_SETTLEMENT_FAILED"),
      error_message: message.slice(0, 4000),
      openai_response_id: input.usage.responseId,
      completed_at: new Date().toISOString(),
      response_metadata: {
        contract: AI_BILLING_GATEWAY_B2_1_CONTRACT,
        providerAttempted: true,
        providerCompleted: true,
        usage: input.usage.rawUsage ?? null,
        billingFailedAt: new Date().toISOString(),
      },
    })
    .eq("id", input.usageEventId);

  if (error) {
    console.error(
      "AI_BILLING_GATEWAY_POST_PROVIDER_FAILURE_AUDIT_WRITE_FAILED",
      error.message,
    );
  }
}

export async function runBillableAiJson<T = unknown>(
  input: BillableAiJsonInput,
): Promise<BillableAiJsonResult<T>> {
  if (!input.billingUserId.trim()) {
    throw new Error("AI_BILLING_GATEWAY_BILLING_USER_REQUIRED");
  }

  if (!input.routePath.trim()) {
    throw new Error("AI_BILLING_GATEWAY_ROUTE_PATH_REQUIRED");
  }

  if (!input.modelName.trim()) {
    throw new Error("AI_BILLING_GATEWAY_MODEL_REQUIRED");
  }

  const estimatedInputTokens = nonNegativeInteger(
    input.estimatedInputTokens,
    "AI_BILLING_GATEWAY_ESTIMATED_INPUT_INVALID",
  );
  const estimatedOutputTokens = nonNegativeInteger(
    input.estimatedOutputTokens,
    "AI_BILLING_GATEWAY_ESTIMATED_OUTPUT_INVALID",
  );

  if (estimatedOutputTokens <= 0) {
    throw new Error("AI_BILLING_GATEWAY_ESTIMATED_OUTPUT_REQUIRED");
  }

  const safetyMultiplier =
    finiteNumber(input.preflightSafetyMultiplier) ?? 1.25;

  if (safetyMultiplier < 1 || safetyMultiplier > 10) {
    throw new Error("AI_BILLING_GATEWAY_SAFETY_MULTIPLIER_INVALID");
  }

  const priceSnapshot = await readActiveModelPriceSnapshot({
    modelName: input.modelName,
    tierCode: input.tierCode ?? null,
  });

  const estimatedBaseCostEur = calculateAiUsageCostEur({
    usage: {
      inputTokens: estimatedInputTokens,
      cachedInputTokens: 0,
      outputTokens: estimatedOutputTokens,
      totalTokens: estimatedInputTokens + estimatedOutputTokens,
    },
    price: priceSnapshot,
  });

  const estimatedMaxCostEur = roundEur(
    estimatedBaseCostEur * safetyMultiplier,
    8,
  );

  if (estimatedMaxCostEur <= 0) {
    throw new Error("AI_BILLING_GATEWAY_ESTIMATED_COST_INVALID");
  }

  const wallet = await requireAiWalletForEstimatedCost({
    appUserId: input.billingUserId,
    estimatedMaxCostEur,
  });

  if (!wallet.walletId) {
    throw new Error("AI_BILLING_GATEWAY_WALLET_ID_MISSING");
  }

  const usageEventId = await insertPreflightAllowedUsageEvent({
    billingUserId: input.billingUserId,
    walletId: wallet.walletId,
    tierCode: input.tierCode ?? null,
    modelName: input.modelName,
    routePath: input.routePath,
    operationKind: input.operationKind,
    estimatedMaxCostEur,
    estimatedInputTokens,
    estimatedOutputTokens,
    availableBeforeEur: wallet.availableEur,
    priceSnapshotId: priceSnapshot.id,
    requestMetadata: input.requestMetadata,
  });

  let providerResult: RunAiJsonWithUsageMetadataResult<T>;

  try {
    providerResult = await runAiJsonWithUsageMetadata<T>({
      ...input.providerRequest,
      model: input.modelName,
    });
  } catch (error) {
    await markProviderFailed({ usageEventId, error });
    throw error;
  }

  const usageTokens: AiUsageTokens = {
    inputTokens: nonNegativeInteger(
      providerResult.usage.inputTokens,
      "AI_BILLING_GATEWAY_PROVIDER_INPUT_USAGE_INVALID",
    ),
    cachedInputTokens: nonNegativeInteger(
      providerResult.usage.cachedInputTokens,
      "AI_BILLING_GATEWAY_PROVIDER_CACHED_USAGE_INVALID",
    ),
    outputTokens: nonNegativeInteger(
      providerResult.usage.outputTokens,
      "AI_BILLING_GATEWAY_PROVIDER_OUTPUT_USAGE_INVALID",
    ),
    totalTokens: nonNegativeInteger(
      providerResult.usage.totalTokens,
      "AI_BILLING_GATEWAY_PROVIDER_TOTAL_USAGE_INVALID",
    ),
  };

  if (
    usageTokens.totalTokens <= 0 ||
    usageTokens.inputTokens + usageTokens.outputTokens <= 0
  ) {
    const usageError = new Error("AI_BILLING_GATEWAY_PROVIDER_USAGE_EMPTY");

    await markPostProviderBillingFailed({
      usageEventId,
      usage: providerResult.usage,
      error: usageError,
    });

    throw usageError;
  }

  let actualCostEur: number;
  let walletDebitEur: number;

  try {
    actualCostEur = calculateAiUsageCostEur({
      usage: usageTokens,
      price: priceSnapshot,
    });
    walletDebitEur = toWalletDebitEur(actualCostEur);
  } catch (error) {
    await markPostProviderBillingFailed({
      usageEventId,
      usage: providerResult.usage,
      error,
    });
    throw error;
  }

  try {
    await writeProviderUsage({
      usageEventId,
      usage: providerResult.usage,
      actualCostEur,
      walletDebitEur,
    });
  } catch (error) {
    await markPostProviderBillingFailed({
      usageEventId,
      usage: providerResult.usage,
      error,
      actualCostEur,
      walletDebitEur,
    });
    throw error;
  }

  let settlementData: unknown;

  try {
    settlementData = await settleAiUsageDebit({
      appUserId: input.billingUserId,
      usageEventId,
      actualCostEur,
      walletDebitEur,
      reason: input.reason ?? "ARCTor unified AI Billing Gateway usage debit",
      metadata: {
        contract: AI_BILLING_GATEWAY_B2_1_CONTRACT,
        routePath: input.routePath,
        operationKind: input.operationKind,
        modelName: input.modelName,
        tierCode: input.tierCode ?? null,
        openaiResponseId: providerResult.usage.responseId,
        ...(input.settlementMetadata ?? {}),
      },
    });
  } catch (error) {
    await markPostProviderBillingFailed({
      usageEventId,
      usage: providerResult.usage,
      error,
      actualCostEur,
      walletDebitEur,
    });
    throw error;
  }

  const settlement = firstSettlementRow(settlementData);

  if (!settlement) {
    const settlementError = new Error(
      "AI_BILLING_GATEWAY_SETTLEMENT_RESULT_MISSING",
    );

    await markPostProviderBillingFailed({
      usageEventId,
      usage: providerResult.usage,
      error: settlementError,
      actualCostEur,
      walletDebitEur,
    });

    throw settlementError;
  }

  return {
    ...providerResult,
    billing: {
      usageEventId,
      walletId:
        typeof settlement.wallet_id === "string"
          ? settlement.wallet_id
          : wallet.walletId,
      ledgerId:
        typeof settlement.ledger_id === "string"
          ? settlement.ledger_id
          : null,
      balanceBeforeEur: finiteNumber(settlement.balance_before_eur),
      balanceAfterEur: finiteNumber(settlement.balance_after_eur),
      reservedEur: finiteNumber(settlement.reserved_eur),
      availableBeforeEur: wallet.availableEur,
      estimatedMaxCostEur,
      actualCostEur,
      walletDebitEur,
      status:
        typeof settlement.usage_status === "string"
          ? settlement.usage_status
          : "wallet_debited",
    },
  };
}
