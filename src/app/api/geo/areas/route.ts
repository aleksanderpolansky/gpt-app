import { NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type GeoAreaType =
  | "country"
  | "region"
  | "city"
  | "district"
  | "neighborhood"
  | "custom_zone";

type GeoAreaStatus = "approved" | "suggested" | "needs_review" | "rejected";

type GeoAreaRow = {
  id: string;
  parent_id: string | null;
  area_type: GeoAreaType;
  country_code: string | null;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  sort_order: number;
  is_active: boolean;
  status: GeoAreaStatus;
  source: string;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type GeoAreaResponseItem = {
  id: string;
  parentId: string | null;
  areaType: GeoAreaType;
  countryCode: string | null;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  sortOrder: number;
  status: GeoAreaStatus;
  source: string;
  isOwnSuggestion: boolean;
};

type AppUser = {
  id: string;
  auth0_sub: string;
};

const ALLOWED_AREA_TYPES: GeoAreaType[] = [
  "country",
  "region",
  "city",
  "district",
  "neighborhood",
  "custom_zone",
];

const ALLOWED_STATUSES: GeoAreaStatus[] = [
  "approved",
  "suggested",
  "needs_review",
  "rejected",
];

function parseOptionalText(value: string | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return null;
  }

  return trimmedValue;
}

function normalizeAreaType(value: string | null): GeoAreaType | null {
  const normalizedValue = parseOptionalText(value);

  if (!normalizedValue) {
    return null;
  }

  if (ALLOWED_AREA_TYPES.includes(normalizedValue as GeoAreaType)) {
    return normalizedValue as GeoAreaType;
  }

  return null;
}

function normalizeStatus(value: string | null): GeoAreaStatus | null {
  const normalizedValue = parseOptionalText(value);

  if (!normalizedValue) {
    return null;
  }

  if (ALLOWED_STATUSES.includes(normalizedValue as GeoAreaStatus)) {
    return normalizedValue as GeoAreaStatus;
  }

  return null;
}

function normalizeCountryCode(value: string | null) {
  const normalizedValue = parseOptionalText(value);

  if (!normalizedValue) {
    return null;
  }

  const upperValue = normalizedValue.toUpperCase();

  if (!/^[A-Z]{2}$/.test(upperValue)) {
    return null;
  }

  return upperValue;
}

function normalizeUuid(value: string | null) {
  const normalizedValue = parseOptionalText(value);

  if (!normalizedValue) {
    return null;
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

function parseLimit(value: string | null) {
  const normalizedValue = parseOptionalText(value);

  if (!normalizedValue) {
    return 100;
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isInteger(parsedValue)) {
    return 100;
  }

  if (parsedValue < 1) {
    return 1;
  }

  if (parsedValue > 500) {
    return 500;
  }

  return parsedValue;
}

async function getOptionalCurrentAppUser(): Promise<AppUser | null> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return null;
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("id, auth0_sub")
    .eq("auth0_sub", session.user.sub)
    .maybeSingle();

  if (appUserError || !appUser) {
    return null;
  }

  return appUser as AppUser;
}

function mapGeoArea(
  row: GeoAreaRow,
  appUser: AppUser | null
): GeoAreaResponseItem {
  const isOwnSuggestion = Boolean(
    appUser &&
      row.created_by_user_id === appUser.id &&
      (row.status === "suggested" || row.status === "needs_review")
  );

  return {
    id: row.id,
    parentId: row.parent_id,
    areaType: row.area_type,
    countryCode: row.country_code,
    name: row.name,
    slug: row.slug,
    latitude: row.latitude,
    longitude: row.longitude,
    sortOrder: row.sort_order,
    status: row.status,
    source: row.source,
    isOwnSuggestion,
  };
}

function sortGeoAreas(areas: GeoAreaResponseItem[]) {
  return areas.sort((firstArea, secondArea) => {
    if (firstArea.sortOrder !== secondArea.sortOrder) {
      return firstArea.sortOrder - secondArea.sortOrder;
    }

    return firstArea.name.localeCompare(secondArea.name);
  });
}

function deduplicateGeoAreas(areas: GeoAreaResponseItem[]) {
  const map = new Map<string, GeoAreaResponseItem>();

  for (const area of areas) {
    if (!map.has(area.id)) {
      map.set(area.id, area);
    }
  }

  return Array.from(map.values());
}

async function loadApprovedAreas(input: {
  areaType: GeoAreaType | null;
  countryCode: string | null;
  parentId: string | null;
  includeInactive: boolean;
  limit: number;
}) {
  let query = supabase
    .from("geo_areas")
    .select(
      `
      id,
      parent_id,
      area_type,
      country_code,
      name,
      slug,
      latitude,
      longitude,
      sort_order,
      is_active,
      status,
      source,
      created_by_user_id,
      created_at,
      updated_at
    `
    )
    .eq("status", "approved")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(input.limit);

  if (!input.includeInactive) {
    query = query.eq("is_active", true);
  }

  if (input.areaType) {
    query = query.eq("area_type", input.areaType);
  }

  if (input.countryCode) {
    query = query.eq("country_code", input.countryCode);
  }

  if (input.parentId) {
    query = query.eq("parent_id", input.parentId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as GeoAreaRow[];
}

async function loadAreasByStatus(input: {
  areaType: GeoAreaType | null;
  countryCode: string | null;
  parentId: string | null;
  status: GeoAreaStatus;
  includeInactive: boolean;
  limit: number;
}) {
  let query = supabase
    .from("geo_areas")
    .select(
      `
      id,
      parent_id,
      area_type,
      country_code,
      name,
      slug,
      latitude,
      longitude,
      sort_order,
      is_active,
      status,
      source,
      created_by_user_id,
      created_at,
      updated_at
    `
    )
    .eq("status", input.status)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(input.limit);

  if (!input.includeInactive) {
    query = query.eq("is_active", true);
  }

  if (input.areaType) {
    query = query.eq("area_type", input.areaType);
  }

  if (input.countryCode) {
    query = query.eq("country_code", input.countryCode);
  }

  if (input.parentId) {
    query = query.eq("parent_id", input.parentId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as GeoAreaRow[];
}

async function loadOwnSuggestedAreas(input: {
  areaType: GeoAreaType | null;
  countryCode: string | null;
  parentId: string | null;
  appUser: AppUser;
  includeInactive: boolean;
  limit: number;
}) {
  let query = supabase
    .from("geo_areas")
    .select(
      `
      id,
      parent_id,
      area_type,
      country_code,
      name,
      slug,
      latitude,
      longitude,
      sort_order,
      is_active,
      status,
      source,
      created_by_user_id,
      created_at,
      updated_at
    `
    )
    .eq("created_by_user_id", input.appUser.id)
    .eq("source", "user_suggestion")
    .in("status", ["suggested", "needs_review"])
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(input.limit);

  if (!input.includeInactive) {
    query = query.eq("is_active", true);
  }

  if (input.areaType) {
    query = query.eq("area_type", input.areaType);
  }

  if (input.countryCode) {
    query = query.eq("country_code", input.countryCode);
  }

  if (input.parentId) {
    query = query.eq("parent_id", input.parentId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as GeoAreaRow[];
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const areaTypeParam = url.searchParams.get("areaType");
    const countryCodeParam = url.searchParams.get("countryCode");
    const parentIdParam = url.searchParams.get("parentId");
    const statusParam = url.searchParams.get("status");
    const includeInactiveParam = url.searchParams.get("includeInactive");
    const includeOwnSuggestionsParam = url.searchParams.get(
      "includeOwnSuggestions"
    );
    const limitParam = url.searchParams.get("limit");

    const areaType = normalizeAreaType(areaTypeParam);
    const countryCode = normalizeCountryCode(countryCodeParam);
    const parentId = normalizeUuid(parentIdParam);
    const status = normalizeStatus(statusParam);
    const includeInactive = includeInactiveParam === "true";
    const includeOwnSuggestions = includeOwnSuggestionsParam === "true";
    const limit = parseLimit(limitParam);

    if (areaTypeParam && !areaType) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid areaType. Allowed values: country, region, city, district, neighborhood, custom_zone",
        },
        { status: 400 }
      );
    }

    if (countryCodeParam && !countryCode) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid countryCode. Use 2-letter country code, for example PL, ES, DE",
        },
        { status: 400 }
      );
    }

    if (parentIdParam && !parentId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid parentId UUID",
        },
        { status: 400 }
      );
    }

    if (statusParam && !status) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid status. Allowed values: approved, suggested, needs_review, rejected",
        },
        { status: 400 }
      );
    }

    const appUser = includeOwnSuggestions
      ? await getOptionalCurrentAppUser()
      : null;

    let rows: GeoAreaRow[] = [];

    if (status) {
      rows = await loadAreasByStatus({
        areaType,
        countryCode,
        parentId,
        status,
        includeInactive,
        limit,
      });
    } else {
      rows = await loadApprovedAreas({
        areaType,
        countryCode,
        parentId,
        includeInactive,
        limit,
      });
    }

    if (includeOwnSuggestions && appUser && (!status || status === "approved")) {
      const ownSuggestedRows = await loadOwnSuggestedAreas({
        areaType,
        countryCode,
        parentId,
        appUser,
        includeInactive,
        limit,
      });

      rows = [...rows, ...ownSuggestedRows];
    }

    const areas = sortGeoAreas(
      deduplicateGeoAreas(rows.map((row) => mapGeoArea(row, appUser)))
    ).slice(0, limit);

    return NextResponse.json({
      ok: true,
      areas,
      count: areas.length,
      filters: {
        areaType,
        countryCode,
        parentId,
        status: status ?? "approved_plus_own_suggestions_if_requested",
        includeInactive,
        includeOwnSuggestions,
        limit,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown geo areas lookup error",
      },
      { status: 500 }
    );
  }
}