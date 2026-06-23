import { NextResponse } from "next/server";

import { supabase } from "../../../../../lib/supabase";
import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "../../../../lib/admin/require-platform-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "admin-users-list-route-step19h-v1" as const;
const MAX_USERS = 250;
const RECENT_ACTIVITY_LIMIT = 2000;

type AppUserRow = {
  id: string;
  auth0_sub: string | null;
  email: string | null;
  name: string | null;
  picture: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_seen_at: string | null;
};

type PlatformAdminRow = {
  id: string;
  app_user_id: string;
  role: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

type AiWalletRow = {
  id: string;
  app_user_id: string;
  balance_eur: unknown;
  reserved_eur: unknown;
  currency: string | null;
  status: string | null;
  updated_at: string | null;
};

type PointsWalletRow = {
  id: string;
  user_id: string;
  balance: unknown;
  available_balance: unknown;
  reserved_balance: unknown;
  spent_balance: unknown;
  released_balance: unknown;
  status: string | null;
  updated_at: string | null;
};

type AiUsageRow = {
  app_user_id: string;
  selected_tier_code: string | null;
  model_name: string | null;
  total_tokens: unknown;
  estimated_cost_eur: unknown;
  actual_cost_eur: unknown;
  wallet_debit_eur: unknown;
  status: string | null;
  created_at: string | null;
  completed_at: string | null;
};

type TimestampRow = {
  user_id: string;
  created_at: string | null;
};

type AppUserSessionRow = {
  app_user_id: string;
  client_session_id_hash: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  request_count: number | null;
  status: string | null;
  updated_at: string | null;
};

type PriceSnapshotRow = {
  tier_code: string;
  model_name: string;
  pricing_currency: string | null;
  display_currency: string | null;
  input_cost_per_1m_tokens: unknown;
  cached_input_cost_per_1m_tokens: unknown;
  output_cost_per_1m_tokens: unknown;
  usd_to_eur_rate: unknown;
  eur_markup_multiplier: unknown;
  valid_from: string | null;
  is_active: boolean | null;
};

type TierProjection = {
  tierCode: string;
  modelName: string | null;
  approximateInputTokensForAvailableBalance: number | null;
  approximateOutputTokensForAvailableBalance: number | null;
  inputCostPer1mTokensEur: number | null;
  outputCostPer1mTokensEur: number | null;
};

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : null;
}

function maxIsoTimestamp(values: readonly (string | null | undefined)[]): string | null {
  const timestamps = values
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function buildMapByKey<T extends Record<string, unknown>>(
  rows: readonly T[],
  keyName: string,
): Map<string, T> {
  const map = new Map<string, T>();

  for (const row of rows) {
    const key = row[keyName];

    if (typeof key === "string" && key.length > 0 && !map.has(key)) {
      map.set(key, row);
    }
  }

  return map;
}

function buildManyByKey<T extends Record<string, unknown>>(
  rows: readonly T[],
  keyName: string,
): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const row of rows) {
    const key = row[keyName];

    if (typeof key !== "string" || key.length === 0) {
      continue;
    }

    const current = map.get(key) ?? [];
    current.push(row);
    map.set(key, current);
  }

  return map;
}

function isOwnerOrAdmin(row: PlatformAdminRow): boolean {
  return row.status === "active" && (row.role === "owner" || row.role === "admin");
}

function getEffectiveAdminRole(rows: readonly PlatformAdminRow[]): string | null {
  const activeOwnerOrAdmin = rows.find(isOwnerOrAdmin);

  if (activeOwnerOrAdmin) {
    return activeOwnerOrAdmin.role;
  }

  const activeAnyRole = rows.find((row) => row.status === "active");

  return activeAnyRole?.role ?? null;
}

function getCostPer1mTokensEur(
  snapshot: PriceSnapshotRow,
  fieldName: "input_cost_per_1m_tokens" | "output_cost_per_1m_tokens",
): number | null {
  const rawCost = asNumber(snapshot[fieldName], NaN);

  if (!Number.isFinite(rawCost) || rawCost < 0) {
    return null;
  }

  const markup = Math.max(asNumber(snapshot.eur_markup_multiplier, 1), 0);
  const rate = asNumber(snapshot.usd_to_eur_rate, NaN);
  const pricingCurrency = snapshot.pricing_currency ?? "USD";

  if (pricingCurrency === "USD") {
    if (!Number.isFinite(rate) || rate <= 0) {
      return rawCost * markup;
    }

    return rawCost * rate * markup;
  }

  return rawCost * markup;
}

function buildTokenProjection(balanceEur: number, costPer1mTokensEur: number | null): number | null {
  if (!costPer1mTokensEur || costPer1mTokensEur <= 0 || balanceEur <= 0) {
    return null;
  }

  return Math.floor((balanceEur * 1_000_000) / costPer1mTokensEur);
}

function buildTierProjections(
  availableEur: number,
  snapshotsByTier: ReadonlyMap<string, PriceSnapshotRow>,
): Record<string, TierProjection> {
  const result: Record<string, TierProjection> = {};

  for (const tierCode of ["nano", "standard", "pro"]) {
    const snapshot = snapshotsByTier.get(tierCode);
    const inputCost = snapshot ? getCostPer1mTokensEur(snapshot, "input_cost_per_1m_tokens") : null;
    const outputCost = snapshot ? getCostPer1mTokensEur(snapshot, "output_cost_per_1m_tokens") : null;

    result[tierCode] = {
      tierCode,
      modelName: snapshot?.model_name ?? null,
      approximateInputTokensForAvailableBalance: buildTokenProjection(availableEur, inputCost),
      approximateOutputTokensForAvailableBalance: buildTokenProjection(availableEur, outputCost),
      inputCostPer1mTokensEur: inputCost,
      outputCostPer1mTokensEur: outputCost,
    };
  }

  return result;
}

function chooseLatestPriceSnapshots(rows: readonly PriceSnapshotRow[]): Map<string, PriceSnapshotRow> {
  const map = new Map<string, PriceSnapshotRow>();

  for (const row of rows) {
    if (row.is_active !== true) {
      continue;
    }

    if (!map.has(row.tier_code)) {
      map.set(row.tier_code, row);
    }
  }

  return map;
}

function buildAiUsageSummary(rows: readonly AiUsageRow[]) {
  const map = new Map<
    string,
    {
      lastAiUsageAt: string | null;
      totalAiSpentEur: number;
      totalAiTokens: number;
      aiUsageEventCount: number;
    }
  >();

  for (const row of rows) {
    const current =
      map.get(row.app_user_id) ??
      {
        lastAiUsageAt: null,
        totalAiSpentEur: 0,
        totalAiTokens: 0,
        aiUsageEventCount: 0,
      };

    const eventAt = maxIsoTimestamp([row.completed_at, row.created_at]);
    current.lastAiUsageAt = maxIsoTimestamp([current.lastAiUsageAt, eventAt]);
    current.totalAiSpentEur +=
      asNumber(row.wallet_debit_eur, NaN) ||
      asNumber(row.actual_cost_eur, NaN) ||
      asNumber(row.estimated_cost_eur, 0);
    current.totalAiTokens += asNumber(row.total_tokens, 0);
    current.aiUsageEventCount += 1;

    map.set(row.app_user_id, current);
  }

  return map;
}

function buildLatestTimestampMap(rows: readonly TimestampRow[]): Map<string, string | null> {
  const map = new Map<string, string | null>();

  for (const row of rows) {
    const current = map.get(row.user_id) ?? null;
    map.set(row.user_id, maxIsoTimestamp([current, row.created_at]));
  }

  return map;
}

async function readRowsByUserIds<T>(
  tableName: string,
  selectColumns: string,
  userColumnName: string,
  userIds: readonly string[],
  limit?: number,
): Promise<{ rows: T[]; error: string | null }> {
  if (userIds.length === 0) {
    return { rows: [], error: null };
  }

  let query = supabase
    .from(tableName)
    .select(selectColumns)
    .in(userColumnName, [...userIds]);

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  return {
    rows: ((data ?? []) as unknown) as T[],
    error: error?.message ?? null,
  };
}

export async function GET() {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      ROUTE_MARKER,
    );
  }

  try {
    const { data: appUsersData, error: appUsersError } = await supabase
      .from("app_users")
      .select("id, auth0_sub, email, name, picture, created_at, updated_at, last_seen_at")
      .order("created_at", { ascending: false })
      .limit(MAX_USERS);

    if (appUsersError) {
      return NextResponse.json(
        {
          ok: false,
          routeMarker: ROUTE_MARKER,
          errorCode: "ADMIN_USERS_APP_USERS_READ_FAILED",
          errorMessage: appUsersError.message,
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

    const appUsers = (((appUsersData ?? []) as unknown) as AppUserRow[]).filter(
      (row) => typeof row.id === "string" && row.id.length > 0,
    );

    const userIds = appUsers.map((row) => row.id);

    const [
      platformAdminsResult,
      aiWalletsResult,
      pointsWalletsResult,
      aiUsageResult,
      activityEventsResult,
      chatMessagesResult,
      appUserSessionsResult,
      priceSnapshotsResult,
    ] = await Promise.all([
      readRowsByUserIds<PlatformAdminRow>(
        "platform_admins",
        "id, app_user_id, role, status, created_at, updated_at",
        "app_user_id",
        userIds,
      ),
      readRowsByUserIds<AiWalletRow>(
        "ai_credit_wallets",
        "id, app_user_id, balance_eur, reserved_eur, currency, status, updated_at",
        "app_user_id",
        userIds,
      ),
      readRowsByUserIds<PointsWalletRow>(
        "user_points_wallets",
        "id, user_id, balance, available_balance, reserved_balance, spent_balance, released_balance, status, updated_at",
        "user_id",
        userIds,
      ),
      readRowsByUserIds<AiUsageRow>(
        "ai_usage_events",
        "app_user_id, selected_tier_code, model_name, total_tokens, estimated_cost_eur, actual_cost_eur, wallet_debit_eur, status, created_at, completed_at",
        "app_user_id",
        userIds,
        RECENT_ACTIVITY_LIMIT,
      ),
      readRowsByUserIds<TimestampRow>(
        "activity_events",
        "user_id, created_at",
        "user_id",
        userIds,
        RECENT_ACTIVITY_LIMIT,
      ),
      readRowsByUserIds<TimestampRow>(
        "chat_messages",
        "user_id, created_at",
        "user_id",
        userIds,
        RECENT_ACTIVITY_LIMIT,
      ),
      readRowsByUserIds<AppUserSessionRow>(
        "app_user_sessions",
        "app_user_id, client_session_id_hash, first_seen_at, last_seen_at, request_count, status, updated_at",
        "app_user_id",
        userIds,
      ),
      supabase
        .from("ai_model_price_snapshots")
        .select(
          "tier_code, model_name, pricing_currency, display_currency, input_cost_per_1m_tokens, cached_input_cost_per_1m_tokens, output_cost_per_1m_tokens, usd_to_eur_rate, eur_markup_multiplier, valid_from, is_active",
        )
        .eq("is_active", true)
        .order("valid_from", { ascending: false })
        .limit(30),
    ]);

    const readErrors = [
      ["platform_admins", platformAdminsResult.error],
      ["ai_credit_wallets", aiWalletsResult.error],
      ["user_points_wallets", pointsWalletsResult.error],
      ["ai_usage_events", aiUsageResult.error],
      ["activity_events", activityEventsResult.error],
      ["chat_messages", chatMessagesResult.error],
      ["app_user_sessions", appUserSessionsResult.error],
      ["ai_model_price_snapshots", priceSnapshotsResult.error?.message ?? null],
    ].filter(([, error]) => typeof error === "string" && error.length > 0);

    if (readErrors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          routeMarker: ROUTE_MARKER,
          errorCode: "ADMIN_USERS_RELATED_READ_FAILED",
          errorMessage: "One or more admin user list related reads failed.",
          readErrors: readErrors.map(([tableName, error]) => ({ tableName, error })),
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

    const adminsByUser = buildManyByKey(
      platformAdminsResult.rows as unknown as Record<string, unknown>[],
      "app_user_id",
    ) as Map<string, PlatformAdminRow[]>;

    const aiWalletByUser = buildMapByKey(
      aiWalletsResult.rows as unknown as Record<string, unknown>[],
      "app_user_id",
    ) as Map<string, AiWalletRow>;

    const pointsWalletByUser = buildMapByKey(
      pointsWalletsResult.rows as unknown as Record<string, unknown>[],
      "user_id",
    ) as Map<string, PointsWalletRow>;

    const aiUsageByUser = buildAiUsageSummary(aiUsageResult.rows);
    const activityByUser = buildLatestTimestampMap(activityEventsResult.rows);
    const chatByUser = buildLatestTimestampMap(chatMessagesResult.rows);
    const sessionsByUser = buildManyByKey(
      appUserSessionsResult.rows as unknown as Record<string, unknown>[],
      "app_user_id",
    ) as Map<string, AppUserSessionRow[]>;
    const nowMs = Date.now();
    const onlineCutoffMs = 5 * 60 * 1000;
    const recentCutoffMs = 30 * 60 * 1000;
    const priceSnapshotsByTier = chooseLatestPriceSnapshots(
      (((priceSnapshotsResult.data ?? []) as unknown) as PriceSnapshotRow[]),
    );

    const users = appUsers.map((appUser) => {
      const adminRows = adminsByUser.get(appUser.id) ?? [];
      const adminRole = getEffectiveAdminRole(adminRows);
      const aiWallet = aiWalletByUser.get(appUser.id) ?? null;
      const pointsWallet = pointsWalletByUser.get(appUser.id) ?? null;
      const aiUsage = aiUsageByUser.get(appUser.id) ?? {
        lastAiUsageAt: null,
        totalAiSpentEur: 0,
        totalAiTokens: 0,
        aiUsageEventCount: 0,
      };

      const aiBalanceEur = aiWallet ? asNumber(aiWallet.balance_eur, 0) : 0;
      const aiReservedEur = aiWallet ? asNumber(aiWallet.reserved_eur, 0) : 0;
      const aiAvailableEur = Math.max(aiBalanceEur - aiReservedEur, 0);

      const sessionRows = sessionsByUser.get(appUser.id) ?? [];
      const lastSessionSeenAt = maxIsoTimestamp(
        sessionRows.map((row) => row.last_seen_at),
      );
      const lastSeenAt = maxIsoTimestamp([
        appUser.last_seen_at,
        lastSessionSeenAt,
      ]);
      const lastSeenMs = lastSeenAt ? Date.parse(lastSeenAt) : NaN;
      const activeSessionsCount = sessionRows.filter((row) => {
        const sessionSeenMs = row.last_seen_at ? Date.parse(row.last_seen_at) : NaN;
        return (
          row.status === "active" &&
          Number.isFinite(sessionSeenMs) &&
          nowMs - sessionSeenMs <= onlineCutoffMs
        );
      }).length;
      const totalSessionsCount = sessionRows.length;
      const presenceStatus =
        Number.isFinite(lastSeenMs) && (nowMs - lastSeenMs <= onlineCutoffMs || activeSessionsCount > 0)
          ? "online"
          : Number.isFinite(lastSeenMs) && nowMs - lastSeenMs <= recentCutoffMs
            ? "recent"
            : Number.isFinite(lastSeenMs)
              ? "offline"
              : "unknown";
      const presenceReason =
        presenceStatus === "unknown"
          ? "No heartbeat or session data recorded yet."
          : "Derived from app_users.last_seen_at and app_user_sessions.last_seen_at.";

      const lastActivityAt = maxIsoTimestamp([
        appUser.updated_at,
        appUser.last_seen_at,
        activityByUser.get(appUser.id) ?? null,
        chatByUser.get(appUser.id) ?? null,
        aiUsage.lastAiUsageAt,
      ]);

      return {
        userId: appUser.id,
        email: appUser.email,
        name: appUser.name,
        displayName: appUser.name ?? appUser.email ?? appUser.id,
        picture: appUser.picture,
        auth0Sub: appUser.auth0_sub,
        createdAt: appUser.created_at,
        updatedAt: appUser.updated_at,

        adminRole,
        adminStatus: adminRole ? "active" : "none",

        aiBalanceEur,
        aiReservedEur,
        aiAvailableEur,
        aiWalletStatus: aiWallet?.status ?? "not_created",
        aiWalletUpdatedAt: aiWallet?.updated_at ?? null,
        aiAvailableApproxByTier: buildTierProjections(aiAvailableEur, priceSnapshotsByTier),

        pointsBalance: pointsWallet ? asNumber(pointsWallet.balance, 0) : 0,
        pointsAvailableBalance: pointsWallet ? asNumber(pointsWallet.available_balance, 0) : 0,
        pointsReservedBalance: pointsWallet ? asNumber(pointsWallet.reserved_balance, 0) : 0,
        pointsSpentBalance: pointsWallet ? asNumber(pointsWallet.spent_balance, 0) : 0,
        pointsWalletStatus: pointsWallet?.status ?? "not_created",
        pointsWalletUpdatedAt: pointsWallet?.updated_at ?? null,

        lastSeenAt,
        presenceStatus,
        presenceReason,
        activeSessionsCount,
        totalSessionsCount,
        lastSessionSeenAt,
        sessionsSource: "app_user_sessions",

        lastActivityAt,
        lastAiUsageAt: aiUsage.lastAiUsageAt,
        totalAiSpentEur: Number(aiUsage.totalAiSpentEur.toFixed(8)),
        totalAiTokens: aiUsage.totalAiTokens,
        aiUsageEventCount: aiUsage.aiUsageEventCount,
      };
    });

    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      routeStatus: "admin_users_read_completed",
      users,
      meta: {
        userCount: users.length,
        maxUsers: MAX_USERS,
        schemaContract: {
          appUsersTable: "app_users",
          adminTable: "platform_admins",
          aiWalletTable: "ai_credit_wallets",
          aiUsageTable: "ai_usage_events",
          pointsWalletTable: "user_points_wallets",
          pointsTransactionsTable: "points_transactions",
          lastSeenSource: "app_users.last_seen_at",
          sessionsSource: "app_user_sessions",
        },
        limitations: [
          "Presence is derived from app_users.last_seen_at and app_user_sessions.last_seen_at.",
          "Active sessions use a five-minute heartbeat window; recent presence uses a thirty-minute window.",
          "Points balance is read from user_points_wallets.user_id -> app_users.id.",
          "AI balance is internal/admin-facing EUR accounting; end-user UI should prefer usage projections, not raw EUR balance.",
        ],
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
        errorCode: "ADMIN_USERS_UNKNOWN_ERROR",
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
