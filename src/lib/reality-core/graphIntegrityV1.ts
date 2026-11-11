/**
 * ARCTor ARI-04.02.01 / M-0155 — read-only graph contract (V1).
 *
 * Structural parentage is encoded only by value_objects.parent_value_object_id
 * and hierarchy_relation_code. Semantic classified_as is an independent edge
 * in the relation tables. This module DOES NOT perform database/network writes
 * and DOES NOT infer a structural parent from semantic links.
 *
 * Supply a COMPLETE ARI snapshot (scope_code global/actor only), not a filtered
 * page of the tree. Legacy commercial rows with scope_code NULL are not ARI.
 * Live DB validation must be performed separately; fixture tests are not a
 * substitute for a database audit. M-0156 will formalize cardinality further.
 */
export type AriScopeV1 = "global" | "actor";
export type AriNodeRoleV1 = "root" | "intermediate" | "leaf";

export type GraphIntegrityNodeV1 = Readonly<{
  id: string;
  parent_value_object_id: string | null;
  root_value_object_id: string | null;
  hierarchy_relation_code: string | null;
  scope_code: AriScopeV1 | null;
  ontology_node_role_code: AriNodeRoleV1 | null;
  owner_user_id: string | null;
  owner_actor_id: string | null;
  facet_code: string | null;
  origin_type_code: string | null;
  status: string | null;
}>;

export type SemanticRelationV1 = Readonly<{
  id: string;
  source_value_object_id: string;
  target_value_object_id: string;
  relation_type_code: string;
  status: string;
}>;

export type GraphIntegrityIssueCodeV1 =
  | "DUPLICATE_NODE_ID"
  | "ORPHAN_PARENT"
  | "SELF_PARENT"
  | "STRUCTURAL_CYCLE"
  | "ROOT_HAS_PARENT"
  | "ROOT_POINTER_MISMATCH"
  | "ROOT_HIERARCHY_CODE_PRESENT"
  | "NONROOT_PARENT_MISSING"
  | "NONROOT_HIERARCHY_CODE_MISSING"
  | "SEMANTIC_TYPE_IN_STRUCTURAL_FIELD"
  | "PARENT_ROLE_INVALID"
  | "LEAF_HAS_CHILDREN"
  | "GLOBAL_HAS_OWNER"
  | "ACTOR_OWNER_MISSING"
  | "PARENT_SCOPE_OWNER_MISMATCH"
  | "PP2_PARENT_INVALID"
  | "PARENT_FACET_MISMATCH"
  | "SEMANTIC_ENDPOINT_MISSING";

export type GraphIntegrityIssueV1 = Readonly<{
  code: GraphIntegrityIssueCodeV1;
  nodeId: string;
  relatedId?: string;
  detail?: string;
}>;

export type GraphIntegrityReportV1 = Readonly<{
  contract: "ARCTOR_GRAPH_INTEGRITY_V1";
  scope: "ARI_ONLY";
  ariNodeCount: number;
  excludedLegacyCount: number;
  structuralEdgeCount: number;
  semanticEdgeCount: number;
  issues: readonly GraphIntegrityIssueV1[];
  ok: boolean;
}>;

export function analyzeGraphIntegrityV1(
  nodes: readonly GraphIntegrityNodeV1[],
  semanticRelations: readonly SemanticRelationV1[] = [],
): GraphIntegrityReportV1 {
  const ariNodes = nodes.filter((node) => node.scope_code === "global" || node.scope_code === "actor");
  const excludedLegacyCount = nodes.length - ariNodes.length;
  const byId = new Map<string, GraphIntegrityNodeV1>();
  const issues: GraphIntegrityIssueV1[] = [];
  const issueKeys = new Set<string>();
  const add = (code: GraphIntegrityIssueCodeV1, nodeId: string, relatedId?: string, detail?: string) => {
    const key = `${code}\u0000${nodeId}\u0000${relatedId ?? ""}`;
    if (issueKeys.has(key)) return;
    issueKeys.add(key);
    issues.push({code, nodeId, ...(relatedId ? {relatedId} : {}), ...(detail ? {detail} : {})});
  };

  for (const node of ariNodes) {
    if (byId.has(node.id)) add("DUPLICATE_NODE_ID", node.id);
    else byId.set(node.id, node);
  }

  for (const node of byId.values()) {
    const parentId = node.parent_value_object_id;
    if (node.scope_code === "global" && (node.owner_user_id !== null || node.owner_actor_id !== null)) {
      add("GLOBAL_HAS_OWNER", node.id);
    }
    if (node.scope_code === "actor" && (!node.owner_user_id || !node.owner_actor_id)) {
      add("ACTOR_OWNER_MISSING", node.id);
    }
    if (node.ontology_node_role_code === "root") {
      if (parentId !== null) add("ROOT_HAS_PARENT", node.id, parentId);
      if (node.root_value_object_id !== node.id) add("ROOT_POINTER_MISMATCH", node.id);
      if (node.hierarchy_relation_code !== null) add("ROOT_HIERARCHY_CODE_PRESENT", node.id);
    } else {
      if (parentId === null) add("NONROOT_PARENT_MISSING", node.id);
      if (node.hierarchy_relation_code === null) add("NONROOT_HIERARCHY_CODE_MISSING", node.id);
    }
    if (node.hierarchy_relation_code === "classified_as") {
      add("SEMANTIC_TYPE_IN_STRUCTURAL_FIELD", node.id);
    }
    if (!parentId) continue;
    if (node.id === parentId) {
      add("SELF_PARENT", node.id);
      continue;
    }
    const parent = byId.get(parentId);
    if (!parent) {
      // A complete ARI snapshot is required. Missing parent may mean bad data
      // or an incomplete caller-provided snapshot; report conservatively.
      add("ORPHAN_PARENT", node.id, parentId);
      continue;
    }
    if (parent.ontology_node_role_code === "leaf") add("LEAF_HAS_CHILDREN", parent.id, node.id);
    if (parent.ontology_node_role_code !== "root" && parent.ontology_node_role_code !== "intermediate") {
      add("PARENT_ROLE_INVALID", node.id, parentId);
    }
    if (node.root_value_object_id !== parent.root_value_object_id) {
      add("ROOT_POINTER_MISMATCH", node.id, parentId);
    }
    if (parent.ontology_node_role_code === "root") {
      if (parent.facet_code !== "DOMAIN" || node.facet_code === "DOMAIN") {
        add("PARENT_FACET_MISMATCH", node.id, parentId);
      }
    } else if (node.facet_code !== parent.facet_code) {
      add("PARENT_FACET_MISMATCH", node.id, parentId);
    }
    const sameScopeAndOwner = node.scope_code === parent.scope_code
      && node.owner_user_id === parent.owner_user_id
      && node.owner_actor_id === parent.owner_actor_id;
    const pp2 = node.scope_code === "actor"
      && node.ontology_node_role_code === "leaf"
      && Boolean(node.owner_user_id && node.owner_actor_id)
      && parent.scope_code === "global"
      && parent.origin_type_code === "system_model"
      && parent.ontology_node_role_code === "intermediate"
      && parent.status === "active"
      && parent.owner_user_id === null
      && parent.owner_actor_id === null;
    if (!sameScopeAndOwner && !pp2) add("PARENT_SCOPE_OWNER_MISMATCH", node.id, parentId);
    // PP2 is an explicit structural exception, not a semantic classified_as.
    if (node.scope_code === "actor" && parent.scope_code === "global" && !pp2) {
      add("PP2_PARENT_INVALID", node.id, parentId);
    }
  }

  // Visit parent pointers iteratively to handle deep hierarchies safely.
  // A deterministic sorted cycle signature prevents duplicate cycle reports.
  const processed = new Set<string>();
  for (const start of byId.keys()) {
    if (processed.has(start)) continue;
    const path: string[] = [];
    const local = new Map<string, number>();
    let current: string | null = start;
    while (current !== null && byId.has(current) && !processed.has(current)) {
      const position = local.get(current);
      if (position !== undefined) {
        const members = path.slice(position).sort();
        add("STRUCTURAL_CYCLE", members[0], undefined, members.join(","));
        break;
      }
      local.set(current, path.length);
      path.push(current);
      current = byId.get(current)?.parent_value_object_id ?? null;
    }
    for (const id of path) processed.add(id);
  }

  // Semantic relations are inspected independently, NEVER used as structural
  // parents and NEVER allowed to mutate the snapshot. Cross-root links valid.
  for (const relation of semanticRelations) {
    if (!byId.has(relation.source_value_object_id) || !byId.has(relation.target_value_object_id)) {
      add("SEMANTIC_ENDPOINT_MISSING", relation.id);
    }
  }
  issues.sort((a, b) => a.code.localeCompare(b.code) || a.nodeId.localeCompare(b.nodeId));
  const structuralEdgeCount = ariNodes.filter((n) => n.parent_value_object_id !== null).length;
  return {
    contract: "ARCTOR_GRAPH_INTEGRITY_V1",
    scope: "ARI_ONLY",
    ariNodeCount: ariNodes.length,
    excludedLegacyCount,
    structuralEdgeCount,
    semanticEdgeCount: semanticRelations.length,
    issues,
    ok: issues.length === 0,
  };
}

/**
 * ARCTor ARI-04.02.02 / M-0156 — explicit structural-parent cardinality.
 *
 * This is a diagnostic over a COMPLETE ARI snapshot, not a database migration.
 * Each value_objects row has exactly one scalar parent_value_object_id column:
 * - root: zero structural parents
 * - intermediate/leaf: exactly one structural parent
 * An actor leaf may use an active global system intermediate as its sole
 * parent under PP2. Semantic classified_as and instance_of are NOT parents.
 * Legacy commercial scope_code NULL rows are outside ARI and left untouched.
 */
export type StructuralParentCardinalityIssueCodeV1 =
  | "DUPLICATE_NODE_ID"
  | "INVALID_ROLE"
  | "MALFORMED_PARENT_POINTER"
  | "ROOT_HAS_PARENT"
  | "NONROOT_PARENT_MISSING"
  | "PARENT_NOT_IN_ARI_SNAPSHOT"
  | "PARENT_IS_LEAF_OR_INVALID_ROLE"
  | "PARENT_SCOPE_OR_OWNER_FORBIDDEN";

export type StructuralParentCardinalityIssueV1 = Readonly<{
  code: StructuralParentCardinalityIssueCodeV1;
  nodeId: string;
  parentId?: string;
}>;

export type StructuralParentCardinalityGroupV1 = Readonly<{
  scope: AriScopeV1;
  role: AriNodeRoleV1;
  expectedParentCount: 0 | 1;
  nodeCount: number;
  zeroParentCount: number;
  oneParentCount: number;
}>;

export type StructuralParentCardinalityReportV1 = Readonly<{
  contract: "ARCTOR_STRUCTURAL_PARENT_CARDINALITY_V1";
  scope: "ARI_ONLY";
  parentColumn: "value_objects.parent_value_object_id";
  ariNodeCount: number;
  excludedLegacyCount: number;
  groups: readonly StructuralParentCardinalityGroupV1[];
  issues: readonly StructuralParentCardinalityIssueV1[];
  ok: boolean;
}>;

export function analyzeStructuralParentCardinalityV1(
  nodes: readonly GraphIntegrityNodeV1[],
): StructuralParentCardinalityReportV1 {
  const ariNodes = nodes.filter((n) => n.scope_code === "global" || n.scope_code === "actor");
  const byId = new Map<string, GraphIntegrityNodeV1>();
  const issues: StructuralParentCardinalityIssueV1[] = [];
  const add = (code: StructuralParentCardinalityIssueCodeV1, nodeId: string, parentId?: string) => {
    issues.push({ code, nodeId, ...(parentId ? { parentId } : {}) });
  };
  // Do not hide duplicate IDs via Map overwrite: duplicate records could carry
  // different parents in an invalid/incomplete upstream snapshot.
  for (const node of ariNodes) {
    if (byId.has(node.id)) add("DUPLICATE_NODE_ID", node.id);
    else byId.set(node.id, node);
  }
  const scopes: readonly AriScopeV1[] = ["global", "actor"];
  const roles: readonly AriNodeRoleV1[] = ["root", "intermediate", "leaf"];
  const counters = new Map<string, { count: number; zero: number; one: number }>();
  for (const scope of scopes) for (const role of roles) {
    counters.set(`${scope}/${role}`, { count: 0, zero: 0, one: 0 });
  }
  for (const node of ariNodes) {
    const role = node.ontology_node_role_code;
    if (role !== "root" && role !== "intermediate" && role !== "leaf") {
      add("INVALID_ROLE", node.id);
      continue;
    }
    const counter = counters.get(`${node.scope_code}/${role}`)!;
    counter.count += 1;
    const rawParent: unknown = node.parent_value_object_id;
    const parentCount = rawParent === null ? 0
      : typeof rawParent === "string" && rawParent.trim().length > 0 ? 1 : -1;
    if (parentCount === 0) counter.zero += 1;
    if (parentCount === 1) counter.one += 1;
    if (parentCount === -1) {
      add("MALFORMED_PARENT_POINTER", node.id);
      continue;
    }
    if (role === "root") {
      if (parentCount === 1) add("ROOT_HAS_PARENT", node.id, rawParent as string);
      continue;
    }
    if (parentCount === 0) {
      add("NONROOT_PARENT_MISSING", node.id);
      continue;
    }
    const parentId = rawParent as string;
    const parent = byId.get(parentId);
    if (!parent) {
      add("PARENT_NOT_IN_ARI_SNAPSHOT", node.id, parentId);
      continue;
    }
    if (parent.ontology_node_role_code !== "root" && parent.ontology_node_role_code !== "intermediate") {
      add("PARENT_IS_LEAF_OR_INVALID_ROLE", node.id, parentId);
    }
    const sameScopeOwner = node.scope_code === parent.scope_code
      && node.owner_user_id === parent.owner_user_id
      && node.owner_actor_id === parent.owner_actor_id;
    const pp2 = node.scope_code === "actor"
      && role === "leaf"
      && Boolean(node.owner_user_id && node.owner_actor_id)
      && parent.scope_code === "global"
      && parent.origin_type_code === "system_model"
      && parent.ontology_node_role_code === "intermediate"
      && parent.status === "active"
      && parent.owner_user_id === null
      && parent.owner_actor_id === null;
    if (!sameScopeOwner && !pp2) add("PARENT_SCOPE_OR_OWNER_FORBIDDEN", node.id, parentId);
  }
  const groups: StructuralParentCardinalityGroupV1[] = [];
  for (const scope of scopes) for (const role of roles) {
    const { count, zero, one } = counters.get(`${scope}/${role}`)!;
    groups.push({
      scope, role, expectedParentCount: role === "root" ? 0 : 1,
      nodeCount: count, zeroParentCount: zero, oneParentCount: one,
    });
  }
  issues.sort((a, b) => a.code.localeCompare(b.code) || a.nodeId.localeCompare(b.nodeId));
  return {
    contract: "ARCTOR_STRUCTURAL_PARENT_CARDINALITY_V1",
    scope: "ARI_ONLY",
    parentColumn: "value_objects.parent_value_object_id",
    ariNodeCount: ariNodes.length,
    excludedLegacyCount: nodes.length - ariNodes.length,
    groups,
    issues,
    ok: issues.length === 0,
  };
}

/**
 * ARCTor ARI-04.02.03 / M-0157: root/ancestry and structural cycle gate.
 *
 * All traversal uses ACTUAL parent_value_object_id pointers. Stored
 * root_value_object_id is checked, never trusted to stop traversal. A root
 * cannot acquire a structural parent even if no cycle would result.
 *
 * The report is read-only and does NOT perform DB writes, create migrations,
 * move subtrees, or 'repair' corrupted nodes. A proposed move that passes
 * structural analysis still REQUIRES the separately authorized tree-operation
 * flow; it is never permission to write directly.
 */
export type RootCycleSafetyIssueCodeV1 =
  | "DUPLICATE_NODE_ID"
  | "INVALID_ROLE"
  | "MALFORMED_PARENT_POINTER"
  | "ROOT_BECOMES_DESCENDANT"
  | "ROOT_POINTER_MISMATCH"
  | "PARENT_NOT_IN_COMPLETE_ARI_SNAPSHOT"
  | "STRUCTURAL_CYCLE"
  | "CHAIN_TERMINATES_AT_NONROOT";

export type RootCycleSafetyIssueV1 = Readonly<{
  code: RootCycleSafetyIssueCodeV1;
  nodeId: string;
  relatedId?: string;
  detail?: string;
}>;

export type RootCycleSafetyReportV1 = Readonly<{
  contract: "ARCTOR_ROOT_CYCLE_SAFETY_V1";
  scope: "ARI_ONLY";
  ariNodeCount: number;
  excludedLegacyCount: number;
  declaredRoots: number;
  rootlessOrCyclicPaths: number;
  issues: readonly RootCycleSafetyIssueV1[];
  ok: boolean;
}>;

export function analyzeRootCycleSafetyV1(
  nodes: readonly GraphIntegrityNodeV1[],
): RootCycleSafetyReportV1 {
  const ari = nodes.filter(n => n.scope_code === "global" || n.scope_code === "actor");
  const byId = new Map<string, GraphIntegrityNodeV1>();
  const issues: RootCycleSafetyIssueV1[] = [];
  const keys = new Set<string>();
  const add = (code: RootCycleSafetyIssueCodeV1, nodeId: string, relatedId?: string, detail?: string) => {
    const key = `${code}\u0000${nodeId}\u0000${relatedId ?? ""}`;
    if (keys.has(key)) return;
    keys.add(key);
    issues.push({code, nodeId, ...(relatedId ? {relatedId} : {}), ...(detail ? {detail} : {})});
  };

  for (const n of ari) {
    if (byId.has(n.id)) add("DUPLICATE_NODE_ID", n.id);
    else byId.set(n.id, n);
  }
  for (const n of ari) {
    const role = n.ontology_node_role_code;
    if (role !== "root" && role !== "intermediate" && role !== "leaf") add("INVALID_ROLE", n.id);
    const raw: unknown = n.parent_value_object_id;
    if (raw !== null && (typeof raw !== "string" || !raw.trim())) {
      add("MALFORMED_PARENT_POINTER", n.id);
    }
    if (role === "root") {
      if (raw !== null) add("ROOT_BECOMES_DESCENDANT", n.id, typeof raw === "string" ? raw : undefined);
      if (n.root_value_object_id !== n.id) add("ROOT_POINTER_MISMATCH", n.id, undefined, "root must point to itself");
    }
  }

  // Memoize terminal states so each parent pointer is walked at most O(1)
  // times in a valid forest, with no recursion and no arbitrary depth cutoff.
  type Terminal = {root: string | null; invalid: boolean};
  const resolved = new Map<string, Terminal>();
  const startIds = [...byId.keys()].sort();
  for (const startId of startIds) {
    if (resolved.has(startId)) continue;
    const route: string[] = [];
    const positions = new Map<string, number>();
    let cursor: string | null = startId;
    let result: Terminal = {root: null, invalid: true};
    while (cursor !== null) {
      const earlier = resolved.get(cursor);
      if (earlier) { result = earlier; break; }
      const pos = positions.get(cursor);
      if (pos !== undefined) {
        const members = route.slice(pos).sort();
        add("STRUCTURAL_CYCLE", members[0], undefined, members.join(","));
        break;
      }
      const current = byId.get(cursor);
      if (!current) {
        add("PARENT_NOT_IN_COMPLETE_ARI_SNAPSHOT", (route.length ? route[route.length - 1] : startId), cursor);
        break;
      }
      positions.set(cursor, route.length);
      route.push(cursor);
      const raw: unknown = current.parent_value_object_id;
      if (raw === null) {
        if (current.ontology_node_role_code !== "root") {
          add("CHAIN_TERMINATES_AT_NONROOT", current.id);
          break;
        }
        result = {root: current.id, invalid: false};
        break;
      }
      if (typeof raw !== "string" || !raw.trim()) break;
      cursor = raw;
    }
    // Every member must point at the root reached by following *actual*
    // parent pointers. A falsified stored root pointer cannot hide a cycle.
    for (const id of route) {
      const n = byId.get(id)!;
      if (result.root !== null && n.root_value_object_id !== result.root) {
        add("ROOT_POINTER_MISMATCH", id, result.root, "stored root differs from actual terminal root");
      }
      resolved.set(id, result);
    }
  }

  issues.sort((a,b) => a.code.localeCompare(b.code) || a.nodeId.localeCompare(b.nodeId));
  return {
    contract: "ARCTOR_ROOT_CYCLE_SAFETY_V1",
    scope: "ARI_ONLY",
    ariNodeCount: ari.length,
    excludedLegacyCount: nodes.length - ari.length,
    declaredRoots: ari.filter(n => n.ontology_node_role_code === "root").length,
    rootlessOrCyclicPaths: [...resolved.values()].filter(r => r.invalid).length,
    issues,
    ok: issues.length === 0,
  };
}

/** Safe preflight of a hypothetical parent pointer, with NO mutations. */
export type RootCycleMoveDecisionV1 =
  | "BLOCKED_EXISTING_GRAPH"
  | "BLOCKED_UNKNOWN_NODE"
  | "BLOCKED_ROOT_DESCENDANT"
  | "BLOCKED_NONROOT_WITHOUT_PARENT"
  | "BLOCKED_UNKNOWN_PARENT"
  | "BLOCKED_INVALID_PARENT_ROLE"
  | "BLOCKED_CYCLE"
  | "BLOCKED_OWNER_SCOPE"
  | "BLOCKED_ROOT_POINTER_CHANGE"
  | "NO_CHANGE"
  | "REQUIRES_CONTROLLED_TREE_OPERATION";

export type RootCycleMovePreviewV1 = Readonly<{
  contract: "ARCTOR_ROOT_CYCLE_MOVE_PREVIEW_V1";
  decision: RootCycleMoveDecisionV1;
  nodeId: string;
  proposedParentId: string | null;
  affectedNodeCount: number;
  databaseWrites: 0;
  note: string;
}>;

export function previewRootCycleReparentV1(
  nodes: readonly GraphIntegrityNodeV1[],
  nodeId: string,
  proposedParentId: string | null,
): RootCycleMovePreviewV1 {
  const byId = new Map(nodes.filter(n => n.scope_code === "global" || n.scope_code === "actor").map(n => [n.id, n]));
  const safe = analyzeRootCycleSafetyV1(nodes);
  const respond = (decision: RootCycleMoveDecisionV1, affectedNodeCount = 0): RootCycleMovePreviewV1 => ({
    contract: "ARCTOR_ROOT_CYCLE_MOVE_PREVIEW_V1",
    decision, nodeId, proposedParentId, affectedNodeCount, databaseWrites: 0,
    note: "Read-only preview only; no automatic repair or tree movement.",
  });
  if (!safe.ok || !analyzeStructuralParentCardinalityV1(nodes).ok || !analyzeGraphIntegrityV1(nodes).ok) {
    return respond("BLOCKED_EXISTING_GRAPH");
  }
  const target = byId.get(nodeId);
  if (!target) return respond("BLOCKED_UNKNOWN_NODE");
  if (target.ontology_node_role_code === "root" && proposedParentId !== null) {
    return respond("BLOCKED_ROOT_DESCENDANT");
  }
  if (target.ontology_node_role_code !== "root" && proposedParentId === null) {
    return respond("BLOCKED_NONROOT_WITHOUT_PARENT");
  }
  if (target.parent_value_object_id === proposedParentId) return respond("NO_CHANGE");
  if (proposedParentId === null) return respond("BLOCKED_ROOT_DESCENDANT");
  const parent = byId.get(proposedParentId);
  if (!parent) return respond("BLOCKED_UNKNOWN_PARENT");
  if (parent.ontology_node_role_code !== "root" && parent.ontology_node_role_code !== "intermediate") {
    return respond("BLOCKED_INVALID_PARENT_ROLE");
  }

  // Trace ancestors of the proposed parent, never trusting root pointers.
  const visited = new Set<string>();
  let cursor: string | null = proposedParentId;
  while (cursor !== null) {
    if (cursor === nodeId || visited.has(cursor)) return respond("BLOCKED_CYCLE");
    visited.add(cursor);
    const current = byId.get(cursor);
    if (!current) return respond("BLOCKED_EXISTING_GRAPH");
    cursor = current.parent_value_object_id;
  }
  const sameOwner = target.scope_code === parent.scope_code
    && target.owner_user_id === parent.owner_user_id
    && target.owner_actor_id === parent.owner_actor_id;
  const pp2 = target.scope_code === "actor" && target.ontology_node_role_code === "leaf"
    && Boolean(target.owner_user_id && target.owner_actor_id)
    && parent.scope_code === "global" && parent.origin_type_code === "system_model"
    && parent.ontology_node_role_code === "intermediate" && parent.status === "active"
    && parent.owner_user_id === null && parent.owner_actor_id === null;
  if (!sameOwner && !pp2) return respond("BLOCKED_OWNER_SCOPE");
  if (target.root_value_object_id !== parent.root_value_object_id) {
    return respond("BLOCKED_ROOT_POINTER_CHANGE");
  }
  if (parent.ontology_node_role_code === "root"
        ? (parent.facet_code !== "DOMAIN" || target.facet_code === "DOMAIN")
        : target.facet_code !== parent.facet_code) {
    return respond("BLOCKED_INVALID_PARENT_ROLE");
  }

  // Diagnostic impact: count the node and all structural descendants within
  // this complete snapshot; count is not permission to move anything.
  const children = new Map<string, string[]>();
  for (const node of byId.values()) {
    if (node.parent_value_object_id === null) continue;
    const list = children.get(node.parent_value_object_id) ?? [];
    list.push(node.id);
    children.set(node.parent_value_object_id, list);
  }
  const pending = [nodeId];
  const counted = new Set<string>();
  while (pending.length) {
    const id = pending.pop()!;
    if (counted.has(id)) continue;
    counted.add(id);
    for (const childId of children.get(id) ?? []) pending.push(childId);
  }
  return respond("REQUIRES_CONTROLLED_TREE_OPERATION", counted.size);
}

/**
 * ARCTor ARI-04.02.04 / M-0158: orphan and unavailable-parent diagnostics.
 *
 * Input MUST contain a COMPLETE ARI snapshot (global + actor). Legacy
 * commercial entries (scope_code=NULL) are excluded, never migrated/repaired.
 * Direct and ancestor checks read actual parent pointers, not root hints.
 * This function is read-only and neither grants a move nor performs writes.
 * A draft child under a non-active parent is REVIEW, not automatically a
 * contractual violation; an ACTIVE child with a non-active ancestor is BLOCKER.
 */
export type ParentAvailabilityIssueCodeV1 =
  | "DUPLICATE_NODE_ID"
  | "ROOT_HAS_PARENT"
  | "NONROOT_PARENT_MISSING"
  | "MALFORMED_PARENT_POINTER"
  | "ORPHAN_PARENT_RECORD"
  | "PARENT_OUTSIDE_ARI"
  | "INVALID_PARENT_STATUS"
  | "ACTIVE_CHILD_NONACTIVE_PARENT"
  | "NONACTIVE_CHILD_NONACTIVE_PARENT_REVIEW"
  | "ACTIVE_CHILD_NONACTIVE_ANCESTOR"
  | "ACTIVE_CHILD_ORPHAN_ANCESTOR"
  | "STRUCTURAL_CYCLE";

export type ParentAvailabilityIssueV1 = Readonly<{
  code: ParentAvailabilityIssueCodeV1;
  severity: "BLOCKER" | "REVIEW";
  nodeId: string;
  relatedId?: string;
  detail?: string;
}>;

export type ParentAvailabilityReportV1 = Readonly<{
  contract: "ARCTOR_PARENT_AVAILABILITY_V1";
  scope: "ARI_ONLY";
  ariNodeCount: number;
  excludedLegacyCount: number;
  rootCount: number;
  structuralEdgeCount: number;
  activeNodesWithNonactiveDirectParent: number;
  activeNodesWithNonactiveAncestor: number;
  issueCount: number;
  blockingIssueCount: number;
  reviewIssueCount: number;
  issues: readonly ParentAvailabilityIssueV1[];
  ok: boolean;
}>;

export function analyzeParentAvailabilityV1(
  nodes: readonly GraphIntegrityNodeV1[],
): ParentAvailabilityReportV1 {
  const ari = nodes.filter(n => n.scope_code === "global" || n.scope_code === "actor");
  const byId = new Map<string, GraphIntegrityNodeV1>();
  const allIds = new Set(nodes.map(n => n.id));
  const issues: ParentAvailabilityIssueV1[] = [];
  const keys = new Set<string>();
  const add = (
    code: ParentAvailabilityIssueCodeV1,
    severity: "BLOCKER" | "REVIEW",
    nodeId: string,
    relatedId?: string,
    detail?: string,
  ) => {
    const key = `${code}\u0000${nodeId}\u0000${relatedId ?? ""}`;
    if (keys.has(key)) return;
    keys.add(key);
    issues.push({ code, severity, nodeId, ...(relatedId ? { relatedId } : {}), ...(detail ? { detail } : {}) });
  };

  for (const node of ari) {
    if (byId.has(node.id)) add("DUPLICATE_NODE_ID", "BLOCKER", node.id);
    else byId.set(node.id, node);
  }
  let activeDirect = 0;
  const activeWithAncestor = new Set<string>();
  for (const node of ari) {
    const raw: unknown = node.parent_value_object_id;
    if (raw === null) {
      if (node.ontology_node_role_code !== "root") add("NONROOT_PARENT_MISSING", "BLOCKER", node.id);
      continue;
    }
    if (node.ontology_node_role_code === "root") {
      add("ROOT_HAS_PARENT", "BLOCKER", node.id, typeof raw === "string" ? raw : undefined);
    }
    if (typeof raw !== "string" || raw.trim().length === 0) {
      add("MALFORMED_PARENT_POINTER", "BLOCKER", node.id);
      continue;
    }
    const parent = byId.get(raw);
    if (!parent) {
      add(allIds.has(raw) ? "PARENT_OUTSIDE_ARI" : "ORPHAN_PARENT_RECORD", "BLOCKER", node.id, raw);
      continue;
    }
    if (parent.status === "active") continue;
    if (!parent.status || !["candidate", "draft", "inactive", "retired", "removed", "deleted"].includes(parent.status)) {
      add("INVALID_PARENT_STATUS", "BLOCKER", node.id, parent.id, `status=${String(parent.status)}`);
    } else if (node.status === "active") {
      activeDirect++;
      add("ACTIVE_CHILD_NONACTIVE_PARENT", "BLOCKER", node.id, parent.id, `status=${parent.status}`);
    } else {
      add("NONACTIVE_CHILD_NONACTIVE_PARENT_REVIEW", "REVIEW", node.id, parent.id, `child=${String(node.status)}, parent=${parent.status}`);
    }
  }

  // Actual ancestor chain: an active direct parent may itself have an inactive
  // parent. De-duplicate per affected active child. Iterative, cycle-safe.
  for (const node of ari) {
    if (node.status !== "active") continue;
    const seen = new Set<string>([node.id]);
    let cursor: unknown = node.parent_value_object_id;
    let distance = 1;
    while (typeof cursor === "string" && cursor.length > 0) {
      if (seen.has(cursor)) {
        add("STRUCTURAL_CYCLE", "BLOCKER", node.id, cursor);
        break;
      }
      seen.add(cursor);
      const ancestor = byId.get(cursor);
      if (!ancestor) {
        // The current child may be several levels below a missing or legacy
        // parent, so do not hide the inherited orphan condition.
        if (distance > 1) {
          add("ACTIVE_CHILD_ORPHAN_ANCESTOR", "BLOCKER", node.id, cursor,
            allIds.has(cursor) ? "ancestor outside ARI" : "ancestor record missing");
        }
        break;
      }
      if (distance > 1 && ancestor.status !== "active") {
        activeWithAncestor.add(node.id);
        add("ACTIVE_CHILD_NONACTIVE_ANCESTOR", "BLOCKER", node.id, ancestor.id, `distance=${distance}; status=${String(ancestor.status)}`);
        break;
      }
      cursor = ancestor.parent_value_object_id;
      distance++;
    }
  }
  issues.sort((a, b) => a.code.localeCompare(b.code) || a.nodeId.localeCompare(b.nodeId));
  const blockingIssueCount = issues.filter(i => i.severity === "BLOCKER").length;
  return {
    contract: "ARCTOR_PARENT_AVAILABILITY_V1",
    scope: "ARI_ONLY",
    ariNodeCount: ari.length,
    excludedLegacyCount: nodes.length - ari.length,
    rootCount: ari.filter(n => n.ontology_node_role_code === "root").length,
    structuralEdgeCount: ari.filter(n => n.parent_value_object_id !== null).length,
    activeNodesWithNonactiveDirectParent: activeDirect,
    activeNodesWithNonactiveAncestor: activeWithAncestor.size,
    issueCount: issues.length,
    blockingIssueCount,
    reviewIssueCount: issues.length - blockingIssueCount,
    issues,
    ok: blockingIssueCount === 0,
  };
}

/**
 * ARCTor ARI-04.02.05 / M-0159: conservative structural transitivity.
 *
 * A hierarchy_relation_code describes the child's DIRECT edge to its parent.
 * Only consecutive, homogeneous, ACTIVE is_a edges within the same scope and
 * owner entail a distant taxonomic ancestor in this policy version. No implied
 * edge is persisted or converted to a semantic classified_as relation.
 *
 * part_of and subprocess_of require explicit domain-specific semantics before
 * they can be treated as transitive. We expose only REVIEW candidates for them.
 * aspect_of, mixed structural chains, and ALL semantic relationship types are
 * never used to derive structural ancestors in this contract.
 *
 * Supply a COMPLETE global+actor ARI snapshot. Any structural corruption or an
 * output-cap overrun fails closed. This module NEVER writes to DB/API/ledger.
 */
export type StructuralTransitivityCodeV1 = "is_a" | "part_of" | "aspect_of" | "subprocess_of";
export type StructuralTransitivityPolicyV1 = "ENTAILED" | "REVIEW_ONLY" | "NON_TRANSITIVE";

export const STRUCTURAL_TRANSITIVITY_POLICY_V1: Readonly<Record<StructuralTransitivityCodeV1, StructuralTransitivityPolicyV1>> = Object.freeze({
  is_a: "ENTAILED",
  part_of: "REVIEW_ONLY",
  aspect_of: "NON_TRANSITIVE",
  subprocess_of: "REVIEW_ONLY",
});

export type StructuralTransitivityPathV1 = Readonly<{
  descendantId: string;
  ancestorId: string;
  hierarchyCode: StructuralTransitivityCodeV1;
  hops: number;
  /** Descendant, successive direct parents, ancestor: proof, not a new edge. */
  witnessNodeIds: readonly string[];
  disposition: "DERIVED_READONLY" | "NEEDS_SEMANTIC_REVIEW";
}>;

export type StructuralTransitivityReportV1 = Readonly<{
  contract: "ARCTOR_STRUCTURAL_TRANSITIVITY_V1";
  scope: "ARI_ONLY";
  complete: boolean;
  ok: boolean;
  ariNodeCount: number;
  excludedLegacyCount: number;
  policies: typeof STRUCTURAL_TRANSITIVITY_POLICY_V1;
  entailedPaths: readonly StructuralTransitivityPathV1[];
  reviewOnlyPaths: readonly StructuralTransitivityPathV1[];
  withheldPathsCount: number;
  scannedIndirectPaths: number;
  /** No semantic relations are used as structural evidence. */
  semanticRelationsIgnored: number;
  blockingReasons: readonly string[];
  databaseWrites: 0;
}>;

export function analyzeStructuralTransitivityV1(
  nodes: readonly GraphIntegrityNodeV1[],
  semanticRelations: readonly SemanticRelationV1[] = [],
  maxIndirectPaths = 20_000,
): StructuralTransitivityReportV1 {
  const ari = nodes.filter(n => n.scope_code === "global" || n.scope_code === "actor");
  const reasons: string[] = [];
  if (!Number.isSafeInteger(maxIndirectPaths) || maxIndirectPaths < 1 || maxIndirectPaths > 100_000) {
    reasons.push("INVALID_PATH_LIMIT");
  }
  if (!analyzeGraphIntegrityV1(nodes, semanticRelations).ok) reasons.push("GRAPH_INTEGRITY_FAILURE");
  if (!analyzeStructuralParentCardinalityV1(nodes).ok) reasons.push("PARENT_CARDINALITY_FAILURE");
  if (!analyzeRootCycleSafetyV1(nodes).ok) reasons.push("ROOT_CYCLE_FAILURE");
  if (!analyzeParentAvailabilityV1(nodes).ok) reasons.push("PARENT_AVAILABILITY_FAILURE");
  const codes = new Set<string>(Object.keys(STRUCTURAL_TRANSITIVITY_POLICY_V1));
  if (ari.some(n => n.parent_value_object_id !== null && !codes.has(String(n.hierarchy_relation_code)))) {
    reasons.push("UNKNOWN_STRUCTURAL_RELATION_CODE");
  }
  const result = (
    entailedPaths: StructuralTransitivityPathV1[],
    reviewOnlyPaths: StructuralTransitivityPathV1[],
    withheldPathsCount: number,
    scannedIndirectPaths: number,
  ): StructuralTransitivityReportV1 => ({
    contract: "ARCTOR_STRUCTURAL_TRANSITIVITY_V1", scope: "ARI_ONLY",
    complete: reasons.length === 0,
    ok: reasons.length === 0,
    ariNodeCount: ari.length,
    excludedLegacyCount: nodes.length - ari.length,
    policies: STRUCTURAL_TRANSITIVITY_POLICY_V1,
    entailedPaths, reviewOnlyPaths, withheldPathsCount, scannedIndirectPaths,
    semanticRelationsIgnored: semanticRelations.length,
    blockingReasons: [...new Set(reasons)].sort(), databaseWrites: 0,
  });
  if (reasons.length) return result([], [], 0, 0);

  const byId = new Map(ari.map(n => [n.id, n]));
  const entailed: StructuralTransitivityPathV1[] = [];
  const reviewOnly: StructuralTransitivityPathV1[] = [];
  let withheld = 0;
  let scanned = 0;
  let limitReached = false;
  for (const node of [...ari].sort((a, b) => a.id.localeCompare(b.id))) {
    if (node.status !== "active") continue;
    const path = [node.id];
    let current: GraphIntegrityNodeV1 = node;
    let homogeneous: StructuralTransitivityCodeV1 | null = null;
    let safeOwnerPath = true;
    let activePath = true;
    while (current.parent_value_object_id !== null) {
      const edge = current.hierarchy_relation_code as StructuralTransitivityCodeV1;
      const parent = byId.get(current.parent_value_object_id);
      // Earlier integrity gates guarantee a complete acyclic parent chain.
      if (!parent) { reasons.push("UNEXPECTED_MISSING_PARENT"); break; }
      if (path.length === 1) homogeneous = edge;
      else if (homogeneous !== edge) homogeneous = null;
      if (parent.status !== "active") activePath = false;
      if (parent.scope_code !== node.scope_code
          || parent.owner_user_id !== node.owner_user_id
          || parent.owner_actor_id !== node.owner_actor_id) safeOwnerPath = false;
      path.push(parent.id);
      current = parent;
      if (path.length < 3) continue; // Direct edge is not a transitive inference.
      scanned++;
      if (scanned > maxIndirectPaths) {
        reasons.push("INDIRECT_PATH_LIMIT_REACHED");
        limitReached = true;
        break;
      }
      if (activePath && safeOwnerPath && homogeneous !== null && homogeneous === "is_a") {
        entailed.push({
          descendantId: node.id, ancestorId: parent.id, hierarchyCode: "is_a",
          hops: path.length - 1, witnessNodeIds: [...path], disposition: "DERIVED_READONLY",
        });
      } else if (activePath && safeOwnerPath && homogeneous !== null
                 && (homogeneous === "part_of" || homogeneous === "subprocess_of")) {
        reviewOnly.push({
          descendantId: node.id, ancestorId: parent.id, hierarchyCode: homogeneous,
          hops: path.length - 1, witnessNodeIds: [...path], disposition: "NEEDS_SEMANTIC_REVIEW",
        });
      } else {
        withheld++;
      }
    }
    if (limitReached || reasons.includes("UNEXPECTED_MISSING_PARENT")) break;
  }
  if (reasons.length) return result([], [], 0, scanned); // Never return partial inferred results as complete.
  return result(entailed, reviewOnly, withheld, scanned);
}

/**
 * ARCTor ARI-04.02.06 / M-0160 — read-only project-composition parentage audit.
 *
 * MANDATORY DISTINCTION:
 * - value_objects.parent_value_object_id is the ONLY direct ARI tree parent;
 *   root=0 parents, intermediate=1, leaf=1 (PP2 changes the admissible
 *   parent identity, NOT the parent cardinality).
 * - project_composition_relations is a different, project-scoped DAG of
 *   `decomposes_into` between ACTIVE ARI LEAVES. Multiple distinct composition
 *   parents of one leaf are not forbidden by the observed live trigger and
 *   indexes, but this is NOT permission to create multiple ARI tree parents.
 *
 * This is an offline diagnostic on COMPLETE snapshots, not an RPC validator.
 * It never changes a tree, a composition, an API, or a database. A verdict is
 * NOT a promise that concurrent DB INSERTs are safe (trigger race not tested).
 */
export type ProjectCompositionContextSnapshotV1 = Readonly<{
  id: string;
  status_code: string;
  owner_user_id: string | null;
  owner_actor_id: string | null;
}>;
export type ProjectCompositionEdgeSnapshotV1 = Readonly<{
  id: string;
  project_context_id: string;
  parent_value_object_id: string;
  child_value_object_id: string;
  relation_type_code: string;
  status_code: string;
}>;
export type ProjectCompositionParentGroupV1 = Readonly<{
  projectContextId: string;
  childLeafId: string;
  parentLeafIds: readonly string[];
  activeEdgeCount: number;
}>;
export type ProjectCompositionAuditIssueV1 = Readonly<{
  code: string;
  edgeId: string;
  relatedId?: string;
}>;
export type ProjectCompositionParentageReportV1 = Readonly<{
  contract: "ARCTOR_PROJECT_COMPOSITION_LEAF_PARENTAGE_V1";
  scope: "PROJECT_DAG_SEPARATE_FROM_ARI_TREE";
  treeParentColumn: "value_objects.parent_value_object_id";
  projectRelationType: "decomposes_into";
  ok: boolean;
  ariTreeParentageValid: boolean;
  activeEdgeCount: number;
  inactiveEdgeCount: number;
  activeProjectCount: number;
  multiParentLeafGroups: readonly ProjectCompositionParentGroupV1[];
  maxActiveParentsPerChildWithinProject: number;
  duplicateActivePairsToReview: readonly ProjectCompositionAuditIssueV1[];
  blockingIssues: readonly ProjectCompositionAuditIssueV1[];
  semanticEdgesUsedAsParents: 0;
  databaseWrites: 0;
}>;

export function analyzeProjectCompositionLeafParentageV1(
  nodes: readonly GraphIntegrityNodeV1[],
  contexts: readonly ProjectCompositionContextSnapshotV1[],
  edges: readonly ProjectCompositionEdgeSnapshotV1[],
): ProjectCompositionParentageReportV1 {
  const blockers: ProjectCompositionAuditIssueV1[] = [];
  const reviews: ProjectCompositionAuditIssueV1[] = [];
  const add = (code: string, edgeId: string, relatedId?: string, review = false) => {
    (review ? reviews : blockers).push({code, edgeId, ...(relatedId ? {relatedId} : {})});
  };
  // Validate direct ARI parentage independently of any project edge.
  const treeCardinality = analyzeStructuralParentCardinalityV1(nodes);
  const rootCycles = analyzeRootCycleSafetyV1(nodes);
  const ariTreeParentageValid = treeCardinality.ok && rootCycles.ok;
  if (!ariTreeParentageValid) add("INVALID_ARI_TREE_SNAPSHOT", "<tree>");

  const nodeIndex = new Map<string, GraphIntegrityNodeV1>();
  for (const node of nodes) {
    if (node.scope_code !== "global" && node.scope_code !== "actor") continue;
    if (nodeIndex.has(node.id)) add("DUPLICATE_ARI_NODE_ID", node.id);
    else nodeIndex.set(node.id, node);
  }
  const contextIndex = new Map<string, ProjectCompositionContextSnapshotV1>();
  for (const context of contexts) {
    if (typeof context.id !== "string" || !context.id.trim()) {
      add("INVALID_PROJECT_CONTEXT_ID", "<context>"); continue;
    }
    if (contextIndex.has(context.id)) add("DUPLICATE_PROJECT_CONTEXT_ID", context.id);
    else contextIndex.set(context.id, context);
  }
  const edgeIds = new Set<string>();
  // Only ACTIVE project edges form this DAG. Inactive rows remain audited as
  // records but never contribute a parent, duplicate-active pair or cycle.
  const activeAdj = new Map<string, Map<string, Set<string>>>();
  const grouped = new Map<string, {projectContextId:string; childLeafId:string; parents:Set<string>; count:number}>();
  const pairIds = new Map<string, string>();
  const projects = new Set<string>();
  let activeEdgeCount = 0;
  let inactiveEdgeCount = 0;
  for (const edge of edges) {
    if (typeof edge.id !== "string" || !edge.id.trim() || edgeIds.has(edge.id)) {
      add("DUPLICATE_OR_INVALID_COMPOSITION_EDGE_ID", String(edge.id));
    } else edgeIds.add(edge.id);
    if (edge.status_code === "active") activeEdgeCount++;
    else if (edge.status_code === "inactive") inactiveEdgeCount++;
    else add("INVALID_COMPOSITION_EDGE_STATUS", String(edge.id));
    if (edge.relation_type_code !== "decomposes_into") add("INVALID_PROJECT_RELATION_TYPE", String(edge.id));
    if (typeof edge.parent_value_object_id !== "string" || !edge.parent_value_object_id.trim()
        || typeof edge.child_value_object_id !== "string" || !edge.child_value_object_id.trim()) {
      add("INVALID_COMPOSITION_ENDPOINT_ID", String(edge.id)); continue;
    }
    if (edge.parent_value_object_id === edge.child_value_object_id) add("SELF_COMPOSITION_EDGE", edge.id);
    const context = contextIndex.get(edge.project_context_id);
    if (!context) add("PROJECT_CONTEXT_NOT_IN_COMPLETE_SNAPSHOT", edge.id, edge.project_context_id);
    else if (context.status_code === "archived" && edge.status_code === "active") {
      add("ARCHIVED_PROJECT_ACTIVE_EDGE", edge.id, context.id);
    } else if (!context.status_code || typeof context.status_code !== "string") {
      add("INVALID_PROJECT_CONTEXT_STATUS", edge.id, context.id);
    }
    const parent = nodeIndex.get(edge.parent_value_object_id);
    const child = nodeIndex.get(edge.child_value_object_id);
    if (!parent) add("COMPOSITION_PARENT_NOT_ARI_LEAF", edge.id, edge.parent_value_object_id);
    if (!child) add("COMPOSITION_CHILD_NOT_ARI_LEAF", edge.id, edge.child_value_object_id);
    for (const [endpoint, node] of [["PARENT", parent], ["CHILD", child]] as const) {
      if (!node) continue;
      if (node.ontology_node_role_code !== "leaf") add(`${endpoint}_NOT_ONTOLOGY_LEAF`, edge.id, node.id);
      if (node.status !== "active") add(`${endpoint}_NOT_ACTIVE`, edge.id, node.id);
      if (node.scope_code === "actor") {
        if (!context || !node.owner_user_id || !node.owner_actor_id
          || node.owner_user_id !== context.owner_user_id
          || node.owner_actor_id !== context.owner_actor_id) {
          add(`${endpoint}_OWNER_MISMATCH`, edge.id, node.id);
        }
      } else if (node.scope_code !== "global"
        || node.owner_user_id !== null || node.owner_actor_id !== null) {
        add(`${endpoint}_SCOPE_OR_OWNER_INVALID`, edge.id, node.id);
      }
    }
    if (edge.status_code !== "active") continue;
    projects.add(edge.project_context_id);
    const groupKey = JSON.stringify([edge.project_context_id, edge.child_value_object_id]);
    let group = grouped.get(groupKey);
    if (!group) {
      group = {projectContextId:edge.project_context_id, childLeafId:edge.child_value_object_id, parents:new Set(), count:0};
      grouped.set(groupKey, group);
    }
    group.parents.add(edge.parent_value_object_id); group.count++;
    const pairKey = JSON.stringify([edge.project_context_id, edge.parent_value_object_id, edge.child_value_object_id]);
    if (pairIds.has(pairKey)) add("DUPLICATE_ACTIVE_COMPOSITION_PAIR_REVIEW", edge.id, pairIds.get(pairKey), true);
    else pairIds.set(pairKey, edge.id);
    let adjacency = activeAdj.get(edge.project_context_id);
    if (!adjacency) {adjacency = new Map(); activeAdj.set(edge.project_context_id, adjacency);}
    if (!adjacency.has(edge.parent_value_object_id)) adjacency.set(edge.parent_value_object_id, new Set());
    adjacency.get(edge.parent_value_object_id)!.add(edge.child_value_object_id);
  }
  // Kahn's algorithm: each project's active DAG is checked independently.
  // No recursion and no reliance on stored ARI root pointers.
  for (const [contextId, adjacency] of activeAdj) {
    const degrees = new Map<string, number>();
    for (const [parent, children] of adjacency) {
      if (!degrees.has(parent)) degrees.set(parent, 0);
      for (const child of children) degrees.set(child, (degrees.get(child) ?? 0) + 1);
    }
    const queue = [...degrees].filter(([,d])=>d===0).map(([id])=>id).sort();
    let visited = 0;
    for (let pos=0; pos<queue.length; pos++) {
      const parent=queue[pos]; visited++;
      for (const child of adjacency.get(parent) ?? []) {
        const remain=(degrees.get(child) ?? 0)-1;
        degrees.set(child, remain);
        if (remain===0) queue.push(child);
      }
    }
    if (visited !== degrees.size) add("PROJECT_COMPOSITION_CYCLE", contextId);
  }
  const multiParentLeafGroups: ProjectCompositionParentGroupV1[] = [];
  let maxParents = 0;
  for (const group of grouped.values()) {
    maxParents = Math.max(maxParents, group.parents.size);
    if (group.parents.size > 1) multiParentLeafGroups.push({
      projectContextId:group.projectContextId, childLeafId:group.childLeafId,
      parentLeafIds:[...group.parents].sort(), activeEdgeCount:group.count,
    });
  }
  multiParentLeafGroups.sort((a,b)=>a.projectContextId.localeCompare(b.projectContextId)||a.childLeafId.localeCompare(b.childLeafId));
  blockers.sort((a,b)=>a.code.localeCompare(b.code)||a.edgeId.localeCompare(b.edgeId));
  reviews.sort((a,b)=>a.code.localeCompare(b.code)||a.edgeId.localeCompare(b.edgeId));
  // Fail closed: do not present invalid/incomplete graph as a set of allowed
  // multi-parent relationships; still report blocking reasons.
  return {
    contract:"ARCTOR_PROJECT_COMPOSITION_LEAF_PARENTAGE_V1",
    scope:"PROJECT_DAG_SEPARATE_FROM_ARI_TREE",
    treeParentColumn:"value_objects.parent_value_object_id",
    projectRelationType:"decomposes_into",
    ok:blockers.length===0,
    ariTreeParentageValid,activeEdgeCount,inactiveEdgeCount,
    activeProjectCount:projects.size,
    multiParentLeafGroups:blockers.length===0 ? multiParentLeafGroups : [],
    maxActiveParentsPerChildWithinProject:blockers.length===0 ? maxParents : 0,
    duplicateActivePairsToReview:reviews,blockingIssues:blockers,
    semanticEdgesUsedAsParents:0,databaseWrites:0,
  };
}

/**
 * ARCTor ARI-04.02.07 / M-0161 — read-only impact preview for a proposed ON move.
 * Scope of THIS MICROSTEP ONLY: downstream facts, search, relations, standards,
 * and an explicit remaining-dependencies bucket. No tree operations, SQL, API,
 * embeddings, Git actions, ledger writes, or rollback implementation (M-0162).
 *
 * Requires a COMPLETE ARI (global+actor) catalog and an independently supplied,
 * caller-attested dependency snapshot. No row counts here are claims of verified
 * live database coverage. Unrecognized or incomplete input FAILS CLOSED.
 * Legacy commercial value_objects with scope_code NULL are excluded from ARI.
 *
 * ARI-03/M-0146 vector source contract (already implemented elsewhere):
 * SHA256('ARI03_CONTENT_V1\n' + join(title,description,canonical_key)).
 * Reparenting alone changes none of those three fields, so it does NOT by
 * itself demand a paid embedding rebuild. Search path/context still needs review.
 *
 * M-0157 preflight explicitly BLOCKS cross-root moves; showing the hypothetical
 * impact here MUST NOT weaken that authorization boundary.
 */
export const ON_MOVE_IMPACT_CONTRACT_V1 = "ARCTOR_ARI04_M0161_ON_MOVE_IMPACT_V1" as const;
export const ON_MOVE_EMBEDDING_SOURCE_CONTRACT_V1 = "ARI03_CONTENT_V1" as const;
export const ON_MOVE_EMBEDDING_SOURCE_FIELDS_V1 = Object.freeze(["title", "description", "canonical_key"] as const);

export type OnMoveImpactDomainV1 = "FACTS" | "SEARCH_INDEX" | "RELATIONS" | "STANDARDS" | "OTHER";
export type OnMoveDependencyEvidenceV1 = Readonly<{
  domain: OnMoveImpactDomainV1;
  table: string;
  recordId: string;
  /** ON UUIDs referenced by the complete row; may include other non-ARI endpoints. */
  onIds: readonly string[];
}>;
export type OnMoveDependencySnapshotV1 = Readonly<{
  /** These are attestations from a separately authorized caller, NOT DB proof. */
  completeForScope: boolean;
  sourceVersion: string;
  rows: readonly OnMoveDependencyEvidenceV1[];
}>;
export type OnMoveTreeNodeSnapshotV1 = Readonly<{
  id: string;
  parentValueObjectId: string | null;
  rootValueObjectId: string | null;
  structuralPathIds: readonly string[];
}>;
export type OnMoveDependencyGroupV1 = Readonly<{
  domain: OnMoveImpactDomainV1;
  affectedRecordCount: number;
  tables: readonly string[];
  recordReferences: readonly Readonly<{table:string;recordId:string}>[];
  requiredAction: string;
}>;
export type OnMoveImpactDecisionV1 = "BLOCKED" | "NO_CHANGE" | "REVIEW_REQUIRED";
export type OnMoveImpactPreviewReportV1 = Readonly<{
  contract: typeof ON_MOVE_IMPACT_CONTRACT_V1;
  scope: "ARI_ONLY";
  decision: OnMoveImpactDecisionV1;
  moveNodeId: string;
  proposedParentId: string | null;
  baselineMoveDecision: RootCycleMoveDecisionV1 | "NOT_EVALUATED";
  blockingReasons: readonly string[];
  reviewReasons: readonly string[];
  affectedOnIds: readonly string[];
  affectedOnCount: number;
  originalSnapshot: readonly OnMoveTreeNodeSnapshotV1[];
  hypotheticalSnapshot: readonly OnMoveTreeNodeSnapshotV1[];
  structuralPathsChanged: number;
  rootPointersWouldChange: number;
  parentPointersWouldChange: number;
  dependencies: readonly OnMoveDependencyGroupV1[];
  dependencySnapshotSourceVersion: string | null;
  dependenciesVerifiedAgainstLiveDatabase: false;
  search: Readonly<{
    pathDependentSearchReviewRequired: boolean;
    vectorSourceContract: typeof ON_MOVE_EMBEDDING_SOURCE_CONTRACT_V1;
    embeddedFields: typeof ON_MOVE_EMBEDDING_SOURCE_FIELDS_V1;
    sourceTextChangedByThisMove: false;
    embeddingRebuildRequiredByReparentingAlone: false;
    affectedIndexedRowsFromSuppliedSnapshot: number;
    affectedIndexCountIsLiveVerified: false;
  }>;
  existingGraphIntegrityOk: boolean;
  hypotheticalGraphIntegrityOk: boolean;
  repairProposalRequired: boolean;
  controlledTreeOperationRequired: boolean;
  approvalGranted: false;
  executionAuthorized: false;
  productionApiIntegrated: false;
  databaseWrites: 0;
}>;
export type OnMoveImpactPreviewInputV1 = Readonly<{
  /** Complete ARI graph (NOT just one tenant or one paginated tree branch). */
  nodes: readonly GraphIntegrityNodeV1[];
  moveNodeId: string;
  proposedParentId: string | null;
  dependencySnapshot: OnMoveDependencySnapshotV1;
}>;

/** Audited SQL #1: 58 candidate tables; table name alone is a candidate,
 * not proof that relocation changes any particular row. Additional ARI03
 * vector table is confirmed separately by SQL #3/#4. Unknown table => BLOCKED.
 */
const M0161_KNOWN_DEPENDENCY_TABLES: Readonly<Record<string, OnMoveImpactDomainV1>> = Object.freeze({
  'activity_code_templates': "OTHER",
  'activity_event_measures': "FACTS",
  'activity_event_value_object_instance_links': "FACTS",
  'activity_event_value_object_links': "FACTS",
  'activity_fact_calculation_rule_series_v1': "FACTS",
  'activity_fact_recalculation_queue': "FACTS",
  'activity_fact_value_object_links': "FACTS",
  'activity_gift_certificate_terms': "OTHER",
  'activity_leaf_fact_coefficient_rules_a31': "FACTS",
  'activity_object_facts': "FACTS",
  'activity_processing_service_log': "OTHER",
  'activity_state_deltas': "OTHER",
  'activity_template_known_registry_rules': "OTHER",
  'activity_template_profile_object_links_v1': "OTHER",
  'activity_template_profile_parameters_v2': "STANDARDS",
  'activity_value_object_links': "OTHER",
  'actor_value_object_recognition_examples_a31': "OTHER",
  'ai_feedback_corrections': "OTHER",
  'ai_feedback_events': "OTHER",
  'arctor_feed_price_leaf_registry_f323_v1': "OTHER",
  'commerce_transaction_items': "OTHER",
  'fact_capture_precision_preferences': "FACTS",
  'goal_world_object_memberships': "OTHER",
  'goal_world_objectives': "OTHER",
  'goal_world_target_criteria': "OTHER",
  'message_object_relations': "RELATIONS",
  'offer_items': "OTHER",
  'offers': "OTHER",
  'project_composition_relations': "RELATIONS",
  'project_contexts': "OTHER",
  'system_value_object_relations': "RELATIONS",
  'value_object_analytics_effect_rules_v1': "OTHER",
  'value_object_analytics_profiles_v1': "OTHER",
  'value_object_category_links': "OTHER",
  'value_object_daily_aggregates': "OTHER",
  'value_object_definition_edit_requests': "STANDARDS",
  'value_object_definition_versions': "STANDARDS",
  'value_object_hierarchy_events': "OTHER",
  'value_object_instances': "OTHER",
  'value_object_ontology_write_requests': "OTHER",
  'value_object_outcome_criteria': "OTHER",
  'value_object_parameter_assignment_write_requests': "STANDARDS",
  'value_object_parameter_assignments': "STANDARDS",
  'value_object_profile_attributes': "OTHER",
  'value_object_recognition_profiles': "OTHER",
  'value_object_relation_zone_reviews': "RELATIONS",
  'value_object_relations': "RELATIONS",
  'value_object_similarity_edges': "RELATIONS",
  'value_object_state_deltas': "OTHER",
  'value_object_state_fact_audit_events': "FACTS",
  'value_object_state_facts': "FACTS",
  'value_object_state_snapshots': "OTHER",
  'value_object_target_standards': "STANDARDS",
  'value_object_technical_representatives_v1': "OTHER",
  'value_object_tree_operation_items': "OTHER",
  'value_object_tree_operations': "OTHER",
  'value_object_usage_aggregates': "OTHER",
  'value_objects': "OTHER",
  "ari03_on_embeddings_v1": "SEARCH_INDEX",
});

const M0161_DOMAINS: readonly OnMoveImpactDomainV1[] = [
  "FACTS", "SEARCH_INDEX", "RELATIONS", "STANDARDS", "OTHER",
];
const M0161_ACTIONS: Readonly<Record<OnMoveImpactDomainV1, string>> = {
  FACTS: "PRESERVE_UUID_AND_FACTS_REVIEW_INTERPRETATION",
  SEARCH_INDEX: "CHECK_LEXICAL_PATH_CONTEXT_AND_EXISTING_ARI03_SOURCE_HASH",
  RELATIONS: "REVIEW_SEMANTIC_AND_PROJECT_RELATION_COMPATIBILITY_NO_REWIRE",
  STANDARDS: "REVIEW_STANDARD_AND_PARAMETER_APPLICABILITY_KEEP_HISTORY",
  OTHER: "MANUAL_DEPENDENCY_CLASSIFICATION_REQUIRED_NO_AUTOMATIC_EDIT",
};

export function previewOnTreeMoveImpactV1(input: OnMoveImpactPreviewInputV1): OnMoveImpactPreviewReportV1 {
  const invalidInput: string[] = [];
  const inputOk = input !== null && typeof input === "object";
  const nodes: readonly GraphIntegrityNodeV1[] = inputOk && Array.isArray(input.nodes) ? input.nodes : [];
  const moveNodeId = inputOk && typeof input.moveNodeId === "string" ? input.moveNodeId : "";
  const proposedParentId = inputOk && (typeof input.proposedParentId === "string" || input.proposedParentId === null)
    ? input.proposedParentId : null;
  const dep = inputOk ? input.dependencySnapshot : undefined;
  if (!inputOk || !Array.isArray(input.nodes)) invalidInput.push("INVALID_NODES_INPUT");
  if (!moveNodeId.trim()) invalidInput.push("INVALID_MOVE_NODE_ID");
  if (!inputOk || !(typeof input.proposedParentId === "string" && input.proposedParentId.trim()
    || input.proposedParentId === null)) invalidInput.push("INVALID_PROPOSED_PARENT_ID");
  if (nodes.length > 20000) invalidInput.push("ARI_SNAPSHOT_SIZE_LIMIT");
  if (!dep || typeof dep !== "object" || dep.completeForScope !== true
    || typeof dep.sourceVersion !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(dep.sourceVersion)
    || !Array.isArray(dep.rows)) invalidInput.push("INCOMPLETE_OR_INVALID_DEPENDENCY_SNAPSHOT");
  const rows: readonly OnMoveDependencyEvidenceV1[] = dep && Array.isArray(dep.rows) ? dep.rows : [];
  if (rows.length > 50000) invalidInput.push("DEPENDENCY_SNAPSHOT_SIZE_LIMIT");
  const rowKeySet = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object" || !(M0161_DOMAINS as readonly unknown[]).includes(row.domain)
      || typeof row.table !== "string" || !/^[a-z][a-z0-9_]{0,127}$/.test(row.table)
      || typeof row.recordId !== "string" || !row.recordId.trim()
      || row.recordId.length > 200 || !Array.isArray(row.onIds)
      || row.onIds.length < 1 || row.onIds.length > 32
      || row.onIds.some(id => typeof id !== "string" || !id.trim())) {
      invalidInput.push("INVALID_DEPENDENCY_ROW"); break;
    }
    const key = JSON.stringify([row.table, row.recordId]);
    if (!Object.prototype.hasOwnProperty.call(M0161_KNOWN_DEPENDENCY_TABLES,row.table)
      || M0161_KNOWN_DEPENDENCY_TABLES[row.table] !== row.domain) {
      invalidInput.push("UNKNOWN_OR_WRONG_DOMAIN_DEPENDENCY_TABLE"); break;
    }
    if (rowKeySet.has(key)) { invalidInput.push("DUPLICATE_DEPENDENCY_ROW"); break; }
    rowKeySet.add(key);
  }
  const emptyGroups = (): OnMoveDependencyGroupV1[] => M0161_DOMAINS.map(domain => ({
    domain, affectedRecordCount: 0, tables: [], recordReferences: [], requiredAction: M0161_ACTIONS[domain],
  }));
  const makeResult = (args: {
    decision: OnMoveImpactDecisionV1;
    blockingReasons?: string[];
    reviewReasons?: string[];
    baselineMoveDecision?: RootCycleMoveDecisionV1 | "NOT_EVALUATED";
    affectedOnIds?: string[];
    originalSnapshot?: OnMoveTreeNodeSnapshotV1[];
    hypotheticalSnapshot?: OnMoveTreeNodeSnapshotV1[];
    rootPointersWouldChange?: number;
    parentPointersWouldChange?: number;
    structuralPathsChanged?: number;
    dependencies?: OnMoveDependencyGroupV1[];
    affectedIndexedRowsFromSuppliedSnapshot?: number;
    existingGraphIntegrityOk?: boolean;
    hypotheticalGraphIntegrityOk?: boolean;
  }): OnMoveImpactPreviewReportV1 => ({
    contract: ON_MOVE_IMPACT_CONTRACT_V1, scope: "ARI_ONLY", decision: args.decision,
    moveNodeId, proposedParentId, baselineMoveDecision: args.baselineMoveDecision ?? "NOT_EVALUATED",
    blockingReasons: [...new Set(args.blockingReasons ?? [])].sort(),
    reviewReasons: [...new Set(args.reviewReasons ?? [])].sort(),
    affectedOnIds: args.affectedOnIds ?? [], affectedOnCount: args.affectedOnIds?.length ?? 0,
    originalSnapshot: args.originalSnapshot ?? [], hypotheticalSnapshot: args.hypotheticalSnapshot ?? [],
    structuralPathsChanged: args.structuralPathsChanged ?? 0,
    rootPointersWouldChange: args.rootPointersWouldChange ?? 0,
    parentPointersWouldChange: args.parentPointersWouldChange ?? 0,
    dependencies: args.dependencies ?? emptyGroups(),
    dependencySnapshotSourceVersion: dep && typeof dep.sourceVersion === "string" ? dep.sourceVersion : null,
    dependenciesVerifiedAgainstLiveDatabase: false,
    search: {
      pathDependentSearchReviewRequired: (args.structuralPathsChanged ?? 0) > 0,
      vectorSourceContract: ON_MOVE_EMBEDDING_SOURCE_CONTRACT_V1,
      embeddedFields: ON_MOVE_EMBEDDING_SOURCE_FIELDS_V1,
      sourceTextChangedByThisMove: false,
      embeddingRebuildRequiredByReparentingAlone: false,
      affectedIndexedRowsFromSuppliedSnapshot: args.affectedIndexedRowsFromSuppliedSnapshot ?? 0,
      affectedIndexCountIsLiveVerified: false,
    },
    existingGraphIntegrityOk: args.existingGraphIntegrityOk ?? false,
    hypotheticalGraphIntegrityOk: args.hypotheticalGraphIntegrityOk ?? false,
    repairProposalRequired: args.decision === "BLOCKED",
    controlledTreeOperationRequired: args.decision === "REVIEW_REQUIRED",
    approvalGranted: false, executionAuthorized: false, productionApiIntegrated: false, databaseWrites: 0,
  });
  if (invalidInput.length) return makeResult({decision:"BLOCKED",blockingReasons:invalidInput});

  const ari = nodes.filter(n => n.scope_code === "global" || n.scope_code === "actor");
  const graph = analyzeGraphIntegrityV1(nodes);
  const cardinality = analyzeStructuralParentCardinalityV1(nodes);
  const cycles = analyzeRootCycleSafetyV1(nodes);
  const availability = analyzeParentAvailabilityV1(nodes);
  const existingGraphIntegrityOk = graph.ok && cardinality.ok && cycles.ok && availability.ok;
  if (!existingGraphIntegrityOk) return makeResult({
    decision:"BLOCKED", blockingReasons:["EXISTING_ARI_GRAPH_INVALID_REPAIR_PROPOSAL_REQUIRED"],
    existingGraphIntegrityOk:false,
  });
  const byId = new Map(ari.map(n => [n.id, n]));
  const target = byId.get(moveNodeId), parent = proposedParentId === null ? undefined : byId.get(proposedParentId);
  if (!target) return makeResult({decision:"BLOCKED",blockingReasons:["TARGET_NOT_IN_ARI_SNAPSHOT"],existingGraphIntegrityOk});
  if (target.ontology_node_role_code === "root") return makeResult({
    decision:"BLOCKED",blockingReasons:["ROOT_MOVE_NOT_PERMITTED"],existingGraphIntegrityOk,
  });
  if (!parent) return makeResult({decision:"BLOCKED",blockingReasons:["PROPOSED_PARENT_NOT_IN_ARI_SNAPSHOT"],existingGraphIntegrityOk});
  if (target.status !== "active" || parent.status !== "active") return makeResult({
    decision:"BLOCKED",blockingReasons:["TARGET_OR_PROPOSED_PARENT_NOT_ACTIVE"],existingGraphIntegrityOk,
  });
  const base = previewRootCycleReparentV1(nodes, moveNodeId, proposedParentId);
  if (base.decision === "NO_CHANGE") return makeResult({
    decision:"NO_CHANGE", baselineMoveDecision:base.decision,
    existingGraphIntegrityOk, hypotheticalGraphIntegrityOk:true,
  });
  // M-0157 is the conservative controlling gate. Do NOT silently relax
  // cross-root, cycle, scope/owner, facet or other restrictions.
  if (base.decision !== "REQUIRES_CONTROLLED_TREE_OPERATION") return makeResult({
    decision:"BLOCKED", blockingReasons:[`BASELINE_MOVE_POLICY_${base.decision}`],
    baselineMoveDecision:base.decision, existingGraphIntegrityOk,
  });

  const children = new Map<string,string[]>();
  for (const n of ari) {
    if (n.parent_value_object_id === null) continue;
    const group = children.get(n.parent_value_object_id) ?? [];
    group.push(n.id); children.set(n.parent_value_object_id, group);
  }
  const affected = new Set<string>();
  const queue = [moveNodeId];
  for (let i=0;i<queue.length;i++) {
    const id = queue[i];
    if (affected.has(id)) continue;
    affected.add(id);
    for (const child of children.get(id) ?? []) queue.push(child);
  }
  const affectedOnIds = [...affected].sort();
  const hypothetical = ari.map(n => n.id === moveNodeId
    ? {...n, parent_value_object_id: proposedParentId}
    : {...n});
  const hypoById = new Map(hypothetical.map(n => [n.id,n]));
  const afterGraph = analyzeGraphIntegrityV1(hypothetical);
  const afterCardinality = analyzeStructuralParentCardinalityV1(hypothetical);
  const afterCycles = analyzeRootCycleSafetyV1(hypothetical);
  const afterAvailability = analyzeParentAvailabilityV1(hypothetical);
  const hypotheticalGraphIntegrityOk = afterGraph.ok && afterCardinality.ok && afterCycles.ok && afterAvailability.ok;
  if (!hypotheticalGraphIntegrityOk) return makeResult({
    decision:"BLOCKED", blockingReasons:["HYPOTHETICAL_ARI_GRAPH_INVALID_REPAIR_PROPOSAL_REQUIRED"],
    baselineMoveDecision:base.decision, existingGraphIntegrityOk, hypotheticalGraphIntegrityOk:false,
  });

  const pathOf = (id:string, catalog:Map<string, GraphIntegrityNodeV1>): string[] => {
    const path: string[] = [], seen = new Set<string>();
    let cursor: string | null = id;
    while (cursor !== null) {
      if (seen.has(cursor)) throw Error("CYCLE_IN_PREVALIDATED_SNAPSHOT");
      seen.add(cursor);
      const n = catalog.get(cursor);
      if (!n) throw Error("MISSING_NODE_IN_PREVALIDATED_SNAPSHOT");
      path.push(cursor); cursor = n.parent_value_object_id;
    }
    return path.reverse();
  };
  const originalSnapshot = affectedOnIds.map(id => {
    const n = byId.get(id)!;
    return {id, parentValueObjectId:n.parent_value_object_id,rootValueObjectId:n.root_value_object_id,
      structuralPathIds:pathOf(id,byId)};
  });
  const hypotheticalSnapshot = affectedOnIds.map(id => {
    const n = hypoById.get(id)!;
    return {id, parentValueObjectId:n.parent_value_object_id,rootValueObjectId:n.root_value_object_id,
      structuralPathIds:pathOf(id,hypoById)};
  });
  let structuralPathsChanged=0, rootPointersWouldChange=0, parentPointersWouldChange=0;
  for(let i=0;i<originalSnapshot.length;i++) {
    const before=originalSnapshot[i], after=hypotheticalSnapshot[i];
    if (before.parentValueObjectId!==after.parentValueObjectId) parentPointersWouldChange++;
    if (before.rootValueObjectId!==after.rootValueObjectId) rootPointersWouldChange++;
    if(JSON.stringify(before.structuralPathIds)!==JSON.stringify(after.structuralPathIds)) structuralPathsChanged++;
  }
  const matching = rows.filter(r => r.onIds.some(id => affected.has(id)));
  const dependencies = M0161_DOMAINS.map(domain => {
    const selected = matching.filter(r => r.domain === domain)
      .sort((a,b) => a.table.localeCompare(b.table) || a.recordId.localeCompare(b.recordId));
    return {domain, affectedRecordCount:selected.length,
      tables:[...new Set(selected.map(r=>r.table))].sort(),
      recordReferences:selected.map(r => ({table:r.table, recordId:r.recordId})),
      requiredAction:M0161_ACTIONS[domain]};
  });
  const indexMatches=matching.filter(r=>r.domain === "SEARCH_INDEX" && r.table === "ari03_on_embeddings_v1").length;
  const reviewReasons = ["TREE_MOVE_REQUIRES_SEPARATE_HUMAN_APPROVAL",
    "STRUCTURAL_PATH_AND_LEXICAL_CONTEXT_MAY_CHANGE",
    "HIERARCHY_RELATION_SEMANTICS_REQUIRE_CURATOR_REVIEW"];
  for (const group of dependencies) if (group.affectedRecordCount) {
    reviewReasons.push(`${group.domain}_DEPENDENCIES_REQUIRE_REVIEW`);
  }
  return makeResult({
    decision:"REVIEW_REQUIRED", baselineMoveDecision:base.decision,
    affectedOnIds,originalSnapshot,hypotheticalSnapshot,structuralPathsChanged,
    rootPointersWouldChange,parentPointersWouldChange,dependencies,
    affectedIndexedRowsFromSuppliedSnapshot:indexMatches,
    existingGraphIntegrityOk,hypotheticalGraphIntegrityOk,reviewReasons,
  });
}

/**
 * ARCTor ARI-04.02.08 / M-0162 — SAFE TREE ROLLBACK PLAN, READ-ONLY.
 * This is a precondition/evidence/repair plan, NOT a rollback executor.
 * No Supabase or authenticated API access, locks, SQL, audit writes, or approvals.
 * Caller MUST supply complete, trustworthy before/after ARI snapshots, plus the
 * accepted M-0161 impact preview. All values are caller-provided, NOT live proof.
 * The existing ARI-04.02.03/04.02.07 policies are controlling, unchanged.
 */
export const TREE_SAFE_ROLLBACK_CONTRACT_V1 = "ARCTOR_ARI04_M0162_SAFE_TREE_ROLLBACK_PLAN_V1" as const;
export type TreeSafeRollbackDecisionV1 = "BLOCKED" | "NO_CHANGE" | "REVIEW_REQUIRED";
export type TreeSafeRollbackStepV1 = Readonly<{
  order: number;
  code: string;
  instruction: string;
  automatedByThisModule: false;
}>;
export type TreeSafeRollbackInputV1 = Readonly<{
  beforeNodes: readonly GraphIntegrityNodeV1[];
  appliedNodes: readonly GraphIntegrityNodeV1[];
  moveNodeId: string;
  originalTreeOperationId: string;
  beforeRevision: string;
  appliedRevision: string;
  impactPreview: OnMoveImpactPreviewReportV1;
  completeBeforeSnapshotAttested: true;
  completeAppliedSnapshotAttested: true;
}>;
export type TreeSafeRollbackPlanV1 = Readonly<{
  contract: typeof TREE_SAFE_ROLLBACK_CONTRACT_V1;
  scope: "ARI_ONLY";
  decision: TreeSafeRollbackDecisionV1;
  blockingReasons: readonly string[];
  reviewReasons: readonly string[];
  moveNodeId: string;
  originalTreeOperationId: string;
  originalParentId: string | null;
  appliedParentId: string | null;
  originalBeforeRevision: string;
  expectedAppliedRevision: string;
  beforeNodeCount: number;
  appliedNodeCount: number;
  preservedOnIds: readonly string[];
  affectedOnIds: readonly string[];
  affectedOnCount: number;
  /** Full data snapshots for deterministic, optimistic fail-closed comparison. */
  expectedAppliedSnapshot: readonly GraphIntegrityNodeV1[];
  inverseChange: Readonly<{
    nodeId: string;
    expectedCurrentParentId: string;
    proposedRestoreParentId: string;
    changeOtherNodeParentPointers: false;
    changeNodeUuid: false;
    deleteOrRewriteHistory: false;
  }> | null;
  rollbackSteps: readonly TreeSafeRollbackStepV1[];
  prohibitedActions: readonly string[];
  factsRelationsStandardsMustBeReviewed: true;
  lexicalPathMustBeReviewed: true;
  existingAri03EmbeddingRebuildByReparentingAlone: false;
  requiresFreshAuthoritativeReadAndLock: true;
  requiresIndependentDbOperationAndHistoryAudit: true;
  approvalGranted: false;
  executionAuthorized: false;
  hasDatabaseLock: false;
  productionApiIntegrated: false;
  databaseWrites: 0;
}>;
export type TreeSafeRollbackRecheckV1 = Readonly<{
  contract: "ARCTOR_ARI04_M0162_ROLLBACK_PRECONDITION_RECHECK_V1";
  decision: "BLOCKED" | "REVIEW_REQUIRED";
  reasons: readonly string[];
  exactExpectedAppliedSnapshotMatches: boolean;
  expectedRevisionMatches: boolean;
  historicalRecordVerifiedInDatabase: false;
  authorizationEnforced: false;
  databaseWrites: 0;
}>;
const M0162_GRAPH_KEYS: readonly (keyof GraphIntegrityNodeV1)[] = [
  "id", "parent_value_object_id", "root_value_object_id", "hierarchy_relation_code",
  "scope_code", "ontology_node_role_code", "owner_user_id", "owner_actor_id",
  "facet_code", "origin_type_code", "status",
];
const M0162_ROLLBACK_STEPS: readonly TreeSafeRollbackStepV1[] = [
  {order:1,code:"REVIEW_AND_AUTHORIZE",instruction:"Obtain a separate human-authorized, actor-scoped, immutable rollback request referencing original operation and the M-0161 impact report.",automatedByThisModule:false},
  {order:2,code:"AUTHORITATIVE_LOCK_AND_CAS",instruction:"In a separate approved database transaction acquire appropriate locks; re-read complete authorized ARI snapshot; compare revision and every expected row; reject any drift, parallel writes, or change of scope/ownership.",automatedByThisModule:false},
  {order:3,code:"RECHECK_GRAPH_AND_IMPACT",instruction:"Revalidate no structural cycles, orphan nodes, invalid root/owner/facet pointers, or unapproved multi-parenting; rerun impact assessment and check all downstream references.",automatedByThisModule:false},
  {order:4,code:"APPEND_AUDIT_INTENT",instruction:"Append a new linked rollback-intent record to value_object_tree_operations and related tree_operation_items / hierarchy_events; preserve all original operation/history rows and UUIDs.",automatedByThisModule:false},
  {order:5,code:"CONTROLLED_RESTORE_ONLY",instruction:"Only a separately authorized operation may restore the original parent pointer with optimistic preconditions; never delete/recreate nodes or automatically rewrite facts, standards, relations, or vectors.",automatedByThisModule:false},
  {order:6,code:"POST_RESTORE_AUDIT",instruction:"Re-read and compare to the pre-operation snapshot; verify descendants' paths, root pointers, unchanged UUIDs, recorded audit lineage, and affected dependency interpretation; commit only after all checks.",automatedByThisModule:false},
  {order:7,code:"STOP_AND_REPAIR_ON_FAILURE",instruction:"On mismatch/failure do not issue automatic retries or cascade edits; propose repair and read-only impact with explicit human decision; preserve original and failed-attempt audit evidence.",automatedByThisModule:false},
];
const M0162_PROHIBITED_ACTIONS: readonly string[] = [
  "REPLACE_OR_REGENERATE_ON_UUID",
  "DELETE_OR_REWRITE_TREE_HISTORY",
  "AUTO_REWIRE_SEMANTIC_RELATIONS",
  "DELETE_OR_REWRITE_ACTIVITY_FACTS",
  "AUTO_REWRITE_STANDARDS_OR_PARAMETERS",
  "AUTO_REGENERATE_ARI03_EMBEDDINGS_FOR_PARENT_ONLY_CHANGE",
  "AUTO_APPLY_OR_RETRY_ROLLBACK",
  "MOVE_OR_RECLASSIFY_SCOPE_NULL_LEGACY_COMMERCE",
];
function m0162RevisionOk(s:unknown): s is string {
  return typeof s === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(s);
}
function m0162NodeOk(v:unknown): v is GraphIntegrityNodeV1 {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const n = v as Record<string,unknown>;
  if (Object.keys(n).length !== M0162_GRAPH_KEYS.length || M0162_GRAPH_KEYS.some(k => !Object.prototype.hasOwnProperty.call(n,k))) return false;
  return typeof n.id === "string" && n.id.trim().length > 0 &&
    (n.parent_value_object_id === null || typeof n.parent_value_object_id === "string") &&
    (n.root_value_object_id === null || typeof n.root_value_object_id === "string") &&
    (n.hierarchy_relation_code === null || typeof n.hierarchy_relation_code === "string") &&
    (n.scope_code === null || n.scope_code === "global" || n.scope_code === "actor") &&
    (n.ontology_node_role_code === null || n.ontology_node_role_code === "root" || n.ontology_node_role_code === "intermediate" || n.ontology_node_role_code === "leaf") &&
    (n.owner_user_id === null || typeof n.owner_user_id === "string") &&
    (n.owner_actor_id === null || typeof n.owner_actor_id === "string") &&
    (n.facet_code === null || typeof n.facet_code === "string") &&
    (n.origin_type_code === null || typeof n.origin_type_code === "string") &&
    (n.status === null || typeof n.status === "string");
}
function m0162SortedSnapshot(arr:readonly GraphIntegrityNodeV1[]):GraphIntegrityNodeV1[] {
  return arr.map(n => Object.fromEntries(M0162_GRAPH_KEYS.map(k => [k,n[k]])) as GraphIntegrityNodeV1)
    .sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
function m0162SameNode(a:GraphIntegrityNodeV1,b:GraphIntegrityNodeV1,ignoreParent:boolean):boolean {
  return M0162_GRAPH_KEYS.every(k => (ignoreParent && k === "parent_value_object_id") || a[k] === b[k]);
}
function m0162GraphValid(nodes:readonly GraphIntegrityNodeV1[]):boolean {
  return analyzeGraphIntegrityV1(nodes).ok && analyzeStructuralParentCardinalityV1(nodes).ok &&
    analyzeRootCycleSafetyV1(nodes).ok && analyzeParentAvailabilityV1(nodes).ok;
}
function m0162FailReport(input:unknown,reasons:readonly string[]):TreeSafeRollbackPlanV1 {
  const src = input && typeof input === "object" ? input as Partial<TreeSafeRollbackInputV1> : {};
  return {
    contract:TREE_SAFE_ROLLBACK_CONTRACT_V1,scope:"ARI_ONLY",decision:"BLOCKED",
    blockingReasons:[...new Set(reasons)].sort(),reviewReasons:[],
    moveNodeId:typeof src.moveNodeId === "string" ? src.moveNodeId : "",
    originalTreeOperationId:typeof src.originalTreeOperationId === "string" ? src.originalTreeOperationId : "",
    originalParentId:null,appliedParentId:null,
    originalBeforeRevision:typeof src.beforeRevision === "string" ? src.beforeRevision : "",
    expectedAppliedRevision:typeof src.appliedRevision === "string" ? src.appliedRevision : "",
    beforeNodeCount:Array.isArray(src.beforeNodes) ? src.beforeNodes.length : 0,
    appliedNodeCount:Array.isArray(src.appliedNodes) ? src.appliedNodes.length : 0,
    preservedOnIds:[],affectedOnIds:[],affectedOnCount:0,expectedAppliedSnapshot:[],inverseChange:null,
    rollbackSteps:M0162_ROLLBACK_STEPS,prohibitedActions:M0162_PROHIBITED_ACTIONS,
    factsRelationsStandardsMustBeReviewed:true,lexicalPathMustBeReviewed:true,
    existingAri03EmbeddingRebuildByReparentingAlone:false,
    requiresFreshAuthoritativeReadAndLock:true,requiresIndependentDbOperationAndHistoryAudit:true,
    approvalGranted:false,executionAuthorized:false,hasDatabaseLock:false,productionApiIntegrated:false,databaseWrites:0,
  };
}
/** Generate a plan only; no execution or live-data verification. */
export function planSafeTreeRollbackV1(input:TreeSafeRollbackInputV1):TreeSafeRollbackPlanV1 {
  if (!input || typeof input !== "object" || !Array.isArray(input.beforeNodes) || !Array.isArray(input.appliedNodes))
    return m0162FailReport(input,["INVALID_SNAPSHOT_INPUT"]);
  const {beforeNodes,appliedNodes,moveNodeId,originalTreeOperationId,beforeRevision,appliedRevision,impactPreview} = input;
  if (!beforeNodes.length || !appliedNodes.length || beforeNodes.length>20000 || appliedNodes.length>20000)
    return m0162FailReport(input,["EMPTY_OR_OVERSIZED_COMPLETE_SNAPSHOT"]);
  if (input.completeBeforeSnapshotAttested !== true || input.completeAppliedSnapshotAttested !== true)
    return m0162FailReport(input,["COMPLETE_SNAPSHOT_ATTESTATIONS_MISSING"]);
  if (!m0162RevisionOk(beforeRevision) || !m0162RevisionOk(appliedRevision) || beforeRevision === appliedRevision ||
    typeof moveNodeId !== "string" || !moveNodeId.trim() ||
    typeof originalTreeOperationId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(originalTreeOperationId))
    return m0162FailReport(input,["INVALID_OR_AMBIGUOUS_OPERATION_ID_OR_REVISIONS"]);
  if (beforeNodes.some(n => !m0162NodeOk(n)) || appliedNodes.some(n => !m0162NodeOk(n)))
    return m0162FailReport(input,["INVALID_NODE_RECORD_SHAPE"]);
  const before=m0162SortedSnapshot(beforeNodes),after=m0162SortedSnapshot(appliedNodes);
  const beforeIds=new Set(before.map(n=>n.id)),afterIds=new Set(after.map(n=>n.id));
  if (beforeIds.size!==before.length || afterIds.size!==after.length)
    return m0162FailReport(input,["DUPLICATE_NODE_ID"]);
  if (before.length!==after.length || before.some((n,i)=>n.id!==after[i]?.id))
    return m0162FailReport(input,["NODE_SET_CHANGED_UUID_PRESERVATION_UNPROVEN"]);
  if (!m0162GraphValid(before) || !m0162GraphValid(after))
    return m0162FailReport(input,["EXISTING_OR_APPLIED_ARI_GRAPH_INVALID_REPAIR_REQUIRED"]);
  const beforeNode=before.find(n=>n.id===moveNodeId),afterNode=after.find(n=>n.id===moveNodeId);
  if (!beforeNode || !afterNode || !["global","actor"].includes(String(beforeNode.scope_code)))
    return m0162FailReport(input,["TARGET_NOT_IN_ARI_SNAPSHOT"]);
  if (beforeNode.ontology_node_role_code==="root")return m0162FailReport(input,["ROOT_ROLLBACK_NOT_PERMITTED"]);
  for (let i=0;i<before.length;i++) {
    const a=before[i],b=after[i];
    if (!m0162SameNode(a,b,a.id===moveNodeId))
      return m0162FailReport(input,["UNEXPECTED_NONSTRUCTURAL_OR_OTHER_NODE_CHANGE"]);
  }
  const originalParent=beforeNode.parent_value_object_id;
  const appliedParent=afterNode.parent_value_object_id;
  if (originalParent===appliedParent)return {
    ...m0162FailReport(input,[]),decision:"NO_CHANGE",blockingReasons:[],
    originalParentId:originalParent,appliedParentId:appliedParent,
    beforeNodeCount:before.length,appliedNodeCount:after.length,
    preservedOnIds:before.map(n=>n.id),
  };
  if (originalParent===null || appliedParent===null)
    return m0162FailReport(input,["ROOT_OR_ORPHAN_MOVE_NOT_PERMITTED"]);
  // M-0161 policy controls this; no new permission is invented by M-0162.
  const validatedForward=previewOnTreeMoveImpactV1({
    nodes:before,moveNodeId,proposedParentId:appliedParent,
    dependencySnapshot:{completeForScope:true,sourceVersion:"m0162_rollback_plan",rows:[]},
  });
  if (validatedForward.decision!=="REVIEW_REQUIRED" || validatedForward.hypotheticalGraphIntegrityOk!==true)
    return m0162FailReport(input,["M0161_FORWARD_MOVE_POLICY_REJECTED"]);
  // A complete applied snapshot must equal the EXACT hypothetical direct-parent move.
  const hypothetical=before.map(n=>n.id===moveNodeId ? {...n,parent_value_object_id:appliedParent} : {...n});
  if (hypothetical.some((n,i)=>!m0162SameNode(n,after[i],false)))
    return m0162FailReport(input,["APPLIED_SNAPSHOT_NOT_EXACT_M0161_HYPOTHETICAL"]);
  if (!impactPreview || impactPreview.contract!==ON_MOVE_IMPACT_CONTRACT_V1 ||
    impactPreview.decision!=="REVIEW_REQUIRED" || impactPreview.moveNodeId!==moveNodeId ||
    impactPreview.proposedParentId!==appliedParent ||
    JSON.stringify(impactPreview.originalSnapshot)!==JSON.stringify(validatedForward.originalSnapshot) ||
    JSON.stringify(impactPreview.hypotheticalSnapshot)!==JSON.stringify(validatedForward.hypotheticalSnapshot) ||
    JSON.stringify(impactPreview.affectedOnIds)!==JSON.stringify(validatedForward.affectedOnIds))
    return m0162FailReport(input,["M0161_IMPACT_PREVIEW_EVIDENCE_MISMATCH"]);
  const validatedReverse=previewRootCycleReparentV1(after,moveNodeId,originalParent);
  if (validatedReverse.decision!=="REQUIRES_CONTROLLED_TREE_OPERATION")
    return m0162FailReport(input,["INVERSE_MOVE_POLICY_REJECTED"]);
  return {
    contract:TREE_SAFE_ROLLBACK_CONTRACT_V1,scope:"ARI_ONLY",decision:"REVIEW_REQUIRED",
    blockingReasons:[],reviewReasons:[
      "OWNER_APPROVAL_MUST_BE_SEPARATELY_RECORDED",
      "FRESH_AUTHORIZED_DATABASE_LOCK_AND_SNAPSHOT_REQUIRED",
      "ORIGINAL_HISTORY_AND_ROLLBACK_HISTORY_MUST_BE_APPEND_ONLY",
      "FACTS_SEARCH_RELATIONS_STANDARDS_REQUIRES_REVIEW",
      "APPLIED_TREE_REVISION_MUST_MATCH_AT_EXECUTION_TIME",
    ],
    moveNodeId,originalTreeOperationId,originalParentId:originalParent,appliedParentId:appliedParent,
    originalBeforeRevision:beforeRevision,expectedAppliedRevision:appliedRevision,
    beforeNodeCount:before.length,appliedNodeCount:after.length,
    preservedOnIds:before.map(n=>n.id),
    affectedOnIds:[...validatedForward.affectedOnIds],
    affectedOnCount:validatedForward.affectedOnIds.length,
    expectedAppliedSnapshot:after,
    inverseChange:{nodeId:moveNodeId,expectedCurrentParentId:appliedParent,
      proposedRestoreParentId:originalParent,changeOtherNodeParentPointers:false,
      changeNodeUuid:false,deleteOrRewriteHistory:false},
    rollbackSteps:M0162_ROLLBACK_STEPS,prohibitedActions:M0162_PROHIBITED_ACTIONS,
    factsRelationsStandardsMustBeReviewed:true,lexicalPathMustBeReviewed:true,
    existingAri03EmbeddingRebuildByReparentingAlone:false,
    requiresFreshAuthoritativeReadAndLock:true,requiresIndependentDbOperationAndHistoryAudit:true,
    approvalGranted:false,executionAuthorized:false,hasDatabaseLock:false,productionApiIntegrated:false,databaseWrites:0,
  };
}
/** Fail-closed gate for changed data. This does NOT acquire a lock or authorize execution. */
export function recheckSafeTreeRollbackV1(input:Readonly<{
  plan:TreeSafeRollbackPlanV1;
  currentNodes:readonly GraphIntegrityNodeV1[];
  currentRevision:string;
}>):TreeSafeRollbackRecheckV1 {
  const report=(decision:"BLOCKED"|"REVIEW_REQUIRED",reasons:string[],matches:boolean,revision:boolean):TreeSafeRollbackRecheckV1=>({
    contract:"ARCTOR_ARI04_M0162_ROLLBACK_PRECONDITION_RECHECK_V1",decision,
    reasons:[...new Set(reasons)].sort(),exactExpectedAppliedSnapshotMatches:matches,
    expectedRevisionMatches:revision,historicalRecordVerifiedInDatabase:false,
    authorizationEnforced:false,databaseWrites:0,
  });
  if (!input || typeof input!=="object" || !input.plan || !Array.isArray(input.currentNodes))
    return report("BLOCKED",["INVALID_RECHECK_INPUT"],false,false);
  const plan=input.plan;
  if (plan.contract!==TREE_SAFE_ROLLBACK_CONTRACT_V1 || plan.decision!=="REVIEW_REQUIRED" ||
    !Array.isArray(plan.expectedAppliedSnapshot) || !plan.expectedAppliedSnapshot.length)
    return report("BLOCKED",["ROLLBACK_PLAN_NOT_REVIEWABLE"],false,false);
  const revision=typeof input.currentRevision==="string" && input.currentRevision===plan.expectedAppliedRevision;
  const rows=input.currentNodes;
  if (rows.length>20000 || rows.some(x=>!m0162NodeOk(x)))
    return report("BLOCKED",["INVALID_CURRENT_SNAPSHOT"],false,revision);
  const actual=m0162SortedSnapshot(rows);
  const expected=m0162SortedSnapshot(plan.expectedAppliedSnapshot);
  const matches=actual.length===expected.length && new Set(actual.map(x=>x.id)).size===actual.length &&
    actual.every((n,i)=>expected[i]?.id===n.id && m0162SameNode(n,expected[i],false));
  if (!revision || !matches)return report("BLOCKED",[
    ...(!revision?["STALE_TREE_REVISION"]:[]),...(!matches?["APPLIED_SNAPSHOT_DRIFT_OR_UUID_SET_CHANGE"]:[]),
  ],matches,revision);
  return report("REVIEW_REQUIRED",["REQUIRES_ATOMIC_LOCKED_DATABASE_RECHECK_AND_HUMAN_APPROVAL"],true,true);
}
