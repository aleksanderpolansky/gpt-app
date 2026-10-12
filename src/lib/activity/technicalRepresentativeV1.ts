/**
 * Deterministic technical representative for a verified network + locality.
 * This function is common ontology logic, never a commercial fact writer.
 * An administrator (or separately validated semantic evidence) must establish
 * the locality first. A random store in the whole network is never allowed.
 */
export const ARCTOR_TECHNICAL_REPRESENTATIVE_V1 = "ARCTOR_TECHNICAL_REPRESENTATIVE_V1" as const;
export type RepresentativeNodeV1 = {
  id: string;
  parentId: string | null;
  title: string;
  role: "intermediate" | "leaf";
};
export type RepresentativeResultV1 = {
  contract: typeof ARCTOR_TECHNICAL_REPRESENTATIVE_V1;
  status: "proposed" | "needs_review";
  leafId: string | null;
  localityBranchId: string | null;
  candidateCount: number;
  technicalRepresentative: boolean;
  actualStoreAddressConfirmed: false;
  reason: string;
};
function normalized(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase().replace(/ё/g,"е")
    .replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim();
}
function containsExactTerm(value: string, term: string): boolean {
  const t = normalized(term);
  return t.length >= 3 && (` ${normalized(value)} `).includes(` ${t} `);
}
export function proposeTechnicalRepresentativeV1(input: {
  authorizedRootId: string;
  verifiedNetworkIntermediateId: string;
  /** Exact title of an administrator-selected, authorized geographic leaf. */
  verifiedLocalityTitle: string;
  /** Complete intermediate hierarchy beneath authorizedRootId. */
  intermediates: RepresentativeNodeV1[];
  /** Complete set of active descendants of the found network/locality subbranch. */
  localityDescendants: RepresentativeNodeV1[];
  descendantsComplete: boolean;
  specificAddressStated: boolean;
}): RepresentativeResultV1 {
  const fail = (reason: string): RepresentativeResultV1 => ({
    contract: ARCTOR_TECHNICAL_REPRESENTATIVE_V1, status:"needs_review",
    leafId:null, localityBranchId:null,candidateCount:0,
    technicalRepresentative:false,actualStoreAddressConfirmed:false,reason,
  });
  if (!input.authorizedRootId || !input.verifiedNetworkIntermediateId ||
      !input.verifiedLocalityTitle.trim()) return fail("REP_MISSING_VERIFIED_NETWORK_OR_LOCALITY");
  if (input.specificAddressStated) return fail("REP_EXPLICIT_STORE_ADDRESS_REQUIRES_EXACT_LEAF");
  if (!input.descendantsComplete) return fail("REP_DESCENDANTS_INCOMPLETE");
  const nodes = new Map<string,RepresentativeNodeV1>();
  for (const node of input.intermediates) {
    if (!node.id || nodes.has(node.id) || node.role !== "intermediate") return fail("REP_INTERMEDIATE_SET_INVALID");
    nodes.set(node.id,node);
  }
  const belongs = (id:string, root:string):boolean => {
    let current:string|null=id;
    const seen=new Set<string>();
    while(current){
      if(seen.has(current)) return false;
      seen.add(current);
      if(current===root) return true;
      current=nodes.get(current)?.parentId??null;
    }
    return false;
  };
  if (!nodes.has(input.authorizedRootId) || !nodes.has(input.verifiedNetworkIntermediateId) ||
      !belongs(input.verifiedNetworkIntermediateId,input.authorizedRootId)) {
    return fail("REP_NETWORK_OUTSIDE_AUTHORIZED_BRANCH");
  }
  const matches=input.intermediates.filter((node)=>
    node.id!==input.verifiedNetworkIntermediateId &&
    belongs(node.id,input.verifiedNetworkIntermediateId) &&
    containsExactTerm(node.title,input.verifiedLocalityTitle));
  if(matches.length!==1) return fail(matches.length===0?
    "REP_CITY_SUBBRANCH_NOT_FOUND":"REP_MULTIPLE_CITY_SUBBRANCHES");
  const localityBranch=matches[0];
  const found=new Map<string,RepresentativeNodeV1>([
    ...input.intermediates.map((node)=>[node.id,node] as const),
    ...input.localityDescendants.map((node)=>[node.id,node] as const),
  ]);
  const leafIsUnderLocality=(id:string):boolean=>{
    let current:string|null=id;
    const seen=new Set<string>();
    while(current){
      if(seen.has(current))return false;
      seen.add(current);
      if(current===localityBranch.id)return true;
      current=found.get(current)?.parentId??null;
    }
    return false;
  };
  // The input must contain no outsiders. The calling server fetches just this subtree.
  if(input.localityDescendants.some(node=>!leafIsUnderLocality(node.id))){
    return fail("REP_DESCENDANT_OUTSIDE_VERIFIED_CITY_BRANCH");
  }
  const candidates=input.localityDescendants
    .filter((node)=>node.role==="leaf" && leafIsUnderLocality(node.id))
    .sort((a,b)=>a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  if(!candidates.length)return fail("REP_CITY_SUBBRANCH_HAS_NO_ACTIVE_LEAVES");
  return {
    contract: ARCTOR_TECHNICAL_REPRESENTATIVE_V1,
    status:"proposed",leafId:candidates[0].id,
    localityBranchId:localityBranch.id,candidateCount:candidates.length,
    technicalRepresentative:true,actualStoreAddressConfirmed:false,
    reason:"REP_STABLE_LOWEST_ID_IN_VERIFIED_NETWORK_CITY_SUBBRANCH",
  };
}
