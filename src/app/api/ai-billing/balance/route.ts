import { NextResponse } from "next/server";

import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

export const ARCTOR_AI_RIGHT_RAIL_PRICE_DISPLAY_COMPAT_V1 =
  "ARCTOR_AI_RIGHT_RAIL_PRICE_DISPLAY_COMPAT_V1" as const;
export const runtime = "nodejs";

const ROUTE_MARKER = "ai-eur-billing-balance-read-route-step17e-v1" as const;

type AppUserRow = {
  id: string;
  auth0_sub: string | null;
  email: string | null;
  name: string | null;
};

type AiCreditWalletRow = {
  id: string;
  app_user_id: string;
  balance_eur: number | string | null;
  reserved_eur: number | string | null;
  currency: string | null;
  status: string | null;
  updated_at: string | null;
};

type AiModelTierRow = {
  tier_code: string;
  display_name: string | null;
  description: string | null;
  default_model_name: string | null;
  warning_level: string | null;
  enabled: boolean | null;
  sort_order: number | null;
};

type AiModelPriceSnapshotRow = {
  id: string;
  tier_code: string;
  model_name: string;
  provider: string | null;
  pricing_currency: string | null;
  display_currency: string | null;
  input_cost_per_1m_tokens: number | string | null;
  cached_input_cost_per_1m_tokens: number | string | null;
  output_cost_per_1m_tokens: number | string | null;
  usd_to_eur_rate: number | string | null;
  eur_markup_multiplier: number | string | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean | null;
  source_url: string | null;
  source_note: string | null;
};

type TierProjection = {
  tierCode: string;
  displayName: string;
  description: string | null;
  enabled: boolean;
  warningLevel: string;
  defaultModelName: string | null;
  pricingStatus: "ready" | "missing_active_price_snapshot";
  modelName: string | null;
  approximateInputTokensForBalance: number | null;
  approximateOutputTokensForBalance: number | null;
  inputCostPer1mTokensEur: number | null;
  outputCostPer1mTokensEur: number | null;
  priceSnapshotId: string | null;
  priceValidFrom: string | null;
  sourceNote: string | null;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function getPositiveNumber(value: unknown): number | null {
  const parsed = asNumber(value, Number.NaN);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function getCostPer1mTokensEur(snapshot: AiModelPriceSnapshotRow, fieldName: "input_cost_per_1m_tokens" | "output_cost_per_1m_tokens") {
  const rawCost = getPositiveNumber(snapshot[fieldName]);

  if (rawCost === null) {
    return null;
  }

  const pricingCurrency = (snapshot.pricing_currency ?? "USD").toUpperCase();
  const displayCurrency = (snapshot.display_currency ?? "EUR").toUpperCase();
  const markup = getPositiveNumber(snapshot.eur_markup_multiplier) ?? 1;

  if (pricingCurrency === "EUR" && displayCurrency === "EUR") {
    return rawCost * markup;
  }

  const usdToEurRate = getPositiveNumber(snapshot.usd_to_eur_rate);

  if (pricingCurrency === "USD" && displayCurrency === "EUR" && usdToEurRate !== null) {
    return rawCost * usdToEurRate * markup;
  }

  return null;
}

function buildTokenProjection(balanceEur: number, costPer1mTokensEur: number | null): number | null {
  if (costPer1mTokensEur === null || costPer1mTokensEur <= 0) {
    return null;
  }

  return Math.floor((balanceEur / costPer1mTokensEur) * 1_000_000);
}

async function getCurrentAppUser() {
  const session = await auth0.getSession();
  const auth0Sub = asString(session?.user?.sub);

  if (!auth0Sub) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          routeMarker: ROUTE_MARKER,
          errorCode: "AI_BILLING_BALANCE_UNAUTHENTICATED",
          errorMessage: "Authentication is required to read AI billing balance.",
          sideEffects: {
            dbReadExecuted: false,
            dbWriteExecuted: false,
            openAiCallExecuted: false,
            rowsActuallyWritten: 0,
          },
        },
        { status: 401 },
      ),
    };
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("id, auth0_sub, email, name")
    .eq("auth0_sub", auth0Sub)
    .limit(1);

  if (error) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          routeMarker: ROUTE_MARKER,
          errorCode: "AI_BILLING_BALANCE_APP_USER_LOOKUP_FAILED",
          errorMessage: error.message,
          sideEffects: {
            dbReadExecuted: true,
            dbWriteExecuted: false,
            openAiCallExecuted: false,
            rowsActuallyWritten: 0,
          },
        },
        { status: 500 },
      ),
    };
  }

  const rows = (data as unknown as AppUserRow[] | null) ?? [];

  if (!rows[0]) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        {
          ok: true,
          routeMarker: ROUTE_MARKER,
          routeStatus: "app_user_not_created_yet",
          wallet: {
            status: "not_created",
            balanceEur: 0,
            reservedEur: 0,
            availableEur: 0,
            currency: "EUR",
            walletId: null,
          },
          projections: [],
          warnings: [
            "Authenticated Auth0 user is not linked to app_users yet. Run /api/sync-user before AI billing can be used.",
          ],
          sideEffects: {
            dbReadExecuted: true,
            dbWriteExecuted: false,
            openAiCallExecuted: false,
            rowsActuallyWritten: 0,
          },
        },
        { status: 200 },
      ),
    };
  }

  return {
    appUser: rows[0],
    errorResponse: null,
  };
}

async function getWallet(appUserId: string) {
  const { data, error } = await supabase
    .from("ai_credit_wallets")
    .select("id, app_user_id, balance_eur, reserved_eur, currency, status, updated_at")
    .eq("app_user_id", appUserId)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data as unknown as AiCreditWalletRow[] | null) ?? [];

  return rows[0] ?? null;
}

async function getModelTiers() {
  const { data, error } = await supabase
    .from("ai_model_tiers")
    .select("tier_code, display_name, description, default_model_name, warning_level, enabled, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as unknown as AiModelTierRow[] | null) ?? []).filter((tier) =>
    Boolean(tier.tier_code),
  );
}

async function getActivePriceSnapshots() {
  const { data, error } = await supabase
    .from("ai_model_price_snapshots")
    .select(
      "id, tier_code, model_name, provider, pricing_currency, display_currency, input_cost_per_1m_tokens, cached_input_cost_per_1m_tokens, output_cost_per_1m_tokens, usd_to_eur_rate, eur_markup_multiplier, valid_from, valid_to, is_active, source_url, source_note",
    )
    .eq("is_active", true)
    .order("valid_from", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const snapshots = (data as unknown as AiModelPriceSnapshotRow[] | null) ?? [];
  let fallbackUsdToEurRate: number | null = null;

  if (snapshots.some((snapshot) =>
    (snapshot.pricing_currency ?? "USD").toUpperCase() === "USD" &&
    getPositiveNumber(snapshot.usd_to_eur_rate) === null
  )) {
    const { data: fxRow } = await supabase
      .from("ai_model_price_snapshots")
      .select("usd_to_eur_rate, valid_from")
      .eq("provider", "openai")
      .not("usd_to_eur_rate", "is", null)
      .order("valid_from", { ascending: false })
      .limit(1)
      .maybeSingle<{ usd_to_eur_rate: string | number | null; valid_from: string | null }>();

    fallbackUsdToEurRate = getPositiveNumber(fxRow?.usd_to_eur_rate);
  }

  const latestByTier = new Map<string, AiModelPriceSnapshotRow>();

  for (const originalSnapshot of snapshots) {
    const snapshot =
      getPositiveNumber(originalSnapshot.usd_to_eur_rate) === null && fallbackUsdToEurRate !== null
        ? { ...originalSnapshot, usd_to_eur_rate: fallbackUsdToEurRate }
        : originalSnapshot;
    if (!latestByTier.has(snapshot.tier_code)) {
      latestByTier.set(snapshot.tier_code, snapshot);
    }
  }

  return latestByTier;
}

function buildProjections(params: {
  balanceEur: number;
  tiers: AiModelTierRow[];
  snapshotsByTier: Map<string, AiModelPriceSnapshotRow>;
}): TierProjection[] {
  return params.tiers.map((tier) => {
    const snapshot = params.snapshotsByTier.get(tier.tier_code) ?? null;

    if (!snapshot) {
      return {
        tierCode: tier.tier_code,
        displayName: tier.display_name ?? tier.tier_code,
        description: tier.description ?? null,
        enabled: tier.enabled !== false,
        warningLevel: tier.warning_level ?? "normal",
        defaultModelName: tier.default_model_name ?? null,
        pricingStatus: "missing_active_price_snapshot",
        modelName: tier.default_model_name ?? null,
        approximateInputTokensForBalance: null,
        approximateOutputTokensForBalance: null,
        inputCostPer1mTokensEur: null,
        outputCostPer1mTokensEur: null,
        priceSnapshotId: null,
        priceValidFrom: null,
        sourceNote: "No active price snapshot yet.",
      };
    }

    const inputCostPer1mTokensEur = getCostPer1mTokensEur(
      snapshot,
      "input_cost_per_1m_tokens",
    );
    const outputCostPer1mTokensEur = getCostPer1mTokensEur(
      snapshot,
      "output_cost_per_1m_tokens",
    );

    return {
      tierCode: tier.tier_code,
      displayName: tier.display_name ?? tier.tier_code,
      description: tier.description ?? null,
      enabled: tier.enabled !== false,
      warningLevel: tier.warning_level ?? "normal",
      defaultModelName: tier.default_model_name ?? snapshot.model_name,
      pricingStatus:
        inputCostPer1mTokensEur !== null && outputCostPer1mTokensEur !== null
          ? "ready"
          : "missing_active_price_snapshot",
      modelName: snapshot.model_name,
      approximateInputTokensForBalance: buildTokenProjection(
        params.balanceEur,
        inputCostPer1mTokensEur,
      ),
      approximateOutputTokensForBalance: buildTokenProjection(
        params.balanceEur,
        outputCostPer1mTokensEur,
      ),
      inputCostPer1mTokensEur,
      outputCostPer1mTokensEur,
      priceSnapshotId: snapshot.id,
      priceValidFrom: snapshot.valid_from,
      sourceNote: snapshot.source_note,
    };
  });
}

export async function GET() {
  const { appUser, errorResponse } = await getCurrentAppUser();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "AI_BILLING_BALANCE_APP_USER_CONTEXT_MISSING",
        errorMessage: "App user context missing.",
        sideEffects: {
          dbReadExecuted: true,
          dbWriteExecuted: false,
          openAiCallExecuted: false,
          rowsActuallyWritten: 0,
        },
      },
      { status: 500 },
    );
  }

  try {
    const [wallet, tiers, snapshotsByTier] = await Promise.all([
      getWallet(appUser.id),
      getModelTiers(),
      getActivePriceSnapshots(),
    ]);

    const balanceEur = wallet ? asNumber(wallet.balance_eur, 0) : 0;
    const reservedEur = wallet ? asNumber(wallet.reserved_eur, 0) : 0;
    const availableEur = Math.max(balanceEur - reservedEur, 0);

    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      routeStatus: "ai_billing_balance_read_completed",
      wallet: {
        status: wallet?.status ?? "not_created",
        balanceEur,
        reservedEur,
        availableEur,
        currency: wallet?.currency ?? "EUR",
        walletId: wallet?.id ?? null,
        updatedAt: wallet?.updated_at ?? null,
      },
      projections: buildProjections({
        balanceEur: availableEur,
        tiers,
        snapshotsByTier,
      }),
      rules: {
        singleWallet: true,
        walletCurrency: "EUR",
        perModelWallets: false,
        modelTiersAreInformationalProjections: true,
        directClientTableAccess: false,
        openAiCallExecuted: false,
      },
      sideEffects: {
        dbReadExecuted: true,
        dbWriteExecuted: false,
        openAiCallExecuted: false,
        rowsActuallyWritten: 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "AI_BILLING_BALANCE_READ_FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        sideEffects: {
          dbReadExecuted: true,
          dbWriteExecuted: false,
          openAiCallExecuted: false,
          rowsActuallyWritten: 0,
        },
      },
      { status: 500 },
    );
  }
}
