'use strict';
/** ARCTor M-0082 read-only identity regression guard; no backend/API/LLM calls.
 * Usage: node scripts/tests/ari02-identical-gold-guard-v1.test.cjs --gold ABS_PATH --output ABS_DIR
 * This tests absence of FALSE FAIL on identical corpus, NOT the quality of search.
 */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const fail=s=>{throw Error('M0082_IDENTITY_GUARD: '+s)};
const check=(a,s)=>{if(!a)fail(s)};
const arg=n=>{const i=process.argv.indexOf('--'+n);return i<0?null:process.argv[i+1]};
const GOLD_SHA='E5073D25DEA44D91FC67A01B727C9427740FC7E5C13528281DA965DFD5A17916';
const CONTRACT='ARCTOR_ARI_M0082_IDENTICAL_GOLD_GUARD_V1';
function execute(root,gold,out){
 const blob=fs.readFileSync(gold);
 check(sha(blob)===GOLD_SHA,'gold SHA drift; no quality claim');
 const corpus=JSON.parse(blob.toString('utf8'));
 check(corpus.contract==='ARCTOR_ARI_02_3_GOLD_ANNOTATION_V1'&&corpus.cases.length===156,'Gold contract/156 drift');
 const comparator=path.join(root,'scripts','ari02_6_compare.mjs');
 check(fs.existsSync(comparator),'comparator missing');
 const observations=[];
 for(const engine of ['baseline','experimental']){
  const reportPath=path.join(out,'M0082_'+engine.toUpperCase()+'_IDENTICAL_REPORT.json');
  const args=[comparator,'--before',gold,'--after',gold,'--engine',engine,'--min-cases','10','--out',reportPath];
  const result=cp.spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:1024*1024*8});
  check(!result.error,'comparator spawn: '+String(result.error));
  check(result.status===2,'expected comparator exit=2 (INCONCLUSIVE), got '+result.status+'; '+String(result.stderr||result.stdout).slice(-1200));
  const r=JSON.parse(fs.readFileSync(reportPath,'utf8'));
  check(r.contract==='ARCTOR_ARI_02_6_REGRESSION_V1'&&r.engine===engine,'comparison version/engine');
  check(r.gate==='INCONCLUSIVE'&&r.minComparableCases===10&&r.cases.length===156&&r.beforeCases===156&&r.afterCases===156,'identity case coverage/status');
  check(r.comparablePrecisionCases===(engine==='baseline'?3:0),'eligible P@10 count changed');
  check(r.comparableRecallCases===0,'complete scoped Recall@20 unexpectedly present');
  check(Array.isArray(r.blockingIssues)&&r.blockingIssues.length===0,'FALSE regression blocking issue(s)');
  check(Array.isArray(r.warnings)&&r.warnings.length===0,'identity produced warnings');
  for(const c of r.cases){
    check(c.precision10.delta===null || Math.abs(c.precision10.delta)<=1e-12,'P@10 identity drift '+c.key);
    check(c.scopedRecall20.delta===null || Math.abs(c.scopedRecall20.delta)<=1e-12,'R@20 identity drift '+c.key);
    check(c.confirmedExactDropped.length===0,'FALSE exact loss '+c.key);
    check(c.beforeCount===c.afterCount&&c.labeledBefore===c.labeledAfter,'count drift '+c.key);
  }
  observations.push({engine,comparatorExit:result.status,gate:r.gate,caseCount:r.cases.length,eligibleP10:r.comparablePrecisionCases,eligibleScopedRecall20:r.comparableRecallCases,blockingIssues:0,warnings:0,reportFile:path.basename(reportPath),reportSha256:sha(fs.readFileSync(reportPath)),falseRegressionDetected:false,qualityCertification:false});
 }
 const audit={contract:CONTRACT,step:'M-0082',roadmapId:'ARI-02.08.01',sourceGoldSha256:GOLD_SHA,sameSourceUsedBothSides:true,minEligibleCases:10,observations,identityHarnessCheck:'PASS_NO_FALSE_REGRESSION',searchQualityGate:'INCONCLUSIVE_INSUFFICIENT_FULLY_JUDGED_CASES',independentGold:false,realRecall20:'N/A',liveE2E:false,fixesVerified:0,aiApiCalls:0,dbWrites:0};
 fs.writeFileSync(path.join(out,'M0082_IDENTITY_AUDIT_V1.json'),JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
 return audit;
}
try{
 const root=process.cwd(),gold=arg('gold'),out=arg('output');check(!!gold&&!!out,'--gold and --output required');
 fs.mkdirSync(out,{recursive:true});const a=execute(root,path.resolve(gold),path.resolve(out));
 console.log('M0082_IDENTITY_GUARD_PASS baseline=INCONCLUSIVE(3/10) experimental=INCONCLUSIVE(0/10) false_FAIL=0; search_quality_NOT_CERTIFIED');
}catch(e){console.error(e.stack||e);process.exitCode=1;}
