/**
 * ARCTor X04-007 AI-delegated implementation pilot.
 * Initial authority: owner delegated AI curator to choose reasonable reversible rules.
 * APPROVED is local code policy, not evidence of a DB-governed registry or scientific truth.
 */
export const GRAPH_ANCESTRY_RULE_PILOT_V1 = Object.freeze({
  ruleId: 'hierarchy_parent_ancestor_transitive_v1',
  ruleVersion: '1',
  approvalMode: 'AI_CURATOR_OWNER_DELEGATED',
  status: 'APPROVED_FOR_LOCAL_PILOT',
  origin: 'ARCTOR_OWNER_DELEGATION_2026_11_08',
  maxDepth: 2,
  premise: 'value_objects.child.parent_value_object_id = value_objects.parent.id',
  conclusion: 'ancestor_of(descendant, ancestor)',
  scope: 'same_authorized_system_or_actor_scope',
  derivationStandard: 'W3C_OWL2_TRANSITIVE_OBJECT_PROPERTY_ANALOGUE',
  provenanceStandard: 'W3C_PROV_O_ANALOGUE',
  verifiedMeaning: 'RULE_APPLIED_TO_VISIBLE_ACTIVE_DB_HIERARCHY_ONLY',
  notClaimed: 'scientific_truth_or_full_graph_inheritance',
});
