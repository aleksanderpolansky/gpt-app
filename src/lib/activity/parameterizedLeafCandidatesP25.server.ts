import "server-only";
import { supabase } from "../../../lib/supabase";
import { resolveTargetLeafV1, type ObservationNodeV1, type TargetLeafResolutionV1 } from "@/lib/activity/resolveTargetLeafV1";
import { narrowTargetIntermediateV1 } from "@/lib/activity/hierarchicalTargetNarrowingV1";
import { proposeTechnicalRepresentativeV1, type RepresentativeResultV1 } from "@/lib/activity/technicalRepresentativeV1";

/** Shared, read-only descendant/alias inspection for parameterized target bindings.
 * No inference by template name, retailer, geography, product or fact count.
 * This does NOT confirm a semantic target or write a fact. */
const MAX_DEPTH = 20;
const MAX_NODES_PER_BRANCH = 3000;
const PAGE_SIZE = 500;
const PARENT_BATCH_SIZE = 40;
const ALIAS_BATCH_SIZE = 80;
// A bounded fallback preserves direct exact-leaf searching in genuinely small trees.
// This is a performance limit, never an assumption about which ON is correct.
const SMALL_TREE_INTERMEDIATE_LIMIT = 16;
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
  intermediateNodesInspected: number;
  narrowedToIntermediateId: string | null;
  narrowedToIntermediateTitle: string | null;
  narrowingMethod: "matched_intermediate" | "small_tree_fallback" | "unresolved";
  narrowingReason: string;
  /** Read-only catalog for explicit administrator semantic nomination. */
  manualLeafChoices: Array<{id:string;title:string}>;
  adminNominatedLeafId: string | null;
  technicalRepresentative: RepresentativeResultV1 | null;
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
/** Read ONLY active intermediate nodes first, without materializing 520+ store leaves. */
async function collectIntermediateHierarchy(rootId: string): Promise<{ nodes: Obj[]; complete: boolean }> {
  const visited = new Set<string>([rootId]);
  const nodes: Obj[] = [];
  let frontier = [rootId];
  for (let depth = 0; frontier.length && depth < MAX_DEPTH; depth++) {
    const next: string[] = [];
    for (let start = 0; start < frontier.length; start += PARENT_BATCH_SIZE) {
      const batch = frontier.slice(start, start + PARENT_BATCH_SIZE);
      for (let page = 0; ; page++) {
        const offset = page * PAGE_SIZE;
        const { data, error } = await supabase.from("value_objects")
          .select("id,title,parent_value_object_id,ontology_node_role_code")
          .in("parent_value_object_id", batch)
          .eq("ontology_node_role_code", "intermediate")
          .eq("scope_code", "global").eq("origin_type_code", "system_model")
          .eq("status", "active")
          .order("id", { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw new Error(`P25_INTERMEDIATE_READ_FAILED:${error.message}`);
        for (const node of data ?? []) {
          if (visited.has(node.id)) continue;
          visited.add(node.id);
          nodes.push(node);
          next.push(node.id);
          if (nodes.length >= MAX_NODES_PER_BRANCH) return {nodes, complete: false};
        }
        if ((data ?? []).length < PAGE_SIZE) break;
      }
    }
    frontier = next;
  }
  return { nodes, complete: frontier.length === 0 };
}
async function readApprovedAliases(ids: string[]): Promise<Map<string, string[]>> {
  const aliases = new Map<string, string[]>();
  for (let start = 0; start < ids.length; start += ALIAS_BATCH_SIZE) {
    const batch = ids.slice(start, start + ALIAS_BATCH_SIZE);
    const { data, error } = await supabase.from("concept_aliases")
      .select("concept_id,alias_text,status")
      .eq("concept_type", "value_object")
      .in("concept_id", batch)
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

/** Hierarchical, read-only branch narrowing; no brand, city or product literals. */
export async function inspectParameterizedLeafCandidatesP25(input: {
  intermediateValueObjectIds: string[]; sourceText: string;
  manualLeafByRoot?: Record<string,string>;
}): Promise<LeafBranchInspectionP25[]> {
  const roots = [...new Set(input.intermediateValueObjectIds)];
  const result: LeafBranchInspectionP25[] = [];
  const hierarchyByRoot = new Map<string, Obj[]>();
  for (const rootId of roots) {
    const hierarchy = await collectIntermediateHierarchy(rootId);
    hierarchyByRoot.set(rootId, hierarchy.nodes);
    const intermediateNodesInspected = hierarchy.nodes.length;
    const aliases = await readApprovedAliases(hierarchy.nodes.map((node) => node.id));
    const narrowing = hierarchy.complete ? narrowTargetIntermediateV1({
      rootId,
      sourceText: input.sourceText,
      nodes: [
        { id:rootId, parentId:null, title:"", aliases:[] },
        ...hierarchy.nodes.map((node) => ({
          id:node.id, parentId:node.parent_value_object_id,
          title:node.title ?? "", aliases:aliases.get(node.id) ?? [],
        })),
      ],
    }) : null;
    // No guessing when the intermediate hierarchy is incomplete or two
    // unrelated intermediate paths match the same source publication.
    const hasMatchedSubtree = narrowing?.status === "narrowed";
    const allowSmallFallback = narrowing?.status === "no_match" &&
      intermediateNodesInspected <= SMALL_TREE_INTERMEDIATE_LIMIT;
    const narrowingMethod: LeafBranchInspectionP25["narrowingMethod"] =
      hasMatchedSubtree ? "matched_intermediate" : allowSmallFallback ? "small_tree_fallback" : "unresolved";
    const scopeId = hasMatchedSubtree ? narrowing.selectedIntermediateId! : rootId;
    // In a large tree with no supported intermediate path, do NOT scan every
    // store. Leave the target unresolved for semantic review.
    const scan = hasMatchedSubtree || allowSmallFallback
      ? await collectBranch(scopeId)
      : {nodes: [] as Obj[], complete: false};
    const leaves = scan.nodes.filter((node) => node.ontology_node_role_code === "leaf");
    const leafAliases = await readApprovedAliases(leaves.map((node) => node.id));
    const byId = new Map<string, Obj>();
    for (const node of [...hierarchy.nodes, ...scan.nodes]) byId.set(node.id, node);
    const observationNodes: ObservationNodeV1[] = [
      {id:rootId,parentId:null,title:"",role:"intermediate",aliases:[]},
      ...[...byId.values()].map((node): ObservationNodeV1 => ({
        id:node.id, parentId:node.parent_value_object_id,
        title:node.title ?? "",
        role:node.ontology_node_role_code === "leaf" ? "leaf" : "intermediate",
        aliases:leafAliases.get(node.id) ?? aliases.get(node.id) ?? [],
      })),
    ];
    const scanComplete = hierarchy.complete && scan.complete;
    const targetResolution: TargetLeafResolutionV1 = scanComplete
      ? resolveTargetLeafV1({sourceText:input.sourceText,targetId:rootId,nodes:observationNodes})
      : {
        contract:"ARCTOR_SHARED_TARGET_LEAF_V1", status:"needs_review",
        valueObjectId:null, evidence:null,
        reason:narrowing?.status === "ambiguous" ? "TARGET_INTERMEDIATE_PATH_AMBIGUOUS" :
          !hierarchy.complete ? "TARGET_INTERMEDIATE_SCAN_INCOMPLETE" :
          "TARGET_NO_MATCHED_INTERMEDIATE_NEED_SEMANTIC_RESOLUTION",
      };
    const manualLeafId = input.manualLeafByRoot?.[rootId] ?? null;
    const availableChoices = scanComplete && leaves.length <= 20 ? leaves.map((node) => ({
      id:node.id,title:node.title ?? "",
    })) : [];
    if (manualLeafId && !availableChoices.some((choice) => choice.id === manualLeafId)) {
      throw new Error("P256_MANUAL_NOMINATION_OUTSIDE_AUTHORIZED_LEAF_SET");
    }
    const matches: CandidateLeafP25[] = [];
    for (const leaf of leaves) {
      const labels = [leaf.title ?? "", ...(leafAliases.get(leaf.id) ?? [])];
      const matched = labels.filter((label) => containsExactPhrase(input.sourceText, label));
      if (matched.length) matches.push({
        id:leaf.id,title:leaf.title ?? "",
        aliasesMatched:[...new Set(matched)].slice(0,8),
        matchingMethod:"exact_title_or_approved_alias",
      });
    }
    result.push({
      intermediateValueObjectId:rootId,
      descendantCount:scan.nodes.length,
      leafCount:leaves.length,
      exactTextCandidates:matches.slice(0,30),
      scanComplete, targetResolution,
      intermediateNodesInspected,
      narrowedToIntermediateId:hasMatchedSubtree ? scopeId : null,
      narrowedToIntermediateTitle:hasMatchedSubtree ? narrowing.selectedIntermediateTitle : null,
      narrowingMethod,
      narrowingReason:narrowing?.reason ?? "NARROWING_INTERMEDIATE_HIERARCHY_INCOMPLETE",
      manualLeafChoices: availableChoices,
      adminNominatedLeafId: manualLeafId,
      technicalRepresentative: null,
      issue: !scanComplete ? "P25_HIERARCHICAL_SEARCH_UNRESOLVED_NO_FACT_WRITES"
        : matches.length === 0 ? "P25_NO_EXACT_LEAF_OR_APPROVED_ALIAS_IN_TEXT"
        : matches.length > 1 ? "P25_MULTIPLE_EXACT_LEAF_CANDIDATES_REVIEW_REQUIRED"
        : null,
    });
  }
  // If an administrator nominates a small-branch leaf (e.g. locality),
  // look for a compatible locality subbranch under a verified network match.
  // This is a proposal ONLY: it never replaces manual review or writes facts.
  const verifiedChoices = result.flatMap((entry) => entry.adminNominatedLeafId
    ? entry.manualLeafChoices.filter((choice) => choice.id === entry.adminNominatedLeafId)
    : []);
  for (const inspection of result) {
    if (inspection.narrowingMethod !== "matched_intermediate" ||
        !inspection.narrowedToIntermediateId || inspection.manualLeafChoices.length ||
        !verifiedChoices.length) continue;
    const hierarchy = hierarchyByRoot.get(inspection.intermediateValueObjectId) ?? [];
    const idsByParent = new Map(hierarchy.map((node) => [node.id,node.parent_value_object_id]));
    const inNarrowed = (id:string):boolean => {
      let p:string|null=id;
      const seen=new Set<string>();
      while(p){
        if(seen.has(p))return false;
        seen.add(p);
        if(p===inspection.narrowedToIntermediateId)return true;
        p=idsByParent.get(p) ?? null;
      }
      return false;
    };
    const norm=(s:string)=>s.normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
      .toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
    const matchPairs = verifiedChoices.flatMap((choice) => {
      const locality=norm(choice.title);
      if(locality.length<3)return [];
      return hierarchy.filter((node)=>node.id!==inspection.narrowedToIntermediateId &&
        inNarrowed(node.id) && (` ${norm(node.title ?? "")} `).includes(` ${locality} `))
        .map((node)=>({node,localityTitle:choice.title}));
    });
    if (matchPairs.length !== 1) continue;
    const cityTitle=matchPairs[0].localityTitle;
    const localityBranches=[matchPairs[0].node];
    const subtree=await collectBranch(localityBranches[0].id);
    const proposal=proposeTechnicalRepresentativeV1({
      authorizedRootId: inspection.intermediateValueObjectId,
      verifiedNetworkIntermediateId: inspection.narrowedToIntermediateId,
      verifiedLocalityTitle: cityTitle,
      intermediates: [
        {id:inspection.intermediateValueObjectId,parentId:null,title:"",role:"intermediate"},
        ...hierarchy.map((node)=>({id:node.id,parentId:node.parent_value_object_id,
          title:node.title ?? "",role:"intermediate" as const})),
      ],
      localityDescendants:subtree.nodes.map((node)=>({id:node.id,parentId:node.parent_value_object_id,
        title:node.title ?? "",role:node.ontology_node_role_code === "leaf" ? "leaf" as const : "intermediate" as const})),
      descendantsComplete:subtree.complete,
      specificAddressStated:false,
    });
    inspection.technicalRepresentative=proposal;
  }
  return result;
}
