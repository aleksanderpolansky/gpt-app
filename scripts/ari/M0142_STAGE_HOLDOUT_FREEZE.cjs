'use strict';
/** M-0142 REVIEW. Freeze prior genuine evaluations and source/index fingerprints. No inference about independent holdout. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const CONTRACT='ARCTOR_ARI03_M0142_STAGE_HOLDOUT_SOURCE_INDEX_FREEZE_V1';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const stable=o=>Buffer.from(JSON.stringify(o,null,2)+'\n','utf8');
const must=(v,why)=>{if(!v)throw Error('M0142_FREEZE_'+why);};
const json=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\ufeff/,''));
function selectReportEvidence(report,approvedGold){
 must(approvedGold&&approvedGold.contract==='ARCTOR_M0121_OWNER_APPROVED_EXACT_TITLE_GOLD_SLICE_V1', 'M0121_GOLD_CONTRACT');
 must(Array.isArray(approvedGold.queries)&&approvedGold.queries.length===18&&
  Array.isArray(approvedGold.candidates)&&approvedGold.candidates.length===18,'M0121_EXACT_GOLD_COUNT');
 const exactGold=approvedGold.queries;
 must(new Set(exactGold.map(x=>x.id)).size===18,'M0121_EXACT_GOLD_DUPLICATES');
 must(report&&report.contract==='ARCTOR_ARI03_M0131_HOLDOUT_QUALITY_COMPARISON_V1','M0131_CONTRACT');
 must(report.queryCount===36&&report.exactQueryCount===18&&report.candidateCount===18,'M0131_CORPUS');
 must(report.ownerApprovedNotIndependentGold===true&&report.modelsRevalidatedAgainstM0121===true,'M0131_PROVENANCE');
 must(report.metrics&&report.perQuery&&Array.isArray(report.perQuery.ari02),'M0131_EVALUATIONS');
 const keys=Object.keys(report.perQuery);must(keys.length>=3&&keys.includes('ari02'),'VARIANTS');
 const root=report.perQuery.ari02;must(root.length===36,'BASELINE_36');
 const ids=root.map((r,i)=>{must(r&&typeof r.queryId==='string'&&r.queryId.length,'QUERY_ID_'+i);return r.queryId;});
 must(new Set(ids).size===36,'NO_DUPLICATE_CASE_IDS');
 // M0121 has 17 realon-exact-* IDs plus the legitimate 18th realon-variation-13 (EN walking).
 // Pin the *actual owner-approved Gold*, not an invented ID prefix convention.
 for(let i=0;i<18;i++){
  const g=exactGold[i],r=root[i];
  must(ids[i]===g.id&&r.locale===g.locale&&r.exact===true&&
   Array.isArray(r.expected)&&r.expected.length===1&&
   Array.isArray(g.relevantOnIds)&&g.relevantOnIds.length===1&&
   r.expected[0]===g.relevantOnIds[0],'EXACT_GOLD_ALIGNMENT_'+(i+1));
 }
 must(root.slice(18).every(r=>r.exact===false),'SEMANTIC_PILOT_EXACT_FLAG');
 const variants={};
 for(const key of keys){
  const rows=report.perQuery[key];must(Array.isArray(rows)&&rows.length===36,'RESULT_COUNT_'+key);
  must(rows.every((r,i)=>r.queryId===ids[i]),'QUERY_ORDER_'+key);
  for(let i=0;i<18;i++){
   const g=exactGold[i],r=rows[i];
   must(r.locale===g.locale&&r.exact===true&&Array.isArray(r.expected)&&
    r.expected.length===1&&r.expected[0]===g.relevantOnIds[0],'VARIANT_GOLD_ALIGNMENT_'+key+'_'+(i+1));
  }
  must(rows.slice(18).every(r=>r.exact===false),'VARIANT_SEMANTIC_FLAG_'+key);
  must(report.metrics[key]&&typeof report.metrics[key]==='object','METRICS_'+key);
  variants[key]={previousAggregateMetrics:report.metrics[key],stageExactSanity:rows.slice(0,18),
   holdoutSemanticOwnerApproved:rows.slice(18)};
 }
 const stage={contract:'ARCTOR_M0142_STAGE_EXACT_SANITY_SNAPSHOT_V1',labelSource:'M0131_APPROVED_NOT_INDEPENDENT',
  group:'FIRST_18_OWNER_EXACT_SANITY',queryCount:18,ids:ids.slice(0,18),models:Object.fromEntries(keys.map(k=>[k,variants[k].stageExactSanity]))};
 const holdout={contract:'ARCTOR_M0142_HOLDOUT_SEMANTIC_PILOT_SNAPSHOT_V1',
  group:'REMAINING_18_OWNER_APPROVED_SEMANTIC_NOT_BLIND_HOLDOUT',independentStatisticalHoldout:false,
  queryCount:18,ids:ids.slice(18),models:Object.fromEntries(keys.map(k=>[k,variants[k].holdoutSemanticOwnerApproved]))};
 return {stage,holdout,variants:keys.map(k=>({key:k,reportedMetrics:report.metrics[k]})),queryIds:ids};
}
function reviewChecks(r140,r141){
 must(r140&&r140.contract==='ARCTOR_ARI03_M0140_SLEEP_EPISODE_PHASE_DISTINCTION_REVIEW_V1','M0140_REPORT');
 must(r140.exactTargetsVerified===4&&r140.exactRankOne===true,'M0140_EXACT_COUNTS');
 must(Array.isArray(r140.cases)&&r140.cases.length>=4,'M0140_CASES');
 must(r140.cases.filter(x=>x.expectedUuid).every(x=>x.expectedUuid===x.actualTopUuid&&x.rank===1),'M0140_RANKS');
 must(r141&&r141.contract==='ARCTOR_ARI03_M0141_NEGATIVE_MATCH_REVIEW_V1','M0141_REPORT');
 must(r141.topicsChecked===5&&r141.qualityGate.blockingFalseCanonicalBoostObserved===false&&
  r141.qualityGate.approvedWalkingExactMisrouted===false&&r141.qualityGate.controlledBaselineNotWorsened===true,'M0141_GATE');
 must(r141.qualityGate.fullCatalogNegativeMatchesVerified===false&&r141.qualityGate.liveDiagnosticsE2e===false,'M0141_SCOPE');
 return {m0140FourApprovedExactRankOne:true,m0141FiveNegativeTopicsControlled:true,
  noNewBlockingRegressionAgainstPriorApprovedOfflineChecks:true,globalCatalogOrRlsVerified:false};
}
function walk(dir,rel,files,max=5000){
 if(!fs.existsSync(dir))return;
 for(const d of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
  if(d.name.startsWith('.')||['node_modules','.next','coverage','dist'].includes(d.name))continue;
  const rp=rel+'/'+d.name,full=path.join(dir,d.name);
  if(d.isDirectory())walk(full,rp,files,max);
  else if(d.isFile()){
   must(!rp.includes('..'),'UNSAFE_REL');const bytes=fs.readFileSync(full);
   files.push({path:rp.replace(/\\/g,'/'),bytes:bytes.length,sha256:sha(bytes)});
   must(files.length<=max,'TOO_MANY_FILES');
  }
 }
}
function sourceInventory(repo){
 const scopes=['src/lib/ontology-research','src/app/api/value-objects/indexed-lookup','scripts/ari'];
 const all=[];for(const s of scopes)walk(path.join(repo,s),s,all);
 // Include regression tests with explicit provenance; exclude unrelated test suites.
 const testdir=path.join(repo,'scripts/tests');if(fs.existsSync(testdir))for(const n of fs.readdirSync(testdir).sort()){
  if(/^ari03-.*\.test\.cjs$/i.test(n)){
   const b=fs.readFileSync(path.join(testdir,n));all.push({path:'scripts/tests/'+n,bytes:b.length,sha256:sha(b)});
  }
 }
 const filt=all.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 must(new Set(filt.map(x=>x.path)).size===filt.length,'SOURCE_DUPLICATE');
 const find=p=>filt.find(x=>x.path===p);
 must(find('src/lib/ontology-research/hybridRankerV1.ts'),'HYBRID_MISSING');
 must(find('src/lib/ontology-research/ari02EnhancedSearch.ts'),'ARI02_SOURCE_MISSING');
 const idx=filt.filter(x=>/index|indexed|vector|hybrid|embedding|hnsw|pgvector/i.test(x.path));
 must(idx.length>=2,'INDEX_SOURCES_MISSING');
 const canonical=rows=>Buffer.from(rows.map(x=>`${x.path}\u0000${x.bytes}\u0000${x.sha256}`).join('\n')+'\n');
 return {contract:'ARCTOR_M0142_SOURCE_INDEX_SHA_MANIFEST_V1',scope:'LOCAL_SOURCE_AND_INDEX_CODE_FILES_ONLY',
  allSourceFileCount:filt.length,allSourceTreeSha256:sha(canonical(filt)),indexRelatedFileCount:idx.length,
  indexRelatedTreeSha256:sha(canonical(idx)),files:filt,indexRelatedPaths:idx.map(x=>x.path),
  liveDatabaseIndexDigest:null,liveDatabaseIndexVerification:'NOT_RUN_NO_SQL_OR_DB_CONNECTION',
  scopeLimit:'Untracked and tracked files in enumerated relevant paths; not full git repo or physical pgvector index'};
}
function execute(args){
 const src={m0131:args.m0131,m0140:args.m0140,m0141:args.m0141,m0121Gold:args.m0121Gold},reports={};
 for(const [k,p] of Object.entries(src)){must(p&&fs.existsSync(p),'EVIDENCE_MISSING_'+k);reports[k]=json(p);}
 const snap=selectReportEvidence(reports.m0131,reports.m0121Gold),checks=reviewChecks(reports.m0140,reports.m0141);
 const source=sourceInventory(args.repo);
 must(source.files.find(x=>x.path==='src/lib/ontology-research/hybridRankerV1.ts').sha256===
  '7ECE3320FCF8B312D3EF24E3932A5ABA0A05ED8588787A19146EACDBFDAF61EB','HYBRID_SOURCE_CHANGED');
 const provenance=Object.fromEntries(Object.entries(src).map(([k,p])=>[k,{basename:path.basename(p),bytes:fs.statSync(p).size,sha256:sha(fs.readFileSync(p))}]));
 const report={contract:CONTRACT,step:'M-0142',roadmapId:'ARI-03.08.04',mode:'REVIEW',
  task:'Сохранить результаты stage/holdout и полный source/index SHA.',
  stage:{group:snap.stage.group,queryCount:18,sha256:sha(stable(snap.stage))},
  holdout:{group:snap.holdout.group,queryCount:18,sha256:sha(stable(snap.holdout)),independent:false},
  variantReportedMetrics:snap.variants,sourceIndexInventory:{fileCount:source.allSourceFileCount,
   sourceTreeSha256:source.allSourceTreeSha256,indexFileCount:source.indexRelatedFileCount,indexTreeSha256:source.indexRelatedTreeSha256,
   liveIndexSha256:null},evidenceProvenance:provenance,qualityGate:checks,
  knownLimitations:['M0131 owner-approved 36-case corpus is not independent holdout; stage/holdout labels are descriptive post hoc slices, not statistical independence.',
   'Source and index code SHA are complete within enumerated paths, not a full repository SHA or live DB physical index hash.',
   'M0131 reported pilot metrics are preserved without cherry-picking; they do not establish accuracy for the global catalog.',
   'No live /admin/ontology-research/diagnostics, HTTP E2E, RLS, private scopes, or database index inspected.',
   'No novel quality claims or production readiness are inferred from archive replay.'],
  sqlExecuted:false,paidApiCalls:0,commitPushDeploy:false};
 return {report,stage:snap.stage,holdout:snap.holdout,source};
}
module.exports={CONTRACT,sha,stable,selectReportEvidence,reviewChecks,sourceInventory,execute};
