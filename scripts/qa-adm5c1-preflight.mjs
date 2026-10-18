import assert from "node:assert/strict";
import { evaluateAgentPreflightV1 } from "../src/lib/admin-execution/executionPreflightV1.ts";
const base = {
  preview: { contract: "ARCTOR_ADM5B1_CONTEXT_PREVIEW_READ_ONLY_V1", mode: "admin_preview_only",
    previewConstructed: true, agentExecutionPermitted: false, dbWritesPerformed: false, modelCallsPerformed: false,
    caseCode: "ADM-000001", assignmentId: "e6036022-146e-4eca-bacf-3af379858f92", roleCode: "engineering", taskCode: "commercial_fact_preflight",
    sourceVerification: "verified_exact_public_text", reasons: [], documentsSelected: [] },
  quality: { contract: "ARCTOR_ADM5B4_CONTEXT_QUALITY_READ_ONLY_V1", outboundAuthorized: false,
    agentExecutionPermitted: false, dbWritesPerformed: false, modelCallsPerformed: false,
    caseCode: "ADM-000001", assignmentId: "e6036022-146e-4eca-bacf-3af379858f92", roleCode: "engineering", taskCode: "commercial_fact_preflight",
    includedDocuments: [], withinLimit: true, characters: 1233, frozenBytes: 4900, sectionCount: 3,
    snapshot: { id: "snapshot", version: 1, integrity: "valid", currentManifestMatches: true, changed: "none", frozenDigestMatches: true, embeddedDigestMatches: true, sectionHashesMatch: true } },
  role: { isActive: true, agentExecutionEnabled: false }, latestDecision: "reviewed_internal", eventHistoryComplete: true,
};
const clone = () => structuredClone(base);
const r = evaluateAgentPreflightV1(clone());
assert.equal(r.finalDisposition, "EXECUTION_FORBIDDEN");
assert.equal(r.agentExecutionPermitted, false);
assert.equal(r.outboundAuthorized, false);
assert.equal(r.dbWritesPerformed, false);
assert.equal(r.modelCallsPerformed, false);
assert.equal(r.readyForInternalReview, true);
assert.equal(r.gates.length, 13);
assert.equal(r.gates.find(x => x.code === "OUTBOUND_POLICY")?.state, "blocked");
assert.equal(r.gates.find(x => x.code === "EXECUTION_RUNTIME")?.state, "blocked");
assert.equal(r.gates.find(x => x.code === "BUDGET_AND_MODEL")?.state, "unknown");
for(const mutate of [
  x=>{x.quality.snapshot.integrity="invalid"},
  x=>{x.quality.snapshot.currentManifestMatches=false},
  x=>{x.quality.snapshot.changed="included_text"},
  x=>{x.latestDecision="rejected"},
  x=>{x.eventHistoryComplete=false},
  x=>{x.role.agentExecutionEnabled=true},
  x=>{x.role.isActive=false},
  x=>{x.preview.sourceVerification="unavailable"},
  x=>{x.preview.reasons=[{code:"ASSIGNMENT_CASE_MISMATCH"}]},
  x=>{x.quality.characters=8001},
  x=>{x.quality.frozenBytes=32001},
  x=>{x.quality.snapshot=null},
]) {
  const x=clone();mutate(x);const z=evaluateAgentPreflightV1(x);
  assert.equal(z.agentExecutionPermitted,false);assert.equal(z.finalDisposition,"EXECUTION_FORBIDDEN");
  assert.ok(z.blocked>0 || z.unknown>0);
}
for(const mutate of [
  x=>{x.quality.caseCode="ADM-999999"},
  x=>{x.quality.outboundAuthorized=true},
  x=>{x.preview.agentExecutionPermitted=true},
  x=>{x.quality.dbWritesPerformed=true},
]) {const x=clone();mutate(x);assert.throws(()=>evaluateAgentPreflightV1(x),/PREFLIGHT_UPSTREAM_INVARIANT_FAILED/);}
console.log("ARCTOR_ADM5C1_PURE_QA_PASS_17_CASES");
