'use strict';
/** M0083: read-only control of FAIL for a deliberately removed exact UUID.
 * Invocation: node scripts/tests/ari02-exact-uuid-drop-regression-v1.test.cjs --gold ABS_PATH --output EMPTY_DIR
 * Original Gold and live DB are never written. Modified copies are local test artifacts.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const GOLD_SHA='E5073D25DEA44D91FC67A01B727C9427740FC7E5C13528281DA965DFD5A17916';
const EXACT_UUID='bf6b8ca1-97b4-56c3-a115-f76e2e7fec5a';
const DISTRACTOR_UUID='a876134c-367b-5b3f-8f04-4752031b63d4';
const KEY='sleep-ari026-night';
const stop=s=>{throw Error('M0083_EXACT_DROP_STOP: '+s)};
const check=(v,s)=>{if(!v)stop(s)};
const arg=n=>{const i=process.argv.indexOf('--'+n);return i===-1?null:process.argv[i+1]};
const write=(f,o)=>fs.writeFileSync(f,JSON.stringify(o,null,2)+'\n',{flag:'wx'});
const copy=x=>JSON.parse(JSON.stringify(x));
const countIds=(gold,engine,id)=>gold.cases.find(c=>c.id===KEY).runs[engine].filter(r=>r.id===id).length;
function compare(repo,gold,after,engine,out,expectedExit){
 const f=path.join(out,`M0083_${engine.toUpperCase()}_${expectedExit===3?'EXACT_DROP':'NONEXACT_CONTROL'}_REPORT.json`);
 const result=cp.spawnSync(process.execPath,[path.join(repo,'scripts','ari02_6_compare.mjs'),'--before',gold,'--after',after,'--engine',engine,'--min-cases','10','--out',f],{cwd:repo,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:8*1024*1024});
 check(!result.error&&result.status===expectedExit,`comparator ${engine} exit=${result.status}; expected ${expectedExit}; ${String(result.stderr||result.stdout).slice(-700)}`);
 return {file:f,report:JSON.parse(fs.readFileSync(f,'utf8'))};
}
function execute(repo,goldPath,out){
 const beforeBytes=fs.readFileSync(goldPath);
 check(sha(beforeBytes)===GOLD_SHA,'original Gold SHA mismatch');
 const before=JSON.parse(beforeBytes.toString('utf8'));
 check(before.contract==='ARCTOR_ARI_02_3_GOLD_ANNOTATION_V1'&&before.cases.length===156,'Gold contract/case count');
 check(fs.readdirSync(out).length===0,'output must be empty');
 const target=before.cases.filter(c=>c.id===KEY);
 check(target.length===1&&target[0].query==='ночной сон'&&target[0].locale==='ru','target case not unique');
 check(target[0].judgments[EXACT_UUID]?.grade===3,'exact UUID lacks grade 3 in existing AI-assisted Gold');
 check(String(target[0].judgments[EXACT_UUID].note||'').includes('not independent'),'grade provenance must remain AI-assisted, not human-certified');
 const outcomes=[];
 for(const engine of ['baseline','experimental']){
  const rows=target[0].runs[engine];
  check(rows.some(r=>r.id===EXACT_UUID&&r.title==='Ночной сон'),'exact title/uuid absent in '+engine);
  check(rows.some(r=>r.id===DISTRACTOR_UUID&&r.title==='Сон'),'control candidate missing in '+engine);
  const after=copy(before);
  const c=after.cases.find(c=>c.id===KEY);
  c.runs[engine]=c.runs[engine].filter(r=>r.id!==EXACT_UUID);
  check(rows.length-c.runs[engine].length===1,'must remove exactly one exact UUID');
  check(countIds(after,engine,EXACT_UUID)===0,'exact UUID still in mutant');
  check(JSON.stringify(after.cases.filter(x=>x.id!==KEY))===JSON.stringify(before.cases.filter(x=>x.id!==KEY)),'unrelated case was mutated');
  check(JSON.stringify(c.judgments)===JSON.stringify(target[0].judgments),'judgments altered');
  const mutantFile=path.join(out,`M0083_${engine.toUpperCase()}_PRIVATE_MUTANT_GOLD.json`);write(mutantFile,after);
  const {file,report}=compare(repo,goldPath,mutantFile,engine,out,3);
  const lost=report.blockingIssues.filter(x=>x.includes('HUMAN_CONFIRMED_EXACT_DROPPED '+EXACT_UUID));
  check(report.contract==='ARCTOR_ARI_02_6_REGRESSION_V1'&&report.engine===engine&&report.gate==='FAIL','must report FAIL for lost exact UUID');
  check(lost.length===1&&report.blockingIssues.length>=1,'lost UUID missing from blocking issues');
  const matched=report.cases.filter(x=>x.query==='ночной сон'&&x.locale==='ru');
  check(matched.length===1&&matched[0].confirmedExactDropped.includes(EXACT_UUID),'case evidence absent');
  check(!report.blockingIssues.some(x=>x.includes('GRADE_CHANGED_OR_REMOVED')),'unexpected grade mutation');
  const non=copy(before);
  const n=non.cases.find(c=>c.id===KEY);
  n.runs[engine]=n.runs[engine].filter(r=>r.id!==DISTRACTOR_UUID);
  check(n.runs[engine].length===rows.length-1&&countIds(non,engine,EXACT_UUID)===1,'control mutation failed');
  const nonFile=path.join(out,`M0083_${engine.toUpperCase()}_PRIVATE_NONEXACT_GOLD.json`);write(nonFile,non);
  const control=compare(repo,goldPath,nonFile,engine,out,2);
  check(control.report.gate==='INCONCLUSIVE'&&control.report.blockingIssues.length===0,'nonexact removal falsely flagged or quality certified');
  outcomes.push({engine,scenario:KEY,query:'ночной сон',locale:'ru',exactUuid:EXACT_UUID,exactTitle:'Ночной сон',grade:3,gradeProvenance:'AI_ASSISTED_NOT_INDEPENDENT_HUMAN_GOLD',comparatorLabel:'HUMAN_CONFIRMED_EXACT_DROPPED (legacy string, not independently verified human annotation)',beforeRank:rows.findIndex(r=>r.id===EXACT_UUID)+1,afterPresent:false,originalCount:rows.length,mutantCount:c.runs[engine].length,comparisonExit:3,comparisonGate:report.gate,blockingIssue:lost[0],nonExactControlGate:control.report.gate,nonExactControlBlockingIssues:0,mutantSha256:sha(fs.readFileSync(mutantFile)),exactReportSha256:sha(fs.readFileSync(file)),nonExactControlReportSha256:sha(fs.readFileSync(control.file))});
 }
 check(sha(fs.readFileSync(goldPath))===GOLD_SHA,'original Gold modified');
 const audit={contract:'ARCTOR_ARI_M0083_EXACT_UUID_DROP_V1',step:'M-0083',roadmapId:'ARI-02.08.02',sourceGoldSha256:GOLD_SHA,sourceCases:156,scenario:KEY,exactUuid:EXACT_UUID,originalGoldUnchanged:true,mutationsArePrivateCopies:true,observations:outcomes,testVerdict:'PASS_HARNESS_DETECTS_KNOWN_MUTATION',qualityGate:'NOT_CERTIFIED_GOLD_INSUFFICIENT',realRecall20:'N/A',independentGold:false,liveE2E:false,indexedLookupTested:false,openDefectsFixed:0,dbWrites:0,aiApiCalls:0};
 write(path.join(out,'M0083_EXACT_DROP_AUDIT_V1.json'),audit);
 console.log('M0083_GUARD_PASS: baseline FAIL, experimental FAIL on deliberately missing UUID; nonexact controls INCONCLUSIVE; original Gold intact; no algorithm fix claimed');
 return audit;
}
try{const g=arg('gold'),o=arg('output');check(!!g&&!!o,'--gold/--output required');const repo=process.cwd();fs.mkdirSync(o,{recursive:true});execute(repo,path.resolve(g),path.resolve(o));}
catch(e){console.error(e.stack||e.message||String(e));process.exitCode=1;}
