import { NextResponse } from "next/server";
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
  const parsedValue = Number(value);

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

function mapGeoArea(row: GeoAreaRow): GeoAreaResponseItem {
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
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const areaTypeParam = url.searchParams.get("areaType");
    const countryCodeParam = url.searchParams.get("countryCode");
    const parentIdParam = url.searchParams.get("parentId");
    const statusParam = url.searchParams.get("status");
    const includeInactiveParam = url.searchParams.get("includeInactive");
    const limitParam = url.searchParams.get("limit");

    const areaType = normalizeAreaType(areaTypeParam);
    const countryCode = normalizeCountryCode(countryCodeParam);
    const parentId = normalizeUuid(parentIdParam);
    const status = normalizeStatus(statusParam) ?? "approved";
    const includeInactive = includeInactiveParam === "true";
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
          error: "Invalid countryCode. Use 2-letter country code, for example PL, ES, DE",
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

    if (statusParam && !normalizeStatus(statusParam)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid status. Allowed values: approved, suggested, needs_review, rejected",
        },
        { status: 400 }
      );
    }

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
        created_at,
        updated_at
      `
      )
      .eq("status", status)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .limit(limit);

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    if (areaType) {
      query = query.eq("area_type", areaType);
    }

    if (countryCode) {
      query = query.eq("country_code", countryCode);
    }

    if (parentId) {
      query = query.eq("parent_id", parentId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    const areas = ((data ?? []) as GeoAreaRow[]).map(mapGeoArea);

    return NextResponse.json({
      ok: true,
      areas,
      count: areas.length,
      filters: {
        areaType,
        countryCode,
        parentId,
        status,
        includeInactive,
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