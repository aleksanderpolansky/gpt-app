import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const root = process.cwd();
const src = path.join(root,"src/lib/admin-execution");
const dir = fs.mkdtempSync(path.join(os.tmpdir(),"arctor-adm5b3-test-"));
try {
  for (const file of ["contextSnapshotV1.ts","contextManifestV1.ts","contextContractV1.ts"]) {
    let content = fs.readFileSync(path.join(src,file),"utf8");
    if (file==="contextSnapshotV1.ts") content=content.replace('"./contextManifestV1"','"./contextManifestV1.ts"');
    fs.writeFileSync(path.join(dir,file),content);
  }
  const { makeInternalSnapshot, isSha256 } = await import(pathToFileURL(path.join(dir,"contextSnapshotV1.ts")).href);
  const preview = {
    contract: "ARCTOR_ADM5B1_CONTEXT_PREVIEW_READ_ONLY_V1",mode:"admin_preview_only",
    caseCode:"ADM-000001",caseId:"11111111-1111-4111-8111-111111111111",
    assignmentId:"22222222-2222-4222-8222-222222222222",roleCode:"engineering",taskCode:"commercial_fact_preflight",
    sourceVerification:"verified_exact_public_text",previewConstructed:true,
    agentContextApproved:false,agentExecutionPermitted:false,dbWritesPerformed:false,modelCallsPerformed:false,
    sections:[
      {sourceType:"case",reference:"ADM-000001",label:"Дело",text:"test case"},
      {sourceType:"assignment",reference:"2222",label:"Поручение",text:"test assignment"},
      {sourceType:"public_source",reference:"source1",label:"Публично",text:"public notice"},
    ],
    documentsSelected:[],documentsExcluded:[{id:"DRAFT",version:"v1",reason:"not_approved"}],
    reasons:[{code:"NO_APPROVED_INSTRUCTIONS",certainty:"confirmed",humanText:"",nextAction:""}],
    estimate:{characters:200,tokensApproxMin:40,tokensApproxMax:100,basis:"character_heuristic_not_billing"},
  };
  const first=makeInternalSnapshot(preview);const second=makeInternalSnapshot(preview);
  assert.equal(first.manifestDigest,second.manifestDigest); // #1
  assert.equal(first.frozenDigest,second.frozenDigest); // #2
  assert.equal(first.sectionCount,3); // #3
  assert.equal(JSON.parse(first.frozenJson).sections[2].text,"public notice"); // #4
  assert.ok(isSha256(first.frozenDigest)); // #5
  assert.ok(isSha256(first.manifestDigest)); // #6
  assert.ok(first.blockingReasons.includes("OUTBOUND_POLICY_NOT_APPROVED")); // #7
  assert.equal(JSON.parse(first.frozenJson).manifest.outboundAuthorized,false); // #8
  const changed=structuredClone(preview);changed.sections[2].text="modified public notice";
  assert.notEqual(makeInternalSnapshot(changed).manifestDigest,first.manifestDigest); // #9
  const unverified=structuredClone(preview);unverified.sourceVerification="not_public";
  assert.throws(()=>makeInternalSnapshot(unverified),/UNVERIFIED_PUBLIC_SOURCE/); // #10
  const missing=structuredClone(preview);missing.sections=missing.sections.slice(0,2);
  assert.throws(()=>makeInternalSnapshot(missing),/VERIFIED_PUBLIC_SOURCE_REQUIRED/); // #11
  const oversized=structuredClone(preview);oversized.estimate.characters=8001;
  assert.throws(()=>makeInternalSnapshot(oversized),/CONTEXT_TOO_LARGE/); // #12
  const spoofed=structuredClone(preview);spoofed.agentExecutionPermitted=true;
  assert.throws(()=>makeInternalSnapshot(spoofed),/UPSTREAM_PREVIEW_INVARIANT_FAILED/); // #13
  const unrelated=structuredClone(preview);unrelated.reasons=[{code:"TASK_ROLE_NOT_PERMITTED",certainty:"confirmed",humanText:"",nextAction:""}];
  assert.throws(()=>makeInternalSnapshot(unrelated),/UNSAFE_PREVIEW_INVARIANT/);
  const post=fs.readFileSync(path.join(root,"src/app/api/admin/management/agent-context/snapshots/route.ts"),"utf8");
  assert.ok(post.includes("requirePlatformAdmin") && post.includes('allowedRoles: ["owner", "admin"]')); // #14
  assert.ok(post.includes('request.headers.get("origin")') && post.includes("ORIGIN_REJECTED")); // #15
  assert.ok(post.includes("readAdminContextPreviewV1") && post.includes("makeInternalSnapshot")); // #16
  assert.ok(post.includes('registered.data.assignment_id !== assignmentId') && post.includes('registered.data.case_id !== current.preview.caseId'));
  assert.ok(!post.includes("openai") && !post.includes("agent_execution_enabled") && !/export async function (PUT|PATCH|DELETE)/.test(post)); // #17
  const sql=fs.readFileSync(path.join(root,"supabase/migrations/20261017113000_arctor_admin_adm5b3_immutable_snapshots.sql"),"utf8");
  assert.ok(sql.includes("CREATE TABLE public.arctor_admin_context_snapshots_adm5b3_v1") && sql.includes("CREATE TABLE public.arctor_admin_context_snapshot_events_adm5b3_v1")); // #18
  assert.ok(sql.includes("ENABLE ROW LEVEL SECURITY") && sql.includes("BEFORE UPDATE OR DELETE OR TRUNCATE")); // #19
  assert.ok(sql.includes("REVOKE ALL ON FUNCTION") && sql.includes("SECURITY INVOKER")); // #20
  assert.ok(!/UPDATE\s+public\.arctor_admin_(?:cases|assignments|roles)_adm2_v1\b/i.test(sql)); // #21
  const ui=fs.readFileSync(path.join(root,"src/app/admin/agent-context/snapshots/page.tsx"),"utf8");
  assert.ok(ui.includes("requirePlatformAdmin") && ui.includes("isStale") && ui.includes("review_internal")); // #22
  console.log("ARCTOR_ADM5B3_STATIC_QA_PASS_24");
} finally { fs.rmSync(dir,{recursive:true,force:true}); }
