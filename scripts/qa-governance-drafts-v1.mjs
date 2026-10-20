import fs from "node:fs";
import assert from "node:assert/strict";
const files = [
  "src/lib/ai/governanceDraftStorageV1.ts",
  "src/app/api/admin/ai-governance/drafts/route.ts",
  "src/app/admin/ai-governance/GovernanceDraftsClient.tsx",
  "src/app/admin/ai-governance/GovernanceClient.tsx",
];
const read = path => fs.readFileSync(path,"utf8");
const contents = Object.fromEntries(files.map(file=>[file,read(file)]));
let passed=0;
const test=(label,fn)=>{assert.ok(fn(),label);passed++;};
const store=contents[files[0]],api=contents[files[1]],ui=contents[files[2]],page=contents[files[3]];
test("draft namespace",()=>store.includes('"governance_draft__"'));
test("draft validation",()=>store.includes("validateGovernanceDraftDocument"));
test("no runtime activation",()=>api.includes("runtimeActivation: false"));
test("no model debit",()=>api.includes("aiEurDebited: false"));
test("no model calls",()=>api.includes("modelCallsPerformed: false"));
test("origin checked",()=>api.includes("ORIGIN_MISMATCH"));
test("admin read guard",()=>api.includes('"viewer"'));
test("admin write guard",()=>api.includes('allowedRoles: ["owner", "admin"]'));
test("atomic RPC",()=>api.includes("arctor_ai_governance_draft_save_v1"));
test("inactive only",()=>api.includes('row.status === "inactive"'));
test("revision precondition",()=>api.includes("expectedRevision"));
test("history endpoint",()=>api.includes("ai_processing_instruction_revisions"));
test("save control",()=>ui.includes("Сохранить новую ревизию"));
test("history control",()=>ui.includes("Восстановить"));
test("scope disclaimer",()=>ui.includes("НЕ создаёт персональное правило"));
test("page linkage",()=>page.includes("GovernanceDraftsClient"));
const sql=read("supabase/manual/ARCTOR_AI_GOVERNANCE_MVP2_ATOMIC_DRAFT_RPC_20261020.sql");
test("transaction-scoped lock",()=>sql.includes("pg_advisory_xact_lock"));
test("SQL SECURITY INVOKER",()=>sql.includes("SECURITY INVOKER"));
test("SQL service only",()=>sql.includes("TO service_role"));
test("SQL revokes browser",()=>sql.includes("FROM authenticated"));
test("SQL history insertion",()=>sql.includes("ai_processing_instruction_revisions"));
console.log(`ARCTOR_AI_GOVERNANCE_DRAFTS_STATIC_TESTS_PASS ${passed}/${passed}`);
