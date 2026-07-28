import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../lib/actor-context";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

const SOURCE_ROW_LIMIT = 5000;
const DEFAULT_RESULT_LIMIT = 60;
const MAX_RESULT_LIMIT = 120;
const MAX_PINNED_IDS = 80;

type SelectorLevel = "all" | "root" | "intermediate" | "leaf";

type JsonRecord = Record<string, unknown>;

type ValueObjectRow = {
  id: string;
  title: string | null;
  node_role_code: string | null;
  branch_type_code: string | null;
  object_kind: string | null;
  root_value_object_id: string | null;
  parent_value_object_id: string | null;
  status: string | null;
  metadata_json: unknown;
  identity_attributes_json: unknown;
  created_at: string | null;
  updated_at: string | null;
};

type SelectorPathItem = {
  id: string;
  title: string;
};

type SelectorItem = {
  id: string;
  title: string;
  aliases: string[];
  nodeRoleCode: string;
  branchTypeCode: string;
  objectKind: string;
  rootValueObjectId: string;
  parentValueObjectId: string | null;
  level: Exclude<SelectorLevel, "all">;
  status: string;
  path: SelectorPathItem[];
  pathText: string;
  createdAt: string | null;
  updatedAt: string | null;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function normalizeSearch(value: string | null): string {
  return (value ?? "").trim().slice(0, 180);
}

function normalizeBranchType(value: string | null): string | null {
  const normalized = (value ?? "").trim();

  return /^[a-z][a-z0-9_]{1,79}$/.test(normalized)
    ? normalized
    : null;
}

function normalizeLevel(value: string | null): SelectorLevel {
  if (
    value === "root" ||
    value === "intermediate" ||
    value === "leaf"
  ) {
    return value;
  }

  return "all";
}

function normalizeLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_RESULT_LIMIT;
  }

  return Math.max(1, Math.min(MAX_RESULT_LIMIT, parsed));
}

function normalizeUuidList(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter((item) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            item,
          ),
        )
        .slice(0, MAX_PINNED_IDS),
    ),
  );
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const normalized = asString(item);
    return normalized ? [normalized] : [];
  });
}

function extractAliases(row: ValueObjectRow): string[] {
  const metadata = asRecord(row.metadata_json);
  const identity = asRecord(row.identity_attributes_json);

  return Array.from(
    new Set(
      [
        ...collectStringValues(metadata.aliases),
        ...collectStringValues(metadata.searchAliases),
        ...collectStringValues(metadata.search_aliases),
        ...collectStringValues(identity.aliases),
        ...collectStringValues(identity.searchAliases),
        ...collectStringValues(identity.search_aliases),
      ].filter((alias) => alias !== row.title),
    ),
  ).slice(0, 30);
}

function resolveLevel(
  row: ValueObjectRow,
): Exclude<SelectorLevel, "all"> | null {
  if (
    row.node_role_code === "structural" &&
    row.parent_value_object_id === null
  ) {
    return "root";
  }

  if (
    row.node_role_code === "structural" &&
    row.parent_value_object_id !== null
  ) {
    return "intermediate";
  }

  if (row.node_role_code === "activity_leaf") {
    return "leaf";
  }

  return null;
}

function buildPath(
  row: ValueObjectRow,
  byId: Map<string, ValueObjectRow>,
): SelectorPathItem[] {
  const reversed: SelectorPathItem[] = [];
  const visited = new Set<string>();
  let current: ValueObjectRow | undefined = row;

  for (let depth = 0; current && depth < 200; depth += 1) {
    if (visited.has(current.id)) {
      break;
    }

    visited.add(current.id);

    const title = asString(current.title);

    if (title) {
      reversed.push({
        id: current.id,
        title,
      });
    }

    current = current.parent_value_object_id
      ? byId.get(current.parent_value_object_id)
      : undefined;
  }

  return reversed.reverse();
}

function toSelectorItem(
  row: ValueObjectRow,
  byId: Map<string, ValueObjectRow>,
): SelectorItem | null {
  const title = asString(row.title);
  const nodeRoleCode = asString(row.node_role_code);
  const branchTypeCode = asString(row.branch_type_code);
  const objectKind = asString(row.object_kind);
  const rootValueObjectId = asString(row.root_value_object_id);
  const level = resolveLevel(row);

  if (
    !title ||
    !nodeRoleCode ||
    !branchTypeCode ||
    !objectKind ||
    !rootValueObjectId ||
    !level
  ) {
    return null;
  }

  const path = buildPath(row, byId);

  return {
    id: row.id,
    title,
    aliases: extractAliases(row),
    nodeRoleCode,
    branchTypeCode,
    objectKind,
    rootValueObjectId,
    parentValueObjectId: asString(row.parent_value_object_id),
    level,
    status: asString(row.status) ?? "unknown",
    path,
    pathText: path.map((item) => item.title).join(" › "),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function matchesSearch(item: SelectorItem, query: string): boolean {
  if (!query) {
    return true;
  }

  const haystack = normalizeSearchText(
    [
      item.title,
      item.pathText,
      ...item.aliases,
    ].join("\n"),
  );

  return haystack.includes(normalizeSearchText(query));
}

function compareItems(left: SelectorItem, right: SelectorItem): number {
  return (
    left.pathText.localeCompare(right.pathText, undefined, {
      sensitivity: "base",
      numeric: true,
    }) ||
    left.title.localeCompare(right.title, undefined, {
      sensitivity: "base",
      numeric: true,
    })
  );
}

export async function GET(request: Request) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  let actorContext: Awaited<
    ReturnType<typeof resolveActiveActorContext>
  >;

  try {
    actorContext = await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          errorCode: error.code,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not resolve active actor context" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const query = normalizeSearch(url.searchParams.get("q"));
  const branchTypeCode = normalizeBranchType(
    url.searchParams.get("branchTypeCode"),
  );
  const level = normalizeLevel(url.searchParams.get("level"));
  const parentOnly = url.searchParams.get("parentOnly") === "1";
  const resultLimit = normalizeLimit(url.searchParams.get("limit"));
  const pinnedIds = normalizeUuidList(
    url.searchParams.get("pinnedIds"),
  );

  const [{ data: rowsData, error: rowsError }, { data: profileData }] =
    await Promise.all([
      supabase
        .from("value_objects")
        .select(
          `
          id,
          title,
          node_role_code,
          branch_type_code,
          object_kind,
          root_value_object_id,
          parent_value_object_id,
          status,
          metadata_json,
          identity_attributes_json,
          created_at,
          updated_at
        `,
        )
        .eq("owner_user_id", actorContext.appUserId)
        .eq("owner_actor_id", actorContext.actorId)
        .in("status", ["draft", "active"])
        .order("updated_at", { ascending: false })
        .limit(SOURCE_ROW_LIMIT),
      supabase
        .from("actor_public_profiles")
        .select("display_name, profile_kind")
        .eq("owner_user_id", actorContext.appUserId)
        .eq("actor_id", actorContext.actorId)
        .maybeSingle(),
    ]);

  if (rowsError) {
    return NextResponse.json(
      { ok: false, error: rowsError.message },
      { status: 500 },
    );
  }

  const rows = (rowsData ?? []) as ValueObjectRow[];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const allItems = rows.flatMap((row) => {
    const item = toSelectorItem(row, byId);
    return item ? [item] : [];
  });

  const filtered = allItems
    .filter((item) =>
      parentOnly ? item.nodeRoleCode === "structural" : true,
    )
    .filter((item) =>
      branchTypeCode
        ? item.branchTypeCode === branchTypeCode
        : true,
    )
    .filter((item) => (level === "all" ? true : item.level === level))
    .filter((item) => matchesSearch(item, query))
    .sort(compareItems);

  const pinnedSet = new Set(pinnedIds);
  const pinnedValueObjects = allItems
    .filter((item) => pinnedSet.has(item.id))
    .sort(compareItems);

  return NextResponse.json(
    {
      ok: true,
      scope: {
        actorId: actorContext.actorId,
        actorType: actorContext.actorType,
        displayName:
          asString(asRecord(profileData).display_name) ??
          "Current profile",
        profileKind:
          asString(asRecord(profileData).profile_kind) ??
          actorContext.actorType,
      },
      filters: {
        query,
        branchTypeCode,
        level,
        parentOnly,
      },
      valueObjects: filtered.slice(0, resultLimit),
      pinnedValueObjects,
      totalMatched: filtered.length,
      returned: Math.min(filtered.length, resultLimit),
      sourceRows: rows.length,
      sourceTruncated: rows.length >= SOURCE_ROW_LIMIT,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
