import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";
import { runAiJson } from "../../../../lib/ai/openaiClient";

export const dynamic = "force-dynamic";

type AiTierCode = "nano" | "standard" | "pro";

type ChatAiResponse = {
  reply: string;
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

function estimateInputTokens(systemPrompt: string, userMessage: string) {
  return Math.max(1, Math.ceil((systemPrompt.length + userMessage.length) / 4));
}

function calculateEstimatedCostEur(params: {
  priceSnapshot: AiModelPriceSnapshotRow;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
}) {
  const inputUsdPer1m = asNumber(params.priceSnapshot.input_cost_per_1m_tokens);
  const outputUsdPer1m = asNumber(params.priceSnapshot.output_cost_per_1m_tokens);
  const usdToEurRate = asNumber(params.priceSnapshot.usd_to_eur_rate);
  const eurMarkupMultiplier = asNumber(params.priceSnapshot.eur_markup_multiplier) ?? 1;

  if (inputUsdPer1m === null || outputUsdPer1m === null || usdToEurRate === null) {
    return null;
  }

  const inputCostUsd = (params.estimatedInputTokens / 1_000_000) * inputUsdPer1m;
  const outputCostUsd = (params.estimatedOutputTokens / 1_000_000) * outputUsdPer1m;
  const estimatedCostEur =
    (inputCostUsd + outputCostUsd) *
    usdToEurRate *
    eurMarkupMultiplier *
    PREFLIGHT_COST_SAFETY_MULTIPLIER;

  return Number(estimatedCostEur.toFixed(8));
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
        message: "Выбранный уровень AI сейчас недоступен.",
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
        message: "Для выбранной модели пока нет активной цены. Попробуйте другой уровень AI.",
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
        message: "AI-баланс не найден. Нужно пополнить AI-пакет через администратора.",
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
        message: "AI-баланс временно недоступен для расчёта.",
        selectedTier: params.selectedTier,
        modelName: resolvedModelName,
      }),
    };
  }

  const availableBalanceEur = Number(Math.max(0, balanceEur - reservedEur).toFixed(8));
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
        message: "Цена выбранной модели временно недоступна для расчёта.",
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
        message: "Недостаточно AI-баланса для выбранной модели. Выберите более экономный уровень или пополните AI-пакет.",
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
      .single();

    if (userError) {
      return Response.json(
        { success: false, error: userError.message },
        { status: 500 },
      );
    }

    const systemPrompt =
      "You are a simple AI assistant inside a web platform that is currently in development. Return only valid compact JSON in this exact shape: {\"reply\":\"string\"}. Keep the reply short and practical.";

    const preflightResult = await buildBillingPreflight({
      appUserId: appUser.id,
      selectedTier,
      systemPrompt,
      userMessage,
    });

    if (!preflightResult.ok) {
      return preflightResult.response;
    }

    await supabase.from("chat_messages").insert({
      user_id: appUser.id,
      role: "user",
      content: userMessage,
    });

    const aiResult = await runAiJson<ChatAiResponse>({
      system: systemPrompt,
      user: {
        message: userMessage,
      },
      model: preflightResult.preflight.modelName,
      maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
    });

    const reply =
      typeof aiResult.reply === "string" && aiResult.reply.trim()
        ? aiResult.reply.trim()
        : "Пустой ответ";

    await supabase.from("chat_messages").insert({
      user_id: appUser.id,
      role: "assistant",
      content: reply,
    });

    return Response.json({
      success: true,
      model: preflightResult.preflight.modelName,
      selectedTier,
      reply,
      billing: {
        status: "preflight_passed_no_debit_yet",
        walletId: preflightResult.preflight.wallet.id,
        availableBalanceEur: preflightResult.preflight.availableBalanceEur,
        estimatedCostEur: preflightResult.preflight.estimatedCostEur,
        estimatedInputTokens: preflightResult.preflight.estimatedInputTokens,
        estimatedOutputTokens: preflightResult.preflight.estimatedOutputTokens,
        debitImplemented: false,
      },
    });
  } catch (error) {
    console.error("OPENAI_ERROR:", error);

    return Response.json(
      {
        success: false,
        model: null,
        selectedTier,
        reply: "Ошибка на сервере",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
