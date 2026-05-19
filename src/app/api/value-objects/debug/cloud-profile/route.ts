import { NextResponse } from "next/server";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";
import { getValueObjectCloudDebugAccess } from "../../../../../../lib/value-objects/objectCloudDebugGuard";

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

type HierarchyProfileRow = {
  user_id: string;
  value_object_id: string;
  parent_value_object_id: string | null;
  parent_exists: boolean | null;
  hierarchy_role: string | null;
  is_root: boolean | null;
  is_child: boolean | null;
  children_count: number | null;
  has_children: boolean | null;
  contextual_category_slug: string | null;
  contextual_category_name: string | null;
  category_role: string | null;
  usage_count: number | null;
  total_exposure_minutes: number | null;
  latest_event_id?: string | null;
  latest_event_title?: string | null;
  latest_activity_template_slug: string | null;
  needs_user_review: boolean | null;
  ui_visibility: string | null;
};

type ValueObjectRow = {
  id: string;
  title: string | null;
  value_type: string | null;
  status: string | null;
  commercial_usage: string | null;
  parent_value_object_id: string | null;
  created_at: string | null;
  updated_at: string | null;
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

function toNumber(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return value;
}

function compareNullableDateDesc(a: string | null, b: string | null): number {
  if (!a && !b) {
    return 0;
  }

  if (!a) {
    return 1;
  }

  if (!b) {
    return -1;
  }

  return new Date(b).getTime() - new Date(a).getTime();
}

function buildCategorySummary(rows: CloudProfileRow[]): CategorySummaryItem[] {
  const summaryMap = new Map<string, CategorySummaryItem>();

  for (const row of rows) {
    const key = row.contextual_category_slug ?? "__uncategorized__";
    const existing = summaryMap.get(key);

    if (!existing) {
      summaryMap.set(key, {
        contextualCategorySlug: row.contextual_category_slug,
        contextualCategoryName: row.contextual_category_name,
        contextualCategoryStatus: row.contextual_category_status,
        contextualCategoryIsActive: row.contextual_category_is_active,
        valueObjectsCount: 1,
        totalUsageCount: toNumber(row.usage_count),
        totalExposureMinutes: toNumber(row.total_exposure_minutes),
        lastUsedAt: row.last_used_at,
      });

      continue;
    }

    existing.valueObjectsCount += 1;
    existing.totalUsageCount += toNumber(row.usage_count);
    existing.totalExposureMinutes += toNumber(row.total_exposure_minutes);

    if (compareNullableDateDesc(row.last_used_at, existing.lastUsedAt) < 0) {
      existing.lastUsedAt = row.last_used_at;
    }
  }

  return Array.from(summaryMap.values()).sort((a, b) => {
    if (b.totalExposureMinutes !== a.totalExposureMinutes) {
      return b.totalExposureMinutes - a.totalExposureMinutes;
    }

    return b.totalUsageCount - a.totalUsageCount;
  });
}

function buildLatestObjects(rows: CloudProfileRow[]): LatestObjectItem[] {
  return [...rows]
    .sort((a, b) => compareNullableDateDesc(a.last_used_at, b.last_used_at))
    .map((row) => ({
      userId: row.user_id,
      valueObjectId: row.value_object_id,
      categorySlug: row.contextual_category_slug,
      categoryName: row.contextual_category_name,
      usageCount: toNumber(row.usage_count),
      totalExposureMinutes: toNumber(row.total_exposure_minutes),
      lastUsedAt: row.last_used_at,
      latestEventId: row.latest_event_id,
      latestEventTitle: row.latest_event_title,
      latestActivityTemplateSlug: row.latest_activity_template_slug,
      latestExposureMinutes: row.latest_exposure_minutes,
    }));
}

function buildValueObjectMap(rows: ValueObjectRow[]): Map<string, ValueObjectRow> {
  const map = new Map<string, ValueObjectRow>();

  for (const row of rows) {
    map.set(row.id, row);
  }

  return map;
}

function buildHierarchySummary(rows: HierarchyProfileRow[]) {
  return {
    totalRows: rows.length,
    rootRows: rows.filter((row) => row.hierarchy_role === "root").length,
    childRows: rows.filter((row) => row.hierarchy_role === "child").length,
    rowsWithParent: rows.filter((row) => row.parent_value_object_id !== null)
      .length,
    rowsWithParentExists: rows.filter((row) => row.parent_exists === true)
      .length,
    rowsWithChildren: rows.filter((row) => toNumber(row.children_count) > 0)
      .length,
  };
}

async function getCurrentUserContext(): Promise<CurrentUserContext> {
  const session = await auth0.getSession();
  const auth0Sub =
    typeof session?.user?.sub === "string" ? session.user.sub : null;

  if (!auth0Sub) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          endpoint: "/api/value-objects/debug/cloud-profile",
          error: "Unauthorized",
        },
        { status: 401 }
      ),
    };
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("id, auth0_sub")
    .eq("auth0_sub", auth0Sub)
    .maybeSingle();

  if (error) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          endpoint: "/api/value-objects/debug/cloud-profile",
          error: error.message,
        },
        { status: 500 }
      ),
    };
  }

  if (!data) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          endpoint: "/api/value-objects/debug/cloud-profile",
          error: "App user not found for current Auth0 session.",
        },
        { status: 404 }
      ),
    };
  }

  return {
    appUser: data as AppUserRow,
    errorResponse: null,
  };
}

export async function GET(request: Request) {
  const endpoint = "/api/value-objects/debug/cloud-profile";
  const debugAccess = getValueObjectCloudDebugAccess();

  if (!debugAccess.allowed) {
    return NextResponse.json(
      {
        ok: false,
        endpoint,
        error: "Value Object cloud debug endpoint is disabled.",
        debugAccess,
      },
      { status: 403 }
    );
  }

  try {
    const userContext = await getCurrentUserContext();

    if (userContext.errorResponse) {
      return userContext.errorResponse;
    }

    const url = new URL(request.url);
    const categorySlug = normalizeOptionalString(
      url.searchParams.get("categorySlug")
    );
    const rawValueObjectId = normalizeOptionalString(
      url.searchParams.get("valueObjectId")
    );
    const limit = normalizeLimit(url.searchParams.get("limit"));

    if (rawValueObjectId && !isUuid(rawValueObjectId)) {
      return NextResponse.json(
        {
          ok: false,
          endpoint,
          error: "valueObjectId must be a valid UUID.",
        },
        { status: 400 }
      );
    }

    const valueObjectId = rawValueObjectId;

    let cloudQuery = supabase
      .from("value_object_cloud_profiles_v1")
      .select("*")
      .eq("user_id", userContext.appUser.id);

    if (categorySlug) {
      cloudQuery = cloudQuery.eq("contextual_category_slug", categorySlug);
    }

    if (valueObjectId) {
      cloudQuery = cloudQuery.eq("value_object_id", valueObjectId);
    }

    const { data: cloudData, error: cloudError } = await cloudQuery
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (cloudError) {
      return NextResponse.json(
        {
          ok: false,
          endpoint,
          error: cloudError.message,
        },
        { status: 500 }
      );
    }

    let hierarchyQuery = supabase
      .from("value_object_hierarchy_profiles_v1")
      .select("*")
      .eq("user_id", userContext.appUser.id);

    if (categorySlug) {
      hierarchyQuery = hierarchyQuery.eq("contextual_category_slug", categorySlug);
    }

    if (valueObjectId) {
      hierarchyQuery = hierarchyQuery.eq("value_object_id", valueObjectId);
    }

    const { data: hierarchyData, error: hierarchyError } = await hierarchyQuery
      .order("contextual_category_slug", { ascending: true })
      .limit(limit);

    if (hierarchyError) {
      return NextResponse.json(
        {
          ok: false,
          endpoint,
          error: hierarchyError.message,
        },
        { status: 500 }
      );
    }

    const rows = (cloudData ?? []) as unknown as CloudProfileRow[];
    const hierarchyRows = (hierarchyData ??
      []) as unknown as HierarchyProfileRow[];

    const valueObjectIdsToLoad = Array.from(
      new Set(
        hierarchyRows
          .flatMap((row) => [row.value_object_id, row.parent_value_object_id])
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      )
    );

    let valueObjectRows: ValueObjectRow[] = [];

    if (valueObjectIdsToLoad.length > 0) {
      const { data: valueObjectsData, error: valueObjectsError } =
        await supabase
          .from("value_objects")
          .select(
            "id, title, value_type, status, commercial_usage, parent_value_object_id, created_at, updated_at"
          )
          .in("id", valueObjectIdsToLoad);

      if (valueObjectsError) {
        return NextResponse.json(
          {
            ok: false,
            endpoint,
            error: valueObjectsError.message,
          },
          { status: 500 }
        );
      }

      valueObjectRows = (valueObjectsData ?? []) as unknown as ValueObjectRow[];
    }

    const valueObjectMap = buildValueObjectMap(valueObjectRows);

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
        count: toNumber(row.usage_count),
        totalExposureMinutes: toNumber(row.total_exposure_minutes),
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

    const hierarchyProfiles = hierarchyRows.map((row) => {
      const valueObject = valueObjectMap.get(row.value_object_id) ?? null;
      const parent =
        row.parent_value_object_id !== null
          ? valueObjectMap.get(row.parent_value_object_id) ?? null
          : null;

      return {
        userId: row.user_id,
        valueObjectId: row.value_object_id,
        valueObject: valueObject
          ? {
              id: valueObject.id,
              title: valueObject.title,
              valueType: valueObject.value_type,
              status: valueObject.status,
              commercialUsage: valueObject.commercial_usage,
              parentValueObjectId: valueObject.parent_value_object_id,
              createdAt: valueObject.created_at,
              updatedAt: valueObject.updated_at,
            }
          : null,
        parentValueObjectId: row.parent_value_object_id,
        parentExists: row.parent_exists,
        parent: parent
          ? {
              id: parent.id,
              title: parent.title,
              valueType: parent.value_type,
              status: parent.status,
              commercialUsage: parent.commercial_usage,
              parentValueObjectId: parent.parent_value_object_id,
              createdAt: parent.created_at,
              updatedAt: parent.updated_at,
            }
          : null,
        hierarchyRole: row.hierarchy_role,
        isRoot: row.is_root,
        isChild: row.is_child,
        childrenCount: toNumber(row.children_count),
        hasChildren: row.has_children,
        category: {
          slug: row.contextual_category_slug,
          name: row.contextual_category_name,
          role: row.category_role,
        },
        usage: {
          count: toNumber(row.usage_count),
          totalExposureMinutes: toNumber(row.total_exposure_minutes),
        },
        latest: {
          eventId: row.latest_event_id ?? null,
          eventTitle: row.latest_event_title ?? null,
          activityTemplateSlug: row.latest_activity_template_slug,
        },
        uiVisibility: row.ui_visibility,
        needsUserReview: row.needs_user_review,
      };
    });

    const categorySummary = buildCategorySummary(rows);
    const latestObjects = buildLatestObjects(rows);
    const hierarchySummary = buildHierarchySummary(hierarchyRows);

    return NextResponse.json({
      ok: true,
      endpoint,
      mode: "read_only_debug",
      source:
        "public.value_object_cloud_profiles_v1 + public.value_object_hierarchy_profiles_v1",
      filters: {
        userId: userContext.appUser.id,
        categorySlug,
        valueObjectId,
        limit,
      },
      counts: {
        profiles: profiles.length,
        categorySummary: categorySummary.length,
        latestObjects: latestObjects.length,
        hierarchyProfiles: hierarchyProfiles.length,
      },
      categorySummary,
      latestObjects,
      profiles,
      hierarchySummary,
      hierarchyProfiles,
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
