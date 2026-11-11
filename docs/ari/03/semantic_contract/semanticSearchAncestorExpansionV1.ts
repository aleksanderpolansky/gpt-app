/** ARCTor M0102 design-only contract. Not imported into production. */
export type AncestorExpansionEvidence = {
  evidenceClass: 'ancestor_expansion';
  valueObjectId: string;
  seedObjectId: string;
  depth: 1|2|3;
  verifiedPath: string[];
  provenance: 'verified_structural_parent';
  catalogSnapshotHash: string;
  selectionState: 'UNCONFIRMED';
};
export type VerifiedStructuralEdge = {
  childId: string; parentId: string; relationType: 'STRUCTURAL_PARENT';
  structuralEdgeVerified: true; parentAuthorized: true;
  parentActiveVerified: true; parentLocaleVerified: true;
  parentSourceVerified: true; snapshotVerified: true;
};
export type AncestorExpansionBounds = {maxDepth: 1|2|3; maxEdges: number; maxCandidates: number; maxPathsPerAncestor: 1|2|3|4};
export const ancestorExpansionDesignOnly = Object.freeze({
  mode: 'suggest_by_text', selectionState: 'UNCONFIRMED',
  source: 'verified_structural_parent', directExact: false,
  maxDepthCeiling: 3, maxEdgesCeiling: 64, maxCandidatesCeiling: 20,
  noImplicitParent: true, noAutoSelection: true, authorizationBeforeTraverse: true,
});
