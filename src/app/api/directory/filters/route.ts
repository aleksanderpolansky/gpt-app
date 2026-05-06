import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type OrganizationRow = {
  id: string;
};

type BusinessCategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number | null;
};

type OrganizationCategoryRow = {
  organization_id: string;
  business_categories: BusinessCategoryRow | BusinessCategoryRow[] | null;
};

type OrganizationLocationRow = {
  organization_id: string;
  country_code: string | null;
  city: string | null;
  district: string | null;
};

type DirectoryFilterCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

type DirectoryFilterCity = {
  city: string;
  countryCode: string;
  label: string;
};

type DirectoryFilterDistrict = {
  city: string;
  district: string;
  countryCode: string;
  label: string;
};

function normalizeTextValue(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function buildCityKey(countryCode: string, city: string) {
  return `${countryCode.toUpperCase()}::${city.toLowerCase()}`;
}

function buildDistrictKey(countryCode: string, city: string, district: string) {
  return `${countryCode.toUpperCase()}::${city.toLowerCase()}::${district.toLowerCase()}`;
}

function compareByLabel<T extends { label: string }>(left: T, right: T) {
  return left.label.localeCompare(right.label, "en", {
    sensitivity: "base",
  });
}

function compareCategories(
  left: DirectoryFilterCategory,
  right: DirectoryFilterCategory
) {
  return left.name.localeCompare(right.name, "en", {
    sensitivity: "base",
  });
}

function getJoinedCategory(
  value: BusinessCategoryRow | BusinessCategoryRow[] | null
) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function mapCategories(
  rows: OrganizationCategoryRow[]
): DirectoryFilterCategory[] {
  const categoryMap = new Map<string, DirectoryFilterCategory>();

  for (const row of rows) {
    const category = getJoinedCategory(row.business_categories);

    if (!category?.id || !category.slug || !category.name) {
      continue;
    }

    if (!categoryMap.has(category.id)) {
      categoryMap.set(category.id, {
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
      });
    }
  }

  return Array.from(categoryMap.values()).sort(compareCategories);
}

function mapCities(rows: OrganizationLocationRow[]): DirectoryFilterCity[] {
  const cityMap = new Map<string, DirectoryFilterCity>();

  for (const row of rows) {
    const countryCode = normalizeTextValue(row.country_code).toUpperCase();
    const city = normalizeTextValue(row.city);

    if (!countryCode || !city) {
      continue;
    }

    const key = buildCityKey(countryCode, city);

    if (!cityMap.has(key)) {
      cityMap.set(key, {
        city,
        countryCode,
        label: `${city}, ${countryCode}`,
      });
    }
  }

  return Array.from(cityMap.values()).sort(compareByLabel);
}

function mapDistricts(
  rows: OrganizationLocationRow[]
): DirectoryFilterDistrict[] {
  const districtMap = new Map<string, DirectoryFilterDistrict>();

  for (const row of rows) {
    const countryCode = normalizeTextValue(row.country_code).toUpperCase();
    const city = normalizeTextValue(row.city);
    const district = normalizeTextValue(row.district);

    if (!countryCode || !city || !district) {
      continue;
    }

    const key = buildDistrictKey(countryCode, city, district);

    if (!districtMap.has(key)) {
      districtMap.set(key, {
        city,
        district,
        countryCode,
        label: district,
      });
    }
  }

  return Array.from(districtMap.values()).sort(compareByLabel);
}

export async function GET() {
  try {
    const organizationsResult = await supabase
      .from("organizations")
      .select("id")
      .eq("directory_status", "published")
      .eq("status", "active")
      .limit(1000);

    if (organizationsResult.error) {
      return NextResponse.json(
        {
          ok: false,
          error: organizationsResult.error.message,
        },
        { status: 500 }
      );
    }

    const organizationRows =
      (organizationsResult.data ?? []) as OrganizationRow[];

    const organizationIds = organizationRows.map(
      (organization) => organization.id
    );

    if (organizationIds.length === 0) {
      return NextResponse.json({
        ok: true,
        categories: [],
        cities: [],
        districts: [],
        counts: {
          organizations: 0,
          categories: 0,
          cities: 0,
          districts: 0,
        },
      });
    }

    const [categoriesResult, locationsResult] = await Promise.all([
      supabase
        .from("organization_categories")
        .select(
          `
          organization_id,
          business_categories (
            id,
            slug,
            name,
            description,
            sort_order
          )
        `
        )
        .in("organization_id", organizationIds),

      supabase
        .from("organization_locations")
        .select("organization_id, country_code, city, district")
        .in("organization_id", organizationIds)
        .eq("is_active", true),
    ]);

    if (categoriesResult.error) {
      return NextResponse.json(
        {
          ok: false,
          error: categoriesResult.error.message,
        },
        { status: 500 }
      );
    }

    if (locationsResult.error) {
      return NextResponse.json(
        {
          ok: false,
          error: locationsResult.error.message,
        },
        { status: 500 }
      );
    }

    const categories = mapCategories(
      (categoriesResult.data ?? []) as OrganizationCategoryRow[]
    );

    const cities = mapCities(
      (locationsResult.data ?? []) as OrganizationLocationRow[]
    );

    const districts = mapDistricts(
      (locationsResult.data ?? []) as OrganizationLocationRow[]
    );

    return NextResponse.json({
      ok: true,
      categories,
      cities,
      districts,
      counts: {
        organizations: organizationIds.length,
        categories: categories.length,
        cities: cities.length,
        districts: districts.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown directory filters error",
      },
      { status: 500 }
    );
  }
}