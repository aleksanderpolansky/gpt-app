import { NextResponse } from "next/server";

import {
  ActorContextError,
  type ResolvedActorContext,
  resolveActiveActorContext,
} from "../../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../../lib/auth0";
import { supabase } from "../../../../../../../lib/supabase";
import type {
  ValueObjectTreeNodeSummary,
  ValueObjectTreeOperationSummary,
  ValueObjectTreeRestructureContext,
  ValueObjectTreeRestructureError,
  ValueObjectTreeRestructureMode,
  ValueObjectTreeRestructurePreview,
} from "@/types/value-object-tree-restructure";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ValueObjectRow = {
  id: string;
  title: string | null;
  parent_value_object_id: string | null;
  root_value_object_id: string | null;
  branch_type_code: string | null;
  node_role_code: string | null;
  object_kind: string | null;
  status: string | null;
};

type OperationRow = {
  id: string;
  operation_type: string;
  status: string;
  target_value_object_id_snapshot: string;
  created_value_object_id_snapshot: string | null;
  rollback_of_operation_id: string | null;
  applied_at: string | null;
  rolled_back_at: string | null;
  created_at: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeUuid(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value.trim())
    ? value.trim()
    : null;
}

function isMode(value: unknown): value is ValueObjectTreeRestructureMode {
  return value === "reparent" || value === "insert_intermediate";
}

function toNode(row: ValueObjectRow): ValueObjectTreeNodeSummary | null {
  if (
    !row.root_value_object_id ||
    !row.branch_type_code ||
    (row.node_role_code !== "structural" &&
      row.node_role_code !== "activity_leaf") ||
    !row.object_kind
  ) {
    return null;
  }

  return {
    id: row.id,
    title: row.title?.trim() || "Untitled",
    parentValueObjectId: row.parent_value_object_id,
    rootValueObjectId: row.root_value_object_id,
    branchTypeCode: row.branch_type_code,
    nodeRoleCode: row.node_role_code,
    objectKind: row.object_kind,
    status: row.status ?? "unknown",
  };
}

function toOperation(row: OperationRow): ValueObjectTreeOperationSummary | null {
  if (
    row.operation_type !== "reparent" &&
    row.operation_type !== "insert_intermediate" &&
    row.operation_type !== "rollback"
  ) {
    return null;
  }

  if (
    row.status !== "applying" &&
    row.status !== "applied" &&
    row.status !== "rolled_back" &&
    row.status !== "failed"
  ) {
    return null;
  }

  return {
    id: row.id,
    operationType: row.operation_type,
    status: row.status,
    targetValueObjectId: row.target_value_object_id_snapshot,
    createdValueObjectId: row.created_value_object_id_snapshot,
    rollbackOfOperationId: row.rollback_of_operation_id,
    appliedAt: row.applied_at,
    rolledBackAt: row.rolled_back_at,
    createdAt: row.created_at,
  };
}

async function getActorContext(): Promise<
  | { context: ResolvedActorContext; response: null }
  | { context: null; response: NextResponse }
> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      context: null,
      response: NextResponse.json(
        { error: "Not authenticated" } satisfies ValueObjectTreeRestructureError,
        { status: 401 },
      ),
    };
  }

  try {
    const actorContext = await resolveActiveActorContext(session.user.sub);

    return { context: actorContext, response: null };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        context: null,
        response: NextResponse.json(
          {
            error: error.message,
            errorCode: error.code,
          } satisfies ValueObjectTreeRestructureError,
          { status: error.status },
        ),
      };
    }

    return {
      context: null,
      response: NextResponse.json(
        { error: "Active actor context resolution failed" } satisfies ValueObjectTreeRestructureError,
        { status: 500 },
      ),
    };
  }
}

function mapDatabaseError(error: { message: string; code?: string | null }) {
  const message = error.message || "Tree restructure preview failed";
  const status =
    error.code === "42501"
      ? 403
      : error.code === "P0002"
        ? 404
        : error.code === "40001"
          ? 409
          : 400;

  return NextResponse.json(
    {
      error: message,
      errorCode: error.code ?? null,
    } satisfies ValueObjectTreeRestructureError,
    { status },
  );
}

export async function GET(_request: Request, routeContext: RouteContext) {
  const { id: rawId } = await routeContext.params;
  const valueObjectId = normalizeUuid(rawId);

  if (!valueObjectId) {
    return NextResponse.json(
      { error: "Valid Value Object id is required" } satisfies ValueObjectTreeRestructureError,
      { status: 400 },
    );
  }

  const { context, response } = await getActorContext();

  if (response) {
    return response;
  }

  if (!context) {
    return NextResponse.json(
      { error: "Active actor context unavailable" } satisfies ValueObjectTreeRestructureError,
      { status: 500 },
    );
  }

  const select = `
    id,
    title,
    parent_value_object_id,
    root_value_object_id,
    branch_type_code,
    node_role_code,
    object_kind,
    status
  `;

  const { data: currentData, error: currentError } = await supabase
    .from("value_objects")
    .select(select)
    .eq("id", valueObjectId)
    .eq("owner_user_id", context.appUserId)
    .eq("owner_actor_id", context.actorId)
    .maybeSingle();

  if (currentError) {
    return mapDatabaseError(currentError);
  }

  const current = currentData ? toNode(currentData as ValueObjectRow) : null;

  if (!current) {
    return NextResponse.json(
      { error: "Value Object not found or access denied" } satisfies ValueObjectTreeRestructureError,
      { status: 404 },
    );
  }

  const [{ data: allData, error: allError }, { data: operationData, error: operationError }] =
    await Promise.all([
      supabase
        .from("value_objects")
        .select(select)
        .eq("owner_user_id", context.appUserId)
        .eq("owner_actor_id", context.actorId)
        .eq("branch_type_code", current.branchTypeCode)
        .in("status", ["draft", "active"])
        .order("title", { ascending: true }),
      supabase
        .from("value_object_tree_operations")
        .select(
          `
          id,
          operation_type,
          status,
          target_value_object_id_snapshot,
          created_value_object_id_snapshot,
          rollback_of_operation_id,
          applied_at,
          rolled_back_at,
          created_at
        `,
        )
        .eq("owner_user_id", context.appUserId)
        .eq("owner_actor_id", context.actorId)
        .eq("target_value_object_id_snapshot", valueObjectId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  if (allError) {
    return mapDatabaseError(allError);
  }

  if (operationError) {
    return mapDatabaseError(operationError);
  }

  const allNodes = (allData ?? [])
    .map((row: unknown) => toNode(row as ValueObjectRow))
    .filter((row: ValueObjectTreeNodeSummary | null): row is ValueObjectTreeNodeSummary => row !== null);
  const descendants = new Set<string>();
  let changed = true;

  while (changed) {
    changed = false;

    for (const node of allNodes) {
      if (
        node.parentValueObjectId &&
        (node.parentValueObjectId === current.id ||
          descendants.has(node.parentValueObjectId)) &&
        !descendants.has(node.id)
      ) {
        descendants.add(node.id);
        changed = true;
      }
    }
  }

  const result: ValueObjectTreeRestructureContext = {
    ok: true,
    current,
    candidates: allNodes.filter(
      (node: ValueObjectTreeNodeSummary) =>
        node.nodeRoleCode === "structural" &&
        node.id !== current.id &&
        !descendants.has(node.id),
    ),
    directChildren: allNodes.filter(
      (node: ValueObjectTreeNodeSummary) => node.parentValueObjectId === current.id,
    ),
    recentOperations: (operationData ?? [])
      .map((row: unknown) => toOperation(row as OperationRow))
      .filter((row: ValueObjectTreeOperationSummary | null): row is ValueObjectTreeOperationSummary => row !== null),
  };

  return NextResponse.json(result);
}

export async function POST(request: Request, routeContext: RouteContext) {
  const { id: rawId } = await routeContext.params;
  const valueObjectId = normalizeUuid(rawId);

  if (!valueObjectId) {
    return NextResponse.json(
      { error: "Valid Value Object id is required" } satisfies ValueObjectTreeRestructureError,
      { status: 400 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ValueObjectTreeRestructureError,
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "JSON object body is required" } satisfies ValueObjectTreeRestructureError,
      { status: 400 },
    );
  }

  const input = body as Record<string, unknown>;

  if (!isMode(input.mode)) {
    return NextResponse.json(
      { error: "mode must be reparent or insert_intermediate" } satisfies ValueObjectTreeRestructureError,
      { status: 400 },
    );
  }

  if (!input.payload || typeof input.payload !== "object" || Array.isArray(input.payload)) {
    return NextResponse.json(
      { error: "payload must be an object" } satisfies ValueObjectTreeRestructureError,
      { status: 400 },
    );
  }

  const { context, response } = await getActorContext();

  if (response) {
    return response;
  }

  if (!context) {
    return NextResponse.json(
      { error: "Active actor context unavailable" } satisfies ValueObjectTreeRestructureError,
      { status: 500 },
    );
  }

  const { data, error } = await supabase.rpc(
    "preview_value_object_tree_restructure_v1",
    {
      p_owner_user_id: context.appUserId,
      p_owner_actor_id: context.actorId,
      p_target_value_object_id: valueObjectId,
      p_mode: input.mode,
      p_payload: input.payload,
    },
  );

  if (error) {
    return mapDatabaseError(error);
  }

  return NextResponse.json(data as ValueObjectTreeRestructurePreview);
}
