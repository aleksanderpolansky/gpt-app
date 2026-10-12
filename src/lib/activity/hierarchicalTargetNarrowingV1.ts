/**
 * ARCTor: generic, deterministic narrowing of a template-authorized ON branch.
 * This is a search optimization and not a semantic confirmation or fact writer.
 * It never invents translations, inflections, store addresses or leaf IDs.
 */
export const ARCTOR_HIERARCHICAL_TARGET_NARROWING_V1 = "ARCTOR_HIERARCHICAL_TARGET_NARROWING_V1" as const;

export type HierarchyIntermediateV1 = {
  id: string;
  parentId: string | null;
  title: string;
  aliases: string[];
};
export type HierarchyNarrowingV1 = {
  contract: typeof ARCTOR_HIERARCHICAL_TARGET_NARROWING_V1;
  status: "narrowed" | "no_match" | "ambiguous" | "invalid";
  selectedIntermediateId: string | null;
  selectedIntermediateTitle: string | null;
  matchedBy: "title" | "approved_alias" | null;
  matchedText: string | null;
  matchedIntermediateCount: number;
  reason: string;
};
const normalize = (value: string): string => value.normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/ё/g, "е")
  .replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
function phraseIn(text: string, phrase: string): boolean {
  const key = normalize(phrase);
  return key.length >= 3 && /\p{L}/u.test(key) && (` ${normalize(text)} `).includes(` ${key} `);
}

/** A unique deepest matched intermediate wins only if other matches are its ancestors. */
export function narrowTargetIntermediateV1(input: {
  rootId: string;
  sourceText: string;
  nodes: HierarchyIntermediateV1[];
}): HierarchyNarrowingV1 {
  const base = {
    contract: ARCTOR_HIERARCHICAL_TARGET_NARROWING_V1,
    selectedIntermediateId: null,
    selectedIntermediateTitle: null,
    matchedBy: null,
    matchedText: null,
  } as const;
  const fail = (status: "no_match" | "ambiguous" | "invalid", reason: string, count = 0): HierarchyNarrowingV1 => ({
    ...base, status, reason, matchedIntermediateCount: count,
  });
  if (!input.rootId || !input.sourceText.trim()) return fail("invalid", "NARROWING_MISSING_SOURCE_OR_ROOT");
  const map = new Map<string, HierarchyIntermediateV1>();
  for (const node of input.nodes) {
    if (!node.id || map.has(node.id) || !Array.isArray(node.aliases)) {
      return fail("invalid", "NARROWING_INVALID_NODE_SET");
    }
    map.set(node.id, node);
  }
  if (!map.has(input.rootId)) return fail("invalid", "NARROWING_ROOT_NOT_FOUND");
  const ancestors = new Map<string, Set<string>>();
  const depths = new Map<string, number>();
  for (const node of input.nodes) {
    const seen = new Set<string>([node.id]);
    const chain = new Set<string>();
    let cursor = node.parentId;
    let depth = 0;
    while (cursor && cursor !== input.rootId) {
      if (seen.has(cursor)) return fail("invalid", "NARROWING_ONTOLOGY_CYCLE");
      const parent = map.get(cursor);
      if (!parent) return fail("invalid", "NARROWING_INCOMPLETE_ANCESTORS");
      seen.add(cursor);
      chain.add(cursor);
      cursor = parent.parentId;
      depth++;
    }
    if (node.id !== input.rootId && cursor !== input.rootId) {
      return fail("invalid", "NARROWING_NODE_OUTSIDE_ROOT");
    }
    if (node.id !== input.rootId) {
      chain.add(input.rootId);
      depth++;
    }
    ancestors.set(node.id, chain);
    depths.set(node.id, depth);
  }
  const hits: Array<{node: HierarchyIntermediateV1; kind: "title" | "approved_alias"; text: string}> = [];
  for (const node of input.nodes) {
    if (node.id === input.rootId) continue;
    const title = phraseIn(input.sourceText, node.title);
    const alias = node.aliases.find((entry) => phraseIn(input.sourceText, entry));
    if (title || alias) hits.push({node, kind: title ? "title" : "approved_alias", text: title ? node.title : alias!});
  }
  if (!hits.length) return fail("no_match", "NARROWING_NO_VERIFIED_INTERMEDIATE_MATCH");
  hits.sort((a,b) => (depths.get(b.node.id) ?? 0) - (depths.get(a.node.id) ?? 0));
  const deepest = hits[0];
  if (hits.some((hit) => hit.node.id !== deepest.node.id && !ancestors.get(deepest.node.id)?.has(hit.node.id))) {
    return fail("ambiguous", "NARROWING_MATCHES_DIVERGENT_BRANCHES", hits.length);
  }
  return {
    contract: ARCTOR_HIERARCHICAL_TARGET_NARROWING_V1,
    status: "narrowed",
    selectedIntermediateId: deepest.node.id,
    selectedIntermediateTitle: deepest.node.title,
    matchedBy: deepest.kind,
    matchedText: deepest.text,
    matchedIntermediateCount: hits.length,
    reason: "NARROWING_UNIQUE_INTERMEDIATE_PATH",
  };
}
