import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const repo=process.cwd();
const file=x=>fs.readFileSync(path.join(repo,x),"utf8");
const quality=file("src/lib/admin-execution/contextQualityV1.ts");
const page=file("src/app/admin/agent-context/quality/page.tsx");
const costs=file("src/app/admin/agent-context/quality/CostSandbox.tsx");
const library=file("src/lib/admin-knowledge/library.server.ts");
const doc=file("docs/admin-library/ADR-ADM5B4-001.md");
const checks=[
 [quality.includes("ARCTOR_ADM5B4_CONTEXT_QUALITY_READ_ONLY_V1"),"contract"],
 [quality.includes("contentFingerprint"),"text digest"],
 [quality.includes("policyMetadataDigest"),"policy digest"],
 [quality.includes("frozenDigestMatches"),"full JSON integrity"],
 [quality.includes("embeddedDigestMatches"),"embedded integrity"],
 [quality.includes("sectionHashesMatch"),"section integrity"],
 [quality.includes("metadata_or_exclusions"),"metadata changes"],
 [quality.includes("SAVED_MANIFEST_STALE"),"stale reason"],
 [quality.includes("STORED_SNAPSHOT_INTEGRITY_FAILED"),"integrity failed reason"],
 [quality.includes("agentExecutionPermitted: false"),"no agent"],
 [quality.includes("dbWritesPerformed: false"),"no writes"],
 [page.includes("requirePlatformAdmin"),"server admin guard"],
 [page.includes("readAdminContextPreviewV1"),"verified preview"],
 [page.includes(".limit(1)"),"bounded snapshot"],
 [page.includes("no-store")===false,"no fabricated browser cache policy"],
 [page.includes("CostSandbox"),"client estimate component"],
 [costs.includes("inputRate") && costs.includes("outputRate"),"manual prices"],
 [!costs.includes("fetch(") && !page.includes("fetch("),"no outbound fetch"],
 [!page.includes(".insert(") && !page.includes(".update(") && !page.includes(".rpc("),"read only"],
 [doc.includes("не может")===false || doc.includes("провер"),"documentation"],
 [library.includes("ADR-ADM5B4-001"),"library registered"],
 [library.includes('"agentEnabled": false') || library.includes('"agentEnabled": false'),"library no agent enable"],
 [page.includes("Снимки ADM-5B.3"),"back link"],
];
for(const [pass,label] of checks)assert(pass,`FAILED: ${label}`);
console.log(`ARCTOR_ADM5B4_QA_PASS_${checks.length}`);
