import "server-only";

import { createHash } from "node:crypto";

import { supabase } from "../../../lib/supabase";
import {
  runAiJsonWithUsageMetadata,
  type RunAiJsonWithUsageMetadataResult,
} from "../../../lib/ai/openaiClient";
import {
  AI_BILLING_B1_CONTRACT,
  calculateAiUsageCostEur,
  readActiveModelPriceSnapshot,
  releaseAiUsageReservation,
  reserveAiUsageRequest,
  settleReservedAiUsageDebit,
  type AiUsageTokens,
} from "./runtime";

export const AI_BILLING_GATEWAY_B2_2_CONTRACT =
  "ARCTOR_AI_BILLING_GATEWAY_B2_2_RESERVATION_IDEMPOTENCY_V1" as const;

export type AiBillingGatewayOperationKind =
  | "chat_message"
  | "activity_preview"
  | "semantic_intake"
  | "ai_channel"
  | "admin_test"
  | "other";

type ProviderRequest = Parameters<typeof runAiJsonWithUsageMetadata>[0];

export type BillableAiJsonInput = {
  billingUserId: string;
  requestIdempotencyKey: string;
  routePath: string;
  operationKind: AiBillingGatewayOperationKind;
  modelName: string;
  tierCode?: string | null;

  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  preflightSafetyMultiplier?: number;

  providerRequest: Omit<ProviderRequest, "model" | "idempotencyKey">;

  reason?: string | null;
  requestMetadata?: Record<string, unknown>;
  settlementMetadata?: Record<string, unknown>;
};

export type AiBillingGatewaySettlement = {
  requestIdempotencyKey: string;
  requestFingerprint: string;
  usageEventId: string;
  walletId: string;
  reserveLedgerId: string | null;
  releaseLedgerId: string | null;
  debitLedgerId: string | null;
  balanceBeforeEur: number;
  balanceAfterEur: number;
  reservedBeforeEur: number | null;
  reservedAfterEur: number;
  availableBeforeEur: number;
  availableAfterReservationEur: number;
  estimatedMaxCostEur: number;
  reservationEur: number;
  reservationReleasedEur: number;
  actualCostEur: number;
  walletDebitEur: number;
  status: string;
};

export type BillableAiJsonResult<T> =
  RunAiJsonWithUsageMetadataResult<T> & {
    billing: AiBillingGatewaySettlement;
  };

export class AiBillingRequestAlreadyAcquiredError extends Error {
  readonly code = "AI_BILLING_REQUEST_ALREADY_ACQUIRED";
  readonly usageEventId: string;
  readonly usageStatus: string;

  constructor(input: { usageEventId: string; usageStatus: string }) {
    super(
      `AI_BILLING_REQUEST_ALREADY_ACQUIRED:${input.usageEventId}:${input.usageStatus}`,
    );
    this.name = "AiBillingRequestAlreadyAcquiredError";
    this.usageEventId = input.usageEventId;
    this.usageStatus = input.usageStatus;
  }
}

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

function ceilWalletEur(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("AI_BILLING_GATEWAY_RESERVATION_COST_INVALID");
  }

  return roundEur(
    Math.max(0.000001, Math.ceil(value * 1_000_000) / 1_000_000),
    6,
  );
}

function toWalletDebitEur(actualCostEur: number): number {
  if (!Number.isFinite(actualCostEur) || actualCostEur <= 0) {
    throw new Error("AI_BILLING_GATEWAY_ACTUAL_COST_NOT_POSITIVE");
  }

  return ceilWalletEur(actualCostEur);
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

function canonicalize(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};

    for (const key of Object.keys(record).sort()) {
      if (key === "signal") continue;

      const child = record[key];

      if (typeof child === "undefined" || typeof child === "function") {
        continue;
      }

      normalized[key] = canonicalize(child);
    }

    return normalized;
  }

  return String(value);
}

function providerIdempotencyKey(input: BillableAiJsonInput): string {
  const digest = createHash("sha256")
    .update(`${input.billingUserId}:${input.requestIdempotencyKey.trim()}`)
    .digest("hex");

  return `arctor-${digest}`;
}

function requestFingerprint(input: BillableAiJsonInput): string {
  const payload = canonicalize({
    billingUserId: input.billingUserId,
    routePath: input.routePath,
    operationKind: input.operationKind,
    modelName: input.modelName,
    tierCode: input.tierCode ?? null,
    estimatedInputTokens: input.estimatedInputTokens,
    estimatedOutputTokens: input.estimatedOutputTokens,
    providerRequest: input.providerRequest,
  });

  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
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
      provider_token_cost_eur: input.actualCostEur,
      provider_tool_calls: 0,
      provider_tool_cost_eur: 0,
      actual_cost_eur: input.actualCostEur,
      wallet_debit_eur: input.walletDebitEur,
      status: "openai_completed",
      error_code: null,
      error_message: null,
      openai_response_id: input.usage.responseId,
      response_metadata: {
        contract: AI_BILLING_GATEWAY_B2_2_CONTRACT,
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
      provider_token_cost_eur: input.actualCostEur ?? null,
      provider_tool_calls: 0,
      provider_tool_cost_eur:
        input.actualCostEur === undefined || input.actualCostEur === null ? null : 0,
      actual_cost_eur: input.actualCostEur ?? null,
      wallet_debit_eur: input.walletDebitEur ?? null,
      status: "debit_failed",
      error_code: errorCode(input.error, "AI_BILLING_SETTLEMENT_FAILED"),
      error_message: message.slice(0, 4000),
      openai_response_id: input.usage.responseId,
      completed_at: new Date().toISOString(),
      response_metadata: {
        contract: AI_BILLING_GATEWAY_B2_2_CONTRACT,
        providerAttempted: true,
        providerCompleted: true,
        usage: input.usage.rawUsage ?? null,
        billingFailedAt: new Date().toISOString(),
        reservationIntentionallyHeld: true,
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

  if (
    !input.requestIdempotencyKey.trim() ||
    input.requestIdempotencyKey.trim().length < 8 ||
    input.requestIdempotencyKey.trim().length > 200
  ) {
    throw new Error("AI_BILLING_GATEWAY_REQUEST_IDEMPOTENCY_KEY_INVALID");
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

  const reservationEur = ceilWalletEur(estimatedMaxCostEur);
  const fingerprint = requestFingerprint(input);
  const idempotencyKey = input.requestIdempotencyKey.trim();
  const providerRequestIdempotencyKey = providerIdempotencyKey(input);

  const reservation = await reserveAiUsageRequest({
    appUserId: input.billingUserId,
    requestIdempotencyKey: idempotencyKey,
    requestFingerprint: fingerprint,
    tierCode: input.tierCode ?? null,
    modelName: input.modelName,
    routePath: input.routePath,
    operationKind: input.operationKind,
    estimatedCostEur: estimatedMaxCostEur,
    reservationEur,
    requestMetadata: {
      contract: AI_BILLING_GATEWAY_B2_2_CONTRACT,
      b1Contract: AI_BILLING_B1_CONTRACT,
      priceSnapshotId: priceSnapshot.id,
      estimatedInputTokens,
      estimatedOutputTokens,
      preflightSafetyMultiplier: safetyMultiplier,
      providerRequestIdempotencyKey,
      ...(input.requestMetadata ?? {}),
    },
  });

  if (!reservation.acquired) {
    throw new AiBillingRequestAlreadyAcquiredError({
      usageEventId: reservation.usageEventId,
      usageStatus: reservation.usageStatus,
    });
  }

  let providerResult: RunAiJsonWithUsageMetadataResult<T>;

  try {
    providerResult = await runAiJsonWithUsageMetadata<T>({
      ...input.providerRequest,
      model: input.modelName,
      idempotencyKey: providerRequestIdempotencyKey,
    });
  } catch (providerError) {
    try {
      await releaseAiUsageReservation({
        appUserId: input.billingUserId,
        usageEventId: reservation.usageEventId,
        errorCode: errorCode(providerError, "AI_PROVIDER_FAILED"),
        errorMessage: errorMessage(providerError).slice(0, 4000),
        metadata: {
          contract: AI_BILLING_GATEWAY_B2_2_CONTRACT,
          providerAttempted: true,
          providerCompleted: false,
        },
      });
    } catch (releaseError) {
      throw new Error(
        `AI_BILLING_GATEWAY_PROVIDER_FAILED_AND_RESERVATION_RELEASE_FAILED:${errorMessage(
          providerError,
        )}:${errorMessage(releaseError)}`,
      );
    }

    throw providerError;
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
      usageEventId: reservation.usageEventId,
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
      usageEventId: reservation.usageEventId,
      usage: providerResult.usage,
      error,
    });
    throw error;
  }

  try {
    await writeProviderUsage({
      usageEventId: reservation.usageEventId,
      usage: providerResult.usage,
      actualCostEur,
      walletDebitEur,
    });
  } catch (error) {
    await markPostProviderBillingFailed({
      usageEventId: reservation.usageEventId,
      usage: providerResult.usage,
      error,
      actualCostEur,
      walletDebitEur,
    });
    throw error;
  }

  let settlement;

  try {
    settlement = await settleReservedAiUsageDebit({
      appUserId: input.billingUserId,
      usageEventId: reservation.usageEventId,
      actualCostEur,
      walletDebitEur,
      reason: input.reason ?? "ARCTor unified AI Billing Gateway reserved usage debit",
      metadata: {
        contract: AI_BILLING_GATEWAY_B2_2_CONTRACT,
        routePath: input.routePath,
        operationKind: input.operationKind,
        modelName: input.modelName,
        tierCode: input.tierCode ?? null,
        requestIdempotencyKey: idempotencyKey,
        requestFingerprint: fingerprint,
        providerRequestIdempotencyKey,
        openaiResponseId: providerResult.usage.responseId,
        ...(input.settlementMetadata ?? {}),
      },
    });
  } catch (error) {
    await markPostProviderBillingFailed({
      usageEventId: reservation.usageEventId,
      usage: providerResult.usage,
      error,
      actualCostEur,
      walletDebitEur,
    });
    throw error;
  }

  return {
    ...providerResult,
    billing: {
      requestIdempotencyKey: idempotencyKey,
      requestFingerprint: fingerprint,
      usageEventId: reservation.usageEventId,
      walletId: settlement.walletId,
      reserveLedgerId: reservation.reservationLedgerId,
      releaseLedgerId: settlement.releaseLedgerId,
      debitLedgerId: settlement.debitLedgerId,
      balanceBeforeEur: settlement.balanceBeforeEur,
      balanceAfterEur: settlement.balanceAfterEur,
      reservedBeforeEur: settlement.reservedBeforeEur,
      reservedAfterEur: settlement.reservedAfterEur,
      availableBeforeEur: reservation.availableBeforeEur,
      availableAfterReservationEur: reservation.availableAfterEur,
      estimatedMaxCostEur,
      reservationEur,
      reservationReleasedEur: settlement.reservationReleasedEur,
      actualCostEur,
      walletDebitEur,
      status: settlement.usageStatus,
    },
  };
}
