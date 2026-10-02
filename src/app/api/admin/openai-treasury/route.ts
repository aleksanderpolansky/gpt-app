import { NextResponse } from "next/server";

import { supabase } from "../../../../../lib/supabase";
import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "../../../../lib/admin/require-platform-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "admin-openai-treasury-b4-v1" as const;
const PROVIDER = "openai" as const;
const CURRENCY = "USD" as const;

const PROTECTED_OWNER_EMAILS = new Set([
  "alexanderpolansky@gmail.com",
  "aleksanderpolansky@gmail.com",
]);

type TreasurySnapshotRow = {
  id: string;
  provider: string;
  balance_amount: unknown;
  currency: string;
  source_code: string;
  source_note: string | null;
  captured_at: string;
  created_at: string;
  created_by_app_user_id: string | null;
};

type WalletRow = {
  app_user_id: string;
  balance_eur: unknown;
  reserved_eur: unknown;
  status: string | null;
};

type AppUserRow = {
  id: string;
  email: string | null;
};

type PlatformAdminRow = {
  app_user_id: string;
  role: string;
  status: string;
};

type PriceSnapshotRow = {
  id: string;
  model_name: string;
  usd_to_eur_rate: unknown;
  valid_from: string;
};

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function round(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function normalizeEmail(value: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function parseBalanceUsd(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(",", "."))
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < -100000 || parsed > 100000) {
    return null;
  }

  return round(parsed, 6);
}

async function loadLatestProviderSnapshot(): Promise<TreasurySnapshotRow | null> {
  const { data, error } = await supabase
    .from("ai_provider_treasury_snapshots")
    .select(
      "id,provider,balance_amount,currency,source_code,source_note,captured_at,created_at,created_by_app_user_id",
    )
    .eq("provider", PROVIDER)
    .order("captured_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`OPENAI_TREASURY_SNAPSHOT_READ_FAILED:${error.message}`);
  }

  return (data as TreasurySnapshotRow | null) ?? null;
}

async function loadApprovedUsdToEurSnapshot(): Promise<{
  id: string;
  modelName: string;
  usdToEurRate: number;
  validFrom: string;
}> {
  const { data, error } = await supabase
    .from("ai_model_price_snapshots")
    .select("id,model_name,usd_to_eur_rate,valid_from")
    .eq("provider", "openai")
    .eq("pricing_currency", "USD")
    .eq("is_active", true)
    .not("usd_to_eur_rate", "is", null)
    .lte("valid_from", new Date().toISOString())
    .order("valid_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      `OPENAI_TREASURY_FX_SNAPSHOT_MISSING:${error?.message ?? "NO_ACTIVE_USD_PRICE_SNAPSHOT"}`,
    );
  }

  const row = data as PriceSnapshotRow;
  const usdToEurRate = finiteNumber(row.usd_to_eur_rate);

  if (usdToEurRate === null || usdToEurRate <= 0) {
    throw new Error("OPENAI_TREASURY_FX_RATE_INVALID");
  }

  return {
    id: row.id,
    modelName: row.model_name,
    usdToEurRate,
    validFrom: row.valid_from,
  };
}

async function loadAllocatedUserAiEur(): Promise<{
  allocatedBalanceEur: number;
  excludedOwnerUserIds: string[];
  walletCount: number;
}> {
  const [
    { data: walletRows, error: walletError },
    { data: appUserRows, error: appUserError },
    { data: adminRows, error: adminError },
  ] = await Promise.all([
    supabase
      .from("ai_credit_wallets")
      .select("app_user_id,balance_eur,reserved_eur,status"),
    supabase.from("app_users").select("id,email"),
    supabase
      .from("platform_admins")
      .select("app_user_id,role,status")
      .eq("status", "active"),
  ]);

  if (walletError) {
    throw new Error(`OPENAI_TREASURY_WALLETS_READ_FAILED:${walletError.message}`);
  }

  if (appUserError) {
    throw new Error(`OPENAI_TREASURY_USERS_READ_FAILED:${appUserError.message}`);
  }

  if (adminError) {
    throw new Error(`OPENAI_TREASURY_ADMINS_READ_FAILED:${adminError.message}`);
  }

  const users = (appUserRows as AppUserRow[] | null) ?? [];
  const admins = (adminRows as PlatformAdminRow[] | null) ?? [];
  const wallets = (walletRows as WalletRow[] | null) ?? [];

  const ownerIds = new Set<string>();

  for (const admin of admins) {
    if (admin.status === "active" && admin.role === "owner") {
      ownerIds.add(admin.app_user_id);
    }
  }

  for (const user of users) {
    if (PROTECTED_OWNER_EMAILS.has(normalizeEmail(user.email))) {
      ownerIds.add(user.id);
    }
  }

  let allocatedBalanceEur = 0;
  let walletCount = 0;

  for (const wallet of wallets) {
    if (ownerIds.has(wallet.app_user_id)) {
      continue;
    }

    const balanceEur = finiteNumber(wallet.balance_eur) ?? 0;

    if (balanceEur <= 0) {
      continue;
    }

    allocatedBalanceEur += balanceEur;
    walletCount += 1;
  }

  return {
    allocatedBalanceEur: round(allocatedBalanceEur, 6),
    excludedOwnerUserIds: [...ownerIds].sort(),
    walletCount,
  };
}

async function loadTreasurySnapshot() {
  const [providerSnapshot, fx, allocation] = await Promise.all([
    loadLatestProviderSnapshot(),
    loadApprovedUsdToEurSnapshot(),
    loadAllocatedUserAiEur(),
  ]);

  const balanceUsd = providerSnapshot
    ? finiteNumber(providerSnapshot.balance_amount)
    : null;

  const balanceEur =
    balanceUsd === null ? null : round(balanceUsd * fx.usdToEurRate, 6);

  const projectedUnallocatedEur =
    balanceEur === null
      ? null
      : round(balanceEur - allocation.allocatedBalanceEur, 6);

  return {
    providerBalance: providerSnapshot
      ? {
          id: providerSnapshot.id,
          provider: providerSnapshot.provider,
          balanceUsd,
          currency: providerSnapshot.currency,
          sourceCode: providerSnapshot.source_code,
          sourceNote: providerSnapshot.source_note,
          capturedAt: providerSnapshot.captured_at,
          createdAt: providerSnapshot.created_at,
          createdByAppUserId: providerSnapshot.created_by_app_user_id,
          balanceEur,
        }
      : null,

    fx: {
      source: "ai_model_price_snapshots",
      priceSnapshotId: fx.id,
      modelName: fx.modelName,
      usdToEurRate: fx.usdToEurRate,
      validFrom: fx.validFrom,
    },

    allocation: {
      allocatedUserAiEur: allocation.allocatedBalanceEur,
      walletCount: allocation.walletCount,
      excludedOwnerUserIds: allocation.excludedOwnerUserIds,
      projectedUnallocatedEur,
      deficit:
        projectedUnallocatedEur !== null && projectedUnallocatedEur < 0,
    },

    rules: {
      providerBalanceCurrency: "USD",
      internalWalletCurrency: "EUR",
      ownerWalletsExcludedFromAllocation: true,
      allocationUsesWalletBalanceNotAvailableBalance: true,
      creditBalanceOfficialApiAvailable: false,
      providerBalanceSource:
        "confirmed OpenAI Platform dashboard snapshot",
      openAiCallExecuted: false,
    },
  };
}

export async function GET() {
  const guard = await requirePlatformAdmin({
    allowedRoles: ["owner", "admin", "viewer"],
  });

  if (!guard.ok) {
    return platformAdminErrorResponse(guard, ROUTE_MARKER);
  }

  try {
    const snapshot = await loadTreasurySnapshot();

    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      routeStatus: "openai_treasury_read_completed",
      ...snapshot,
      canEdit:
        guard.platformAdmin.role === "owner" ||
        guard.platformAdmin.role === "admin",
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
        routeStatus: "openai_treasury_read_failed",
        errorCode: "OPENAI_TREASURY_READ_FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Unknown treasury read error.",
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

export async function PATCH(request: Request) {
  const guard = await requirePlatformAdmin({
    allowedRoles: ["owner", "admin"],
  });

  if (!guard.ok) {
    return platformAdminErrorResponse(guard, ROUTE_MARKER);
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const balanceUsd = parseBalanceUsd(body.balanceUsd);

    if (balanceUsd === null) {
      return NextResponse.json(
        {
          ok: false,
          routeMarker: ROUTE_MARKER,
          errorCode: "OPENAI_TREASURY_BALANCE_INVALID",
          errorMessage:
            "balanceUsd must be a finite USD amount between -100000 and 100000.",
        },
        { status: 400 },
      );
    }

    const capturedAt =
      typeof body.capturedAt === "string" &&
      !Number.isNaN(Date.parse(body.capturedAt))
        ? new Date(body.capturedAt).toISOString()
        : new Date().toISOString();

    const sourceNote =
      typeof body.sourceNote === "string" && body.sourceNote.trim()
        ? body.sourceNote.trim().slice(0, 500)
        : "Confirmed manually from OpenAI Platform credit balance.";

    const { data, error } = await supabase
      .from("ai_provider_treasury_snapshots")
      .insert({
        provider: PROVIDER,
        balance_amount: balanceUsd,
        currency: CURRENCY,
        source_code: "OPENAI_DASHBOARD_MANUAL",
        source_note: sourceNote,
        captured_at: capturedAt,
        created_by_app_user_id: guard.appUser.id,
        metadata: {
          contract: "ARCTOR_AI_BILLING_B4_PROVIDER_TREASURY_V1",
          routeMarker: ROUTE_MARKER,
          requestedByAppUserId: guard.appUser.id,
          source: "openai_platform_dashboard_manual_confirmation",
        },
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(
        `OPENAI_TREASURY_SNAPSHOT_INSERT_FAILED:${error?.message ?? "NO_ROW"}`,
      );
    }

    const snapshot = await loadTreasurySnapshot();

    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      routeStatus: "openai_treasury_snapshot_saved",
      ...snapshot,
      canEdit: true,
      write: {
        snapshotId: String(data.id),
        balanceUsd,
        capturedAt,
      },
      sideEffects: {
        dbReadExecuted: true,
        dbWriteExecuted: true,
        openAiCallExecuted: false,
        rowsActuallyWritten: 1,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        routeStatus: "openai_treasury_snapshot_save_failed",
        errorCode: "OPENAI_TREASURY_SAVE_FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Unknown treasury save error.",
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
