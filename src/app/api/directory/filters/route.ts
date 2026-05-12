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

type DirectoryEntityClassificationRow = {
  contextual_category_id: string | null;
};

type RubricatorCategoryRow = {
  category_id: string;
  context_id: string;
  context_code: string;
  parent_id: string | null;
  parent_slug: string | null;
  category_slug: string;
  default_name: string;
  default_description: string | null;
  display_name: string;
  display_description: string | null;
  locale_used: string;
  status: string;
  source_type: string;
  sort_order: number;
};

type DirectoryFilterCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

type DirectoryFilterCategoryWithSort = DirectoryFilterCategory & {
  sortOrder: number;
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

const PUBLIC_RUBRICATOR_CATEGORY_STATUSES = new Set([
  "approved",
  "published",
]);

const PUBLIC_OBJECT_ACTION_STATUSES = ["approved", "published"];

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

function compareCategoriesWithSort(
  left: DirectoryFilterCategoryWithSort,
  right: DirectoryFilterCategoryWithSort
) {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  return compareCategories(left, right);
}

function getJoinedCategory(
  value: BusinessCategoryRow | BusinessCategoryRow[] | null
) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function isPublicRubricatorCategory(row: RubricatorCategoryRow) {
  return PUBLIC_RUBRICATOR_CATEGORY_STATUSES.has(
    normalizeTextValue(row.status).toLowerCase()
  );
}

function getLegacyCategoryMap(rows: OrganizationCategoryRow[]) {
  const categoryMap = new Map<string, BusinessCategoryRow>();

  for (const row of rows) {
    const category = getJoinedCategory(row.business_categories);

    if (!category?.id || !category.slug || !category.name) {
      continue;
    }

    const slug = category.slug.trim();

    if (!slug) {
      continue;
    }

    if (!categoryMap.has(slug)) {
      categoryMap.set(slug, category);
    }
  }

  return categoryMap;
}

function mapLegacyCategories(
  rows: OrganizationCategoryRow[]
): DirectoryFilterCategory[] {
  const categoryMap = getLegacyCategoryMap(rows);

  return Array.from(categoryMap.values())
    .map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
    }))
    .sort(compareCategories);
}

function getObjectActionCategoryIdSet(rows: DirectoryEntityClassificationRow[]) {
  return new Set(
    rows
      .map((row) => row.contextual_category_id)
      .filter((value): value is string => Boolean(value))
  );
}

function mapCategoriesFromRubricator(input: {
  legacyRows: OrganizationCategoryRow[];
  rubricatorRows: RubricatorCategoryRow[];
  objectActionCategoryIds: Set<string>;
}): DirectoryFilterCategory[] {
  const legacyCategoryBySlug = getLegacyCategoryMap(input.legacyRows);
  const mappedCategoryBySlug = new Map<string, DirectoryFilterCategoryWithSort>();

  for (const rubricatorCategory of input.rubricatorRows) {
    if (!isPublicRubricatorCategory(rubricatorCategory)) {
      continue;
    }

    const slug = normalizeTextValue(rubricatorCategory.category_slug);

    if (!slug) {
      continue;
    }

    const legacyCategory = legacyCategoryBySlug.get(slug);
    const isUsedByObjectAction = input.objectActionCategoryIds.has(
      rubricatorCategory.category_id
    );
    const isUsedByLegacy = Boolean(legacyCategory);

    if (!isUsedByObjectAction && !isUsedByLegacy) {
      continue;
    }

    mappedCategoryBySlug.set(slug, {
      id: rubricatorCategory.category_id,
      slug,
      name:
        normalizeTextValue(rubricatorCategory.display_name) ||
        normalizeTextValue(rubricatorCategory.default_name) ||
        legacyCategory?.name ||
        slug,
      description:
        rubricatorCategory.display_description ??
        rubricatorCategory.default_description ??
        legacyCategory?.description ??
        null,
      sortOrder:
        typeof rubricatorCategory.sort_order === "number"
          ? rubricatorCategory.sort_order
          : legacyCategory?.sort_order ?? 999,
    });
  }

  for (const legacyCategory of legacyCategoryBySlug.values()) {
    if (mappedCategoryBySlug.has(legacyCategory.slug)) {
      continue;
    }

    mappedCategoryBySlug.set(legacyCategory.slug, {
      id: legacyCategory.id,
      slug: legacyCategory.slug,
      name: legacyCategory.name,
      description: legacyCategory.description,
      sortOrder: legacyCategory.sort_order ?? 999,
    });
  }

  return Array.from(mappedCategoryBySlug.values())
    .sort(compareCategoriesWithSort)
    .map(({ sortOrder: _sortOrder, ...category }) => category);
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

    const [
      categoriesResult,
      locationsResult,
      rubricatorCategoriesResult,
      classificationsResult,
    ] = await Promise.all([
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

        supabase.rpc("get_contextual_categories", {
          p_context_code: "business_directory",
          p_language_code: "ru",
        }),

        supabase
          .from("entity_classifications")
          .select("contextual_category_id")
          .eq("entity_type", "organization")
          .in("entity_id", organizationIds)
          .in("status", PUBLIC_OBJECT_ACTION_STATUSES)
          .not("contextual_category_id", "is", null),
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

    const categoryRows =
      (categoriesResult.data ?? []) as OrganizationCategoryRow[];
    const classificationRows = classificationsResult.error
      ? []
      : ((classificationsResult.data ?? []) as DirectoryEntityClassificationRow[]);

    const objectActionCategoryIds =
      getObjectActionCategoryIdSet(classificationRows);

    const categories = rubricatorCategoriesResult.error
      ? mapLegacyCategories(categoryRows)
      : mapCategoriesFromRubricator({
          legacyRows: categoryRows,
          rubricatorRows:
            (rubricatorCategoriesResult.data ?? []) as RubricatorCategoryRow[],
          objectActionCategoryIds,
        });

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
