import { NextResponse } from "next/server";

import { supabase } from "../../../../../lib/supabase";
import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "../../../../lib/admin/require-platform-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "admin-external-service-limits-v1" as const;
const PROVIDER = "GOOGLE_PLACES_NEW" as const;
const SAFE_MONTHLY_FREE_WARNING_LIMIT = 10000;

type SettingRow = {
  provider: string;
  operation: string;
  enabled: boolean;
  user_scope_type: string;
  user_limit: number;
  global_day_limit: number;
  global_month_limit: number;
  updated_at: string | null;
  updated_by_app_user_id: string | null;
};

type CounterRow = {
  operation: string;
  scope_type: string;
  window_started_at: string;
  request_count: number;
};

type UpdateBody = {
  searchEnabled?: unknown;
  searchUserHourLimit?: unknown;
  searchGlobalDayLimit?: unknown;
  searchGlobalMonthLimit?: unknown;
  resolveEnabled?: unknown;
  resolveUserDayLimit?: unknown;
  resolveGlobalDayLimit?: unknown;
  resolveGlobalMonthLimit?: unknown;
};

function asPositiveInteger(value: unknown, fieldName: string): number {
  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new Error(`${fieldName} must be an integer greater than zero.`);
  }

  return parsedValue;
}

function asBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${fieldName} must be boolean.`);
  }

  return value;
}

function normalizeSettings(rows: SettingRow[]) {
  return rows.map((row) => ({
    provider: row.provider,
    operation: row.operation,
    enabled: row.enabled,
    userScopeType: row.user_scope_type,
    userLimit: row.user_limit,
    globalDayLimit: row.global_day_limit,
    globalMonthLimit: row.global_month_limit,
    updatedAt: row.updated_at,
    updatedByAppUserId: row.updated_by_app_user_id,
  }));
}

function startOfUtcHour(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
    ),
  );
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function usageForOperation(rows: CounterRow[], operation: "search" | "resolve") {
  const now = new Date();
  const hourStart = startOfUtcHour(now).getTime();
  const dayStart = startOfUtcDay(now).getTime();
  const monthStart = startOfUtcMonth(now).getTime();

  let currentHourTotal = 0;
  let currentDayTotal = 0;
  let currentMonthTotal = 0;

  for (const row of rows) {
    if (row.operation !== operation) {
      continue;
    }

    const windowStartedAt = Date.parse(row.window_started_at);

    if (!Number.isFinite(windowStartedAt)) {
      continue;
    }

    if (row.scope_type === "user_hour" && windowStartedAt === hourStart) {
      currentHourTotal += row.request_count;
    }

    if (
      row.scope_type === "global_day" &&
      windowStartedAt === dayStart
    ) {
      currentDayTotal += row.request_count;
    }

    if (
      row.scope_type === "global_month" &&
      windowStartedAt === monthStart
    ) {
      currentMonthTotal += row.request_count;
    }
  }

  return {
    operation,
    currentHourTotal,
    currentDayTotal,
    currentMonthTotal,
  };
}

async function loadSettingsAndUsage() {
  const [{ data: settingRows, error: settingsError }, { data: counterRows, error: countersError }] =
    await Promise.all([
      supabase
        .from("external_api_rate_limit_settings")
        .select(
          "provider, operation, enabled, user_scope_type, user_limit, global_day_limit, global_month_limit, updated_at, updated_by_app_user_id",
        )
        .eq("provider", PROVIDER)
        .order("operation", { ascending: true }),
      supabase
        .from("external_api_rate_limit_windows")
        .select("operation, scope_type, window_started_at, request_count")
        .eq("provider", PROVIDER)
        .gte("window_started_at", startOfUtcMonth(new Date()).toISOString()),
    ]);

  if (settingsError) {
    throw new Error(settingsError.message);
  }

  if (countersError) {
    throw new Error(countersError.message);
  }

  const settings = (settingRows as unknown as SettingRow[] | null) ?? [];
  const counters = (counterRows as unknown as CounterRow[] | null) ?? [];

  return {
    settings: normalizeSettings(settings),
    usage: [
      usageForOperation(counters, "search"),
      usageForOperation(counters, "resolve"),
    ],
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
    const snapshot = await loadSettingsAndUsage();

    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      ...snapshot,
      canEdit:
        guard.platformAdmin.role === "owner" ||
        guard.platformAdmin.role === "admin",
      updatedBy: {
        appUserId: guard.appUser.id,
        role: guard.platformAdmin.role,
      },
      freeTierWarningLimit: SAFE_MONTHLY_FREE_WARNING_LIMIT,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "EXTERNAL_SERVICE_LIMITS_LOAD_FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Unknown settings error.",
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
    const body = (await request.json()) as UpdateBody;

    const input = {
      searchEnabled: asBoolean(body.searchEnabled, "searchEnabled"),
      searchUserHourLimit: asPositiveInteger(
        body.searchUserHourLimit,
        "searchUserHourLimit",
      ),
      searchGlobalDayLimit: asPositiveInteger(
        body.searchGlobalDayLimit,
        "searchGlobalDayLimit",
      ),
      searchGlobalMonthLimit: asPositiveInteger(
        body.searchGlobalMonthLimit,
        "searchGlobalMonthLimit",
      ),
      resolveEnabled: asBoolean(body.resolveEnabled, "resolveEnabled"),
      resolveUserDayLimit: asPositiveInteger(
        body.resolveUserDayLimit,
        "resolveUserDayLimit",
      ),
      resolveGlobalDayLimit: asPositiveInteger(
        body.resolveGlobalDayLimit,
        "resolveGlobalDayLimit",
      ),
      resolveGlobalMonthLimit: asPositiveInteger(
        body.resolveGlobalMonthLimit,
        "resolveGlobalMonthLimit",
      ),
    };

    if (input.searchGlobalDayLimit > input.searchGlobalMonthLimit) {
      return NextResponse.json(
        {
          ok: false,
          routeMarker: ROUTE_MARKER,
          errorCode: "SEARCH_DAY_LIMIT_EXCEEDS_MONTH",
          errorMessage: "Search daily limit cannot exceed monthly limit.",
        },
        { status: 400 },
      );
    }

    if (input.resolveGlobalDayLimit > input.resolveGlobalMonthLimit) {
      return NextResponse.json(
        {
          ok: false,
          routeMarker: ROUTE_MARKER,
          errorCode: "RESOLVE_DAY_LIMIT_EXCEEDS_MONTH",
          errorMessage: "Resolve daily limit cannot exceed monthly limit.",
        },
        { status: 400 },
      );
    }

    const { error } = await supabase.rpc(
      "update_google_places_rate_limit_settings_v1",
      {
        p_actor_app_user_id: guard.appUser.id,
        p_search_enabled: input.searchEnabled,
        p_search_user_hour_limit: input.searchUserHourLimit,
        p_search_global_day_limit: input.searchGlobalDayLimit,
        p_search_global_month_limit: input.searchGlobalMonthLimit,
        p_resolve_enabled: input.resolveEnabled,
        p_resolve_user_day_limit: input.resolveUserDayLimit,
        p_resolve_global_day_limit: input.resolveGlobalDayLimit,
        p_resolve_global_month_limit: input.resolveGlobalMonthLimit,
      },
    );

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          routeMarker: ROUTE_MARKER,
          errorCode: "EXTERNAL_SERVICE_LIMITS_UPDATE_FAILED",
          errorMessage: error.message,
        },
        { status: 500 },
      );
    }

    const snapshot = await loadSettingsAndUsage();

    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      ...snapshot,
      canEdit: true,
      updatedBy: {
        appUserId: guard.appUser.id,
        role: guard.platformAdmin.role,
      },
      freeTierWarningLimit: SAFE_MONTHLY_FREE_WARNING_LIMIT,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "EXTERNAL_SERVICE_LIMITS_INVALID_REQUEST",
        errorMessage:
          error instanceof Error ? error.message : "Invalid settings request.",
      },
      { status: 400 },
    );
  }
}
