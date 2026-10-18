import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const root = path.resolve(process.argv[2] || ".");
const moduleUrl = pathToFileURL(path.join(root, "src/lib/admin-execution/contextContractV1.ts"));
const { compileAdminContextPreviewV1: compile } = await import(moduleUrl.href);
const ids = {
  case: "17b29e71-f2b8-477e-92cc-5aa0aff45718",
  assign: "a2200000-0000-4000-8000-000000000002",
  source: "87ee8565-dfb7-4e18-a171-576b124f0ba3"
};
const base = () => ({
  caseRecord: { id: ids.case, caseCode: "ADM-000001", title: "Проверка цены",
    description: "Проверить price и money_value", status: "assigned", ownerRoleCode: "engineering",
    sourceSystem: "arctor", sourceEntityKind: "commercial_activity_event", sourceExternalId: ids.source,
    nextExpectedResult: "Технический отчёт" },
  assignment: { id: ids.assign, caseId: ids.case, recipientRoleCode: "engineering", status: "new",
    assignmentText: "Исследовать коммерческую активность", requiredResult: "Отчёт о цене", recipientAgentCode: null },
  role: { roleCode: "engineering", isActive: true, agentExecutionEnabled: false },
  taskCode: "commercial_fact_preflight", permittedRoles: ["engineering", "quality", "semantic", "commercial"],
  publicSource: { sourceId: ids.source, sourceMessageId: ids.assign,
    verification: "verified_exact_public_text", excerpt: "Куриное филе по 12 долларов", processingStatus: "analysis_ready" },
  documents: [{ id: "DRAFT-1", version: "1", approvalStatus: "proposed", agentEnabled: false,
    roleCodes: ["engineering"], taskCodes: ["commercial_fact_preflight"], sourceSha256: "a".repeat(64), agentBrief: "Демо" }]
});
function test(modify, fn) {
  const x = base(); modify(x); const output = compile(x);
  assert.equal(output.agentContextApproved, false); assert.equal(output.agentExecutionPermitted, false);
  assert.equal(output.dbWritesPerformed, false); assert.equal(output.modelCallsPerformed, false);
  fn(output);
}
test(() => {}, p => { assert.equal(p.sections.length, 3); assert.equal(p.documentsSelected.length, 0); assert(p.reasons.some(r => r.code === "NO_APPROVED_INSTRUCTIONS")); });
test(x => { x.publicSource.verification = "verified_public_metadata_only"; x.publicSource.excerpt = null; },
  p => { assert.equal(p.sections.some(s => s.sourceType === "public_source"), false); assert(p.reasons.some(r => r.code === "SOURCE_TEXT_NOT_PROVEN")); });
test(x => { x.assignment.caseId = "00000000-0000-4000-8000-000000000000"; },
  p => assert(p.reasons.some(r => r.code === "ASSIGNMENT_CASE_MISMATCH")));
test(x => { x.permittedRoles = ["commercial"]; },
  p => assert(p.reasons.some(r => r.code === "TASK_ROLE_NOT_PERMITTED")));
test(x => { x.role.agentExecutionEnabled = true; },
  p => assert(p.reasons.some(r => r.code === "HUMAN_ASSIGNMENT_REGRESSION_RISK")));
test(x => { x.documents[0].approvalStatus = "approved"; x.documents[0].agentEnabled = true; },
  p => { assert.equal(p.documentsSelected.length, 1); assert.equal(p.agentExecutionPermitted, false); });
test(x => { x.documents[0].approvalStatus = "approved"; x.documents[0].agentEnabled = true; x.documents[0].sourceSha256 = "bad"; },
  p => assert(p.reasons.some(r => r.code === "NO_APPROVED_INSTRUCTIONS")));
test(x => { x.assignment.assignmentText = "X".repeat(12000); },
  p => assert(p.reasons.some(r => r.code === "CONTEXT_TOO_LARGE")));
test(x => { x.publicSource.excerpt = "X".repeat(1201); },
  p => assert(p.reasons.some(r => r.code === "SOURCE_EXCERPT_TOO_LARGE")));
const route = fs.readFileSync(path.join(root, "src/app/api/admin/management/agent-context/route.ts"), "utf8");
const server = fs.readFileSync(path.join(root, "src/lib/admin-execution/contextPreview.server.ts"), "utf8");
assert.match(route, /export async function GET/);
assert.doesNotMatch(route, /export async function POST/);
assert.match(route, /allowedRoles: \["owner", "admin"\]/);
assert.match(server, /"public"/);
assert.match(server, /"active"/);
assert.doesNotMatch(server + route, /\.rpc\(|\.insert\(|\.upsert\(|\.delete\(|openai\.com|\.responses\.create\(/i);
console.log("ARCTOR_ADM5B1_QA_PASS_10_CHECKS");
