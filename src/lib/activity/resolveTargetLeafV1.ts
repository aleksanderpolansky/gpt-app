/**
 * ARCTor common target resolution. No type-of-activity or brand-specific code.
 * A fixed personal leaf is verified directly. A parameterized intermediate
 * supplies a hard search boundary; only its active leaf descendants qualify.
 * This is a *target resolver*, NEVER a fact writer.
 */
export const ARCTOR_SHARED_TARGET_LEAF_V1 = "ARCTOR_SHARED_TARGET_LEAF_V1" as const;

export type ObservationNodeV1 = {
  id: string;
  parentId: string | null;
  title: string;
  role: "leaf" | "intermediate";
  aliases: string[];
};
export type TargetLeafEvidenceV1 = {
  leafId: string;
  matchedText: string;
  matchKind: "leaf_title" | "approved_alias";
};
export type TargetLeafResolutionV1 = {
  contract: typeof ARCTOR_SHARED_TARGET_LEAF_V1;
  status: "resolved" | "needs_review";
  valueObjectId: string | null;
  evidence: TargetLeafEvidenceV1 | null;
  reason: string;
};

function normalize(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase().replace(/ё/g,"е")
    .replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g," ").trim();
}
function containsPhrase(text: string, phrase: string): boolean {
  const term = normalize(phrase);
  return term.length >= 3 && /\p{L}/u.test(term) &&
    (` ${normalize(text)} `).includes(` ${term} `);
}

/** Pure, auditable guard used in both personal and public routes. */
export function resolveTargetLeafV1(input: {
  sourceText: string;
  targetId: string;
  nodes: ObservationNodeV1[];
}): TargetLeafResolutionV1 {
  const fail = (reason: string): TargetLeafResolutionV1 => ({
    contract: ARCTOR_SHARED_TARGET_LEAF_V1,
    status: "needs_review", valueObjectId: null, evidence: null, reason,
  });
  if (!input.sourceText.trim() || !input.targetId.trim()) return fail("TARGET_SOURCE_OR_ID_MISSING");
  const map = new Map<string, ObservationNodeV1>();
  for (const node of input.nodes) {
    if (!node.id || map.has(node.id) || !["leaf","intermediate"].includes(node.role)) {
      return fail("TARGET_NODE_SET_INVALID");
    }
    map.set(node.id, node);
  }
  const target = map.get(input.targetId);
  if (!target) return fail("TARGET_ROOT_NOT_FOUND");
  if (target.role === "leaf") return {
    contract: ARCTOR_SHARED_TARGET_LEAF_V1,
    status: "resolved", valueObjectId: target.id, evidence: null,
    reason: "TARGET_FIXED_LEAF_FROM_TEMPLATE",
  };
  const descendantLeaves: ObservationNodeV1[] = [];
  for (const node of input.nodes) {
    if (node.role !== "leaf") continue;
    const visited = new Set<string>([node.id]);
    let parent = node.parentId;
    let belongs = false;
    while (parent) {
      if (visited.has(parent)) return fail("TARGET_CYCLIC_ONTOLOGY");
      visited.add(parent);
      if (parent === input.targetId) { belongs = true; break; }
      const parentNode = map.get(parent);
      if (!parentNode) break;
      parent = parentNode.parentId;
    }
    if (belongs) descendantLeaves.push(node);
  }
  if (!descendantLeaves.length) return fail("TARGET_NO_LEAVES_IN_BRANCH");
  const exact: Array<{ node: ObservationNodeV1; evidence: TargetLeafEvidenceV1 }> = [];
  for (const leaf of descendantLeaves) {
    const matchingAlias = leaf.aliases.find((a) => containsPhrase(input.sourceText, a));
    const matchingTitle = containsPhrase(input.sourceText, leaf.title);
    if (matchingAlias || matchingTitle) exact.push({
      node: leaf,
      evidence: {
        leafId: leaf.id,
        matchedText: matchingAlias || leaf.title,
        matchKind: matchingAlias ? "approved_alias" : "leaf_title",
      },
    });
  }
  if (exact.length !== 1) return fail(exact.length ?
    "TARGET_MULTIPLE_MATCHED_LEAVES_NEED_SEMANTIC_REVIEW" :
    "TARGET_NO_EXACT_LEAF_EVIDENCE_NEED_SEMANTIC_RESOLUTION");
  return {
    contract: ARCTOR_SHARED_TARGET_LEAF_V1,
    status: "resolved", valueObjectId: exact[0].node.id,
    evidence: exact[0].evidence, reason: "TARGET_UNIQUE_VERIFIED_LEAF_MATCH",
  };
}

/**
 * Semantic AI/manual nominations NEVER bypass the tree constraint. This
 * validates a proposed ID against the same ontology and returns only a review
 * candidate; approval and write permissions are handled by the shared gate.
 */
export function validateSemanticLeafNominationV1(input: {
  intermediateId: string;
  proposedLeafId: string;
  nodes: ObservationNodeV1[];
}): { valid: boolean; reason: string } {
  const map = new Map(input.nodes.map((node) => [node.id, node]));
  const root = map.get(input.intermediateId);
  const leaf = map.get(input.proposedLeafId);
  if (!root || root.role !== "intermediate" || !leaf || leaf.role !== "leaf") {
    return {valid:false,reason:"NOMINATION_TARGET_NOT_ACTIVE_LEAF"};
  }
  let parent = leaf.parentId;
  const visited = new Set<string>([leaf.id]);
  while (parent) {
    if (visited.has(parent)) return {valid:false,reason:"NOMINATION_ONTOLOGY_CYCLE"};
    visited.add(parent);
    if (parent === root.id) return {valid:true,reason:"NOMINATION_IN_TEMPLATE_BRANCH"};
    parent = map.get(parent)?.parentId ?? null;
  }
  return {valid:false,reason:"NOMINATION_OUTSIDE_TEMPLATE_BRANCH"};
}
