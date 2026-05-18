import { NextResponse } from "next/server";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type AppUserRow = {
  id: string;
  auth0_sub?: string | null;
};

type CurrentUserContext =
  | {
      appUser: AppUserRow;
      errorResponse: null;
    }
  | {
      appUser: null;
      errorResponse: NextResponse;
    };

type CloudProfileRow = {
  user_id: string;
  value_object_id: string;
  category_table: string | null;
  category_id: string | null;
  category_role: string | null;
  contextual_category_slug: string | null;
  contextual_category_name: string | null;
  contextual_category_status: string | null;
  contextual_category_is_active: boolean | null;
  category_link_source: string | null;
  category_link_confidence: number | null;
  category_link_created_at: string | null;
  category_link_updated_at: string | null;
  usage_aggregate_id: string | null;
  usage_count: number | null;
  total_exposure_minutes: number | null;
  first_used_at: string | null;
  last_used_at: string | null;
  last_event_id: string | null;
  usage_source: string | null;
  usage_created_at: string | null;
  usage_updated_at: string | null;
  latest_event_value_object_link_id: string | null;
  latest_event_id: string | null;
  latest_event_title: string | null;
  latest_event_status: string | null;
  latest_event_duration_minutes: number | null;
  latest_exposure_minutes: number | null;
  latest_activity_template_slug: string | null;
  latest_activity_template_title: string | null;
  snapshots: unknown;
  daily_aggregates: unknown;
};

type CategorySummaryItem = {
  contextualCategorySlug: string | null;
  contextualCategoryName: string | null;
  contextualCategoryStatus: string | null;
  contextualCategoryIsActive: boolean | null;
  valueObjectsCount: number;
  totalUsageCount: number;
  totalExposureMinutes: number;
  lastUsedAt: string | null;
};

type LatestObjectItem = {
  userId: string;
  valueObjectId: string;
  categorySlug: string | null;
  categoryName: string | null;
  usageCount: number;
  totalExposureMinutes: number;
  lastUsedAt: string | null;
  latestEventId: string | null;
  latestEventTitle: string | null;
  latestActivityTemplateSlug: string | null;
  latestExposureMinutes: number | null;
};

function normalizeOptionalString(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeLimit(value: string | null): number {
  if (!value) {
    return 50;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 50;
  }

  const integer = Math.trunc(parsed);

  if (integer < 1) {
    return 1;
  }

  if (integer > 100) {
    return 100;
  }

  return integer;
}

function numericValue(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return value;
}

function maxIsoDate(a: string | null, b: string | null): string | null {
  if (!a) {
    return b;
  }

  if (!b) {
    return a;
  }

  return a >= b ? a : b;
}

async function getCurrentUserContext(): Promise<CurrentUserContext> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: "Not authenticated",
        },
        { status: 401 }
      ),
    };
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("id, auth0_sub")
    .eq("auth0_sub", session.user.sub)
    .single();

  if (appUserError || !appUser) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: appUserError?.message ?? "App user not found",
        },
        { status: 500 }
      ),
    };
  }

  return {
    appUser: appUser as AppUserRow,
    errorResponse: null,
  };
}

function buildCategorySummary(rows: CloudProfileRow[]): CategorySummaryItem[] {
  const byCategory = new Map<string, CategorySummaryItem & { valueObjectIds: Set<string> }>();

  for (const row of rows) {
    const key = row.contextual_category_slug ?? row.category_id ?? "uncategorized";

    const existing =
      byCategory.get(key) ??
      {
        contextualCategorySlug: row.contextual_category_slug,
        contextualCategoryName: row.contextual_category_name,
        contextualCategoryStatus: row.contextual_category_status,
        contextualCategoryIsActive: row.contextual_category_is_active,
        valueObjectsCount: 0,
        totalUsageCount: 0,
        totalExposureMinutes: 0,
        lastUsedAt: null,
        valueObjectIds: new Set<string>(),
      };

    existing.valueObjectIds.add(row.value_object_id);
    existing.valueObjectsCount = existing.valueObjectIds.size;
    existing.totalUsageCount += Math.trunc(numericValue(row.usage_count));
    existing.totalExposureMinutes += numericValue(row.total_exposure_minutes);
    existing.lastUsedAt = maxIsoDate(existing.lastUsedAt, row.last_used_at);

    byCategory.set(key, existing);
  }

  return Array.from(byCategory.values())
    .map((item) => ({
      contextualCategorySlug: item.contextualCategorySlug,
      contextualCategoryName: item.contextualCategoryName,
      contextualCategoryStatus: item.contextualCategoryStatus,
      contextualCategoryIsActive: item.contextualCategoryIsActive,
      valueObjectsCount: item.valueObjectsCount,
      totalUsageCount: item.totalUsageCount,
      totalExposureMinutes: item.totalExposureMinutes,
      lastUsedAt: item.lastUsedAt,
    }))
    .sort((a, b) =>
      (a.contextualCategorySlug ?? "").localeCompare(b.contextualCategorySlug ?? "")
    );
}

function buildLatestObjects(rows: CloudProfileRow[]): LatestObjectItem[] {
  return [...rows]
    .sort((a, b) => {
      const left = a.last_used_at ?? "";
      const right = b.last_used_at ?? "";

      return right.localeCompare(left);
    })
    .slice(0, 10)
    .map((row) => ({
      userId: row.user_id,
      valueObjectId: row.value_object_id,
      categorySlug: row.contextual_category_slug,
      categoryName: row.contextual_category_name,
      usageCount: Math.trunc(numericValue(row.usage_count)),
      totalExposureMinutes: numericValue(row.total_exposure_minutes),
      lastUsedAt: row.last_used_at,
      latestEventId: row.latest_event_id,
      latestEventTitle: row.latest_event_title,
      latestActivityTemplateSlug: row.latest_activity_template_slug,
      latestExposureMinutes: row.latest_exposure_minutes,
    }));
}

export async function GET(request: Request) {
  const endpoint = "/api/value-objects/debug/cloud-profile";

  try {
    const userContext = await getCurrentUserContext();

    if (userContext.errorResponse) {
      return userContext.errorResponse;
    }

    const url = new URL(request.url);
    const categorySlug = normalizeOptionalString(
      url.searchParams.get("categorySlug")
    );
    const valueObjectId = normalizeOptionalString(
      url.searchParams.get("valueObjectId")
    );
    const limit = normalizeLimit(url.searchParams.get("limit"));

    if (valueObjectId && !isUuid(valueObjectId)) {
      return NextResponse.json(
        {
          ok: false,
          endpoint,
          error: "Invalid valueObjectId. Expected UUID.",
        },
        { status: 400 }
      );
    }

    let query = supabase
      .from("value_object_cloud_profiles_v1")
      .select(
        [
          "user_id",
          "value_object_id",
          "category_table",
          "category_id",
          "category_role",
          "contextual_category_slug",
          "contextual_category_name",
          "contextual_category_status",
          "contextual_category_is_active",
          "category_link_source",
          "category_link_confidence",
          "category_link_created_at",
          "category_link_updated_at",
          "usage_aggregate_id",
          "usage_count",
          "total_exposure_minutes",
          "first_used_at",
          "last_used_at",
          "last_event_id",
          "usage_source",
          "usage_created_at",
          "usage_updated_at",
          "latest_event_value_object_link_id",
          "latest_event_id",
          "latest_event_title",
          "latest_event_status",
          "latest_event_duration_minutes",
          "latest_exposure_minutes",
          "latest_activity_template_slug",
          "latest_activity_template_title",
          "snapshots",
          "daily_aggregates",
        ].join(", ")
      )
      .eq("user_id", userContext.appUser.id)
      .order("last_used_at", { ascending: false })
      .limit(limit);

    if (categorySlug) {
      query = query.eq("contextual_category_slug", categorySlug);
    }

    if (valueObjectId) {
      query = query.eq("value_object_id", valueObjectId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          endpoint,
          error: error.message,
        },
        { status: 500 }
      );
    }

    const rows = ((data ?? []) as unknown) as CloudProfileRow[];

    const profiles = rows.map((row) => ({
      userId: row.user_id,
      valueObjectId: row.value_object_id,
      category: {
        table: row.category_table,
        id: row.category_id,
        role: row.category_role,
        slug: row.contextual_category_slug,
        name: row.contextual_category_name,
        status: row.contextual_category_status,
        isActive: row.contextual_category_is_active,
        linkSource: row.category_link_source,
        linkConfidence: row.category_link_confidence,
        linkCreatedAt: row.category_link_created_at,
        linkUpdatedAt: row.category_link_updated_at,
      },
      usage: {
        aggregateId: row.usage_aggregate_id,
        count: Math.trunc(numericValue(row.usage_count)),
        totalExposureMinutes: numericValue(row.total_exposure_minutes),
        firstUsedAt: row.first_used_at,
        lastUsedAt: row.last_used_at,
        lastEventId: row.last_event_id,
        source: row.usage_source,
        createdAt: row.usage_created_at,
        updatedAt: row.usage_updated_at,
      },
      latestExposure: {
        eventValueObjectLinkId: row.latest_event_value_object_link_id,
        eventId: row.latest_event_id,
        eventTitle: row.latest_event_title,
        eventStatus: row.latest_event_status,
        eventDurationMinutes: row.latest_event_duration_minutes,
        exposureMinutes: row.latest_exposure_minutes,
        activityTemplateSlug: row.latest_activity_template_slug,
        activityTemplateTitle: row.latest_activity_template_title,
      },
      snapshots: row.snapshots ?? [],
      dailyAggregates: row.daily_aggregates ?? [],
    }));

    return NextResponse.json({
      ok: true,
      endpoint,
      mode: "read_only_debug",
      source: "public.value_object_cloud_profiles_v1",
      filters: {
        userId: userContext.appUser.id,
        categorySlug,
        valueObjectId,
        limit,
      },
      counts: {
        profiles: profiles.length,
        categorySummary: buildCategorySummary(rows).length,
        latestObjects: buildLatestObjects(rows).length,
      },
      categorySummary: buildCategorySummary(rows),
      latestObjects: buildLatestObjects(rows),
      profiles,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


