const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const crypto=require("node:crypto");
const ts=require(path.join(process.cwd(),"node_modules","typescript"));
const src=fs.readFileSync(path.join(process.cwd(),"src/lib/admin-execution/contextQualityV1.ts"),"utf8");
const page=fs.readFileSync(path.join(process.cwd(),"src/app/admin/agent-context/quality/page.tsx"),"utf8");
const client=fs.readFileSync(path.join(process.cwd(),"src/app/admin/agent-context/quality/CostSandbox.tsx"),"utf8");
for(const [code,kind] of [[src,ts.ScriptKind.TS],[page,ts.ScriptKind.TSX],[client,ts.ScriptKind.TSX]]) {
 const sf=ts.createSourceFile("test.tsx",code,ts.ScriptTarget.Latest,true,kind);
 assert.equal(sf.parseDiagnostics.length,0,"typescript syntax errors: "+sf.parseDiagnostics.map(x=>x.messageText).join("; "));
}
const sha=x=>crypto.createHash("sha256").update(x,"utf8").digest("hex");
function mockManifest(preview){
 const entries=preview.sections.map((s,i)=>({ordinal:i,sourceType:s.sourceType,sourceRef:s.reference,sha256:sha(s.text),chars:s.text.length}));
 const canon=JSON.stringify({entries,docs:preview.documentsExcluded,blocks:preview.reasons});
 return {digestSha256:sha(canon),documentsIncluded:[],documentsExcluded:preview.documentsExcluded,
  blockingReasons:preview.reasons,sourceVerification:"verified_exact_public_text",
  totals:{sectionCount:entries.length,characters:preview.estimate.characters,
    withinCharLimit:true,tokensApproxMin:246,tokensApproxMax:617}};
}
function mockFrozen(preview){
 const manifest=mockManifest(preview);
 const sections=preview.sections.map((s,ordinal)=>({...s,ordinal,sha256:sha(s.text)}));
 const frozenJson=JSON.stringify({contract:"ARCTOR_ADM5B3_INTERNAL_SNAPSHOT_V1",manifest,sections});
 return {manifestDigest:manifest.digestSha256,frozenJson,frozenDigest:sha(frozenJson)};
}
const commonjs=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const moduleObj={exports:{}};
const requireMock=x=>x==="node:crypto"?crypto:x.includes("contextManifest")?{buildAdminContextManifestV1:mockManifest}:x.includes("contextSnapshot")?{makeInternalSnapshot:mockFrozen}:null;
vm.runInNewContext(`(function(require,module,exports,Buffer){${commonjs}\n})`,{console})(requireMock,moduleObj,moduleObj.exports,Buffer);
const {buildContextQualityV1,calculateDraftCost}=moduleObj.exports;
let n=0;const ok=(test)=>{assert(test);n++};
const preview={caseCode:"ADM-000001",assignmentId:"e6036022-146e-4eca-bacf-3af379858f92",roleCode:"engineering",taskCode:"commercial_fact_preflight",
 sections:[
  {sourceType:"case",reference:"ADM-000001",text:"Case content"},
  {sourceType:"assignment",reference:"e6036022-146e-4eca-bacf-3af379858f92",text:"Assignment content"},
  {sourceType:"public_source",reference:"87ee",text:"Public offer text"}
 ],documentsExcluded:[],reasons:["NO_APPROVED_INSTRUCTIONS","RUNTIME_NOT_IMPLEMENTED"],estimate:{characters:52}};
const base=buildContextQualityV1(preview);
ok(base.contract==="ARCTOR_ADM5B4_CONTEXT_QUALITY_READ_ONLY_V1");
ok(base.sectionCount===3);ok(base.snapshot===null);ok(base.agentExecutionPermitted===false);
ok(base.dbWritesPerformed===false);ok(base.modelCallsPerformed===false);ok(base.outboundAuthorized===false);
ok(base.sections.every(s=>s.required));ok(base.frozenBytes>0);
ok(base.blockingReasons.includes("NO_APPROVED_INSTRUCTIONS"));
const frozen=mockFrozen(preview);
const saved={id:"test",version_num:1,manifest_digest:frozen.manifestDigest,snapshot_digest:frozen.frozenDigest,snapshot_text:frozen.frozenJson,captured_at:"2026-10-17T10:00:00Z"};
const match=buildContextQualityV1(preview,saved,"reviewed_internal");
ok(match.snapshot.integrity==="valid");ok(match.snapshot.changed==="none");ok(match.snapshot.currentManifestMatches===true);
const onlyPolicy={...preview,documentsExcluded:[{id:"document",version:"v2",reason:"not_approved"}]};
const meta=buildContextQualityV1(onlyPolicy,saved);
ok(meta.snapshot.changed==="metadata_or_exclusions");ok(meta.includedTextDigest===base.includedTextDigest);
ok(meta.policyMetadataDigest!==base.policyMetadataDigest);ok(meta.blockingReasons.includes("SAVED_MANIFEST_STALE"));
const revised={...preview,sections:[...preview.sections.slice(0,2),{...preview.sections[2],text:"Different text"}]};
const changed=buildContextQualityV1(revised,saved);
ok(changed.snapshot.changed==="included_text");
const bad=buildContextQualityV1(preview,{...saved,snapshot_digest:"a".repeat(64)});
ok(bad.snapshot.integrity==="invalid");ok(bad.snapshot.changed==="unknown");
const corrupt=buildContextQualityV1(preview,{...saved,snapshot_text:"broken json"});
ok(corrupt.snapshot.integrity==="invalid");
const costs=calculateDraftCost({estimatedInputLow:1000,estimatedInputHigh:2000,overheadTokens:100,outputTokens:500,inputUsdPerMillion:2,outputUsdPerMillion:4});
ok(Math.abs(costs.lowUsd-0.0042)<1e-10);ok(Math.abs(costs.highUsd-0.0062)<1e-10);
assert.throws(()=>calculateDraftCost({estimatedInputLow:2000,estimatedInputHigh:1000,overheadTokens:0,outputTokens:0,inputUsdPerMillion:0,outputUsdPerMillion:0}));n++;
assert.throws(()=>calculateDraftCost({estimatedInputLow:-1,estimatedInputHigh:100,overheadTokens:0,outputTokens:0,inputUsdPerMillion:0,outputUsdPerMillion:0}));n++;
console.log(`ARCTOR_ADM5B4_FUNCTIONAL_CONTRACT_PASS_${n}`);
