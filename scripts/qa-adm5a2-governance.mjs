import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const repo = path.resolve(process.argv[2] || ".");
const code = (p) => fs.readFileSync(path.join(repo,p),"utf8");
const model = await import(pathToFileURL(path.join(repo,"src/lib/admin-execution/contractV1.ts")).href);
assert.equal(model.ADM5A2_ROLE_CODES.length,8);
assert.equal(new Set(model.ADM5A2_ROLE_CODES).size,8);
assert.deepEqual(model.ADM5A2_CURRENT_CAPABILITIES,["inspect"]);
assert.equal(model.ADM5A2_CAPABILITIES.length,5);
assert.equal(model.ADM5A2_TASKS.length,7);
assert.equal(new Set(model.ADM5A2_TASKS.map(t=>t.taskCode)).size,7);
const base = { roleCode:"ai", isActive:true, agentExecutionEnabled:false };
const testCases = [
 {name:"no_docs", role:base,task:"agent_architecture_review",docs:[]},
 {name:"unknown_task",role:base,task:"unknown",docs:[]},
 {name:"unknown_role",role:{roleCode:"other",isActive:null,agentExecutionEnabled:null},task:"agent_context_assembly",docs:[]},
 {name:"inactive_role",role:{roleCode:"ai",isActive:false,agentExecutionEnabled:false},task:"agent_architecture_review",docs:[]},
 {name:"human_route_risk",role:{roleCode:"ai",isActive:true,agentExecutionEnabled:true},task:"agent_architecture_review",docs:[]},
 {name:"unapproved",role:base,task:"agent_architecture_review",docs:[{id:"a",version:"v1",approvalStatus:"proposed",agentEnabled:true,roleCodes:["ai"],taskCodes:["agent_architecture_review"],sourceSha256:"a".repeat(64)}]},
 {name:"approved_doc_still_blocked",role:base,task:"agent_architecture_review",docs:[{id:"a",version:"v1",approvalStatus:"approved",agentEnabled:true,roleCodes:["ai"],taskCodes:["agent_architecture_review"],sourceSha256:"a".repeat(64)}]},
 {name:"wrong_task_doc",role:base,task:"agent_architecture_review",docs:[{id:"a",version:"v1",approvalStatus:"approved",agentEnabled:true,roleCodes:["ai"],taskCodes:["unknown"],sourceSha256:"a".repeat(64)}]},
];
for(const test of testCases){
 const result=model.evaluateGovernance(test.role,test.task,test.docs,{ registrationVerified:true,assignmentVerified:true,humanAuthorizationVerified:true,contextCompilerApproved:true,aiBillingPolicyApproved:true,secureRunAuditReady:true });
 assert.equal(result.agentRunPermitted,false,test.name);
 assert.equal(result.contextReady,false,test.name);
 assert.deepEqual(result.currentCapabilities,["inspect"],test.name);
 assert(result.reasons.some(r=>r.code==="RUNTIME_NOT_IMPLEMENTED"),test.name);
}
assert(model.evaluateGovernance(testCases[4].role,testCases[4].task,[]).humanAssignmentRegressionRisk);
assert.equal(model.evaluateGovernance(testCases[6].role,testCases[6].task,testCases[6].docs).authorizedDocuments,1);
assert.equal(model.ADM5A2_DRAFT_TRANSITIONS.approved.length,0);
assert(!model.ADM5A2_DRAFT_TRANSITIONS.needs_revision.includes("running"));
assert(code("src/app/admin/agent-governance/page.tsx").includes('requirePlatformAdmin({ allowedRoles: ["owner", "admin", "viewer"] })'));
assert(!code("src/app/admin/agent-governance/page.tsx").includes("fetch("));
assert(code("src/lib/admin-knowledge/library.server.ts").includes('"id": "ADR-ADM5A2-001"'));
assert(code("src/app/admin/agent-readiness/page.tsx").includes('/admin/agent-governance'));
assert(code("supabase/diagnostics/arctor_admin_adm5a2_precheck_readonly.sql").includes("READ_ONLY"));
console.log(`ADM5A2_STATIC_CONTRACT_TESTS_PASS_${testCases.length}`);
