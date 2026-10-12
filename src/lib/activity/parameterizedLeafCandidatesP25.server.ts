import "server-only";
import { supabase } from "../../../lib/supabase";
import { resolveTargetLeafV1, type ObservationNodeV1, type TargetLeafResolutionV1 } from "@/lib/activity/resolveTargetLeafV1";

/** Shared, read-only descendant/alias inspection for parameterized target bindings.
 * No inference by template name, retailer, geography, product or fact count.
 * This does NOT confirm a semantic target or write a fact. */
const MAX_DEPTH = 20;
const MAX_NODES_PER_BRANCH = 3000;
const PAGE_SIZE = 500;
const PARENT_BATCH_SIZE = 40;
const ALIAS_BATCH_SIZE = 80;
type Obj = {id: string; title: string | null; parent_value_object_id: string | null;
  ontology_node_role_code: string | null};
export type CandidateLeafP25 = { id: string; title: string; aliasesMatched: string[];
  matchingMethod: "exact_title_or_approved_alias" };
export type LeafBranchInspectionP25 = {
  intermediateValueObjectId: string;
  descendantCount: number;
  leafCount: number;
  exactTextCandidates: CandidateLeafP25[];
  scanComplete: boolean;
  issue: string | null;
  targetResolution: TargetLeafResolutionV1;
};
function normalize(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase().replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}
function containsExactPhrase(source: string, phrase: string): boolean {
  const normalized = normalize(phrase);
  return normalized.length >= 3 && /\p{L}/u.test(normalized)
    && (` ${normalize(source)} `).includes(` ${normalized} `);
}
async function collectBranch(rootId: string): Promise<{ nodes: Obj[]; complete: boolean }> {
  const visited = new Set<string>([rootId]);
  let frontier = [rootId];
  let complete = true;
  const nodes: Obj[] = [];
  for (let depth = 0; frontier.length > 0 && depth < MAX_DEPTH; depth++) {
    const next: string[] = [];
    for (let start = 0; start < frontier.length; start += PARENT_BATCH_SIZE) {
      const batch = frontier.slice(start, start + PARENT_BATCH_SIZE);
      for (let page = 0; ; page++) {
        const offset = page * PAGE_SIZE;
        const { data, error } = await supabase.from("value_objects")
          .select("id,title,parent_value_object_id,ontology_node_role_code")
          .in("parent_value_object_id", batch)
          .eq("scope_code", "global").eq("origin_type_code", "system_model")
          .eq("status", "active")
          .order("id", { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw new Error(`P25_DESCENDANTS_READ_FAILED:${error.message}`);
        for (const node of data ?? []) {
          if (!visited.has(node.id)) {
            visited.add(node.id);
            nodes.push(node);
            next.push(node.id);
          }
          if (nodes.length >= MAX_NODES_PER_BRANCH) return { nodes, complete: false };
        }
        if ((data ?? []).length < PAGE_SIZE) break;
      }
    }
    frontier = next;
  }
  if (frontier.length) complete = false;
  return { nodes, complete };
}
async function readApprovedAliases(leafIds: string[]): Promise<Map<string, string[]>> {
  const aliases = new Map<string, string[]>();
  for (let start = 0; start < leafIds.length; start += ALIAS_BATCH_SIZE) {
    const ids = leafIds.slice(start, start + ALIAS_BATCH_SIZE);
    const { data, error } = await supabase.from("concept_aliases")
      .select("concept_id,alias_text,status")
      .eq("concept_type", "value_object")
      .in("concept_id", ids)
      .in("status", ["approved", "published"]);
    if (error) throw new Error(`P25_ALIAS_READ_FAILED:${error.message}`);
    for (const entry of data ?? []) {
      const alias = typeof entry.alias_text === "string" ? entry.alias_text.trim() : "";
      if (!alias) continue;
      const previous = aliases.get(entry.concept_id) ?? [];
      if (!previous.includes(alias)) previous.push(alias);
      aliases.set(entry.concept_id, previous);
    }
  }
  return aliases;
}

/** No static lists; only descendants of roots referenced by the active template. */
export async function inspectParameterizedLeafCandidatesP25(input: {
  intermediateValueObjectIds: string[]; sourceText: string;
}): Promise<LeafBranchInspectionP25[]> {
  const roots = [...new Set(input.intermediateValueObjectIds)];
  const result: LeafBranchInspectionP25[] = [];
  for (const rootId of roots) {
    const { nodes, complete } = await collectBranch(rootId);
    const leaves = nodes.filter((node) => node.ontology_node_role_code === "leaf");
    // If the search was bounded, NEVER infer uniqueness from incomplete candidates.
    const aliases = await readApprovedAliases(leaves.map((leaf) => leaf.id));
    const observationNodes: ObservationNodeV1[] = [
      {id:rootId,parentId:null,title:"",role:"intermediate",aliases:[]},
      ...nodes.map((node): ObservationNodeV1 => ({
        id:node.id, parentId:node.parent_value_object_id,
        title:node.title ?? "", role:node.ontology_node_role_code === "leaf" ? "leaf" : "intermediate",
        aliases:aliases.get(node.id) ?? [],
      })),
    ];
    const targetResolution = complete
      ? resolveTargetLeafV1({sourceText:input.sourceText,targetId:rootId,nodes:observationNodes})
      : {contract:"ARCTOR_SHARED_TARGET_LEAF_V1" as const,status:"needs_review" as const,
         valueObjectId:null,evidence:null,reason:"TARGET_BRANCH_SCAN_INCOMPLETE"};
    const matches: CandidateLeafP25[] = [];
    for (const leaf of leaves) {
      const labels = [leaf.title ?? "", ...(aliases.get(leaf.id) ?? [])];
      const matched = labels.filter((label) => containsExactPhrase(input.sourceText, label));
      if (matched.length > 0) matches.push({
        id: leaf.id, title: leaf.title ?? "",
        aliasesMatched: [...new Set(matched)].slice(0, 8),
        matchingMethod: "exact_title_or_approved_alias",
      });
    }
    result.push({
      intermediateValueObjectId: rootId,
      descendantCount: nodes.length, leafCount: leaves.length,
      exactTextCandidates: matches.slice(0, 30),
      scanComplete: complete,
      targetResolution,
      issue: !complete ? "P25_BRANCH_SCAN_INCOMPLETE_NO_AUTOMATIC_SELECTION"
        : matches.length === 0 ? "P25_NO_EXACT_LEAF_OR_APPROVED_ALIAS_IN_TEXT"
        : matches.length > 1 ? "P25_MULTIPLE_EXACT_LEAF_CANDIDATES_REVIEW_REQUIRED"
        : null,
    });
  }
  return result;
}
