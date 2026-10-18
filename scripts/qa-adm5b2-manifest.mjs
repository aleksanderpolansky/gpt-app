// ADM-5B.2: pure contract tests. Node >= 22.16 with --experimental-strip-types.
import assert from "node:assert/strict";
import { buildAdminContextManifestV1 } from "../src/lib/admin-execution/contextManifestV1.ts";
const proto = {
 contract: "ARCTOR_ADM5B1_CONTEXT_PREVIEW_READ_ONLY_V1", mode: "admin_preview_only",
 caseCode: "ADM-000001", caseId: "11111111-1111-4111-8111-111111111111",
 assignmentId: "22222222-2222-4222-8222-222222222222",
 roleCode: "engineering", taskCode: "commercial_fact_preflight",
 sourceVerification: "verified_exact_public_text", previewConstructed: true,
 agentContextApproved: false, agentExecutionPermitted: false, dbWritesPerformed: false, modelCallsPerformed: false,
 sections: [
  { sourceType: "case", reference: "ADM-000001", label: "Дело", text: "test case" },
  { sourceType: "assignment", reference: "2222", label: "Поручение", text: "test assignment" },
  { sourceType: "public_source", reference: "source1", label: "Публично", text: "public notice" }
 ],
 documentsSelected: [], documentsExcluded: [{ id: "ADR-DRAFT", version: "v1", reason: "not_approved" }],
 reasons: [{ code: "NO_APPROVED_INSTRUCTIONS", certainty: "confirmed", humanText: "", nextAction: "" }],
 estimate: { characters: 200, tokensApproxMin: 40, tokensApproxMax: 100,
   basis: "character_heuristic_not_billing" }
};
const m = buildAdminContextManifestV1(proto);
assert.equal(m.contract,"ARCTOR_ADM5B2_CONTEXT_MANIFEST_READ_ONLY_V1");
assert.equal(m.entries.length,3);
assert.ok(m.entries.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));
assert.equal(buildAdminContextManifestV1(proto).digestSha256,m.digestSha256);
assert.equal(buildAdminContextManifestV1(proto,m.digestSha256).comparison.result,"unchanged");
const changed = structuredClone(proto); changed.sections[2].text="different";
assert.equal(buildAdminContextManifestV1(changed,m.digestSha256).comparison.result,"changed");
assert.notEqual(buildAdminContextManifestV1(changed).digestSha256,m.digestSha256);
assert.equal(m.outboundAuthorized,false);assert.equal(m.agentExecutionPermitted,false);
assert.ok(!m.documentsIncluded.length && m.documentsExcluded[0].reason==="not_approved");
const unverified = structuredClone(proto);unverified.sourceVerification="not_public";
assert.throws(()=>buildAdminContextManifestV1(unverified),/UNVERIFIED_PUBLIC_SOURCE_IN_PREVIEW/);
const oversized = structuredClone(proto);oversized.estimate.characters=8001;
assert.ok(buildAdminContextManifestV1(oversized).blockingReasons.includes("CONTEXT_TOO_LARGE"));
const spoofed = structuredClone(proto);spoofed.agentExecutionPermitted=true;
assert.throws(()=>buildAdminContextManifestV1(spoofed),/UPSTREAM_PREVIEW_INVARIANT_FAILED/);
assert.throws(()=>buildAdminContextManifestV1(proto,"no"),/INVALID_PREVIOUS_DIGEST/);
const missing = structuredClone(proto);missing.sections=missing.sections.slice(1);
assert.throws(()=>buildAdminContextManifestV1(missing),/REQUIRED_CASE_OR_ASSIGNMENT_MISSING/);
const badDoc=structuredClone(proto);
badDoc.sections.push({sourceType:"approved_instruction",reference:"ADR-X@v1",label:"Instructions",text:"Brief"});
assert.throws(()=>buildAdminContextManifestV1(badDoc),/UNVERIFIED_INSTRUCTION_SECTION/);
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(path.join(repo,"src/app/api/admin/management/agent-context/manifest/route.ts"),"utf8");
assert.ok(route.includes('requirePlatformAdmin({ allowedRoles: ["owner", "admin"] })'));
assert.ok(route.includes('await requirePlatformAdmin') && route.includes('export async function GET'));
assert.ok(!/export async function (POST|PUT|PATCH|DELETE)/.test(route));
const page = fs.readFileSync(path.join(repo,"src/app/admin/agent-context/manifest/page.tsx"),"utf8");
assert.ok(page.includes('requirePlatformAdmin') && page.includes('buildAdminContextManifestV1'));
console.log("ARCTOR_ADM5B2_CONTRACT_TESTS_PASS_17");
