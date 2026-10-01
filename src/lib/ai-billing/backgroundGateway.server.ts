import "server-only";

import { createHash } from "node:crypto";

import { supabase } from "../../../lib/supabase";
import {
  OPENAI_WEB_SEARCH_USD_PER_CALL,
  cancelAiBackgroundResponse,
  countAiWebSearchCalls,
  createAiBackgroundResponse,
  extractAiResponseUsageMetadata,
  retrieveAiBackgroundResponse,
  type AiBackgroundProviderResponse,
} from "../../../lib/ai/openaiClient";
import {
  calculateAiUsageCostEur,
  convertAiProviderCostToEur,
  readActiveModelPriceSnapshot,
  releaseAiUsageReservation,
  reserveAiUsageRequest,
  settleReservedAiUsageDebit,
  type AiPriceSnapshot,
  type AiUsageTokens,
} from "./runtime";

export const AI_BILLING_BACKGROUND_GATEWAY_B3_0_CONTRACT =
  "ARCTOR_AI_BILLING_BACKGROUND_GATEWAY_B3_0_V1" as const;

export const AI_BACKGROUND_WEB_SEARCH_USD_PER_CALL =
  OPENAI_WEB_SEARCH_USD_PER_CALL;

export type BillableAiBackgroundInput = {
  billingUserId: string;
  requestIdempotencyKey: string;
  routePath: string;
  operationKind: string;
  modelName: string;
  tierCode?: string | null;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedAdditionalProviderCostUsd?: number;
  preflightSafetyMultiplier?: number;
  providerRequest: unknown;
  requestTimeoutMs?: number;
  maxRetries?: number;
  requestMetadata?: Record<string, unknown>;
  onReserved?: (context: AiBackgroundReservationContext) => Promise<void>;
};

export type AiBackgroundReservationContext = {
  billingUserId: string;
  usageEventId: string;
  walletId: string;
  requestIdempotencyKey: string;
  requestFingerprint: string;
  providerRequestIdempotencyKey: string;
  reservationEur: number;
  estimatedMaxCostEur: number;
  acquired: boolean;
};

export type AiBackgroundStartResult = {
  response: AiBackgroundProviderResponse;
  billing: AiBackgroundReservationContext & {
    recoveredExistingProviderResponse: boolean;
  };
};

export type AiBackgroundPollResult = {
  response: AiBackgroundProviderResponse;
  providerStatus: string;
  phase: "pending" | "settled" | "settled_provider_error" | "released";
  billing: {
    usageEventId: string;
    walletId: string | null;
    actualCostEur: number | null;
    tokenCostEur: number | null;
    toolCostEur: number | null;
    webSearchCalls: number;
    walletDebitEur: number | null;
    usageStatus: string;
    reservationReleasedEur: number | null;
    debitLedgerId: string | null;
    releaseLedgerId: string | null;
  };
};

type UsageEventState = {
  id: string;
  appUserId: string;
  walletId: string | null;
  status: string;
  reservationEur: number;
  modelName: string;
  tierCode: string | null;
  requestIdempotencyKey: string;
  requestFingerprint: string;
  openaiResponseId: string | null;
  requestMetadata: Record<string, unknown>;
  responseMetadata: Record<string, unknown>;
  actualCostEur: number | null;
  tokenCostEur: number | null;
  toolCostEur: number | null;
  webSearchCalls: number;
  walletDebitEur: number | null;
};

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
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
    throw new Error("AI_BILLING_BACKGROUND_ACTUAL_COST_NOT_POSITIVE");
  }

  return roundEur(
    Math.max(0.000001, Math.ceil(value * 1_000_000) / 1_000_000),
    6,
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function compactErrorCode(error: unknown, fallback: string) {
  const compact = errorMessage(error)
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

  if (Array.isArray(value)) return value.map(canonicalize);

  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};

    for (const key of Object.keys(source).sort()) {
      const child = source[key];

      if (
        key === "signal" ||
        typeof child === "undefined" ||
        typeof child === "function"
      ) {
        continue;
      }

      normalized[key] = canonicalize(child);
    }

    return normalized;
  }

  return String(value);
}

function requestFingerprint(input: BillableAiBackgroundInput) {
  const canonical = canonicalize({
    billingUserId: input.billingUserId,
    routePath: input.routePath,
    operationKind: input.operationKind,
    modelName: input.modelName,
    tierCode: input.tierCode ?? null,
    estimatedInputTokens: input.estimatedInputTokens,
    estimatedOutputTokens: input.estimatedOutputTokens,
    estimatedAdditionalProviderCostUsd:
      input.estimatedAdditionalProviderCostUsd ?? 0,
    providerRequest: input.providerRequest,
  });

  return createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");
}

function providerRequestIdempotencyKey(input: {
  billingUserId: string;
  requestIdempotencyKey: string;
}) {
  const digest = createHash("sha256")
    .update(
      `${input.billingUserId}:${input.requestIdempotencyKey.trim()}:background`,
    )
    .digest("hex");

  return `arctor-bg-${digest}`;
}

function priceMetadata(price: AiPriceSnapshot) {
  return {
    id: price.id,
    modelName: price.modelName,
    pricingCurrency: price.pricingCurrency,
    inputCostPer1mTokens: price.inputCostPer1mTokens,
    cachedInputCostPer1mTokens: price.cachedInputCostPer1mTokens,
    outputCostPer1mTokens: price.outputCostPer1mTokens,
    usdToEurRate: price.usdToEurRate,
    eurMarkupMultiplier: price.eurMarkupMultiplier,
  };
}

function priceFromMetadata(metadata: Record<string, unknown>): AiPriceSnapshot {
  const candidate = recordValue(metadata.backgroundPriceSnapshot);

  const id =
    typeof candidate.id === "string" && candidate.id.trim()
      ? candidate.id.trim()
      : null;
  const modelName =
    typeof candidate.modelName === "string" && candidate.modelName.trim()
      ? candidate.modelName.trim()
      : null;
  const pricingCurrency =
    typeof candidate.pricingCurrency === "string" &&
    candidate.pricingCurrency.trim()
      ? candidate.pricingCurrency.trim()
      : null;

  const inputCost = finiteNumber(candidate.inputCostPer1mTokens);
  const cachedCost = finiteNumber(candidate.cachedInputCostPer1mTokens);
  const outputCost = finiteNumber(candidate.outputCostPer1mTokens);
  const usdToEurRate = finiteNumber(candidate.usdToEurRate);
  const markup = finiteNumber(candidate.eurMarkupMultiplier);

  if (
    !id ||
    !modelName ||
    !pricingCurrency ||
    inputCost === null ||
    inputCost < 0 ||
    outputCost === null ||
    outputCost < 0 ||
    !markup ||
    markup <= 0
  ) {
    throw new Error(
      "AI_BILLING_BACKGROUND_PRICE_SNAPSHOT_METADATA_INVALID",
    );
  }

  return {
    id,
    modelName,
    pricingCurrency,
    inputCostPer1mTokens: inputCost,
    cachedInputCostPer1mTokens:
      cachedCost !== null && cachedCost >= 0 ? cachedCost : null,
    outputCostPer1mTokens: outputCost,
    usdToEurRate:
      usdToEurRate !== null && usdToEurRate > 0 ? usdToEurRate : null,
    eurMarkupMultiplier: markup,
  };
}

async function readUsageEvent(
  billingUserId: string,
  usageEventId: string,
): Promise<UsageEventState> {
  const { data, error } = await supabase
    .from("ai_usage_events")
    .select(
      "id,app_user_id,wallet_id,status,reservation_eur,model_name,selected_tier_code,request_idempotency_key,request_fingerprint,openai_response_id,request_metadata,response_metadata,actual_cost_eur,provider_token_cost_eur,provider_tool_calls,provider_tool_cost_eur,wallet_debit_eur",
    )
    .eq("id", usageEventId)
    .eq("app_user_id", billingUserId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      `AI_BILLING_BACKGROUND_USAGE_EVENT_NOT_FOUND:${
        error?.message ?? usageEventId
      }`,
    );
  }

  return {
    id: String(data.id),
    appUserId: String(data.app_user_id),
    walletId:
      typeof data.wallet_id === "string" ? data.wallet_id : null,
    status: String(data.status ?? ""),
    reservationEur: finiteNumber(data.reservation_eur) ?? 0,
    modelName: String(data.model_name ?? ""),
    tierCode:
      typeof data.selected_tier_code === "string"
        ? data.selected_tier_code
        : null,
    requestIdempotencyKey: String(
      data.request_idempotency_key ?? "",
    ),
    requestFingerprint: String(data.request_fingerprint ?? ""),
    openaiResponseId:
      typeof data.openai_response_id === "string" &&
      data.openai_response_id.trim()
        ? data.openai_response_id.trim()
        : null,
    requestMetadata: recordValue(data.request_metadata),
    responseMetadata: recordValue(data.response_metadata),
    actualCostEur: finiteNumber(data.actual_cost_eur),
    tokenCostEur: finiteNumber(data.provider_token_cost_eur),
    toolCostEur: finiteNumber(data.provider_tool_cost_eur),
    webSearchCalls: Math.max(0,Math.trunc(finiteNumber(data.provider_tool_calls)??0)),
    walletDebitEur: finiteNumber(data.wallet_debit_eur),
  };
}

async function bindProviderResponse(input: {
  billingUserId: string;
  usageEventId: string;
  response: AiBackgroundProviderResponse;
}) {
  const current = await readUsageEvent(
    input.billingUserId,
    input.usageEventId,
  );

  if (
    current.openaiResponseId &&
    current.openaiResponseId !== input.response.id
  ) {
    throw new Error(
      "AI_BILLING_BACKGROUND_PROVIDER_RESPONSE_CONFLICT",
    );
  }

  const { error } = await supabase
    .from("ai_usage_events")
    .update({
      openai_response_id: input.response.id,
      response_metadata: {
        ...current.responseMetadata,
        contract: AI_BILLING_BACKGROUND_GATEWAY_B3_0_CONTRACT,
        background: true,
        providerAttempted: true,
        providerBoundAt: new Date().toISOString(),
        providerStatus: input.response.status ?? null,
      },
    })
    .eq("id", input.usageEventId)
    .eq("app_user_id", input.billingUserId);

  if (error) {
    throw new Error(
      `AI_BILLING_BACKGROUND_PROVIDER_BIND_FAILED:${error.message}`,
    );
  }
}

async function writeMeasuredProviderUsage(input: {
  event: UsageEventState;
  response: AiBackgroundProviderResponse;
  actualCostEur: number;
  tokenCostEur: number;
  toolCostEur: number;
  webSearchCalls: number;
  walletDebitEur: number;
}) {
  const usage = extractAiResponseUsageMetadata(
    input.response,
    input.event.modelName,
  );

  const { error } = await supabase
    .from("ai_usage_events")
    .update({
      input_tokens: usage.inputTokens,
      cached_input_tokens: usage.cachedInputTokens,
      output_tokens: usage.outputTokens,
      total_tokens: usage.totalTokens,
      provider_token_cost_eur: input.tokenCostEur,
      provider_tool_calls: input.webSearchCalls,
      provider_tool_cost_eur: input.toolCostEur,
      actual_cost_eur: input.actualCostEur,
      wallet_debit_eur: input.walletDebitEur,
      status: "openai_completed",
      error_code: null,
      error_message: null,
      openai_response_id: input.response.id,
      response_metadata: {
        ...input.event.responseMetadata,
        contract: AI_BILLING_BACKGROUND_GATEWAY_B3_0_CONTRACT,
        background: true,
        providerAttempted: true,
        providerCompleted: true,
        providerStatus: input.response.status ?? null,
        webSearchCalls: input.webSearchCalls,
        webSearchUsdPerCall: OPENAI_WEB_SEARCH_USD_PER_CALL,
        usage: usage.rawUsage ?? null,
      },
    })
    .eq("id", input.event.id)
    .eq("app_user_id", input.event.appUserId);

  if (error) {
    throw new Error(
      `AI_BILLING_BACKGROUND_PROVIDER_USAGE_WRITE_FAILED:${error.message}`,
    );
  }
}

async function markUnresolved(input: {
  event: UsageEventState;
  response?: AiBackgroundProviderResponse | null;
  error: unknown;
}) {
  const usage = input.response
    ? extractAiResponseUsageMetadata(
        input.response,
        input.event.modelName,
      )
    : null;
  const webSearchCalls = input.response
    ? countAiWebSearchCalls(input.response)
    : 0;

  const { error } = await supabase
    .from("ai_usage_events")
    .update({
      ...(usage
        ? {
            input_tokens: usage.inputTokens,
            cached_input_tokens: usage.cachedInputTokens,
            output_tokens: usage.outputTokens,
            total_tokens: usage.totalTokens,
          }
        : {}),
      provider_tool_calls: webSearchCalls,
      status: "debit_failed",
      error_code: compactErrorCode(
        input.error,
        "AI_BILLING_BACKGROUND_UNRESOLVED",
      ),
      error_message: errorMessage(input.error).slice(0, 4000),
      completed_at: new Date().toISOString(),
      response_metadata: {
        ...input.event.responseMetadata,
        contract: AI_BILLING_BACKGROUND_GATEWAY_B3_0_CONTRACT,
        background: true,
        providerStatus: input.response?.status ?? null,
        billingFailedAt: new Date().toISOString(),
        reservationIntentionallyHeld: true,
      },
    })
    .eq("id", input.event.id)
    .eq("app_user_id", input.event.appUserId);

  if (error) {
    console.error(
      "AI_BILLING_BACKGROUND_UNRESOLVED_AUDIT_WRITE_FAILED",
      error.message,
    );
  }
}

function validateStartInput(input: BillableAiBackgroundInput) {
  if (!input.billingUserId.trim()) {
    throw new Error("AI_BILLING_BACKGROUND_USER_REQUIRED");
  }

  if (
    !input.requestIdempotencyKey.trim() ||
    input.requestIdempotencyKey.trim().length < 8 ||
    input.requestIdempotencyKey.trim().length > 200
  ) {
    throw new Error(
      "AI_BILLING_BACKGROUND_IDEMPOTENCY_KEY_INVALID",
    );
  }

  if (!input.routePath.trim()) {
    throw new Error("AI_BILLING_BACKGROUND_ROUTE_REQUIRED");
  }

  if (!input.modelName.trim()) {
    throw new Error("AI_BILLING_BACKGROUND_MODEL_REQUIRED");
  }
}

export async function startBillableAiBackgroundResponse(
  input: BillableAiBackgroundInput,
): Promise<AiBackgroundStartResult> {
  validateStartInput(input);

  const estimatedInputTokens = nonNegativeInteger(
    input.estimatedInputTokens,
    "AI_BILLING_BACKGROUND_ESTIMATED_INPUT_INVALID",
  );
  const estimatedOutputTokens = nonNegativeInteger(
    input.estimatedOutputTokens,
    "AI_BILLING_BACKGROUND_ESTIMATED_OUTPUT_INVALID",
  );

  if (estimatedOutputTokens <= 0) {
    throw new Error(
      "AI_BILLING_BACKGROUND_ESTIMATED_OUTPUT_REQUIRED",
    );
  }

  const additionalProviderCostUsd =
    finiteNumber(input.estimatedAdditionalProviderCostUsd) ?? 0;

  if (additionalProviderCostUsd < 0) {
    throw new Error(
      "AI_BILLING_BACKGROUND_ESTIMATED_TOOL_COST_INVALID",
    );
  }

  const safetyMultiplier =
    finiteNumber(input.preflightSafetyMultiplier) ?? 1.25;

  if (safetyMultiplier < 1 || safetyMultiplier > 10) {
    throw new Error(
      "AI_BILLING_BACKGROUND_SAFETY_MULTIPLIER_INVALID",
    );
  }

  const price = await readActiveModelPriceSnapshot({
    modelName: input.modelName,
    tierCode: input.tierCode ?? null,
  });

  const estimatedTokenCostEur = calculateAiUsageCostEur({
    usage: {
      inputTokens: estimatedInputTokens,
      cachedInputTokens: 0,
      outputTokens: estimatedOutputTokens,
      totalTokens: estimatedInputTokens + estimatedOutputTokens,
    },
    price,
  });

  const estimatedAdditionalProviderCostEur =
    additionalProviderCostUsd > 0
      ? convertAiProviderCostToEur({
          providerCost: additionalProviderCostUsd,
          price,
        })
      : 0;

  const estimatedBaseCostEur = roundEur(
    estimatedTokenCostEur + estimatedAdditionalProviderCostEur,
    8,
  );
  const estimatedMaxCostEur = roundEur(
    estimatedBaseCostEur * safetyMultiplier,
    8,
  );

  if (estimatedMaxCostEur <= 0) {
    throw new Error(
      "AI_BILLING_BACKGROUND_ESTIMATED_COST_INVALID",
    );
  }

  const reservationEur = ceilWalletEur(estimatedMaxCostEur);
  const fingerprint = requestFingerprint(input);
  const idempotencyKey = input.requestIdempotencyKey.trim();
  const providerKey = providerRequestIdempotencyKey({
    billingUserId: input.billingUserId,
    requestIdempotencyKey: idempotencyKey,
  });

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
      contract: AI_BILLING_BACKGROUND_GATEWAY_B3_0_CONTRACT,
      background: true,
      providerRequestIdempotencyKey: providerKey,
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedAdditionalProviderCostUsd: additionalProviderCostUsd,
      estimatedAdditionalProviderCostEur,
      preflightSafetyMultiplier: safetyMultiplier,
      backgroundPriceSnapshot: priceMetadata(price),
      ...(input.requestMetadata ?? {}),
    },
  });

  const context: AiBackgroundReservationContext = {
    billingUserId: input.billingUserId,
    usageEventId: reservation.usageEventId,
    walletId: reservation.walletId,
    requestIdempotencyKey: idempotencyKey,
    requestFingerprint: fingerprint,
    providerRequestIdempotencyKey: providerKey,
    reservationEur: reservation.reservationEur,
    estimatedMaxCostEur,
    acquired: reservation.acquired,
  };

  if (input.onReserved) {
    try {
      await input.onReserved(context);
    } catch (error) {
      if (reservation.acquired) {
        await releaseAiUsageReservation({
          appUserId: input.billingUserId,
          usageEventId: reservation.usageEventId,
          errorCode: "AI_BILLING_BACKGROUND_BIND_FAILED",
          errorMessage: errorMessage(error).slice(0, 4000),
          metadata: {
            contract: AI_BILLING_BACKGROUND_GATEWAY_B3_0_CONTRACT,
            providerAttempted: false,
          },
        }).catch(() => {});
      }
      throw error;
    }
  }

  let event = await readUsageEvent(
    input.billingUserId,
    reservation.usageEventId,
  );

  if (event.openaiResponseId) {
    const response = await retrieveAiBackgroundResponse({
      responseId: event.openaiResponseId,
    });

    return {
      response,
      billing: {
        ...context,
        recoveredExistingProviderResponse: true,
      },
    };
  }

  if (
    !reservation.acquired &&
    event.status !== "preflight_allowed" &&
    event.reservationEur <= 0
  ) {
    throw new Error(
      `AI_BILLING_BACKGROUND_REQUEST_ALREADY_TERMINAL:${event.status}`,
    );
  }

  let response: AiBackgroundProviderResponse;

  try {
    response = await createAiBackgroundResponse({
      request: input.providerRequest,
      idempotencyKey: providerKey,
      requestTimeoutMs: input.requestTimeoutMs,
      maxRetries: input.maxRetries,
    });
  } catch (providerError) {
    if (reservation.acquired || event.reservationEur > 0) {
      await releaseAiUsageReservation({
        appUserId: input.billingUserId,
        usageEventId: reservation.usageEventId,
        errorCode: compactErrorCode(
          providerError,
          "AI_PROVIDER_BACKGROUND_CREATE_FAILED",
        ),
        errorMessage: errorMessage(providerError).slice(0, 4000),
        metadata: {
          contract: AI_BILLING_BACKGROUND_GATEWAY_B3_0_CONTRACT,
          providerAttempted: true,
          providerCompleted: false,
          background: true,
        },
      });
    }

    throw providerError;
  }

  if (!response.id) {
    const missingIdError = new Error(
      "AI_BILLING_BACKGROUND_PROVIDER_RESPONSE_ID_MISSING",
    );
    event = await readUsageEvent(
      input.billingUserId,
      reservation.usageEventId,
    );
    await markUnresolved({
      event,
      response,
      error: missingIdError,
    });
    throw missingIdError;
  }

  await bindProviderResponse({
    billingUserId: input.billingUserId,
    usageEventId: reservation.usageEventId,
    response,
  });

  return {
    response,
    billing: {
      ...context,
      recoveredExistingProviderResponse: false,
    },
  };
}

export async function pollBillableAiBackgroundResponse(input: {
  billingUserId: string;
  usageEventId: string;
  providerResponseId?: string | null;
  include?: string[];
}): Promise<AiBackgroundPollResult> {
  const event = await readUsageEvent(
    input.billingUserId,
    input.usageEventId,
  );

  const responseId =
    input.providerResponseId?.trim() || event.openaiResponseId;

  if (!responseId) {
    throw new Error(
      "AI_BILLING_BACKGROUND_PROVIDER_RESPONSE_NOT_BOUND",
    );
  }

  if (
    event.openaiResponseId &&
    event.openaiResponseId !== responseId
  ) {
    throw new Error(
      "AI_BILLING_BACKGROUND_PROVIDER_RESPONSE_CONFLICT",
    );
  }

  const response = await retrieveAiBackgroundResponse({
    responseId,
    include: input.include,
  });
  const providerStatus = String(response.status ?? "");

  // Retry/poll idempotency: a channel may be polled again after provider work
  // was billed but before its own run row was finalized. Never move a settled
  // usage event back to openai_completed, otherwise a later retry could debit
  // the same provider response twice.
  if (event.status === "wallet_debited") {
    return {
      response,
      providerStatus,
      phase: providerStatus === "completed" ? "settled" : "settled_provider_error",
      billing: {
        usageEventId: event.id,
        walletId: event.walletId,
        actualCostEur: event.actualCostEur,
        tokenCostEur: event.tokenCostEur,
        toolCostEur: event.toolCostEur,
        webSearchCalls: event.webSearchCalls,
        walletDebitEur: event.walletDebitEur,
        usageStatus: event.status,
        reservationReleasedEur: null,
        debitLedgerId: null,
        releaseLedgerId: null,
      },
    };
  }

  if (event.status === "openai_failed" && event.reservationEur <= 0) {
    return {
      response,
      providerStatus,
      phase: "released",
      billing: {
        usageEventId: event.id,
        walletId: event.walletId,
        actualCostEur: event.actualCostEur ?? 0,
        tokenCostEur: event.tokenCostEur ?? 0,
        toolCostEur: event.toolCostEur ?? 0,
        webSearchCalls: event.webSearchCalls,
        walletDebitEur: 0,
        usageStatus: event.status,
        reservationReleasedEur: null,
        debitLedgerId: null,
        releaseLedgerId: null,
      },
    };
  }

  if (event.status === "debit_failed") {
    throw new Error("AI_BILLING_BACKGROUND_PREVIOUS_DEBIT_FAILED");
  }

  if (providerStatus === "queued" || providerStatus === "in_progress") {
    return {
      response,
      providerStatus,
      phase: "pending",
      billing: {
        usageEventId: event.id,
        walletId: event.walletId,
        actualCostEur: null,
        tokenCostEur: null,
        toolCostEur: null,
        webSearchCalls: countAiWebSearchCalls(response),
        walletDebitEur: null,
        usageStatus: event.status,
        reservationReleasedEur: null,
        debitLedgerId: null,
        releaseLedgerId: null,
      },
    };
  }

  const usage = extractAiResponseUsageMetadata(
    response,
    event.modelName,
  );
  const webSearchCalls = countAiWebSearchCalls(response);
  const hasMeasuredProviderCost =
    usage.totalTokens > 0 ||
    usage.inputTokens + usage.outputTokens > 0 ||
    webSearchCalls > 0;

  const successful = providerStatus === "completed";
  const terminalProviderError = [
    "failed",
    "cancelled",
    "incomplete",
  ].includes(providerStatus);

  if (!successful && !terminalProviderError) {
    const unsupported = new Error(
      `AI_BILLING_BACKGROUND_PROVIDER_STATUS_UNSUPPORTED:${providerStatus}`,
    );
    await markUnresolved({ event, response, error: unsupported });
    throw unsupported;
  }

  if (!hasMeasuredProviderCost) {
    if (successful) {
      const emptyUsage = new Error(
        "AI_BILLING_BACKGROUND_PROVIDER_USAGE_EMPTY",
      );
      await markUnresolved({ event, response, error: emptyUsage });
      throw emptyUsage;
    }

    const released = await releaseAiUsageReservation({
      appUserId: input.billingUserId,
      usageEventId: event.id,
      errorCode: `AI_PROVIDER_BACKGROUND_${providerStatus.toUpperCase()}`,
      errorMessage: `Background provider response finished with status ${providerStatus} and no measurable provider usage.`,
      metadata: {
        contract: AI_BILLING_BACKGROUND_GATEWAY_B3_0_CONTRACT,
        background: true,
        providerStatus,
        openaiResponseId: response.id,
      },
    });

    return {
      response,
      providerStatus,
      phase: "released",
      billing: {
        usageEventId: event.id,
        walletId: released.walletId,
        actualCostEur: 0,
        tokenCostEur: 0,
        toolCostEur: 0,
        webSearchCalls,
        walletDebitEur: 0,
        usageStatus: released.usageStatus,
        reservationReleasedEur: released.releasedEur,
        debitLedgerId: null,
        releaseLedgerId: released.releaseLedgerId,
      },
    };
  }

  const price = priceFromMetadata(event.requestMetadata);
  const usageTokens: AiUsageTokens = {
    inputTokens: usage.inputTokens,
    cachedInputTokens: usage.cachedInputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
  };

  const tokenCostEur = calculateAiUsageCostEur({
    usage: usageTokens,
    price,
  });
  const toolCostEur =
    webSearchCalls > 0
      ? convertAiProviderCostToEur({
          providerCost:
            webSearchCalls * OPENAI_WEB_SEARCH_USD_PER_CALL,
          price,
        })
      : 0;
  const actualCostEur = roundEur(
    tokenCostEur + toolCostEur,
    8,
  );

  if (actualCostEur <= 0) {
    const costError = new Error(
      "AI_BILLING_BACKGROUND_ACTUAL_COST_INVALID",
    );
    await markUnresolved({ event, response, error: costError });
    throw costError;
  }

  const walletDebitEur = ceilWalletEur(actualCostEur);

  await writeMeasuredProviderUsage({
    event,
    response,
    actualCostEur,
    tokenCostEur,
    toolCostEur,
    webSearchCalls,
    walletDebitEur,
  });

  let settlement;

  try {
    settlement = await settleReservedAiUsageDebit({
      appUserId: input.billingUserId,
      usageEventId: event.id,
      actualCostEur,
      walletDebitEur,
      reason: successful
        ? "ARCTor background AI usage debit"
        : "ARCTor background AI provider terminal usage debit",
      metadata: {
        contract: AI_BILLING_BACKGROUND_GATEWAY_B3_0_CONTRACT,
        background: true,
        providerStatus,
        openaiResponseId: response.id,
        tokenCostEur,
        toolCostEur,
        webSearchCalls,
        webSearchUsdPerCall: OPENAI_WEB_SEARCH_USD_PER_CALL,
      },
    });
  } catch (error) {
    await markUnresolved({ event, response, error });
    throw error;
  }

  return {
    response,
    providerStatus,
    phase: successful ? "settled" : "settled_provider_error",
    billing: {
      usageEventId: event.id,
      walletId: settlement.walletId,
      actualCostEur,
      tokenCostEur,
      toolCostEur,
      webSearchCalls,
      walletDebitEur,
      usageStatus: settlement.usageStatus,
      reservationReleasedEur: settlement.reservationReleasedEur,
      debitLedgerId: settlement.debitLedgerId,
      releaseLedgerId: settlement.releaseLedgerId,
    },
  };
}

export async function cancelBillableAiBackgroundProvider(input: {
  billingUserId: string;
  usageEventId: string;
  providerResponseId?: string | null;
}) {
  const event = await readUsageEvent(
    input.billingUserId,
    input.usageEventId,
  );
  const responseId =
    input.providerResponseId?.trim() || event.openaiResponseId;

  if (!responseId) {
    throw new Error(
      "AI_BILLING_BACKGROUND_PROVIDER_RESPONSE_NOT_BOUND",
    );
  }

  if (
    event.openaiResponseId &&
    event.openaiResponseId !== responseId
  ) {
    throw new Error(
      "AI_BILLING_BACKGROUND_PROVIDER_RESPONSE_CONFLICT",
    );
  }

  return cancelAiBackgroundResponse({ responseId });
}

export async function releaseBillableAiBackgroundReservation(input: {
  billingUserId: string;
  usageEventId: string;
  errorCode: string;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return releaseAiUsageReservation({
    appUserId: input.billingUserId,
    usageEventId: input.usageEventId,
    errorCode: input.errorCode.slice(0, 200),
    errorMessage: input.errorMessage?.slice(0, 4000) ?? null,
    metadata: {
      contract: AI_BILLING_BACKGROUND_GATEWAY_B3_0_CONTRACT,
      background: true,
      ...(input.metadata ?? {}),
    },
  });
}
